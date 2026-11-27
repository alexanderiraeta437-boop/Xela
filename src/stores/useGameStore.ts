import { create } from "zustand";
import type { AIDifficulty, FightMode, MatchResult } from "@/types";

export interface HudSnapshot {
  p1Hp: number;
  p1MaxHp: number;
  p1Energy: number;
  p2Hp: number;
  p2MaxHp: number;
  p2Energy: number;
  timer: number;
  comboP1: number;
  comboP2: number;
  currentRound: number;
  p1RoundsWon: number;
  p2RoundsWon: number;
  bannerText: string | null;
}

export interface VirtualControlsState {
  left: boolean;
  right: boolean;
  jump: boolean;
  block: boolean;
  lightSeq: number;
  heavySeq: number;
  specialSeq: number;
}

interface GameState {
  mode: FightMode;
  difficulty: AIDifficulty;
  roomCode: string | null;
  role: "host" | "guest" | null;
  playerFighterId: string;
  opponentFighterId: string;
  opponentName: string;
  lastResult: MatchResult | null;
  hud: HudSnapshot;
  virtualControls: VirtualControlsState;

  setMatchConfig: (config: {
    mode: FightMode;
    difficulty?: AIDifficulty;
    roomCode?: string | null;
    role?: "host" | "guest" | null;
    playerFighterId: string;
    opponentFighterId: string;
    opponentName: string;
  }) => void;
  setHud: (partial: Partial<HudSnapshot>) => void;
  setLastResult: (result: MatchResult | null) => void;
  setVirtualButton: (
    key: "left" | "right" | "jump" | "block",
    pressed: boolean
  ) => void;
  triggerVirtualAttack: (type: "light" | "heavy" | "special") => void;
  resetFightState: () => void;
}

const DEFAULT_HUD: HudSnapshot = {
  p1Hp: 100,
  p1MaxHp: 100,
  p1Energy: 0,
  p2Hp: 100,
  p2MaxHp: 100,
  p2Energy: 0,
  timer: 99,
  comboP1: 0,
  comboP2: 0,
  currentRound: 1,
  p1RoundsWon: 0,
  p2RoundsWon: 0,
  bannerText: null,
};

const DEFAULT_CONTROLS: VirtualControlsState = {
  left: false,
  right: false,
  jump: false,
  block: false,
  lightSeq: 0,
  heavySeq: 0,
  specialSeq: 0,
};

export const useGameStore = create<GameState>((set) => ({
  mode: "ai",
  difficulty: "medium",
  roomCode: null,
  role: null,
  playerFighterId: "kai",
  opponentFighterId: "nova",
  opponentName: "IA Nova",
  lastResult: null,
  hud: { ...DEFAULT_HUD },
  virtualControls: { ...DEFAULT_CONTROLS },

  setMatchConfig: (config) =>
    set({
      mode: config.mode,
      difficulty: config.difficulty ?? "medium",
      roomCode: config.roomCode ?? null,
      role: config.role ?? null,
      playerFighterId: config.playerFighterId,
      opponentFighterId: config.opponentFighterId,
      opponentName: config.opponentName,
      lastResult: null,
      hud: { ...DEFAULT_HUD },
      virtualControls: { ...DEFAULT_CONTROLS },
    }),

  setHud: (partial) =>
    set((state) => ({
      hud: { ...state.hud, ...partial },
    })),

  setLastResult: (lastResult) => set({ lastResult }),

  setVirtualButton: (key, pressed) =>
    set((state) => ({
      virtualControls: {
        ...state.virtualControls,
        [key]: pressed,
      },
    })),

  triggerVirtualAttack: (type) =>
    set((state) => {
      const seqKey =
        type === "light"
          ? "lightSeq"
          : type === "heavy"
            ? "heavySeq"
            : "specialSeq";
      return {
        virtualControls: {
          ...state.virtualControls,
          [seqKey]: state.virtualControls[seqKey] + 1,
        },
      };
    }),

  resetFightState: () =>
    set({
      lastResult: null,
      hud: { ...DEFAULT_HUD },
      virtualControls: { ...DEFAULT_CONTROLS },
    }),
}));
