import { useRef, useState } from "react";
import { usePaymentSheet } from "@stripe/stripe-react-native";
import { requireSupabase } from "@/services/supabase";
import { Button } from "@/components/ui";
import { track } from "@/services/telemetry";

// Lazy-loaded from the checkout screen only when a Stripe publishable key is
// configured, so this module (and the native SDK) never enters web bundles.

interface IntentResponse {
  customer?: string;
  ephemeralKey?: string;
  paymentIntentClientSecret?: string;
  error?: string;
}

export default function StripePayButton({
  total,
  onBusy,
  onError,
  onPaid,
}: {
  total: number;
  onBusy(value: boolean): void;
  onError(message: string): void;
  onPaid(): void;
}) {
  const sheet = usePaymentSheet();
  const busy = useRef(false);
  const [working, setWorking] = useState(false);

  const pay = async () => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    onBusy(true);
    try {
      const { data, error } = await requireSupabase().functions.invoke(
        "stripe-payment-intent",
        { body: { action: "intent", amount: Math.round(total * 100) } },
      );
      const intent = (data ?? {}) as IntentResponse;
      if (error || !intent.paymentIntentClientSecret)
        throw new Error(
          intent.error ||
            "The payment service is unavailable. Please try again.",
        );
      const { error: initError } = await sheet.initPaymentSheet({
        merchantDisplayName: "Gulmeli Fancy Stores",
        customerId: intent.customer,
        customerEphemeralKeySecret: intent.ephemeralKey,
        paymentIntentClientSecret: intent.paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
      });
      if (initError) throw new Error(initError.message);
      const { error: presentError } = await sheet.presentPaymentSheet();
      if (presentError) {
        if (!/cancel/i.test(presentError.message || ""))
          throw new Error(presentError.message);
      } else {
        track("payment_card_succeeded", { total });
        onPaid();
      }
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "The payment failed.",
      );
    } finally {
      busy.current = false;
      setWorking(false);
      onBusy(false);
    }
  };

  return (
    <Button
      title={working ? "Opening secure payment…" : "Pay with card"}
      outline
      disabled={working}
      onPress={() => void pay()}
    />
  );
}
