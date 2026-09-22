import type { StorefrontConfig } from "@/admin/core/config";

/*
 * Delivery terms shown before an order exists — the same numbers, fallbacks
 * and wording as the web storefront's lib/shipping, so the app and the site
 * never quote a customer two different delivery fees. The server's order
 * quote remains authoritative at checkout.
 */

export interface DeliveryTerms {
  fee: number;
  freeOver: number;
  estimate: string;
  returnDays: number;
}

const FALLBACK: DeliveryTerms = { fee: 60, freeOver: 500, estimate: "2–4 days", returnDays: 7 };

export function deliveryTerms(config: StorefrontConfig): DeliveryTerms {
  const fee = Number(config.checkout.defaultShippingFee);
  const freeOver = Number(config.checkout.freeShippingThreshold);
  return {
    fee: Number.isFinite(fee) && fee > 0 ? fee : FALLBACK.fee,
    freeOver: Number.isFinite(freeOver) && freeOver > 0 ? freeOver : FALLBACK.freeOver,
    estimate: FALLBACK.estimate,
    returnDays: FALLBACK.returnDays,
  };
}

export const deliveryFeeFor = (subtotal: number, terms: DeliveryTerms) =>
  terms.freeOver > 0 && subtotal >= terms.freeOver ? 0 : terms.fee;

/* "Thu, Sep 24 – Sat, Sep 26" from an estimate like "2–4 days". */
export function deliveryWindow(estimate: string, from = new Date()) {
  const nums = (estimate.match(/\d+/g) ?? []).map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  const at = (days: number) => {
    const d = new Date(from);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? at(min) : `${at(min)} – ${at(max)}`;
}

/* The one voucher the store honours (see store/commerce voucherDiscount). */
export const VOUCHER_TERMS = "GULMELI10 — 10% off orders over Rs. 500, up to Rs. 100.";
