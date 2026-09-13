import { router, type Href } from "expo-router";

/**
 * Admin routes are built from the resource registry at runtime, so they cannot
 * be checked against the generated route union. This is the one place that
 * bridges the two, rather than casting at every call site.
 */
export function go(route: string): void {
  router.push(route as Href);
}

export function replace(route: string): void {
  router.replace(route as Href);
}

export function back(): void {
  if (router.canGoBack()) router.back();
  else replace("/admin");
}

export const adminRoutes = {
  overview: "/admin",
  list: (resource: string) => `/admin/r/${resource}`,
  record: (resource: string, id: string) => `/admin/r/${resource}/${id}`,
  create: (resource: string) => `/admin/r/${resource}/new`,
};
