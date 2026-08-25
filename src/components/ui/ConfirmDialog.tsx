"use client";

import { useState, useTransition } from "react";
import { Modal } from "./Modal";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
};

/** Kleiner Hook für einen Bestätigungsdialog, z. B. vor dem Löschen eines Eintrags. */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = (opts: ConfirmOptions) => setOptions(opts);

  const dialog = (
    <Modal open={!!options} onClose={() => setOptions(null)} title={options?.title ?? ""} maxWidth="max-w-sm">
      <p className="text-sm text-muted">{options?.message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => setOptions(null)} disabled={pending}>
          Abbrechen
        </button>
        <button
          type="button"
          className={options?.danger ? "btn-danger" : "btn-primary"}
          disabled={pending}
          onClick={() => {
            const opts = options;
            if (!opts) return;
            startTransition(async () => {
              await opts.onConfirm();
              setOptions(null);
            });
          }}
        >
          {pending ? "Bitte warten…" : (options?.confirmLabel ?? "Bestätigen")}
        </button>
      </div>
    </Modal>
  );

  return { confirm, dialog };
}
