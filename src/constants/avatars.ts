export interface AvatarPreset {
  id: string;
  name: string;
  accent: string;
  src: string;
  price: number;
  isDefaultFree?: boolean;
}

export const DEFAULT_FREE_AVATAR_ID = "avatar-01";

export const AVATARS: AvatarPreset[] = [
  {
    id: "avatar-01",
    name: "Volt",
    accent: "#00F0FF",
    src: "/avatars/avatar-01.svg",
    price: 0,
    isDefaultFree: true,
  },
  { id: "avatar-02", name: "Neon", accent: "#FF2D95", src: "/avatars/avatar-02.svg", price: 300 },
  { id: "avatar-03", name: "Titan", accent: "#FF6B00", src: "/avatars/avatar-03.svg", price: 350 },
  { id: "avatar-04", name: "Phantom", accent: "#7B2FFF", src: "/avatars/avatar-04.svg", price: 400 },
  { id: "avatar-05", name: "Ember", accent: "#FF3B3B", src: "/avatars/avatar-05.svg", price: 450 },
  { id: "avatar-06", name: "Pulse", accent: "#00D4AA", src: "/avatars/avatar-06.svg", price: 500 },
  { id: "avatar-07", name: "Cipher", accent: "#A855F7", src: "/avatars/avatar-07.svg", price: 550 },
  { id: "avatar-08", name: "Apex", accent: "#E0E7FF", src: "/avatars/avatar-08.svg", price: 600 },
  { id: "avatar-09", name: "Kuro", accent: "#FFFFFF", src: "/avatars/avatar-09.svg", price: 650 },
  { id: "avatar-10", name: "Vortex", accent: "#38BDF8", src: "/avatars/avatar-10.svg", price: 700 },
  { id: "avatar-11", name: "Solar", accent: "#FACC15", src: "/avatars/avatar-11.svg", price: 750 },
  { id: "avatar-12", name: "Onyx", accent: "#94A3B8", src: "/avatars/avatar-12.svg", price: 800 },
];

export function getAvatarById(avatarId?: string | null): AvatarPreset {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
}

export function isAvatarUnlocked(
  avatarId: string,
  unlockedAvatars: string[] = []
): boolean {
  if (avatarId === DEFAULT_FREE_AVATAR_ID) return true;
  return unlockedAvatars.includes(avatarId);
}
