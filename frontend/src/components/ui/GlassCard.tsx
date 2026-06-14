import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "strong";
  glow?: "none" | "bullish" | "bearish" | "indigo";
  id?: string;
};

export function GlassCard({
  children,
  className,
  variant = "default",
  glow = "none",
  id,
}: GlassCardProps) {
  return (
    <div
      id={id}
      className={cn(
        "rounded-2xl transition-all duration-300",
        variant === "strong" ? "glass-strong" : "glass",
        glow === "bullish" && "glow-bullish",
        glow === "bearish" && "glow-bearish",
        glow === "indigo" && "shadow-[var(--glow-indigo)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
