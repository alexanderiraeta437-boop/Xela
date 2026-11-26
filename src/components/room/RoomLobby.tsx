"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Swords, Users, Loader2, LogOut } from "lucide-react";
import type { RoomData } from "@/types";
import {
  CHARACTERS,
  getCharacterById,
  isCharacterUnlocked,
} from "@/constants/characters";
import { getAvatarById } from "@/constants/avatars";
import {
  subscribeRoom,
  updateRoomFighter,
  setPlayerReady,
  leaveRoom,
  registerRoomDisconnectCleanup,
} from "@/lib/rtdb";
import { useAuth } from "@/hooks/useAuth";
import { useGameStore } from "@/stores/useGameStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RoomLobbyProps {
  roomCode: string;
  role: "host" | "guest";
  onLeave: () => void;
}

export function RoomLobby({ roomCode, role, onLeave }: RoomLobbyProps) {
  const router = useRouter();
  const { profile, user } = useAuth();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [copied, setCopied] = useState(false);
  const [togglingReady, setTogglingReady] = useState(false);

  useEffect(() => {
    registerRoomDisconnectCleanup(roomCode, role);
    const unsubscribe = subscribeRoom(roomCode, (data) => {
      if (!data) {
        onLeave();
        return;
      }
      setRoom(data);

      if (
        data.status === "fighting" &&
        data.guest &&
        data.guestFighter &&
        user
      ) {
        const myFighter =
          role === "host" ? data.hostFighter : data.guestFighter;
        const oppFighter =
          role === "host" ? data.guestFighter : data.hostFighter;
        const oppName =
          role === "host"
            ? data.guestName || "Rival"
            : data.hostName || "Anfitrión";

        setMatchConfig({
          mode: "multiplayer",
          roomCode,
          role,
          playerFighterId: myFighter,
          opponentFighterId: oppFighter,
          opponentName: oppName,
        });

        router.push(
          `/fight?mode=multiplayer&room=${roomCode}&role=${role}`
        );
      }
    });

    return () => unsubscribe();
  }, [roomCode, role, user, router, setMatchConfig, onLeave]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSelectFighter = async (fighterId: string) => {
    await updateRoomFighter(roomCode, role, fighterId);
  };

  const handleToggleReady = async () => {
    if (!room) return;
    setTogglingReady(true);
    const currentReady = role === "host" ? room.hostReady : room.guestReady;
    try {
      await setPlayerReady(roomCode, role, !currentReady);
    } finally {
      setTogglingReady(false);
    }
  };

  const handleLeave = async () => {
    await leaveRoom(roomCode, role);
    onLeave();
  };

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
        <p className="mt-3 text-sm">Conectando a la sala {roomCode}...</p>
      </div>
    );
  }

  const hostFighter = getCharacterById(room.hostFighter);
  const guestFighter = room.guestFighter
    ? getCharacterById(room.guestFighter)
    : null;
  const mySelectedId =
    role === "host" ? room.hostFighter : room.guestFighter || "kai";
  const myReady = role === "host" ? room.hostReady : room.guestReady;

  const wins = profile?.wins ?? 0;
  const unlockedList = profile?.unlockedFighters ?? [];

  return (
    <div className="space-y-6">
      {/* Código de sala */}
      <Card className="border-cyan-400/25 bg-[#0B0B12]">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400">
              Código de Sala
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-[0.25em] text-white sm:text-4xl">
                {roomCode}
              </span>
              <Button variant="outline" size="sm" onClick={handleCopyCode}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              Comparte este código de 6 caracteres con tu rival para iniciar el duelo.
            </p>
          </div>

          <Button variant="destructive" size="sm" onClick={handleLeave}>
            <LogOut className="h-4 w-4" />
            Salir de la sala
          </Button>
        </CardContent>
      </Card>

      {/* Jugadores enfrentados */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Host */}
        <Card className="border-white/15">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="default">Anfitrión (P1)</Badge>
              <Badge variant={room.hostReady ? "success" : "secondary"}>
                {room.hostReady ? "Listo" : "Esperando"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <img
              src={getAvatarById(room.hostAvatar).src}
              alt="Host avatar"
              className="h-14 w-14 rounded-xl border border-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-white">
                {room.hostName || "Anfitrión"}
              </p>
              <p
                className="text-xs font-semibold"
                style={{ color: hostFighter.themeColor }}
              >
                {hostFighter.name} — {hostFighter.title}
              </p>
            </div>
            <img
              src={`/characters/${hostFighter.id}.svg`}
              alt={hostFighter.name}
              className="h-16 w-16 rounded-xl bg-black/60 object-contain p-1"
            />
          </CardContent>
        </Card>

        {/* Guest */}
        <Card className="border-white/15">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="accent">Retador (P2)</Badge>
              <Badge variant={room.guestReady ? "success" : "secondary"}>
                {!room.guest
                  ? "Vacío"
                  : room.guestReady
                    ? "Listo"
                    : "Esperando"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {room.guest && guestFighter ? (
              <div className="flex items-center gap-4">
                <img
                  src={getAvatarById(room.guestAvatar).src}
                  alt="Guest avatar"
                  className="h-14 w-14 rounded-xl border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold text-white">
                    {room.guestName || "Retador"}
                  </p>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: guestFighter.themeColor }}
                  >
                    {guestFighter.name} — {guestFighter.title}
                  </p>
                </div>
                <img
                  src={`/characters/${guestFighter.id}.svg`}
                  alt={guestFighter.name}
                  className="h-16 w-16 rounded-xl bg-black/60 object-contain p-1"
                />
              </div>
            ) : (
              <div className="flex h-16 items-center justify-center gap-2 text-sm text-zinc-500">
                <Users className="h-4 w-4 animate-pulse" />
                Esperando a que se una un amigo...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selector de luchador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Elige tu Luchador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CHARACTERS.map((char) => {
              const unlocked = isCharacterUnlocked(char, wins, unlockedList);
              const selected = char.id === mySelectedId;
              return (
                <button
                  key={char.id}
                  type="button"
                  disabled={!unlocked || myReady}
                  onClick={() => handleSelectFighter(char.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-white/10 bg-zinc-950/70 hover:border-white/25",
                    (!unlocked || myReady) && "cursor-not-allowed opacity-50"
                  )}
                >
                  <img
                    src={`/characters/${char.id}.svg`}
                    alt={char.name}
                    className="h-11 w-11 shrink-0 rounded-lg bg-black object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {char.name}
                    </p>
                    <p
                      className="truncate text-[11px]"
                      style={{ color: char.themeColor }}
                    >
                      {unlocked ? char.specialName : "Bloqueado"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row">
            <p className="text-xs text-zinc-400">
              {room.guest
                ? "Cuando ambos jugadores marquen Listo, el combate comenzará automáticamente."
                : "Puedes preparar tu luchador mientras esperas a tu rival."}
            </p>
            <Button
              size="lg"
              variant={myReady ? "outline" : "accent"}
              disabled={!room.guest || togglingReady}
              onClick={handleToggleReady}
              className="w-full sm:w-auto"
            >
              <Swords className="h-4 w-4" />
              {myReady ? "Cancelar Listo" : "Estoy Listo"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
