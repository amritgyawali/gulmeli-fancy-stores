import { createClient } from "npm:@supabase/supabase-js@2";

// Stripe Payment Sheet support for the mobile checkout.
// The client only ever sees a publishable key; the secret key stays in
// function secrets (STRIPE_SECRET_KEY). Actions:
//   {action:"intent"} -> { customer, ephemeralKey, paymentIntentClientSecret }
// Requires STRIPE_SECRET_KEY to be set with `npx supabase secrets set`.

import Stripe from "npm:stripe@17";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const secret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!secret) return reply(501, { error: "Payments are not configured." });

  const authHeader = request.headers.get("Authorization") || "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return reply(401, { error: "Sign in first." });

  let body: { action?: string; amount?: number } = {};
  try {
    body = await request.json();
  } catch {
    /* default action */
  }
  if (body.action !== "intent") return reply(400, { error: "Unknown action." });

  const stripe = new Stripe(secret, { typescript: true });
  try {
    // Reuse one customer per Supabase user so saved cards carry across devices.
    const customers = await stripe.customers.list({
      email: user.email ?? undefined,
      limit: 1,
    });
    const customer =
      customers.data[0] ??
      (await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      }));
    const amount = Math.max(50, Math.min(1_000_000, Math.round(body.amount ?? 500)));
    const [intent, ephemeralKey] = await Promise.all([
      stripe.paymentIntents.create({
        amount,
        currency: "npr",
        customer: customer.id,
        automatic_payment_methods: { enabled: true },
      }),
      stripe.ephemeralKeys.create(
        { customer: customer.id },
        { stripeVersion: "2024-12-18.acacia" },
      ),
    ]);
    return reply(200, {
      customer: customer.id,
      ephemeralKey,
      paymentIntentClientSecret: intent.client_secret,
    });
  } catch (error) {
    return reply(502, {
      error: error instanceof Error ? error.message : "Stripe is unavailable.",
    });
  }
});
