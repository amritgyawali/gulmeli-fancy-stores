import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const OWNER = "11111111-1111-1111-1111-111111111111";
const SHOPPER = "22222222-2222-2222-2222-222222222222";
const STAFF = "33333333-3333-3333-3333-333333333333";

function migration(name: string): string {
  return readFileSync(
    new URL(`../supabase/migrations/${name}`, import.meta.url),
    "utf8",
  );
}

async function boot() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${OWNER}'),('${SHOPPER}'),('${STAFF}');
  `);
  await db.exec(migration("202609130001_store.sql"));
  await db.exec(migration("202609140001_admin_config.sql"));
  await db.exec(`
    insert into public.admin_members(user_id, role) values ('${OWNER}','super_admin'),('${STAFF}','manager');
    insert into public.products(id,name,price,stock,category) values ('a','Shirt',600,5,'Fashion');
    insert into public.products(id,name,price,stock,category,active) values ('draft','Draft item',100,1,'Fashion',false);
  `);
  return db;
}

const asUser = (id: string) =>
  `set role authenticated; set request.jwt.claim.sub = '${id}';`;

test("only admins can publish the storefront configuration, and everyone can read it", async () => {
  const db = await boot();
  try {
    await db.exec(asUser(OWNER));
    await db.query(
      "insert into public.app_config(id, published, published_by) values ('storefront', $1::jsonb, $2)",
      [JSON.stringify({ theme: { primaryColor: "#f85606" } }), OWNER],
    );

    // A shopper may read the configuration - the app needs it to render.
    await db.exec(asUser(SHOPPER));
    const read = await db.query<{
      published: { theme: { primaryColor: string } };
    }>("select published from public.app_config where id = 'storefront'");
    assert.equal(read.rows[0]?.published.theme.primaryColor, "#f85606");

    // A shopper's update matches no row under the policy, so nothing changes.
    await db.query(
      "update public.app_config set published = '{}'::jsonb where id = 'storefront'",
    );
    const afterShopper = await db.query<{
      published: { theme?: { primaryColor?: string } };
    }>("select published from public.app_config where id = 'storefront'");
    assert.equal(
      afterShopper.rows[0]?.published.theme?.primaryColor,
      "#f85606",
    );

    // A signed-out visitor can still read it, so the storefront works logged out.
    await db.exec("set role anon; set request.jwt.claim.sub = '';");
    assert.equal(
      (await db.query("select published from public.app_config")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into public.app_config(id, published) values ('storefront','{}'::jsonb)",
      ),
      /permission denied|row-level security/,
    );
  } finally {
    await db.close();
  }
});

test("publishing records a restorable version, and an unchanged publish does not", async () => {
  const db = await boot();
  try {
    await db.exec(asUser(OWNER));
    await db.query(
      "insert into public.app_config(id, published) values ('storefront', $1::jsonb)",
      [JSON.stringify({ version: 1 })],
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.app_config_versions",
        )
      ).rows[0]?.count,
      1,
    );

    await db.query(
      "update public.app_config set published = $1::jsonb where id = 'storefront'",
      [JSON.stringify({ version: 2 })],
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.app_config_versions",
        )
      ).rows[0]?.count,
      2,
    );

    // Re-publishing identical content should not fill the history with noise.
    await db.query(
      "update public.app_config set published = $1::jsonb where id = 'storefront'",
      [JSON.stringify({ version: 2 })],
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.app_config_versions",
        )
      ).rows[0]?.count,
      2,
    );
  } finally {
    await db.close();
  }
});

test("admins manage the catalogue while shoppers stay read-only", async () => {
  const db = await boot();
  try {
    await db.exec(asUser(STAFF));
    await db.query(
      "insert into public.products(id,name,price,stock,category) values ('new','Belt',379,10,'Fashion')",
    );
    await db.query("update public.products set price = 400 where id = 'new'");
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.products",
        )
      ).rows[0]?.count,
      3,
      "an admin sees inactive products too",
    );
    // Deleting a product is reserved for a super admin, so this removes nothing.
    await db.query("delete from public.products where id = 'new'");
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.products where id = 'new'",
        )
      ).rows[0]?.count,
      1,
      "a manager cannot delete a product",
    );

    await db.exec(asUser(SHOPPER));
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.products",
        )
      ).rows[0]?.count,
      2,
      "a shopper only sees active products",
    );
    await db.query("update public.products set price = 1 where id = 'a'");
    assert.equal(
      (
        await db.query<{ price: string }>(
          "select price from public.products where id = 'a'",
        )
      ).rows[0]?.price,
      "600.00",
      "a shopper cannot change a price",
    );

    await db.exec(asUser(OWNER));
    await db.query("delete from public.products where id = 'new'");
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.products where id = 'new'",
        )
      ).rows[0]?.count,
      0,
      "a super admin can delete a product",
    );
  } finally {
    await db.close();
  }
});

test("admins see every order, shoppers only their own", async () => {
  const db = await boot();
  try {
    await db.exec(asUser(SHOPPER));
    await db.query("select place_order($1::jsonb,$2::jsonb,$3,$4)", [
      JSON.stringify([{ productId: "a", quantity: 1 }]),
      JSON.stringify({
        name: "Test Shopper",
        phone: "9800000000",
        address: "Kathmandu, Nepal",
      }),
      "",
      "admin-order-request-1",
    ]);

    await db.exec(asUser(STAFF));
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.orders",
        )
      ).rows[0]?.count,
      1,
      "an admin can see the shopper's order",
    );
    await db.query(
      'update public.orders set document = document || \'{"status":"Shipped"}\'::jsonb',
    );

    await db.exec(asUser(OWNER));
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select document->>'status' as status from public.orders",
        )
      ).rows[0]?.status,
      "Shipped",
    );
  } finally {
    await db.close();
  }
});

test("the audit trail cannot be written on someone else's behalf", async () => {
  const db = await boot();
  try {
    await db.exec(asUser(STAFF));
    await db.query(
      "insert into public.admin_audit(actor, actor_name, action, resource, record_label) values ($1,$2,$3,$4,$5)",
      [STAFF, "Staff", "update", "products", "Belt"],
    );
    await assert.rejects(
      db.query(
        "insert into public.admin_audit(actor, actor_name, action, resource) values ($1,$2,$3,$4)",
        [OWNER, "Store owner", "delete", "products"],
      ),
      /row-level security/,
    );

    await db.exec(asUser(SHOPPER));
    assert.equal(
      (
        await db.query<{ count: number }>(
          "select count(*)::int as count from public.admin_audit",
        )
      ).rows[0]?.count,
      0,
      "a shopper sees no audit rows",
    );
  } finally {
    await db.close();
  }
});
