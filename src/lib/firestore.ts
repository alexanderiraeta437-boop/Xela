import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import {
  CHARACTERS,
  DEFAULT_FIGHTER_IDS,
  getRequiredWins,
} from "@/constants/characters";
import { AVATARS } from "@/constants/avatars";
import type { AIDifficulty, FightMode, UserProfile } from "@/types";

const USERS_COLLECTION = "users";
const CACHE_PREFIX = "xela_cached_profile_";
const PENDING_SYNC_PREFIX = "xela_pending_sync_";

/**
 * Guarda una copia del perfil del usuario en localStorage para uso offline.
 */
export function saveCachedUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${profile.uid}`,
      JSON.stringify(profile)
    );
  } catch (err) {
    console.warn("No se pudo guardar perfil en caché local:", err);
  }
}

/**
 * Lee el perfil guardado localmente en el dispositivo.
 */
export function getCachedUserProfile(uid: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Marca que hay cambios locales pendientes de subir a Firestore cuando vuelva la conexión.
 */
function markPendingSync(uid: string, pending: boolean): void {
  if (typeof window === "undefined") return;
  if (pending) {
    localStorage.setItem(`${PENDING_SYNC_PREFIX}${uid}`, "true");
  } else {
    localStorage.removeItem(`${PENDING_SYNC_PREFIX}${uid}`);
  }
}

function hasPendingSync(uid: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${PENDING_SYNC_PREFIX}${uid}`) === "true";
}

/**
 * Sube a Firestore el progreso acumulado mientras el usuario jugó sin internet.
 */
export async function syncPendingOfflineProgress(
  uid: string
): Promise<UserProfile | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  if (!hasPendingSync(uid)) return null;

  const localProfile = getCachedUserProfile(uid);
  if (!localProfile) {
    markPendingSync(uid, false);
    return null;
  }

  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const remote = snap.data() as UserProfile;
    // Combinar valores asegurando que no se pierdan victorias ni luchadores desbloqueados
    const mergedWins = Math.max(remote.wins, localProfile.wins);
    const mergedLosses = Math.max(remote.losses, localProfile.losses);
    const mergedPoints = localProfile.rankingPoints;
    const mergedStreak = localProfile.winStreak;
    const mergedFighters = Array.from(
      new Set([
        ...(remote.unlockedFighters ?? DEFAULT_FIGHTER_IDS),
        ...(localProfile.unlockedFighters ?? DEFAULT_FIGHTER_IDS),
      ])
    );

    await updateDoc(ref, {
      displayName: localProfile.displayName,
      avatarId: localProfile.avatarId,
      wins: mergedWins,
      losses: mergedLosses,
      winStreak: mergedStreak,
      rankingPoints: mergedPoints,
      unlockedFighters: mergedFighters,
      lastLogin: serverTimestamp(),
    });

    const mergedProfile: UserProfile = {
      ...remote,
      displayName: localProfile.displayName,
      avatarId: localProfile.avatarId,
      wins: mergedWins,
      losses: mergedLosses,
      winStreak: mergedStreak,
      rankingPoints: mergedPoints,
      unlockedFighters: mergedFighters,
    };

    saveCachedUserProfile(mergedProfile);
    markPendingSync(uid, false);
    return mergedProfile;
  }

  markPendingSync(uid, false);
  return localProfile;
}

/**
 * Obtiene el perfil de un usuario desde Firestore (con respaldo local si no hay internet).
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return getCachedUserProfile(uid);
  }

  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return getCachedUserProfile(uid);
    const profile = snap.data() as UserProfile;
    saveCachedUserProfile(profile);
    return profile;
  } catch {
    return getCachedUserProfile(uid);
  }
}

/**
 * Garantiza que exista el documento `users/{uid}` en Firestore y actualiza `lastLogin`.
 */
export async function ensureUserProfile(
  user: User,
  overrideDisplayName?: string
): Promise<UserProfile> {
  // Si no hay conexión, devolver el perfil cacheado del mismo usuario
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = getCachedUserProfile(user.uid);
    if (cached) return cached;
  }

  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      lastLogin: serverTimestamp(),
    });
    const existing = snap.data() as UserProfile;
    const normalized: UserProfile = {
      ...existing,
      unlockedFighters:
        existing.unlockedFighters?.length > 0
          ? existing.unlockedFighters
          : [...DEFAULT_FIGHTER_IDS],
    };
    saveCachedUserProfile(normalized);
    return normalized;
  }

  const fallbackName =
    overrideDisplayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Luchador";

  const newProfile: Omit<UserProfile, "createdAt" | "lastLogin"> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastLogin: ReturnType<typeof serverTimestamp>;
  } = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: fallbackName,
    avatarId: AVATARS[0].id,
    wins: 0,
    losses: 0,
    winStreak: 0,
    unlockedFighters: [...DEFAULT_FIGHTER_IDS],
    rankingPoints: 1000,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  await setDoc(ref, newProfile);
  const created: UserProfile = {
    ...newProfile,
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };
  saveCachedUserProfile(created);
  return created;
}

