import { useLocalSearchParams } from "expo-router";
import { ResourceListScreen } from "@/admin/screens/ResourceListScreen";
import { resources } from "@/admin/core/resources/index";

/** Exports a real page per resource, so every list has a shareable URL. */
export async function generateStaticParams(): Promise<{ resource: string }[]> {
  return resources.map((resource) => ({ resource: resource.key }));
}

export default function ResourceListRoute() {
  const { resource } = useLocalSearchParams<{ resource: string }>();
  return <ResourceListScreen resourceKey={String(resource ?? "")} />;
}
