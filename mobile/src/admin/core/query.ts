import type { AdminRecord } from "./types.ts";

export type SortDirection = "asc" | "desc";

export type FilterOperator =
  | "eq"
  | "ne"
  | "in"
  | "nin"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "contains"
  | "exists"
  | "between";

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface Query {
  search?: string;
  searchFields?: string[];
  filters?: Filter[];
  sort?: string;
  direction?: SortDirection;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
  /** Only trashed records - what the Trash screen lists. */
  onlyDeleted?: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function getPath(record: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) {
      const index = Number(key);
      return Number.isInteger(index) ? value[index] : undefined;
    }
    if (typeof value === "object")
      return (value as Record<string, unknown>)[key];
    return undefined;
  }, record);
}

function comparable(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return String(value).toLowerCase();
}

function containsText(value: unknown, needle: string): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value))
    return value.some((entry) => containsText(entry, needle));
  if (typeof value === "object")
    return Object.values(value).some((entry) => containsText(entry, needle));
  return String(value).toLowerCase().includes(needle);
}

export function matchesFilter(record: unknown, filter: Filter): boolean {
  const actual = getPath(record, filter.field);
  const { operator, value } = filter;
  switch (operator) {
    case "eq":
      return Array.isArray(actual)
        ? actual.some((entry) => comparable(entry) === comparable(value))
        : comparable(actual) === comparable(value);
    case "ne":
      return comparable(actual) !== comparable(value);
    case "in":
      return (
        Array.isArray(value) &&
        value.some((entry) =>
          Array.isArray(actual)
            ? actual.some((item) => comparable(item) === comparable(entry))
            : comparable(actual) === comparable(entry),
        )
      );
    case "nin":
      return (
        !Array.isArray(value) ||
        !value.some((entry) => comparable(actual) === comparable(entry))
      );
    case "lt":
      return comparable(actual) < comparable(value);
    case "lte":
      return comparable(actual) <= comparable(value);
    case "gt":
      return comparable(actual) > comparable(value);
    case "gte":
      return comparable(actual) >= comparable(value);
    case "contains":
      return containsText(actual, String(value).toLowerCase());
    case "exists": {
      const present = actual !== null && actual !== undefined && actual !== "";
      return value === false ? !present : present;
    }
    case "between": {
      const range = Array.isArray(value) ? value : [];
      const [min, max] = range;
      const current = comparable(actual);
      if (
        min !== undefined &&
        min !== null &&
        min !== "" &&
        current < comparable(min)
      )
        return false;
      if (
        max !== undefined &&
        max !== null &&
        max !== "" &&
        current > comparable(max)
      )
        return false;
      return true;
    }
    default:
      return true;
  }
}

export function compareRecords(
  a: unknown,
  b: unknown,
  sort: string,
  direction: SortDirection,
): number {
  const left = comparable(getPath(a, sort));
  const right = comparable(getPath(b, sort));
  if (left === right) return 0;
  return (left < right ? -1 : 1) * (direction === "desc" ? -1 : 1);
}

function isEmptyFilterValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value))
    return value.length === 0 || value.every(isEmptyFilterValue);
  return false;
}

/** Search, filter, sort and paginate an in-memory collection. */
export function runQuery<T extends AdminRecord>(
  records: T[],
  query: Query = {},
): Page<T> {
  const {
    search,
    searchFields = [],
    filters = [],
    sort = "updatedAt",
    direction = "desc",
    page = 1,
    pageSize = 25,
    includeDeleted = false,
    onlyDeleted = false,
  } = query;

  let items = records.filter((record) => {
    const trashed = Boolean(record.deletedAt);
    if (onlyDeleted) return trashed;
    return includeDeleted || !trashed;
  });

  const needle = search?.trim().toLowerCase();
  if (needle) {
    items = items.filter((record) =>
      searchFields.length
        ? searchFields.some((field) =>
            containsText(getPath(record, field), needle),
          )
        : containsText(record, needle),
    );
  }

  for (const filter of filters) {
    if (filter.operator !== "exists" && isEmptyFilterValue(filter.value))
      continue;
    items = items.filter((record) => matchesFilter(record, filter));
  }

  const total = items.length;
  const sorted = [...items].sort((a, b) =>
    compareRecords(a, b, sort, direction),
  );
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * size;

  return {
    items: sorted.slice(start, start + size),
    total,
    page: current,
    pageSize: size,
    pageCount,
  };
}
