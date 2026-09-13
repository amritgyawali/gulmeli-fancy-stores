import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartItem } from "@/types/shop";

const key = (userId: string) => `gulmeli:pending-checkout:${userId}`;

export async function checkoutRequest(
  userId: string,
  cart: CartItem[],
  voucher: string,
) {
  // Store only product IDs/quantities, not the delivery address or credentials.
  const fingerprint = JSON.stringify({
    items: cart
      .filter((i) => i.selected)
      .map(({ productId, quantity }) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    voucher: voucher.trim().toUpperCase(),
  });
  const raw = await AsyncStorage.getItem(key(userId));
  if (raw) {
    try {
      const pending = JSON.parse(raw);
      if (pending.fingerprint === fingerprint && typeof pending.id === "string")
        return pending.id as string;
    } catch {
      /* Replace an invalid local record. */
    }
  }
  const id = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Persist before sending: a timeout followed by an app restart is still a retry.
  await AsyncStorage.setItem(key(userId), JSON.stringify({ fingerprint, id }));
  return id;
}

export async function completeCheckoutRequest(userId: string) {
  await AsyncStorage.removeItem(key(userId));
}
