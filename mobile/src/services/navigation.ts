import { router } from "expo-router";

/*
 * Opening a destination.
 *
 * Most secondary pages still render inside the generic /feature screen. Two
 * of them are the core of the shopping journey and now have screens of their
 * own — the product page and search — so every existing
 * `openDestination("Product details" | "Search results")` call lands on the
 * dedicated screen without each caller having to change.
 */
export function openDestination(destination: string, params: Record<string, string> = {}) {
  if (destination === "Product details" && params.id) return openProduct(params.id);
  if (destination === "Search results")
    return router.push({
      pathname: "/search",
      params: {
        ...(params.query ? { query: params.query } : {}),
        ...(params.category ? { category: params.category } : {}),
      },
    });
  router.push({ pathname: "/feature", params: { destination, ...params } });
}

export function openProduct(id: string) {
  router.push({ pathname: "/product/[id]", params: { id } });
}

export function openCart() {
  router.navigate("/cart");
}
