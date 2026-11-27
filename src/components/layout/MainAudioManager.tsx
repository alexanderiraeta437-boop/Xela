"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  startDashboardMusic,
  stopDashboardMusic,
  unlockBattleAudio,
} from "@/lib/battleAudio";

const DASHBOARD_AUDIO_ROUTES = [
  "/dashboard",
  "/fighters",
  "/ranking",
  "/profile",
  "/shop",
  "/create-room",
  "/join-room",
];

/**
 * Mantiene la música ambiental suave del Dashboard en bucle al navegar por las vistas
 * principales, desbloqueando el AudioContext ante la primera interacción del usuario.
 */
export function MainAudioManager() {
  const pathname = usePathname();

  useEffect(() => {
    const isDashboardRoute = DASHBOARD_AUDIO_ROUTES.some((route) =>
      pathname?.startsWith(route)
    );

    if (isDashboardRoute) {
      startDashboardMusic();
    } else if (pathname?.startsWith("/fight")) {
      stopDashboardMusic();
    }
  }, [pathname]);

  useEffect(() => {
    const handleUnlock = () => {
      unlockBattleAudio();
      const isDashboardRoute = DASHBOARD_AUDIO_ROUTES.some((route) =>
        pathname?.startsWith(route)
      );
      if (isDashboardRoute) {
        startDashboardMusic();
      }
    };

    window.addEventListener("pointerdown", handleUnlock, { passive: true });
    window.addEventListener("keydown", handleUnlock, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handleUnlock);
      window.removeEventListener("keydown", handleUnlock);
    };
  }, [pathname]);

  return null;
}
