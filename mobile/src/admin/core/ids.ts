let counter = 0;

/** Sortable-ish, collision-resistant id that works on web, native and Node. */
export function createId(prefix = "rec"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Deterministic order/return/invoice references without a server sequence. */
export function nextNumber(prefix: string, existing: string[]): string {
  const highest = existing.reduce((max, value) => {
    const match = /(\d+)$/.exec(value);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}
