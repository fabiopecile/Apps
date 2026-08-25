"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationDTO, TeamDTO } from "@/data/catalog";
import { BookingModal, type BookingModalState } from "./BookingModal";
import { todayKey } from "@/lib/dates";

export function QuickCreateButton({
  locations,
  teams,
  label = "+ Neue Belegung",
  className = "btn-primary",
}: {
  locations: LocationDTO[];
  teams: TeamDTO[];
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<BookingModalState | null>(null);

  return (
    <>
      <button type="button" className={className} onClick={() => setModal({ mode: "create", defaults: { date: todayKey() } })}>
        {label}
      </button>
      <BookingModal
        state={modal}
        onClose={() => setModal(null)}
        locations={locations}
        teams={teams}
        canEdit
        onMutated={() => {
          setModal(null);
          router.refresh();
        }}
      />
    </>
  );
}
