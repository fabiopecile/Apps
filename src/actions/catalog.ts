"use server";

import { revalidatePath } from "next/cache";
import * as dal from "@/data/catalog";
import type { FieldInput, LocationInput, TeamInput } from "@/lib/validation";

function revalidateAll() {
  revalidatePath("/kalender");
  revalidatePath("/dashboard");
  revalidatePath("/konflikte");
  revalidatePath("/mannschaften");
  revalidatePath("/standorte");
  revalidatePath("/drucken");
}

export async function createTeamAction(input: TeamInput) {
  const result = await dal.createTeam(input);
  if (result.success) revalidateAll();
  return result;
}

export async function updateTeamAction(id: string, input: TeamInput) {
  const result = await dal.updateTeam(id, input);
  if (result.success) revalidateAll();
  return result;
}

export async function setTeamArchivedAction(id: string, archived: boolean) {
  const result = await dal.setTeamArchived(id, archived);
  if (result.success) revalidateAll();
  return result;
}

export async function deleteTeamAction(id: string) {
  const result = await dal.deleteTeam(id);
  if (result.success) revalidateAll();
  return result;
}

export async function createLocationAction(input: LocationInput) {
  const result = await dal.createLocation(input);
  if (result.success) revalidateAll();
  return result;
}

export async function updateLocationAction(id: string, input: LocationInput) {
  const result = await dal.updateLocation(id, input);
  if (result.success) revalidateAll();
  return result;
}

export async function deleteLocationAction(id: string) {
  const result = await dal.deleteLocation(id);
  if (result.success) revalidateAll();
  return result;
}

export async function createFieldAction(input: FieldInput) {
  const result = await dal.createField(input);
  if (result.success) revalidateAll();
  return result;
}

export async function updateFieldAction(id: string, input: FieldInput) {
  const result = await dal.updateField(id, input);
  if (result.success) revalidateAll();
  return result;
}

export async function deleteFieldAction(id: string) {
  const result = await dal.deleteField(id);
  if (result.success) revalidateAll();
  return result;
}
