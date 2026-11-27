import * as Phaser from "phaser";
import { ATTACK_DATA, isAttackAction } from "@/game/config";
import type { FighterEntity } from "@/game/characters/FighterEntity";
import {
  playBlock,
  playHeavyHit,
  playLightHit,
  playSpecialAttack,
  speakVoiceLine,
} from "@/lib/battleAudio";

export interface HitResolution {
  hitLanded: boolean;
  damage: number;
  blocked: boolean;
  knockout: boolean;
}

/**
 * Sistema encargado de evaluar impactos, mitigación por bloqueo y efectos visuales.
 */
export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private lastVoiceTimestamp = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private triggerVoiceReaction(critical: boolean): void {
    const now = this.scene.time.now;
    if (!critical && now - this.lastVoiceTimestamp < 1200) {
      return;
    }
    this.lastVoiceTimestamp = now;
    speakVoiceLine(undefined, { critical });
  }

  /**
   * Evalúa si el atacante golpea al defensor en el frame actual.
   */
  public resolveAttack(
    attacker: FighterEntity,
    defender: FighterEntity
  ): HitResolution | null {
    if (!isAttackAction(attacker.action)) return null;
    if (attacker.hasDealtHitThisAction) return null;
    if (defender.action === "ko" || defender.invulnRemaining > 0) return null;

    const frame = ATTACK_DATA[attacker.action];
    if (
      attacker.actionElapsed < frame.activeStart ||
      attacker.actionElapsed > frame.activeEnd
    ) {
      return null;
    }

    const dx = defender.x - attacker.x;
    const dy = Math.abs(defender.y - attacker.y);
    const inFront = dx * attacker.facing >= -18;
    const distance = Math.abs(dx);

    if (!inFront || distance > frame.range || dy > 95) {
      return null;
    }

    attacker.hasDealtHitThisAction = true;

    const isBlocking =
      defender.action === "block" && defender.facing !== attacker.facing;

    const rawDamage =
      attacker.getBasePower() *
      frame.damageMultiplier *
      defender.getDefenseFactor();

    const finalDamage = Math.max(
      1,
      Math.round(isBlocking ? rawDamage * 0.25 : rawDamage)
    );

    defender.hp = Math.max(0, defender.hp - finalDamage);
    attacker.energy = Math.min(
      100,
      attacker.energy + frame.energyGain * attacker.getEnergyGainMultiplier()
    );
    defender.energy = Math.min(100, defender.energy + (isBlocking ? 10 : 7));

    const kbDir = attacker.facing;
    defender.vx = kbDir * (isBlocking ? frame.knockbackX * 0.4 : frame.knockbackX);

    if (!isBlocking) {
      defender.vy = frame.knockbackY;
      defender.stunRemaining = frame.hitstun;
      defender.setAction(defender.hp <= 0 ? "ko" : "hit");
      defender.triggerHitFlash();
      attacker.comboHits += 1;
      attacker.comboResetTimer = 1750;
    } else {
      defender.stunRemaining = 90;
    }

    if (defender.hp <= 0) {
      defender.setAction("ko");
    }

    const attackType = attacker.action;
    if (isBlocking) {
      playBlock();
    } else if (attackType === "light") {
      playLightHit();
      if (attacker.comboHits >= 3 || defender.hp <= 0) {
        this.triggerVoiceReaction(defender.hp <= 0);
      }
    } else if (attackType === "heavy") {
      playHeavyHit();
      this.triggerVoiceReaction(defender.hp <= 0);
    } else if (attackType === "special") {
      playHeavyHit();
      this.triggerVoiceReaction(true);
    }

    this.spawnHitEffects(
      (attacker.x + defender.x) / 2,
      defender.y - 62,
      attacker.fighter.themeColor,
      finalDamage,
      isBlocking,
      attacker.action === "special"
    );

    return {
      hitLanded: true,
      damage: finalDamage,
      blocked: isBlocking,
      knockout: defender.hp <= 0,
    };
  }

  /**
   * Genera efectos visuales y sonoros propios de la habilidad especial de cada personaje.
   */
  public spawnSpecialVisual(caster: FighterEntity): void {
    playSpecialAttack();
    const color = Phaser.Display.Color.HexStringToColor(
      caster.fighter.themeColor
    ).color;
    const x = caster.x + caster.facing * 48;
    const y = caster.y - 56;

    // Impulso hacia adelante para ataques tipo embestida
    if (
      caster.fighter.id === "kai" ||
      caster.fighter.id === "blaze" ||
      caster.fighter.id === "lyra"
    ) {
      caster.vx = caster.facing * (caster.fighter.id === "lyra" ? 560 : 470);
    }

    const ring = this.scene.add.circle(x, y, 16, color, 0.35);
    ring.setStrokeStyle(3, color, 0.95);
    ring.setDepth(15);

    this.scene.tweens.add({
      targets: ring,
      scaleX: caster.fighter.id === "echo" || caster.fighter.id === "rex" ? 5 : 3.4,
      scaleY: caster.fighter.id === "rex" ? 1.8 : 3.4,
      alpha: 0,
      x: x + caster.facing * 95,
      duration: 380,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const label = this.scene.add
      .text(caster.x, caster.y - 135, caster.fighter.specialName.toUpperCase(), {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: caster.fighter.themeColor,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.scene.tweens.add({
      targets: label,
      y: label.y - 26,
      alpha: 0,
      duration: 650,
      onComplete: () => label.destroy(),
    });
  }

  private spawnHitEffects(
    x: number,
    y: number,
    hexColor: string,
    damage: number,
    blocked: boolean,
    isSpecial: boolean
  ): void {
    const color = blocked
      ? 0x94a3b8
      : Phaser.Display.Color.HexStringToColor(hexColor).color;

    if (!blocked) {
      this.scene.cameras.main.shake(isSpecial ? 220 : 100, isSpecial ? 0.012 : 0.005);
    }

    // Destello de impacto
    const spark = this.scene.add.circle(x, y, isSpecial ? 28 : 16, color, 0.8);
    spark.setDepth(18);
    this.scene.tweens.add({
      targets: spark,
      scale: isSpecial ? 2.4 : 1.7,
      alpha: 0,
      duration: 190,
      onComplete: () => spark.destroy(),
    });

    // Texto flotante de daño
    const txt = this.scene.add
      .text(
        x + Phaser.Math.Between(-12, 12),
        y - 24,
        blocked ? `BLOQ -${damage}` : `-${damage}`,
        {
          fontFamily: "monospace",
          fontSize: isSpecial ? "22px" : "17px",
          fontStyle: "bold",
          color: blocked ? "#CBD5E1" : "#FFFFFF",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setDepth(22);

    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 38,
      alpha: 0,
      duration: 520,
      ease: "Quad.easeOut",
      onComplete: () => txt.destroy(),
    });
  }
}
