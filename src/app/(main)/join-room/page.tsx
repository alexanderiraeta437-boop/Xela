"use client";

import React, { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { joinRoom, normalizeRoomCode } from "@/lib/rtdb";
import { RoomLobby } from "@/components/room/RoomLobby";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinRoomPage() {
  const { user, profile, selectedFighterId } = useAuth();
  const [inputCode, setInputCode] = useState("");
  const [joinedCode, setJoinedCode] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const clean = normalizeRoomCode(inputCode);
    if (clean.length !== 6) {
      setError("Ingresa un código válido de 6 caracteres.");
      return;
    }

    setError(null);
    setJoining(true);
    try {
      await joinRoom({
        roomCode: clean,
        guestUid: user.uid,
        guestName: profile?.displayName || "Retador",
        guestAvatar: profile?.avatarId || "avatar-01",
        guestFighter: selectedFighterId,
      });
      setJoinedCode(clean);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo unir a la sala."
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">
          Unirse a Sala
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Introduce el código de 6 caracteres proporcionado por el anfitrión.
        </p>
      </div>

      {joinedCode ? (
        <RoomLobby
          roomCode={joinedCode}
          role="guest"
          onLeave={() => setJoinedCode(null)}
        />
      ) : (
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Ingresar Código</CardTitle>
            <CardDescription>
              Ejemplo: X7K9M2 (sin importar mayúsculas o minúsculas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="roomCode">Código de 6 caracteres</Label>
                <Input
                  id="roomCode"
                  maxLength={6}
                  required
                  value={inputCode}
                  onChange={(e) => setInputCode(normalizeRoomCode(e.target.value))}
                  placeholder="A1B2C3"
                  className="h-14 text-center font-mono text-2xl font-bold tracking-[0.35em] uppercase"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                variant="accent"
                className="w-full"
                disabled={joining || inputCode.length < 6}
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar a la Sala
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
