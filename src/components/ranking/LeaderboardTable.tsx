"use client";

import React from "react";
import type { UserProfile } from "@/types";
import { getAvatarById } from "@/constants/avatars";
import { getWinRate, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeaderboardTableProps {
  players: UserProfile[];
  currentUid?: string;
}

export function LeaderboardTable({
  players,
  currentUid,
}: LeaderboardTableProps) {
  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0B0B10] p-10 text-center text-sm text-zinc-400">
        Aún no hay jugadores registrados en el ranking global.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B0B10]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-950/70 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <th className="px-4 py-3.5">#</th>
              <th className="px-4 py-3.5">Jugador</th>
              <th className="px-4 py-3.5 text-right">Victorias</th>
              <th className="hidden px-4 py-3.5 text-right sm:table-cell">
                Derrotas
              </th>
              <th className="hidden px-4 py-3.5 text-right md:table-cell">
                Win Rate
              </th>
              <th className="hidden px-4 py-3.5 text-right md:table-cell">
                Racha
              </th>
              <th className="px-4 py-3.5 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {players.map((player, index) => {
              const rank = index + 1;
              const isMe = player.uid === currentUid;
              const avatar = getAvatarById(player.avatarId);
              const winRate = getWinRate(player.wins, player.losses);

              return (
                <tr
                  key={player.uid}
                  className={cn(
                    "transition-colors hover:bg-white/[0.03]",
                    isMe && "bg-cyan-400/10"
                  )}
                >
                  <td className="px-4 py-3.5 font-mono font-bold">
                    {rank <= 3 ? (
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs",
                          rank === 1 && "bg-amber-400/20 text-amber-300 border border-amber-400/40",
                          rank === 2 && "bg-zinc-300/20 text-zinc-200 border border-zinc-300/40",
                          rank === 3 && "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                        )}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="pl-2 text-zinc-400">{rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={avatar.src}
                        alt={avatar.name}
                        className="h-9 w-9 rounded-lg border border-white/10 object-cover"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-white">
                            {player.displayName}
                          </span>
                          {isMe && (
                            <Badge variant="accent" className="text-[10px]">
                              Tú
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 sm:hidden">
                          {winRate}% WR
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-400">
                    {player.wins}
                  </td>
                  <td className="hidden px-4 py-3.5 text-right font-mono text-zinc-400 sm:table-cell">
                    {player.losses}
                  </td>
                  <td className="hidden px-4 py-3.5 text-right font-mono text-zinc-300 md:table-cell">
                    {winRate}%
                  </td>
                  <td className="hidden px-4 py-3.5 text-right font-mono text-zinc-300 md:table-cell">
                    {player.winStreak}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-cyan-400">
                    {player.rankingPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
