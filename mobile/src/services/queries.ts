import { QueryClient } from "@tanstack/react-query";
import type { Product } from "@/types/shop";
import { loadCatalog } from "./remote-shop";
import { offlineDb } from "./offline-db";

// One shared QueryClient for the app. Catalog reads go through it so the
// realtime refresh, the retry button and cold start share a single in-flight
// fetch and one cache generation. Successful reads are mirrored into SQLite
// (offline-db) so the storefront can open without a network.

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, gcTime: 5 * 60_000 },
  },
});

export const CATALOG_QUERY_KEY = ["catalog", "products"] as const;

export async function fetchCatalogCached(): Promise<Product[]> {
  return queryClient.fetchQuery({
    queryKey: CATALOG_QUERY_KEY,
    staleTime: 30_000,
    queryFn: async () => {
      const catalog = await loadCatalog();
      void offlineDb.saveCatalog("products", catalog);
      return catalog;
    },
  });
}

/** Last known good catalog from SQLite, used when the network is down. */
export async function cachedCatalog(): Promise<Product[] | null> {
  return offlineDb.loadCatalog<Product>("products");
}

export function invalidateCatalog() {
  void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY });
}
