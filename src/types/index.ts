import type { Timestamp } from "firebase/firestore";

/**
 * Estadísticas base de un luchador en Xela.
 */
export interface FighterStats {
  hp: number;
  speed: number;
  power: number;
  defense: number;
}

/**
 * Nombres de los movimientos de combate de un luchador.
 */
export interface FighterMoves {
  light: string;
  heavy: string;
  special: string;
  block: string;
}

/**
 * Definición completa de un personaje jugable.
 */
export interface Fighter {
  id: string;
  name: string;
  title: string;
  description: string;
  themeColor: string;
  unlockCondition: string; // "default" | "wins:<n>"
  stats: FighterStats;
  moves: FighterMoves;
  specialName: string;
  specialDescription: string;
}

/**
 * Ranura de artefacto de combate.
 */
export type ArtifactSlot = "weapon" | "accessory";

/**
 * Bonificadores porcentuales reales en combate otorgados por un artefacto (+6% a +12%).
 */
export interface ArtifactStatsBoost {
  damagePct?: number;
  defensePct?: number;
  speedPct?: number;
  energyGainPct?: number;
}

/**
 * Artefacto exclusivo de un luchador en la tienda de Xela.
 */
export interface Artifact {
  id: string;
  fighterId: string;
  name: string;
  slot: ArtifactSlot;
  description: string;
  price: number;
  boosts: ArtifactStatsBoost;
  boostLabel: string;
  accentColor: string;
}

/**
 * Documento de usuario almacenado en Firestore (colección `users/{uid}`)
 * y cacheado localmente bajo `xela_cached_session`.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarId: string;
  wins: number;
  losses: number;
  winStreak: number;
  unlockedFighters: string[];
  rankingPoints: number;
  coins: number;
  loginStreak: number;
  lastClaimTimestamp: number | null;
  ownedArtifacts: string[];
  equippedArtifacts: Record<string, string[]>;
  unlockedAvatars: string[];
  createdAt: Timestamp | number | null;
  lastLogin: Timestamp | number | null;
}

/**
 * Estados posibles de una sala multijugador en Realtime Database.
 */
export type RoomStatus = "waiting" | "ready" | "fighting" | "finished";

/**
 * Estado en tiempo real de un jugador dentro de una sala de combate.
 */
export interface PlayerCombatSync {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  energy: number;
  facing: 1 | -1;
  action: CombatAction;
  actionSeq: number;
  hitSeq: number;
  round?: number;
  equippedArtifacts?: string[];
  damageTaken?: number;
  updatedAt: number;
}

/**
 * Estructura de una sala en Realtime Database (`rooms/{roomCode}`).
 */
export interface RoomData {
  host: string;
  hostName?: string;
  hostAvatar?: string;
  guest: string | null;
  guestName?: string | null;
  guestAvatar?: string | null;
  status: RoomStatus;
  hostFighter: string;
  guestFighter: string | null;
  hostReady: boolean;
  guestReady: boolean;
  winnerUid?: string | null;
  createdAt: number;
  combat?: {
    host?: PlayerCombatSync;
    guest?: PlayerCombatSync;
    roundTimer?: number;
    startedAt?: number;
  };
}

/**
 * Acciones posibles de un luchador en Phaser.
 */
export type CombatAction =
  | "idle"
  | "walk"
  | "jump"
  | "light"
  | "heavy"
  | "special"
  | "block"
  | "hit"
  | "ko";

/**
 * Niveles de dificultad de la IA.
 */
export type AIDifficulty = "easy" | "medium" | "hard";

/**
 * Modo de combate.
 */
export type FightMode = "ai" | "multiplayer";

/**
 * Resultado de un combate para actualizar estadísticas y mostrar en pantalla.
 */
export interface MatchResult {
  won: boolean;
  mode: FightMode;
  difficulty?: AIDifficulty;
  playerFighterId: string;
  opponentFighterId: string;
  opponentName: string;
  pointsDelta: number;
  coinsEarned: number;
  newlyUnlockedFighters: string[];
  remainingHp: number;
  durationSeconds: number;
  playerRoundsWon: number;
  opponentRoundsWon: number;
}
