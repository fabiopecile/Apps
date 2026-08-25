"use server";

import { revalidatePath } from "next/cache";
import * as dal from "@/data/users";
import type { UserCreateInput, UserUpdateInput } from "@/lib/validation";

export async function listUsersAction() {
  return dal.listUsers();
}

export async function createUserAction(input: UserCreateInput) {
  const result = await dal.createUser(input);
  if (result.success) revalidatePath("/benutzer");
  return result;
}

export async function updateUserAction(id: string, input: UserUpdateInput) {
  const result = await dal.updateUser(id, input);
  if (result.success) revalidatePath("/benutzer");
  return result;
}

export async function deleteUserAction(id: string) {
  const result = await dal.deleteUser(id);
  if (result.success) revalidatePath("/benutzer");
  return result;
}
