"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Shield,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import type Phaser from "phaser";
import { getCharacterById } from "@/constants/characters";
import { recordMatchResult } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/useGameStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function PhaserArena() {
  const router = useRouter();
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

  const handleRematch = () => {
    if (mode === "multiplayer") {
      router.push("/create-room");
      return;
    }
    resetFightState();
    setRematchNonce((n) => n + 1);
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
    <div className="space-y-4">
      {/* HUD Superior */}
      <div className="rounded-2xl border border-white/10 bg-[#0B0B10]/95 p-3 sm:p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          {/* P1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={`/characters/${p1Char.id}.svg`}
                  alt={p1Char.name}
                  className="hidden h-8 w-8 rounded-lg border border-white/10 bg-black object-contain sm:block"
                />
                <div className="min-w-0">
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
              className="h-3"
            />
            <div className="flex items-center justify-between gap-2">
              <Progress
                value={hud.p1Energy}
                max={100}
                indicatorColor="#38BDF8"
                className="h-1.5"
              />
              {hud.comboP1 > 1 && (
                <Badge variant="accent" className="text-[10px]">
                  {hud.comboP1}x COMBO
                </Badge>
              )}
            </div>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-black px-3 py-1.5 sm:px-4 sm:py-2">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
              Tiempo
            </span>
            <span className="font-mono text-xl font-bold text-white sm:text-2xl">
              {String(hud.timer).padStart(2, "0")}
            </span>
          </div>

          {/* P2 */}
          <div className="space-y-1.5 text-right">
            <div className="flex items-center justify-between gap-2 flex-row-reverse">
              <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                <img
                  src={`/characters/${p2Char.id}.svg`}
                  alt={p2Char.name}
                  className="hidden h-8 w-8 rounded-lg border border-white/10 bg-black object-contain sm:block"
                />
                <div className="min-w-0">
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
              className="h-3"
            />
            <div className="flex items-center justify-between gap-2 flex-row-reverse">
              <Progress
                value={hud.p2Energy}
                max={100}
                indicatorColor="#38BDF8"
                className="h-1.5"
              />
              {hud.comboP2 > 1 && (
                <Badge variant="accent" className="text-[10px]">
                  {hud.comboP2}x COMBO
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas de Phaser 3 */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
        <div
          ref={containerRef}
          className="aspect-video w-full touch-none select-none"
        />

        {/* Modal de resultado post-combate */}
        {lastResult && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B0B10] p-6 text-center shadow-2xl">
              <Badge
                variant={lastResult.won ? "accent" : "destructive"}
                className="mb-3 px-3 py-1 text-xs uppercase tracking-widest"
              >
                {lastResult.won ? "Victoria en la Arena" : "Combate Finalizado"}
              </Badge>

              <h2 className="font-display text-3xl font-bold text-white">
                {lastResult.won ? "¡HAS GANADO!" : "DERROTA"}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                vs {lastResult.opponentName} • {lastResult.durationSeconds}s
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm">
                <div>
                  <span className="block text-xs text-zinc-500">
                    Puntos de Ranking
                  </span>
                  <span
                    className={cn(
                      "font-mono text-lg font-bold",
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
                  <span className="font-mono text-lg font-bold text-white">
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
                  className="flex-1"
                  variant="accent"
                  onClick={handleRematch}
                >
                  <RotateCcw className="h-4 w-4" />
                  {mode === "multiplayer" ? "Nueva Sala" : "Revancha"}
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full" variant="outline">
                    <Trophy className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controles Táctiles Móviles + Leyenda Teclado */}
      <div className="rounded-2xl border border-white/10 bg-[#0B0B10] p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Cruceta Movimiento */}
          <div className="flex items-center gap-2 select-none touch-none">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 w-14 p-0"
              aria-label="Mover izquierda"
              {...holdProps("left")}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 w-14 p-0"
              aria-label="Saltar"
              {...holdProps("jump")}
            >
              <ArrowUp className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 w-14 p-0"
              aria-label="Mover derecha"
              {...holdProps("right")}
            >
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Leyenda de Teclado (PC) */}
          <div className="hidden text-center text-xs text-zinc-400 lg:block">
            <p className="font-semibold text-zinc-200">Controles de Teclado</p>
            <p className="mt-1 font-mono text-[11px] text-zinc-400">
              A/D o ←/→ Mover • W/↑ Saltar • S/↓ Bloquear • J Ligero • K Fuerte • L Especial (50% energía)
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-4 gap-2 select-none touch-none">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-14 flex-col gap-0.5 px-3 text-[11px]"
              {...holdProps("block")}
            >
              <Shield className="h-4 w-4 text-zinc-300" />
              Bloq
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 flex-col gap-0.5 px-3 text-[11px]"
              onPointerDown={(e) => {
                e.preventDefault();
                triggerVirtualAttack("light");
              }}
            >
              <Swords className="h-4 w-4 text-white" />
              Ligero
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 flex-col gap-0.5 px-3 text-[11px]"
              onPointerDown={(e) => {
                e.preventDefault();
                triggerVirtualAttack("heavy");
              }}
            >
              <Swords className="h-4 w-4 text-amber-400" />
              Fuerte
            </Button>
            <Button
              type="button"
              variant="accent"
              size="lg"
              disabled={localEnergy < 50}
              className="h-14 flex-col gap-0.5 px-3 text-[11px]"
              onPointerDown={(e) => {
                e.preventDefault();
                triggerVirtualAttack("special");
              }}
            >
              <Zap className="h-4 w-4" />
              Esp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
