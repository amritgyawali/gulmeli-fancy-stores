import type { CartItem, Product } from "../types/shop.ts";

export function addItem(cart: CartItem[], product: Product): CartItem[] {
  if (product.stock < 1) return cart;
  const existing = cart.find((item) => item.productId === product.id);
  if (existing)
    return cart.map((item) =>
      item === existing
        ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) }
        : item,
    );
  return [...cart, { productId: product.id, quantity: 1, selected: true }];
}
export function setQuantity(
  cart: CartItem[],
  product: Product,
  quantity: number,
): CartItem[] {
  if (!Number.isFinite(quantity)) return cart;
  const clamped = Math.max(1, Math.min(product.stock, Math.floor(quantity)));
  return cart.map((item) =>
    item.productId === product.id ? { ...item, quantity: clamped } : item,
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
    if (!p || p.stock < 1 || seen.has(p.id)) return [];
    seen.add(p.id);
    return [
      {
        productId: p.id,
        quantity: Math.max(1, Math.min(p.stock, Math.floor(entry.quantity))),
        selected: "selected" in entry && entry.selected === true,
      },
    ];
  });
}
