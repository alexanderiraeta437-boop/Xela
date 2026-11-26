import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorColor?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, indicatorColor, ...props }, ref) => {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/10",
          className
        )}
        {...props}
      >
        <div
          className="h-full transition-all duration-300 ease-out rounded-full bg-white"
          style={{
            width: `${pct}%`,
            ...(indicatorColor ? { backgroundColor: indicatorColor } : {}),
          }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
