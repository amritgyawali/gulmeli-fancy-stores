import type { CartItem, Product } from "../types/shop.ts";
import { cleanVariant, lineKey, type VariantChoice } from "../data/clothing.ts";

/* Units of a product already in the cart, across every size and colour. */
export function unitsInCart(cart: CartItem[], productId: string) {
  return cart.reduce(
    (n, item) => (item.productId === productId ? n + item.quantity : n),
    0,
  );
}

/*
 * Adds one unit. The same product in another size or colour is its own line,
 * so a shopper can buy a shirt in M and L in one order. Stock is shared by
 * all of a product's lines.
 */
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

/* Sets a line's quantity, keeping the product's lines within its stock. */
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
      typeof entry.productId !== "string" ||
      !("quantity" in entry) ||
      typeof entry.quantity !== "number" ||
      !Number.isFinite(entry.quantity)
    )
      return [];
    const p = catalog[entry.productId];
    const line = { productId: entry.productId, ...cleanVariant(entry) };
    const key = lineKey(line);
    if (!p || p.stock < 1 || seen.has(key)) return [];
    const left = p.stock - (used[p.id] ?? 0);
    if (left < 1) return [];
    seen.add(key);
    const quantity = Math.max(1, Math.min(left, Math.floor(entry.quantity)));
    used[p.id] = (used[p.id] ?? 0) + quantity;
    return [
      {
        ...line,
        productId: p.id,
        quantity,
        selected: "selected" in entry && entry.selected === true,
      },
    ];
  });
}
