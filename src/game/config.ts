import type { AIDifficulty, CombatAction, FightMode } from "@/types";
import type { HudSnapshot, VirtualControlsState } from "@/stores/useGameStore";

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 540;
export const GROUND_Y = 448;
export const STAGE_LEFT = 68;
export const STAGE_RIGHT = 892;
export const GRAVITY = 1950;
export const ROUND_DURATION_SECONDS = 99;
export const SPECIAL_ENERGY_COST = 50;

export interface AttackFrameData {
  duration: number; // ms total
  activeStart: number; // ms when hitbox becomes active
  activeEnd: number; // ms when hitbox ends
  range: number;
  damageMultiplier: number;
  knockbackX: number;
  knockbackY: number;
  hitstun: number;
  energyGain: number;
}

export const ATTACK_DATA: Record<"light" | "heavy" | "special", AttackFrameData> = {
  light: {
    duration: 270,
    activeStart: 70,
    activeEnd: 170,
    range: 92,
    damageMultiplier: 1.0,
    knockbackX: 160,
    knockbackY: -40,
    hitstun: 220,
    energyGain: 12,
  },
  heavy: {
    duration: 460,
    activeStart: 150,
    activeEnd: 310,
    range: 112,
    damageMultiplier: 1.85,
    knockbackX: 310,
    knockbackY: -180,
    hitstun: 360,
    energyGain: 20,
  },
  special: {
    duration: 620,
    activeStart: 140,
    activeEnd: 460,
    range: 195,
    damageMultiplier: 2.9,
    knockbackX: 430,
    knockbackY: -250,
    hitstun: 480,
    energyGain: 0,
  },
};

export interface MatchRuntimeConfig {
  mode: FightMode;
  difficulty: AIDifficulty;
  roomCode: string | null;
  role: "host" | "guest" | null;
  playerFighterId: string;
  opponentFighterId: string;
  playerUid: string;
  opponentName: string;
  getVirtualControls: () => VirtualControlsState;
  onHudUpdate: (partial: Partial<HudSnapshot>) => void;
  onMatchEnd: (payload: {
    won: boolean;
    remainingHp: number;
    durationSeconds: number;
  }) => void;
}

export function isAttackAction(
  action: CombatAction
): action is "light" | "heavy" | "special" {
  return action === "light" || action === "heavy" || action === "special";
}
