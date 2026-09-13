import { createId } from "./ids.ts";
import { runQuery, type Page, type Query } from "./query.ts";
import {
  SYSTEM_ACTOR,
  type Actor,
  type AdminRecord,
  type AuditAction,
  type AuditEntry,
  type Revision,
} from "./types.ts";

export const AUDIT_COLLECTION = "audit_logs";
export const REVISION_COLLECTION = "revisions";

/** Writes to these collections are never themselves audited or versioned. */
const BOOKKEEPING = new Set([AUDIT_COLLECTION, REVISION_COLLECTION]);

const MAX_REVISIONS_PER_RECORD = 25;
const MAX_AUDIT_ENTRIES = 3000;

export type Snapshot = Record<string, AdminRecord[]>;

export interface WriteOptions {
  actor?: Actor;
  /** Skips audit and revision bookkeeping - used by seeding and bulk internals. */
  silent?: boolean;
  /** Human-readable label recorded on the revision and the audit entry. */
  label?: string;
}

function now(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function labelOf(record: AdminRecord | null): string {
  if (!record) return "";
  for (const key of [
    "name",
    "title",
    "number",
    "code",
    "subject",
    "reference",
  ]) {
    const value = record[key];
    if (typeof value === "string" && value) return value;
  }
  return record.id;
}

/** Field-level diff, ignoring the bookkeeping fields the store owns. */
export function diffRecords(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): { field: string; before: unknown; after: unknown }[] {
  const ignored = new Set(["updatedAt", "revision"]);
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  const changes: { field: string; before: unknown; after: unknown }[] = [];
  for (const key of keys) {
    if (ignored.has(key)) continue;
    const left = before ? before[key] : undefined;
    const right = after[key];
    if (JSON.stringify(left) !== JSON.stringify(right))
      changes.push({ field: key, before: left, after: right });
  }
  return changes;
}

/**
 * In-memory document store with the bookkeeping every admin screen needs:
 * soft delete and trash, revision history, an audit trail, explicit ordering
 * and bulk edits. Persistence is delegated to the caller through `onChange`,
 * so the same store backs the local adapter and a server-backed one.
 */
export class AdminStore {
  private data: Snapshot;
  private readonly listeners = new Set<(collection: string) => void>();

  constructor(snapshot: Snapshot = {}) {
    this.data = clone(snapshot);
  }

  subscribe(listener: (collection: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(collection: string) {
    for (const listener of [...this.listeners]) listener(collection);
  }

  replaceAll(snapshot: Snapshot): void {
    this.data = clone(snapshot);
    this.emit("*");
  }

  snapshot(): Snapshot {
    return clone(this.data);
  }

  collections(): string[] {
    return Object.keys(this.data);
  }

  raw(collection: string): AdminRecord[] {
    return this.data[collection] ?? [];
  }

  all<T extends AdminRecord = AdminRecord>(
    collection: string,
    includeDeleted = false,
  ): T[] {
    const records = this.raw(collection) as T[];
    return includeDeleted
      ? [...records]
      : records.filter((record) => !record.deletedAt);
  }

  list<T extends AdminRecord = AdminRecord>(
    collection: string,
    query: Query = {},
  ): Page<T> {
    return runQuery(this.raw(collection) as T[], query);
  }

  count(collection: string, query: Query = {}): number {
    return this.list(collection, { ...query, pageSize: 1 }).total;
  }

  get<T extends AdminRecord = AdminRecord>(
    collection: string,
    id: string,
  ): T | null {
    return (
      (this.raw(collection).find((record) => record.id === id) as
        T | undefined) ?? null
    );
  }

  findBy<T extends AdminRecord = AdminRecord>(
    collection: string,
    field: string,
    value: unknown,
  ): T | null {
    return (
      (this.raw(collection).find((record) => record[field] === value) as
        T | undefined) ?? null
    );
  }

  create<T extends AdminRecord = AdminRecord>(
    collection: string,
    values: Partial<T>,
    options: WriteOptions = {},
  ): T {
    const timestamp = now();
    const record = {
      ...values,
      id: values.id ?? createId(collection.slice(0, 4)),
      createdAt: values.createdAt ?? timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      revision: 1,
    } as T;
    this.data[collection] = [...this.raw(collection), record];
    this.afterWrite(collection, record, null, "create", options);
    return record;
  }

  update<T extends AdminRecord = AdminRecord>(
    collection: string,
    id: string,
    values: Partial<T>,
    options: WriteOptions = {},
  ): T | null {
    const records = this.raw(collection);
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return null;
    const before = records[index] as T;
    const next = {
      ...before,
      ...values,
      id: before.id,
      createdAt: before.createdAt,
      updatedAt: now(),
      revision: before.revision + 1,
    } as T;
    const copy = [...records];
    copy[index] = next;
    this.data[collection] = copy;
    this.afterWrite(collection, next, before, "update", options);
    return next;
  }

  /** Moves a record to the trash; recoverable from Trash. */
  remove(collection: string, id: string, options: WriteOptions = {}): boolean {
    const record = this.get(collection, id);
    if (!record || record.deletedAt) return false;
    this.update(
      collection,
      id,
      { deletedAt: now() },
      { ...options, silent: true },
    );
    this.writeAudit(
      collection,
      this.get(collection, id),
      "delete",
      [],
      options,
    );
    this.emit(collection);
    return true;
  }

  restore(collection: string, id: string, options: WriteOptions = {}): boolean {
    const record = this.get(collection, id);
    if (!record?.deletedAt) return false;
    this.update(
      collection,
      id,
      { deletedAt: null },
      { ...options, silent: true },
    );
    this.writeAudit(
      collection,
      this.get(collection, id),
      "restore",
      [],
      options,
    );
    this.emit(collection);
    return true;
  }

  /** Irreversible delete; also drops the record's revision history. */
  purge(collection: string, id: string, options: WriteOptions = {}): boolean {
    const record = this.get(collection, id);
    if (!record) return false;
    this.data[collection] = this.raw(collection).filter(
      (entry) => entry.id !== id,
    );
    this.data[REVISION_COLLECTION] = this.raw(REVISION_COLLECTION).filter(
      (entry) => !(entry.resource === collection && entry.recordId === id),
    );
    this.writeAudit(collection, record, "purge", [], options);
    this.emit(collection);
    return true;
  }

  /** Deletes trashed records older than `days`; the automatic trash cleanup. */
  emptyTrash(days: number, options: WriteOptions = {}): number {
    const cutoff = Date.now() - days * 86_400_000;
    let removed = 0;
    for (const collection of this.collections()) {
      if (BOOKKEEPING.has(collection)) continue;
      for (const record of this.all(collection, true)) {
        if (record.deletedAt && Date.parse(record.deletedAt) < cutoff) {
          this.purge(collection, record.id, { ...options, silent: true });
          removed += 1;
        }
      }
    }
    if (removed)
      this.writeAudit("trash", null, "purge", [], {
        ...options,
        label: `${removed} record(s)`,
      });
    return removed;
  }

  duplicate<T extends AdminRecord = AdminRecord>(
    collection: string,
    id: string,
    overrides: Partial<T> = {},
    options: WriteOptions = {},
  ): T | null {
    const source = this.get<T>(collection, id);
    if (!source) return null;
    const copy: Record<string, unknown> = clone(source);
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.revision;
    if (typeof copy.name === "string") copy.name = `${copy.name} (copy)`;
    if (typeof copy.title === "string") copy.title = `${copy.title} (copy)`;
    if (typeof copy.slug === "string") copy.slug = `${copy.slug}-copy`;
    if (typeof copy.sku === "string") copy.sku = `${copy.sku}-COPY`;
    if (typeof copy.status === "string") copy.status = "draft";
    return this.create<T>(
      collection,
      { ...(copy as Partial<T>), ...overrides },
      options,
    );
  }

  /** Applies one patch to many records under a single audit entry. */
  bulkUpdate<T extends AdminRecord = AdminRecord>(
    collection: string,
    ids: string[],
    values: Partial<T>,
    options: WriteOptions = {},
  ): number {
    let changed = 0;
    for (const id of ids)
      if (this.update(collection, id, values, { ...options, silent: true }))
        changed += 1;
    if (changed) {
      this.writeAudit(
        collection,
        null,
        "bulk",
        Object.entries(values).map(([field, after]) => ({
          field,
          before: undefined,
          after,
        })),
        { ...options, label: options.label ?? `${changed} record(s) updated` },
      );
      this.emit(collection);
    }
    return changed;
  }

  bulkRemove(
    collection: string,
    ids: string[],
    options: WriteOptions = {},
  ): number {
    let changed = 0;
    for (const id of ids)
      if (this.remove(collection, id, { ...options, silent: true }))
        changed += 1;
    if (changed) {
      this.writeAudit(collection, null, "bulk", [], {
        ...options,
        label: `${changed} record(s) moved to trash`,
      });
      this.emit(collection);
    }
    return changed;
  }

  /** Persists an explicit ordering; `sortOrder` drives every storefront list. */
  reorder(
    collection: string,
    orderedIds: string[],
    options: WriteOptions = {},
  ): void {
    orderedIds.forEach((id, index) => {
      this.update(
        collection,
        id,
        { sortOrder: index },
        { ...options, silent: true },
      );
    });
    this.writeAudit(collection, null, "update", [], {
      ...options,
      label: `${orderedIds.length} record(s) reordered`,
    });
    this.emit(collection);
  }

  /** Moves a record one slot up (-1) or down (+1) in the manual ordering. */
  move(
    collection: string,
    id: string,
    delta: number,
    options: WriteOptions = {},
  ): boolean {
    const ordered = this.all(collection).sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
    const index = ordered.findIndex((record) => record.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= ordered.length) return false;
    const copy = [...ordered];
    const [moved] = copy.splice(index, 1);
    if (!moved) return false;
    copy.splice(target, 0, moved);
    this.reorder(
      collection,
      copy.map((record) => record.id),
      options,
    );
    return true;
  }

  revisions(collection: string, id: string): Revision[] {
    return (this.raw(REVISION_COLLECTION) as Revision[])
      .filter((entry) => entry.resource === collection && entry.recordId === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Restores a record to an earlier revision, keeping the history intact. */
  restoreRevision(
    revisionId: string,
    options: WriteOptions = {},
  ): AdminRecord | null {
    const revision = this.get<Revision>(REVISION_COLLECTION, revisionId);
    if (!revision) return null;
    const {
      id: _id,
      createdAt: _createdAt,
      revision: _rev,
      ...values
    } = revision.snapshot as Record<string, unknown>;
    const restored = this.update(revision.resource, revision.recordId, values, {
      ...options,
      silent: true,
    });
    this.writeAudit(revision.resource, restored, "rollback", [], {
      ...options,
      label: `Restored the version saved at ${revision.createdAt}`,
    });
    this.emit(revision.resource);
    return restored;
  }

  audit(query: Query = {}): Page<AuditEntry> {
    return this.list<AuditEntry>(AUDIT_COLLECTION, {
      sort: "createdAt",
      direction: "desc",
      ...query,
    });
  }

  /** Records something that is not a record write: logins, exports, automation runs. */
  log(
    action: AuditAction,
    resource: string,
    label: string,
    actor?: Actor,
  ): void {
    this.writeAudit(resource, null, action, [], { actor, label });
    this.emit(AUDIT_COLLECTION);
  }

  private afterWrite(
    collection: string,
    record: AdminRecord,
    before: AdminRecord | null,
    action: "create" | "update",
    options: WriteOptions,
  ) {
    if (!options.silent && !BOOKKEEPING.has(collection)) {
      this.writeRevision(collection, record, options);
      this.writeAudit(
        collection,
        record,
        action,
        diffRecords(before, record),
        options,
      );
    }
    this.emit(collection);
  }

  private writeRevision(
    collection: string,
    record: AdminRecord,
    options: WriteOptions,
  ) {
    const actor = options.actor ?? SYSTEM_ACTOR;
    const entry: Revision = {
      id: createId("rev"),
      createdAt: now(),
      updatedAt: now(),
      revision: 1,
      resource: collection,
      recordId: record.id,
      snapshot: clone(record) as Record<string, unknown>,
      actorName: actor.name,
      label: options.label ?? `Version ${record.revision}`,
    };
    const existing = this.raw(REVISION_COLLECTION) as Revision[];
    const keep = new Set(
      existing
        .filter(
          (item) => item.resource === collection && item.recordId === record.id,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, MAX_REVISIONS_PER_RECORD - 1)
        .map((item) => item.id),
    );
    this.data[REVISION_COLLECTION] = [
      entry,
      ...existing.filter(
        (item) =>
          !(item.resource === collection && item.recordId === record.id) ||
          keep.has(item.id),
      ),
    ];
  }

  private writeAudit(
    collection: string,
    record: AdminRecord | null,
    action: AuditAction,
    changes: AuditEntry["changes"],
    options: WriteOptions,
  ) {
    if (BOOKKEEPING.has(collection)) return;
    const actor = options.actor ?? SYSTEM_ACTOR;
    const entry: AuditEntry = {
      id: createId("aud"),
      createdAt: now(),
      updatedAt: now(),
      revision: 1,
      actorId: actor.id,
      actorName: actor.name,
      action,
      resource: collection,
      recordId: record?.id ?? null,
      recordLabel: options.label ?? labelOf(record),
      changes,
    };
    this.data[AUDIT_COLLECTION] = [entry, ...this.raw(AUDIT_COLLECTION)].slice(
      0,
      MAX_AUDIT_ENTRIES,
    );
  }
}
