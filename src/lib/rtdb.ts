import {
  ref,
  get,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  type Unsubscribe,
} from "firebase/database";
import { rtdb } from "./firebase";
import type { PlayerCombatSync, RoomData } from "@/types";

const ROOM_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Genera un código de sala único de 6 caracteres legibles.
 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ROOM_CHARSET[Math.floor(Math.random() * ROOM_CHARSET.length)];
  }
  return code;
}

/**
 * Normaliza un código ingresado por el usuario.
 */
export function normalizeRoomCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * Crea una sala en Realtime Database con código de 6 caracteres.
 */
export async function createRoom(params: {
  hostUid: string;
  hostName: string;
  hostAvatar: string;
  hostFighter: string;
}): Promise<string> {
  const { hostUid, hostName, hostAvatar, hostFighter } = params;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const roomRef = ref(rtdb, `rooms/${code}`);
    const existing = await get(roomRef);

    if (!existing.exists()) {
      const roomData: RoomData = {
        host: hostUid,
        hostName,
        hostAvatar,
        guest: null,
        guestName: null,
        guestAvatar: null,
        status: "waiting",
        hostFighter,
        guestFighter: null,
        hostReady: false,
        guestReady: false,
        winnerUid: null,
        createdAt: Date.now(),
      };
      await set(roomRef, roomData);
      return code;
    }
  }

  throw new Error("No se pudo generar un código de sala disponible.");
}

/**
 * Se une como invitado a una sala existente usando su código de 6 caracteres.
 */
export async function joinRoom(params: {
  roomCode: string;
  guestUid: string;
  guestName: string;
  guestAvatar: string;
  guestFighter: string;
}): Promise<RoomData> {
  const code = normalizeRoomCode(params.roomCode);
  if (code.length !== 6) {
    throw new Error("El código de sala debe tener exactamente 6 caracteres.");
  }

  const roomRef = ref(rtdb, `rooms/${code}`);
  const snap = await get(roomRef);

  if (!snap.exists()) {
    throw new Error("No existe ninguna sala activa con ese código.");
  }

  const room = snap.val() as RoomData;

  if (room.host === params.guestUid || room.guest === params.guestUid) {
    return room;
  }

  if (room.guest && room.guest !== params.guestUid) {
    throw new Error("La sala ya está llena.");
  }

  const updates: Partial<RoomData> = {
    guest: params.guestUid,
    guestName: params.guestName,
    guestAvatar: params.guestAvatar,
    guestFighter: params.guestFighter,
    guestReady: false,
    winnerUid: null,
    status: "ready",
  };

  await update(roomRef, updates);
  return { ...room, ...updates };
}

/**
 * Actualiza el luchador elegido por el host o el invitado.
 */
export async function updateRoomFighter(
  roomCode: string,
  role: "host" | "guest",
  fighterId: string
): Promise<void> {
  const roomRef = ref(rtdb, `rooms/${normalizeRoomCode(roomCode)}`);
  await update(
    roomRef,
    role === "host"
      ? { hostFighter: fighterId }
      : { guestFighter: fighterId }
  );
}

/**
 * Marca al jugador como listo y arranca la pelea si ambos están listos.
 */
export async function setPlayerReady(
  roomCode: string,
  role: "host" | "guest",
  ready: boolean
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const roomRef = ref(rtdb, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = snap.val() as RoomData;
  const hostReady = role === "host" ? ready : Boolean(room.hostReady);
  const guestReady = role === "guest" ? ready : Boolean(room.guestReady);
  const canFight = Boolean(room.guest) && hostReady && guestReady;

  if (canFight) {
    // Limpiar datos de combate previos antes de iniciar la nueva ronda
    await remove(ref(rtdb, `rooms/${code}/combat`));
  }

  await update(roomRef, {
    hostReady,
    guestReady,
    winnerUid: canFight ? null : room.winnerUid ?? null,
    status: canFight ? "fighting" : room.guest ? "ready" : "waiting",
  });
}

/**
 * Reinicia la sala al terminar una pelea para jugar revancha sin cerrar la sala.
 */
export async function resetRoomForRematch(roomCode: string): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const roomRef = ref(rtdb, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return;

  const room = snap.val() as RoomData;
  await remove(ref(rtdb, `rooms/${code}/combat`));
  await update(roomRef, {
    hostReady: false,
    guestReady: false,
    winnerUid: null,
    status: room.guest ? "ready" : "waiting",
  });
}

/**
 * Escucha cambios en tiempo real de una sala.
 */
export function subscribeRoom(
  roomCode: string,
  callback: (room: RoomData | null) => void
): Unsubscribe {
  const roomRef = ref(rtdb, `rooms/${normalizeRoomCode(roomCode)}`);
  return onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.val() as RoomData);
  });
}

/**
 * Envía el estado de combate del jugador local a Realtime Database.
 */
export async function pushCombatState(
  roomCode: string,
  role: "host" | "guest",
  state: PlayerCombatSync
): Promise<void> {
  const combatRef = ref(
    rtdb,
    `rooms/${normalizeRoomCode(roomCode)}/combat/${role}`
  );
  await set(combatRef, state);
}

/**
 * Escucha el estado de combate del oponente en tiempo real.
 */
export function subscribeOpponentCombat(
  roomCode: string,
  opponentRole: "host" | "guest",
  callback: (state: PlayerCombatSync | null) => void
): Unsubscribe {
  const combatRef = ref(
    rtdb,
    `rooms/${normalizeRoomCode(roomCode)}/combat/${opponentRole}`
  );
  return onValue(combatRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as PlayerCombatSync) : null);
  });
}

/**
 * Marca el combate de la sala como finalizado.
 */
export async function finishRoom(
  roomCode: string,
  winnerUid: string
): Promise<void> {
  const roomRef = ref(rtdb, `rooms/${normalizeRoomCode(roomCode)}`);
  await update(roomRef, {
    status: "finished",
    winnerUid,
  });
}

/**
 * Abandona o cierra la sala según el rol del jugador.
 */
export async function leaveRoom(
  roomCode: string,
  role: "host" | "guest"
): Promise<void> {
  const code = normalizeRoomCode(roomCode);
  const roomRef = ref(rtdb, `rooms/${code}`);
  if (role === "host") {
    await remove(roomRef);
  } else {
    await remove(ref(rtdb, `rooms/${code}/combat`));
    await update(roomRef, {
      guest: null,
      guestName: null,
      guestAvatar: null,
      guestFighter: null,
      guestReady: false,
      hostReady: false,
      winnerUid: null,
      status: "waiting",
    });
  }
}

/**
 * Registra limpieza automática si el usuario pierde conexión durante el lobby.
 */
export function registerRoomDisconnectCleanup(
  roomCode: string,
  role: "host" | "guest"
): void {
  const code = normalizeRoomCode(roomCode);
  if (role === "host") {
    const roomRef = ref(rtdb, `rooms/${code}`);
    void onDisconnect(roomRef).remove();
  } else {
    const guestRef = ref(rtdb, `rooms/${code}/guest`);
    void onDisconnect(guestRef).set(null);
  }
}
