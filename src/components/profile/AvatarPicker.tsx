"use client";

import React from "react";
import { Check, Lock, Coins } from "lucide-react";
import { AVATARS, isAvatarUnlocked, type AvatarPreset } from "@/constants/avatars";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  selectedId: string;
  unlockedAvatars: string[];
  onSelect: (avatarId: string) => void;
  onAttemptBuy?: (avatar: AvatarPreset) => void;
}

export function AvatarPicker({
  selectedId,
  unlockedAvatars,
  onSelect,
  onAttemptBuy,
}: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {AVATARS.map((avatar) => {
        const unlocked = isAvatarUnlocked(avatar.id, unlockedAvatars);
        const isSelected = avatar.id === selectedId && unlocked;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => {
              if (unlocked) {
                onSelect(avatar.id);
              } else {
                onAttemptBuy?.(avatar);
              }
            }}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
              isSelected
                ? "border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400/30"
                : unlocked
                  ? "border-white/10 bg-zinc-950/70 hover:border-white/30"
                  : "border-white/10 bg-zinc-950/40 opacity-85 hover:border-amber-400/45"
            )}
          >
            <div className="relative">
              <img
                src={avatar.src}
                alt={avatar.name}
                className={cn(
                  "h-12 w-12 rounded-lg object-cover",
                  !unlocked && "grayscale opacity-50"
                )}
              />
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/55">
                  <Lock className="h-4 w-4 text-amber-300" />
                </div>
              )}
            </div>

            <span className="text-[11px] font-medium text-zinc-300">
              {avatar.name}
            </span>

            {!unlocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                <Coins className="h-2.5 w-2.5" />
                {avatar.price}
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400">
                {avatar.isDefaultFree ? "Gratis" : "Desbloqueado"}
              </span>
            )}

            {isSelected && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-black">
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
