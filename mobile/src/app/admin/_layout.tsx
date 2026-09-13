import { Stack } from "expo-router";
import { AdminProvider } from "@/admin/AdminProvider";

/** The dashboard runs full-bleed, outside the storefront's phone frame. */
export default function AdminLayout() {
  return (
    <AdminProvider>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </AdminProvider>
  );
}