/**
 * Actualiza nombre visible y avatar predefinido del perfil (online y offline).
 */
export async function updateUserProfileData(
  uid: string,
  data: { displayName: string; avatarId: string }
): Promise<void> {
  const cleanName = data.displayName.trim();
  const cached = getCachedUserProfile(uid);

  if (cached) {
    saveCachedUserProfile({
      ...cached,
      displayName: cleanName,
      avatarId: data.avatarId,
    });
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    markPendingSync(uid, true);
    return;
  }

  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    await updateDoc(ref, {
      displayName: cleanName,
      avatarId: data.avatarId,
    });
  } catch {
    markPendingSync(uid, true);
  }
}

/**
 * Calcula los puntos ganados o perdidos según modo, dificultad y racha.
 */
export function calculatePointsDelta(
  won: boolean,
  mode: FightMode,
  difficulty: AIDifficulty = "medium",
  currentStreak = 0
): number {
  if (won) {
    const base =
      mode === "multiplayer"
        ? 35
        : difficulty === "hard"
          ? 30
          : difficulty === "medium"
            ? 20
            : 12;
    const streakBonus = Math.min(currentStreak * 3, 15);
    return base + streakBonus;
  }

  return mode === "multiplayer" ? -15 : -8;
}

/**
 * Registra el resultado de un combate, actualiza ranking y desbloquea nuevos luchadores.
 * Funciona tanto online como offline (encolando la subida para cuando vuelva internet).
 */
export async function recordMatchResult(params: {
  uid: string;
  won: boolean;
  mode: FightMode;
  difficulty?: AIDifficulty;
}): Promise<{
  updatedProfile: UserProfile;
  pointsDelta: number;
  newlyUnlocked: string[];
}> {
  const { uid, won, mode, difficulty = "medium" } = params;

  // Primero intentar sincronizar si había partidas previas pendientes y ya hay red
  if (typeof navigator !== "undefined" && navigator.onLine && hasPendingSync(uid)) {
    await syncPendingOfflineProgress(uid).catch(() => {});
  }

  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));

  if (!current) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  const nextWins = current.wins + (won ? 1 : 0);
  const nextLosses = current.losses + (won ? 0 : 1);
  const nextStreak = won ? current.winStreak + 1 : 0;
  const pointsDelta = calculatePointsDelta(
    won,
    mode,
    difficulty,
    current.winStreak
  );
  const nextPoints = Math.max(0, current.rankingPoints + pointsDelta);

  const unlockedSet = new Set(
    current.unlockedFighters?.length
      ? current.unlockedFighters
      : DEFAULT_FIGHTER_IDS
  );
  const newlyUnlocked: string[] = [];

  for (const fighter of CHARACTERS) {
    const req = getRequiredWins(fighter.unlockCondition);
    if (nextWins >= req && !unlockedSet.has(fighter.id)) {
      unlockedSet.add(fighter.id);
      newlyUnlocked.push(fighter.id);
    }
  }

  const nextUnlocked = Array.from(unlockedSet);

  const updatedProfile: UserProfile = {
    ...current,
    wins: nextWins,
    losses: nextLosses,
    winStreak: nextStreak,
    rankingPoints: nextPoints,
    unlockedFighters: nextUnlocked,
  };

  // Guardar siempre en caché local inmediatamente
  saveCachedUserProfile(updatedProfile);

  // Si no hay internet, marcar pendiente y devolver progreso local sin error
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    markPendingSync(uid, true);
    return { updatedProfile, pointsDelta, newlyUnlocked };
  }

  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    await updateDoc(ref, {
      wins: nextWins,
      losses: nextLosses,
      winStreak: nextStreak,
      rankingPoints: nextPoints,
      unlockedFighters: nextUnlocked,
    });
    markPendingSync(uid, false);
  } catch (err) {
    console.warn("Sin conexión al guardar en Firestore, encolado localmente:", err);
    markPendingSync(uid, true);
  }

  return { updatedProfile, pointsDelta, newlyUnlocked };
}

/**
 * Obtiene la tabla de posiciones global ordenada por `rankingPoints`.
 */
export async function getGlobalRanking(maxResults = 50): Promise<UserProfile[]> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return [];
  }

  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(
    usersRef,
    orderBy("rankingPoints", "desc"),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as UserProfile);
}
