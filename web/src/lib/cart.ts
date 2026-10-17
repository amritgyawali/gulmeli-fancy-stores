import type { CartItem, Product } from "./types";
import {
  cleanVariant,
  lineKey,
  type VariantChoice,
} from "@/shared/mobile/data/clothing";

// Ported from the mobile store so carts saved by either surface load
// identically. A line is a product plus its chosen size and colour
// (see lineKey); a product with no variant keeps its plain id.

/* Units of a product already in the cart, across every size and colour. */
export function unitsInCart(cart: CartItem[], productId: string) {
  return cart.reduce(
    (n, item) => (item.productId === productId ? n + item.quantity : n),
    0,
  );
}

export function addItem(
  cart: CartItem[],
  product: Product,
  choice: VariantChoice = {},
): CartItem[] {
  if (product.stock < 1) return cart;
  if (unitsInCart(cart, product.id) >= product.stock) return cart;
  const line = { productId: product.id, ...cleanVariant(choice) };
  const key = lineKey(line);
  const existing = cart.find((item) => lineKey(item) === key);
  if (existing)
    return cart.map((item) =>
      item === existing ? { ...item, quantity: item.quantity + 1 } : item,
    );
  return [...cart, { ...line, quantity: 1, selected: true }];
}

export function setQuantity(
  cart: CartItem[],
  product: Product,
  quantity: number,
  key: string = product.id,
): CartItem[] {
  if (!Number.isFinite(quantity)) return cart;
  const others = cart
    .filter((item) => item.productId === product.id && lineKey(item) !== key)
    .reduce((n, item) => n + item.quantity, 0);
  const clamped = Math.max(
    1,
    Math.min(Math.max(1, product.stock - others), Math.floor(quantity)),
  );
  return cart.map((item) =>
    lineKey(item) === key ? { ...item, quantity: clamped } : item,
  );
}

export function totals(cart: CartItem[], catalog: Record<string, Product>) {
  const selected = cart.filter(
    (i) => i.selected && catalog[i.productId]?.stock > 0,
  );
  return {
    count: selected.reduce((n, i) => n + i.quantity, 0),
    subtotal: selected.reduce(
      (n, i) => n + catalog[i.productId].price * i.quantity,
      0,
    ),
    cartCount: cart.reduce((n, i) => n + i.quantity, 0),
  };
}

export function restoreCart(
  value: unknown,
  catalog: Record<string, Product>,
): CartItem[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const used: Record<string, number> = {};
  return value.flatMap((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("productId" in entry) ||
      typeof (entry as CartItem).productId !== "string" ||
      !("quantity" in entry) ||
      typeof (entry as CartItem).quantity !== "number" ||
      !Number.isFinite((entry as CartItem).quantity)
    )
      return [];
    const p = catalog[(entry as CartItem).productId];
    const line = { productId: (entry as CartItem).productId, ...cleanVariant(entry) };
    const key = lineKey(line);
    if (!p || p.stock < 1 || seen.has(key)) return [];
    const left = p.stock - (used[p.id] ?? 0);
    if (left < 1) return [];
    seen.add(key);
    const quantity = Math.max(
      1,
      Math.min(left, Math.floor((entry as CartItem).quantity)),
    );
    used[p.id] = (used[p.id] ?? 0) + quantity;
    return [
      {
        ...line,
        productId: p.id,
        quantity,
        selected:
          "selected" in entry && (entry as { selected?: unknown }).selected === true,
      },
    ];
  });
}

export function restoreCustomerCart(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  const seen = new Set<string>();
  const result: CartItem[] = [];
  for (const item of value as CartItem[]) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 9999 ||
      typeof item.selected !== "boolean"
    )
      return [];
    const line = { productId: item.productId, ...cleanVariant(item) };
    const key = lineKey(line);
    if (seen.has(key)) return [];
    seen.add(key);
    result.push({ ...line, quantity: item.quantity, selected: item.selected });
  }
  return result;
}

export function mergeCustomerCart(saved: CartItem[], guest: CartItem[]) {
  const items = new Map(saved.map((item) => [lineKey(item), item]));
  for (const item of guest) {
    const key = lineKey(item);
    const previous = items.get(key);
    items.set(
      key,
      previous
        ? {
            ...item,
            quantity: Math.min(9999, previous.quantity + item.quantity),
            selected: item.selected || previous.selected,
          }
        : item,
    );
  }
  return [...items.values()].slice(0, 100);
}
