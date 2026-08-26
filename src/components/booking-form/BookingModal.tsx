"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ConflictInfo } from "@/data/bookings";
import type { LocationDTO, TeamDTO } from "@/data/catalog";
import {
  checkConflictAction,
  copyBookingAction,
  createBookingAction,
  deleteBookingAction,
  getBookingAction,
  listActivityForBookingAction,
  moveBookingFieldAction,
  updateBookingAction,
} from "@/actions/bookings";
import { formatGermanDateLong, todayKey } from "@/lib/dates";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { RecurrenceSection } from "./RecurrenceSection";
import { loadDraft, saveDraft, clearDraft, type BookingDraft } from "./draft";

export type BookingModalState =
  | { mode: "create"; defaults: { date: string; fieldId?: string; teamId?: string; startTime?: string; endTime?: string } }
  | { mode: "edit"; bookingId: string };

type Props = {
  state: BookingModalState | null;
  onClose: () => void;
  locations: LocationDTO[];
  teams: TeamDTO[];
  canEdit: boolean;
  onMutated: () => void;
};

const emptyForm: BookingDraft = {
  date: "",
  type: "TRAINING",
  locationId: "",
  fieldId: "",
  teamId: "",
  startTime: "17:00",
  endTime: "18:15",
  note: "",
  allowMultiple: false,
};

function findLocationForField(locations: LocationDTO[], fieldId: string) {
  return locations.find((l) => l.fields.some((f) => f.id === fieldId));
}

function initialFormFor(state: BookingModalState, locations: LocationDTO[]): { form: BookingDraft; draftRestored: boolean } {
  if (state.mode === "edit") return { form: emptyForm, draftRestored: false };
  const draft = loadDraft();
  if (draft) return { form: { ...emptyForm, ...draft }, draftRestored: true };
  const loc = state.defaults.fieldId ? findLocationForField(locations, state.defaults.fieldId) : undefined;
  const field = loc?.fields.find((f) => f.id === state.defaults.fieldId);
  return {
    form: {
      ...emptyForm,
      date: state.defaults.date,
      locationId: loc?.id ?? "",
      fieldId: state.defaults.fieldId ?? "",
      teamId: state.defaults.teamId ?? "",
      startTime: state.defaults.startTime ?? emptyForm.startTime,
      endTime: state.defaults.endTime ?? emptyForm.endTime,
      allowMultiple: field?.allowMultiple ?? false,
    },
    draftRestored: false,
  };
}

function titleFor(state: BookingModalState, canEdit: boolean) {
  return state.mode === "create" ? "Neue Belegung" : canEdit ? "Belegung bearbeiten" : "Belegung ansehen";
}

/**
 * Wird mit einem Key pro Modal-Instanz gerendert (siehe BookingModal), damit beim Öffnen
 * eines neuen/anderen Eintrags der gesamte lokale State automatisch zurückgesetzt wird,
 * statt ihn in einem Effekt manuell zu synchronisieren.
 */
