"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TeamDTO } from "@/data/catalog";
import { createTeamAction, deleteTeamAction, setTeamArchivedAction, updateTeamAction } from "@/actions/catalog";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

const PRESET_COLORS = [
  "#60a5fa",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#4ade80",
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#fb923c",
  "#f97316",
  "#ea580c",
  "#7c3aed",
  "#db2777",
  "#0891b2",
];

type FormState = { name: string; ageGroup: string; trainer: string; trainingGroup: string; color: string };
const emptyForm: FormState = { name: "", ageGroup: "", trainer: "", trainingGroup: "", color: PRESET_COLORS[0] };

export function TeamsManager({ teams, canEdit }: { teams: TeamDTO[]; canEdit: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<{ mode: "create" | "edit"; team?: TeamDTO } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setModal({ mode: "create" });
  }
  function openEdit(team: TeamDTO) {
    setForm({ name: team.name, ageGroup: team.ageGroup ?? "", trainer: team.trainer ?? "", trainingGroup: team.trainingGroup ?? "", color: team.color });
    setError(null);
    setModal({ mode: "edit", team });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const input = {
        name: form.name,
        ageGroup: form.ageGroup || null,
        trainer: form.trainer || null,
        trainingGroup: form.trainingGroup || null,
        color: form.color,
      };
      const result = modal?.mode === "edit" && modal.team ? await updateTeamAction(modal.team.id, input) : await createTeamAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast(modal?.mode === "edit" ? "Mannschaft aktualisiert." : "Mannschaft angelegt.");
      setModal(null);
      router.refresh();
    });
  }

  function handleArchive(team: TeamDTO) {
    startTransition(async () => {
      const result = await setTeamArchivedAction(team.id, !team.archived);
      if (!result.success) {
        showToast(result.error, "error");
        return;
      }
      showToast(team.archived ? "Mannschaft reaktiviert." : "Mannschaft archiviert.");
      router.refresh();
    });
  }

  function handleDelete(team: TeamDTO) {
    confirm({
      title: "Mannschaft löschen",
      message:
        team.bookingCount > 0
          ? `Diese Mannschaft hat noch ${team.bookingCount} Trainingszeit(en). Beim Löschen werden auch alle zugehörigen Einträge im Kalender entfernt. Alternativ können Sie die Mannschaft stattdessen archivieren.`
          : "Soll diese Mannschaft wirklich gelöscht werden?",
      confirmLabel: "Endgültig löschen",
      danger: true,
      onConfirm: async () => {
        const result = await deleteTeamAction(team.id);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Mannschaft gelöscht.");
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mannschaften</h1>
        {canEdit && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Neue Mannschaft
          </button>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5">Mannschaft</th>
              <th className="px-4 py-2.5">Altersklasse</th>
              <th className="px-4 py-2.5">Trainer</th>
              <th className="px-4 py-2.5">Trainingsgruppe</th>
              <th className="px-4 py-2.5">Trainings</th>
              <th className="px-4 py-2.5">Status</th>
              {canEdit && <th className="px-4 py-2.5 text-right">Aktionen</th>}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className={`border-t border-border ${t.archived ? "opacity-60" : ""}`}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-medium text-foreground">{t.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted">{t.ageGroup ?? "–"}</td>
                <td className="px-4 py-2.5 text-muted">{t.trainer ?? "–"}</td>
                <td className="px-4 py-2.5 text-muted">{t.trainingGroup ?? "–"}</td>
                <td className="px-4 py-2.5 text-muted">{t.bookingCount}</td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${t.archived ? "bg-surface-muted text-muted" : "bg-brand-light text-brand-dark"}`}>
                    {t.archived ? "Archiviert" : "Aktiv"}
                  </span>
                </td>
                {canEdit && (
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(t)}>
                        Bearbeiten
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleArchive(t)}>
                        {t.archived ? "Reaktivieren" : "Archivieren"}
                      </button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => handleDelete(t)}>
                        Löschen
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Mannschaft bearbeiten" : "Neue Mannschaft"} maxWidth="max-w-md">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input required className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="z. B. U13" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Altersklasse</label>
              <input className="input" value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Trainer</label>
              <input className="input" value={form.trainer} onChange={(e) => setForm((f) => ({ ...f, trainer: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="field-label">Trainingsgruppe</label>
            <input className="input" value={form.trainingGroup} onChange={(e) => setForm((f) => ({ ...f, trainingGroup: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Farbe</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input type="color" className="h-7 w-9 rounded border border-border" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      </Modal>
      {dialog}
    </div>
  );
}
