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

/**
 * Obtiene el perfil de un usuario desde Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/**
 * Garantiza que exista el documento `users/{uid}` en Firestore y actualiza `lastLogin`.
 */
export async function ensureUserProfile(
  user: User,
  overrideDisplayName?: string
): Promise<UserProfile> {
  const ref = doc(db, USERS_COLLECTION, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      lastLogin: serverTimestamp(),
    });
    const existing = snap.data() as UserProfile;
    return {
      ...existing,
      unlockedFighters:
        existing.unlockedFighters?.length > 0
          ? existing.unlockedFighters
          : [...DEFAULT_FIGHTER_IDS],
    };
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
  return {
    ...newProfile,
    createdAt: Date.now(),
    lastLogin: Date.now(),
  };
}

/**
 * Actualiza nombre visible y avatar predefinido del perfil.
 */
export async function updateUserProfileData(
  uid: string,
  data: { displayName: string; avatarId: string }
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, {
    displayName: data.displayName.trim(),
    avatarId: data.avatarId,
  });
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
  const ref = doc(db, USERS_COLLECTION, uid);
  const current = await getUserProfile(uid);

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

  await updateDoc(ref, {
    wins: nextWins,
    losses: nextLosses,
    winStreak: nextStreak,
    rankingPoints: nextPoints,
    unlockedFighters: nextUnlocked,
  });

  const updatedProfile: UserProfile = {
    ...current,
    wins: nextWins,
    losses: nextLosses,
    winStreak: nextStreak,
    rankingPoints: nextPoints,
    unlockedFighters: nextUnlocked,
  };

  return { updatedProfile, pointsDelta, newlyUnlocked };
}

/**
 * Obtiene la tabla de posiciones global ordenada por `rankingPoints`.
 */
export async function getGlobalRanking(maxResults = 50): Promise<UserProfile[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(
    usersRef,
    orderBy("rankingPoints", "desc"),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as UserProfile);
}
