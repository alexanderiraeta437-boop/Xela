import * as Phaser from "phaser";
import type { CombatAction, Fighter } from "@/types";
import {
  computeFighterArtifactBonuses,
  type ComputedArtifactBonuses,
} from "@/constants/artifacts";
import { GROUND_Y, STAGE_LEFT, STAGE_RIGHT } from "@/game/config";

/**
 * Representación visual y física de un luchador en Phaser 3.
 */
export class FighterEntity {
  public readonly fighter: Fighter;
  public readonly isPlayerOne: boolean;
  public readonly container: Phaser.GameObjects.Container;

  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly bodyGroup: Phaser.GameObjects.Container;
  private readonly leftLeg: Phaser.GameObjects.Rectangle;
  private readonly rightLeg: Phaser.GameObjects.Rectangle;
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly chestAccent: Phaser.GameObjects.Triangle;
  private readonly head: Phaser.GameObjects.Rectangle;
  private readonly visor: Phaser.GameObjects.Rectangle;
  private readonly frontArm: Phaser.GameObjects.Container;
  private readonly backArm: Phaser.GameObjects.Container;
  private readonly shieldBubble: Phaser.GameObjects.Arc;
  private readonly auraRing: Phaser.GameObjects.Arc;

  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1;

  public hp: number;
  public maxHp: number;
  public energy = 25;
  public action: CombatAction = "idle";
  public actionElapsed = 0;
  public actionSeq = 0;
  public hitSeq = 0;
  public stunRemaining = 0;
  public invulnRemaining = 0;
  public hasDealtHitThisAction = false;
  public comboHits = 0;
  public comboResetTimer = 0;
  public lastActionUsed: CombatAction = "idle";

  private readonly accentHex: number;
  private flashTimer = 0;
  public equippedArtifactIds: string[] = [];
  private artifactBonuses: ComputedArtifactBonuses;

  constructor(
    scene: Phaser.Scene,
    fighter: Fighter,
    x: number,
    isPlayerOne: boolean,
    equippedArtifactIds: string[] = []
  ) {
    this.fighter = fighter;
    this.isPlayerOne = isPlayerOne;
    this.x = x;
    this.y = GROUND_Y;
    this.facing = isPlayerOne ? 1 : -1;
    this.equippedArtifactIds = [...equippedArtifactIds];
    this.artifactBonuses = computeFighterArtifactBonuses(
      fighter.id,
      this.equippedArtifactIds
    );

    // Escala de HP basada en stats del personaje (ej. 85..140 -> 170..280 HP en combate)
    this.maxHp = fighter.stats.hp * 2;
    this.hp = this.maxHp;
    this.accentHex = Phaser.Display.Color.HexStringToColor(
      fighter.themeColor
    ).color;

    this.container = scene.add.container(this.x, this.y);
    this.container.setDepth(10);

    // Sombra en el suelo
    this.shadow = scene.add.ellipse(0, 4, 68, 16, 0x000000, 0.55);
    this.container.add(this.shadow);

    // Aura de energía especial
    this.auraRing = scene.add.circle(0, -56, 48, this.accentHex, 0.08);
    this.auraRing.setStrokeStyle(2, this.accentHex, 0.35);
    this.auraRing.setVisible(false);
    this.container.add(this.auraRing);

    // Cuerpo articulado
    this.bodyGroup = scene.add.container(0, 0);
    this.container.add(this.bodyGroup);

    const isHeavyBody = fighter.id === "rex";
    const torsoW = isHeavyBody ? 42 : 34;
    const torsoH = isHeavyBody ? 52 : 46;

    // Piernas
    this.leftLeg = scene.add
      .rectangle(-9, -22, 13, 38, 0x13131d)
      .setStrokeStyle(2, this.accentHex, 0.75);
    this.rightLeg = scene.add
      .rectangle(9, -22, 13, 38, 0x13131d)
      .setStrokeStyle(2, this.accentHex, 0.75);

    // Brazo trasero
    this.backArm = scene.add.container(-14, -64);
    const backLimb = scene.add
      .rectangle(8, 0, 22, 11, 0x1b1b28)
      .setStrokeStyle(2, this.accentHex, 0.7);
    const backFist = scene.add
      .circle(20, 0, 7, this.accentHex)
      .setStrokeStyle(2, 0x050507);
    this.backArm.add([backLimb, backFist]);

    // Torso
    this.torso = scene.add
      .rectangle(0, -56, torsoW, torsoH, 0x181824)
      .setStrokeStyle(2.5, this.accentHex, 0.95);
    this.chestAccent = scene.add.triangle(
      0,
      -58,
      -10,
      -10,
      10,
      -10,
      0,
      8,
      this.accentHex,
      0.9
    );

    // Cabeza + detalle único
    this.head = scene.add
      .rectangle(0, -96, 28, 28, 0x1f1f2d)
      .setStrokeStyle(2, 0xffffff, 0.35);
    this.visor = scene.add.rectangle(6, -97, 15, 7, this.accentHex, 0.95);

    const crest = this.buildHeadCrest(scene);

    // Brazo delantero
    this.frontArm = scene.add.container(10, -60);
    const frontLimb = scene.add
      .rectangle(10, 0, 24, 12, 0x202030)
      .setStrokeStyle(2, this.accentHex, 0.9);
    const frontFist = scene.add
      .circle(23, 0, 8, this.accentHex)
      .setStrokeStyle(2, 0x050507);
    this.frontArm.add([frontLimb, frontFist]);

    // Escudo de bloqueo
    this.shieldBubble = scene.add.circle(24, -56, 36, this.accentHex, 0.22);
    this.shieldBubble.setStrokeStyle(3, this.accentHex, 0.85);
    this.shieldBubble.setVisible(false);

    this.bodyGroup.add([
      this.backArm,
      this.leftLeg,
      this.rightLeg,
      this.torso,
      this.chestAccent,
      this.head,
      this.visor,
      ...crest,
      this.frontArm,
      this.shieldBubble,
    ]);

    this.applyFacing();
  }

