import { test } from "node:test";
import assert from "node:assert/strict";
import { addItem, restoreCart, setQuantity, unitsInCart } from "../src/store/cart.ts";
import { mergeCustomerCart, restoreCustomerCart } from "../src/store/customer-cart.ts";
import { createLocalOrder } from "../src/store/commerce.ts";
import {
  CLOTHING_CATEGORIES,
  SIZE_CHARTS,
  colorOptions,
  lineKey,
  missingChoice,
  sizeChartFor,
  sizeOptions,
  variantLabel,
} from "../src/data/clothing.ts";
import { products } from "../src/data/catalog.ts";
import type { CartItem, Product } from "../src/types/shop.ts";

const shirt: Product = {
  id: "shirt",
  name: "Oxford Shirt",
  price: 1490,
  stock: 5,
  group: "home",
  category: "Men",
  sizes: ["S", "M", "L"],
  sizeChart: "men-tops",
  colors: [
    { name: "Blue", hex: "#a9c6e8" },
    { name: "White", hex: "#f7f7f5" },
  ],
};
const cap: Product = {
  id: "cap",
  name: "Cap",
  price: 549,
  stock: 10,
  group: "home",
  category: "Accessories",
  sizes: ["Free Size"],
  colors: [{ name: "Navy", hex: "#1f2f4f" }],
};

test("every catalogue product is clothing, in a known department, with a size or free size", () => {
  for (const p of products) {
    assert.ok(
      (CLOTHING_CATEGORIES as readonly string[]).includes(p.category),
      `${p.name} is in ${p.category}`,
    );
    assert.ok(p.sizes?.length, `${p.name} has sizes`);
    assert.ok(p.colors?.length, `${p.name} has colours`);
    assert.ok(p.fabric, `${p.name} names its fabric`);
    assert.ok(p.imageKey, `${p.name} has an image`);
    if (p.sizeChart && p.sizeChart !== "free") {
      const chart = sizeChartFor(p)!;
      for (const size of sizeOptions(p))
        assert.ok(
          chart.rows.some((r) => r.size === size),
          `${p.name}: size ${size} is in the ${chart.title} guide`,
        );
    }
  }
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  assert.ok(Object.keys(SIZE_CHARTS).length >= 6);
});

test("the same product in two sizes is two lines that share its stock", () => {
  let cart: CartItem[] = [];
  cart = addItem(cart, shirt, { size: "M", color: "Blue" });
  cart = addItem(cart, shirt, { size: "M", color: "Blue" });
  cart = addItem(cart, shirt, { size: "L", color: "Blue" });
  assert.equal(cart.length, 2);
  assert.equal(unitsInCart(cart, "shirt"), 3);
  for (let i = 0; i < 10; i++) cart = addItem(cart, shirt, { size: "S", color: "White" });
  assert.equal(unitsInCart(cart, "shirt"), 5, "never more than the product's stock");
  const m = lineKey({ productId: "shirt", size: "M", color: "Blue" });
  cart = setQuantity(cart, shirt, 99, m);
  assert.equal(unitsInCart(cart, "shirt"), 5);
  assert.equal(cart.find((i) => lineKey(i) === m)?.quantity, 2);
});

test("a product without variants keeps its plain id as the line key", () => {
  assert.equal(lineKey({ productId: "cap" }), "cap");
  assert.equal(lineKey({ productId: "shirt", size: "M" }), "shirt|M|");
  assert.equal(variantLabel({ size: "M", color: "Navy" }), "Size M · Navy");
  assert.equal(variantLabel({}), "");
});

test("a size must be chosen; a single colour and free size need no choice", () => {
  assert.equal(missingChoice(shirt, {}), "size");
  assert.equal(missingChoice(shirt, { size: "M" }), "color");
  assert.equal(missingChoice(shirt, { size: "XL", color: "Blue" }), "size");
  assert.equal(missingChoice(shirt, { size: "M", color: "Blue" }), null);
  assert.deepEqual(sizeOptions(cap), []);
  assert.equal(missingChoice(cap, {}), null);
  assert.deepEqual(
    sizeOptions({ variants: [{ size: "32" }, { size: "34" }, { size: "32" }] }),
    ["32", "34"],
    "dashboard variants supply sizes when the product lists none",
  );
  assert.deepEqual(colorOptions({ variants: [{ color: "Olive" }] }), [{ name: "Olive", hex: "" }]);
});

test("saved carts keep size and colour and drop malformed ones", () => {
  const saved = [
    { productId: "shirt", quantity: 2, selected: true, size: "M", color: "Blue" },
    { productId: "shirt", quantity: 9, selected: false, size: "L", color: "Blue" },
    { productId: "shirt", quantity: 1, selected: true, size: "x".repeat(50) },
  ];
  const restored = restoreCart(saved, { shirt })!;
  assert.deepEqual(restored[0], { productId: "shirt", quantity: 2, selected: true, size: "M", color: "Blue" });
  assert.equal(restored[1].quantity, 3, "later lines get what stock is left");
  assert.equal(restored.length, 2);
  const remote = restoreCustomerCart(saved.slice(0, 2));
  assert.equal(remote.length, 2);
  const merged = mergeCustomerCart(remote, [
    { productId: "shirt", quantity: 1, selected: true, size: "M", color: "Blue" },
  ]);
  assert.equal(merged.find((i) => i.size === "M")?.quantity, 3);
});

test("local orders record the size and colour of each line", () => {
  const order = createLocalOrder(
    [
      { productId: "shirt", quantity: 1, selected: true, size: "M", color: "Blue" },
      { productId: "shirt", quantity: 2, selected: true, size: "L", color: "White" },
    ],
    { shirt },
    { name: "Test Buyer", phone: "9800000000", address: "Kathmandu, Ward 4", avatar: "" },
    "",
    "order-1",
  );
  assert.deepEqual(
    order.items.map((i) => [i.size, i.color, i.quantity]),
    [["M", "Blue", 1], ["L", "White", 2]],
  );
  assert.throws(() =>
    createLocalOrder(
      [
        { productId: "shirt", quantity: 3, selected: true, size: "M" },
        { productId: "shirt", quantity: 3, selected: true, size: "L" },
      ],
      { shirt },
      { name: "Test Buyer", phone: "9800000000", address: "Kathmandu, Ward 4", avatar: "" },
      "",
      "order-2",
    ),
  );
});
