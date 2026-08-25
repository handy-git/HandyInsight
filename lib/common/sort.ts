/**
 * 通用排序类型与工具，供所有列表页面的表头排序复用。
 *
 * 每个页面只需定义自己的 SortField 联合类型，
 * 排序方向 SortOrder 和切换逻辑 toggleSort 是通用的。
 */

/** 排序方向。 */
export type SortOrder = "asc" | "desc";

/** 排序状态：当前字段 + 方向。 */
export interface SortState<F extends string> {
  field: F;
  order: SortOrder;
}

/**
 * 表头点击时的排序切换逻辑：
 * - 点击当前已激活的列 → 翻转升降序
 * - 点击新列 → 使用该列的默认方向
 *
 * @param current  当前排序状态
 * @param field    被点击的字段
 * @param defaultOrderForField  该字段的默认方向（通常数值类 desc，文本类 asc）
 */
export function toggleSort<F extends string>(
  current: SortState<F>,
  field: F,
  defaultOrderForField: SortOrder,
): SortState<F> {
  if (field === current.field) {
    return {
      field,
      order: current.order === "asc" ? "desc" : "asc",
    };
  }
  return { field, order: defaultOrderForField };
}
