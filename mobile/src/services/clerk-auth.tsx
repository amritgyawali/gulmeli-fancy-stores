import type { PropsWithChildren } from "react";
import { Platform } from "react-native";
import { ClerkProvider, useAuth, useSSO } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { integrations } from "./integrations";

// Clerk is the optional alternative auth provider (email, Google, Apple).
// It only mounts when EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set on a native
// build; on web the storefront keeps using Supabase email/password auth.
// `clerkMounted` is a module constant, so the guarded hook calls below stay
// stable across renders (the rules-of-hooks condition never flips).

export const clerkMounted =
  integrations.clerkEnabled &&
  !!tokenCache &&
  Platform.OS !== "web" &&
  !!integrations.clerkPublishableKey;

export function ClerkAuth({ children }: PropsWithChildren) {
  if (!clerkMounted || !tokenCache) return <>{children}</>;
  return (
    <ClerkProvider
      publishableKey={integrations.clerkPublishableKey}
      tokenCache={tokenCache}
    >
      {children}
    </ClerkProvider>
  );
}

export type SocialProvider = "oauth_google" | "oauth_apple";

/**
 * Gives the sign-in screen Clerk social buttons. When Clerk is not configured
 * `start()` resolves false immediately, so callers render nothing extra.
 */
export function useSocialSignIn() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = clerkMounted ? useAuth() : null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const sso = clerkMounted ? useSSO() : null;
  return {
    available: clerkMounted && !!auth?.isLoaded && !!sso,
    /** Resolves true once the browser round-trip finished and Clerk is active. */
    start: async (provider: SocialProvider): Promise<boolean> => {
      if (!sso) return false;
      const { createdSessionId, setActive } = await sso.startSSOFlow({
        strategy: provider,
      });
      if (createdSessionId && setActive)
        await setActive({ session: createdSessionId });
      return !!createdSessionId;
    },
    /** Signs the Clerk user out alongside the storefront sign-out. */
    signOut: async (): Promise<void> => {
      if (auth?.isSignedIn) await auth.signOut();
    },
  };
}