  private buildHeadCrest(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
    switch (this.fighter.id) {
      case "kai":
        return [
          scene.add.triangle(
            -2,
            -115,
            -14,
            8,
            0,
            -10,
            14,
            8,
            this.accentHex,
            0.95
          ),
        ];
      case "nova":
        return [
          scene.add.rectangle(0, -112, 32, 6, this.accentHex, 0.9),
        ];
      case "rex":
        return [
          scene.add.rectangle(0, -114, 10, 12, this.accentHex, 1),
        ];
      case "lyra":
        return [
          scene.add.triangle(
            -16,
            -98,
            0,
            -6,
            -18,
            8,
            0,
            6,
            this.accentHex,
            0.9
          ),
        ];
      case "blaze":
        return [
          scene.add.triangle(0, -116, -12, 10, 0, -14, 12, 10, 0xff5500, 1),
        ];
      case "echo":
        return [
          scene.add
            .circle(0, -96, 20, this.accentHex, 0.12)
            .setStrokeStyle(2, this.accentHex, 0.8),
        ];
      case "vex":
        return [
          scene.add.rectangle(-8, -114, 8, 8, this.accentHex, 1),
          scene.add.rectangle(8, -114, 8, 8, 0x38bdf8, 1),
        ];
      case "aether":
        return [
          scene.add
            .ellipse(0, -122, 28, 7, 0xffffff, 0)
            .setStrokeStyle(2.5, 0xe0e7ff, 0.95),
        ];
      default:
        return [];
    }
  }

  public get isGrounded(): boolean {
    return this.y >= GROUND_Y - 0.5;
  }

  public applyEquippedArtifacts(ids: string[]): void {
    this.equippedArtifactIds = [...ids];
    this.artifactBonuses = computeFighterArtifactBonuses(
      this.fighter.id,
      this.equippedArtifactIds
    );
  }

  public getMoveSpeed(): number {
    // 55..100 -> ~240..390 px/s, potenciado por artefactos de velocidad
    return (155 + this.fighter.stats.speed * 2.35) * this.artifactBonuses.speedMult;
  }

  public getBasePower(): number {
    // 70..100 -> ~14..22 daño base en ataque ligero, potenciado por artefactos de daño
    return (7 + this.fighter.stats.power * 0.15) * this.artifactBonuses.damageMult;
  }

  public getDefenseFactor(): number {
    // 55..95 -> reducción de daño del 8% al 30%, más bonificación de artefactos de defensa
    const baseMitigation = (this.fighter.stats.defense * 0.3) / 100;
    const totalMitigation = Math.min(0.55, baseMitigation + this.artifactBonuses.defenseBonus);
    return 1 - totalMitigation;
  }

  public getEnergyGainMultiplier(): number {
    return this.artifactBonuses.energyGainMult;
  }

  /**
   * Reinicia vida, energía, posición y estado del luchador para iniciar un nuevo round.
   */
  public resetForRound(startX: number, facing: 1 | -1): void {
    this.x = startX;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.energy = 25;
    this.action = "idle";
    this.actionElapsed = 0;
    this.actionSeq += 1;
    this.stunRemaining = 0;
    this.invulnRemaining = 0;
    this.hasDealtHitThisAction = false;
    this.comboHits = 0;
    this.comboResetTimer = 0;
    this.flashTimer = 0;
    this.torso.setFillStyle(0x181824);
    this.head.setFillStyle(0x1f1f2d);
    this.applyFacing();
  }

