"use client";

import React, { useEffect, useState } from "react";
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
  Coins,
  Gift,
  Clock,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { AIDifficulty } from "@/types";
import {
  CHARACTERS,
  getCharacterById,
  isCharacterUnlocked,
} from "@/constants/characters";
import { getArtifactById } from "@/constants/artifacts";
import { getAvatarById } from "@/constants/avatars";
import { claimDailyStreakReward, getDailyStreakStatus } from "@/lib/firestore";
import {
  playRoundBell,
  stopDashboardMusic,
  unlockBattleAudio,
} from "@/lib/battleAudio";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/useGameStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getWinRate } from "@/lib/utils";

const DIFFICULTIES: {
  id: AIDifficulty;
  label: string;
  desc: string;
  reward: number;
}[] = [
  { id: "easy", label: "Fácil", desc: "Ideal para calentar y practicar combos", reward: 20 },
  { id: "medium", label: "Medio", desc: "Equilibrado, bloquea y contraataca", reward: 35 },
  { id: "hard", label: "Difícil", desc: "Reflejos rápidos y presión constante", reward: 50 },
];

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, setProfile, selectedFighterId, setSelectedFighterId } =
    useAuth();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);

  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");
  const [aiOpponentId, setAiOpponentId] = useState<string>("nova");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [claimBannerMsg, setClaimBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const winRate = getWinRate(wins, losses);
  const avatar = getAvatarById(profile?.avatarId);
  const selectedChar = getCharacterById(selectedFighterId);
  const unlockedFighters = profile?.unlockedFighters ?? [];
  const equippedForSelected =
    profile?.equippedArtifacts?.[selectedFighterId] ?? [];

  const streakStatus = getDailyStreakStatus(profile, nowMs);
  const displayName = profile?.displayName || "Luchador";

  const handleClaimDaily = async () => {
    if (!user || !streakStatus.canClaim || claimingStreak) return;
    setClaimingStreak(true);
    setClaimBannerMsg(null);
    try {
      const res = await claimDailyStreakReward(user.uid);
      setProfile(res.updatedProfile);
      setClaimBannerMsg(
        `¡Canjeado! +${res.rewardCoins} Xela Coins (Día ${res.newStreak} de racha)`
      );
    } catch (err) {
      console.error("Error reclamando racha diaria:", err);
    } finally {
      setClaimingStreak(false);
    }
  };

  const handleStartAIFight = () => {
    const opp = getCharacterById(
      aiOpponentId === selectedFighterId
        ? selectedFighterId === "kai"
          ? "nova"
          : "kai"
        : aiOpponentId
    );

    stopDashboardMusic();
    unlockBattleAudio();
    playRoundBell();

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
    <div className="space-y-6">
      {/* Banner Profesional de Racha Diaria (24h) */}
      <Card className="relative overflow-hidden border-amber-400/25 bg-gradient-to-r from-[#0F0C08] via-[#131018] to-[#0B0C14]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
        <CardContent className="relative flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-400/35 bg-amber-400/15 text-amber-300">
                <Gift className="mr-1 h-3.5 w-3.5" />
                Recompensa Diaria 24h
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-300">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                {(profile?.coins ?? 0).toLocaleString("es-MX")} Xela Coins
              </span>
            </div>

            <h2 className="font-display text-lg font-bold text-white sm:text-xl">
              ¡Bienvenido, {displayName}! Llevas {streakStatus.currentDisplayStreak} días de racha 🔥
            </h2>
            <p className="text-xs text-zinc-400">
              {streakStatus.canClaim
                ? streakStatus.streakExpired
                  ? `Tu racha anterior expiró (>48h). Reclama hoy para iniciar en Día 1 (+${streakStatus.projectedRewardCoins} monedas).`
                  : `Disponible ahora: reclama +${streakStatus.projectedRewardCoins} monedas (25 base + 5 por día, máx. 75/día).`
                : `Próximo canje disponible en ${formatCountdown(streakStatus.msUntilNextClaim)} (entre 24h y 48h suma +1 día).`}
            </p>
            {claimBannerMsg && (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {claimBannerMsg}
              </p>
            )}
          </div>

          <div className="shrink-0">
            <Button
              type="button"
              size="lg"
              disabled={!streakStatus.canClaim || claimingStreak}
              onClick={handleClaimDaily}
              className={cn(
                "w-full sm:w-auto",
                streakStatus.canClaim
                  ? "bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.25)]"
                  : "border border-white/10 bg-zinc-900 text-zinc-400"
              )}
            >
              {streakStatus.canClaim ? (
                <>
                  <Gift className="h-4 w-4" />
                  {claimingStreak
                    ? "Canjeando..."
                    : `Canjear +${streakStatus.projectedRewardCoins} Coins`}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  {formatCountdown(streakStatus.msUntilNextClaim)}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  Arena Principal • Mejor de 3 Rounds
                </Badge>
                <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  Hola, {displayName}
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
                {equippedForSelected.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {equippedForSelected.map((artId) => {
                      const art = getArtifactById(artId);
                      if (!art) return null;
                      return (
                        <span
                          key={art.id}
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {art.name}
                        </span>
                      );
                    })}
                  </div>
                )}
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
              Combate vs Amigos (+50 Coins)
            </CardTitle>
            <CardDescription>
              Duelos 1 vs 1 al mejor de 3 rounds con código de sala de 6 caracteres.
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
                Combate Rápido vs IA (2 de 3 Rounds)
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
                const artCount = (profile?.equippedArtifacts?.[char.id] ?? []).length;
                return (
                  <button
                    key={char.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelectedFighterId(char.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all",
                      active
                        ? "border-white bg-white/10 ring-1 ring-white/40"
                        : "border-white/10 bg-zinc-950/70 hover:border-white/25",
                      !unlocked && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {artCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 rounded bg-cyan-400/20 px-1 text-[9px] font-bold text-cyan-300">
                        +{artCount}
                      </span>
                    )}
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
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-display text-sm font-bold text-white">
                          {diff.label}
                        </p>
                        <span className="font-mono text-[10px] font-bold text-amber-400">
                          +{diff.reward}🪙
                        </span>
                      </div>
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
                Victoria: +20/+35/+50 Coins • Derrota: +5 Coins de consolación.
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/shop">
          <Card className="h-full border-amber-400/20 transition-colors hover:border-amber-400/45">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Tienda de Artefactos
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  16 armas y accesorios exclusivos con mejoras reales de combate.
                </p>
              </div>
              <ShoppingBag className="h-8 w-8 shrink-0 text-amber-400" />
            </CardContent>
          </Card>
        </Link>

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
              <Trophy className="h-8 w-8 shrink-0 text-cyan-400" />
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
                  Desbloquea avatares exclusivos con tus Xela Coins.
                </p>
              </div>
              <img
                src={avatar.src}
                alt={avatar.name}
                className="h-11 w-11 shrink-0 rounded-xl border border-white/15"
              />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
