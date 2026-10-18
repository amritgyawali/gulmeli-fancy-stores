import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const ADMIN = "11111111-1111-1111-1111-111111111111",
  CUSTOMER = "22222222-2222-2222-2222-222222222222";
const asUser = (id: string) =>
  `set role authenticated; set request.jwt.claim.sub='${id}';`;
const file = (path: string) =>
  readFileSync(new URL(`../supabase/${path}`, import.meta.url), "utf8");

test("clothing catalogue: switches the live store, and orders keep sizes and colours", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users values('${ADMIN}'),('${CUSTOMER}');`);
    await db.exec(file("deploy.sql"));
    // A store that still sells groceries, with its own published wording.
    await db.exec(`insert into public.admin_data(collection,id,document) values
      ('categories','cat_groceries','{"id":"cat_groceries","name":"Groceries","enabled":true}'),
      ('products','dabur','{"id":"dabur","name":"Dabur Glucose D","price":177,"stock":6,"status":"published","categoryId":"cat_groceries"}');
      insert into public.app_config(id,published) values('storefront','{"branding":{"tagline":"Everyday fancy goods, delivered."},"text":{"homeHeading":"My own heading"}}');`);
    assert.equal(
      (await db.query<{ active: boolean }>("select active from products where id='dabur'")).rows[0].active,
      true,
    );

    await db.exec(file("clothing-catalog.sql"));
    await db.exec(file("clothing-catalog.sql")); // Safe to rerun.

    const active = (
      await db.query<{ id: string; category: string }>("select id, category from products where active order by id")
    ).rows;
    assert.ok(active.length > 40, "the clothing catalogue is on sale");
    assert.ok(!active.some((p) => p.id === "dabur"), "groceries leave the storefront");
    assert.deepEqual(
      [...new Set(active.map((p) => p.category))].sort(),
      ["Accessories", "Activewear", "Ethnic Wear", "Kids", "Men", "Winter Wear", "Women"],
    );
    assert.equal(
      (await db.query<{ status: string }>("select document->>'status' as status from admin_data where collection='products' and id='dabur'")).rows[0].status,
      "archived",
      "the old product stays in the dashboard, archived",
    );
    const config = (await db.query<{ published: Record<string, Record<string, string>> }>("select published from app_config")).rows[0].published;
    assert.equal(config.branding.tagline, "Fashion for every season, delivered.");
    assert.equal(config.text.homeHeading, "My own heading", "wording the owner changed is kept");

    const tee = (
      await db.query<{ price: string; stock: number; details: Record<string, unknown> }>(
        "select price, stock, details from products where id='men-oversized-tee'",
      )
    ).rows[0];
    assert.equal(Number(tee.price), 699);
    assert.equal(Number(tee.details.originalPrice), 1199);
    assert.deepEqual(tee.details.sizes, ["S", "M", "L", "XL", "XXL"]);
    assert.equal(tee.details.fabric, "100% combed cotton, 220 GSM");
    assert.ok(Array.isArray(tee.details.care) && tee.details.care.length > 0);
    assert.ok(Array.isArray(tee.details.variants) && tee.details.variants.length === 15);

    // Sizes edited in the dashboard reach the storefront.
    await db.exec(`reset role; insert into admin_members(user_id,role) values('${ADMIN}','super_admin');`);
    await db.exec(asUser(ADMIN));
    const before = (
      await db.query<{ document: Record<string, unknown> }>("select document from admin_data where collection='products' and id='men-chinos'")
    ).rows[0].document;
    const after = {
      ...before,
      careInstructions: "Dry clean only",
      variants: [{ title: "32", size: "32", color: "Khaki", stock: 4 }],
    };
    await db.query("select public.save_admin_changes($1::jsonb)", [
      JSON.stringify([{ collection: "products", id: "men-chinos", before, after }]),
    ]);
    const chinos = (
      await db.query<{ details: Record<string, unknown> }>("select details from products where id='men-chinos'")
    ).rows[0].details;
    assert.deepEqual(chinos.care, ["Dry clean only"]);
    assert.deepEqual(chinos.variants, [{ title: "32", size: "32", color: "Khaki", stock: 4 }]);

    // The same T-shirt in two sizes is one order with two lines.
    await db.exec(asUser(CUSTOMER));
    const profile = { name: "Test Buyer", phone: "9800000000", address: "Kathmandu test address" };
    const order = (
      await db.query<{ place_order: { items: Record<string, unknown>[]; subtotal: number } }>(
        "select place_order($1::jsonb,$2::jsonb,'', 'clothing-order-1')",
        [
          JSON.stringify([
            { productId: "men-oversized-tee", quantity: 2, size: "M", color: "Black" },
            { productId: "men-oversized-tee", quantity: 1, size: "L", color: "Black" },
          ]),
          JSON.stringify(profile),
        ],
      )
    ).rows[0].place_order;
    assert.equal(order.items.length, 2);
    assert.deepEqual(
      order.items.map((i) => [i.size, i.color, i.quantity]).sort(),
      [["L", "Black", 1], ["M", "Black", 2]],
    );
    assert.equal(Number(order.subtotal), 699 * 3);
    assert.equal(
      (await db.query<{ stock: number }>("select stock from products where id='men-oversized-tee'")).rows[0].stock,
      117,
      "both sizes draw on the product's stock",
    );
    await db.exec("reset role;");
    const adminOrder = (
      await db.query<{ lines: Record<string, unknown>[] }>(
        "select document->'lines' as lines from admin_data where collection='orders'",
      )
    ).rows[0].lines;
    assert.ok(
      adminOrder.some((l) => l.size === "M" && l.color === "Black" && l.variant === "M / Black"),
      "the dashboard order shows what to pack",
    );

    await db.exec(asUser(CUSTOMER));
    await assert.rejects(
      db.query("select place_order($1::jsonb,$2::jsonb,'', 'clothing-order-2')", [
        JSON.stringify([
          { productId: "men-oversized-tee", quantity: 1, size: "M" },
          { productId: "men-oversized-tee", quantity: 1, size: "M" },
        ]),
        JSON.stringify(profile),
      ]),
      /Duplicate/,
    );
    await assert.rejects(
      db.query("select place_order($1::jsonb,$2::jsonb,'', 'clothing-order-3')", [
        JSON.stringify([{ productId: "men-oversized-tee", quantity: 1, size: "XS" }]),
        JSON.stringify(profile),
      ]),
      /Size XS is no longer available/,
    );
    await assert.rejects(
      db.query("select place_order($1::jsonb,$2::jsonb,'', 'clothing-order-4')", [
        JSON.stringify([
          { productId: "choice-floral-kurta-set", quantity: 3, size: "S" },
          { productId: "choice-floral-kurta-set", quantity: 3, size: "M" },
        ]),
        JSON.stringify(profile),
      ]),
      /Not enough stock/,
      "lines of one product cannot together oversell it",
    );
  } finally {
    await db.close();
  }
});
