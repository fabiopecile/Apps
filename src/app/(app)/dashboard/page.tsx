import Link from "next/link";
import { listBookings, listConflicts } from "@/data/bookings";
import { listLocations, listTeams } from "@/data/catalog";
import { getSession, canEdit } from "@/lib/session";
import { addDays, dateKey, formatGermanDateLong, startOfWeek, todayKey } from "@/lib/dates";
import { QuickCreateButton } from "@/components/booking-form/QuickCreateButton";

export default async function DashboardPage() {
  const today = todayKey();
  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 6);

  const [todayBookings, weekBookings, conflicts, locations, teams, session] = await Promise.all([
    listBookings({ from: today, to: today }),
    listBookings({ from: dateKey(weekStart), to: dateKey(weekEnd) }),
    listConflicts(),
    listLocations(),
    listTeams(),
    getSession(),
  ]);

  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const occupiedFields = new Set(todayBookings.map((b) => b.field.id)).size;
  const running = todayBookings.filter((b) => b.startTime <= nowTime && nowTime < b.endTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcoming = todayBookings.filter((b) => b.startTime > nowTime).sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);

  const fieldCounts = new Map<string, { name: string; count: number }>();
  for (const b of weekBookings) {
    const key = `${b.field.locationName} – ${b.field.name}`;
    const entry = fieldCounts.get(key) ?? { name: key, count: 0 };
    entry.count++;
    fieldCounts.set(key, entry);
  }
  const topFields = [...fieldCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  const weekConflicts = conflicts.filter((c) => c.date >= dateKey(weekStart) && c.date <= dateKey(weekEnd));

  const editable = canEdit(session?.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Willkommen{session ? `, ${session.name.split(" ")[0]}` : ""}!</h1>
          <p className="text-sm text-muted">{formatGermanDateLong(today)}</p>
        </div>
        {editable && <QuickCreateButton locations={locations} teams={teams} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Heute</h2>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-brand-light p-3">
              <div className="text-2xl font-bold text-brand-dark">{occupiedFields}</div>
              <div className="text-xs text-brand-dark">Plätze belegt</div>
            </div>
            <div className="rounded-lg bg-surface-muted p-3">
              <div className="text-2xl font-bold text-foreground">{todayBookings.length}</div>
              <div className="text-xs text-muted">Trainings heute</div>
            </div>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Aktuell laufend</p>
          {running.length === 0 ? (
            <p className="mb-3 text-sm text-muted">Gerade kein Training aktiv.</p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {running.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.team.color }} />
                  <span className="font-medium text-foreground">{b.team.name}</span>
                  <span className="text-muted">
                    {b.field.locationName} {b.field.locationName !== b.field.name && `– ${b.field.name}`} · {b.startTime}–{b.endTime}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Nächste Trainings</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Für heute sind keine weiteren Trainings geplant.</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.team.color }} />
                  <span className="font-medium text-foreground">{b.startTime}</span>
                  <span className="text-foreground">{b.team.name}</span>
                  <span className="text-muted">
                    {b.field.locationName} {b.field.locationName !== b.field.name && `– ${b.field.name}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Diese Woche</h2>
          <div className="mb-4 rounded-lg bg-surface-muted p-3">
            <div className="text-2xl font-bold text-foreground">{weekBookings.length}</div>
            <div className="text-xs text-muted">Trainings diese Woche</div>
          </div>

          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Meistgenutzte Plätze</p>
          {topFields.length === 0 ? (
            <p className="mb-4 text-sm text-muted">Keine Daten.</p>
          ) : (
            <ul className="mb-4 space-y-1.5">
              {topFields.map((f) => (
                <li key={f.name} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{f.name}</span>
                  <span className="font-semibold text-muted">{f.count}×</span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/konflikte"
            className={`flex items-center justify-between rounded-lg p-3 text-sm font-medium transition ${
              weekConflicts.length > 0 ? "bg-danger-light text-danger hover:brightness-95" : "bg-brand-light text-brand-dark hover:brightness-95"
            }`}
          >
            <span>{weekConflicts.length > 0 ? `⚠️ ${weekConflicts.length} mögliche Konflikte` : "Keine Konflikte diese Woche"}</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
