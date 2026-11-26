import * as Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH, type MatchRuntimeConfig } from "@/game/config";

/**
 * Escena inicial de carga con la identidad visual de Xela.
 */
export class BootScene extends Phaser.Scene {
  private runtimeConfig!: MatchRuntimeConfig;

  constructor() {
    super({ key: "BootScene" });
  }

  public init(data: { config: MatchRuntimeConfig }): void {
    this.runtimeConfig = data.config;
  }

  public preload(): void {
    this.load.svg("xela-logo", "/logo/xela-logo.svg", {
      width: 120,
      height: 120,
    });
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#050507");

    const logo = this.add
      .image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 20, "xela-logo")
      .setAlpha(0.95);

    this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 + 64, "CARGANDO ARENA...", {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#94A3B8",
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: logo,
      scale: 1.06,
      duration: 280,
      yoyo: true,
      onComplete: () => {
        this.scene.start("MenuScene", { config: this.runtimeConfig });
      },
    });
  }
}
