import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("database enforces customer isolation, authoritative checkout, retry safety, cancellation and upload limits", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
    `);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202609130001_store.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(`insert into public.products(id,name,price,stock,category) values ('a','Shirt',600,5,'Fashion'),('b','Hat',100,1,'Fashion');
      insert into public.products(id,name,price,stock,category,active) values ('hidden','Hidden',1,2,'Fashion',false); set role anon;`);
    assert.equal((await db.query("select * from products")).rows.length, 2);
    await assert.rejects(
      db.query("update products set price = 1"),
      /permission denied/,
    );
    await assert.rejects(db.query("select * from orders"), /permission denied/);
    await db.exec(
      "set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';",
    );
    const profile = {
      name: "Test Customer",
      phone: "9800000000",
      address: "Kathmandu, Nepal",
      avatar: "",
    };
    const place = async (
      items: unknown,
      request: string,
      voucher = "GULMELI10",
    ) => {
      const result = await db.query<{
        result: {
          id: string;
          subtotal: number;
          discount: number;
          total: number;
          status: string;
          items: { price: number }[];
        };
      }>("select place_order($1::jsonb,$2::jsonb,$3,$4) as result", [
        JSON.stringify(items),
        JSON.stringify(profile),
        voucher,
        request,
      ]);
      return result.rows[0].result;
    };
    const items = [{ productId: "a", quantity: 2, price: 1 }];
    const order = await place(items, "request-0001");
    assert.equal(order.subtotal, 1200);
    assert.equal(order.discount, 100);
    assert.equal(order.total, 1100);
    assert.equal(order.items[0].price, 600);
    assert.equal(order.status, "Placed");
    assert.equal((await place(items, "request-0001")).id, order.id);
    assert.equal(
      (
        await db.query<{ stock: number }>(
          "select stock from products where id='a'",
        )
      ).rows[0].stock,
      3,
    );
    await assert.rejects(
      place(
        [
          { productId: "a", quantity: 1 },
          { productId: "b", quantity: 2 },
        ],
        "rollback-0001",
      ),
      /Not enough stock/,
    );
    assert.equal(
      (
        await db.query<{ stock: number }>(
          "select stock from products where id='a'",
        )
      ).rows[0].stock,
      3,
    );
    await assert.rejects(
      place(
        [
          { productId: "a", quantity: 1 },
          { productId: "a", quantity: 1 },
        ],
        "duplicate-0001",
      ),
      /Duplicate/,
    );
    await assert.rejects(
      place([{ productId: "a", quantity: -1 }], "negative-0001"),
      /Invalid/,
    );
    await assert.rejects(
      place([{ productId: "a", quantity: 1.2 }], "fraction-0001"),
      /Invalid/,
    );
    await assert.rejects(
      place([{ productId: "hidden", quantity: 1 }], "hidden-0001"),
      /no longer available/,
    );
    await assert.rejects(
      place(items, "voucher-0001", "FREE"),
      /not recognized/,
    );
    await assert.rejects(
      db.query("update orders set document = '{}'"),
      /permission denied/,
    );
    await db.query(
      "insert into customer_state(user_id,data) values (auth.uid(),$1::jsonb)",
      [JSON.stringify({ profile })],
    );
    await assert.rejects(
      db.query("update customer_state set data = '{\"orders\":[]}'"),
      /check constraint/,
    );
    await db.exec(
      "set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';",
    );
    assert.equal((await db.query("select * from orders")).rows.length, 0);
    assert.equal(
      (await db.query("select * from customer_state")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select cancel_order($1::uuid)", [order.id]),
      /not found/,
    );
    await assert.rejects(
      db.query(
        "insert into customer_state values ('11111111-1111-1111-1111-111111111111','{}')",
      ),
      /row-level security/,
    );
    await db.exec(
      "set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';",
    );
    await db.query("select cancel_order($1::uuid)", [order.id]);
    await db.query("select cancel_order($1::uuid)", [order.id]);
    assert.equal(
      (
        await db.query<{ stock: number }>(
          "select stock from products where id='a'",
        )
      ).rows[0].stock,
      5,
    );
    assert.equal((await place(items, "request-0001")).status, "Cancelled");
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await db.query<{ allowed: boolean }>(
            "select reserve_image_upload() as allowed",
          )
        ).rows[0].allowed,
        true,
      );
    assert.equal(
      (
        await db.query<{ allowed: boolean }>(
          "select reserve_image_upload() as allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec("reset role;");
    await db.exec(
      readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    await db.exec(
      readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf8"),
    );
    assert.ok((await db.query("select * from products")).rows.length > 20);
  } finally {
    await db.close();
  }
});
