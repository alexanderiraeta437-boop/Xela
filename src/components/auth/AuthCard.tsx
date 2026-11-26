"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050507] bg-xela-grid px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo size="md" />
      </Link>

      <Card className="w-full max-w-md border-white/10 bg-[#0B0B10]/95">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {children}
          {footer && (
            <div className="border-t border-white/10 pt-4 text-center text-sm text-zinc-400">
              {footer}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap justify-center gap-5 text-xs text-zinc-500">
        <Link href="/legal/terminos" className="hover:text-zinc-300">
          Términos
        </Link>
        <Link href="/legal/privacidad" className="hover:text-zinc-300">
          Privacidad
        </Link>
        <Link href="/legal/cookies" className="hover:text-zinc-300">
          Cookies
        </Link>
      </div>
    </div>
  );
}
