"use client";

import { useMemo } from "react";
import type { BookingDTO } from "@/data/bookings";
import type { LocationDTO } from "@/data/catalog";
import { minutesToTime, timeToMinutes } from "@/lib/dates";

type Props = {
  date: string;
  bookings: BookingDTO[];
  locations: LocationDTO[];
  onCreateAt: (date: string, fieldId: string, startTime: string, endTime: string) => void;
  onBookingClick: (booking: BookingDTO) => void;
  canEdit: boolean;
};

const PX_PER_MIN = 1.15;
const DEFAULT_START = 7 * 60;
const DEFAULT_END = 22 * 60;
const SLOT_MINUTES = 15;

type LaidOutBooking = { item: BookingDTO; lane: number; laneCount: number };

function layoutColumn(items: BookingDTO[]): LaidOutBooking[] {
  const sorted = [...items].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime) || timeToMinutes(a.endTime) - timeToMinutes(b.endTime),
  );
  const result: LaidOutBooking[] = [];
  let clusterItems: { item: BookingDTO; lane: number }[] = [];
  let clusterMaxLane = 0;
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const ci of clusterItems) result.push({ ...ci, laneCount: clusterMaxLane + 1 });
    clusterItems = [];
    clusterMaxLane = 0;
  };

  for (const b of sorted) {
    const s = timeToMinutes(b.startTime);
    const e = timeToMinutes(b.endTime);
    if (s >= clusterEnd) {
      flush();
      clusterEnd = e;
    } else {
      clusterEnd = Math.max(clusterEnd, e);
    }
    const usedLanes = new Set(clusterItems.filter((ci) => timeToMinutes(ci.item.endTime) > s).map((ci) => ci.lane));
    let lane = 0;
    while (usedLanes.has(lane)) lane++;
    clusterMaxLane = Math.max(clusterMaxLane, lane);
    clusterItems.push({ item: b, lane });
  }
  flush();
  return result;
}

export function DayView({ date, bookings, locations, onCreateAt, onBookingClick, canEdit }: Props) {
  const columns = useMemo(
    () => locations.flatMap((loc) => loc.fields.map((field) => ({ location: loc, field }))),
    [locations],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    let min = DEFAULT_START;
    let max = DEFAULT_END;
    for (const b of bookings) {
      min = Math.min(min, Math.floor(timeToMinutes(b.startTime) / 60) * 60);
      max = Math.max(max, Math.ceil(timeToMinutes(b.endTime) / 60) * 60);
    }
    return { rangeStart: min, rangeEnd: max };
  }, [bookings]);

  const totalHeight = (rangeEnd - rangeStart) * PX_PER_MIN;
  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let h = rangeStart; h <= rangeEnd; h += 60) marks.push(h);
    return marks;
  }, [rangeStart, rangeEnd]);

  const byField = useMemo(() => {
    const map = new Map<string, BookingDTO[]>();
    for (const b of bookings) {
      const list = map.get(b.field.id) ?? [];
      list.push(b);
      map.set(b.field.id, list);
    }
    return map;
  }, [bookings]);

  if (columns.length === 0) {
    return <div className="card p-6 text-sm text-muted">Es sind noch keine Standorte/Felder angelegt.</div>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <div style={{ minWidth: 90 + columns.length * 168 }}>
        {/* Kopfzeile: Standorte gruppiert, Felder darunter */}
        <div className="flex border-b border-border bg-surface-muted text-xs font-semibold text-foreground">
          <div className="w-[90px] shrink-0 border-r border-border" />
          {locations.map((loc) =>
            loc.fields.length === 0 ? null : (
              <div key={loc.id} style={{ width: loc.fields.length * 168 }} className="flex flex-col border-r border-border last:border-r-0">
                <div className="border-b border-border px-2 py-1.5 text-center uppercase tracking-wide text-muted">{loc.name}</div>
                <div className="flex flex-1">
                  {loc.fields.map((f) => (
                    <div key={f.id} style={{ width: 168 }} className="flex flex-col items-center justify-center gap-0.5 border-r border-border px-1 py-1.5 last:border-r-0">
                      <span>{f.name}</span>
                      {f.allowMultiple && (
                        <span className="badge bg-brand-light text-brand-dark" title="Mehrere Mannschaften gleichzeitig erlaubt">
                          Mehrfachbelegung
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Zeitraster */}
        <div className="flex">
          <div className="relative w-[90px] shrink-0 border-r border-border" style={{ height: totalHeight }}>
            {hourMarks.map((m) => (
              <div
                key={m}
                className="absolute left-0 w-full -translate-y-1/2 pr-2 text-right text-[11px] text-muted"
                style={{ top: (m - rangeStart) * PX_PER_MIN }}
              >
                {minutesToTime(m)}
              </div>
            ))}
          </div>

          {columns.map(({ field }) => {
            const laidOut = layoutColumn(byField.get(field.id) ?? []);
            return (
              <div
                key={field.id}
                className="relative shrink-0 border-r border-border last:border-r-0"
                style={{ width: 168, height: totalHeight }}
                onClick={(e) => {
                  if (!canEdit) return;
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const offsetY = e.clientY - rect.top;
                  const rawMinutes = rangeStart + offsetY / PX_PER_MIN;
                  const snapped = Math.round(rawMinutes / SLOT_MINUTES) * SLOT_MINUTES;
                  const start = minutesToTime(snapped);
                  const end = minutesToTime(snapped + 60);
                  onCreateAt(date, field.id, start, end);
                }}
              >
                {hourMarks.map((m) => (
                  <div key={m} className="absolute w-full border-t border-border/70" style={{ top: (m - rangeStart) * PX_PER_MIN }} />
                ))}
                {laidOut.map(({ item, lane, laneCount }) => {
                  const top = (timeToMinutes(item.startTime) - rangeStart) * PX_PER_MIN;
                  const height = Math.max(20, (timeToMinutes(item.endTime) - timeToMinutes(item.startTime)) * PX_PER_MIN);
                  const width = 100 / laneCount;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(item);
                      }}
                      className="absolute overflow-hidden rounded-md border border-white/40 px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow-sm transition hover:brightness-95"
                      style={{
                        top,
                        height,
                        left: `${lane * width}%`,
                        width: `calc(${width}% - 2px)`,
                        backgroundColor: item.team.color,
                      }}
                      title={`${item.team.name} · ${item.startTime}–${item.endTime}${item.note ? " · " + item.note : ""}`}
                    >
                      <span className="block truncate font-semibold">{item.team.name}</span>
                      <span className="block truncate opacity-90">
                        {item.startTime}–{item.endTime}
                      </span>
                      {laneCount > 1 && <span className="block truncate opacity-90">⚭ Mehrfach</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
