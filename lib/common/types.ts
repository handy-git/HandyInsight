/** 服务端分页结果。 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
