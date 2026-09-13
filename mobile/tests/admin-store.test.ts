import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminStore, AUDIT_COLLECTION } from "../src/admin/core/store.ts";
import { runQuery } from "../src/admin/core/query.ts";
import type { AdminRecord, Actor } from "../src/admin/core/types.ts";

const actor: Actor = { id: "u1", name: "Owner", roleId: "super_admin" };

function record(id: string, extra: Record<string, unknown> = {}): AdminRecord {
  return {
    id,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    revision: 1,
    ...extra,
  };
}

test("query filters, searches, sorts and paginates without mutating the source", () => {
  const records = [
    record("a", {
      name: "Tactical Belt",
      price: 379,
      stock: 4,
      tags: ["fashion"],
    }),
    record("b", {
      name: "Ice Silk Polo",
      price: 499,
      stock: 0,
      tags: ["fashion", "summer"],
    }),
    record("c", {
      name: "Mechanical Watch",
      price: 3200,
      stock: 12,
      tags: ["electronics"],
    }),
    record("d", {
      name: "Deleted item",
      price: 10,
      stock: 1,
      deletedAt: "2026-01-02T00:00:00.000Z",
    }),
  ];
  const snapshot = JSON.stringify(records);

  assert.equal(
    runQuery(records).total,
    3,
    "trashed records are hidden by default",
  );
  assert.equal(runQuery(records, { onlyDeleted: true }).total, 1);
  assert.equal(
    runQuery(records, { search: "silk", searchFields: ["name"] }).total,
    1,
  );
  assert.equal(
    runQuery(records, { search: "summer", searchFields: ["tags"] }).total,
    1,
  );
  assert.equal(
    runQuery(records, {
      filters: [{ field: "price", operator: "between", value: [300, 600] }],
    }).total,
    2,
  );
  assert.equal(
    runQuery(records, {
      filters: [{ field: "stock", operator: "gt", value: 0 }],
    }).total,
    2,
  );

  const sorted = runQuery(records, { sort: "price", direction: "asc" });
  assert.deepEqual(
    sorted.items.map((item) => item.id),
    ["a", "b", "c"],
  );

  const paged = runQuery(records, {
    sort: "price",
    direction: "asc",
    pageSize: 2,
    page: 2,
  });
  assert.equal(paged.pageCount, 2);
  assert.deepEqual(
    paged.items.map((item) => item.id),
    ["c"],
  );

  // An out-of-range page clamps rather than returning nothing.
  assert.equal(runQuery(records, { pageSize: 2, page: 99 }).page, 2);
  assert.equal(
    JSON.stringify(records),
    snapshot,
    "runQuery must not mutate its input",
  );
});

test("an empty filter value is ignored instead of matching nothing", () => {
  const records = [
    record("a", { status: "published" }),
    record("b", { status: "draft" }),
  ];
  assert.equal(
    runQuery(records, {
      filters: [{ field: "status", operator: "eq", value: "" }],
    }).total,
    2,
  );
  assert.equal(
    runQuery(records, {
      filters: [{ field: "status", operator: "in", value: [] }],
    }).total,
    2,
  );
});

test("create, update and delete keep an audit trail and version history", () => {
  const store = new AdminStore({ products: [] });
  const created = store.create(
    "products",
    { name: "Belt", price: 379 },
    { actor },
  );
  assert.equal(created.revision, 1);

  const updated = store.update(
    "products",
    created.id,
    { price: 420 },
    { actor },
  );
  assert.equal(updated?.revision, 2);
  assert.equal(updated?.price, 420);

  const versions = store.revisions("products", created.id);
  assert.equal(versions.length, 2, "one version per write");

  const audit = store.audit().items;
  assert.deepEqual(
    audit.map((entry) => entry.action),
    ["update", "create"],
  );
  const priceChange = audit[0]?.changes.find(
    (change) => change.field === "price",
  );
  assert.deepEqual(
    { before: priceChange?.before, after: priceChange?.after },
    { before: 379, after: 420 },
  );
  assert.equal(audit[0]?.actorName, "Owner");
});

