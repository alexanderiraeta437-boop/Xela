"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Swords,
  PlusSquare,
  LogIn,
  Trophy,
  Cpu,
  Users,
  Flame,
} from "lucide-react";
import type { AIDifficulty } from "@/types";
import {
  CHARACTERS,
  getCharacterById,
  isCharacterUnlocked,
} from "@/constants/characters";
import { getAvatarById } from "@/constants/avatars";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/useGameStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getWinRate } from "@/lib/utils";

const DIFFICULTIES: { id: AIDifficulty; label: string; desc: string }[] = [
  { id: "easy", label: "Fácil", desc: "Ideal para calentar y practicar combos" },
  { id: "medium", label: "Medio", desc: "Equilibrado, bloquea y contraataca" },
  { id: "hard", label: "Difícil", desc: "Reflejos rápidos y presión constante" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { profile, selectedFighterId, setSelectedFighterId } = useAuth();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);

  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [aiOpponentId, setAiOpponentId] = useState<string>("nova");

  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const winRate = getWinRate(wins, losses);
  const avatar = getAvatarById(profile?.avatarId);
  const selectedChar = getCharacterById(selectedFighterId);
  const unlockedFighters = profile?.unlockedFighters ?? [];

  const handleStartAIFight = () => {
    const opp = getCharacterById(
      aiOpponentId === selectedFighterId
        ? selectedFighterId === "kai"
          ? "nova"
          : "kai"
        : aiOpponentId
    );

    setMatchConfig({
      mode: "ai",
      difficulty,
      playerFighterId: selectedFighterId,
      opponentFighterId: opp.id,
      opponentName: `IA ${opp.name} (${DIFFICULTIES.find((d) => d.id === difficulty)?.label})`,
    });

    router.push(
      `/fight?mode=ai&difficulty=${difficulty}&p1=${selectedFighterId}&p2=${opp.id}`
    );
  };

  return (
    <div className="space-y-8">
      {/* Cabecera de bienvenida + stats */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden border-white/10">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: selectedChar.themeColor }}
          />
          <CardContent className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <img
                src={avatar.src}
                alt={avatar.name}
                className="h-16 w-16 rounded-2xl border border-white/15 bg-black object-cover"
              />
              <div>
                <Badge variant="accent" className="mb-1.5">
                  Arena Principal
                </Badge>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Hola, {profile?.displayName || "Luchador"}
                </h1>
                <p className="text-sm text-zinc-400">
                  Luchador activo:{" "}
                  <span
                    className="font-semibold"
                    style={{ color: selectedChar.themeColor }}
                  >
                    {selectedChar.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Puntos
                </p>
                <p className="font-mono text-base font-bold text-cyan-400">
                  {profile?.rankingPoints ?? 1000}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Victorias
                </p>
                <p className="font-mono text-base font-bold text-emerald-400">
                  {wins}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Racha
                </p>
                <p className="font-mono text-base font-bold text-amber-400">
                  {profile?.winStreak ?? 0}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  WR
                </p>
                <p className="font-mono text-base font-bold text-white">
                  {winRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acciones rápidas Multijugador */}
        <Card className="border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-cyan-400" />
              Combate vs Amigos
            </CardTitle>
            <CardDescription>
              Duelos 1 vs 1 en tiempo real con código de sala de 6 caracteres.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/create-room">
              <Button variant="accent" className="w-full" size="lg">
                <PlusSquare className="h-4 w-4" />
                Crear Sala
              </Button>
            </Link>
            <Link href="/join-room">
              <Button variant="outline" className="w-full" size="lg">
                <LogIn className="h-4 w-4" />
                Unirse
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Configurador rápido de combate vs IA */}
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Cpu className="h-5 w-5 text-cyan-400" />
                Combate Rápido vs IA
              </CardTitle>
              <CardDescription>
                Elige tu luchador, el rival y la dificultad para entrar directo a la arena.
              </CardDescription>
            </div>
            <Link href="/fighters">
              <Button variant="ghost" size="sm">
                Ver ficha completa de luchadores
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Selector de tu luchador */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. Tu Luchador
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {CHARACTERS.map((char) => {
                const unlocked = isCharacterUnlocked(char, wins, unlockedFighters);
                const active = selectedFighterId === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedFighterId(char.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                      active
                        ? "border-white bg-white/10 ring-1 ring-white/40"
                        : "border-white/10 bg-zinc-950/70 hover:border-white/25",
                      !unlocked && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <img
                      src={`/characters/${char.id}.svg`}
                      alt={char.name}
                      className="h-12 w-12 object-contain"
                    />
                    <span className="text-xs font-bold text-white">
                      {char.name}
                    </span>
                    <span
                      className="text-[10px]"
                      style={{ color: unlocked ? char.themeColor : "#71717A" }}
                    >
                      {unlocked ? "Disponible" : "Bloqueado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Selector de dificultad */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                2. Nivel de Dificultad IA
              </p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {DIFFICULTIES.map((diff) => {
                  const active = difficulty === diff.id;
                  return (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setDifficulty(diff.id)}
                      className={cn(
                        "rounded-xl border p-3.5 text-left transition-all",
                        active
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-zinc-950/70 hover:border-white/25"
                      )}
                    >
                      <p className="font-display text-sm font-bold text-white">
                        {diff.label}
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-zinc-400">
                        {diff.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector de rival IA */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                3. Rival de la IA
              </p>
              <div className="grid grid-cols-4 gap-2">
                {CHARACTERS.map((char) => {
                  const active = aiOpponentId === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => setAiOpponentId(char.id)}
                      className={cn(
                        "flex flex-col items-center rounded-xl border px-2 py-2 transition-all",
                        active
                          ? "border-white bg-white/10"
                          : "border-white/10 bg-zinc-950/70 hover:border-white/25"
                      )}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ color: char.themeColor }}
                      >
                        {char.name}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        HP {char.stats.hp}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>
                Gana combates para sumar puntos y desbloquear los 8 luchadores.
              </span>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={handleStartAIFight}
            >
              <Swords className="h-4 w-4" />
              Iniciar Combate vs IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accesos secundarios */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/ranking">
          <Card className="h-full transition-colors hover:border-white/25">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Ranking Global
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Consulta tu posición y compite por el top de Xela.
                </p>
              </div>
              <Trophy className="h-8 w-8 text-amber-400" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/profile">
          <Card className="h-full transition-colors hover:border-white/25">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Personalizar Perfil
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Cambia tu nombre de jugador y elige entre 12 avatares predefinidos.
                </p>
              </div>
              <img
                src={avatar.src}
                alt={avatar.name}
                className="h-11 w-11 rounded-xl border border-white/15"
              />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
