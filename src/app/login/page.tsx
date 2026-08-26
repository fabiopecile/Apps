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
          <Image src="/logo.png" alt="SC Steyr" width={512} height={512} className="mx-auto mb-3 h-24 w-24 drop-shadow-lg" priority />
          <p className="text-sm text-white/80">Jahresplanung für Training &amp; Platzbelegung</p>
        </div>

        <div className="card p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
