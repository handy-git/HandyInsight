"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import type { SortOrder } from "@/lib/common/sort";

/**
 * 可排序表头：点击切换排序字段，重复点击翻转方向。
 *
 * 泛型 F 为页面定义的排序字段联合类型，组件本身不感知具体业务字段。
 *
 * @example
 * type MySort = "name" | "count";
 * <SortableHead<MySort> label="名称" field="name" sort={sort} order={order} onSort={handleSort} />
 */
export function SortableHead<F extends string>({
  label,
  field,
  sort,
  order,
  onSort,
  align = "left",
}: {
  label: string;
  field: F;
  sort: F;
  order: SortOrder;
  onSort: (field: F) => void;
  align?: "left" | "right";
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        type="button"
        className={
          "inline-flex items-center gap-1 transition-colors hover:text-foreground " +
          (active ? "text-foreground" : "text-muted-foreground")
        }
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}
