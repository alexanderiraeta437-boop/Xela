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
import { finishRoom, subscribeRoom } from "@/lib/rtdb";
import {
  cleanupBattleAudio,
  playAttackSwing,
  playDefeatSound,
  playRoundBell,
  playVictoryFanfare,
  startBattleMusic,
  stopBattleMusic,
  stopDashboardMusic,
  unlockBattleAudio,
} from "@/lib/battleAudio";

/**
 * Escena principal de combate 2D side-view 1 vs 1 al mejor de 3 rounds (primero en ganar 2).
 */
export class FightScene extends Phaser.Scene {
  private runtimeConfig!: MatchRuntimeConfig;
  private localFighter!: FighterEntity;
  private opponentFighter!: FighterEntity;
  private combatSystem!: CombatSystem;
  private aiSystem: AISystem | null = null;
  private mpSync: MultiplayerSyncSystem | null = null;
  private unsubscribeRoomSync: (() => void) | null = null;

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

  private localStartX = 250;
  private oppStartX = 710;
  private isGuest = false;

  private currentRound = 1;
  private localRoundsWon = 0;
  private opponentRoundsWon = 0;
  private roundTransitioning = false;

  private roundTimer = ROUND_DURATION_SECONDS;
  private secondAccumulator = 0;
  private matchElapsedSeconds = 0;
  private hudSyncAccumulator = 0;
  private matchEnded = false;

