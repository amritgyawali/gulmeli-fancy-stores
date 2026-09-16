export type RecordData = { id: string; [key: string]: unknown };
export type SnapshotData = Record<string, RecordData[]>;
export type RecordChange = {
  collection: string;
  id: string;
  before: RecordData | null;
  after: RecordData | null;
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// JSON object key order is immaterial to PostgreSQL jsonb.
export function equalData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a),
    right = Object.keys(b);
  return (
    left.length === right.length &&
    left.every(
      (key) =>
        Object.hasOwn(b, key) &&
        equalData(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    )
  );
}

/** Acknowledged server records, separate from unsaved edits on this device. */
export class AdminSync {
  private baseline: SnapshotData = {};
  private queue: Promise<void> = Promise.resolve();
  private writes = 0;
  get busy() {
    return this.writes > 0;
  }
  adopt(remote: SnapshotData) {
    this.baseline = clone(remote);
  }
  changes(current: SnapshotData): RecordChange[] {
    const changes: RecordChange[] = [];
    for (const collection of new Set([
      ...Object.keys(this.baseline),
      ...Object.keys(current),
    ])) {
      const before = new Map(
        (this.baseline[collection] ?? []).map((r) => [r.id, r]),
      );
      const after = new Map((current[collection] ?? []).map((r) => [r.id, r]));
      for (const id of new Set([...before.keys(), ...after.keys()])) {
        const a = before.get(id) ?? null,
          b = after.get(id) ?? null;
        if (!equalData(a, b))
          changes.push({ collection, id, before: a, after: b });
      }
    }
    return changes;
  }
  merge(current: SnapshotData, remote: SnapshotData): SnapshotData {
    if (this.busy) return current;
    const pending = this.changes(current);
    const result = clone(remote);
    const nextBaseline = clone(remote);
    for (const change of pending) {
      for (const [target, record] of [
        [result, change.after],
        [nextBaseline, change.before],
      ] as const) {
        target[change.collection] = (target[change.collection] ?? []).filter(
          (r) => r.id !== change.id,
        );
        if (record) target[change.collection].push(clone(record));
      }
    }
    this.baseline = nextBaseline;
    return result;
  }
  push(
    current: SnapshotData,
    commit: (changes: RecordChange[]) => Promise<void>,
  ): Promise<void> {
    const captured = clone(current);
    this.writes++;
    const task = this.queue
      .catch(() => undefined)
      .then(async () => {
        const changes = this.changes(captured);
        if (changes.length) await commit(changes);
        this.baseline = captured;
      })
      .finally(() => {
        this.writes--;
      });
    this.queue = task;
    return task;
  }
}
