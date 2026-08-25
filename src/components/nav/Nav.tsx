"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";
import type { SessionPayload } from "@/lib/session";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator",
  EDITOR: "Bearbeiter",
  VIEWER: "Leser",
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/kalender", label: "Kalender" },
  { href: "/konflikte", label: "Konflikte" },
  { href: "/mannschaften", label: "Mannschaften" },
  { href: "/standorte", label: "Standorte" },
  { href: "/drucken", label: "Drucken" },
];

export function Nav({ session }: { session: SessionPayload }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visibleLinks = session.role === "ADMIN" ? [...links, { href: "/benutzer", label: "Benutzer" }] : links;

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center">
            <Image src="/logo.png" alt="TeamPlan" width={700} height={242} className="h-8 w-auto" priority />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {visibleLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-brand-light text-brand-dark" : "text-muted hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="text-right text-xs leading-tight">
            <div className="font-semibold text-foreground">{session.name}</div>
            <div className="text-muted">{roleLabels[session.role] ?? session.role}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary btn-sm">
              Abmelden
            </button>
          </form>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menü"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {visibleLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-brand-light text-brand-dark" : "text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <div className="text-xs leading-tight">
              <div className="font-semibold text-foreground">{session.name}</div>
              <div className="text-muted">{roleLabels[session.role] ?? session.role}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary btn-sm">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