function BookingModalBody({ state, onClose, locations, teams, canEdit, onMutated }: Props & { state: BookingModalState }) {
  const initial = useMemo(() => initialFormFor(state, locations), [state, locations]);
  const [form, setForm] = useState<BookingDraft>(initial.form);
  const [loading, setLoading] = useState(state.mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(initial.draftRestored);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [meta, setMeta] = useState<{ createdByName: string; createdAt: string; updatedByName: string | null; updatedAt: string } | null>(null);
  const [history, setHistory] = useState<{ id: string; summary: string; changedByName: string; changedAt: string }[]>([]);
  const [copyDate, setCopyDate] = useState("");
  const [quickMoveField, setQuickMoveField] = useState("");
  const [saving, startSaving] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  const bookingId = state.mode === "edit" ? state.bookingId : null;
  const activeTeams = useMemo(() => teams.filter((t) => !t.archived), [teams]);

  // Bestehenden Eintrag nachladen (nur im Bearbeiten-Modus)
  useEffect(() => {
    if (state.mode !== "edit") return;
    let cancelled = false;
    getBookingAction(state.bookingId).then((booking) => {
      if (cancelled) return;
      if (!booking) {
        setError("Der Eintrag wurde nicht gefunden.");
        setLoading(false);
        return;
      }
      setForm({
        date: booking.date,
        type: booking.type,
        locationId: booking.field.locationId,
        fieldId: booking.field.id,
        teamId: booking.team.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        note: booking.note ?? "",
        allowMultiple: booking.field.allowMultiple,
      });
      setMeta({
        createdByName: booking.createdByName,
        createdAt: booking.createdAt,
        updatedByName: booking.updatedByName,
        updatedAt: booking.updatedAt,
      });
      setLoading(false);
    });
    listActivityForBookingAction(state.bookingId).then((entries) => {
      if (!cancelled) setHistory(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  // Entwurf automatisch speichern (nur beim Neuanlegen)
  useEffect(() => {
    if (state.mode !== "create") return;
    const t = setTimeout(() => saveDraft(form), 400);
    return () => clearTimeout(t);
  }, [form, state]);

  const inputsValid = !!form.fieldId && !!form.date && form.startTime < form.endTime;

  // Live-Konfliktprüfung
  useEffect(() => {
    if (!inputsValid) return;
    const t = setTimeout(async () => {
      const result = await checkConflictAction({
        fieldId: form.fieldId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        excludeBookingId: bookingId ?? undefined,
      });
      setConflict(result);
    }, 300);
    return () => clearTimeout(t);
  }, [inputsValid, form.fieldId, form.date, form.startTime, form.endTime, bookingId]);

  const availableFields = locations.find((l) => l.id === form.locationId)?.fields ?? [];
  const showConflictWarning = inputsValid && !form.allowMultiple && conflict?.hasConflict;
  const readOnly = !canEdit;

  function update<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSaving(async () => {
      const input = {
        date: form.date,
        type: form.type,
        fieldId: form.fieldId,
        teamId: form.teamId,
        startTime: form.startTime,
        endTime: form.endTime,
        note: form.note || undefined,
        allowMultiple: form.allowMultiple,
      };
      const result = bookingId ? await updateBookingAction(bookingId, input) : await createBookingAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      clearDraft();
      showToast(bookingId ? "Änderungen gespeichert." : "Belegung gespeichert.");
      onMutated();
    });
  }

  function handleDelete() {
    if (!bookingId) return;
    const id = bookingId;
    confirm({
      title: "Eintrag löschen",
      message: "Soll dieser Trainingseintrag wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.",
      confirmLabel: "Löschen",
      danger: true,
      onConfirm: async () => {
        const result = await deleteBookingAction(id);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Eintrag gelöscht.");
        onMutated();
      },
    });
  }

  function handleCopy() {
    if (!bookingId || !copyDate) return;
    const id = bookingId;
    startSaving(async () => {
      const result = await copyBookingAction(id, copyDate);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("Eintrag kopiert.");
      onMutated();
    });
  }

  function handleQuickMove() {
    if (!bookingId || !quickMoveField) return;
    const id = bookingId;
    startSaving(async () => {
      const result = await moveBookingFieldAction(id, quickMoveField);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("Auf anderes Feld verschoben.");
      onMutated();
    });
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">Wird geladen…</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {draftRestored && (
          <div className="flex items-center justify-between rounded-lg border border-info/30 bg-info-light px-3 py-2 text-xs text-info">
            <span>Ein automatisch gespeicherter Entwurf wurde wiederhergestellt.</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                clearDraft();
                setForm(emptyForm);
                setDraftRestored(false);
              }}
            >
              Verwerfen
            </button>
          </div>
        )}

        <div>
          <label className="field-label">Art *</label>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["TRAINING", "SPIEL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                disabled={readOnly}
                onClick={() => update("type", t)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none ${
                  form.type === t ? "bg-brand text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {t === "TRAINING" ? "Training" : "Spiel"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Datum *</label>
            <input type="date" required disabled={readOnly} className="input" value={form.date} onChange={(e) => update("date", e.target.value)} />
            {form.date && <p className="mt-1 text-xs text-muted">{formatGermanDateLong(form.date)}</p>}
          </div>
          <div>
            <label className="field-label">Mannschaft *</label>
            <select required disabled={readOnly} className="select" value={form.teamId} onChange={(e) => update("teamId", e.target.value)}>
              <option value="">Bitte wählen…</option>
              {activeTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Standort *</label>
            <select
              required
              disabled={readOnly}
              className="select"
              value={form.locationId}
              onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value, fieldId: "" }))}
            >
              <option value="">Bitte wählen…</option>
              {Object.entries(
                locations.reduce<Record<string, LocationDTO[]>>((acc, l) => {
                  acc[l.group] = [...(acc[l.group] ?? []), l];
                  return acc;
                }, {}),
              ).map(([group, locs]) => (
                <optgroup key={group} label={group}>
                  {locs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Feld/Platz *</label>
            <select
              required
              disabled={readOnly || !form.locationId}
              className="select"
              value={form.fieldId}
              onChange={(e) => {
                const field = availableFields.find((f) => f.id === e.target.value);
                setForm((f) => ({ ...f, fieldId: e.target.value, allowMultiple: field?.allowMultiple ?? false }));
              }}
            >
              <option value="">Bitte wählen…</option>
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Beginn *</label>
            <input type="time" required disabled={readOnly} className="input" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Ende *</label>
            <input type="time" required disabled={readOnly} className="input" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="field-label">Bemerkung</label>
          <textarea
            disabled={readOnly}
            className="input min-h-[70px] resize-y"
            maxLength={500}
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Optional, z. B. Hinweise zur Einheit"
          />
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm">
          <input type="checkbox" disabled={readOnly} className="mt-0.5" checked={form.allowMultiple} onChange={(e) => update("allowMultiple", e.target.checked)} />
          <span>
            Mehrere Mannschaften können gleichzeitig auf diesem Feld trainieren.
            <span className="block text-xs text-muted">Gilt für alle Belegungen dieses Felds, nicht nur für diesen Eintrag.</span>
          </span>
        </label>

        {showConflictWarning && (
          <div className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2.5 text-sm text-danger">
            <p className="font-semibold">⚠️ Konflikt</p>
            <p>
              Das Feld ist zu diesem Zeitpunkt bereits belegt durch:{" "}
              {conflict?.conflictingBookings.map((c) => `${c.teamName} (${c.startTime}–${c.endTime})`).join(", ")}.
            </p>
          </div>
        )}

        {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}

        {state.mode === "create" && canEdit && (
          <RecurrenceSection
            date={form.date || todayKey()}
            teamId={form.teamId}
            fieldId={form.fieldId}
            startTime={form.startTime}
            endTime={form.endTime}
            note={form.note}
            allowMultiple={form.allowMultiple}
            onCreated={() => {
              clearDraft();
              onMutated();
            }}
          />
        )}

        {state.mode === "edit" && canEdit && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Eintrag kopieren auf</label>
              <div className="flex gap-2">
                <input type="date" className="input" value={copyDate} onChange={(e) => setCopyDate(e.target.value)} />
                <button type="button" className="btn-secondary btn-sm shrink-0" disabled={!copyDate || saving} onClick={handleCopy}>
                  Kopieren
                </button>
              </div>
            </div>
            <div>
              <label className="field-label">Schnell auf anderes Feld verschieben</label>
              <div className="flex gap-2">
                <select className="select" value={quickMoveField} onChange={(e) => setQuickMoveField(e.target.value)}>
                  <option value="">Feld wählen…</option>
                  {locations.flatMap((l) =>
                    l.fields
                      .filter((f) => f.id !== form.fieldId)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {l.name} – {f.name}
                        </option>
                      )),
                  )}
                </select>
                <button type="button" className="btn-secondary btn-sm shrink-0" disabled={!quickMoveField || saving} onClick={handleQuickMove}>
                  Verschieben
                </button>
              </div>
            </div>
          </div>
        )}

        {meta && (
          <div className="rounded-lg bg-surface-muted p-3 text-xs text-muted">
            <p>
              Erstellt von <span className="font-medium text-foreground">{meta.createdByName}</span> am {new Date(meta.createdAt).toLocaleString("de-DE")}
            </p>
            {meta.updatedByName && (
              <p>
                Zuletzt geändert von <span className="font-medium text-foreground">{meta.updatedByName}</span> am{" "}
                {new Date(meta.updatedAt).toLocaleString("de-DE")}
              </p>
            )}
            {history.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-foreground">Änderungsverlauf ({history.length})</summary>
                <ul className="mt-1 space-y-1">
                  {history.map((h) => (
                    <li key={h.id}>
                      {new Date(h.changedAt).toLocaleString("de-DE")} – {h.summary} ({h.changedByName})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            {state.mode === "edit" && canEdit && (
              <button type="button" className="btn-danger btn-sm" onClick={handleDelete}>
                Löschen
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {readOnly ? "Schließen" : "Abbrechen"}
            </button>
            {canEdit && (
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Speichern…" : "Speichern"}
              </button>
            )}
          </div>
        </div>
      </form>
      {dialog}
    </>
  );
}

export function BookingModal({ state, onClose, locations, teams, canEdit, onMutated }: Props) {
  return (
    <Modal open={!!state} onClose={onClose} title={state ? titleFor(state, canEdit) : ""} maxWidth="max-w-xl">
      {state && (
        <BookingModalBody
          key={state.mode === "edit" ? `edit-${state.bookingId}` : "create"}
          state={state}
          onClose={onClose}
          locations={locations}
          teams={teams}
          canEdit={canEdit}
          onMutated={onMutated}
        />
      )}
    </Modal>
  );
}
