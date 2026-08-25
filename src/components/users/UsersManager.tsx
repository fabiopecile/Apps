"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserDTO } from "@/data/users";
import { createUserAction, deleteUserAction, updateUserAction } from "@/actions/users";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

const roleLabels: Record<string, string> = { ADMIN: "Administrator", EDITOR: "Bearbeiter", VIEWER: "Leser" };

type CreateForm = { name: string; email: string; password: string; role: "ADMIN" | "EDITOR" | "VIEWER" };
type EditForm = { name: string; role: "ADMIN" | "EDITOR" | "VIEWER"; password: string };

export function UsersManager({ users, currentUserId }: { users: UserDTO[]; currentUserId: string }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ name: "", email: "", password: "", role: "VIEWER" });
  const [editUser, setEditUser] = useState<UserDTO | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", role: "VIEWER", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const { showToast } = useToast();

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUserAction(createForm);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("Benutzer angelegt.");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "VIEWER" });
      router.refresh();
    });
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    startTransition(async () => {
      const result = await updateUserAction(editUser.id, { name: editForm.name, role: editForm.role, password: editForm.password || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("Benutzer aktualisiert.");
      setEditUser(null);
      router.refresh();
    });
  }

  function handleDelete(user: UserDTO) {
    confirm({
      title: "Benutzer löschen",
      message: `Soll der Benutzer "${user.name}" wirklich gelöscht werden?`,
      confirmLabel: "Löschen",
      danger: true,
      onConfirm: async () => {
        const result = await deleteUserAction(user.id);
        if (!result.success) {
          showToast(result.error, "error");
          return;
        }
        showToast("Benutzer gelöscht.");
        router.refresh();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Benutzer</h1>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Neuer Benutzer
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">E-Mail</th>
              <th className="px-4 py-2.5">Rolle</th>
              <th className="px-4 py-2.5 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {u.name} {u.id === currentUserId && <span className="text-xs text-muted">(Sie)</span>}
                </td>
                <td className="px-4 py-2.5 text-muted">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className="badge bg-brand-light text-brand-dark">{roleLabels[u.role]}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setEditForm({ name: u.name, role: u.role, password: "" });
                        setError(null);
                        setEditUser(u);
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button type="button" className="btn-danger btn-sm" disabled={u.id === currentUserId} onClick={() => handleDelete(u)}>
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Neuer Benutzer" maxWidth="max-w-sm">
        <form onSubmit={submitCreate} className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input required className="input" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">E-Mail *</label>
            <input required type="email" className="input" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Passwort *</label>
            <input required type="password" minLength={6} className="input" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Rolle *</label>
            <select className="select" value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as CreateForm["role"] }))}>
              <option value="VIEWER">Leser (nur Lesezugriff)</option>
              <option value="EDITOR">Bearbeiter (Kalender bearbeiten)</option>
              <option value="ADMIN">Administrator (voller Zugriff)</option>
            </select>
          </div>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={pending}>
              Anlegen
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Benutzer bearbeiten: ${editUser?.name ?? ""}`} maxWidth="max-w-sm">
        <form onSubmit={submitEdit} className="space-y-3">
          <div>
            <label className="field-label">Name *</label>
            <input required className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Rolle *</label>
            <select className="select" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as EditForm["role"] }))}>
              <option value="VIEWER">Leser (nur Lesezugriff)</option>
              <option value="EDITOR">Bearbeiter (Kalender bearbeiten)</option>
              <option value="ADMIN">Administrator (voller Zugriff)</option>
            </select>
          </div>
          <div>
            <label className="field-label">Neues Passwort</label>
            <input type="password" minLength={6} className="input" placeholder="Nur ausfüllen, um es zu ändern" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setEditUser(null)}>
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
