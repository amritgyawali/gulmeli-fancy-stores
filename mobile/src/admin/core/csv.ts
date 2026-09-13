import type { AdminRecord } from "./types.ts";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialises records to CSV using the given columns, in order. */
export function toCsv(
  records: Record<string, unknown>[],
  columns: string[],
): string {
  const header = columns.map(cell).join(",");
  const rows = records.map((record) =>
    columns.map((column) => cell(record[column])).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Splits one CSV line, honouring quoted fields and escaped quotes. */
export function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = false;
      } else current += character;
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      values.push(current);
      current = "";
    } else current += character;
  }
  values.push(current);
  return values;
}

export interface ImportRow {
  line: number;
  values: Record<string, string>;
}

export interface ImportResult {
  columns: string[];
  rows: ImportRow[];
  errors: { line: number; message: string }[];
}

/** Parses a CSV document, reporting per-line problems rather than throwing. */
export function parseCsv(text: string): ImportResult {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line, index) => line.trim() !== "" || index === 0);
  const errors: { line: number; message: string }[] = [];
  if (!lines.length || !lines[0]?.trim()) {
    return {
      columns: [],
      rows: [],
      errors: [{ line: 1, message: "The file is empty." }],
    };
  }
  const columns = parseCsvLine(lines[0]).map((column) => column.trim());
  const rows: ImportRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const raw = lines[index];
    if (raw === undefined) continue;
    const cells = parseCsvLine(raw);
    if (cells.length !== columns.length) {
      errors.push({
        line: index + 1,
        message: `Expected ${columns.length} columns but found ${cells.length}.`,
      });
      continue;
    }
    const values: Record<string, string> = {};
    columns.forEach((column, position) => {
      values[column] = (cells[position] ?? "").trim();
    });
    rows.push({ line: index + 1, values });
  }
  return { columns, rows, errors };
}

/** Flattens records so nested values survive a round trip through CSV. */
export function flattenForExport(
  records: AdminRecord[],
  columns: string[],
): Record<string, unknown>[] {
  return records.map((record) => {
    const row: Record<string, unknown> = {};
    for (const column of columns) row[column] = record[column];
    return row;
  });
}
