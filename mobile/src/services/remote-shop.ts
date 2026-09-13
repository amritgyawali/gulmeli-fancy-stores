import type { CartItem, Product } from "@/types/shop";
import {
  initialCommerce,
  restoreCommerce,
  type Commerce,
  type LocalOrder,
  type Profile,
} from "@/store/commerce";
import { requireSupabase } from "./supabase";
import { restoreCustomerCart } from "@/store/customer-cart";

export function customerSnapshot(commerce: Commerce, cart: CartItem[]) {
  // Orders and monetary authority are never writable through customer snapshots.
  const { orders: _orders, ...snapshot } = commerce;
  return { ...snapshot, cart };
}

export async function loadCatalog(): Promise<Product[]> {
  const { data, error } = await requireSupabase()
    .from("products")
    .select("id,name,price,stock,category,product_group,image_url,details")
    .order("sort_order")
    .order("id");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    ...row.details,
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
  const client = requireSupabase();
  const [customer, orders] = await Promise.all([
    client
      .from("customer_state")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle(),
    client
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
    commerce: restoreCommerce({
      ...initialCommerce,
      profile: { name: "", phone: "", address: "", avatar: "" },
      ...snapshot,
      orders: (orders.data || []).map((row) => row.document),
    }),
  };
}

export async function saveCustomer(
  userId: string,
  commerce: Commerce,
  cart: CartItem[],
) {
  const { error } = await requireSupabase()
    .from("customer_state")
    .upsert({
      user_id: userId,
      data: customerSnapshot(commerce, cart),
    });
  if (error) throw new Error(error.message);
}

export async function submitOrder(
  cart: CartItem[],
  profile: Profile,
  voucher: string,
  requestId: string,
): Promise<LocalOrder> {
  const { data, error } = await requireSupabase().rpc("place_order", {
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
  const { data, error } = await requireSupabase().rpc("cancel_order", {
    p_order_id: id,
  });
  if (error) throw new Error(error.message);
  return data as LocalOrder;
}
