import type { CartItem, Commerce, LocalOrder, Product, Profile } from "./types";

export const initialCommerce: Commerce = {
  profile: { name: "", phone: "", address: "", avatar: "" },
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

// Mirror of the mobile restoreCommerce validator: only a complete, valid
// document from customer_state is accepted, everything else resets.
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
          "Confirmed",
          "Processing",
          "Packed",
          "Out_for_delivery",
          "Returned",
          "Refunded",
          "Failed",
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
  return c;
}

export function customerSnapshot(commerce: Commerce, cart: CartItem[]) {
  const { orders: _orders, ...snapshot } = commerce;
  return { ...snapshot, cart };
}
