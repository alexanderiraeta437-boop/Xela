"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  CheckCircle2,
  Coins,
  Lock,
  LogOut,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/auth";
import { purchaseAvatar, updateUserProfileData } from "@/lib/firestore";
import {
  DEFAULT_FREE_AVATAR_ID,
  getAvatarById,
  type AvatarPreset,
} from "@/constants/avatars";
import { CHARACTERS, isCharacterUnlocked } from "@/constants/characters";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getWinRate } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, setProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState(DEFAULT_FREE_AVATAR_ID);
  const [saving, setSaving] = useState(false);
  const [buyingAvatar, setBuyingAvatar] = useState(false);
  const [pendingBuyAvatar, setPendingBuyAvatar] = useState<AvatarPreset | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setAvatarId(profile.avatarId || DEFAULT_FREE_AVATAR_ID);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSavedMsg(null);

    if (displayName.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUserProfileData(user.uid, {
        displayName: displayName.trim(),
        avatarId,
      });
      if (updated) {
        setProfile(updated);
      } else {
        await refreshProfile();
      }
      setSavedMsg("Perfil actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el perfil. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const handlePurchaseAvatar = async (avatar: AvatarPreset) => {
    if (!user || buyingAvatar) return;
    setError(null);
    setSavedMsg(null);
    setBuyingAvatar(true);

    try {
      const updated = await purchaseAvatar(user.uid, avatar.id);
      setProfile(updated);
      setAvatarId(avatar.id);
      setPendingBuyAvatar(null);
      setSavedMsg(
        `¡Avatar "${avatar.name}" desbloqueado y equipado por ${avatar.price} Coins!`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desbloquear el avatar."
      );
    } finally {
      setBuyingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };

  const currentAvatar = getAvatarById(avatarId);
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const coins = profile?.coins ?? 0;
  const unlockedAvatars = profile?.unlockedAvatars ?? [DEFAULT_FREE_AVATAR_ID];
  const unlockedCount = CHARACTERS.filter((c) =>
    isCharacterUnlocked(c, wins, profile?.unlockedFighters ?? [])
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Perfil de Luchador
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Personaliza tu identidad, desbloquea avatares exclusivos y consulta tu progreso.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-xs font-bold text-amber-300">
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="font-mono">{coins.toLocaleString("es-MX")} Coins</span>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void handleSignOut()}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Editar Identidad</CardTitle>
            <CardDescription>
              Elige tu nombre visible y desbloquea avatares predefinidos (300 - 800 Coins).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4">
                <img
                  src={currentAvatar.src}
                  alt={currentAvatar.name}
                  className="h-16 w-16 rounded-xl border border-white/15 object-cover"
                />
                <div>
                  <p className="font-display text-lg font-bold text-white">
                    {displayName || "Luchador"}
                  </p>
                  <p className="text-xs text-zinc-400">{profile?.email}</p>
                  <Badge variant="accent" className="mt-1.5 text-[10px]">
                    Avatar: {currentAvatar.name}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre visible</Label>
                <Input
                  id="displayName"
                  maxLength={24}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu alias en Xela"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Avatares Predefinidos</Label>
                  <span className="text-xs text-zinc-400">
                    {unlockedAvatars.length} / 12 desbloqueados
                  </span>
                </div>
                <AvatarPicker
                  selectedId={avatarId}
                  unlockedAvatars={unlockedAvatars}
                  onSelect={(id) => {
                    setAvatarId(id);
                    setPendingBuyAvatar(null);
                  }}
                  onAttemptBuy={(avatar) => {
                    setError(null);
                    setPendingBuyAvatar(avatar);
                  }}
                />
              </div>

              {/* Panel de compra de avatar bloqueado */}
              {pendingBuyAvatar && (
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <img
                      src={pendingBuyAvatar.src}
                      alt={pendingBuyAvatar.name}
                      className="h-12 w-12 rounded-lg border border-amber-400/30 object-cover"
                    />
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        Desbloquear Avatar {pendingBuyAvatar.name}
                      </p>
                      <p className="text-xs text-amber-200/80">
                        Precio: {pendingBuyAvatar.price} Xela Coins • Tu saldo:{" "}
                        {coins} Coins
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingBuyAvatar(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={coins < pendingBuyAvatar.price || buyingAvatar}
                      onClick={() => void handlePurchaseAvatar(pendingBuyAvatar)}
                      className="bg-amber-400 text-black hover:bg-amber-300"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {buyingAvatar
                        ? "Comprando..."
                        : coins >= pendingBuyAvatar.price
                          ? `Comprar (${pendingBuyAvatar.price}🪙)`
                          : "Saldo insuficiente"}
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {savedMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {savedMsg}
                </div>
              )}

              <Button type="submit" size="lg" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resumen de estadísticas */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Estadísticas de Combate</CardTitle>
            <CardDescription>
              Progreso sincronizado online y offline (`xela_cached_session`).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Xela Coins", value: `${coins.toLocaleString("es-MX")} 🪙`, coin: true },
              { label: "Racha Diaria", value: `${profile?.loginStreak ?? 0} días 🔥` },
              { label: "Puntos de Ranking", value: profile?.rankingPoints ?? 1000, highlight: true },
              { label: "Victorias Totales", value: wins },
              { label: "Derrotas Totales", value: losses },
              { label: "Porcentaje de Victoria", value: `${getWinRate(wins, losses)}%` },
              { label: "Racha de Victorias", value: profile?.winStreak ?? 0 },
              { label: "Luchadores Desbloqueados", value: `${unlockedCount} / ${CHARACTERS.length}` },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3"
              >
                <span className="text-sm text-zinc-400">{row.label}</span>
                <span
                  className={
                    row.coin
                      ? "font-mono text-base font-bold text-amber-400"
                      : row.highlight
                        ? "font-mono text-lg font-bold text-cyan-400"
                        : "font-mono text-base font-bold text-white"
                  }
                >
                  {row.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
