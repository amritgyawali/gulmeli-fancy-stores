import { usePublishedConfig } from "./config-api";
import { rs } from "./format";

/*
 * Delivery terms, in one place.
 *
 * The admin console has had `freeShippingThreshold` and `defaultShippingFee`
 * fields since the config schema was written, and nothing on the storefront
 * read either of them. Instead three files each invented their own numbers:
 * the cart drawer charged Rs.60 over a Rs.500 threshold, the product page
 * quoted "Standard Rs.50 / Express Rs.100", and the checkout applied whatever
 * the server returned. A customer could see three different delivery fees for
 * one order without leaving the site.
 *
 * Everything on the storefront now quotes from here, and here reads the
 * published config. The server-side quote remains authoritative at checkout —
 * this is what we show before the order exists.
 */

export interface DeliveryTerms {
  /* Charged when the order is below the free-delivery threshold. */
  fee: number;
  /* 0 means the store does not offer free delivery on spend. */
  freeOver: number;
  /* Days, for display only. */
  estimate: string;
  returnDays: number;
}

const FALLBACK: DeliveryTerms = {
  fee: 60,
  freeOver: 500,
  estimate: "2–4 days",
  returnDays: 7,
};

export function useDeliveryTerms(): DeliveryTerms {
  const config = usePublishedConfig();
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

export const freeDeliveryCopy = (terms: DeliveryTerms) =>
  terms.freeOver > 0
    ? `Free delivery on orders over ${rs(terms.freeOver)}`
    : `Delivery ${rs(terms.fee)}`;
