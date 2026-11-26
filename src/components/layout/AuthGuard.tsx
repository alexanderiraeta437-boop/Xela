"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, initialized, router]);

  if (!initialized || loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050507] px-4">
        <Logo size="lg" showText={false} className="animate-pulse" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
          Cargando arena...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
