import type { CartItem, Commerce, LocalOrder, Product } from "./types";
import { restoreCustomerCart } from "./cart";
import { customerSnapshot, initialCommerce } from "./commerce";
import { supabase } from "./supabase";

export async function loadCatalog(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,price,stock,category,product_group,image_url,details")
    .order("sort_order")
    .order("id");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    ...(row.details ?? {}),
    id: row.id,
    name: row.name,
    price: Number(row.price),
    stock: row.stock,
    category: row.category,
    group: row.product_group,
    imageUrl: row.image_url || undefined,
  }));
}

export async function loadCustomer(
  userId: string,
): Promise<{ commerce: Commerce; cart: CartItem[] }> {
  const [customer, orders] = await Promise.all([
    supabase
      .from("customer_state")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("document")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (customer.error) throw new Error(customer.error.message);
  if (orders.error) throw new Error(orders.error.message);
  const { cart, ...snapshot } = customer.data?.data || {};
  return {
    cart: restoreCustomerCart(cart),
    commerce: {
      ...initialCommerce,
      profile: { name: "", phone: "", address: "", avatar: "" },
      ...snapshot,
      orders: (orders.data || []).map((row) => row.document),
    },
  };
}

export async function saveCustomer(
  userId: string,
  commerce: Commerce,
  cart: CartItem[],
) {
  const { error } = await supabase
    .from("customer_state")
    .upsert({ user_id: userId, data: customerSnapshot(commerce, cart) });
  if (error) throw new Error(error.message);
}

// Idempotency: the same fingerprint reuses its request id (stored in
// localStorage), so a timeout + retry never charges stock twice.
const pendingKey = (userId: string) => `gulmeli:pending-checkout:${userId}`;

export async function checkoutRequest(
  userId: string,
  cart: CartItem[],
  voucher: string,
) {
  const fingerprint = JSON.stringify({
    items: cart
      .filter((i) => i.selected)
      .map(({ productId, quantity }) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    voucher: voucher.trim().toUpperCase(),
  });
  const raw = localStorage.getItem(pendingKey(userId));
  if (raw) {
    try {
      const pending = JSON.parse(raw);
      if (pending.fingerprint === fingerprint && typeof pending.id === "string")
        return pending.id as string;
    } catch {
      /* replace an invalid local record */
    }
  }
  const id = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(pendingKey(userId), JSON.stringify({ fingerprint, id }));
  return id;
}

export function completeCheckoutRequest(userId: string) {
  localStorage.removeItem(pendingKey(userId));
}

export async function submitOrder(
  cart: CartItem[],
  profile: Commerce["profile"],
  voucher: string,
  requestId: string,
): Promise<LocalOrder> {
  const { data, error } = await supabase.rpc("place_order", {
    p_items: cart
      .filter((i) => i.selected)
      .map((i) => ({ productId: i.productId, quantity: i.quantity })),
    p_profile: profile,
    p_voucher: voucher,
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return data as LocalOrder;
}

export async function cancelRemoteOrder(id: string): Promise<LocalOrder> {
  const { data, error } = await supabase.rpc("cancel_order", { p_order_id: id });
  if (error) throw new Error(error.message);
  return data as LocalOrder;
}
