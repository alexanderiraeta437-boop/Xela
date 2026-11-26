import type { Unsubscribe } from "firebase/database";
import { pushCombatState, subscribeOpponentCombat } from "@/lib/rtdb";
import type { PlayerCombatSync } from "@/types";
import type { FighterEntity } from "@/game/characters/FighterEntity";

/**
 * Sincroniza posiciones, acciones e impactos en tiempo real con Firebase Realtime Database.
 */
export class MultiplayerSyncSystem {
  private readonly roomCode: string;
  private readonly localRole: "host" | "guest";
  private readonly opponentRole: "host" | "guest";

  private unsubscribe: Unsubscribe | null = null;
  private pushTimer = 0;
  private lastPushedActionSeq = -1;
  private latestRemote: PlayerCombatSync | null = null;
  private lastAppliedRemoteActionSeq = -1;

  constructor(roomCode: string, localRole: "host" | "guest") {
    this.roomCode = roomCode;
    this.localRole = localRole;
    this.opponentRole = localRole === "host" ? "guest" : "host";
  }

  public start(onRemoteUpdate: (state: PlayerCombatSync) => void): void {
    this.unsubscribe = subscribeOpponentCombat(
      this.roomCode,
      this.opponentRole,
      (remote) => {
        if (!remote) return;
        this.latestRemote = remote;
        onRemoteUpdate(remote);
      }
    );
  }

  public pushLocal(deltaMs: number, local: FighterEntity): void {
    this.pushTimer += deltaMs;
    const actionChanged = local.actionSeq !== this.lastPushedActionSeq;
    if (!actionChanged && this.pushTimer < 55) return;

    this.pushTimer = 0;
    this.lastPushedActionSeq = local.actionSeq;

    const payload: PlayerCombatSync = {
      x: Math.round(local.x),
      y: Math.round(local.y),
      vx: Math.round(local.vx),
      vy: Math.round(local.vy),
      hp: Math.round(local.hp),
      maxHp: Math.round(local.maxHp),
      energy: Math.round(local.energy),
      facing: local.facing,
      action: local.action,
      actionSeq: local.actionSeq,
      hitSeq: local.hitSeq,
      updatedAt: Date.now(),
    };

    void pushCombatState(this.roomCode, this.localRole, payload);
  }

  /**
   * Aplica suavemente el estado del rival sobre su entidad en Phaser.
   */
  public applyRemoteToOpponent(opponent: FighterEntity): {
    triggeredSpecial: boolean;
  } {
    const remote = this.latestRemote;
    if (!remote) return { triggeredSpecial: false };

    // Interpolación suave de posición para evitar saltos bruscos por latencia
    opponent.x += (remote.x - opponent.x) * 0.45;
    opponent.y += (remote.y - opponent.y) * 0.45;
    opponent.facing = remote.facing;
    opponent.energy = remote.energy;

    let triggeredSpecial = false;
    if (remote.actionSeq !== this.lastAppliedRemoteActionSeq) {
      this.lastAppliedRemoteActionSeq = remote.actionSeq;
      opponent.setAction(remote.action);
      if (remote.action === "special") {
        triggeredSpecial = true;
      }
    }

    return { triggeredSpecial };
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
