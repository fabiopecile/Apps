"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LocationDTO } from "@/data/catalog";
import {
  createFieldAction,
  createLocationAction,
  deleteFieldAction,
  deleteLocationAction,
  updateFieldAction,
  updateLocationAction,
} from "@/actions/catalog";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

type LocationForm = { name: string; group: string };
type FieldForm = { name: string; allowMultiple: boolean };

export function LocationsManager({ locations, canEdit }: { locations: LocationDTO[]; canEdit: boolean }) {
  const router = useRouter();
  const [locationModal, setLocationModal] = useState<{ mode: "create" | "edit"; location?: LocationDTO } | null>(null);
  const [locationForm, setLocationForm] = useState<LocationForm>({ name: "", group: "" });
  const [fieldModal, setFieldModal] = useState<{ mode: "create" | "edit"; locationId: string; field?: LocationDTO["fields"][number] } | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldForm>({ name: "", allowMultiple: false });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  const groups = [...new Set(locations.map((l) => l.group))];

  function submitLocation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        locationModal?.mode === "edit" && locationModal.location
          ? await updateLocationAction(locationModal.location.id, locationForm)
          : await createLocationAction(locationForm);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast(locationModal?.mode === "edit" ? "Standort aktualisiert." : "Standort angelegt.");
      setLocationModal(null);
      router.refresh();
    });
  }

  function submitField(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldModal) return;
    setError(null);
    startTransition(async () => {
      const input = { locationId: fieldModal.locationId, name: fieldForm.name, allowMultiple: fieldForm.allowMultiple };
      const result = fieldModal.mode === "edit" && fieldModal.field ? await updateFieldAction(fieldModal.field.id, input) : await createFieldAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast(fieldModal.mode === "edit" ? "Feld aktualisiert." : "Feld angelegt.");
      setFieldModal(null);
      router.refresh();
    });
  }

  function toggleAllowMultiple(field: LocationDTO["fields"][number], locationId: string) {
    startTransition(async () => {
      const result = await updateFieldAction(field.id, { locationId, name: field.name, allowMultiple: !field.allowMultiple });
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteLocation(location: LocationDTO) {
    const totalBookings = location.fields.reduce((sum, f) => sum + f.bookingCount, 0);
    confirm({
      title: "Standort löschen",
      message:
        totalBookings > 0
          ? `Dieser Standort hat ${location.fields.length} Feld(er) mit insgesamt ${totalBookings} Trainingszeit(en). Beim Löschen werden alle Felder und zugehörigen Kalendereinträge entfernt.`
          : "Soll dieser Standort wirklich gelöscht werden?",
      confirmLabel: "Endgültig löschen",
      danger: true,
      onConfirm: async () => {
        const result = await deleteLocationAction(location.id);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Standort gelöscht.");
        router.refresh();
      },
    });
  }

  function handleDeleteField(field: LocationDTO["fields"][number]) {
    confirm({
      title: "Feld löschen",
      message:
        field.bookingCount > 0
          ? `Für dieses Feld existieren noch ${field.bookingCount} Trainingszeit(en). Diese werden beim Löschen ebenfalls entfernt.`
          : "Soll dieses Feld wirklich gelöscht werden?",
      confirmLabel: "Endgültig löschen",
      danger: true,
      onConfirm: async () => {
        const result = await deleteFieldAction(field.id);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Feld gelöscht.");
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Standorte</h1>
        {canEdit && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setLocationForm({ name: "", group: groups[0] ?? "Weitere Plätze" });
              setError(null);
              setLocationModal({ mode: "create" });
            }}
          >
            + Neuer Standort
          </button>
        )}
      </div>

      {groups.map((group) => (
        <div key={group}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">{group}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {locations
              .filter((l) => l.group === group)
              .map((location) => (
                <div key={location.id} className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{location.name}</h3>
                    {canEdit && (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setLocationForm({ name: location.name, group: location.group });
                            setError(null);
                            setLocationModal({ mode: "edit", location });
                          }}
                        >
                          Bearbeiten
                        </button>
                        <button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteLocation(location)}>
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {location.fields.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{f.name}</p>
                          <p className="text-xs text-muted">{f.bookingCount} Trainingszeit(en)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-muted">
                            <input
                              type="checkbox"
                              disabled={!canEdit || pending}
                              checked={f.allowMultiple}
                              onChange={() => toggleAllowMultiple(f, location.id)}
                            />
                            Mehrfachbelegung
                          </label>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => {
                                  setFieldForm({ name: f.name, allowMultiple: f.allowMultiple });
                                  setError(null);
                                  setFieldModal({ mode: "edit", locationId: location.id, field: f });
                                }}
                              >
                                Bearbeiten
                              </button>
                              <button type="button" className="btn-danger btn-sm" onClick={() => handleDeleteField(f)}>
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {canEdit && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm w-full"
                        onClick={() => {
                          setFieldForm({ name: "", allowMultiple: false });
                          setError(null);
                          setFieldModal({ mode: "create", locationId: location.id });
                        }}
                      >
                        + Feld hinzufügen
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      <Modal open={!!locationModal} onClose={() => setLocationModal(null)} title={locationModal?.mode === "edit" ? "Standort bearbeiten" : "Neuer Standort"} maxWidth="max-w-sm">
        <form onSubmit={submitLocation} className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input required className="input" value={locationForm.name} onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Gruppe *</label>
            <input required className="input" list="location-groups" value={locationForm.group} onChange={(e) => setLocationForm((f) => ({ ...f, group: e.target.value }))} />
            <datalist id="location-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setLocationModal(null)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              Speichern
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!fieldModal} onClose={() => setFieldModal(null)} title={fieldModal?.mode === "edit" ? "Feld bearbeiten" : "Neues Feld"} maxWidth="max-w-sm">
        <form onSubmit={submitField} className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input required className="input" value={fieldForm.name} onChange={(e) => setFieldForm((f) => ({ ...f, name: e.target.value }))} placeholder="z. B. Hauptfeld" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fieldForm.allowMultiple} onChange={(e) => setFieldForm((f) => ({ ...f, allowMultiple: e.target.checked }))} />
            Mehrere Mannschaften können gleichzeitig auf diesem Feld trainieren.
          </label>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setFieldModal(null)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              Speichern
            </button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
