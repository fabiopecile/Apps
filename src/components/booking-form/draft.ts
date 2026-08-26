"use client";

export type BookingDraft = {
  date: string;
  type: "TRAINING" | "SPIEL";
  locationId: string;
  fieldId: string;
  teamId: string;
  startTime: string;
  endTime: string;
  note: string;
  allowMultiple: boolean;
};

const DRAFT_KEY = "nwp:draft:new-booking";

export function saveDraft(draft: BookingDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // localStorage evtl. nicht verfügbar – automatische Speicherung ist ein Komfortfeature, kein Muss.
  }
}

export function loadDraft(): (BookingDraft & { savedAt: number }) | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
