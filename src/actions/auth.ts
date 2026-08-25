"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";

const LoginSchema = z.object({
  email: z.string().trim().min(1, "E-Mail wird benötigt.").email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Passwort wird benötigt."),
});

export type LoginState = {
  error?: string;
} | null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  await setSessionCookie({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
