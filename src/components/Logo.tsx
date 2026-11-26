import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  withFrame?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-20 w-20",
  xl: "h-28 w-28 sm:h-32 sm:w-32",
};

const TEXT_SIZE_MAP = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-4xl sm:text-5xl",
};

/**
 * Componente oficial del isotipo Xela ("XA" blanco sobre negro).
 */
export function Logo({
  size = "sm",
  showText = true,
  withFrame = true,
  className,
}: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-black",
          withFrame &&
            "rounded-xl border border-white/15 shadow-[0_0_25px_rgba(255,255,255,0.08)]",
          SIZE_MAP[size]
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          fill="none"
          aria-label="Xela Logo"
          className="h-[78%] w-[78%]"
        >
          <g fill="#FFFFFF">
            <path d="M 105 90 L 172 90 L 250 190 L 328 90 L 395 90 L 162 390 L 95 390 L 217 233 Z" />
            <path d="M 294 219 L 427 390 L 360 390 L 328 348 L 220 348 L 256 301 L 292 301 L 263 262 Z" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display font-bold tracking-[0.22em] text-white uppercase",
              TEXT_SIZE_MAP[size]
            )}
          >
            XELA
          </span>
          {(size === "lg" || size === "xl") && (
            <span className="mt-1 text-[11px] font-medium tracking-[0.34em] text-zinc-400 uppercase">
              ARENA 1V1
            </span>
          )}
        </div>
      )}
    </div>
  );
}
