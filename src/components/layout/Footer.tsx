import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050507] py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-3">
          <Logo size="xs" />
          <span className="text-xs text-zinc-500">
            © {new Date().getFullYear()} Xela. Todos los derechos reservados.
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <Link
            href="/legal/terminos"
            className="transition-colors hover:text-white"
          >
            Términos y Condiciones
          </Link>
          <Link
            href="/legal/privacidad"
            className="transition-colors hover:text-white"
          >
            Política de Privacidad
          </Link>
          <Link
            href="/legal/cookies"
            className="transition-colors hover:text-white"
          >
            Política de Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}
