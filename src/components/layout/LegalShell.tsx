import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";

interface LegalShellProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#050507]">
      <header className="border-b border-white/10 bg-[#050507]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#0B0B10] p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Documento Legal
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Última actualización: {updatedAt}
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-300">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
