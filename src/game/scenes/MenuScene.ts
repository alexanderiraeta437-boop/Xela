import * as Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH, type MatchRuntimeConfig } from "@/game/config";
import { getCharacterById } from "@/constants/characters";

/**
 * Escena previa al combate que presenta el duelo 1 vs 1.
 */
export class MenuScene extends Phaser.Scene {
  private runtimeConfig!: MatchRuntimeConfig;

  constructor() {
    super({ key: "MenuScene" });
  }

  public init(data: { config: MatchRuntimeConfig }): void {
    this.runtimeConfig = data.config;
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#06060A");

    const p1 = getCharacterById(this.runtimeConfig.playerFighterId);
    const p2 = getCharacterById(this.runtimeConfig.opponentFighterId);

    this.runtimeConfig.onHudUpdate({
      p1Hp: p1.stats.hp * 2,
      p1MaxHp: p1.stats.hp * 2,
      p1Energy: 25,
      p2Hp: p2.stats.hp * 2,
      p2MaxHp: p2.stats.hp * 2,
      p2Energy: 25,
      timer: 99,
      bannerText: "PREPARADOS",
    });

    const p1Text = this.add
      .text(ARENA_WIDTH * 0.28, ARENA_HEIGHT / 2, p1.name.toUpperCase(), {
        fontFamily: "sans-serif",
        fontSize: "36px",
        fontStyle: "bold",
        color: p1.themeColor,
      })
      .setOrigin(0.5);

    this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, "VS", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        fontStyle: "bold",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    const p2Text = this.add
      .text(ARENA_WIDTH * 0.72, ARENA_HEIGHT / 2, p2.name.toUpperCase(), {
        fontFamily: "sans-serif",
        fontSize: "36px",
        fontStyle: "bold",
        color: p2.themeColor,
      })
      .setOrigin(0.5);

    const readyBanner = this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 78, "ROUND 1", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#E2E8F0",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: [p1Text, p2Text],
      scale: 1.05,
      duration: 400,
      yoyo: true,
    });

    this.time.delayedCall(650, () => {
      readyBanner.setText("¡PELEA!");
      readyBanner.setColor("#00F0FF");
    });

    this.time.delayedCall(1100, () => {
      this.runtimeConfig.onHudUpdate({ bannerText: null });
      this.scene.start("FightScene", { config: this.runtimeConfig });
    });
  }
}
