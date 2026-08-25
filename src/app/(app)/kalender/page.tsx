import { listBookings } from "@/data/bookings";
import { listLocations, listTeams } from "@/data/catalog";
import { getSession, canEdit } from "@/lib/session";
import { addDays, dateKey, endOfMonth, parseDateKey, startOfMonth, startOfWeek } from "@/lib/dates";
import { CalendarShell } from "@/components/calendar/CalendarShell";

type ViewMode = "month" | "week" | "day";

function parseView(v: unknown): ViewMode {
  return v === "week" || v === "day" ? v : "month";
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const dateParam = str(sp.date);
  const anchor = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? parseDateKey(dateParam) : new Date();
  const locationId = str(sp.standort);
  const teamId = str(sp.team);
  const search = str(sp.suche);

  let rangeStart: Date;
  let rangeEnd: Date;
  if (view === "month") {
    rangeStart = startOfWeek(startOfMonth(anchor));
    rangeEnd = addDays(startOfWeek(endOfMonth(anchor)), 6);
  } else if (view === "week") {
    rangeStart = startOfWeek(anchor);
    rangeEnd = addDays(rangeStart, 6);
  } else {
    rangeStart = anchor;
    rangeEnd = anchor;
  }

  const [bookings, locations, teams, session] = await Promise.all([
    listBookings({ from: dateKey(rangeStart), to: dateKey(rangeEnd), locationId, teamId, search }),
    listLocations(),
    listTeams(),
    getSession(),
  ]);

  return (
    <CalendarShell
      view={view}
      anchorDate={dateKey(anchor)}
      bookings={bookings}
      locations={locations}
      teams={teams}
      canEditCalendar={canEdit(session?.role)}
      filters={{ locationId, teamId, search }}
    />
  );
}
