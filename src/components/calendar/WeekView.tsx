"use client";

import type { BookingDTO } from "@/data/bookings";
import { addDays, formatGermanDate, parseDateKey, startOfWeek, todayKey, WEEKDAY_NAMES } from "@/lib/dates";
import { dateKey } from "@/lib/dates";

type Props = {
  anchorDate: string;
  bookings: BookingDTO[];
  onDayClick: (date: string) => void;
  onCreateAt: (date: string) => void;
  onBookingClick: (booking: BookingDTO) => void;
  canEdit: boolean;
};

export function WeekView({ anchorDate, bookings, onDayClick, onCreateAt, onBookingClick, canEdit }: Props) {
  const start = startOfWeek(parseDateKey(anchorDate));
  const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
  const today = todayKey();

  const byDate = new Map<string, BookingDTO[]>();
  for (const b of bookings) {
    const list = byDate.get(b.date) ?? [];
    list.push(b);
    byDate.set(b.date, list);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((date, i) => {
        const entries = (byDate.get(date) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const isToday = date === today;

        return (
          <div key={date} className={`card flex flex-col p-0 ${isToday ? "ring-2 ring-brand" : ""}`}>
            <button
              type="button"
              onClick={() => onDayClick(date)}
              className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-2 text-left"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{WEEKDAY_NAMES[i]}</div>
                <div className={`text-sm font-bold ${isToday ? "text-brand" : "text-foreground"}`}>{formatGermanDate(date)}</div>
              </div>
              {canEdit && (
                <span
                  role="button"
                  tabIndex={0}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-brand"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateAt(date);
                  }}
                >
                  +
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col gap-1.5 p-2">
              {entries.length === 0 && <p className="px-1 py-2 text-xs text-muted">Keine Einträge</p>}
              {entries.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBookingClick(b)}
                  className={`flex flex-col rounded-lg border-l-4 bg-surface-muted px-2 py-1.5 text-left transition hover:bg-brand-light ${
                    b.field.allowMultiple ? "border-dashed" : ""
                  }`}
                  style={{ borderLeftColor: b.team.color, borderLeftWidth: 4 }}
                  title={b.field.allowMultiple ? "Mehrfachbelegung möglich – weitere Mannschaften können hier eingetragen werden" : undefined}
                >
                  <span className="text-xs font-semibold text-foreground">
                    {b.type === "SPIEL" && "🏆 "}
                    {b.startTime}–{b.endTime} · {b.team.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {b.field.locationName} {b.field.locationName !== b.field.name ? `– ${b.field.name}` : ""}
                    {b.field.allowMultiple && <span className="ml-1 font-semibold text-brand">· + Mehrfachbelegung möglich</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
