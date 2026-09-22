import { Stack, usePathname, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ShopProvider, useShop } from "@/store/ShopProvider";
import {
  StorefrontProvider,
  useStorefront,
  useStorefrontTheme,
} from "@/store/StorefrontProvider";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BrandDocument } from "@/components/BrandDocument";
import { AppLock } from "@/components/AppLock";
import { Button, Row, T } from "@/components/ui";
import { ToastProvider } from "@/components/Toast";
import { ClerkAuth } from "@/services/clerk-auth";
import { initTelemetry, withErrorReporting } from "@/services/telemetry";
import { queryClient } from "@/services/queries";
import { registerForPushNotifications } from "@/services/notifications";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
initTelemetry();
function AppFrame() {
  const path = usePathname();
  const {
    hydrated,
    storageError,
    live,
    session,
    sessionReady,
    customerReady,
    catalogReady,
    backendError,
    syncStatus,
    retryBackend,
  } = useShop();
  const { config, announcement, maintenance, label } = useStorefront();
  const theme = useStorefrontTheme();
  const { width } = useWindowDimensions();
  const [loaded, error] = useFonts(FontAwesome6.font);
  const admin = path.startsWith("/admin");
  useEffect(() => {
    if (hydrated && (loaded || error)) void SplashScreen.hideAsync();
  }, [hydrated, loaded, error]);
  useEffect(() => {
    // Ask for push permission once, after the first frame is up.
    if (!hydrated) return;
    void registerForPushNotifications();
  }, [hydrated]);
  if (!hydrated || (!loaded && !error)) return null;
  // One navigator, rendered either inside the storefront frame or full-bleed
  // for the dashboard, so navigation state survives moving between the two.
  //
  // Transitions: the tab destinations (home, offers, messages, cart,
  // account) switch in place, as tabs do, because sliding between siblings
  // reads as going "deeper". Everything opened from them — a product,
  // search, a feature page — pushes with the platform's own transition and
  // can be swiped back on iOS.
  const tab = { animation: "fade" as const, animationDuration: 140 };
  const navigator = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: admin ? "#f6f7f9" : theme.background },
        animation: "default",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={tab} />
      <Stack.Screen name="messages" options={tab} />
      <Stack.Screen name="offers" options={tab} />
      <Stack.Screen name="cart" options={tab} />
      <Stack.Screen name="account" options={tab} />
      <Stack.Screen name="product/[id]" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="search" options={{ animation: "fade_from_bottom" }} />
      <Stack.Screen name="admin" options={{ animation: "none" }} />
    </Stack>
  );
  // The product screen carries its own Add to cart bar where the tab bar sits.
  const ownActionBar = path.startsWith("/product/");
  const immersive = ownActionBar || path === "/search";
  // The dashboard is its own full-width surface, without the storefront chrome.
  if (admin)
    return (
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: "#f6f7f9" }}
      >
        <StatusBar style="dark" />
        {navigator}
      </SafeAreaView>
    );
  const backgroundColor = theme.background;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: "center",
      }}
    >
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: width >= 768 ? 1100 : undefined,
          backgroundColor,
        }}
      >
        <StatusBar style={theme.dark ? "light" : "dark"} />
        {!!announcement && (
          <T
            size={11}
            bold
            color={announcement.textColor}
            style={{
              backgroundColor: announcement.backgroundColor,
              paddingVertical: 5,
              paddingHorizontal: 10,
              textAlign: "center",
            }}
          >
            {announcement.text}
          </T>
        )}
        {maintenance.active && (
          <T
            accessibilityRole="alert"
            size={11}
            color="#7c2d12"
            style={{ backgroundColor: "#ffedd5", padding: 8 }}
          >
            {[
              maintenance.message,
              maintenance.eta && `Expected back: ${maintenance.eta}.`,
            ]
              .filter(Boolean)
              .join(" ")}
          </T>
        )}
        {storageError && (
          <T
            size={11}
            color="#b91c1c"
            style={{ backgroundColor: "#fff", padding: 6 }}
          >
            {storageError}
          </T>
        )}
        {/* Account/connection status. Not on the product or search screens,
            where the shopping task owns the whole screen — except for a
            backend error, which always shows. */}
        {live && (!immersive || !!backendError) && (
          <View
            style={{
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
              paddingVertical: 6,
              gap: 5,
            }}
          >
            {!!backendError ? (
              <T accessibilityRole="alert" color="#b91c1c">
                {backendError}
              </T>
            ) : !catalogReady ? (
              <T>Loading products…</T>
            ) : !sessionReady ? (
              <T>Loading your account…</T>
            ) : session && !customerReady ? (
              <T>Loading your saved account…</T>
            ) : !session ? (
              <Row style={{ justifyContent: "space-between", gap: 12 }}>
                <T color={theme.muted} style={{ flex: 1 }}>
                  Welcome. Sign in to save your favourites.
                </T>
                <Button
                  title={path === "/account" ? "Sign in" : label("login")}
                  color={config.theme.primaryColor}
                  onPress={() => router.push("/auth")}
                />
              </Row>
            ) : (
              <T>{syncStatus || "Connected to your account"}</T>
            )}
            {syncStatus.startsWith("Account not saved") && (
              <T accessibilityRole="alert" color="#b91c1c">
                {syncStatus}
              </T>
            )}
            {(!!backendError || syncStatus.startsWith("Account not saved")) && (
              <Button
                title="Retry connection"
                outline
                onPress={() => void retryBackend()}
              />
            )}
          </View>
        )}
        <ToastProvider>
          {navigator}
          {!ownActionBar && <BottomNavigation />}
        </ToastProvider>
      </SafeAreaView>
    </View>
  );
}
export default withErrorReporting(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ClerkAuth>
            <StorefrontProvider>
              <BrandDocument />
              <ShopProvider>
                <AppLock>
                  <AppFrame />
                </AppLock>
              </ShopProvider>
            </StorefrontProvider>
          </ClerkAuth>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
});
