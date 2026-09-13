export type FieldType =
  | "text"
  | "slug"
  | "textarea"
  | "richtext"
  | "number"
  | "currency"
  | "percent"
  | "boolean"
  | "select"
  | "multiselect"
  | "tags"
  | "date"
  | "datetime"
  | "time"
  | "color"
  | "image"
  | "images"
  | "email"
  | "phone"
  | "url"
  | "relation"
  | "json"
  | "repeater"
  | "code"
  | "secret"
  | "readonly";

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  /** Editor tab this field is rendered under. */
  section?: string;
  width?: "full" | "half" | "third";
  options?: Option[];
  /** Target collection for `relation` fields. */
  resource?: string;
  multiple?: boolean;
  min?: number;
  max?: number;
  rows?: number;
  /** Sub-fields of a `repeater`. */
  fields?: FieldDef[];
  readOnly?: boolean;
  /** Hides the field unless the predicate passes; drives conditional forms. */
  showIf?: (values: Record<string, unknown>) => boolean;
  /** Slug-style fields fill themselves in from this field until edited. */
  derivedFrom?: string;
}

type Extra = Partial<Omit<FieldDef, "name" | "label" | "type">>;

const make =
  (type: FieldType) =>
  (name: string, label: string, extra: Extra = {}): FieldDef => ({
    name,
    label,
    type,
    ...extra,
  });

export const f = {
  text: make("text"),
  slug: make("slug"),
  textarea: make("textarea"),
  richtext: make("richtext"),
  number: make("number"),
  currency: make("currency"),
  percent: make("percent"),
  boolean: make("boolean"),
  tags: make("tags"),
  date: make("date"),
  datetime: make("datetime"),
  time: make("time"),
  color: make("color"),
  image: make("image"),
  images: make("images"),
  email: make("email"),
  phone: make("phone"),
  url: make("url"),
  json: make("json"),
  code: make("code"),
  secret: make("secret"),
  readonly: make("readonly"),
  select: (
    name: string,
    label: string,
    choices: Option[],
    extra: Extra = {},
  ): FieldDef => ({
    name,
    label,
    type: "select",
    options: choices,
    ...extra,
  }),
  multiselect: (
    name: string,
    label: string,
    choices: Option[],
    extra: Extra = {},
  ): FieldDef => ({
    name,
    label,
    type: "multiselect",
    options: choices,
    ...extra,
  }),
  relation: (
    name: string,
    label: string,
    resource: string,
    extra: Extra = {},
  ): FieldDef => ({
    name,
    label,
    type: "relation",
    resource,
    ...extra,
  }),
  repeater: (
    name: string,
    label: string,
    fields: FieldDef[],
    extra: Extra = {},
  ): FieldDef => ({
    name,
    label,
    type: "repeater",
    fields,
    ...extra,
  }),
};

/** Builds select options, title-casing bare string values. */
export function options(...values: (string | [string, string])[]): Option[] {
  return values.map((value) =>
    Array.isArray(value)
      ? { value: value[0], label: value[1] }
      : {
          value,
          label: value
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (character) => character.toUpperCase()),
        },
  );
}

export function emptyValue(field: FieldDef): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  switch (field.type) {
    case "boolean":
      return false;
    case "number":
    case "currency":
    case "percent":
      return 0;
    case "tags":
    case "multiselect":
    case "images":
    case "repeater":
      return [];
    case "relation":
      return field.multiple ? [] : null;
    case "json":
      return {};
    default:
      return "";
  }
}

export function initialValues(fields: FieldDef[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) values[field.name] = emptyValue(field);
  return values;
}

export interface FieldError {
  field: string;
  message: string;
}

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Validates required-ness, ranges and formats before a record is saved. */
export function validate(
  fields: FieldDef[],
  values: Record<string, unknown>,
): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of fields) {
    if (field.showIf && !field.showIf(values)) continue;
    const value = values[field.name];
    if (field.required && isBlank(value)) {
      errors.push({
        field: field.name,
        message: `${field.label} is required.`,
      });
      continue;
    }
    if (isBlank(value)) continue;

    if (
      field.type === "number" ||
      field.type === "currency" ||
      field.type === "percent"
    ) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a number.`,
        });
      } else if (field.min !== undefined && numeric < field.min) {
        errors.push({
          field: field.name,
          message: `${field.label} cannot be below ${field.min}.`,
        });
      } else if (field.max !== undefined && numeric > field.max) {
        errors.push({
          field: field.name,
          message: `${field.label} cannot be above ${field.max}.`,
        });
      }
    }
    if (
      field.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    )
      errors.push({
        field: field.name,
        message: `${field.label} must be a valid email address.`,
      });
    if (field.type === "url" && !/^https?:\/\/.+/.test(String(value)))
      errors.push({
        field: field.name,
        message: `${field.label} must start with http:// or https://.`,
      });
    if (field.type === "slug" && !/^[a-z0-9-]+$/.test(String(value)))
      errors.push({
        field: field.name,
        message: `${field.label} may only use lowercase letters, numbers and dashes.`,
      });
    if (field.type === "color" && !/^#[0-9a-fA-F]{6}$/.test(String(value)))
      errors.push({
        field: field.name,
        message: `${field.label} must be a hex colour such as #f85606.`,
      });
  }
  return errors;
}

/** Turns raw editor input into the type the record stores. */
export function coerce(field: FieldDef, value: unknown): unknown {
  switch (field.type) {
    case "number":
    case "currency":
    case "percent": {
      if (value === "" || value === null || value === undefined) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }
    case "boolean":
      return Boolean(value);
    case "tags":
    case "multiselect":
      return Array.isArray(value)
        ? value
        : String(value ?? "")
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);
    default:
      return value;
  }
}

/** Applies `coerce` across a whole form payload. */
export function coerceAll(
  fields: FieldDef[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...values };
  for (const field of fields) {
    if (field.name in values)
      result[field.name] = coerce(field, values[field.name]);
  }
  return result;
}
