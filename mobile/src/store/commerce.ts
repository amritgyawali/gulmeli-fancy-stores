import type { CartItem, Product } from "../types/shop.ts";
import { currentBrand } from "../utils/branding.ts";

export interface Profile {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}
export interface LocalOrder {
  id: string;
  createdAt: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  profile: Profile;
  status: "Saved locally" | "Placed" | "Shipped" | "Delivered" | "Cancelled";
}
export interface Commerce {
  profile: Profile;
  wishlist: string[];
  following: string[];
  recent: string[];
  orders: LocalOrder[];
  reviews: { productId: string; rating: number; text: string }[];
  drafts: { id: string; text: string; createdAt: string }[];
  notifications: boolean;
  gems: number;
  lastCheckIn: string;
  voucher: string;
}
export const initialCommerce: Commerce = {
  profile: { name: "Arjun Gyawali", phone: "", address: "", avatar: "" },
  wishlist: [],
  following: [],
  recent: [],
  orders: [],
  reviews: [],
  drafts: [],
  notifications: true,
  gems: 0,
  lastCheckIn: "",
  voucher: "",
};
export function profileError(profile: Profile) {
  if (profile.name.trim().length < 2) return "Enter your full name.";
  if (
    !/^\+?[0-9\s-]+$/.test(profile.phone.trim()) ||
    profile.phone.replace(/\D/g, "").length < 7 ||
    profile.phone.replace(/\D/g, "").length > 15
  )
    return "Enter a valid phone number (7–15 digits).";
  if (profile.address.trim().length < 8)
    return "Enter your street, city and delivery area.";
  return "";
}
export function voucherDiscount(code: string, subtotal: number) {
  return code.trim().toUpperCase() === "GULMELI10" && subtotal >= 500
    ? Math.min(100, Math.round(subtotal * 0.1))
    : 0;
}
export function createLocalOrder(
  cart: CartItem[],
  catalog: Record<string, Product>,
  profile: Profile,
  voucher: string,
  id: string,
): LocalOrder {
  const error = profileError(profile);
  if (error) throw new Error(error);
  const items = cart
    .filter((i) => i.selected)
    .map((i) => {
      const p = catalog[i.productId];
      if (
        !p ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > p.stock
      )
        throw new Error("An item is out of stock. Update your cart.");
      return {
        productId: p.id,
        name: p.name,
        price: p.price,
        quantity: i.quantity,
      };
    });
  if (!items.length) throw new Error("Select at least one item in your cart.");
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = voucherDiscount(voucher, subtotal);
  return {
    id,
    createdAt: new Date().toISOString(),
    items,
    subtotal,
    discount,
    total: subtotal - discount,
    profile: { ...profile },
    status: "Saved locally",
  };
}

// Restore only a complete, valid local snapshot; keep the existing cart adapter independent.
export function restoreCommerce(value: unknown): Commerce {
  if (!value || typeof value !== "object")
    return JSON.parse(JSON.stringify(initialCommerce)) as Commerce;
  const c = value as Commerce;
  const strings = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  if (
    !c.profile ||
    ![
      c.profile.name,
      c.profile.phone,
      c.profile.address,
      c.profile.avatar,
    ].every((x) => typeof x === "string") ||
    !strings(c.wishlist) ||
    !strings(c.following) ||
    !strings(c.recent) ||
    !Array.isArray(c.orders) ||
    !c.orders.every(
      (o) =>
        o &&
        typeof o.id === "string" &&
        typeof o.createdAt === "string" &&
        [
          "Saved locally",
          "Placed",
          "Shipped",
          "Delivered",
          "Cancelled",
        ].includes(o.status) &&
        Number.isFinite(o.total) &&
        Array.isArray(o.items) &&
        o.items.every(
          (i) =>
            i &&
            typeof i.productId === "string" &&
            typeof i.name === "string" &&
            Number.isFinite(i.price) &&
            Number.isInteger(i.quantity) &&
            i.quantity > 0,
        ),
    ) ||
    !Array.isArray(c.reviews) ||
    !c.reviews.every(
      (r) =>
        r &&
        typeof r.productId === "string" &&
        typeof r.text === "string" &&
        Number.isInteger(r.rating) &&
        r.rating >= 1 &&
        r.rating <= 5,
    ) ||
    !Array.isArray(c.drafts) ||
    !c.drafts.every(
      (d) =>
        d &&
        typeof d.id === "string" &&
        typeof d.text === "string" &&
        typeof d.createdAt === "string",
    ) ||
    typeof c.notifications !== "boolean" ||
    !Number.isFinite(c.gems) ||
    c.gems < 0 ||
    typeof c.lastCheckIn !== "string" ||
    typeof c.voucher !== "string"
  )
    return JSON.parse(JSON.stringify(initialCommerce)) as Commerce;
  return {
    ...c,
    following: [...new Set(c.following.map(currentBrand))],
    orders: c.orders.map((order) => ({ ...order, id: currentBrand(order.id) })),
    voucher: currentBrand(c.voucher),
    drafts: c.drafts.map((draft) => ({
      ...draft,
      text: draft.text.replace(
        /^GFC invitation:/,
        "Gulmeli Fancy Stores invitation:",
      ),
    })),
  };
}
