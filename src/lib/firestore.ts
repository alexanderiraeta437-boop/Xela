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
import {
  AVATARS,
  DEFAULT_FREE_AVATAR_ID,
  isAvatarUnlocked,
} from "@/constants/avatars";
import { getArtifactById } from "@/constants/artifacts";
import {
  getCachedSession,
  normalizeUserProfile,
  saveCachedSession,
} from "@/lib/session";
import type { AIDifficulty, FightMode, UserProfile } from "@/types";

const USERS_COLLECTION = "users";
const CACHE_PREFIX = "xela_cached_profile_";
const PENDING_SYNC_PREFIX = "xela_pending_sync_";

export const DAILY_STREAK_MIN_MS = 24 * 60 * 60 * 1000;
export const DAILY_STREAK_MAX_MS = 48 * 60 * 60 * 1000;

/**
 * Guarda una copia del perfil del usuario en localStorage (`xela_cached_session` y respaldo por uid).
 */
export function saveCachedUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeUserProfile(profile);
  saveCachedSession(normalized);
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${normalized.uid}`,
      JSON.stringify(normalized)
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
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      if (parsed && parsed.uid) {
        return normalizeUserProfile({ ...parsed, uid: parsed.uid });
      }
    }
    const session = getCachedSession();
    if (session && session.uid === uid) return session;
    return null;
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
 * Persiste cambios en caché local inmediatamente e intenta subir a Firestore
 * (encolando si no hay conexión).
 */
async function persistProfileChanges(
  updatedProfile: UserProfile,
  firestoreFields: Record<string, unknown>
): Promise<UserProfile> {
  const normalized = normalizeUserProfile(updatedProfile);
  saveCachedUserProfile(normalized);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    markPendingSync(normalized.uid, true);
    return normalized;
  }

  try {
    const ref = doc(db, USERS_COLLECTION, normalized.uid);
    await updateDoc(ref, firestoreFields);
    markPendingSync(normalized.uid, false);
  } catch (err) {
    console.warn("Sin conexión al guardar en Firestore, encolado localmente:", err);
    markPendingSync(normalized.uid, true);
  }

  return normalized;
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
    const remote = normalizeUserProfile({
      ...(snap.data() as Partial<UserProfile>),
      uid,
    });

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
    const mergedOwnedArtifacts = Array.from(
      new Set([...(remote.ownedArtifacts ?? []), ...(localProfile.ownedArtifacts ?? [])])
    );
    const mergedUnlockedAvatars = Array.from(
      new Set([
        DEFAULT_FREE_AVATAR_ID,
        ...(remote.unlockedAvatars ?? []),
        ...(localProfile.unlockedAvatars ?? []),
      ])
    );

    const localClaimTs = localProfile.lastClaimTimestamp ?? 0;
    const remoteClaimTs = remote.lastClaimTimestamp ?? 0;
    const useLocalClaim = localClaimTs >= remoteClaimTs;

    const mergedLastClaim = useLocalClaim
      ? localProfile.lastClaimTimestamp
      : remote.lastClaimTimestamp;
    const mergedLoginStreak = useLocalClaim
      ? localProfile.loginStreak
      : remote.loginStreak;

    const payload = {
      displayName: localProfile.displayName,
      avatarId: mergedUnlockedAvatars.includes(localProfile.avatarId)
        ? localProfile.avatarId
        : DEFAULT_FREE_AVATAR_ID,
      wins: mergedWins,
      losses: mergedLosses,
      winStreak: mergedStreak,
      rankingPoints: mergedPoints,
      unlockedFighters: mergedFighters,
      coins: localProfile.coins,
      loginStreak: mergedLoginStreak,
      lastClaimTimestamp: mergedLastClaim,
      ownedArtifacts: mergedOwnedArtifacts,
      equippedArtifacts: localProfile.equippedArtifacts,
      unlockedAvatars: mergedUnlockedAvatars,
      lastLogin: serverTimestamp(),
    };

    await updateDoc(ref, payload);

    const mergedProfile = normalizeUserProfile({
      ...remote,
      ...payload,
      lastLogin: Date.now(),
    });

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
    const profile = normalizeUserProfile({
      ...(snap.data() as Partial<UserProfile>),
      uid,
    });
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
    const normalized = normalizeUserProfile({
      ...(snap.data() as Partial<UserProfile>),
      uid: user.uid,
    });
    saveCachedUserProfile(normalized);
    return normalized;
  }

  const fallbackName =
    overrideDisplayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "Luchador";

  const newProfileDoc = {
    uid: user.uid,
    email: user.email ?? "",
    displayName: fallbackName,
    avatarId: AVATARS[0].id,
    wins: 0,
    losses: 0,
    winStreak: 0,
    unlockedFighters: [...DEFAULT_FIGHTER_IDS],
    rankingPoints: 1000,
    coins: 0,
    loginStreak: 0,
    lastClaimTimestamp: null,
    ownedArtifacts: [] as string[],
    equippedArtifacts: {} as Record<string, string[]>,
    unlockedAvatars: [DEFAULT_FREE_AVATAR_ID],
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  await setDoc(ref, newProfileDoc);
  const created = normalizeUserProfile({
    ...newProfileDoc,
    createdAt: Date.now(),
    lastLogin: Date.now(),
  });
  saveCachedUserProfile(created);
  return created;
}

/**
 * Actualiza nombre visible y avatar predefinido del perfil (online y offline).
 */
export async function updateUserProfileData(
  uid: string,
  data: { displayName: string; avatarId: string }
): Promise<UserProfile | null> {
  const cleanName = data.displayName.trim();
  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));

  if (!current) return null;

  const unlocked = current.unlockedAvatars ?? [DEFAULT_FREE_AVATAR_ID];
  const validAvatar = isAvatarUnlocked(data.avatarId, unlocked)
    ? data.avatarId
    : current.avatarId;

  const updated: UserProfile = {
    ...current,
    displayName: cleanName,
    avatarId: validAvatar,
  };

  return persistProfileChanges(updated, {
    displayName: cleanName,
    avatarId: validAvatar,
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
 * Economía exigente: calcula Xela Coins otorgadas al terminar una batalla completa (2 rounds).
 */
export function calculateBattleCoins(
  won: boolean,
  mode: FightMode,
  difficulty: AIDifficulty = "medium"
): number {
  if (!won) return 5;
  if (mode === "multiplayer") return 50;
  if (difficulty === "hard") return 50;
  if (difficulty === "medium") return 35;
  return 20;
}

/**
 * Registra el resultado de un combate, actualiza ranking, monedas y desbloquea luchadores.
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
  coinsEarned: number;
  newlyUnlocked: string[];
}> {
  const { uid, won, mode, difficulty = "medium" } = params;

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
  const coinsEarned = calculateBattleCoins(won, mode, difficulty);
  const nextPoints = Math.max(0, current.rankingPoints + pointsDelta);
  const nextCoins = Math.max(0, (current.coins ?? 0) + coinsEarned);

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
    coins: nextCoins,
    unlockedFighters: nextUnlocked,
  };

  const persisted = await persistProfileChanges(updatedProfile, {
    wins: nextWins,
    losses: nextLosses,
    winStreak: nextStreak,
    rankingPoints: nextPoints,
    coins: nextCoins,
    unlockedFighters: nextUnlocked,
  });

  return { updatedProfile: persisted, pointsDelta, coinsEarned, newlyUnlocked };
}

/**
 * Calcula estado de disponibilidad de la racha diaria de 24 horas.
 */
export function getDailyStreakStatus(
  profile: UserProfile | null,
  nowMs = Date.now()
): {
  canClaim: boolean;
  msUntilNextClaim: number;
  currentDisplayStreak: number;
  projectedStreak: number;
  projectedRewardCoins: number;
  streakExpired: boolean;
} {
  const lastClaim = profile?.lastClaimTimestamp ?? null;
  const savedStreak = profile?.loginStreak ?? 0;

  if (!lastClaim) {
    return {
      canClaim: true,
      msUntilNextClaim: 0,
      currentDisplayStreak: savedStreak,
      projectedStreak: 1,
      projectedRewardCoins: Math.min(75, 25 + 1 * 5),
      streakExpired: false,
    };
  }

  const elapsed = Math.max(0, nowMs - lastClaim);
  if (elapsed < DAILY_STREAK_MIN_MS) {
    const nextStreak = savedStreak + 1;
    return {
      canClaim: false,
      msUntilNextClaim: DAILY_STREAK_MIN_MS - elapsed,
      currentDisplayStreak: savedStreak,
      projectedStreak: nextStreak,
      projectedRewardCoins: Math.min(75, 25 + nextStreak * 5),
      streakExpired: false,
    };
  }

  const streakExpired = elapsed > DAILY_STREAK_MAX_MS;
  const nextStreak = streakExpired ? 1 : Math.max(1, savedStreak + 1);
  return {
    canClaim: true,
    msUntilNextClaim: 0,
    currentDisplayStreak: streakExpired ? 0 : savedStreak,
    projectedStreak: nextStreak,
    projectedRewardCoins: Math.min(75, 25 + nextStreak * 5),
    streakExpired,
  };
}

/**
 * Reclama la recompensa diaria cada 24h (25 base + 5 por día, máximo 75 monedas/día).
 */
export async function claimDailyStreakReward(uid: string): Promise<{
  updatedProfile: UserProfile;
  rewardCoins: number;
  newStreak: number;
}> {
  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));

  if (!current) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  const now = Date.now();
  const status = getDailyStreakStatus(current, now);
  if (!status.canClaim) {
    throw new Error("Aún debes esperar 24 horas para reclamar tu racha diaria.");
  }

  const newStreak = status.projectedStreak;
  const rewardCoins = Math.min(75, 25 + newStreak * 5);
  const nextCoins = (current.coins ?? 0) + rewardCoins;

  const updatedProfile: UserProfile = {
    ...current,
    coins: nextCoins,
    loginStreak: newStreak,
    lastClaimTimestamp: now,
  };

  const persisted = await persistProfileChanges(updatedProfile, {
    coins: nextCoins,
    loginStreak: newStreak,
    lastClaimTimestamp: now,
  });

  return {
    updatedProfile: persisted,
    rewardCoins,
    newStreak,
  };
}

/**
 * Compra un artefacto exclusivo y lo equipa automáticamente en su luchador.
 */
export async function purchaseArtifact(
  uid: string,
  artifactId: string
): Promise<UserProfile> {
  const artifact = getArtifactById(artifactId);
  if (!artifact) {
    throw new Error("El artefacto no existe.");
  }

  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));
  if (!current) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  if (current.ownedArtifacts.includes(artifactId)) {
    throw new Error("Ya posees este artefacto.");
  }

  if (current.coins < artifact.price) {
    throw new Error(
      `Necesitas ${artifact.price} Xela Coins para comprar este artefacto.`
    );
  }

  const nextCoins = current.coins - artifact.price;
  const nextOwned = Array.from(new Set([...current.ownedArtifacts, artifactId]));

  const currentFighterEquipped = current.equippedArtifacts[artifact.fighterId] ?? [];
  const filteredSameSlot = currentFighterEquipped.filter((id) => {
    const existing = getArtifactById(id);
    return existing && existing.slot !== artifact.slot;
  });
  const nextEquipped = {
    ...current.equippedArtifacts,
    [artifact.fighterId]: [...filteredSameSlot, artifactId],
  };

  const updatedProfile: UserProfile = {
    ...current,
    coins: nextCoins,
    ownedArtifacts: nextOwned,
    equippedArtifacts: nextEquipped,
  };

  return persistProfileChanges(updatedProfile, {
    coins: nextCoins,
    ownedArtifacts: nextOwned,
    equippedArtifacts: nextEquipped,
  });
}

/**
 * Equipa o desequipa un artefacto ya comprado para su luchador exclusivo.
 */
export async function toggleEquipArtifact(
  uid: string,
  artifactId: string
): Promise<UserProfile> {
  const artifact = getArtifactById(artifactId);
  if (!artifact) {
    throw new Error("El artefacto no existe.");
  }

  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));
  if (!current) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  if (!current.ownedArtifacts.includes(artifactId)) {
    throw new Error("Debes comprar este artefacto primero.");
  }

  const currentList = current.equippedArtifacts[artifact.fighterId] ?? [];
  const isEquipped = currentList.includes(artifactId);

  const nextList = isEquipped
    ? currentList.filter((id) => id !== artifactId)
    : [
        ...currentList.filter((id) => {
          const item = getArtifactById(id);
          return item && item.slot !== artifact.slot;
        }),
        artifactId,
      ];

  const nextEquipped = {
    ...current.equippedArtifacts,
    [artifact.fighterId]: nextList,
  };

  const updatedProfile: UserProfile = {
    ...current,
    equippedArtifacts: nextEquipped,
  };

  return persistProfileChanges(updatedProfile, {
    equippedArtifacts: nextEquipped,
  });
}

/**
 * Desbloquea un avatar de perfil pagando con Xela Coins (online y offline).
 */
export async function purchaseAvatar(
  uid: string,
  avatarId: string
): Promise<UserProfile> {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  if (!avatar) {
    throw new Error("El avatar seleccionado no existe.");
  }

  const current =
    getCachedUserProfile(uid) ?? (await getUserProfile(uid));
  if (!current) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  const unlocked = current.unlockedAvatars ?? [DEFAULT_FREE_AVATAR_ID];
  if (isAvatarUnlocked(avatarId, unlocked)) {
    throw new Error("Este avatar ya está desbloqueado.");
  }

  if (current.coins < avatar.price) {
    throw new Error(
      `Necesitas ${avatar.price} Xela Coins para desbloquear este avatar.`
    );
  }

  const nextCoins = current.coins - avatar.price;
  const nextUnlockedAvatars = Array.from(
    new Set([DEFAULT_FREE_AVATAR_ID, ...unlocked, avatarId])
  );

  const updatedProfile: UserProfile = {
    ...current,
    coins: nextCoins,
    unlockedAvatars: nextUnlockedAvatars,
    avatarId,
  };

  return persistProfileChanges(updatedProfile, {
    coins: nextCoins,
    unlockedAvatars: nextUnlockedAvatars,
    avatarId,
  });
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
  return snapshot.docs.map((d) =>
    normalizeUserProfile({
      ...(d.data() as Partial<UserProfile>),
      uid: d.id,
    })
  );
}
