"use client";

import { useState, useTransition } from "react";
import { createSeriesAction, previewSeriesAction } from "@/actions/bookings";
import type { SeriesPreviewItem } from "@/data/bookings";
import { formatGermanDate, weekdayOfDateKey, WEEKDAY_NAMES } from "@/lib/dates";
import { useToast } from "@/components/ui/ToastProvider";

type Props = {
  date: string;
  teamId: string;
  fieldId: string;
  startTime: string;
  endTime: string;
  note: string;
  allowMultiple: boolean;
  onCreated: () => void;
};

export function RecurrenceSection({ date, teamId, fieldId, startTime, endTime, note, allowMultiple, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [weekday, setWeekday] = useState(weekdayOfDateKey(date));
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<SeriesPreviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  const ready = !!teamId && !!fieldId && startTime < endTime && !!startDate && !!endDate;

  function handlePreview() {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const result = await previewSeriesAction({ teamId, fieldId, weekday, startTime, endTime, startDate, endDate, note, allowMultiple });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview(result.data);
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createSeriesAction({ teamId, fieldId, weekday, startTime, endTime, startDate, endDate, note, allowMultiple });
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast(
        result.data.skipped > 0
          ? `Serie angelegt: ${result.data.created} Termine erstellt, ${result.data.skipped} wegen Konflikten übersprungen.`
          : `Serie angelegt: ${result.data.created} Termine erstellt.`,
      );
      onCreated();
    });
  }

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-foreground"
      >
        <span>🔁 Training wiederholen</span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <p className="text-xs text-muted">
            Erstellt automatisch wiederkehrende Kalendertermine für die gewählte Mannschaft, das gewählte Feld und die oben eingestellte
            Uhrzeit – jeden gewählten Wochentag im Zeitraum.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Wochentag</label>
              <select className="select" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAY_NAMES.map((w, i) => (
                  <option key={w} value={i}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div />
            <div>
              <label className="field-label">Von</label>
              <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Bis</label>
              <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <button type="button" className="btn-secondary btn-sm" disabled={!ready || pending} onClick={handlePreview}>
            {pending ? "Bitte warten…" : "Vorschau anzeigen"}
          </button>

          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}

          {preview && (
            <div className="space-y-2">
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {preview.map((p) => (
                  <div
                    key={p.date}
                    className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                      p.hasConflict ? "bg-danger-light text-danger" : "bg-brand-light text-brand-dark"
                    }`}
                  >
                    <span>
                      {WEEKDAY_NAMES[p.weekday]}, {formatGermanDate(p.date)}
                    </span>
                    {p.hasConflict ? <span>Konflikt: {p.conflictingTeams.join(", ")}</span> : <span>frei</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                {preview.length} Termine gefunden · {preview.filter((p) => p.hasConflict).length} mit Konflikt (werden beim Speichern
                übersprungen).
              </p>
              <button type="button" className="btn-primary btn-sm" disabled={pending} onClick={handleCreate}>
                {pending ? "Wird gespeichert…" : `Serie speichern (${preview.filter((p) => !p.hasConflict).length} Termine)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
