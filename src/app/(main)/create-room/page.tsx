"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createRoom, normalizeRoomCode } from "@/lib/rtdb";
import { RoomLobby } from "@/components/room/RoomLobby";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function CreateRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, selectedFighterId } = useAuth();

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si venimos de vuelta desde /fight?code=XXXXXX, reconectar a esa misma sala
  useEffect(() => {
    const existingCode = searchParams.get("code");
    if (existingCode) {
      const clean = normalizeRoomCode(existingCode);
      if (clean.length === 6) {
        setRoomCode(clean);
      }
    }
  }, [searchParams]);

  const handleCreate = async () => {
    if (!user) return;
    setError(null);
    setCreating(true);
    try {
      const code = await createRoom({
        hostUid: user.uid,
        hostName: profile?.displayName || "Anfitrión",
        hostAvatar: profile?.avatarId || "avatar-01",
        hostFighter: selectedFighterId,
      });
      setRoomCode(code);
      router.replace(`/create-room?code=${code}`);
    } catch (err) {
      console.error(err);
      setError("No se pudo crear la sala. Verifica tu conexión.");
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveLobby = () => {
    setRoomCode(null);
    router.replace("/create-room");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">
          Crear Sala 1 vs 1
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Genera un código único de 6 caracteres e invita a un amigo para combatir en tiempo real.
        </p>
      </div>

      {roomCode ? (
        <RoomLobby
          roomCode={roomCode}
          role="host"
          onLeave={handleLeaveLobby}
        />
      ) : (
        <Card className="mx-auto max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nueva Sala Privada</CardTitle>
            <CardDescription>
              Al crear la sala obtendrás un código de 6 caracteres para compartir con tu oponente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <Button
              size="lg"
              variant="accent"
              className="w-full sm:w-auto"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando código...
                </>
              ) : (
                <>
                  <PlusSquare className="h-4 w-4" />
                  Generar Código de Sala
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      }
    >
      <CreateRoomContent />
    </Suspense>
  );
}
