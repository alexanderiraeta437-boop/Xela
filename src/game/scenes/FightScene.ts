import * as Phaser from "phaser";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ATTACK_DATA,
  GRAVITY,
  GROUND_Y,
  ROUND_DURATION_SECONDS,
  SPECIAL_ENERGY_COST,
  isAttackAction,
  type MatchRuntimeConfig,
} from "@/game/config";
import { getCharacterById } from "@/constants/characters";
import { FighterEntity } from "@/game/characters/FighterEntity";
import { CombatSystem } from "@/game/systems/CombatSystem";
import { AISystem } from "@/game/systems/AISystem";
import { MultiplayerSyncSystem } from "@/game/systems/MultiplayerSyncSystem";
import { finishRoom } from "@/lib/rtdb";

/**
 * Escena principal de combate 2D side-view 1 vs 1.
 */
export class FightScene extends Phaser.Scene {
  private runtimeConfig!: MatchRuntimeConfig;
  private localFighter!: FighterEntity;
  private opponentFighter!: FighterEntity;
  private combatSystem!: CombatSystem;
  private aiSystem: AISystem | null = null;
  private mpSync: MultiplayerSyncSystem | null = null;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    j: Phaser.Input.Keyboard.Key;
    k: Phaser.Input.Keyboard.Key;
    l: Phaser.Input.Keyboard.Key;
    z: Phaser.Input.Keyboard.Key;
    x: Phaser.Input.Keyboard.Key;
    c: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
  };

  private lastVirtualLightSeq = 0;
  private lastVirtualHeavySeq = 0;
  private lastVirtualSpecialSeq = 0;

  private roundTimer = ROUND_DURATION_SECONDS;
  private secondAccumulator = 0;
  private matchElapsedSeconds = 0;
  private hudSyncAccumulator = 0;
  private matchEnded = false;

  constructor() {
    super({ key: "FightScene" });
  }

  public init(data: { config: MatchRuntimeConfig }): void {
    this.runtimeConfig = data.config;
    this.roundTimer = ROUND_DURATION_SECONDS;
    this.secondAccumulator = 0;
    this.matchElapsedSeconds = 0;
    this.hudSyncAccumulator = 0;
    this.matchEnded = false;

    const initialControls = this.runtimeConfig.getVirtualControls();
    this.lastVirtualLightSeq = initialControls.lightSeq;
    this.lastVirtualHeavySeq = initialControls.heavySeq;
    this.lastVirtualSpecialSeq = initialControls.specialSeq;
  }

  public create(): void {
    this.drawArenaBackground();
    this.setupInputs();

    const isGuest =
      this.runtimeConfig.mode === "multiplayer" &&
      this.runtimeConfig.role === "guest";

    const playerChar = getCharacterById(this.runtimeConfig.playerFighterId);
    const opponentChar = getCharacterById(this.runtimeConfig.opponentFighterId);

    const localStartX = isGuest ? 710 : 250;
    const oppStartX = isGuest ? 250 : 710;

    this.localFighter = new FighterEntity(
      this,
      playerChar,
      localStartX,
      !isGuest
    );
    this.opponentFighter = new FighterEntity(
      this,
      opponentChar,
      oppStartX,
      isGuest
    );

    this.combatSystem = new CombatSystem(this);

    if (this.runtimeConfig.mode === "ai") {
      this.aiSystem = new AISystem(this.runtimeConfig.difficulty);
    } else if (this.runtimeConfig.roomCode && this.runtimeConfig.role) {
      this.mpSync = new MultiplayerSyncSystem(
        this.runtimeConfig.roomCode,
        this.runtimeConfig.role
      );
      this.mpSync.start((remoteState) => {
        // Sincronizar HP cuando el rival recibe o reporta estado
        if (remoteState.hp < this.opponentFighter.hp) {
          this.opponentFighter.hp = remoteState.hp;
        }
        if (remoteState.hp <= 0 && !this.matchEnded) {
          this.concludeMatch(true, "K.O.");
        }
      });
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.mpSync?.destroy();
    });

    this.syncHud();
  }

  private drawArenaBackground(): void {
    this.cameras.main.setBackgroundColor("#06060B");

    // Cielo degradado simulado con bandas sutiles
    this.add.rectangle(ARENA_WIDTH / 2, 160, ARENA_WIDTH, 320, 0x090a12);
    this.add.rectangle(ARENA_WIDTH / 2, 380, ARENA_WIDTH, 160, 0x0d101d);

    // Edificios estilizados en el fondo
    const buildings = [
      { x: 75, w: 80, h: 210 },
      { x: 185, w: 96, h: 265 },
      { x: 315, w: 70, h: 185 },
      { x: 465, w: 110, h: 240 },
      { x: 645, w: 88, h: 205 },
      { x: 775, w: 105, h: 270 },
      { x: 895, w: 76, h: 215 },
    ];
    for (const b of buildings) {
      this.add
        .rectangle(b.x, GROUND_Y - b.h / 2, b.w, b.h, 0x0a0c15)
        .setStrokeStyle(1, 0x1c2235, 0.7);
    }

    // Marca de agua del logo Xela en el centro de la arena
    if (this.textures.exists("xela-logo")) {
      this.add
        .image(ARENA_WIDTH / 2, GROUND_Y - 125, "xela-logo")
        .setScale(1.35)
        .setAlpha(0.05);
    }

    // Suelo de combate
    this.add.rectangle(
      ARENA_WIDTH / 2,
      GROUND_Y + (ARENA_HEIGHT - GROUND_Y) / 2,
      ARENA_WIDTH,
      ARENA_HEIGHT - GROUND_Y,
      0x07080d
    );
    this.add.line(0, 0, 0, GROUND_Y, ARENA_WIDTH, GROUND_Y, 0x00f0ff, 0.45).setOrigin(0, 0);

    // Líneas de perspectiva en el suelo
    for (let i = 1; i < 8; i++) {
      const topX = i * 120;
      const botX = 480 + (topX - 480) * 1.45;
      this.add
        .line(0, 0, topX, GROUND_Y, botX, ARENA_HEIGHT, 0x1e293b, 0.45)
        .setOrigin(0, 0);
    }
  }

  private setupInputs(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      j: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      k: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      l: kb.addKey(Phaser.Input.Keyboard.KeyCodes.L),
      z: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      x: kb.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      c: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      shift: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
    };
  }

  public update(time: number, delta: number): void {
    if (this.matchEnded) {
      this.localFighter.updateVisuals(delta, time);
      this.opponentFighter.updateVisuals(delta, time);
      return;
    }

    const dtSec = Math.min(delta, 40) / 1000;

    // Temporizador de ronda
    this.secondAccumulator += delta;
    if (this.secondAccumulator >= 1000) {
      this.secondAccumulator -= 1000;
      this.roundTimer = Math.max(0, this.roundTimer - 1);
      this.matchElapsedSeconds += 1;
      if (this.roundTimer <= 0) {
        this.resolveTimeOver();
        return;
      }
    }

    // Regeneración pasiva leve de energía
    this.localFighter.energy = Math.min(100, this.localFighter.energy + dtSec * 3.5);
    this.opponentFighter.energy = Math.min(100, this.opponentFighter.energy + dtSec * 3.5);

    // 1. Procesar entrada del jugador local
    this.updateLocalPlayer(delta);

    // 2. Procesar IA o sincronización multijugador del rival
    if (this.runtimeConfig.mode === "ai" && this.aiSystem) {
      this.updateAIPlayer(delta);
    } else if (this.mpSync) {
      const { triggeredSpecial } = this.mpSync.applyRemoteToOpponent(
        this.opponentFighter
      );
      if (triggeredSpecial) {
        this.combatSystem.spawnSpecialVisual(this.opponentFighter);
      }
      this.opponentFighter.actionElapsed += delta;
      if (isAttackAction(this.opponentFighter.action)) {
        const hit = this.combatSystem.resolveAttack(
          this.opponentFighter,
          this.localFighter
        );
        if (hit?.knockout) {
          this.concludeMatch(false, "K.O.");
          return;
        }
      }
    }

    // 3. Física para luchador local (y para IA)
    this.stepPhysics(this.localFighter, dtSec, delta);
    if (this.runtimeConfig.mode === "ai") {
      this.stepPhysics(this.opponentFighter, dtSec, delta);
    }

    // Separación suave si los luchadores quedan superpuestos en el suelo
    this.resolveBodyOverlap();

    // 4. Evaluar ataque del jugador local contra el oponente
    if (isAttackAction(this.localFighter.action)) {
      const hit = this.combatSystem.resolveAttack(
        this.localFighter,
        this.opponentFighter
      );
      if (hit?.knockout) {
        this.concludeMatch(true, "K.O.");
        return;
      }
    }

    // 5. Evaluar ataque de la IA contra el jugador local
    if (
      this.runtimeConfig.mode === "ai" &&
      isAttackAction(this.opponentFighter.action)
    ) {
      const hit = this.combatSystem.resolveAttack(
        this.opponentFighter,
        this.localFighter
      );
      if (hit?.knockout) {
        this.concludeMatch(false, "K.O.");
        return;
      }
    }

    // 6. Enviar estado local en multijugador
    this.mpSync?.pushLocal(delta, this.localFighter);

    // 7. Actualizar renderizado y HUD
    this.localFighter.updateVisuals(delta, time);
    this.opponentFighter.updateVisuals(delta, time);

    this.hudSyncAccumulator += delta;
    if (this.hudSyncAccumulator >= 65) {
      this.hudSyncAccumulator = 0;
      this.syncHud();
    }
  }

  private updateLocalPlayer(deltaMs: number): void {
    const f = this.localFighter;
    if (f.action === "ko") return;

    if (f.stunRemaining > 0) {
      f.stunRemaining -= deltaMs;
      return;
    }

    // Mantener orientación hacia el oponente cuando está en reposo/movimiento
    if (!isAttackAction(f.action)) {
      f.facing = this.opponentFighter.x >= f.x ? 1 : -1;
    }

    const vc = this.runtimeConfig.getVirtualControls();
    const moveLeft = this.keys?.left.isDown || this.keys?.a.isDown || vc.left;
    const moveRight = this.keys?.right.isDown || this.keys?.d.isDown || vc.right;
    const jumpPressed =
      (this.keys &&
        (Phaser.Input.Keyboard.JustDown(this.keys.up) ||
          Phaser.Input.Keyboard.JustDown(this.keys.w))) ||
      vc.jump;
    const blockHeld =
      this.keys?.down.isDown ||
      this.keys?.s.isDown ||
      this.keys?.shift.isDown ||
      vc.block;

    const lightJust =
      (this.keys &&
        (Phaser.Input.Keyboard.JustDown(this.keys.j) ||
          Phaser.Input.Keyboard.JustDown(this.keys.z))) ||
      vc.lightSeq !== this.lastVirtualLightSeq;
    const heavyJust =
      (this.keys &&
        (Phaser.Input.Keyboard.JustDown(this.keys.k) ||
          Phaser.Input.Keyboard.JustDown(this.keys.x))) ||
      vc.heavySeq !== this.lastVirtualHeavySeq;
    const specialJust =
      (this.keys &&
        (Phaser.Input.Keyboard.JustDown(this.keys.l) ||
          Phaser.Input.Keyboard.JustDown(this.keys.c))) ||
      vc.specialSeq !== this.lastVirtualSpecialSeq;

    this.lastVirtualLightSeq = vc.lightSeq;
    this.lastVirtualHeavySeq = vc.heavySeq;
    this.lastVirtualSpecialSeq = vc.specialSeq;

    // Si está ejecutando un ataque, esperar a que termine su duración
    if (isAttackAction(f.action)) {
      return;
    }

    if (specialJust && f.energy >= SPECIAL_ENERGY_COST) {
      f.energy -= SPECIAL_ENERGY_COST;
      f.setAction("special");
      this.combatSystem.spawnSpecialVisual(f);
      return;
    }

    if (heavyJust) {
      f.setAction("heavy");
      f.vx = f.facing * 90;
      return;
    }

    if (lightJust) {
      f.setAction("light");
      f.vx = f.facing * 50;
      return;
    }

    if (blockHeld && f.isGrounded) {
      f.vx = 0;
      f.setAction("block");
      return;
    }

    const dir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
    f.vx = dir * f.getMoveSpeed();

    if (jumpPressed && f.isGrounded) {
      f.vy = -730;
      f.setAction("jump");
      return;
    }

    if (!f.isGrounded) {
      f.setAction("jump");
    } else if (dir !== 0) {
      f.setAction("walk");
    } else {
      f.setAction("idle");
    }
  }

  private updateAIPlayer(deltaMs: number): void {
    const ai = this.opponentFighter;
    if (ai.action === "ko") return;

    if (ai.stunRemaining > 0) {
      ai.stunRemaining -= deltaMs;
      return;
    }

    if (!isAttackAction(ai.action)) {
      ai.facing = this.localFighter.x >= ai.x ? 1 : -1;
    }

    const decision = this.aiSystem!.update(deltaMs, ai, this.localFighter);

    if (isAttackAction(ai.action)) return;

    if (decision.attack === "special" && ai.energy >= SPECIAL_ENERGY_COST) {
      ai.energy -= SPECIAL_ENERGY_COST;
      ai.setAction("special");
      this.combatSystem.spawnSpecialVisual(ai);
      return;
    }

    if (decision.attack === "heavy") {
      ai.setAction("heavy");
      ai.vx = ai.facing * 80;
      return;
    }

    if (decision.attack === "light") {
      ai.setAction("light");
      ai.vx = ai.facing * 45;
      return;
    }

    if (decision.block && ai.isGrounded) {
      ai.vx = 0;
      ai.setAction("block");
      return;
    }

    ai.vx = decision.moveDir * ai.getMoveSpeed();

    if (decision.jump && ai.isGrounded) {
      ai.vy = -710;
      ai.setAction("jump");
      return;
    }

    if (!ai.isGrounded) {
      ai.setAction("jump");
    } else if (decision.moveDir !== 0) {
      ai.setAction("walk");
    } else {
      ai.setAction("idle");
    }
  }

  private stepPhysics(
    f: FighterEntity,
    dtSec: number,
    deltaMs: number
  ): void {
    f.actionElapsed += deltaMs;

    if (isAttackAction(f.action)) {
      const frame = ATTACK_DATA[f.action];
      if (f.actionElapsed >= frame.duration) {
        f.setAction(f.isGrounded ? "idle" : "jump");
      }
    } else if (f.action === "hit" && f.stunRemaining <= 0) {
      f.setAction(f.isGrounded ? "idle" : "jump");
    }

    if (!f.isGrounded || f.vy < 0) {
      f.vy += GRAVITY * dtSec;
    }

    f.x += f.vx * dtSec;
    f.y += f.vy * dtSec;

    // Fricción horizontal cuando está en el suelo y en stun/ataque
    if (f.isGrounded && (f.stunRemaining > 0 || isAttackAction(f.action))) {
      f.vx *= 0.84;
    }

    f.clampToArena();
  }

  private resolveBodyOverlap(): void {
    const minDist = 42;
    const dx = this.opponentFighter.x - this.localFighter.x;
    const dy = Math.abs(this.opponentFighter.y - this.localFighter.y);
    if (Math.abs(dx) < minDist && dy < 70) {
      const push = (minDist - Math.abs(dx)) * 0.5;
      const sign = dx >= 0 ? 1 : -1;
      this.localFighter.x -= sign * push;
      if (this.runtimeConfig.mode === "ai") {
        this.opponentFighter.x += sign * push;
      }
      this.localFighter.clampToArena();
      this.opponentFighter.clampToArena();
    }
  }

  private resolveTimeOver(): void {
    const localPct = this.localFighter.hp / this.localFighter.maxHp;
    const oppPct = this.opponentFighter.hp / this.opponentFighter.maxHp;
    const won = localPct >= oppPct;
    this.concludeMatch(won, "TIEMPO AGOTADO");
  }

  private concludeMatch(won: boolean, banner: string): void {
    if (this.matchEnded) return;
    this.matchEnded = true;

    if (!won) {
      this.localFighter.setAction("ko");
    } else {
      this.opponentFighter.setAction("ko");
    }

    this.syncHud(banner);

    if (
      this.runtimeConfig.mode === "multiplayer" &&
      this.runtimeConfig.roomCode &&
      won
    ) {
      void finishRoom(
        this.runtimeConfig.roomCode,
        this.runtimeConfig.playerUid
      );
    }

    this.time.delayedCall(1200, () => {
      this.scene.start("ResultScene", {
        won,
        banner,
      });
      this.runtimeConfig.onMatchEnd({
        won,
        remainingHp: Math.round(this.localFighter.hp),
        durationSeconds: this.matchElapsedSeconds,
      });
    });
  }

  private syncHud(bannerText: string | null = null): void {
    const isGuest =
      this.runtimeConfig.mode === "multiplayer" &&
      this.runtimeConfig.role === "guest";

    const p1 = isGuest ? this.opponentFighter : this.localFighter;
    const p2 = isGuest ? this.localFighter : this.opponentFighter;

    this.runtimeConfig.onHudUpdate({
      p1Hp: Math.round(p1.hp),
      p1MaxHp: p1.maxHp,
      p1Energy: Math.round(p1.energy),
      p2Hp: Math.round(p2.hp),
      p2MaxHp: p2.maxHp,
      p2Energy: Math.round(p2.energy),
      timer: this.roundTimer,
      comboP1: p1.comboHits,
      comboP2: p2.comboHits,
      bannerText,
    });
  }
}
