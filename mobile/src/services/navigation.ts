import { router } from "expo-router";

export function openDestination(
  destination: string,
  params: Record<string, string> = {},
) {
  router.push({ pathname: "/feature", params: { destination, ...params } });
}
