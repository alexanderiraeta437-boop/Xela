"use client";

import React from "react";
import { CHARACTERS, isCharacterUnlocked } from "@/constants/characters";
import { useAuth } from "@/hooks/useAuth";
import { FighterCard } from "@/components/fighters/FighterCard";
import { Badge } from "@/components/ui/badge";

export default function FightersPage() {
  const { profile, selectedFighterId, setSelectedFighterId } = useAuth();
  const wins = profile?.wins ?? 0;
  const unlockedList = profile?.unlockedFighters ?? [];
  const unlockedCount = CHARACTERS.filter((c) =>
    isCharacterUnlocked(c, wins, unlockedList)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Luchadores de Xela
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Acumula victorias en la arena para desbloquear todo el plantel oficial.
          </p>
        </div>

        <Badge variant="accent" className="w-fit px-3.5 py-1.5 text-xs">
          Desbloqueados: {unlockedCount} / {CHARACTERS.length}
        </Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CHARACTERS.map((fighter) => (
          <FighterCard
            key={fighter.id}
            fighter={fighter}
            unlocked={isCharacterUnlocked(fighter, wins, unlockedList)}
            selected={selectedFighterId === fighter.id}
            playerWins={wins}
            onSelect={setSelectedFighterId}
          />
        ))}
      </div>
    </div>
  );
}
