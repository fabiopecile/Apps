import "server-only";
import { prisma } from "@/lib/db";
import { requireEditor, requireSession, type SessionPayload } from "@/lib/session";
import { ActionResult, fail, guarded, ok } from "@/lib/action-result";
import { BookingInputSchema, SeriesInputSchema, type BookingInput, type SeriesInput } from "@/lib/validation";
import { addDaysToKey, parseDateKey, rangesOverlap, weekdayOfDateKey, WEEKDAY_NAMES } from "@/lib/dates";
import type { Prisma } from "@prisma/client";

const bookingInclude = {
  team: true,
  field: { include: { location: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export type BookingDTO = {
  id: string;
  date: string;
  weekday: number;
  type: "TRAINING" | "SPIEL";
  startTime: string;
  endTime: string;
  note: string | null;
  seriesId: string | null;
  team: { id: string; name: string; color: string; ageGroup: string | null };
  field: { id: string; name: string; allowMultiple: boolean; locationId: string; locationName: string; locationGroup: string };
  createdByName: string;
  createdAt: string;
  updatedByName: string | null;
  updatedAt: string;
};

function toDTO(b: BookingWithRelations): BookingDTO {
  return {
    id: b.id,
    date: b.date,
    weekday: b.weekday,
    type: b.type,
    startTime: b.startTime,
    endTime: b.endTime,
    note: b.note,
    seriesId: b.seriesId,
    team: { id: b.team.id, name: b.team.name, color: b.team.color, ageGroup: b.team.ageGroup },
    field: {
      id: b.field.id,
      name: b.field.name,
      allowMultiple: b.field.allowMultiple,
      locationId: b.field.location.id,
      locationName: b.field.location.name,
      locationGroup: b.field.location.group,
    },
    createdByName: b.createdByName,
    createdAt: b.createdAt.toISOString(),
    updatedByName: b.updatedByName,
    updatedAt: b.updatedAt.toISOString(),
  };
}

export type BookingFilter = {
  from?: string;
  to?: string;
  locationId?: string;
  fieldId?: string;
  teamId?: string;
  search?: string;
};

export async function listBookings(filter: BookingFilter = {}): Promise<BookingDTO[]> {
  await requireSession();
  const where: Prisma.BookingWhereInput = {};
  if (filter.from || filter.to) {
    where.date = {};
    if (filter.from) where.date.gte = filter.from;
    if (filter.to) where.date.lte = filter.to;
  }
  if (filter.fieldId) where.fieldId = filter.fieldId;
  if (filter.locationId) where.field = { locationId: filter.locationId };
  if (filter.teamId) where.teamId = filter.teamId;
  if (filter.search) {
    where.OR = [
      { team: { name: { contains: filter.search } } },
      { note: { contains: filter.search } },
      { field: { name: { contains: filter.search } } },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return bookings.map(toDTO);
}

export async function getBooking(id: string): Promise<BookingDTO | null> {
  await requireSession();
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  return booking ? toDTO(booking) : null;
}

type ConflictCheckInput = {
  fieldId: string;
  date: string;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;
};

export type ConflictInfo = {
  hasConflict: boolean;
  allowMultiple: boolean;
  conflictingBookings: { id: string; teamName: string; teamColor: string; startTime: string; endTime: string }[];
};

async function findConflicts(input: ConflictCheckInput): Promise<{ field: { allowMultiple: boolean } | null; conflicts: BookingWithRelations[] }> {
  const field = await prisma.field.findUnique({ where: { id: input.fieldId } });
  if (!field) return { field: null, conflicts: [] };

  const sameFieldSameDay = await prisma.booking.findMany({
    where: {
      fieldId: input.fieldId,
      date: input.date,
      ...(input.excludeBookingId ? { id: { not: input.excludeBookingId } } : {}),
    },
    include: bookingInclude,
  });

  const conflicts = sameFieldSameDay.filter((b) => rangesOverlap(input.startTime, input.endTime, b.startTime, b.endTime));
  return { field: { allowMultiple: field.allowMultiple }, conflicts };
}

export async function checkConflict(input: ConflictCheckInput): Promise<ConflictInfo> {
  await requireSession();
  const { field, conflicts } = await findConflicts(input);
  const allowMultiple = field?.allowMultiple ?? false;
  return {
    hasConflict: !allowMultiple && conflicts.length > 0,
    allowMultiple,
    conflictingBookings: conflicts.map((c) => ({
      id: c.id,
      teamName: c.team.name,
      teamColor: c.team.color,
      startTime: c.startTime,
      endTime: c.endTime,
    })),
  };
}

async function logActivity(
  action: "CREATED" | "UPDATED" | "DELETED",
  booking: BookingWithRelations,
  session: SessionPayload,
  summary: string,
) {
  await prisma.activityLog.create({
    data: {
      bookingId: booking.id,
      action,
      summary,
      teamName: booking.team.name,
      fieldName: booking.field.name,
      locationName: booking.field.location.name,
      date: booking.date,
      changedById: session.id,
      changedByName: session.name,
    },
  });
}

export async function createBooking(input: BookingInput): Promise<ActionResult<BookingDTO>> {
  return guarded(requireEditor, async (session) => {
    const parsed = BookingInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const data = parsed.data;

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field) return fail("Das gewählte Feld existiert nicht mehr.");
    const team = await prisma.team.findUnique({ where: { id: data.teamId } });
    if (!team) return fail("Die gewählte Mannschaft existiert nicht mehr.");

    const effectiveAllowMultiple = data.allowMultiple ?? field.allowMultiple;
    if (!effectiveAllowMultiple) {
      const { conflicts } = await findConflicts(data);
      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.team.name).join(", ");
        return fail(`Das Feld "${field.name}" ist zu diesem Zeitpunkt bereits durch ${names} belegt.`);
      }
    }

    if (data.allowMultiple !== undefined && data.allowMultiple !== field.allowMultiple) {
      await prisma.field.update({ where: { id: field.id }, data: { allowMultiple: data.allowMultiple } });
    }

    const created = await prisma.booking.create({
      data: {
        date: data.date,
        weekday: weekdayOfDateKey(data.date),
        type: data.type,
        fieldId: data.fieldId,
        teamId: data.teamId,
        startTime: data.startTime,
        endTime: data.endTime,
        note: data.note || null,
        createdById: session.id,
        createdByName: session.name,
      },
      include: bookingInclude,
    });

    await logActivity("CREATED", created, session, `Belegung erstellt: ${created.team.name}, ${created.startTime}–${created.endTime} Uhr.`);
    return ok(toDTO(created));
  });
}

export async function updateBooking(id: string, input: BookingInput): Promise<ActionResult<BookingDTO>> {
  return guarded(requireEditor, async (session) => {
    const parsed = BookingInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const data = parsed.data;

    const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!existing) return fail("Der Eintrag wurde nicht gefunden.");

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field) return fail("Das gewählte Feld existiert nicht mehr.");
    const team = await prisma.team.findUnique({ where: { id: data.teamId } });
    if (!team) return fail("Die gewählte Mannschaft existiert nicht mehr.");

    const effectiveAllowMultiple = data.allowMultiple ?? field.allowMultiple;
    if (!effectiveAllowMultiple) {
      const { conflicts } = await findConflicts({ ...data, excludeBookingId: id });
      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.team.name).join(", ");
        return fail(`Das Feld "${field.name}" ist zu diesem Zeitpunkt bereits durch ${names} belegt.`);
      }
    }

    if (data.allowMultiple !== undefined && data.allowMultiple !== field.allowMultiple) {
      await prisma.field.update({ where: { id: field.id }, data: { allowMultiple: data.allowMultiple } });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        date: data.date,
        weekday: weekdayOfDateKey(data.date),
        type: data.type,
        fieldId: data.fieldId,
        teamId: data.teamId,
        startTime: data.startTime,
        endTime: data.endTime,
        note: data.note || null,
        updatedById: session.id,
        updatedByName: session.name,
      },
      include: bookingInclude,
    });

    await logActivity("UPDATED", updated, session, `Belegung bearbeitet: ${updated.team.name}, ${updated.startTime}–${updated.endTime} Uhr.`);
    return ok(toDTO(updated));
  });
}

