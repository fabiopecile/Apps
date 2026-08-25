import type { BookingDTO } from "@/data/bookings";
import type { LocationDTO } from "@/data/catalog";
import { addDays, dateKey, formatGermanDate, parseDateKey, startOfWeek, WEEKDAY_NAMES } from "@/lib/dates";

export function PrintWeekTable({ anchorDate, bookings, locations }: { anchorDate: string; bookings: BookingDTO[]; locations: LocationDTO[] }) {
  const start = startOfWeek(parseDateKey(anchorDate));
  const days = Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));
  const columns = locations.flatMap((loc) => loc.fields.map((field) => ({ location: loc, field })));

  const byKey = new Map<string, BookingDTO[]>();
  for (const b of bookings) {
    const key = `${b.date}__${b.field.id}`;
    const list = byKey.get(key) ?? [];
    list.push(b);
    byKey.set(key, list);
  }

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-left">Datum</th>
          {locations.map((loc) =>
            loc.fields.length === 0 ? null : (
              <th key={loc.id} colSpan={loc.fields.length} className="border border-slate-300 bg-slate-100 px-2 py-1.5 text-center">
                {loc.name}
              </th>
            ),
          )}
        </tr>
        <tr>
          <th className="border border-slate-300 px-2 py-1"></th>
          {columns.map((c) => (
            <th key={c.field.id} className="border border-slate-300 px-2 py-1 text-center font-medium">
              {c.location.fields.length > 1 ? c.field.name : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((date) => {
          const d = parseDateKey(date);
          return (
            <tr key={date}>
              <td className="border border-slate-300 px-2 py-1.5 align-top font-medium">
                {WEEKDAY_NAMES[(d.getDay() + 6) % 7]}
                <br />
                {formatGermanDate(date)}
              </td>
              {columns.map((c) => {
                const entries = (byKey.get(`${date}__${c.field.id}`) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                return (
                  <td key={c.field.id} className="border border-slate-300 px-2 py-1.5 align-top">
                    {entries.length === 0
                      ? ""
                      : entries.map((e) => (
                          <div key={e.id}>
                            {e.startTime}–{e.endTime} {e.team.name}
                          </div>
                        ))}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
