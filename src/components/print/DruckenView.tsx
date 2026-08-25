"use client";

import { useRouter } from "next/navigation";
import type { BookingDTO } from "@/data/bookings";
import type { LocationDTO, TeamDTO } from "@/data/catalog";
import { formatGermanDate, isoWeekNumber, MONTH_NAMES, parseDateKey } from "@/lib/dates";
import { PrintWeekTable } from "./PrintWeekTable";
import { PrintMonthAgenda } from "./PrintMonthAgenda";

type Periode = "woche" | "monat";

export function DruckenView({
  periode,
  anchorDate,
  bookings,
  locations,
  teams,
  filters,
}: {
  periode: Periode;
  anchorDate: string;
  bookings: BookingDTO[];
  locations: LocationDTO[];
  teams: TeamDTO[];
  filters: { locationId?: string; teamId?: string };
}) {
  const router = useRouter();
  const anchor = parseDateKey(anchorDate);

  function navigate(params: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    next.set("periode", params.periode ?? periode);
    next.set("datum", params.datum ?? anchorDate);
    const loc = params.standort !== undefined ? params.standort : filters.locationId;
    const team = params.team !== undefined ? params.team : filters.teamId;
    if (loc) next.set("standort", loc);
    if (team) next.set("team", team);
    router.push(`/drucken?${next.toString()}`);
  }

  const csvParams = new URLSearchParams();
  csvParams.set("periode", periode);
  csvParams.set("datum", anchorDate);
  if (filters.locationId) csvParams.set("standort", filters.locationId);
  if (filters.teamId) csvParams.set("team", filters.teamId);

  const title =
    periode === "woche" ? `Wochenübersicht – KW ${isoWeekNumber(anchor)}, ${anchor.getFullYear()}` : `Monatsübersicht – ${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  return (
    <div className="space-y-4">
      <div className="no-print card flex flex-wrap items-center gap-2 p-4">
        <div className="flex rounded-lg border border-border p-0.5">
          {(["woche", "monat"] as Periode[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => navigate({ periode: p })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${periode === p ? "bg-brand text-white" : "text-muted hover:text-foreground"}`}
            >
              {p === "woche" ? "Woche" : "Monat"}
            </button>
          ))}
        </div>
        <input type="date" className="input w-auto" value={anchorDate} onChange={(e) => navigate({ datum: e.target.value })} />
        <select className="select w-auto" value={filters.locationId ?? ""} onChange={(e) => navigate({ standort: e.target.value || undefined })}>
          <option value="">Alle Standorte</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select className="select w-auto" value={filters.teamId ?? ""} onChange={(e) => navigate({ team: e.target.value || undefined })}>
          <option value="">Alle Mannschaften</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <a href={`/api/export/csv?${csvParams.toString()}`} className="btn-secondary">
            CSV exportieren
          </a>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Drucken / Als PDF speichern
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto p-5 print:border-0 print:shadow-none">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted">Stand: {formatGermanDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
        {periode === "woche" ? (
          <PrintWeekTable anchorDate={anchorDate} bookings={bookings} locations={locations} />
        ) : (
          <PrintMonthAgenda anchorDate={anchorDate} bookings={bookings} />
        )}
      </div>
    </div>
  );
}
