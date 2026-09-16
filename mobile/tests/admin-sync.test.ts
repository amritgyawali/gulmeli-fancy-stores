import { test } from "node:test";
import assert from "node:assert/strict";
import { AdminSync, equalData } from "../../shared/admin-sync.ts";
import {
  uploadTarget,
  signingText,
  validDeletionId,
} from "../supabase/functions/cloudinary-media/policy.ts";

test("remote deletion and updates merge while preserving only unsaved local edits", () => {
  const sync = new AdminSync();
  sync.adopt({
    products: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  });
  const merged = sync.merge(
    {
      products: [
        { id: "a", name: "Edited" },
        { id: "b", name: "B" },
      ],
    },
    {
      products: [
        { id: "a", name: "A" },
        { id: "c", name: "C" },
      ],
    },
  );
  assert.deepEqual(merged.products, [
    { id: "c", name: "C" },
    { id: "a", name: "Edited" },
  ]);
  assert.deepEqual(
    sync.changes(merged).map((c) => c.id),
    ["a"],
  );
});
test("a network error does not poison future saves and failed writes remain pending", async () => {
  const sync = new AdminSync();
  sync.adopt({ products: [{ id: "a", stock: 4 }] });
  const next = { products: [{ id: "a", stock: 6 }] };
  await assert.rejects(
    sync.push(next, async () => {
      throw Error("offline");
    }),
  );
  assert.equal(sync.changes(next).length, 1);
  await sync.push(next, async (changes) => {
    assert.equal(changes[0].before?.stock, 4);
  });
  assert.equal(sync.changes(next).length, 0);
});
test("concurrent remote edits retain the original expectation for conflict detection", () => {
  const sync = new AdminSync();
  sync.adopt({ products: [{ id: "a", stock: 4 }] });
  const merged = sync.merge(
    { products: [{ id: "a", stock: 6 }] },
    { products: [{ id: "a", stock: 2 }] },
  );
  assert.equal(sync.changes(merged)[0].before?.stock, 4);
  assert.equal(sync.changes(merged)[0].after?.stock, 6);
  assert.equal(equalData({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 }), true);
});
test("customers cannot overwrite store media or another avatar", () => {
  assert.equal(
    uploadTarget({ image: "data:image/png;base64,AAAA" }, "user-a", false),
    "gulmeli/avatars/user-a",
  );
  assert.throws(() =>
    uploadTarget(
      {
        image: "data:image/png;base64,AAAA",
        publicId: "gulmeli/avatars/user-b",
      },
      "user-a",
      false,
    ),
  );
  assert.throws(() =>
    uploadTarget(
      { dataUri: "data:image/png;base64,AAAA", folder: "gulmeli/media" },
      "user-a",
      false,
    ),
  );
  assert.equal(validDeletionId("gulmeli/media/photo-1"), true);
  assert.equal(validDeletionId("unrelated/photo"), false);
  assert.equal(validDeletionId("gulmeli/../photo"), false);
  assert.equal(
    signingText(
      { timestamp: "123", public_id: "gulmeli/media/a", invalidate: "true" },
      "secret",
    ),
    "invalidate=true&public_id=gulmeli/media/a&timestamp=123secret",
  );
});