export async function deleteBooking(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async (session) => {
    const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!existing) return fail("Der Eintrag wurde nicht gefunden.");

    await logActivity("DELETED", existing, session, `Belegung gelöscht: ${existing.team.name}, ${existing.startTime}–${existing.endTime} Uhr.`);
    await prisma.booking.delete({ where: { id } });
    return ok({ id });
  });
}

export async function moveBookingField(id: string, newFieldId: string): Promise<ActionResult<BookingDTO>> {
  return guarded(requireEditor, async (session) => {
    const existing = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!existing) return fail("Der Eintrag wurde nicht gefunden.");
    const field = await prisma.field.findUnique({ where: { id: newFieldId } });
    if (!field) return fail("Das Zielfeld existiert nicht.");

    if (!field.allowMultiple) {
      const { conflicts } = await findConflicts({
        fieldId: newFieldId,
        date: existing.date,
        startTime: existing.startTime,
        endTime: existing.endTime,
        excludeBookingId: id,
      });
      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.team.name).join(", ");
        return fail(`Das Feld "${field.name}" ist zu diesem Zeitpunkt bereits durch ${names} belegt.`);
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { fieldId: newFieldId, updatedById: session.id, updatedByName: session.name },
      include: bookingInclude,
    });
    await logActivity(
      "UPDATED",
      updated,
      session,
      `Auf anderes Feld verschoben: ${existing.field.name} → ${updated.field.name}.`,
    );
    return ok(toDTO(updated));
  });
}

