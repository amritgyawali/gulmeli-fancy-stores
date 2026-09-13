import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addItem,
  restoreCart,
  setQuantity,
  totals,
} from "../src/store/cart.ts";
import type { Product, CartItem } from "../src/types/shop.ts";

const product: Product = {
  id: "p",
  name: "Stock limited item",
  price: 177,
  stock: 6,
  group: "choice",
  category: "Groceries",
};
const catalog = { p: product, sold: { ...product, id: "sold", stock: 0 } };
test("adding repeatedly consolidates lines and caps stock", () => {
  let cart: CartItem[] = [];
  for (let i = 0; i < 10; i++) cart = addItem(cart, product);
  assert.deepEqual(cart, [{ productId: "p", quantity: 6, selected: true }]);
  assert.equal(addItem(cart, catalog.sold), cart);
});
test("quantity validation cannot create negative or non-finite money totals", () => {
  const cart = addItem([], product);
  assert.equal(setQuantity(cart, product, -2)[0].quantity, 1);
  assert.equal(setQuantity(cart, product, 99)[0].quantity, 6);
  assert.equal(setQuantity(cart, product, NaN), cart);
  assert.equal(setQuantity(cart, product, Infinity), cart);
});
test("checkout counts selected available quantities and badges count all quantities", () => {
  assert.deepEqual(
    totals(
      [
        { productId: "p", quantity: 2, selected: true },
        { productId: "sold", quantity: 1, selected: false },
      ],
      catalog,
    ),
    { count: 2, subtotal: 354, cartCount: 3 },
  );
  assert.deepEqual(
    totals([{ productId: "p", quantity: 2, selected: false }], catalog),
    { count: 0, subtotal: 0, cartCount: 2 },
  );
});
test("restoring stale or corrupt storage rejects unknown and duplicate products, clamps stock", () => {
  assert.equal(restoreCart("invalid", catalog), null);
  assert.deepEqual(
    restoreCart(
      [
        null,
        { productId: "missing", quantity: 1 },
        { productId: "sold", quantity: 1 },
        { productId: "p", quantity: 100, selected: true },
        { productId: "p", quantity: 1 },
      ],
      catalog,
    ),
    [{ productId: "p", quantity: 6, selected: true }],
  );
  assert.deepEqual(restoreCart([], catalog), []);
});
