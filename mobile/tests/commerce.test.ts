import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLocalOrder,
  initialCommerce,
  restoreCommerce,
  voucherDiscount,
} from "../src/store/commerce.ts";
import type { Product } from "../src/types/shop.ts";

const catalog: Record<string, Product> = {
  p: {
    id: "p",
    name: "Test item",
    price: 600,
    category: "Fashion",
    group: "home",
    stock: 2,
  },
};
const profile = {
  name: "Arjun Gyawali",
  phone: "9800000000",
  address: "Main street, Kathmandu",
  avatar: "",
};
test("checkout snapshots selected products, applies capped vouchers and preserves input", () => {
  const cart = [{ productId: "p", quantity: 2, selected: true }];
  const order = createLocalOrder(
    cart,
    catalog,
    profile,
    "GULMELI10",
    "order-1",
  );
  assert.equal(order.subtotal, 1200);
  assert.equal(order.discount, 100);
  assert.equal(order.total, 1100);
  assert.equal(order.status, "Saved locally");
  order.profile.name = "Changed";
  assert.equal(profile.name, "Arjun Gyawali");
  assert.equal(cart.length, 1);
});
test("checkout rejects empty selection, invalid addresses and stock changes", () => {
  assert.throws(
    () => createLocalOrder([], catalog, profile, "", "1"),
    /Select/,
  );
  assert.throws(
    () =>
      createLocalOrder(
        [{ productId: "p", quantity: 3, selected: true }],
        catalog,
        profile,
        "",
        "1",
      ),
    /stock/,
  );
  assert.throws(
    () =>
      createLocalOrder(
        [{ productId: "p", quantity: 1, selected: true }],
        catalog,
        { ...profile, phone: "bad" },
        "",
        "1",
      ),
    /phone/,
  );
  assert.throws(
    () =>
      createLocalOrder(
        [{ productId: "p", quantity: 0.5, selected: true }],
        catalog,
        profile,
        "",
        "1",
      ),
    /stock/,
  );
});
test("voucher minimum and unknown codes do not discount an order", () => {
  assert.equal(voucherDiscount("GULMELI10", 499), 0);
  assert.equal(voucherDiscount("GULMELI10", 500), 50);
  assert.equal(voucherDiscount("FAKE", 1000), 0);
});
test("saved commerce survives reload while malformed storage falls back safely", () => {
  const state = {
    ...initialCommerce,
    profile,
    wishlist: ["p"],
    orders: [
      createLocalOrder(
        [{ productId: "p", quantity: 1, selected: true }],
        catalog,
        profile,
        "",
        "1",
      ),
    ],
  };
  assert.deepEqual(restoreCommerce(JSON.parse(JSON.stringify(state))), state);
  assert.deepEqual(
    restoreCommerce({ ...state, orders: [null] }),
    initialCommerce,
  );
  assert.deepEqual(
    restoreCommerce({ ...state, wishlist: [null] }),
    initialCommerce,
  );
  assert.deepEqual(restoreCommerce(null), initialCommerce);
});

test("rebranding preserves saved shopping data and updates legacy references", () => {
  const order = createLocalOrder(
    [{ productId: "p", quantity: 1, selected: true }],
    catalog,
    profile,
    "",
    "GFC-123",
  );
  const saved = {
    ...initialCommerce,
    following: ["GFC", "GFC Choice 2"],
    voucher: "GFC10",
    orders: [order],
    drafts: [
      {
        id: "draft-1",
        text: "GFC invitation: Come shopping",
        createdAt: "2026-09-13",
      },
    ],
  };
  const restored = restoreCommerce(saved);
  assert.deepEqual(restored.following, [
    "Gulmeli Fancy Stores",
    "Gulmeli Fancy Stores Choice 2",
  ]);
  assert.equal(restored.voucher, "GULMELI10");
  assert.equal(restored.orders[0].id, "Gulmeli Fancy Stores-123");
  assert.deepEqual(restored.orders[0].items, order.items);
  assert.equal(
    restored.drafts[0].text,
    "Gulmeli Fancy Stores invitation: Come shopping",
  );
});
