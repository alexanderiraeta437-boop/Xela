"use client";

import React from "react";
import { Check } from "lucide-react";
import { AVATARS } from "@/constants/avatars";
import { cn } from "@/lib/utils";

interface AvatarPickerProps {
  selectedId: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {AVATARS.map((avatar) => {
        const isSelected = avatar.id === selectedId;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all",
              isSelected
                ? "border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400/30"
                : "border-white/10 bg-zinc-950/70 hover:border-white/30"
            )}
          >
            <img
              src={avatar.src}
              alt={avatar.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span className="text-[11px] font-medium text-zinc-300">
              {avatar.name}
            </span>
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
