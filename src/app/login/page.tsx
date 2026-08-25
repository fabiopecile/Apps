import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-dark to-brand px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-2xl bg-white px-5 py-3 shadow-lg">
            <Image src="/logo.png" alt="TeamPlan" width={700} height={242} className="h-12 w-auto" priority />
          </div>
          <p className="mt-1 text-sm text-white/80">Jahresplanung für Training &amp; Platzbelegung</p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>

        <div className="mt-4 rounded-lg bg-white/10 p-3 text-xs leading-relaxed text-white/90">
          <p className="font-semibold">Demo-Zugänge</p>
          <p>Administrator: admin@verein.local / admin123</p>
          <p>Bearbeiter: trainer@verein.local / trainer123</p>
          <p>Leser: leser@verein.local / leser123</p>
        </div>
      </div>
    </main>
  );
}
