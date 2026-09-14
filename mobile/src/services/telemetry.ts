import Constants from "expo-constants";
import { integrations } from "./integrations";

// Analytics (PostHog) and crash reporting (Sentry) are optional. Without their
// keys nothing is loaded at runtime, so the web bundle and Expo Go stay lean.
// With the keys in .env.local the SDKs initialise once, at boot.

type SentryModule = typeof import("@sentry/react-native");
type PostHogClass = (typeof import("posthog-react-native"))["default"];
type PostHogInstance = InstanceType<PostHogClass>;

let sentry: SentryModule | null = null;
let posthog: PostHogInstance | null = null;
let initialised = false;

// Loaded dynamically so the SDK never enters the bundle when no key is set.
async function loadSentry(): Promise<SentryModule | null> {
  try {
    return await import("@sentry/react-native");
  } catch {
    return null;
  }
}
async function loadPostHog(): Promise<PostHogClass | null> {
  try {
    return (await import("posthog-react-native")).default;
  } catch {
    return null;
  }
}

export function initTelemetry() {
  if (initialised) return;
  initialised = true;
  registerGlobalErrorHandler();
  if (integrations.sentryEnabled) {
    void loadSentry().then(async (mod) => {
      try {
        await mod?.init({
          dsn: integrations.sentryDsn,
          environment:
            (Constants.expoConfig?.extra?.sentryEnvironment as string) ||
            "production",
          tracesSampleRate: 0.2,
          debug: false,
        });
        sentry = mod ?? null;
      } catch {
        sentry = null;
      }
    });
  }
  if (integrations.posthogEnabled) {
    void loadPostHog().then((PostHog) => {
      try {
        posthog = PostHog
          ? new PostHog(integrations.posthogKey, {
              host: integrations.posthogHost,
              captureAppLifecycleEvents: true,
            })
          : null;
      } catch {
        posthog = null;
      }
    });
  }
}

export function identifyUser(userId: string | null, email?: string | null) {
  if (sentry) {
    try {
      sentry.setUser(userId ? { id: userId, email: email ?? undefined } : null);
    } catch {
      /* no-op */
    }
  }
  if (posthog) {
    try {
      if (userId) posthog.identify(userId, email ? { email } : undefined);
      else posthog.reset();
    } catch {
      /* no-op */
    }
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!posthog) return;
  try {
    posthog.capture(event, properties as never);
  } catch {
    /* no-op */
  }
}

export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
) {
  if (!sentry) return;
  try {
    sentry.captureException(error, { extra: context });
  } catch {
    /* no-op */
  }
}

let globalErrorHook = false;
/** Reports unhandled JS errors to Sentry once it has loaded. */
function registerGlobalErrorHandler() {
  if (globalErrorHook) return;
  globalErrorHook = true;
  try {
    const previous = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      reportError(error, { fatal: !!isFatal });
      previous?.(error, isFatal);
    });
  } catch {
    /* web or unsupported */
  }
}

/**
 * Identity wrapper kept for the root layout. Unhandled JS errors reach Sentry
 * through registerGlobalErrorHandler instead of a synchronous SDK wrap,
 * because the SDK itself loads lazily and only when a DSN is configured.
 */
export function withErrorReporting<T>(Root: T): T {
  return Root;
}
