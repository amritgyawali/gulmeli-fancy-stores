import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { CartItem } from "./types";
export interface OrderQuote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  voucher: string;
}
export function useOrderQuote(
  enabled: boolean,
  cart: CartItem[],
  voucher: string,
) {
  const key = JSON.stringify({
    p_items: cart
      .filter((i) => i.selected)
      .map((i) => ({ productId: i.productId, quantity: i.quantity })),
    p_voucher: voucher,
  });
  const [result, setResult] = useState<{
    key: string;
    quote: OrderQuote | null;
    error: string;
  }>({ key: "", quote: null, error: "" });
  useEffect(() => {
    if (!enabled || !supabase) return;
    const client = supabase;
    let active = true;
    const refresh = () => {
      void client
        .rpc("quote_order", JSON.parse(key))
        .then(({ data, error }) => {
          if (active)
            setResult({
              key,
              quote: error ? null : data,
              error: error?.message ?? "",
            });
        });
    };
    const timer = setTimeout(refresh, 250),
      poll = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [enabled, key]);
  return enabled && result.key === key
    ? result
    : { quote: null, error: "", key };
}
