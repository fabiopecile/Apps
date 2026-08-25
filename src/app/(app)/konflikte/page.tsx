import Link from "next/link";
import { listConflicts } from "@/data/bookings";
import { formatGermanDateLong } from "@/lib/dates";

export default async function KonfliktePage() {
  const conflicts = await listConflicts();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Konflikte</h1>
        <p className="text-sm text-muted">
          Zeitliche Überschneidungen auf Feldern, die keine Mehrfachbelegung erlauben. Zum Beheben direkt im Tageskalender bearbeiten.
        </p>
      </div>

      {conflicts.length === 0 ? (
        <div className="card flex items-center gap-3 p-6">
          <span className="text-2xl">✅</span>
          <p className="text-sm text-foreground">Aktuell sind keine Konflikte bekannt. Alle Platzbelegungen sind eindeutig.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {conflicts.map((c, i) => (
            <div key={`${c.fieldId}-${c.date}-${i}`} className="card border-l-4 border-l-danger p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-danger">⚠️ Möglicher Konflikt</p>
                <Link href={`/kalender?view=day&date=${c.date}`} className="btn-secondary btn-sm">
                  Prüfen
                </Link>
              </div>
              <p className="text-sm font-medium text-foreground">
                {c.locationName} – {c.fieldName}
              </p>
              <p className="mb-2 text-sm text-muted">{formatGermanDateLong(c.date)}</p>
              <ul className="space-y-1">
                {c.bookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.teamColor }} />
                    <span className="font-medium text-foreground">{b.teamName}</span>
                    <span className="text-muted">
                      {b.startTime}–{b.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
