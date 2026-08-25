"use client";

import type { BookingDTO } from "@/data/bookings";
import { addDays, dateKey, endOfMonth, parseDateKey, startOfMonth, startOfWeek, todayKey, WEEKDAY_NAMES_SHORT } from "@/lib/dates";

type Props = {
  anchorDate: string;
  bookings: BookingDTO[];
  onDayClick: (date: string) => void;
  onCreateAt: (date: string) => void;
  onBookingClick: (booking: BookingDTO) => void;
  canEdit: boolean;
};

export function MonthView({ anchorDate, bookings, onDayClick, onCreateAt, onBookingClick, canEdit }: Props) {
  const anchor = parseDateKey(anchorDate);
  const gridStart = startOfWeek(startOfMonth(anchor));
  const gridEnd = addDays(startOfWeek(endOfMonth(anchor)), 6);

  const days: string[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(dateKey(d));
  }
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const byDate = new Map<string, BookingDTO[]>();
  for (const b of bookings) {
    const list = byDate.get(b.date) ?? [];
    list.push(b);
    byDate.set(b.date, list);
  }

  const currentMonth = anchor.getMonth();
  const today = todayKey();

  return (
    <div className="card overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted">
        {WEEKDAY_NAMES_SHORT.map((w) => (
          <div key={w} className="px-2 py-2 text-center">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.map((date) => {
            const d = parseDateKey(date);
            const inMonth = d.getMonth() === currentMonth;
            const isToday = date === today;
            const entries = (byDate.get(date) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
            const visible = entries.slice(0, 3);
            const overflow = entries.length - visible.length;

            return (
              <div
                key={date}
                className={`group relative min-h-[92px] cursor-pointer border-b border-r border-border p-1.5 last:border-r-0 sm:min-h-[110px] ${
                  inMonth ? "bg-surface" : "bg-surface-muted/60"
                }`}
                onClick={() => onDayClick(date)}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday ? "bg-brand text-white" : inMonth ? "text-foreground" : "text-muted/60"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      className="hidden h-5 w-5 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-brand group-hover:flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateAt(date);
                      }}
                      aria-label={`Belegung am ${date} anlegen`}
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {visible.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookingClick(b);
                      }}
                      className={`truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-white ${
                        b.field.allowMultiple ? "border border-dashed border-white/80" : ""
                      }`}
                      style={{ backgroundColor: b.team.color }}
                      title={`${b.team.name} · ${b.field.locationName} ${b.field.name} · ${b.startTime}–${b.endTime}${
                        b.field.allowMultiple ? " · Mehrfachbelegung möglich" : ""
                      }`}
                    >
                      {b.field.allowMultiple && "+ "}
                      {b.startTime} {b.team.name}
                    </button>
                  ))}
                  {overflow > 0 && <span className="px-1 text-[11px] font-medium text-muted">+{overflow} weitere</span>}
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
