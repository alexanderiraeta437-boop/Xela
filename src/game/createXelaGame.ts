import * as Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH, type MatchRuntimeConfig } from "@/game/config";
import { BootScene } from "@/game/scenes/BootScene";
import { MenuScene } from "@/game/scenes/MenuScene";
import { FightScene } from "@/game/scenes/FightScene";
import { ResultScene } from "@/game/scenes/ResultScene";

/**
 * Crea e inicializa una instancia de Phaser 3 dentro del contenedor HTML indicado.
 */
export function createXelaGame(
  parent: HTMLElement,
  runtimeConfig: MatchRuntimeConfig
): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    backgroundColor: "#050507",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, FightScene, ResultScene],
  });

  game.scene.start("BootScene", { config: runtimeConfig });
  return game;
}
