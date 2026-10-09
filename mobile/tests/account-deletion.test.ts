import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const ADMIN = "11111111-1111-1111-1111-111111111111",
  CUSTOMER = "22222222-2222-2222-2222-222222222222";
const asUser = (id: string) =>
  `reset role; set role authenticated; set request.jwt.claim.sub='${id}';`;

test("account deletion: blocks active orders and staff, then removes personal data and keeps anonymous sales", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;
      insert into auth.users values('${ADMIN}'),('${CUSTOMER}');`);
    await db.exec(
      readFileSync(new URL("../supabase/deploy.sql", import.meta.url), "utf8"),
    );
    await db.exec(
      `insert into admin_members(user_id,role) values('${ADMIN}','super_admin');`,
    );
    await db.exec(asUser(ADMIN));
    await db.query("select public.save_admin_changes($1::jsonb)", [
      JSON.stringify([
        {
          collection: "products",
          id: "shirt",
          before: null,
          after: {
            id: "shirt",
            name: "Shirt",
            price: 600,
            stock: 5,
            status: "published",
          },
        },
      ]),
    ]);
    await assert.rejects(
      db.query("select public.delete_my_account()"),
      /staff accounts/,
    );

    await db.exec(asUser(CUSTOMER));
    await db.query(
      "insert into customer_state(user_id,data) values($1,$2::jsonb)",
      [
        CUSTOMER,
        JSON.stringify({
          profile: { name: "Test Buyer", phone: "98", address: "Gulmi" },
        }),
      ],
    );
    const placed = (
      await db.query<{ place_order: { id: string } }>(
        "select place_order($1::jsonb,$2::jsonb,'',$3)",
        [
          JSON.stringify([{ productId: "shirt", quantity: 1 }]),
          JSON.stringify({
            name: "Test Buyer",
            phone: "9800000000",
            address: "Gulmi test address",
          }),
          "delete-test",
        ],
      )
    ).rows[0].place_order;
    await db.query("select send_support_message($1,$2)", [
      "ticket-delete-test",
      "Where is my parcel?",
    ]);
    await assert.rejects(
      db.query("select public.delete_my_account()"),
      /order in progress/,
    );
    await db.query("select cancel_order($1)", [placed.id]);
    await db.query("select public.delete_my_account()");

    await db.exec("reset role;");
    assert.equal(
      (await db.query("select 1 from auth.users where id=$1", [CUSTOMER]))
        .rows.length,
      0,
    );
    assert.equal(
      (await db.query("select 1 from customer_state")).rows.length,
      0,
    );
    const order = (
      await db.query<{ user_id: string | null; document: any }>(
        "select user_id,document from orders",
      )
    ).rows[0];
    assert.equal(order.user_id, null, "sales record is kept anonymously");
    assert.equal(order.document.profile.name, "Deleted customer");
    assert.equal(order.document.profile.address, "");
    const mirrors = (
      await db.query<{ collection: string; document: any }>(
        "select collection,document from admin_data where collection in ('orders','customers','tickets')",
      )
    ).rows;
    assert.deepEqual(
      mirrors.map((r) => r.collection),
      ["orders"],
      "customer profile and support tickets are removed",
    );
    assert.equal(mirrors[0].document.customerName, "Deleted customer");
    assert.equal(mirrors[0].document.customerId, null);
    assert.equal(
      JSON.stringify(mirrors[0].document).includes("Gulmi"),
      false,
    );

    await db.exec("set role anon;");
    await assert.rejects(
      db.query("select public.delete_my_account()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
