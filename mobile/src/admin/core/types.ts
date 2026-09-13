/**
 * Admin domain types.
 *
 * Everything an operator can change at runtime is a stored record or a field of
 * the storefront configuration document (`./config.ts`). Nothing that the owner
 * is expected to edit belongs in component source.
 */

export type ISODate = string;

/** Bookkeeping carried by every record in the admin store. */
export interface AdminRecord {
  id: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Set while the record sits in the trash; null/absent means live. */
  deletedAt?: ISODate | null;
  /** Incremented on every write so revisions can be listed and restored. */
  revision: number;
  [key: string]: unknown;
}

export type PublishStatus = "draft" | "scheduled" | "published" | "archived";

export const PUBLISH_STATUSES: PublishStatus[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "ready_to_ship"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded"
  | "failed";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
  "failed",
];

/** The fulfilment pipeline, in the order the Orders board shows it. */
export const FULFILMENT_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
];

/** Statuses that count as earned revenue. */
export const REVENUE_STATUSES: OrderStatus[] = [
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export type PaymentStatus =
  "unpaid" | "pending" | "paid" | "partially_refunded" | "refunded" | "failed";

export interface OrderLine {
  productId: string;
  variantId?: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  tax: number;
}

export interface Address {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  province?: string;
  country?: string;
  postalCode?: string;
}

export interface TimelineEntry {
  at: ISODate;
  actor: string;
  event: string;
  note?: string;
}

export interface AdminOrder extends AdminRecord {
  number: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  guest: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  lines: OrderLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  refundedTotal: number;
  total: number;
  couponCode?: string | null;
  shippingAddress: Address;
  billingAddress: Address;
  courier?: string | null;
  trackingNumber?: string | null;
  placedAt: ISODate;
  deliveredAt?: ISODate | null;
  customerNote?: string;
  internalNote?: string;
  timeline: TimelineEntry[];
  channel: "app" | "web" | "manual";
}

export interface AdminProductVariant {
  id: string;
  title: string;
  sku: string;
  color?: string;
  size?: string;
  material?: string;
  price: number | null;
  stock: number;
  weight?: number | null;
  image?: string | null;
}

export interface AdminProduct extends AdminRecord {
  name: string;
  slug: string;
  sku: string;
  status: PublishStatus;
  publishAt?: ISODate | null;
  unpublishAt?: ISODate | null;
  price: number;
  salePrice?: number | null;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  unlimitedStock: boolean;
  categoryId: string | null;
  brandId?: string | null;
  collectionIds: string[];
  images: string[];
  variants: AdminProductVariant[];
  views: number;
  addToCartCount: number;
  purchaseCount: number;
  returnCount: number;
}

export interface AdminCustomer extends AdminRecord {
  name: string;
  email: string;
  phone?: string;
  vip: boolean;
  blocked: boolean;
  active: boolean;
  totalSpent: number;
  orderCount: number;
  lastOrderAt?: ISODate | null;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "purge"
  | "login"
  | "publish"
  | "rollback"
  | "bulk"
  | "run"
  | "export"
  | "import"
  | "refund";

export interface AuditEntry extends AdminRecord {
  actorId: string;
  actorName: string;
  action: AuditAction;
  resource: string;
  recordId?: string | null;
  recordLabel?: string;
  changes: { field: string; before: unknown; after: unknown }[];
  ip?: string;
  device?: string;
}

export interface Revision extends AdminRecord {
  resource: string;
  recordId: string;
  snapshot: Record<string, unknown>;
  actorName: string;
  label: string;
}

export interface Actor {
  id: string;
  name: string;
  roleId: string;
}

export const SYSTEM_ACTOR: Actor = {
  id: "system",
  name: "System",
  roleId: "super_admin",
};
