import type { CartItem } from "../types/shop.ts";
import { cleanVariant, lineKey } from "../data/clothing.ts";

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
      typeof item.selected !== "boolean"
    )
      return [];
    const line = { productId: item.productId, ...cleanVariant(item) };
    const key = lineKey(line);
    if (seen.has(key)) return [];
    seen.add(key);
    result.push({
      ...line,
      quantity: item.quantity,
      selected: item.selected,
    });
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
