import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeClassName?: string;
  action?: React.ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  badge,
  badgeClassName,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        {badge && (
          <span
            className={cn(
              "mb-1.5 inline-block text-[10px] font-bold tracking-widest uppercase",
              badgeClassName ?? "text-slate-500",
            )}
          >
            {badge}
          </span>
        )}
        <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
