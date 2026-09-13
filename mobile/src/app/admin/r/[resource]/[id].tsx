import { useLocalSearchParams } from "expo-router";
import { ResourceEditScreen } from "@/admin/screens/ResourceEditScreen";
import { OrderScreen } from "@/admin/screens/OrderScreen";

export default function ResourceRecordRoute() {
  const { resource, id, edit } = useLocalSearchParams<{
    resource: string;
    id: string;
    edit?: string;
  }>();
  const resourceKey = String(resource ?? "");
  const recordId = String(id ?? "");

  // Orders get a purpose-built workspace; every other record uses the form.
  if (resourceKey === "orders" && recordId !== "new" && edit !== "1") {
    return <OrderScreen id={recordId} />;
  }
  return <ResourceEditScreen resourceKey={resourceKey} id={recordId} />;
}
