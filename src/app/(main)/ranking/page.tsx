"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import type { UserProfile } from "@/types";
import { getGlobalRanking } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getWinRate } from "@/lib/utils";

export default function RankingPage() {
  const { user, profile } = useAuth();
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const data = await getGlobalRanking(50);
      setPlayers(data);
    } catch (err) {
      console.error("Error cargando ranking:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRanking();
  }, []);

  const myPosition = players.findIndex((p) => p.uid === user?.uid) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Ranking Global
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Clasificación oficial de los mejores competidores de Xela.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadRanking} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Ranking Personal */}
      {profile && (
        <Card className="border-cyan-400/25 bg-[#0B0B12]">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Tu Posición
                </p>
                <p className="font-mono text-xl font-bold text-white">
                  {myPosition > 0 ? `#${myPosition}` : "Top 50+"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Puntos
              </p>
              <p className="font-mono text-xl font-bold text-cyan-400">
                {profile.rankingPoints}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Balance V / D
              </p>
              <p className="font-mono text-xl font-bold text-white">
                {profile.wins} / {profile.losses}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Win Rate / Racha
              </p>
              <p className="font-mono text-xl font-bold text-emerald-400">
                {getWinRate(profile.wins, profile.losses)}% • {profile.winStreak}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <LeaderboardTable players={players} currentUid={user?.uid} />
      )}
    </div>
  );
}
