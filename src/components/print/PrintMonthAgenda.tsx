import type { BookingDTO } from "@/data/bookings";
import { formatGermanDateLong, parseDateKey } from "@/lib/dates";

export function PrintMonthAgenda({ anchorDate, bookings }: { anchorDate: string; bookings: BookingDTO[] }) {
  const anchor = parseDateKey(anchorDate);
  const inMonth = bookings.filter((b) => {
    const d = parseDateKey(b.date);
    return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
  });

  const byDate = new Map<string, BookingDTO[]>();
  for (const b of inMonth) {
    const list = byDate.get(b.date) ?? [];
    list.push(b);
    byDate.set(b.date, list);
  }
  const dates = [...byDate.keys()].sort();

  if (dates.length === 0) {
    return <p className="text-sm text-slate-500">Keine Trainingszeiten in diesem Monat.</p>;
  }

  return (
    <div className="space-y-3 text-xs">
      {dates.map((date) => (
        <div key={date} className="break-inside-avoid">
          <p className="border-b border-slate-300 pb-1 font-semibold">{formatGermanDateLong(date)}</p>
          <table className="w-full border-collapse">
            <tbody>
              {byDate
                .get(date)!
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((b) => (
                  <tr key={b.id}>
                    <td className="w-24 py-0.5 pr-2">
                      {b.startTime}–{b.endTime}
                    </td>
                    <td className="w-28 py-0.5 pr-2 font-medium">
                      {b.team.name}
                      {b.type === "SPIEL" ? " (Spiel)" : ""}
                    </td>
                    <td className="py-0.5 text-slate-600">
                      {b.field.locationName}
                      {b.field.locationName !== b.field.name ? ` – ${b.field.name}` : ""}
                    </td>
                    <td className="py-0.5 text-slate-500">{b.note}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
