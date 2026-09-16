import { AdminSync } from "../../../shared/admin-sync";
import { supabase } from "./supabase";
export type AdminRecord = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  revision?: number;
  [key: string]: unknown;
};
export type Snapshot = Record<string, AdminRecord[]>;

const sync = new AdminSync();
export function adoptAdminData(snapshot: Snapshot) {
  sync.adopt(snapshot);
}
export function mergeAdminData(current: Snapshot, remote: Snapshot): Snapshot {
  return sync.merge(current, remote) as Snapshot;
}
export function adminSyncBusy() {
  return sync.busy;
}
export async function pullAdminData(): Promise<Snapshot> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const snapshot: Snapshot = {};
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from("admin_data")
      .select("collection,id,document")
      .order("collection")
      .order("id")
      .range(start, start + 999);
    if (error) throw new Error(error.message);
    for (const row of data ?? [])
      (snapshot[row.collection] ??= []).push(row.document);
    if (!data || data.length < 1000) break;
  }
  return snapshot;
}
export function pushAdminData(snapshot: Snapshot, _actorName: string) {
  return sync.push(snapshot, async (changes) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.rpc("save_admin_changes", {
      p_changes: changes,
    });
    if (error) throw new Error(error.message);
  });
}
export function watchRemoteAdmin(handlers: {
  onChange: () => void;
}): () => void {
  const client = supabase;
  if (!client) return () => undefined;
  const channel = client
    .channel("gulmeli-admin-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "admin_data" },
      handlers.onChange,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") handlers.onChange();
    });
  return () => {
    void client.removeChannel(channel);
  };
}
export async function claimAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Customer-app orders mapped into the dashboard's orders board shape. */
export async function pullCustomerOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("id,created_at,document")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ id, created_at, document }) => {
    const doc = (document ?? {}) as Record<string, any>;
    const profile = (doc.profile ?? {}) as Record<string, any>;
    const status =
      doc.status === "Cancelled"
        ? "cancelled"
        : doc.status === "Shipped"
          ? "shipped"
          : doc.status === "Delivered"
            ? "delivered"
            : "pending";
    return {
      id,
      createdAt: created_at,
      updatedAt: created_at,
      deletedAt: null,
      revision: 1,
      number: `APP-${String(id).slice(0, 8).toUpperCase()}`,
      customerName: String(profile.name ?? "Customer"),
      guest: true,
      status,
      paymentStatus: "unpaid",
      paymentMethod: "Cash on delivery",
      lines: (Array.isArray(doc.items) ? doc.items : []).map((item: any) => ({
        productId: String(item.productId ?? ""),
        name: String(item.name ?? "Item"),
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.price ?? 0),
      })),
      subtotal: Number(doc.subtotal ?? 0),
      discountTotal: Number(doc.discount ?? 0),
      total: Number(doc.total ?? 0),
      shippingAddress: { line1: String(profile.address ?? "") },
      placedAt: created_at,
      channel: "app",
      source: "customer-app",
    } as AdminRecord & {
      lines: {
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
      }[];
    };
  });
}
