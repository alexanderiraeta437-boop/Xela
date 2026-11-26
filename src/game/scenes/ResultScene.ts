import * as Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH } from "@/game/config";

/**
 * Escena final dentro del canvas tras concluir el combate.
 */
export class ResultScene extends Phaser.Scene {
  private won = false;
  private banner = "K.O.";

  constructor() {
    super({ key: "ResultScene" });
  }

  public init(data: { won: boolean; banner: string }): void {
    this.won = data.won;
    this.banner = data.banner || "K.O.";
  }

  public create(): void {
    this.cameras.main.setBackgroundColor("#050507");

    this.add
      .text(ARENA_WIDTH / 2, ARENA_HEIGHT / 2 - 26, this.banner, {
        fontFamily: "sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#94A3B8",
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(
        ARENA_WIDTH / 2,
        ARENA_HEIGHT / 2 + 26,
        this.won ? "VICTORIA" : "DERROTA",
        {
          fontFamily: "sans-serif",
          fontSize: "58px",
          fontStyle: "bold",
          color: this.won ? "#00F0FF" : "#FF3B3B",
        }
      )
      .setOrigin(0.5);
  }
}
