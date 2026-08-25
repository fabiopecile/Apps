import "server-only";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ActionResult, fail, guarded, ok } from "@/lib/action-result";
import { hashPassword } from "@/lib/password";
import { UserCreateSchema, UserUpdateSchema, type UserCreateInput, type UserUpdateInput } from "@/lib/validation";

export type UserDTO = { id: string; name: string; email: string; role: "ADMIN" | "EDITOR" | "VIEWER"; createdAt: string };

export async function listUsers(): Promise<ActionResult<UserDTO[]>> {
  return guarded(requireAdmin, async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return ok(users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() })));
  });
}

export async function createUser(input: UserCreateInput): Promise<ActionResult<UserDTO>> {
  return guarded(requireAdmin, async () => {
    const parsed = UserCreateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return fail("Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.");
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash },
    });
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() });
  });
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<ActionResult<UserDTO>> {
  return guarded(requireAdmin, async (session) => {
    const parsed = UserUpdateSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.");

    if (session.id === id && parsed.data.role !== "ADMIN") {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", NOT: { id } } });
      if (otherAdmins === 0) return fail("Es muss mindestens ein Administrator bestehen bleiben.");
    }

    const data: { name: string; role: "ADMIN" | "EDITOR" | "VIEWER"; passwordHash?: string } = {
      name: parsed.data.name,
      role: parsed.data.role,
    };
    if (parsed.data.password) {
      data.passwordHash = await hashPassword(parsed.data.password);
    }
    const user = await prisma.user.update({ where: { id }, data });
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() });
  });
}

export async function deleteUser(id: string): Promise<ActionResult<{ id: string }>> {
  return guarded(requireAdmin, async (session) => {
    if (session.id === id) return fail("Sie können sich nicht selbst löschen.");
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("Benutzer wurde nicht gefunden.");
    if (target.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", NOT: { id } } });
      if (otherAdmins === 0) return fail("Es muss mindestens ein Administrator bestehen bleiben.");
    }
    await prisma.user.delete({ where: { id } });
    return ok({ id });
  });
}
