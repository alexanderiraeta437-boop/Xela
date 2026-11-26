"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06060B] px-4 text-center text-white">
      <h1 className="font-display text-5xl font-bold text-cyan-400">404</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Página no encontrada en la Arena.
      </p>
      <Link href="/" className="mt-6">
        <Button variant="accent">Volver al Inicio</Button>
      </Link>
    </div>
  );
}
