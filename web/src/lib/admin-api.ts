// Desktop-admin mirror of mobile/src/services/remote-admin.ts: the dashboard
// shares every record through admin_data, pushes writes, and republishes the
// storefront catalog. Same document shape as the mobile dashboard, so records
// flow both ways with the app.
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

const PAGE = 1000;
const BOOKKEEPING = new Set(["audit_logs", "revisions"]);

const remoteApplied = new Set<string>();
let lastPushed: Snapshot = {};
let pushing: Promise<void> = Promise.resolve();

const keyOf = (collection: string, id: string) => collection + ":" + id;

export function markAppliedRemotely(collection: string, id: string) {
  remoteApplied.add(keyOf(collection, id));
}

export async function pullAdminData(): Promise<Snapshot> {
  const snapshot: Snapshot = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("admin_data")
      .select("collection,id,document")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      (snapshot[row.collection] ??= []).push(row.document as AdminRecord);
    }
    if (!data || data.length < PAGE) break;
  }
  lastPushed = JSON.parse(JSON.stringify(snapshot));
  return snapshot;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function changed(collection: string, record: AdminRecord): boolean {
  const previous = (lastPushed[collection] ?? []).find(
    (entry) => entry.id === record.id,
  );
  return !previous || JSON.stringify(previous) !== JSON.stringify(record);
}

async function pushNow(snapshot: Snapshot, actorName: string) {
  const upserts: { collection: string; id: string; document: unknown; actor: string }[] = [];
  const deletes: { collection: string; id: string }[] = [];
  for (const [collection, records] of Object.entries(snapshot)) {
    if (BOOKKEEPING.has(collection)) continue;
    const pushed = lastPushed[collection] ?? [];
    const seen = new Set<string>();
    for (const record of records) {
      seen.add(record.id);
      const key = keyOf(collection, record.id);
      if (remoteApplied.delete(key)) continue;
      if (changed(collection, record)) {
        const document = clone(record as Record<string, unknown>);
        if (JSON.stringify(document).length > 240000)
          document.note = "Record is too large to share; the full copy lives on this device.";
        upserts.push({ collection, id: record.id, document, actor: actorName });
      }
    }
    for (const old of pushed) if (!seen.has(old.id)) deletes.push({ collection, id: old.id });
  }
  for (let from = 0; from < upserts.length; from += 400) {
    const { error } = await supabase
      .from("admin_data")
      .upsert(upserts.slice(from, from + 400), { onConflict: "collection,id" });
    if (error) throw new Error(error.message);
  }
  for (const entry of deletes) {
    const { error } = await supabase
      .from("admin_data")
      .delete()
      .eq("collection", entry.collection)
      .eq("id", entry.id);
    if (error) throw new Error(error.message);
  }
  await mirrorMedia(snapshot);
  lastPushed = clone(snapshot);
}

export function pushAdminData(snapshot: Snapshot, actorName: string) {
  pushing = pushing.then(() => pushNow(snapshot, actorName));
  return pushing;
}

