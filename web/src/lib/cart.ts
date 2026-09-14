import type { CartItem, Product } from "./types";

// Ported from the mobile store so carts saved by either surface load identically.
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
      typeof (entry as CartItem).productId !== "string" ||
      !("quantity" in entry) ||
      typeof (entry as CartItem).quantity !== "number" ||
      !Number.isFinite((entry as CartItem).quantity)
    )
      return [];
    const p = catalog[(entry as CartItem).productId];
    if (!p || p.stock < 1 || seen.has(p.id)) return [];
    seen.add(p.id);
    return [
      {
        productId: p.id,
        quantity: Math.max(
          1,
          Math.min(p.stock, Math.floor((entry as CartItem).quantity)),
        ),
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
      typeof item.selected !== "boolean" ||
      seen.has(item.productId)
    )
      return [];
    seen.add(item.productId);
    result.push({
      productId: item.productId,
      quantity: item.quantity,
      selected: item.selected,
    });
  }
  return result;
}

export function mergeCustomerCart(saved: CartItem[], guest: CartItem[]) {
  const items = new Map(saved.map((item) => [item.productId, item]));
  for (const item of guest) {
    const previous = items.get(item.productId);
    items.set(
      item.productId,
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
