import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { backendConfig } from "./backend-config";
import { supabase } from "./supabase";

// Push notifications via expo-notifications (which routes to FCM on Android
// and APNs on iOS). The native module is loaded lazily so Expo Go, web and
// static exports never touch it. Everything fails soft: the app works without
// push. See docs/integrations.md for the Firebase google-services.json setup.

const INSTALL_KEY = "gulmeli:push:install";

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Notifications = await import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    const permission = await Notifications.getPermissionsAsync();
    let status = permission.status;
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token: string | null = tokenData.data || null;
    if (!token || !backendConfig.live || !supabase) return token;
    let install = await AsyncStorage.getItem(INSTALL_KEY);
    if (!install) {
      install = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(INSTALL_KEY, install);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Save the token so admin automations can address this device.
    await supabase
      .from("device_tokens")
      .upsert(
        {
          token,
          user_id: user?.id ?? null,
          platform: Platform.OS,
          install_id: install,
        },
        { onConflict: "token" },
      );
    return token;
  } catch {
    return null;
  }
}

/** A local reminder to track a freshly placed order. */
export async function scheduleOrderUpdateReminder(orderId: string) {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Track your order",
        body: `Tap to see the latest status for order ${orderId.slice(0, 8)}.`,
        data: { orderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 3600,
      },
    });
  } catch {
    /* non-fatal */
  }
}

/** Local notification for offers and cart nudges. */
export async function notifyLocal(title: string, body: string) {
  if (Platform.OS === "web") return;
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    /* non-fatal */
  }
}

/** Subscribe to incoming pushes; returns an unsubscribe function. */
export async function subscribeToPushNotifications(
  onReceive: (data: Record<string, unknown>) => void,
): Promise<() => void> {
  if (Platform.OS === "web") return () => undefined;
  try {
    const Notifications = await import("expo-notifications");
    const sub = Notifications.addNotificationReceivedListener((n) =>
      onReceive((n.request.content.data || {}) as Record<string, unknown>),
    );
    return () => sub.remove();
  } catch {
    return () => undefined;
  }
}
