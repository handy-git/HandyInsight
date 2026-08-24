import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatTileProps {
  /** 标签行图标 */
  icon: LucideIcon;
  /** 标签文案（如"账户"、"称号"） */
  label: string;
  /** 主数值行 */
  value: ReactNode;
  /** 可选的辅助行（次级数值 / 说明） */
  hint?: ReactNode;
  className?: string;
}

/** 紧凑统计卡：玩家详情页头部等多插件指标位，flex 布局下自动换行不溢出。 */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: StatTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-[168px] flex-1 flex-col gap-1 rounded-lg border bg-card px-3 py-2.5",
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        {label}
      </span>
      <span className="truncate text-sm font-medium">{value}</span>
      {hint != null && hint !== false && (
        <span className="truncate text-sm text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}
