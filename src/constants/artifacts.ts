import type { Artifact } from "@/types";

/**
 * 16 artefactos exclusivos (2 por cada uno de los 8 luchadores).
 * Precios exigentes (450 a 1,200 monedas) con mejoras reales de +6% a +12% en combate.
 */
export const ARTIFACTS: Artifact[] = [
  // 1. Kai (El Rayo Urbano)
  {
    id: "kai-dagas-relampago",
    fighterId: "kai",
    name: "Dagas Relámpago",
    slot: "weapon",
    description:
      "Dagas gemelas energizadas que aceleran los cortes rápidos de Kai.",
    price: 650,
    boosts: { damagePct: 0.1, speedPct: 0.06 },
    boostLabel: "+10% Daño • +6% Velocidad",
    accentColor: "#00F0FF",
  },
  {
    id: "kai-bufanda-voltaica",
    fighterId: "kai",
    name: "Bufanda Voltaica",
    slot: "accessory",
    description:
      "Bufanda táctica conductora que recarga energía con cada desplazamiento.",
    price: 480,
    boosts: { speedPct: 0.1, energyGainPct: 0.08 },
    boostLabel: "+10% Velocidad • +8% Recarga Esp.",
    accentColor: "#00F0FF",
  },

  // 2. Nova (La Estrella Fragante)
  {
    id: "nova-arco-estelar",
    fighterId: "nova",
    name: "Arco y Flechas Estelares",
    slot: "weapon",
    description:
      "Arco fotónico con flechas de plasma rosa para potenciar golpes críticos.",
    price: 720,
    boosts: { damagePct: 0.09, energyGainPct: 0.08 },
    boostLabel: "+9% Daño • +8% Recarga Esp.",
    accentColor: "#FF2D95",
  },
  {
    id: "nova-visor-prisma",
    fighterId: "nova",
    name: "Visor Prisma Estelar",
    slot: "accessory",
    description:
      "Visor holográfico de precisión que anticipa ángulos de ataque rivales.",
    price: 540,
    boosts: { defensePct: 0.08, speedPct: 0.09 },
    boostLabel: "+8% Defensa • +9% Velocidad",
    accentColor: "#FF2D95",
  },

  // 3. Rex (El Tanque de Acero)
  {
    id: "rex-guanteletes-titan",
    fighterId: "rex",
    name: "Guanteletes Titán",
    slot: "weapon",
    description:
      "Guanteletes hidráulicos reforzados para impactos sísmicos devastadores.",
    price: 920,
    boosts: { damagePct: 0.12, defensePct: 0.06 },
    boostLabel: "+12% Daño • +6% Defensa",
    accentColor: "#FF6B00",
  },
  {
    id: "rex-capa-blindada",
    fighterId: "rex",
    name: "Coraza Dorsal de Acero",
    slot: "accessory",
    description:
      "Blindaje dorsal modular que absorbe parte del daño de combos pesados.",
    price: 780,
    boosts: { defensePct: 0.12 },
    boostLabel: "+12% Defensa",
    accentColor: "#FF6B00",
  },

  // 4. Lyra (La Sombra Silenciosa)
  {
    id: "lyra-dagas-obsidiana",
    fighterId: "lyra",
    name: "Dagas de Obsidiana",
    slot: "weapon",
    description:
      "Hojas sigilosas de filo nocturno diseñadas para contraataques letales.",
    price: 840,
    boosts: { damagePct: 0.11, speedPct: 0.07 },
    boostLabel: "+11% Daño • +7% Velocidad",
    accentColor: "#7B2FFF",
  },
  {
    id: "lyra-capa-sombra",
    fighterId: "lyra",
    name: "Capa de Sombra",
    slot: "accessory",
    description:
      "Capa ligera de camuflaje que incrementa la agilidad y evasión en el ring.",
    price: 690,
    boosts: { speedPct: 0.12, defensePct: 0.07 },
    boostLabel: "+12% Velocidad • +7% Defensa",
    accentColor: "#7B2FFF",
  },

  // 5. Blaze (El Pirómano)
  {
    id: "blaze-espada-ignis",
    fighterId: "blaze",
    name: "Espada Ignis",
    slot: "weapon",
    description:
      "Espada térmica de núcleo incandescente que multiplica la potencia ofensiva.",
    price: 880,
    boosts: { damagePct: 0.12 },
    boostLabel: "+12% Daño",
    accentColor: "#FF3B3B",
  },
  {
    id: "blaze-visor-termo",
    fighterId: "blaze",
    name: "Visor Termo-Núcleo",
    slot: "accessory",
    description:
      "Visor ignífugo que canaliza el calor en energía para habilidades especiales.",
    price: 620,
    boosts: { energyGainPct: 0.1, defensePct: 0.07 },
    boostLabel: "+10% Recarga Esp. • +7% Defensa",
    accentColor: "#FF3B3B",
  },

  // 6. Echo (El Resonante)
  {
    id: "echo-espada-diapason",
    fighterId: "echo",
    name: "Hoja Diapasón",
    slot: "weapon",
    description:
      "Arma sónica afinada que amplifica vibraciones y carga energía velozmente.",
    price: 760,
    boosts: { damagePct: 0.08, energyGainPct: 0.11 },
    boostLabel: "+8% Daño • +11% Recarga Esp.",
    accentColor: "#00D4AA",
  },
  {
    id: "echo-bufanda-acustica",
    fighterId: "echo",
    name: "Bufanda Acústica",
    slot: "accessory",
    description:
      "Bufanda amortiguadora de ondas que refuerza la guardia y movilidad.",
    price: 590,
    boosts: { defensePct: 0.1, speedPct: 0.08 },
    boostLabel: "+10% Defensa • +8% Velocidad",
    accentColor: "#00D4AA",
  },

  // 7. Vex (El Caos Cálculo)
  {
    id: "vex-guanteletes-cuanticos",
    fighterId: "vex",
    name: "Guanteletes Cuánticos",
    slot: "weapon",
    description:
      "Guanteletes de pulso binario que potencian combos técnicos y carga especial.",
    price: 980,
    boosts: { damagePct: 0.1, energyGainPct: 0.1 },
    boostLabel: "+10% Daño • +10% Recarga Esp.",
    accentColor: "#A855F7",
  },
  {
    id: "vex-visor-matrix",
    fighterId: "vex",
    name: "Visor Matrix",
    slot: "accessory",
    description:
      "Visor predictivo de combate con aceleración táctica en tiempo real.",
    price: 740,
    boosts: { speedPct: 0.11, defensePct: 0.07 },
    boostLabel: "+11% Velocidad • +7% Defensa",
    accentColor: "#A855F7",
  },

  // 8. Aether (El Ascendente)
  {
    id: "aether-espada-celestial",
    fighterId: "aether",
    name: "Espada Celestial",
    slot: "weapon",
    description:
      "Espada luminosa legendaria forjada para el luchador más poderoso de Xela.",
    price: 1200,
    boosts: { damagePct: 0.12, energyGainPct: 0.09 },
    boostLabel: "+12% Daño • +9% Recarga Esp.",
    accentColor: "#E0E7FF",
  },
  {
    id: "aether-capa-ascendente",
    fighterId: "aether",
    name: "Capa del Ascendente",
    slot: "accessory",
    description:
      "Manto etéreo de alta densidad que eleva la defensa y velocidad máxima.",
    price: 1050,
    boosts: { defensePct: 0.11, speedPct: 0.09 },
    boostLabel: "+11% Defensa • +9% Velocidad",
    accentColor: "#E0E7FF",
  },
];

