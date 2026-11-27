"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { cleanupBattleAudio } from "@/lib/battleAudio";
import { leaveRoom } from "@/lib/rtdb";
import { useGameStore } from "@/stores/useGameStore";
import { Button } from "@/components/ui/button";

interface CapacitorAppPlugin {
  addListener?: (
    eventName: "backButton",
    listenerFunc: (data: { canGoBack?: boolean }) => void
  ) => Promise<{ remove: () => void }> | { remove: () => void };
  exitApp?: () => void;
}

interface CapacitorWindow {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      App?: CapacitorAppPlugin;
    };
  };
  navigator?: Navigator & {
    app?: {
      exitApp?: () => void;
    };
  };
}

const SECONDARY_ROUTES = [
  "/fight",
  "/fighters",
  "/ranking",
  "/profile",
  "/shop",
  "/create-room",
  "/join-room",
];

const EXIT_ROUTES = ["/dashboard", "/login", "/"];

/**
 * Listener global para el botón "Atrás" nativo de Android (Capacitor App / backbutton / popstate).
 * - En rutas secundarias navega a `/dashboard` (pide confirmación si hay combate activo en `/fight`).
 * - En `/dashboard`, `/login` o `/` muestra aviso y requiere doble toque para salir.
 */
export function AndroidBackHandler() {
  const pathname = usePathname();
  const router = useRouter();

  const pathnameRef = useRef(pathname);
  const lastExitPressRef = useRef(0);
  const guardPushedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [exitToastVisible, setExitToastVisible] = useState(false);
  const [confirmLeaveFight, setConfirmLeaveFight] = useState(false);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname !== "/fight") {
      setConfirmLeaveFight(false);
    }
  }, [pathname]);

  const isNativeAndroid = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    const cap = (window as unknown as CapacitorWindow).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    return /Android/i.test(navigator.userAgent);
  }, []);

  const exitNativeApp = useCallback(() => {
    if (typeof window === "undefined") return;
    const win = window as unknown as CapacitorWindow;
    const appPlugin = win.Capacitor?.Plugins?.App;
    if (appPlugin?.exitApp) {
      appPlugin.exitApp();
      return;
    }
    if (win.navigator?.app?.exitApp) {
      win.navigator.app.exitApp();
      return;
    }
    window.close();
  }, []);

  const showExitToast = useCallback(() => {
    setExitToastVisible(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setExitToastVisible(false);
    }, 2000);
  }, []);

  const leaveFightConfirmed = useCallback(async () => {
    setConfirmLeaveFight(false);
    cleanupBattleAudio();
    const { mode, roomCode, role, resetFightState } = useGameStore.getState();
    if (mode === "multiplayer" && roomCode && role) {
      try {
        await leaveRoom(roomCode, role);
      } catch {
        // Ignorar error de red al salir
      }
    }
    resetFightState();
    router.replace("/dashboard");
  }, [router]);

  const handleBackAction = useCallback(() => {
    const currentPath = pathnameRef.current || "/";

    if (currentPath === "/fight") {
      const { lastResult } = useGameStore.getState();
      if (!lastResult) {
        setConfirmLeaveFight(true);
        return;
      }
      void leaveFightConfirmed();
      return;
    }

    if (SECONDARY_ROUTES.some((route) => currentPath.startsWith(route))) {
      router.replace("/dashboard");
      return;
    }

    if (EXIT_ROUTES.includes(currentPath)) {
      const now = Date.now();
      if (now - lastExitPressRef.current < 2100) {
        setExitToastVisible(false);
        exitNativeApp();
      } else {
        lastExitPressRef.current = now;
        showExitToast();
      }
      return;
    }

    router.replace("/dashboard");
  }, [exitNativeApp, leaveFightConfirmed, router, showExitToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldGuardPopState = isNativeAndroid() || pathname === "/fight";
    if (shouldGuardPopState && !guardPushedRef.current) {
      window.history.pushState({ xelaBackGuard: true }, "");
      guardPushedRef.current = true;
    }

    const onPopState = () => {
      if (!isNativeAndroid() && pathnameRef.current !== "/fight") return;
      guardPushedRef.current = false;
      window.history.pushState({ xelaBackGuard: true }, "");
      guardPushedRef.current = true;
      handleBackAction();
    };

    const onCordovaBackButton = (e: Event) => {
      e.preventDefault();
      handleBackAction();
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("backbutton", onCordovaBackButton, false);

    // Integración directa con @capacitor/app si está disponible en el runtime nativo
    let removeCapListener: (() => void) | null = null;
    const cap = (window as unknown as CapacitorWindow).Capacitor;
    const appPlugin = cap?.Plugins?.App;

    if (appPlugin?.addListener) {
      try {
        const maybeHandle = appPlugin.addListener("backButton", () => {
          handleBackAction();
        });
        if (maybeHandle && typeof (maybeHandle as Promise<{ remove: () => void }>).then === "function") {
          void (maybeHandle as Promise<{ remove: () => void }>).then((handle) => {
            removeCapListener = () => handle.remove();
          });
        } else if (maybeHandle && typeof (maybeHandle as { remove: () => void }).remove === "function") {
          removeCapListener = () => (maybeHandle as { remove: () => void }).remove();
        }
      } catch {
        // Ignorar si el plugin nativo no está registrado en este entorno
      }
    }

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("backbutton", onCordovaBackButton, false);
      if (removeCapListener) {
        removeCapListener();
      }
    };
  }, [handleBackAction, isNativeAndroid, pathname]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Aviso de doble toque para salir en /dashboard o /login */}
      {exitToastVisible && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
          <div className="rounded-full border border-white/15 bg-zinc-900/95 px-5 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
            Presiona Atrás de nuevo para salir de Xela
          </div>
        </div>
      )}

      {/* Modal de confirmación al intentar salir de un combate activo con el botón Atrás */}
      {confirmLeaveFight && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0B0B10] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              ¿Salir del combate?
            </h3>
            <p className="mt-1.5 text-sm text-zinc-400">
              Hay una batalla en curso. Si sales ahora volverás al Dashboard y se cancelará el combate.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmLeaveFight(false)}
              >
                Continuar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={() => void leaveFightConfirmed()}
              >
                Salir
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
