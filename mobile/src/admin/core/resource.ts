import type { FieldDef, Option } from "./fields.ts";
import type { SortDirection } from "./query.ts";

export type PermissionAction =
  "view" | "create" | "edit" | "delete" | "export" | "publish" | "refund";

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "publish",
  "refund",
];

export interface ColumnDef {
  field: string;
  label: string;
  format?:
    | "text"
    | "currency"
    | "number"
    | "percent"
    | "date"
    | "datetime"
    | "badge"
    | "boolean"
    | "image"
    | "relation"
    | "tags";
  width?: number;
  options?: Option[];
  resource?: string;
  /** Dropped on narrow screens so the table stays readable on a phone. */
  compact?: boolean;
}

export interface FilterDef {
  field: string;
  label: string;
  type: "select" | "boolean" | "dateRange" | "numberRange";
  options?: Option[];
  resource?: string;
}

export interface ResourceFeatures {
  create: boolean;
  edit: boolean;
  delete: boolean;
  duplicate: boolean;
  /** Manual `sortOrder` control. */
  reorder: boolean;
  /** Draft / scheduled / published lifecycle. */
  publish: boolean;
  bulk: boolean;
  importExport: boolean;
  revisions: boolean;
  trash: boolean;
}

export interface ResourceDefinition {
  /** Collection name in the store, and the URL segment. */
  key: string;
  label: string;
  singular: string;
  icon: string;
  /** Permission module this resource is governed by. */
  module: string;
  description?: string;
  /** Field used as the human label of a record. */
  labelField: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  searchFields: string[];
  filters?: FilterDef[];
  defaultSort?: { field: string; direction: SortDirection };
  features?: Partial<ResourceFeatures>;
  /** Editor tabs, in order. Sections not listed are appended. */
  sections?: string[];
  emptyHint?: string;
}

export const DEFAULT_FEATURES: ResourceFeatures = {
  create: true,
  edit: true,
  delete: true,
  duplicate: false,
  reorder: false,
  publish: false,
  bulk: true,
  importExport: true,
  revisions: true,
  trash: true,
};

export function featuresOf(resource: ResourceDefinition): ResourceFeatures {
  return { ...DEFAULT_FEATURES, ...resource.features };
}

/** Fields grouped into editor tabs, preserving declaration order. */
export function sectionsOf(
  resource: ResourceDefinition,
): { name: string; fields: FieldDef[] }[] {
  const buckets = new Map<string, FieldDef[]>();
  for (const field of resource.fields) {
    const section = field.section ?? "General";
    const bucket = buckets.get(section) ?? [];
    bucket.push(field);
    buckets.set(section, bucket);
  }
  const seen = new Set<string>();
  const result: { name: string; fields: FieldDef[] }[] = [];
  for (const name of [...(resource.sections ?? []), ...buckets.keys()]) {
    if (seen.has(name)) continue;
    seen.add(name);
    const fields = buckets.get(name);
    if (fields?.length) result.push({ name, fields });
  }
  return result;
}
