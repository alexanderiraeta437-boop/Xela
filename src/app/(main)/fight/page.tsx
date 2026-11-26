"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { get, ref } from "firebase/database";
import type { AIDifficulty, FightMode, RoomData } from "@/types";
import { getCharacterById } from "@/constants/characters";
import { rtdb } from "@/lib/firebase";
import { normalizeRoomCode } from "@/lib/rtdb";
import { useGameStore } from "@/stores/useGameStore";
import { PhaserArena } from "@/components/fight/PhaserArena";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function FightContent() {
  const searchParams = useSearchParams();
  const { mode, difficulty, roomCode, setMatchConfig } = useGameStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const paramMode = searchParams.get("mode") as FightMode | null;

      if (paramMode === "ai") {
        const diff = (searchParams.get("difficulty") as AIDifficulty) || "medium";
        const p1 = searchParams.get("p1") || "kai";
        const p2 = searchParams.get("p2") || "nova";
        const oppChar = getCharacterById(p2);

        setMatchConfig({
          mode: "ai",
          difficulty: diff,
          playerFighterId: p1,
          opponentFighterId: p2,
          opponentName: `IA ${oppChar.name}`,
        });
      } else if (paramMode === "multiplayer") {
        const rawRoom = searchParams.get("room");
        const paramRole = searchParams.get("role") as "host" | "guest" | null;
        if (rawRoom && (paramRole === "host" || paramRole === "guest")) {
          const code = normalizeRoomCode(rawRoom);
          const snap = await get(ref(rtdb, `rooms/${code}`));
          if (snap.exists() && active) {
            const room = snap.val() as RoomData;
            const myFighter =
              paramRole === "host"
                ? room.hostFighter
                : room.guestFighter || "nova";
            const oppFighter =
              paramRole === "host"
                ? room.guestFighter || "nova"
                : room.hostFighter;
            const oppName =
              paramRole === "host"
                ? room.guestName || "Rival"
                : room.hostName || "Anfitrión";

            setMatchConfig({
              mode: "multiplayer",
              roomCode: code,
              role: paramRole,
              playerFighterId: myFighter,
              opponentFighterId: oppFighter,
              opponentName: oppName,
            });
          }
        }
      }

      if (active) setReady(true);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [searchParams, setMatchConfig]);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm">Preparando arena de combate...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Salir
            </Button>
          </Link>
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            Combate 1 vs 1
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent">
            {mode === "multiplayer"
              ? `Multijugador • Sala ${roomCode ?? ""}`
              : `vs IA (${difficulty === "easy" ? "Fácil" : difficulty === "hard" ? "Difícil" : "Medio"})`}
          </Badge>
        </div>
      </div>

      <PhaserArena />
    </div>
  );
}

export default function FightPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
          <p className="mt-3 text-sm">Cargando combate...</p>
        </div>
      }
    >
      <FightContent />
    </Suspense>
  );
}
