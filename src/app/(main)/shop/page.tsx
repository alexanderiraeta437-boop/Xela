"use client";

import React, { useMemo, useState } from "react";
import {
  Coins,
  CheckCircle2,
  Shield,
  Sparkles,
  Sword,
  ShoppingBag,
  Lock,
} from "lucide-react";
import { ARTIFACTS } from "@/constants/artifacts";
import { CHARACTERS, getCharacterById } from "@/constants/characters";
import { purchaseArtifact, toggleEquipArtifact } from "@/lib/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ShopPage() {
  const { user, profile, setProfile } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const coins = profile?.coins ?? 0;
  const owned = profile?.ownedArtifacts ?? [];
  const equippedMap = profile?.equippedArtifacts ?? {};

  const filteredArtifacts = useMemo(() => {
    if (selectedFilter === "all") return ARTIFACTS;
    return ARTIFACTS.filter((a) => a.fighterId === selectedFilter);
  }, [selectedFilter]);

  const handleBuy = async (artifactId: string) => {
    if (!user || busyId) return;
    setFeedback(null);
    setBusyId(artifactId);
    try {
      const updated = await purchaseArtifact(user.uid, artifactId);
      setProfile(updated);
      setFeedback({
        type: "success",
        text: "Artefacto comprado y equipado automáticamente en su luchador.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo realizar la compra.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleEquip = async (artifactId: string) => {
    if (!user || busyId) return;
    setFeedback(null);
    setBusyId(artifactId);
    try {
      const updated = await toggleEquipArtifact(user.uid, artifactId);
      setProfile(updated);
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "No se pudo actualizar equipo.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Badge variant="accent" className="mb-2">
            <ShoppingBag className="mr-1 h-3.5 w-3.5" />
            Armería Oficial de Xela
          </Badge>
          <h1 className="font-display text-3xl font-bold text-white">
            Tienda de Artefactos
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            16 artefactos exclusivos (2 por luchador) con mejoras reales de +6% a +12% en combate.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5">
          <Coins className="h-5 w-5 text-amber-400" />
          <div className="leading-tight">
            <span className="block text-[10px] uppercase tracking-wider text-amber-200/75">
              Saldo disponible
            </span>
            <span className="font-mono text-lg font-bold text-amber-300">
              {coins.toLocaleString("es-MX")} Coins
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          )}
        >
          {feedback.text}
        </div>
      )}

      {/* Filtros por luchador */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedFilter("all")}
          className={cn(
            "rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors",
            selectedFilter === "all"
              ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
              : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/25 hover:text-white"
          )}
        >
          Todos ({ARTIFACTS.length})
        </button>
        {CHARACTERS.map((char) => (
          <button
            key={char.id}
            type="button"
            onClick={() => setSelectedFilter(char.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
              selectedFilter === char.id
                ? "border-white bg-white/10 text-white"
                : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/25 hover:text-white"
            )}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: char.themeColor }}
            />
            {char.name}
          </button>
        ))}
      </div>

      {/* Catálogo de artefactos */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredArtifacts.map((artifact) => {
          const fighter = getCharacterById(artifact.fighterId);
          const isOwned = owned.includes(artifact.id);
          const isEquipped = (equippedMap[artifact.fighterId] ?? []).includes(
            artifact.id
          );
          const canAfford = coins >= artifact.price;
          const isBusy = busyId === artifact.id;

          return (
            <Card
              key={artifact.id}
              className={cn(
                "relative overflow-hidden transition-all",
                isEquipped
                  ? "border-cyan-400/50 bg-[#0B1016]"
                  : "border-white/10 hover:border-white/25"
              )}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-3xl"
                style={{ backgroundColor: artifact.accentColor }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/70"
                      style={{ color: artifact.accentColor }}
                    >
                      {artifact.slot === "weapon" ? (
                        <Sword className="h-5 w-5" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">
                        {artifact.name}
                      </CardTitle>
                      <p
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: fighter.themeColor }}
                      >
                        Exclusivo de {fighter.name} •{" "}
                        {artifact.slot === "weapon" ? "Arma" : "Accesorio"}
                      </p>
                    </div>
                  </div>

                  {isEquipped ? (
                    <Badge variant="accent" className="shrink-0 text-[10px]">
                      Equipado
                    </Badge>
                  ) : isOwned ? (
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      En inventario
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-400">
                  {artifact.description}
                </p>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {artifact.boostLabel}
                  </span>
                </div>

                {isOwned ? (
                  <Button
                    type="button"
                    variant={isEquipped ? "outline" : "accent"}
                    className="w-full"
                    disabled={isBusy}
                    onClick={() => void handleToggleEquip(artifact.id)}
                  >
                    {isEquipped ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        Equipado (Desequipar)
                      </>
                    ) : (
                      `Equipar en ${fighter.name}`
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant={canAfford ? "default" : "secondary"}
                    className="w-full"
                    disabled={!canAfford || isBusy}
                    onClick={() => void handleBuy(artifact.id)}
                  >
                    {canAfford ? (
                      <>
                        <Coins className="h-4 w-4 text-amber-500" />
                        {isBusy
                          ? "Comprando..."
                          : `Comprar • ${artifact.price.toLocaleString("es-MX")} Coins`}
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-zinc-400" />
                        {`Faltan ${(artifact.price - coins).toLocaleString("es-MX")} Coins (${artifact.price})`}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
