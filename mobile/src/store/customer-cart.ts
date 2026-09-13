import type { CartItem } from "../types/shop.ts";

export function restoreCustomerCart(value: unknown): CartItem[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  const seen = new Set<string>();
  const result: CartItem[] = [];
  for (const item of value) {
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