  private announcementText: Phaser.GameObjects.Text | null = null;
  private announcementSubText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: "FightScene" });
  }

  public init(data: { config: MatchRuntimeConfig }): void {
    this.runtimeConfig = data.config;
    this.roundTimer = ROUND_DURATION_SECONDS;
    this.secondAccumulator = 0;
    this.matchElapsedSeconds = 0;
    this.hudSyncAccumulator = 0;
    this.currentRound = 1;
    this.localRoundsWon = 0;
    this.opponentRoundsWon = 0;
    this.roundTransitioning = false;
    this.matchEnded = false;

    const initialControls = this.runtimeConfig.getVirtualControls();
    this.lastVirtualLightSeq = initialControls.lightSeq;
    this.lastVirtualHeavySeq = initialControls.heavySeq;
    this.lastVirtualSpecialSeq = initialControls.specialSeq;
  }

  public create(): void {
    this.drawArenaBackground();
    this.setupInputs();

    this.isGuest =
      this.runtimeConfig.mode === "multiplayer" &&
      this.runtimeConfig.role === "guest";

    const playerChar = getCharacterById(this.runtimeConfig.playerFighterId);
    const opponentChar = getCharacterById(this.runtimeConfig.opponentFighterId);

    this.localStartX = this.isGuest ? 710 : 250;
    this.oppStartX = this.isGuest ? 250 : 710;

    this.localFighter = new FighterEntity(
      this,
      playerChar,
      this.localStartX,
      !this.isGuest,
      this.runtimeConfig.playerEquippedArtifacts ?? []
    );
    this.opponentFighter = new FighterEntity(
      this,
      opponentChar,
      this.oppStartX,
      this.isGuest
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
        if (this.roundTransitioning || this.matchEnded) return;
        if (
          typeof remoteState.round === "number" &&
          remoteState.round !== this.currentRound
        ) {
          return;
        }
        if (remoteState.hp < this.opponentFighter.hp) {
          this.opponentFighter.hp = remoteState.hp;
        }
        if (remoteState.hp <= 0) {
          this.resolveRound(true, "K.O.");
        }
      });

      this.unsubscribeRoomSync = subscribeRoom(
        this.runtimeConfig.roomCode,
        (roomData) => {
          if (this.matchEnded) return;

          if (!roomData) {
            this.concludeMatch(true, "RIVAL DESCONECTADO");
            return;
          }

          if (this.runtimeConfig.role === "host" && !roomData.guest) {
            this.concludeMatch(true, "RIVAL ABANDONÓ");
            return;
          }

          if (roomData.status === "finished" && roomData.winnerUid) {
            const iWon = roomData.winnerUid === this.runtimeConfig.playerUid;
            if (!iWon) {
              this.localFighter.hp = 0;
              this.opponentRoundsWon = Math.max(2, this.opponentRoundsWon);
            } else {
              this.opponentFighter.hp = 0;
              this.localRoundsWon = Math.max(2, this.localRoundsWon);
            }
            this.concludeMatch(iWon, "K.O.");
          }
        }
      );
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cleanupBattleAudio();
      this.mpSync?.destroy();
      if (this.unsubscribeRoomSync) {
        this.unsubscribeRoomSync();
        this.unsubscribeRoomSync = null;
      }
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      cleanupBattleAudio();
    });

    this.input.on("pointerdown", unlockBattleAudio);
    this.input.keyboard?.on("keydown", unlockBattleAudio);

    stopDashboardMusic();
    unlockBattleAudio();
    playRoundBell();
    startBattleMusic();

    this.showCanvasAnnouncement("ROUND 1", "¡PELEA!", "#00F0FF", 850);
    this.syncHud();
  }

  private showCanvasAnnouncement(
    title: string,
    subtitle: string | null,
    color = "#FFFFFF",
    durationMs = 950
  ): void {
    this.announcementText?.destroy();
    this.announcementSubText?.destroy();

    this.announcementText = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 42, title, {
        fontFamily: "sans-serif",
        fontSize: "48px",
        fontStyle: "bold",
        color,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setScale(0.85);

    this.tweens.add({
      targets: this.announcementText,
      scale: 1,
      duration: 200,
      ease: "Back.easeOut",
    });

    if (subtitle) {
      this.announcementSubText = this.add
        .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 10, subtitle, {
          fontFamily: "sans-serif",
          fontSize: "22px",
          fontStyle: "bold",
          color: "#FACC15",
          stroke: "#000000",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(35);
    }

    if (durationMs > 0) {
      this.time.delayedCall(durationMs, () => {
        this.announcementText?.destroy();
        this.announcementSubText?.destroy();
        this.announcementText = null;
        this.announcementSubText = null;
      });
    }
  }

  private drawArenaBackground(): void {
    this.cameras.main.setBackgroundColor("#06060B");

    this.add.rectangle(ARENA_WIDTH / 2, 160, ARENA_WIDTH, 320, 0x090a12);
    this.add.rectangle(ARENA_WIDTH / 2, 380, ARENA_WIDTH, 160, 0x0d101d);

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

    if (this.textures.exists("xela-logo")) {
      this.add
        .image(ARENA_WIDTH / 2, GROUND_Y - 125, "xela-logo")
        .setScale(1.35)
        .setAlpha(0.05);
    }

    this.add.rectangle(
      ARENA_WIDTH / 2,
      GROUND_Y + (ARENA_HEIGHT - GROUND_Y) / 2,
      ARENA_WIDTH,
      ARENA_HEIGHT - GROUND_Y,
      0x07080d
    );
    this.add
      .line(0, 0, 0, GROUND_Y, ARENA_WIDTH, GROUND_Y, 0x00f0ff, 0.45)
      .setOrigin(0, 0);

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
    if (this.matchEnded || this.roundTransitioning) {
      this.localFighter.updateVisuals(delta, time);
      this.opponentFighter.updateVisuals(delta, time);
      if (this.roundTransitioning && !this.matchEnded) {
        this.mpSync?.pushLocal(delta, this.localFighter, this.currentRound);
      }
      return;
    }

    const dtSec = Math.min(delta, 40) / 1000;

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

    this.localFighter.energy = Math.min(
      100,
      this.localFighter.energy + dtSec * 3.5 * this.localFighter.getEnergyGainMultiplier()
    );
    this.opponentFighter.energy = Math.min(
      100,
      this.opponentFighter.energy +
        dtSec * 3.5 * this.opponentFighter.getEnergyGainMultiplier()
    );

    this.updateLocalPlayer(delta);

    if (this.runtimeConfig.mode === "ai" && this.aiSystem) {
      this.updateAIPlayer(delta);
    } else if (this.mpSync) {
      const { triggeredSpecial } = this.mpSync.applyRemoteToOpponent(
        this.opponentFighter,
        this.currentRound
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
          this.resolveRound(false, "K.O.");
          return;
        }
      }
    }

    this.stepPhysics(this.localFighter, dtSec, delta);
    if (this.runtimeConfig.mode === "ai") {
      this.stepPhysics(this.opponentFighter, dtSec, delta);
    }

    this.resolveBodyOverlap();

    if (isAttackAction(this.localFighter.action)) {
      const hit = this.combatSystem.resolveAttack(
        this.localFighter,
        this.opponentFighter
      );
      if (hit?.knockout) {
        this.resolveRound(true, "K.O.");
        return;
      }
    }

    if (
      this.runtimeConfig.mode === "ai" &&
      isAttackAction(this.opponentFighter.action)
    ) {
      const hit = this.combatSystem.resolveAttack(
        this.opponentFighter,
        this.localFighter
      );
      if (hit?.knockout) {
        this.resolveRound(false, "K.O.");
        return;
      }
    }

    this.mpSync?.pushLocal(delta, this.localFighter, this.currentRound);

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
      playAttackSwing(true);
      return;
    }

    if (lightJust) {
      f.setAction("light");
      f.vx = f.facing * 50;
      playAttackSwing(false);
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
      playAttackSwing(true);
      return;
    }

    if (decision.attack === "light") {
      ai.setAction("light");
      ai.vx = ai.facing * 45;
      playAttackSwing(false);
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
    const wonRound = localPct >= oppPct;
    this.resolveRound(wonRound, "TIEMPO AGOTADO");
  }

  /**
   * Resuelve el fin de un round: si un jugador alcanza 2 rounds ganados termina el combate;
   * si van 1-0 o 1-1 prepara el siguiente round (o Round 3 Desempate) sin salir de la escena.
   */
  private resolveRound(localWonRound: boolean, reason: string): void {
    if (this.roundTransitioning || this.matchEnded) return;
    this.roundTransitioning = true;

    if (localWonRound) {
      this.localRoundsWon += 1;
      this.opponentFighter.setAction("ko");
    } else {
      this.opponentRoundsWon += 1;
      this.localFighter.setAction("ko");
    }

    const roundWinnerLabel = localWonRound
      ? "¡ROUND GANADO!"
      : "ROUND PERDIDO";
    this.showCanvasAnnouncement(
      reason,
      roundWinnerLabel,
      localWonRound ? "#00F0FF" : "#FB7185",
      1150
    );
    this.syncHud(`${reason} • ${roundWinnerLabel}`);

    // Si alguien llegó a 2 rounds ganados, finaliza la partida completa
    if (this.localRoundsWon >= 2 || this.opponentRoundsWon >= 2) {
      this.concludeMatch(this.localRoundsWon >= 2, reason);
      return;
    }

    // Preparar siguiente round (Round 2 o Round 3 Desempate si van 1-1)
    const nextRound = this.currentRound + 1;
    const isTiebreaker =
      this.localRoundsWon === 1 && this.opponentRoundsWon === 1;

    this.time.delayedCall(1350, () => {
      if (this.matchEnded) return;

      this.currentRound = nextRound;
      this.roundTimer = ROUND_DURATION_SECONDS;
      this.secondAccumulator = 0;

      this.localFighter.resetForRound(this.localStartX, this.isGuest ? -1 : 1);
      this.opponentFighter.resetForRound(this.oppStartX, this.isGuest ? 1 : -1);

      const bannerTitle = isTiebreaker
        ? `ROUND ${nextRound}`
        : `ROUND ${nextRound}`;
      const bannerSub = isTiebreaker ? "¡DESEMPATE 1-1!" : "PREPARADOS";
      const bannerColor = isTiebreaker ? "#FACC15" : "#FFFFFF";

      this.showCanvasAnnouncement(bannerTitle, bannerSub, bannerColor, 850);
      this.syncHud(
        isTiebreaker ? "ROUND 3 • DESEMPATE" : `ROUND ${nextRound}`
      );

      this.time.delayedCall(900, () => {
        if (this.matchEnded) return;
        playRoundBell();
        this.showCanvasAnnouncement(
          "¡PELEA!",
          isTiebreaker ? "ROUND FINAL" : null,
          "#00F0FF",
          600
        );
        this.syncHud(null);
        this.roundTransitioning = false;
      });
    });
  }

  private concludeMatch(won: boolean, banner: string): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    stopBattleMusic();

    if (!won) {
      this.localFighter.setAction("ko");
      playDefeatSound();
    } else {
      this.opponentFighter.setAction("ko");
      playVictoryFanfare();
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

    this.time.delayedCall(1300, () => {
      this.scene.start("ResultScene", {
        won,
        banner: `${banner} (${this.localRoundsWon}-${this.opponentRoundsWon})`,
      });
      this.runtimeConfig.onMatchEnd({
        won,
        remainingHp: Math.round(this.localFighter.hp),
        durationSeconds: this.matchElapsedSeconds,
        playerRoundsWon: this.localRoundsWon,
        opponentRoundsWon: this.opponentRoundsWon,
      });
    });
  }

  private syncHud(bannerText: string | null = null): void {
    const p1 = this.isGuest ? this.opponentFighter : this.localFighter;
    const p2 = this.isGuest ? this.localFighter : this.opponentFighter;
    const p1Rounds = this.isGuest ? this.opponentRoundsWon : this.localRoundsWon;
    const p2Rounds = this.isGuest ? this.localRoundsWon : this.opponentRoundsWon;

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
      currentRound: this.currentRound,
      p1RoundsWon: p1Rounds,
      p2RoundsWon: p2Rounds,
      bannerText,
    });
  }
}
