"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfileData } from "@/lib/firestore";
import { getAvatarById } from "@/constants/avatars";
import { CHARACTERS, isCharacterUnlocked } from "@/constants/characters";
import { AvatarPicker } from "@/components/profile/AvatarPicker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getWinRate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarId, setAvatarId] = useState("avatar-01");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setAvatarId(profile.avatarId || "avatar-01");
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
      await updateUserProfileData(user.uid, {
        displayName: displayName.trim(),
        avatarId,
      });
      await refreshProfile();
      setSavedMsg("Perfil actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el perfil. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar = getAvatarById(avatarId);
  const wins = profile?.wins ?? 0;
  const losses = profile?.losses ?? 0;
  const unlockedCount = CHARACTERS.filter((c) =>
    isCharacterUnlocked(c, wins, profile?.unlockedFighters ?? [])
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">
          Perfil de Luchador
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Personaliza tu identidad y consulta tu historial competitivo en Firestore.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Editar Identidad</CardTitle>
            <CardDescription>
              Elige tu nombre visible y un avatar predefinido del catálogo oficial.
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
                <Label>Avatares Predefinidos</Label>
                <AvatarPicker selectedId={avatarId} onSelect={setAvatarId} />
              </div>

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
              Progreso sincronizado en tiempo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Puntos de Ranking", value: profile?.rankingPoints ?? 1000, highlight: true },
              { label: "Victorias Totales", value: wins },
              { label: "Derrotas Totales", value: losses },
              { label: "Porcentaje de Victoria", value: `${getWinRate(wins, losses)}%` },
              { label: "Racha Actual", value: profile?.winStreak ?? 0 },
              { label: "Luchadores Desbloqueados", value: `${unlockedCount} / ${CHARACTERS.length}` },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3"
              >
                <span className="text-sm text-zinc-400">{row.label}</span>
                <span
                  className={
                    row.highlight
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
