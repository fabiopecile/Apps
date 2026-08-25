"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingDTO } from "@/data/bookings";
import type { LocationDTO, TeamDTO } from "@/data/catalog";
import {
  addDays,
  dateKey,
  formatGermanDateLong,
  isoWeekNumber,
  MONTH_NAMES,
  parseDateKey,
  todayKey,
} from "@/lib/dates";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { BookingModal, type BookingModalState } from "../booking-form/BookingModal";
import { DuplicateDayButton } from "./DuplicateDayButton";

type ViewMode = "month" | "week" | "day";

type Props = {
  view: ViewMode;
  anchorDate: string;
  bookings: BookingDTO[];
  locations: LocationDTO[];
  teams: TeamDTO[];
  canEditCalendar: boolean;
  filters: { locationId?: string; teamId?: string; search?: string };
};

export function CalendarShell({ view, anchorDate, bookings, locations, teams, canEditCalendar, filters }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<BookingModalState | null>(null);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

  const anchor = useMemo(() => parseDateKey(anchorDate), [anchorDate]);

  function navigate(params: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    next.set("view", params.view ?? view);
    next.set("date", params.date ?? anchorDate);
    const loc = params.standort !== undefined ? params.standort : filters.locationId;
    const team = params.team !== undefined ? params.team : filters.teamId;
    const suche = params.suche !== undefined ? params.suche : filters.search;
    if (loc) next.set("standort", loc);
    if (team) next.set("team", team);
    if (suche) next.set("suche", suche);
    router.push(`/kalender?${next.toString()}`);
  }

  function shift(amount: number) {
    if (view === "month") {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1);
      navigate({ date: dateKey(d) });
    } else if (view === "week") {
      navigate({ date: dateKey(addDays(anchor, amount * 7)) });
    } else {
      navigate({ date: dateKey(addDays(anchor, amount)) });
    }
  }

  function openCreate(defaults: { date: string; fieldId?: string; startTime?: string; endTime?: string }) {
    if (!canEditCalendar) return;
    setModal({ mode: "create", defaults });
  }

  function openEdit(booking: BookingDTO) {
    setModal({ mode: "edit", bookingId: booking.id });
  }

  const title =
    view === "month"
      ? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
      : view === "week"
        ? `Woche ${isoWeekNumber(anchor)} · ${anchor.getFullYear()}`
        : formatGermanDateLong(anchorDate);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 1; y <= currentYear + 3; y++) years.push(y);
    return years;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate({ date: todayKey() })}>
              Heute
            </button>
            <button type="button" className="btn-secondary btn-sm px-2" onClick={() => shift(-1)} aria-label="Zurück">
              ‹
            </button>
            <button type="button" className="btn-secondary btn-sm px-2" onClick={() => shift(1)} aria-label="Weiter">
              ›
            </button>
            <h1 className="ml-1 text-lg font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select w-auto"
              value={anchor.getFullYear()}
              onChange={(e) => navigate({ date: dateKey(new Date(Number(e.target.value), anchor.getMonth(), 1)) })}
              aria-label="Jahr auswählen"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-border p-0.5">
              {(["month", "week", "day"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => navigate({ view: v })}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === v ? "bg-brand text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {v === "month" ? "Monat" : v === "week" ? "Woche" : "Tag"}
                </button>
              ))}
            </div>
            {view === "day" && canEditCalendar && <DuplicateDayButton date={anchorDate} onDone={() => router.refresh()} />}
            {canEditCalendar && (
              <button type="button" className="btn-primary" onClick={() => openCreate({ date: anchorDate })}>
                + Neue Belegung
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <select
            className="select w-auto min-w-[160px]"
            value={filters.locationId ?? ""}
            onChange={(e) => navigate({ standort: e.target.value || undefined })}
            aria-label="Nach Standort filtern"
          >
            <option value="">Alle Standorte</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select
            className="select w-auto min-w-[160px]"
            value={filters.teamId ?? ""}
            onChange={(e) => navigate({ team: e.target.value || undefined })}
            aria-label="Nach Mannschaft filtern"
          >
            <option value="">Alle Mannschaften</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <form
            className="flex min-w-[200px] flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ suche: searchDraft || undefined });
            }}
          >
            <input
              type="search"
              className="input"
              placeholder="Suche nach Mannschaft, Feld, Bemerkung…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
          </form>
          {(filters.locationId || filters.teamId || filters.search) && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setSearchDraft("");
                navigate({ standort: undefined, team: undefined, suche: undefined });
              }}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {view === "month" && (
        <MonthView
          anchorDate={anchorDate}
          bookings={bookings}
          onDayClick={(date) => navigate({ view: "day", date })}
          onCreateAt={(date) => openCreate({ date })}
          onBookingClick={openEdit}
          canEdit={canEditCalendar}
        />
      )}
      {view === "week" && (
        <WeekView
          anchorDate={anchorDate}
          bookings={bookings}
          onDayClick={(date) => navigate({ view: "day", date })}
          onCreateAt={(date) => openCreate({ date })}
          onBookingClick={openEdit}
          canEdit={canEditCalendar}
        />
      )}
      {view === "day" && (
        <DayView
          date={anchorDate}
          bookings={bookings}
          locations={locations}
          onCreateAt={(date, fieldId, startTime, endTime) => openCreate({ date, fieldId, startTime, endTime })}
          onBookingClick={openEdit}
          canEdit={canEditCalendar}
        />
      )}

      <BookingModal
        state={modal}
        onClose={() => setModal(null)}
        locations={locations}
        teams={teams}
        canEdit={canEditCalendar}
        onMutated={() => {
          setModal(null);
          router.refresh();
        }}
      />
    </div>
  );
}
