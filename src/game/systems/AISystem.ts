import type { AIDifficulty } from "@/types";
import type { FighterEntity } from "@/game/characters/FighterEntity";
import { SPECIAL_ENERGY_COST, isAttackAction } from "@/game/config";

export interface AIDecision {
  moveDir: -1 | 0 | 1;
  jump: boolean;
  block: boolean;
  attack: "light" | "heavy" | "special" | null;
}

const DIFFICULTY_TUNING: Record<
  AIDifficulty,
  {
    reactionMs: number;
    blockChance: number;
    aggression: number;
    specialChance: number;
  }
> = {
  easy: {
    reactionMs: 520,
    blockChance: 0.16,
    aggression: 0.45,
    specialChance: 0.15,
  },
  medium: {
    reactionMs: 260,
    blockChance: 0.48,
    aggression: 0.72,
    specialChance: 0.45,
  },
  hard: {
    reactionMs: 130,
    blockChance: 0.78,
    aggression: 0.92,
    specialChance: 0.75,
  },
};

/**
 * Controlador de Inteligencia Artificial con 3 niveles de dificultad.
 */
export class AISystem {
  private readonly difficulty: AIDifficulty;
  private cooldown = 0;
  private currentDecision: AIDecision = {
    moveDir: 0,
    jump: false,
    block: false,
    attack: null,
  };

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
  }

  public update(
    deltaMs: number,
    ai: FighterEntity,
    player: FighterEntity
  ): AIDecision {
    this.cooldown -= deltaMs;
    if (this.cooldown > 0) {
      return { ...this.currentDecision, jump: false, attack: null };
    }

    const tuning = DIFFICULTY_TUNING[this.difficulty];
    this.cooldown = tuning.reactionMs + Math.random() * 90;

    const dx = player.x - ai.x;
    const dist = Math.abs(dx);
    const dirToPlayer: -1 | 1 = dx >= 0 ? 1 : -1;

    let moveDir: -1 | 0 | 1 = 0;
    let jump = false;
    let block = false;
    let attack: "light" | "heavy" | "special" | null = null;

    // Reacción defensiva si el jugador está atacando cerca
    if (isAttackAction(player.action) && dist < 135) {
      if (Math.random() < tuning.blockChance) {
        block = true;
      } else if (this.difficulty === "hard" && Math.random() < 0.3) {
        jump = true;
      }
    }

    if (!block) {
      // Habilidad especial a media/corta distancia
      if (
        ai.energy >= SPECIAL_ENERGY_COST &&
        dist < 185 &&
        Math.random() < tuning.specialChance
      ) {
        attack = "special";
      } else if (dist <= 95 && Math.random() < tuning.aggression) {
        attack = Math.random() < 0.62 ? "light" : "heavy";
      } else if (dist <= 115 && Math.random() < tuning.aggression * 0.7) {
        attack = "heavy";
      } else if (dist > 82) {
        moveDir = Math.random() < tuning.aggression ? dirToPlayer : 0;
        if (this.difficulty !== "easy" && dist > 260 && Math.random() < 0.14) {
          jump = true;
        }
      } else if (dist < 46 && Math.random() < 0.3) {
        // Retrocede un poco para tomar distancia
        moveDir = (dirToPlayer * -1) as -1 | 1;
      }
    }

    this.currentDecision = { moveDir, jump, block, attack };
    return this.currentDecision;
  }
}
