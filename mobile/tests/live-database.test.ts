import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const ADMIN = "11111111-1111-1111-1111-111111111111",
  CUSTOMER = "22222222-2222-2222-2222-222222222222";
const asUser = (id: string) =>
  `set role authenticated; set request.jwt.claim.sub='${id}';`;
test("live database: admin access, atomic catalog edits, conflicts, media, customer orders and cancellation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users values('${ADMIN}'),('${CUSTOMER}');`);
    const deploy = readFileSync(
      new URL("../supabase/deploy.sql", import.meta.url),
      "utf8",
    );
    await db.exec(deploy);
    await db.exec(deploy); // Safe to repeat after a partial/previous deployment.
    await db.exec(asUser(CUSTOMER));
    assert.equal(
      (
        await db.query<{ claim_first_admin: boolean }>(
          "select public.claim_first_admin()",
        )
      ).rows[0].claim_first_admin,
      false,
    );
    await assert.rejects(
      db.query("select public.save_admin_changes('[]')"),
      /admin access/,
    );
    await db.exec(
      `reset role; insert into admin_members(user_id,role) values('${ADMIN}','super_admin');`,
    );
    await db.exec(asUser(ADMIN));
    await assert.rejects(
      db.query("update products set stock=999"),
      /permission denied/,
    );
    const product = {
      id: "shirt",
      name: "Shirt",
      price: 600,
      compareAtPrice: 800,
      stock: 5,
      status: "published",
      images: ["https://res.cloudinary.com/test/image/upload/shirt.jpg"],
    };
    const save = (
      before: unknown,
      after: unknown,
      id = "shirt",
      collection = "products",
    ) =>
      db.query("select public.save_admin_changes($1::jsonb)", [
        JSON.stringify([{ collection, id, before, after }]),
      ]);
    const section = {
      id: "layout-test",
      type: "text",
      title: "Public headline",
      enabled: true,
      internalNote: "private staff note",
      sortOrder: 0,
    };
    await save(null, section, "layout-test", "homepage_sections");
    await save(
      null,
      { ...section, id: "layout-hidden", enabled: false },
      "layout-hidden",
      "homepage_sections",
    );
    await save(
      null,
      { id: "category-live", name: "Visible category", enabled: true },
      "category-live",
      "categories",
    );
    await db.exec("reset role; set role anon;");
    const publicRows = (
      await db.query<{
        storefront_content: {
          collection: string;
          id: string;
          document: Record<string, unknown>;
        }[];
      }>("select storefront_content()")
    ).rows[0].storefront_content;
    assert.ok(publicRows.some((r) => r.id === "category-live"));
    assert.equal(
      publicRows.find((r) => r.id === "layout-test")?.document.title,
      "Public headline",
    );
    assert.equal(
      publicRows.find((r) => r.id === "layout-test")?.document.internalNote,
      undefined,
    );
    assert.equal(
      publicRows.find((r) => r.id === "layout-hidden"),
      undefined,
    );
    assert.equal(
      publicRows.find((r) => r.collection === "homepage_config")?.document
        .configured,
      true,
    );
    assert.equal(
      (await db.query("select * from storefront_revision")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("update storefront_revision set updated_at=now()"),
      /permission denied/,
    );
    await db.exec(asUser(ADMIN));
    await save(null, product);
    assert.equal(
      (
        await db.query<{ original: number }>(
            "select (details->>'originalPrice')::double precision as original from products where id='shirt'",
        )
      ).rows[0].original,
      800,
      "admin compare-at prices reach the customer offers catalogue",
    );
    assert.equal(
      (await db.query<{ stock: number }>("select stock from products")).rows[0]
        .stock,
      5,
    );
    await db.exec(asUser(CUSTOMER));
    const profile = {
      name: "Test Buyer",
      phone: "9800000000",
      address: "Kathmandu test address",
    };
    const order = (
      await db.query<{ place_order: { id: string } }>(
        "select place_order($1::jsonb,$2::jsonb,$3,$4)",
        [
          JSON.stringify([{ productId: "shirt", quantity: 2 }]),
          JSON.stringify(profile),
          "",
          "live-test",
        ],
      )
    ).rows[0].place_order;
    await db.exec(asUser(ADMIN));
    const currentProduct = async () =>
      (
        await db.query<{ document: Record<string, unknown> }>(
          "select document from admin_data where collection='products' and id='shirt'",
        )
      ).rows[0].document;
    const afterSale = await currentProduct();
    assert.equal(
      afterSale.stock,
      3,
      "the dashboard receives stock after a customer purchase",
    );
    await assert.rejects(
      save(product, { ...product, stock: 7 }),
      /another device/,
    );
    const edited = { ...afterSale, name: "Blue Shirt", stock: 5 };
    await save(afterSale, edited);
    assert.equal(
      (await db.query<{ stock: number }>("select stock from products")).rows[0]
        .stock,
      5,
      "adds admin stock delta without undoing the sale",
    );
    await assert.rejects(
      save(product, { ...product, name: "Stale" }),
      /another device/,
    );
    const record = (
      await db.query<{ document: Record<string, unknown> }>(
        "select document from admin_data where collection='orders' and id=$1",
        [order.id],
      )
    ).rows[0].document;
    assert.equal(record.status, "pending");
    await save(record, { ...record, status: "cancelled" }, order.id, "orders");
    assert.equal(
      (await currentProduct()).stock,
      7,
      "admin cancellation updates dashboard stock too",
    );
    assert.equal(
      (await db.query<{ stock: number }>("select stock from products")).rows[0]
        .stock,
      7,
    );
    await save(record, { ...record, status: "cancelled" }, order.id, "orders");
    assert.equal(
      (await db.query<{ stock: number }>("select stock from products")).rows[0]
        .stock,
      7,
      "retry is idempotent",
    );
    const media = {
      id: "photo",
      url: "https://res.cloudinary.com/test/image/upload/a.jpg",
      name: "Product photo",
      kind: "image",
      publicId: "gulmeli/media/a",
    };
    await save(null, media, "photo", "media");
    assert.equal((await db.query("select id from media")).rows.length, 1);
    await save(media, null, "photo", "media");
    assert.equal((await db.query("select id from media")).rows.length, 0);
    const afterCancel = await currentProduct();
    await save(afterCancel, {
      ...afterCancel,
      deletedAt: new Date().toISOString(),
    });
    await db.exec("set role anon;");
    assert.equal((await db.query("select id from products")).rows.length, 0);
    await db.exec(asUser(ADMIN));
    await db.query(
      "insert into app_config(id,published) values('storefront',$1::jsonb)",
      [
        JSON.stringify({
          checkout: { defaultShippingFee: 75, freeShippingThreshold: 2000 },
        }),
      ],
    );
    await save(
      null,
      { id: "book", name: "Book", price: 1000, stock: 10, status: "published" },
      "book",
    );
    await save(
      null,
      {
        id: "save20",
        code: "SAVE20",
        type: "percentage",
        value: 20,
        enabled: true,
        appliesTo: "all",
        maxDiscount: 150,
        perCustomerLimit: 1,
      },
      "save20",
      "coupons",
    );
    await db.exec(asUser(CUSTOMER));
    const quoted = (
      await db.query<{
        quote_order: { total: number; shipping: number; discount: number };
      }>(
        'select quote_order(\'[{"productId":"book","quantity":1}]\',\'SAVE20\')',
      )
    ).rows[0].quote_order;
    assert.equal(quoted.total, 925);
    assert.equal(quoted.shipping, 75);
    assert.equal(quoted.discount, 150);
    const paid = (
      await db.query<{ place_order: { total: number } }>(
        "select place_order($1::jsonb,$2::jsonb,'SAVE20','coupon-test')",
        [
          JSON.stringify([{ productId: "book", quantity: 1 }]),
          JSON.stringify(profile),
        ],
      )
    ).rows[0].place_order;
    assert.equal(paid.total, quoted.total);
    await assert.rejects(
      db.query(
        'select quote_order(\'[{"productId":"book","quantity":1}]\',\'SAVE20\')',
      ),
      /usage limit/,
    );
    await db.query(
      "select send_support_message('test-ticket','Where is my order?','Delivery')",
    );
    await db.query(
      "select send_support_message('test-ticket','Where is my order?','Delivery')",
    );
    const own = (
      await db.query<{ my_support_tickets: unknown[] }>(
        "select my_support_tickets()",
      )
    ).rows[0].my_support_tickets;
    assert.equal(own.length, 1, "retry does not duplicate support messages");
    await db.exec(asUser(ADMIN));
    const ticket = (
      await db.query<{ document: Record<string, unknown> }>(
        "select document from admin_data where id='test-ticket'",
      )
    ).rows[0].document;
    await save(
      ticket,
      {
        ...ticket,
        internalNote: "Staff only",
        messages: [
          ...(ticket.messages as unknown[]),
          {
            author: "agent",
            body: "We will check.",
            at: new Date().toISOString(),
          },
        ],
      },
      "test-ticket",
      "tickets",
    );
    assert.equal(
      (
        await db.query<{ my_support_tickets: unknown[] }>(
          "select my_support_tickets()",
        )
      ).rows[0].my_support_tickets.length,
      0,
      "another account cannot read the conversation",
    );
    await db.exec(asUser(CUSTOMER));
    const replied = (
      await db.query<{
        my_support_tickets: { messages: unknown[]; internalNote?: unknown }[];
      }>("select my_support_tickets()")
    ).rows[0].my_support_tickets[0];
    assert.equal(replied.messages.length, 2);
    assert.equal(replied.internalNote, undefined);
  } finally {
    await db.close();
  }
});
