"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  LogOut,
  Maximize2,
  RotateCcw,
  Shield,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { ref, update, remove } from "firebase/database";
import type Phaser from "phaser";
import { getCharacterById } from "@/constants/characters";
import { recordMatchResult } from "@/lib/firestore";
import { rtdb } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/useGameStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function PhaserArena() {
  const router = useRouter();
  const arenaWrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const savedResultRef = useRef(false);

  const { user, profile, setProfile } = useAuth();
  const {
    mode,
    difficulty,
    roomCode,
    role,
    playerFighterId,
    opponentFighterId,
    opponentName,
    hud,
    lastResult,
    setHud,
    setLastResult,
    setVirtualButton,
    triggerVirtualAttack,
    resetFightState,
  } = useGameStore();

  const [rematchNonce, setRematchNonce] = useState(0);
  const [savingStats, setSavingStats] = useState(false);

  const isGuest = mode === "multiplayer" && role === "guest";
  const p1Char = getCharacterById(isGuest ? opponentFighterId : playerFighterId);
  const p2Char = getCharacterById(isGuest ? playerFighterId : opponentFighterId);
  const p1Name = isGuest ? opponentName : profile?.displayName || "Tú";
  const p2Name = isGuest ? profile?.displayName || "Tú" : opponentName;

  useEffect(() => {
    if (!containerRef.current || !user) return;
    savedResultRef.current = false;

    let cancelled = false;

    const bootPhaser = async () => {
      const { createXelaGame } = await import("@/game/createXelaGame");
      if (cancelled || !containerRef.current) return;

      gameRef.current = createXelaGame(containerRef.current, {
        mode,
        difficulty,
        roomCode,
        role,
        playerFighterId,
        opponentFighterId,
        playerUid: user.uid,
        opponentName,
        getVirtualControls: () => useGameStore.getState().virtualControls,
        onHudUpdate: (partial) => setHud(partial),
        onMatchEnd: async ({ won, remainingHp, durationSeconds }) => {
          if (savedResultRef.current) return;
          savedResultRef.current = true;
          setSavingStats(true);

          try {
            const res = await recordMatchResult({
              uid: user.uid,
              won,
              mode,
              difficulty,
            });
            setProfile(res.updatedProfile);
            setLastResult({
              won,
              mode,
              difficulty,
              playerFighterId,
              opponentFighterId,
              opponentName,
              pointsDelta: res.pointsDelta,
              newlyUnlockedFighters: res.newlyUnlocked,
              remainingHp,
              durationSeconds,
            });
          } catch (err) {
            console.error("Error guardando resultado:", err);
            setLastResult({
              won,
              mode,
              difficulty,
              playerFighterId,
              opponentFighterId,
              opponentName,
              pointsDelta: 0,
              newlyUnlockedFighters: [],
              remainingHp,
              durationSeconds,
            });
          } finally {
            setSavingStats(false);
          }
        },
      });
    };

    void bootPhaser();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [
    user,
    mode,
    difficulty,
    roomCode,
    role,
    playerFighterId,
    opponentFighterId,
    opponentName,
    rematchNonce,
    setHud,
    setLastResult,
    setProfile,
  ]);

  // Activar pantalla completa y sugerir horizontal en móvil
  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && arenaWrapperRef.current) {
        await arenaWrapperRef.current.requestFullscreen();
        if (
          typeof screen !== "undefined" &&
          screen.orientation &&
          "lock" in screen.orientation
        ) {
          await (
            screen.orientation as { lock: (o: string) => Promise<void> }
          )
            .lock("landscape")
            .catch(() => {});
        }
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignorar si el navegador bloquea fullscreen sin gesto compatible
    }
  };

  // Mantener la misma sala activa para revancha o volver al lobby de la sala
  const handleRematch = async () => {
    resetFightState();

    if (mode === "multiplayer" && roomCode) {
      try {
        const roomRef = ref(rtdb, `rooms/${roomCode}`);
        await update(roomRef, {
          status: "waiting",
          hostReady: false,
          guestReady: false,
        });
      } catch (err) {
        console.error("Error reiniciando sala:", err);
      }

      if (role === "host") {
        router.push(`/create-room?code=${roomCode}`);
      } else {
        router.push(`/join-room?code=${roomCode}`);
      }
      return;
    }

    setRematchNonce((n) => n + 1);
  };

  // Salir y cerrar la sala si el usuario es el anfitrión
  const handleExitArena = async () => {
    if (mode === "multiplayer" && roomCode) {
      try {
        const roomRef = ref(rtdb, `rooms/${roomCode}`);
        if (role === "host") {
          await remove(roomRef);
        } else {
          await update(roomRef, {
            guest: null,
            guestFighter: null,
            guestReady: false,
            status: "waiting",
          });
        }
      } catch (err) {
        console.error("Error al salir de la sala:", err);
      }
    }
    resetFightState();
    router.push("/dashboard");
  };

  const holdProps = (btn: "left" | "right" | "jump" | "block") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      setVirtualButton(btn, true);
    },
    onPointerUp: () => setVirtualButton(btn, false),
    onPointerLeave: () => setVirtualButton(btn, false),
    onPointerCancel: () => setVirtualButton(btn, false),
  });

  const localEnergy = isGuest ? hud.p2Energy : hud.p1Energy;

  return (
    <div
      ref={arenaWrapperRef}
      className="fixed inset-0 z-40 flex h-[100dvh] w-screen flex-col overflow-hidden bg-black select-none"
    >
      {/* HUD Superior Compacto y Flotante */}
      <div className="relative z-20 border-b border-white/10 bg-[#0B0B10]/90 px-3 py-2 backdrop-blur-md sm:px-6 sm:py-2.5">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 sm:gap-4">
          {/* Botón Salir */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitArena}
            className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
            title={
              mode === "multiplayer" && role === "host"
                ? "Cerrar sala y salir"
                : "Salir del combate"
            }
          >
            <LogOut className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Salir</span>
          </Button>

          {/* P1 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <img
                  src={`/characters/${p1Char.id}.svg`}
                  alt={p1Char.name}
                  className="hidden h-7 w-7 rounded-md border border-white/10 bg-black object-contain sm:block"
                />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-white sm:text-sm">
                    {p1Name}
                  </p>
                  <p
                    className="truncate text-[10px] font-semibold uppercase"
                    style={{ color: p1Char.themeColor }}
                  >
                    {p1Char.name}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-zinc-300">
                {hud.p1Hp}/{hud.p1MaxHp}
              </span>
            </div>

            <Progress
              value={hud.p1Hp}
              max={hud.p1MaxHp}
              indicatorColor={p1Char.themeColor}
              className="h-2 sm:h-2.5"
            />
            <div className="flex items-center justify-between gap-2">
              <Progress
                value={hud.p1Energy}
                max={100}
                indicatorColor="#38BDF8"
                className="h-1"
              />
              {hud.comboP1 > 1 && (
                <Badge variant="accent" className="px-1.5 py-0 text-[9px]">
                  {hud.comboP1}x
                </Badge>
              )}
            </div>
          </div>

          {/* Timer + Sala */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/15 bg-black px-2.5 py-1 sm:px-4">
            <span className="font-mono text-lg font-bold leading-none text-white sm:text-2xl">
              {String(hud.timer).padStart(2, "0")}
            </span>
            {mode === "multiplayer" && roomCode && (
              <span className="mt-0.5 font-mono text-[9px] tracking-wider text-cyan-400">
                {roomCode}
              </span>
            )}
          </div>

          {/* P2 */}
          <div className="space-y-1 text-right">
            <div className="flex flex-row-reverse items-center justify-between gap-2">
              <div className="flex min-w-0 flex-row-reverse items-center gap-1.5">
                <img
                  src={`/characters/${p2Char.id}.svg`}
                  alt={p2Char.name}
                  className="hidden h-7 w-7 rounded-md border border-white/10 bg-black object-contain sm:block"
                />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-white sm:text-sm">
                    {p2Name}
                  </p>
                  <p
                    className="truncate text-[10px] font-semibold uppercase"
                    style={{ color: p2Char.themeColor }}
                  >
                    {p2Char.name}
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-zinc-300">
                {hud.p2Hp}/{hud.p2MaxHp}
              </span>
            </div>

            <Progress
              value={hud.p2Hp}
              max={hud.p2MaxHp}
              indicatorColor={p2Char.themeColor}
              className="h-2 sm:h-2.5"
            />
            <div className="flex flex-row-reverse items-center justify-between gap-2">
              <Progress
                value={hud.p2Energy}
                max={100}
                indicatorColor="#38BDF8"
                className="h-1"
              />
              {hud.comboP2 > 1 && (
                <Badge variant="accent" className="px-1.5 py-0 text-[9px]">
                  {hud.comboP2}x
                </Badge>
              )}
            </div>
          </div>

          {/* Botón Pantalla Completa */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
            title="Pantalla completa"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Área Principal del Juego (Ocupa todo el alto restante) */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {/* Canvas de Phaser 3 escalado al máximo posible */}
        <div
          ref={containerRef}
          className="h-full w-full max-h-full max-w-full touch-none select-none [&>canvas]:mx-auto [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:object-contain"
        />

        {/* Controles Táctiles Superpuestos a los Lados (SOLO MÓVIL / TABLET) */}
        {!lastResult && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex items-end justify-between px-4 sm:bottom-6 sm:px-8 lg:hidden">
            {/* Lado Izquierdo: Movimiento + Salto */}
            <div className="pointer-events-auto flex flex-col items-center gap-2 touch-none">
              <Button
                type="button"
                variant="secondary"
                className="h-14 w-14 rounded-full border border-white/20 bg-zinc-900/75 p-0 backdrop-blur-sm active:scale-95 active:bg-white/25"
                aria-label="Saltar"
                {...holdProps("jump")}
              >
                <ArrowUp className="h-7 w-7 text-white" />
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 w-14 rounded-full border border-white/20 bg-zinc-900/75 p-0 backdrop-blur-sm active:scale-95 active:bg-white/25"
                  aria-label="Mover izquierda"
                  {...holdProps("left")}
                >
                  <ArrowLeft className="h-7 w-7 text-white" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 w-14 rounded-full border border-white/20 bg-zinc-900/75 p-0 backdrop-blur-sm active:scale-95 active:bg-white/25"
                  aria-label="Mover derecha"
                  {...holdProps("right")}
                >
                  <ArrowRight className="h-7 w-7 text-white" />
                </Button>
              </div>
            </div>

            {/* Lado Derecho: Ataques + Bloqueo */}
            <div className="pointer-events-auto grid grid-cols-2 gap-2.5 touch-none">
              <Button
                type="button"
                variant="outline"
                className="h-14 w-14 flex-col gap-0.5 rounded-full border border-white/25 bg-zinc-900/75 p-0 text-[10px] backdrop-blur-sm active:scale-95"
                {...holdProps("block")}
              >
                <Shield className="h-5 w-5 text-zinc-200" />
                Bloq
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={localEnergy < 50}
                className="h-14 w-14 flex-col gap-0.5 rounded-full p-0 text-[10px] shadow-lg active:scale-95 disabled:opacity-40"
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerVirtualAttack("special");
                }}
              >
                <Zap className="h-5 w-5" />
                Esp
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-14 w-14 flex-col gap-0.5 rounded-full border border-white/20 bg-zinc-900/75 p-0 text-[10px] backdrop-blur-sm active:scale-95"
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerVirtualAttack("light");
                }}
              >
                <Swords className="h-5 w-5 text-white" />
                Ligero
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-14 w-14 flex-col gap-0.5 rounded-full border border-white/20 bg-zinc-900/75 p-0 text-[10px] backdrop-blur-sm active:scale-95"
                onPointerDown={(e) => {
                  e.preventDefault();
                  triggerVirtualAttack("heavy");
                }}
              >
                <Swords className="h-5 w-5 text-amber-400" />
                Fuerte
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Barra Inferior de Teclas (SOLO PC) */}
      <div className="hidden border-t border-white/10 bg-[#0B0B10]/95 py-2 text-center text-xs text-zinc-400 lg:block">
        <span className="font-semibold text-zinc-200">Controles: </span>
        <span className="font-mono text-[11px]">
          [A / D] o [← / →] Mover • [W / ↑] Saltar • [S / ↓] Bloquear • [J] Ligero • [K] Fuerte • [L] Especial (50% energía)
        </span>
      </div>

      {/* Modal de Resultado Post-Combate (A pantalla completa / legible en móvil y PC) */}
      {lastResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-6">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0B0B10] p-5 text-center shadow-2xl sm:p-7">
            <Badge
              variant={lastResult.won ? "accent" : "destructive"}
              className="mb-3 px-3 py-1 text-xs uppercase tracking-widest"
            >
              {lastResult.won ? "Victoria en la Arena" : "Combate Finalizado"}
            </Badge>

            <h2 className="font-display text-4xl font-bold text-white sm:text-4xl">
              {lastResult.won ? "¡HAS GANADO!" : "DERROTA"}
            </h2>

            <p className="mt-1.5 text-sm text-zinc-400">
              vs {lastResult.opponentName} • {lastResult.durationSeconds}s
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm">
              <div>
                <span className="block text-xs text-zinc-500">
                  Puntos de Ranking
                </span>
                <span
                  className={cn(
                    "font-mono text-xl font-bold",
                    lastResult.pointsDelta >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  )}
                >
                  {lastResult.pointsDelta >= 0
                    ? `+${lastResult.pointsDelta}`
                    : lastResult.pointsDelta}
                </span>
              </div>
              <div>
                <span className="block text-xs text-zinc-500">
                  Vida Restante
                </span>
                <span className="font-mono text-xl font-bold text-white">
                  {lastResult.remainingHp} HP
                </span>
              </div>
            </div>

            {lastResult.newlyUnlockedFighters.length > 0 && (
              <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-xs text-cyan-200">
                <p className="font-bold uppercase tracking-wider">
                  ¡Nuevo luchador desbloqueado!
                </p>
                <p className="mt-1">
                  {lastResult.newlyUnlockedFighters
                    .map((id) => getCharacterById(id).name)
                    .join(", ")}
                </p>
              </div>
            )}

            {savingStats && (
              <p className="mt-3 text-xs text-zinc-500">
                Guardando progreso en Firestore...
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button
                className="h-11 flex-1 text-sm"
                variant="accent"
                onClick={handleRematch}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                {mode === "multiplayer" ? "Volver a la Sala" : "Revancha"}
              </Button>
              <Button
                className="h-11 flex-1 text-sm"
                variant="outline"
                onClick={handleExitArena}
              >
                <Trophy className="mr-1.5 h-4 w-4" />
                {mode === "multiplayer" && role === "host"
                  ? "Cerrar Sala"
                  : "Dashboard"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
