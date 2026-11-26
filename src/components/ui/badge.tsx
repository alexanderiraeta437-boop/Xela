import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/15 bg-white/10 text-white",
        secondary: "border-white/10 bg-zinc-900 text-zinc-300",
        accent: "border-cyan-400/30 bg-cyan-400/15 text-cyan-300",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        destructive: "border-red-500/30 bg-red-500/15 text-red-300",
        outline: "border-white/20 text-zinc-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