test("delete is recoverable and purge is not", () => {
  const store = new AdminStore({ products: [] });
  const product = store.create("products", { name: "Belt" }, { actor });

  assert.equal(store.remove("products", product.id, { actor }), true);
  assert.equal(store.list("products").total, 0);
  assert.equal(store.list("products", { onlyDeleted: true }).total, 1);

  assert.equal(store.restore("products", product.id, { actor }), true);
  assert.equal(store.list("products").total, 1);

  store.remove("products", product.id, { actor });
  assert.equal(store.purge("products", product.id, { actor }), true);
  assert.equal(store.list("products", { includeDeleted: true }).total, 0);
  assert.equal(
    store.revisions("products", product.id).length,
    0,
    "purge clears history too",
  );
});

test("restoring a revision brings back the earlier values", () => {
  const store = new AdminStore({ products: [] });
  const product = store.create(
    "products",
    { name: "Belt", price: 379 },
    { actor },
  );
  store.update("products", product.id, { price: 999 }, { actor });

  const first = store.revisions("products", product.id).at(-1);
  assert.ok(first);
  const restored = store.restoreRevision(first.id, { actor });

  assert.equal(restored?.price, 379);
  assert.equal(restored?.id, product.id, "the record keeps its identity");
  assert.ok(store.audit().items.some((entry) => entry.action === "rollback"));
});

test("duplicate resets identity, marks a draft and does not touch the original", () => {
  const store = new AdminStore({ products: [] });
  const product = store.create(
    "products",
    { name: "Belt", slug: "belt", sku: "SKU1", status: "published" },
    { actor },
  );
  const copy = store.duplicate("products", product.id, {}, { actor });

  assert.notEqual(copy?.id, product.id);
  assert.equal(copy?.name, "Belt (copy)");
  assert.equal(copy?.slug, "belt-copy");
  assert.equal(copy?.status, "draft");
  assert.equal(store.get("products", product.id)?.status, "published");
});

test("bulk edits write one audit entry, not one per record", () => {
  const store = new AdminStore({ products: [] });
  const ids = ["a", "b", "c"].map(
    (name) => store.create("products", { name }, { actor }).id,
  );
  const auditBefore = store.raw(AUDIT_COLLECTION).length;

  assert.equal(
    store.bulkUpdate("products", ids, { status: "archived" }, { actor }),
    3,
  );
  assert.equal(store.raw(AUDIT_COLLECTION).length, auditBefore + 1);
  assert.ok(
    store.all("products").every((entry) => entry.status === "archived"),
  );
});

test("reorder and move keep a stable sortOrder", () => {
  const store = new AdminStore({ categories: [] });
  const first = store.create(
    "categories",
    { name: "One", sortOrder: 0 },
    { actor },
  );
  const second = store.create(
    "categories",
    { name: "Two", sortOrder: 1 },
    { actor },
  );
  const third = store.create(
    "categories",
    { name: "Three", sortOrder: 2 },
    { actor },
  );

  store.move("categories", third.id, -1, { actor });
  const order = store
    .all("categories")
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((entry) => entry.name);
  assert.deepEqual(order, ["One", "Three", "Two"]);

  assert.equal(
    store.move("categories", first.id, -1, { actor }),
    false,
    "cannot move past the top",
  );
  store.reorder("categories", [second.id, first.id, third.id], { actor });
  assert.equal(store.get("categories", second.id)?.sortOrder, 0);
});

test("emptyTrash only removes records past the retention window", () => {
  const store = new AdminStore({ products: [] });
  const stale = store.create("products", { name: "Stale" }, { actor });
  const fresh = store.create("products", { name: "Fresh" }, { actor });
  store.remove("products", stale.id, { actor });
  store.remove("products", fresh.id, { actor });
  store.update(
    "products",
    stale.id,
    { deletedAt: new Date(Date.now() - 40 * 86_400_000).toISOString() },
    { silent: true },
  );

  assert.equal(store.emptyTrash(30, { actor }), 1);
  assert.equal(store.get("products", stale.id), null);
  assert.ok(store.get("products", fresh.id));
});

test("subscribers are notified once per write", () => {
  const store = new AdminStore({ products: [] });
  const seen: string[] = [];
  const unsubscribe = store.subscribe((collection) => seen.push(collection));
  store.create("products", { name: "Belt" }, { actor });
  unsubscribe();
  store.create("products", { name: "Ignored" }, { actor });
  assert.deepEqual(seen, ["products"]);
});
