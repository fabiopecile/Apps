import "server-only";
import { prisma } from "@/lib/db";
import { requireEditor, requireSession } from "@/lib/session";
import { ActionResult, fail, guarded, ok } from "@/lib/action-result";
import { FieldInputSchema, LocationInputSchema, TeamInputSchema, type FieldInput, type LocationInput, type TeamInput } from "@/lib/validation";

export type TeamDTO = {
  id: string;
  name: string;
  ageGroup: string | null;
  trainer: string | null;
  trainingGroup: string | null;
  color: string;
  archived: boolean;
  bookingCount: number;
};

export async function listTeams(): Promise<TeamDTO[]> {
  await requireSession();
  const teams = await prisma.team.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { bookings: true } } },
  });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    ageGroup: t.ageGroup,
    trainer: t.trainer,
    trainingGroup: t.trainingGroup,
    color: t.color,
    archived: t.archived,
    bookingCount: t._count.bookings,
  }));
}

export async function createTeam(input: TeamInput): Promise<ActionResult<TeamDTO>> {
  return guarded(requireEditor, async () => {
    const parsed = TeamInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const existing = await prisma.team.findUnique({ where: { name: parsed.data.name } });
    if (existing) return fail("Eine Mannschaft mit diesem Namen existiert bereits.");
    const maxOrder = await prisma.team.aggregate({ _max: { order: true } });
    const team = await prisma.team.create({
      data: { ...parsed.data, order: (maxOrder._max.order ?? 0) + 1 },
    });
    return ok({ ...team, bookingCount: 0 });
  });
}

export async function updateTeam(id: string, input: TeamInput): Promise<ActionResult<TeamDTO>> {
  return guarded(requireEditor, async () => {
    const parsed = TeamInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const existing = await prisma.team.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
    if (existing) return fail("Eine Mannschaft mit diesem Namen existiert bereits.");
    const team = await prisma.team.update({ where: { id }, data: parsed.data, include: { _count: { select: { bookings: true } } } });
    return ok({ ...team, bookingCount: team._count.bookings });
  });
}

export async function setTeamArchived(id: string, archived: boolean): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    await prisma.team.update({ where: { id }, data: { archived } });
    return ok({ id });
  });
}

export async function deleteTeam(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    await prisma.team.delete({ where: { id } });
    return ok({ id });
  });
}

export type LocationDTO = {
  id: string;
  name: string;
  group: string;
  order: number;
  fields: { id: string; name: string; allowMultiple: boolean; order: number; bookingCount: number }[];
};

export async function listLocations(): Promise<LocationDTO[]> {
  await requireSession();
  const locations = await prisma.location.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { fields: { orderBy: { order: "asc" }, include: { _count: { select: { bookings: true } } } } },
  });
  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    group: l.group,
    order: l.order,
    fields: l.fields.map((f) => ({ id: f.id, name: f.name, allowMultiple: f.allowMultiple, order: f.order, bookingCount: f._count.bookings })),
  }));
}

export async function createLocation(input: LocationInput): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    const parsed = LocationInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const maxOrder = await prisma.location.aggregate({ _max: { order: true } });
    const location = await prisma.location.create({ data: { ...parsed.data, order: (maxOrder._max.order ?? 0) + 1 } });
    return ok({ id: location.id });
  });
}

export async function updateLocation(id: string, input: LocationInput): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    const parsed = LocationInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    await prisma.location.update({ where: { id }, data: parsed.data });
    return ok({ id });
  });
}

export async function deleteLocation(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    await prisma.location.delete({ where: { id } });
    return ok({ id });
  });
}

export async function createField(input: FieldInput): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    const parsed = FieldInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const maxOrder = await prisma.field.aggregate({ _max: { order: true }, where: { locationId: parsed.data.locationId } });
    const field = await prisma.field.create({ data: { ...parsed.data, order: (maxOrder._max.order ?? 0) + 1 } });
    return ok({ id: field.id });
  });
}

export async function updateField(id: string, input: FieldInput): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    const parsed = FieldInputSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    await prisma.field.update({ where: { id }, data: parsed.data });
    return ok({ id });
  });
}

export async function deleteField(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(requireEditor, async () => {
    await prisma.field.delete({ where: { id } });
    return ok({ id });
  });
}