export async function copyBooking(id: string, newDate: string): Promise<ActionResult<BookingDTO>> {
  return guarded(requireEditor, async (session) => {
    const source = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!source) return fail("Der Eintrag wurde nicht gefunden.");

    if (!source.field.allowMultiple) {
      const { conflicts } = await findConflicts({
        fieldId: source.fieldId,
        date: newDate,
        startTime: source.startTime,
        endTime: source.endTime,
      });
      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.team.name).join(", ");
        return fail(`Das Feld "${source.field.name}" ist am ${newDate} bereits durch ${names} belegt.`);
      }
    }

    const created = await prisma.booking.create({
      data: {
        date: newDate,
        weekday: weekdayOfDateKey(newDate),
        type: source.type,
        fieldId: source.fieldId,
        teamId: source.teamId,
        startTime: source.startTime,
        endTime: source.endTime,
        note: source.note,
        createdById: session.id,
        createdByName: session.name,
      },
      include: bookingInclude,
    });
    await logActivity("CREATED", created, session, `Belegung kopiert von ${source.date}.`);
    return ok(toDTO(created));
  });
}

export async function duplicateDay(fromDate: string, toDate: string): Promise<ActionResult<{ created: number; skipped: number; skippedReasons: string[] }>> {
  return guarded(requireEditor, async (session) => {
    if (fromDate === toDate) return fail("Zieldatum muss sich vom Ausgangsdatum unterscheiden.");
    const sourceBookings = await prisma.booking.findMany({ where: { date: fromDate }, include: bookingInclude });
    if (sourceBookings.length === 0) return fail("Für den gewählten Tag gibt es keine Einträge zum Duplizieren.");

    let created = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const source of sourceBookings) {
      if (!source.field.allowMultiple) {
        const { conflicts } = await findConflicts({
          fieldId: source.fieldId,
          date: toDate,
          startTime: source.startTime,
          endTime: source.endTime,
        });
        if (conflicts.length > 0) {
          skipped++;
          skippedReasons.push(`${source.team.name} (${source.field.name}, ${source.startTime}–${source.endTime}) – Feld bereits belegt.`);
          continue;
        }
      }
      const createdBooking = await prisma.booking.create({
        data: {
          date: toDate,
          weekday: weekdayOfDateKey(toDate),
          type: source.type,
          fieldId: source.fieldId,
          teamId: source.teamId,
          startTime: source.startTime,
          endTime: source.endTime,
          note: source.note,
          createdById: session.id,
          createdByName: session.name,
        },
        include: bookingInclude,
      });
      await logActivity("CREATED", createdBooking, session, `Trainingstag dupliziert von ${fromDate}.`);
      created++;
    }

    return ok({ created, skipped, skippedReasons });
  });
}

export async function listActivityForBooking(bookingId: string) {
  await requireSession();
  const entries = await prisma.activityLog.findMany({
    where: { bookingId },
    orderBy: { changedAt: "desc" },
  });
  return entries.map((e) => ({ ...e, changedAt: e.changedAt.toISOString() }));
}

// --- Serien ("Training wiederholen") ---

export type SeriesPreviewItem = {
  date: string;
  weekday: number;
  hasConflict: boolean;
  conflictingTeams: string[];
};

function datesForSeries(input: SeriesInput): string[] {
  const dates: string[] = [];
  let cursor = parseDateKey(input.startDate);
  const end = parseDateKey(input.endDate);
  // Auf den ersten passenden Wochentag vorspulen
  while (weekdayOfDateKey(formatKey(cursor)) !== input.weekday) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    if (cursor > end) return dates;
  }
  let key = formatKey(cursor);
  while (key <= input.endDate) {
    dates.push(key);
    key = addDaysToKey(key, 7);
  }
  return dates;
}

function formatKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function previewSeries(input: SeriesInput): Promise<ActionResult<SeriesPreviewItem[]>> {
  return guarded(requireEditor, async () => {
    const parsed = SeriesInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const data = parsed.data;

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field) return fail("Das gewählte Feld existiert nicht mehr.");

    const dates = datesForSeries(data);
    if (dates.length === 0) return fail("Im gewählten Zeitraum liegt kein passender Wochentag.");
    if (dates.length > 80) return fail("Der Zeitraum ist zu lang (mehr als 80 Termine). Bitte eingrenzen.");

    const effectiveAllowMultiple = data.allowMultiple ?? field.allowMultiple;
    const items: SeriesPreviewItem[] = [];
    for (const date of dates) {
      if (effectiveAllowMultiple) {
        items.push({ date, weekday: data.weekday, hasConflict: false, conflictingTeams: [] });
        continue;
      }
      const { conflicts } = await findConflicts({ fieldId: data.fieldId, date, startTime: data.startTime, endTime: data.endTime });
      items.push({
        date,
        weekday: data.weekday,
        hasConflict: conflicts.length > 0,
        conflictingTeams: conflicts.map((c) => c.team.name),
      });
    }
    return ok(items);
  });
}

export async function createSeries(input: SeriesInput): Promise<ActionResult<{ created: number; skipped: number }>> {
  return guarded(requireEditor, async (session) => {
    const parsed = SeriesInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const data = parsed.data;

    const field = await prisma.field.findUnique({ where: { id: data.fieldId } });
    if (!field) return fail("Das gewählte Feld existiert nicht mehr.");
    const team = await prisma.team.findUnique({ where: { id: data.teamId } });
    if (!team) return fail("Die gewählte Mannschaft existiert nicht mehr.");

    const dates = datesForSeries(data);
    if (dates.length === 0) return fail("Im gewählten Zeitraum liegt kein passender Wochentag.");
    if (dates.length > 80) return fail("Der Zeitraum ist zu lang (mehr als 80 Termine). Bitte eingrenzen.");

    if (data.allowMultiple !== undefined && data.allowMultiple !== field.allowMultiple) {
      await prisma.field.update({ where: { id: field.id }, data: { allowMultiple: data.allowMultiple } });
    }
    const effectiveAllowMultiple = data.allowMultiple ?? field.allowMultiple;

    const series = await prisma.series.create({
      data: {
        teamId: data.teamId,
        fieldId: data.fieldId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note || null,
        createdById: session.id,
      },
    });

    let created = 0;
    let skipped = 0;
    for (const date of dates) {
      if (!effectiveAllowMultiple) {
        const { conflicts } = await findConflicts({ fieldId: data.fieldId, date, startTime: data.startTime, endTime: data.endTime });
        if (conflicts.length > 0) {
          skipped++;
          continue;
        }
      }
      const createdBooking = await prisma.booking.create({
        data: {
          date,
          weekday: weekdayOfDateKey(date),
          fieldId: data.fieldId,
          teamId: data.teamId,
          startTime: data.startTime,
          endTime: data.endTime,
          note: data.note || null,
          seriesId: series.id,
          createdById: session.id,
          createdByName: session.name,
        },
        include: bookingInclude,
      });
      await logActivity("CREATED", createdBooking, session, `Serie angelegt (${WEEKDAY_NAMES[data.weekday]}, ${data.startDate}–${data.endDate}).`);
      created++;
    }

    return ok({ created, skipped });
  });
}

// --- Konfliktübersicht ---

export type ConflictGroup = {
  fieldId: string;
  fieldName: string;
  locationName: string;
  date: string;
  bookings: { id: string; teamName: string; teamColor: string; startTime: string; endTime: string }[];
};

export async function listConflicts(): Promise<ConflictGroup[]> {
  await requireSession();
  const fields = await prisma.field.findMany({
    where: { allowMultiple: false },
    include: {
      location: true,
      bookings: { include: { team: true }, orderBy: [{ date: "asc" }, { startTime: "asc" }] },
    },
  });

  const groups: ConflictGroup[] = [];
  for (const field of fields) {
    const byDate = new Map<string, typeof field.bookings>();
    for (const b of field.bookings) {
      const list = byDate.get(b.date) ?? [];
      list.push(b);
      byDate.set(b.date, list);
    }
    for (const [date, bookings] of byDate) {
      if (bookings.length < 2) continue;
      const overlapping = new Set<string>();
      for (let i = 0; i < bookings.length; i++) {
        for (let j = i + 1; j < bookings.length; j++) {
          if (rangesOverlap(bookings[i].startTime, bookings[i].endTime, bookings[j].startTime, bookings[j].endTime)) {
            overlapping.add(bookings[i].id);
            overlapping.add(bookings[j].id);
          }
        }
      }
      if (overlapping.size > 0) {
        groups.push({
          fieldId: field.id,
          fieldName: field.name,
          locationName: field.location.name,
          date,
          bookings: bookings
            .filter((b) => overlapping.has(b.id))
            .map((b) => ({ id: b.id, teamName: b.team.name, teamColor: b.team.color, startTime: b.startTime, endTime: b.endTime })),
        });
      }
    }
  }

  groups.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return groups;
}
