"use client";

import { useState, useTransition } from "react";
import { duplicateDayAction } from "@/actions/bookings";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

export function DuplicateDayButton({ date, onDone }: { date: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  function submit() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await duplicateDayAction(date, target);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const { created, skipped, skippedReasons } = result.data;
      showToast(
        skipped > 0
          ? `${created} Einträge dupliziert, ${skipped} wegen Konflikten übersprungen.`
          : `${created} Einträge dupliziert.`,
        skipped > 0 ? "info" : "success",
      );
      if (skippedReasons.length > 0) console.info("Übersprungen:", skippedReasons);
      setOpen(false);
      setTarget("");
      onDone();
    });
  }

  return (
    <>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(true)}>
        Tag duplizieren
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Trainingstag duplizieren" maxWidth="max-w-sm">
        <p className="mb-3 text-sm text-muted">Alle Belegungen dieses Tages werden auf ein neues Datum kopiert.</p>
        <label className="field-label">Zieldatum</label>
        <input type="date" className="input" value={target} onChange={(e) => setTarget(e.target.value)} />
        {error && <p className="mt-2 rounded-lg border border-danger/30 bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Abbrechen
          </button>
          <button type="button" className="btn-primary" disabled={!target || pending} onClick={submit}>
            {pending ? "Wird dupliziert…" : "Duplizieren"}
          </button>
        </div>
      </Modal>
    </>
  );
}