  public setAction(next: CombatAction): void {
    if (this.action === "ko") return;
    if (this.action !== next || next === "light" || next === "heavy" || next === "special") {
      this.action = next;
      this.actionElapsed = 0;
      this.hasDealtHitThisAction = false;
      this.actionSeq += 1;
      this.lastActionUsed = next;
    }
  }

  public triggerHitFlash(): void {
    this.flashTimer = 130;
    this.torso.setFillStyle(0xffffff);
    this.head.setFillStyle(0xffffff);
  }

  public applyFacing(): void {
    this.bodyGroup.setScale(this.facing, 1);
  }

  public clampToArena(): void {
    if (this.x < STAGE_LEFT) {
      this.x = STAGE_LEFT;
      if (this.vx < 0) this.vx = 0;
    } else if (this.x > STAGE_RIGHT) {
      this.x = STAGE_RIGHT;
      if (this.vx > 0) this.vx = 0;
    }
    if (this.y > GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
    }
  }

  public updateVisuals(deltaMs: number, timeMs: number): void {
    this.container.setPosition(this.x, this.y);
    this.applyFacing();

    // Escala de sombra según altura del salto
    const heightRatio = Phaser.Math.Clamp(
      1 - (GROUND_Y - this.y) / 220,
      0.35,
      1
    );
    this.shadow.setScale(heightRatio, heightRatio);
    this.shadow.setPosition(0, GROUND_Y - this.y + 4);

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaMs;
      if (this.flashTimer <= 0) {
        this.torso.setFillStyle(0x181824);
        this.head.setFillStyle(0x1f1f2d);
      }
    }

    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= deltaMs;
      if (this.comboResetTimer <= 0) {
        this.comboHits = 0;
      }
    }

    this.shieldBubble.setVisible(this.action === "block");
    this.auraRing.setVisible(this.energy >= 50 && this.action !== "ko");
    if (this.auraRing.visible) {
      const pulse = 1 + Math.sin(timeMs * 0.008) * 0.08;
      this.auraRing.setScale(pulse);
    }

    // Reset pose base
    this.bodyGroup.setAngle(0);
    this.bodyGroup.setPosition(0, 0);
    this.leftLeg.setAngle(0);
    this.rightLeg.setAngle(0);
    this.frontArm.setPosition(10, -60);
    this.frontArm.setAngle(0);
    this.backArm.setPosition(-14, -64);
    this.backArm.setAngle(0);

    switch (this.action) {
      case "idle": {
        const bob = Math.sin(timeMs * 0.006) * 2.5;
        this.bodyGroup.y = bob;
        this.frontArm.setAngle(-12 + Math.sin(timeMs * 0.006) * 6);
        this.backArm.setAngle(10);
        break;
      }
      case "walk": {
        const stride = Math.sin(timeMs * 0.018);
        this.leftLeg.setAngle(stride * 22);
        this.rightLeg.setAngle(-stride * 22);
        this.bodyGroup.y = Math.abs(stride) * -3;
        this.frontArm.setAngle(-stride * 18);
        this.backArm.setAngle(stride * 18);
        break;
      }
      case "jump": {
        this.leftLeg.setAngle(18);
        this.rightLeg.setAngle(-22);
        this.frontArm.setAngle(-35);
        this.backArm.setAngle(30);
        break;
      }
      case "block": {
        this.bodyGroup.y = 4;
        this.frontArm.setPosition(16, -66);
        this.frontArm.setAngle(-55);
        this.backArm.setPosition(4, -64);
        this.backArm.setAngle(-45);
        break;
      }
      case "light": {
        const t = Math.min(1, this.actionElapsed / 270);
        const extend = Math.sin(t * Math.PI);
        this.frontArm.setPosition(12 + extend * 26, -64);
        this.frontArm.setAngle(-5);
        this.bodyGroup.setAngle(extend * 7);
        break;
      }
      case "heavy": {
        const t = Math.min(1, this.actionElapsed / 460);
        const swing = Math.sin(t * Math.PI);
        this.bodyGroup.setAngle(swing * 15);
        this.rightLeg.setAngle(-swing * 68);
        this.frontArm.setPosition(10 + swing * 22, -68);
        this.frontArm.setAngle(-swing * 35);
        break;
      }
      case "special": {
        const t = Math.min(1, this.actionElapsed / 620);
        const surge = Math.sin(t * Math.PI);
        this.bodyGroup.setAngle(surge * 18);
        this.frontArm.setPosition(14 + surge * 34, -62);
        this.backArm.setPosition(-10 + surge * 18, -62);
        this.auraRing.setVisible(true);
        this.auraRing.setScale(1.25 + surge * 0.45);
        break;
      }
      case "hit": {
        this.bodyGroup.setAngle(-18);
        this.bodyGroup.x = -4;
        break;
      }
      case "ko": {
        this.bodyGroup.setAngle(-88);
        this.bodyGroup.setPosition(-18, -14);
        break;
      }
    }
  }
}
