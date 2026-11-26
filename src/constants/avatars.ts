export interface AvatarPreset {
  id: string;
  name: string;
  accent: string;
  src: string;
}

export const AVATARS: AvatarPreset[] = [
  { id: "avatar-01", name: "Volt", accent: "#00F0FF", src: "/avatars/avatar-01.svg" },
  { id: "avatar-02", name: "Neon", accent: "#FF2D95", src: "/avatars/avatar-02.svg" },
  { id: "avatar-03", name: "Titan", accent: "#FF6B00", src: "/avatars/avatar-03.svg" },
  { id: "avatar-04", name: "Phantom", accent: "#7B2FFF", src: "/avatars/avatar-04.svg" },
  { id: "avatar-05", name: "Ember", accent: "#FF3B3B", src: "/avatars/avatar-05.svg" },
  { id: "avatar-06", name: "Pulse", accent: "#00D4AA", src: "/avatars/avatar-06.svg" },
  { id: "avatar-07", name: "Cipher", accent: "#A855F7", src: "/avatars/avatar-07.svg" },
  { id: "avatar-08", name: "Apex", accent: "#E0E7FF", src: "/avatars/avatar-08.svg" },
  { id: "avatar-09", name: "Kuro", accent: "#FFFFFF", src: "/avatars/avatar-09.svg" },
  { id: "avatar-10", name: "Vortex", accent: "#38BDF8", src: "/avatars/avatar-10.svg" },
  { id: "avatar-11", name: "Solar", accent: "#FACC15", src: "/avatars/avatar-11.svg" },
  { id: "avatar-12", name: "Onyx", accent: "#94A3B8", src: "/avatars/avatar-12.svg" },
];

export function getAvatarById(avatarId?: string | null): AvatarPreset {
  return AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
}