async function mirrorMedia(snapshot: Snapshot) {
  const media = (snapshot.media ?? []).filter((m) => !m.deletedAt);
  const rows = media.map((m) => ({
    id: String(m.id),
    public_id: typeof m.publicId === "string" ? m.publicId : null,
    url: String(m.url ?? ""),
    name: String(m.name ?? "File").slice(0, 300) || "File",
    folder: String(m.folder ?? "General"),
    kind: ["image", "video", "pdf", "document"].includes(String(m.kind))
      ? String(m.kind)
      : "image",
    alt: String(m.alt ?? ""),
    tags: Array.isArray(m.tags) ? m.tags : [],
    product_id: null,
    width: Math.max(0, Math.trunc(Number(m.width ?? 0))),
    height: Math.max(0, Math.trunc(Number(m.height ?? 0))),
    bytes: Math.max(0, Math.trunc(Number(m.sizeKb ?? 0)) * 1024),
    note: String(m.note ?? ""),
  }));
  const valid = rows.filter((row) => /^https:\/\//.test(row.url));
  for (let from = 0; from < valid.length; from += 400) {
    const { error } = await supabase.from("media").upsert(valid.slice(from, from + 400));
    if (error) throw new Error(error.message);
  }
  const { data: existing, error: readError } = await supabase.from("media").select("id");
  if (readError) throw new Error(readError.message);
  const keep = new Set(valid.map((row) => row.id));
  const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  for (let from = 0; from < stale.length; from += 100) {
    const { error } = await supabase.from("media").delete().in("id", stale.slice(from, from + 100));
    if (error) throw new Error(error.message);
  }
}

export function watchRemoteAdmin(handlers: {
  onRecord: (collection: string, record: AdminRecord | null, removedId?: string) => void;
  onCatalogChange?: () => void;
}) {
  const channel = supabase
    .channel("gulmeli-web-admin")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "admin_data" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as { collection?: string; id?: string };
          if (old.collection && old.id)
            handlers.onRecord(old.collection, null, old.id);
        } else {
          const next = payload.new as { collection?: string; document?: AdminRecord };
          if (next.collection && next.document)
            handlers.onRecord(next.collection, next.document);
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      () => handlers.onCatalogChange?.(),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

const GROUPS = new Set(["home", "offer", "choice", "recommendation", "unavailable"]);

function toCatalogRow(product: AdminRecord, categoryNames: Map<string, string>, index: number) {
  const images = Array.isArray(product.images) ? (product.images as unknown[]) : [];
  const first = images.find(
    (url) => typeof url === "string" && url.startsWith("https://res.cloudinary.com/"),
  );
  const stored = (product.details ?? {}) as Record<string, unknown>;
  const price =
    typeof product.salePrice === "number" &&
    product.salePrice >= 0 &&
    product.salePrice < Number(product.price ?? 0)
      ? product.salePrice
      : Number(product.price ?? 0);
  const details = {
    ...stored,
    originalPrice:
      product.salePrice != null && product.salePrice !== ""
        ? Number(product.price ?? 0)
        : stored.originalPrice,
  };
  const group = GROUPS.has(String(product.storefrontGroup))
    ? String(product.storefrontGroup)
    : "home";
  return {
    id: String(product.id),
    name: String(product.name ?? "Unnamed product").slice(0, 300) || "Unnamed",
    price: Math.max(0, Number.isFinite(price) ? price : 0),
    stock: product.unlimitedStock
      ? 99
      : Math.max(0, Math.trunc(Number(product.stock ?? 0))),
    category:
      categoryNames.get(String(product.categoryId)) ??
      (typeof product.categoryName === "string" && product.categoryName
        ? product.categoryName
        : "General"),
    product_group: group,
    image_url: first ? String(first) : null,
    details,
    sort_order: index,
    active: product.status === "published",
  };
}

/** Full replace of the public catalog; existing stock is merged, never clobbered. */
export async function syncCatalog(snapshot: Snapshot) {
  const products = (snapshot.products ?? []).filter((p) => !p.deletedAt);
  const categoryNames = new Map(
    (snapshot.categories ?? [])
      .filter((c) => !c.deletedAt)
      .map((c) => [String(c.id), String(c.name ?? "General")]),
  );
  const rows = products.map((product, index) => toCatalogRow(product, categoryNames, index));
  const { data: existing, error: readError } = await supabase
    .from("products")
    .select("id,stock,details");
  if (readError) throw new Error(readError.message);
  const dbStock = new Map(
    (existing ?? []).map((row) => [row.id as string, Number(row.stock ?? 0)]),
  );
  const dbDetails = new Map(
    (existing ?? []).map((row) => [
      row.id as string,
      (row.details ?? {}) as Record<string, unknown>,
    ]),
  );
  for (const row of rows) {
    if (row.image_url) continue;
    const stored = dbDetails.get(row.id);
    if (!stored) continue;
    const merged: Record<string, unknown> = { ...row.details };
    for (const key of ["imageKey", "illustration"]) {
      if (merged[key] === undefined && typeof stored[key] === "string")
        merged[key] = stored[key];
    }
    row.details = merged as typeof row.details;
  }
  const lastProducts = new Map(
    (lastPushed.products ?? []).map((p) => [String(p.id), p]),
  );
  for (const row of rows) {
    const previous = dbStock.get(row.id);
    if (previous === undefined) continue;
    const before = lastProducts.get(row.id);
    const dashboardBefore = before
      ? Math.max(0, Math.trunc(Number(before.unlimitedStock ? 99 : Number(before.stock ?? 0))))
      : row.stock;
    const delta = before ? row.stock - dashboardBefore : 0;
    row.stock = Math.max(0, previous + delta);
  }
  const keep = new Set(rows.map((row) => row.id));
  const stale = (existing ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  for (let from = 0; from < rows.length; from += 400) {
    const { error } = await supabase.from("products").upsert(rows.slice(from, from + 400));
    if (error) throw new Error(error.message);
  }
  for (let from = 0; from < stale.length; from += 100) {
    const { error } = await supabase.from("products").delete().in("id", stale.slice(from, from + 100));
    if (error) throw new Error(error.message);
  }
}

let catalogTimer: ReturnType<typeof setTimeout> | undefined;
let catalogQueue: Snapshot | null = null;

export function queueCatalogSync(snapshot: Snapshot) {
  catalogQueue = snapshot;
  if (catalogTimer) clearTimeout(catalogTimer);
  catalogTimer = setTimeout(() => {
    catalogTimer = undefined;
    if (catalogQueue) void syncCatalog(catalogQueue).catch(() => undefined);
    catalogQueue = null;
  }, 1200);
}

export async function claimAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_first_admin");
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
    } as AdminRecord & { lines: { productId: string; name: string; quantity: number; unitPrice: number }[] };
  });
}
