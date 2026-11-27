import type { User } from "firebase/auth";
import { DEFAULT_FIGHTER_IDS } from "@/constants/characters";
import { DEFAULT_FREE_AVATAR_ID } from "@/constants/avatars";
import type { UserProfile } from "@/types";

export const CACHED_SESSION_KEY = "xela_cached_session";

/**
 * Normaliza un perfil garantizando que todos los campos de sesión, economía,
 * artefactos y avatares existan incluso en cuentas antiguas o respuestas parciales.
 */
export function normalizeUserProfile(
  raw: Partial<UserProfile> & { uid: string }
): UserProfile {
  const unlockedFighters =
    Array.isArray(raw.unlockedFighters) && raw.unlockedFighters.length > 0
      ? Array.from(new Set([...DEFAULT_FIGHTER_IDS, ...raw.unlockedFighters]))
      : [...DEFAULT_FIGHTER_IDS];

  const unlockedAvatars = Array.isArray(raw.unlockedAvatars)
    ? Array.from(new Set([DEFAULT_FREE_AVATAR_ID, ...raw.unlockedAvatars]))
    : [DEFAULT_FREE_AVATAR_ID];

  const avatarId =
    raw.avatarId && unlockedAvatars.includes(raw.avatarId)
      ? raw.avatarId
      : DEFAULT_FREE_AVATAR_ID;

  const ownedArtifacts = Array.isArray(raw.ownedArtifacts)
    ? Array.from(new Set(raw.ownedArtifacts))
    : [];

  const equippedArtifacts: Record<string, string[]> = {};
  if (raw.equippedArtifacts && typeof raw.equippedArtifacts === "object") {
    for (const [fighterId, list] of Object.entries(raw.equippedArtifacts)) {
      if (Array.isArray(list)) {
        equippedArtifacts[fighterId] = Array.from(new Set(list));
      }
    }
  }

  return {
    uid: raw.uid,
    email: typeof raw.email === "string" ? raw.email : "",
    displayName:
      typeof raw.displayName === "string" && raw.displayName.trim()
        ? raw.displayName.trim()
        : "Luchador",
    avatarId,
    wins: typeof raw.wins === "number" && Number.isFinite(raw.wins) ? raw.wins : 0,
    losses:
      typeof raw.losses === "number" && Number.isFinite(raw.losses) ? raw.losses : 0,
    winStreak:
      typeof raw.winStreak === "number" && Number.isFinite(raw.winStreak)
        ? raw.winStreak
        : 0,
    unlockedFighters,
    rankingPoints:
      typeof raw.rankingPoints === "number" && Number.isFinite(raw.rankingPoints)
        ? raw.rankingPoints
        : 1000,
    coins:
      typeof raw.coins === "number" && Number.isFinite(raw.coins)
        ? Math.max(0, Math.floor(raw.coins))
        : 0,
    loginStreak:
      typeof raw.loginStreak === "number" && Number.isFinite(raw.loginStreak)
        ? Math.max(0, Math.floor(raw.loginStreak))
        : 0,
    lastClaimTimestamp:
      typeof raw.lastClaimTimestamp === "number" &&
      Number.isFinite(raw.lastClaimTimestamp)
        ? raw.lastClaimTimestamp
        : null,
    ownedArtifacts,
    equippedArtifacts,
    unlockedAvatars,
    createdAt: raw.createdAt ?? null,
    lastLogin: raw.lastLogin ?? null,
  };
}

/**
 * Guarda una copia inmediata de la sesión autenticada en `localStorage` bajo `xela_cached_session`.
 */
export function saveCachedSession(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const normalized = normalizeUserProfile(profile);
    const sessionPayload: UserProfile = {
      ...normalized,
      createdAt:
        typeof normalized.createdAt === "number" ? normalized.createdAt : Date.now(),
      lastLogin:
        typeof normalized.lastLogin === "number" ? normalized.lastLogin : Date.now(),
    };
    localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(sessionPayload));
  } catch (err) {
    console.warn("No se pudo guardar xela_cached_session:", err);
  }
}

/**
 * Lee y valida `xela_cached_session` desde `localStorage`.
 */
export function getCachedSession(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserProfile> | null;
    if (!parsed || typeof parsed.uid !== "string" || !parsed.uid.trim()) {
      return null;
    }
    return normalizeUserProfile({ ...parsed, uid: parsed.uid });
  } catch {
    return null;
  }
}

/**
 * Elimina `xela_cached_session` al cerrar sesión explícitamente.
 */
export function clearCachedSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHED_SESSION_KEY);
  } catch {
    // Ignorar error de almacenamiento
  }
}

/**
 * Crea un objeto compatible con `firebase/auth` `User` a partir de la sesión cacheada
 * para que todas las vistas protegidas funcionen sin conexión en el APK.
 */
export function createCachedAuthUser(session: UserProfile): User {
  return {
    uid: session.uid,
    email: session.email || null,
    displayName: session.displayName || null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    phoneNumber: null,
    photoURL: null,
    providerId: "cached-session",
    delete: async () => {},
    getIdToken: async () => "",
    getIdTokenResult: async () => ({} as never),
    reload: async () => {},
    toJSON: () => ({ uid: session.uid, email: session.email }),
  } as unknown as User;
}