export function getArtifactById(artifactId: string): Artifact | undefined {
  return ARTIFACTS.find((a) => a.id === artifactId);
}

export function getArtifactsForFighter(fighterId: string): Artifact[] {
  return ARTIFACTS.filter((a) => a.fighterId === fighterId);
}

export interface ComputedArtifactBonuses {
  damageMult: number;
  defenseBonus: number;
  speedMult: number;
  energyGainMult: number;
}

/**
 * Calcula los multiplicadores reales en combate a partir de los artefactos equipados
 * para un luchador específico.
 */
export function computeFighterArtifactBonuses(
  fighterId: string,
  equippedIds: string[] = []
): ComputedArtifactBonuses {
  let damagePct = 0;
  let defensePct = 0;
  let speedPct = 0;
  let energyGainPct = 0;

  for (const id of equippedIds) {
    const artifact = getArtifactById(id);
    if (!artifact || artifact.fighterId !== fighterId) continue;
    damagePct += artifact.boosts.damagePct ?? 0;
    defensePct += artifact.boosts.defensePct ?? 0;
    speedPct += artifact.boosts.speedPct ?? 0;
    energyGainPct += artifact.boosts.energyGainPct ?? 0;
  }

  return {
    damageMult: 1 + damagePct,
    defenseBonus: defensePct,
    speedMult: 1 + speedPct,
    energyGainMult: 1 + energyGainPct,
  };
}
