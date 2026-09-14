import { Platform } from "react-native";
import { integrations } from "./integrations";

// Stripe in-app payments. Requires EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY on the
// client and STRIPE_SECRET_KEY as a Supabase Edge Function secret (the
// stripe-payment-intent function creates the PaymentIntent). Without either,
// `paymentsAvailable` is false and checkout keeps Cash on delivery only.
// The SDK itself is loaded lazily by StripePayButton so web and unconfigured
// builds never pull the native module.

export const paymentsAvailable =
  integrations.stripeEnabled && Platform.OS !== "web";
