import type { Fighter } from "@/types";

export const CHARACTERS: Fighter[] = [
  {
    id: "kai",
    name: "Kai",
    title: "El Rayo Urbano",
    description: "Joven callejero rápido y agresivo. Especialista en combos rápidos.",
    themeColor: "#00F0FF",
    unlockCondition: "default",
    stats: { hp: 100, speed: 95, power: 70, defense: 60 },
    moves: {
      light: "Puñetazo rápido",
      heavy: "Patada giratoria",
      special: "Dash Impact",
      block: "Guardia baja",
    },
    specialName: "Dash Impact",
    specialDescription: "Embiste a gran velocidad causando daño y empujando al rival.",
  },
  {
    id: "nova",
    name: "Nova",
    title: "La Estrella Fragante",
    description: "Luchadora elegante y precisa. Combina gracia con potencia.",
    themeColor: "#FF2D95",
    unlockCondition: "default",
    stats: { hp: 95, speed: 85, power: 80, defense: 70 },
    moves: {
      light: "Golpe de abanico",
      heavy: "Patada alta",
      special: "Petal Burst",
      block: "Guardia elegante",
    },
    specialName: "Petal Burst",
    specialDescription: "Ráfaga de energía rosa que golpea varias veces.",
  },
  {
    id: "rex",
    name: "Rex",
    title: "El Tanque de Acero",
    description: "Luchador pesado y resistente. Difícil de tumbar.",
    themeColor: "#FF6B00",
    unlockCondition: "wins:8",
    stats: { hp: 140, speed: 55, power: 90, defense: 95 },
    moves: {
      light: "Gancho",
      heavy: "Martillo de puño",
      special: "Iron Quake",
      block: "Guardia de acero",
    },
    specialName: "Iron Quake",
    specialDescription: "Golpe al suelo que genera una onda de choque.",
  },
  {
    id: "lyra",
    name: "Lyra",
    title: "La Sombra Silenciosa",
    description: "Ágil y evasiva. Maestra del contraataque.",
    themeColor: "#7B2FFF",
    unlockCondition: "wins:15",
    stats: { hp: 90, speed: 100, power: 75, defense: 65 },
    moves: {
      light: "Corte rápido",
      heavy: "Patada baja",
      special: "Shadow Step",
      block: "Esquiva lateral",
    },
    specialName: "Shadow Step",
    specialDescription: "Desaparece y reaparece detrás del rival para atacar.",
  },
  {
    id: "blaze",
    name: "Blaze",
    title: "El Pirómano",
    description: "Agresivo y explosivo. Alto daño pero frágil.",
    themeColor: "#FF3B3B",
    unlockCondition: "wins:12",
    stats: { hp: 85, speed: 80, power: 100, defense: 55 },
    moves: {
      light: "Puño de fuego",
      heavy: "Uppercut ardiente",
      special: "Inferno Rush",
      block: "Guardia de calor",
    },
    specialName: "Inferno Rush",
    specialDescription: "Carga envuelta en llamas que causa gran daño.",
  },
  {
    id: "echo",
    name: "Echo",
    title: "El Resonante",
    description: "Usa ondas de sonido. Buen equilibrio y control de espacio.",
    themeColor: "#00D4AA",
    unlockCondition: "wins:20",
    stats: { hp: 110, speed: 75, power: 80, defense: 80 },
    moves: {
      light: "Onda corta",
      heavy: "Onda expansiva",
      special: "Sonic Boom",
      block: "Barrera sonora",
    },
    specialName: "Sonic Boom",
    specialDescription: "Onda de choque a distancia media.",
  },
  {
    id: "vex",
    name: "Vex",
    title: "El Caos Cálculo",
    description: "Impredecible y técnico. Especialista en combos largos.",
    themeColor: "#A855F7",
    unlockCondition: "wins:25",
    stats: { hp: 100, speed: 88, power: 85, defense: 70 },
    moves: {
      light: "Golpe de dedos",
      heavy: "Barrido",
      special: "Chaos Matrix",
      block: "Guardia digital",
    },
    specialName: "Chaos Matrix",
    specialDescription: "Serie de golpes aleatorios muy rápidos.",
  },
  {
    id: "aether",
    name: "Aether",
    title: "El Ascendente",
    description: "Personaje final. Equilibrado y poderoso. Aura luminosa.",
    themeColor: "#E0E7FF",
    unlockCondition: "wins:40",
    stats: { hp: 120, speed: 90, power: 90, defense: 85 },
    moves: {
      light: "Golpe de luz",
      heavy: "Patada celestial",
      special: "Aether Strike",
      block: "Escudo de energía",
    },
    specialName: "Aether Strike",
    specialDescription: "Ataque cargado con gran alcance y daño.",
  },
];

export const DEFAULT_FIGHTER_IDS = CHARACTERS.filter(
  (c) => c.unlockCondition === "default"
).map((c) => c.id);

export function getCharacterById(id: string): Fighter {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function getRequiredWins(unlockCondition: string): number {
  if (unlockCondition === "default") return 0;
  const [, raw] = unlockCondition.split(":");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isCharacterUnlocked(
  fighter: Fighter,
  wins: number,
  unlockedFighters: string[] = []
): boolean {
  if (fighter.unlockCondition === "default") return true;
  if (unlockedFighters.includes(fighter.id)) return true;
  return wins >= getRequiredWins(fighter.unlockCondition);
}
