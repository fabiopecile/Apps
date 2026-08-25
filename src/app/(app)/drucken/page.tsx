import { listBookings } from "@/data/bookings";
import { listLocations, listTeams } from "@/data/catalog";
import { addDays, dateKey, endOfMonth, parseDateKey, startOfMonth, startOfWeek } from "@/lib/dates";
import { DruckenView } from "@/components/print/DruckenView";

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function DruckenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const periode = sp.periode === "monat" ? "monat" : "woche";
  const dateParam = str(sp.datum);
  const anchor = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? parseDateKey(dateParam) : new Date();
  const locationId = str(sp.standort);
  const teamId = str(sp.team);

  const rangeStart = periode === "woche" ? startOfWeek(anchor) : startOfWeek(startOfMonth(anchor));
  const rangeEnd = periode === "woche" ? addDays(rangeStart, 6) : addDays(startOfWeek(endOfMonth(anchor)), 6);

  const [bookings, locations, teams] = await Promise.all([
    listBookings({ from: dateKey(rangeStart), to: dateKey(rangeEnd), locationId, teamId }),
    listLocations(),
    listTeams(),
  ]);

  return (
    <DruckenView
      periode={periode}
      anchorDate={dateKey(anchor)}
      bookings={bookings}
      locations={locations}
      teams={teams}
      filters={{ locationId, teamId }}
    />
  );
}
