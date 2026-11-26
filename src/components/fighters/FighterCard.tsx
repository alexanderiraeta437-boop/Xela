"use client";

import React from "react";
import { Lock, CheckCircle2, Zap } from "lucide-react";
import type { Fighter } from "@/types";
import { getRequiredWins } from "@/constants/characters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FighterCardProps {
  fighter: Fighter;
  unlocked: boolean;
  selected: boolean;
  playerWins: number;
  onSelect?: (fighterId: string) => void;
}

export function FighterCard({
  fighter,
  unlocked,
  selected,
  playerWins,
  onSelect,
}: FighterCardProps) {
  const requiredWins = getRequiredWins(fighter.unlockCondition);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200",
        selected
          ? "border-white/50 ring-2 ring-white/25"
          : "border-white/10 hover:border-white/25",
        !unlocked && "opacity-75"
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: fighter.themeColor }}
      />

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/80 p-1.5">
              <img
                src={`/characters/${fighter.id}.svg`}
                alt={fighter.name}
                className={cn(
                  "h-full w-full object-contain",
                  !unlocked && "grayscale opacity-60"
                )}
              />
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                  <Lock className="h-5 w-5 text-zinc-300" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-bold text-white">
                  {fighter.name}
                </h3>
                {selected && (
                  <Badge variant="accent" className="text-[10px]">
                    Activo
                  </Badge>
                )}
              </div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: fighter.themeColor }}
              >
                {fighter.title}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {fighter.description}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          {[
            { label: "Vida", value: fighter.stats.hp, max: 140 },
            { label: "Velocidad", value: fighter.stats.speed, max: 100 },
            { label: "Poder", value: fighter.stats.power, max: 100 },
            { label: "Defensa", value: fighter.stats.defense, max: 100 },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span>{stat.label}</span>
                <span className="font-mono font-semibold text-zinc-200">
                  {stat.value}
                </span>
              </div>
              <Progress
                value={stat.value}
                max={stat.max}
                indicatorColor={fighter.themeColor}
                className="h-1.5"
              />
            </div>
          ))}
        </div>

        {/* Movimientos */}
        <div className="mt-4 rounded-xl border border-white/10 bg-zinc-950/80 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Zap className="h-3.5 w-3.5" style={{ color: fighter.themeColor }} />
            <span>Especial: {fighter.specialName}</span>
          </div>
          <p className="mt-1 text-zinc-400">{fighter.specialDescription}</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-white/10 pt-2 text-[11px] text-zinc-400">
            <div>
              <span className="block text-zinc-500">Ligero</span>
              <span className="text-zinc-200">{fighter.moves.light}</span>
            </div>
            <div>
              <span className="block text-zinc-500">Fuerte</span>
              <span className="text-zinc-200">{fighter.moves.heavy}</span>
            </div>
            <div>
              <span className="block text-zinc-500">Bloqueo</span>
              <span className="text-zinc-200">{fighter.moves.block}</span>
            </div>
          </div>
        </div>

        {/* Acción / Desbloqueo */}
        <div className="mt-4">
          {unlocked ? (
            <Button
              type="button"
              variant={selected ? "secondary" : "default"}
              className="w-full"
              disabled={selected}
              onClick={() => onSelect?.(fighter.id)}
            >
              {selected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  Luchador seleccionado
                </>
              ) : (
                "Seleccionar luchador"
              )}
            </Button>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-xs">
              <span className="flex items-center gap-2 text-zinc-400">
                <Lock className="h-3.5 w-3.5 text-zinc-500" />
                Requiere {requiredWins} victorias
              </span>
              <span className="font-mono font-semibold text-white">
                {Math.min(playerWins, requiredWins)} / {requiredWins}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
