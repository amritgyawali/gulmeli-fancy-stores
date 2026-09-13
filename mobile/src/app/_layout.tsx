import { Stack, usePathname, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts } from "expo-font";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";
import { ShopProvider, useShop } from "@/store/ShopProvider";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button, Row, T } from "@/components/ui";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
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
  const [loaded, error] = useFonts(FontAwesome6.font);
  useEffect(() => {
    if (hydrated && (loaded || error)) void SplashScreen.hideAsync();
  }, [hydrated, loaded, error]);
  if (!hydrated || (!loaded && !error)) return null;
  const backgroundColor =
    path === "/"
      ? "#161616"
      : path === "/offers"
        ? "#FF4600"
        : path === "/account"
          ? "#fceae4"
          : path === "/messages"
            ? "#f4f4f6"
            : "#fff";
  return (
    <View style={{ flex: 1, backgroundColor: "#e5e7eb", alignItems: "center" }}>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: path === "/" ? 448 : 430,
          backgroundColor,
        }}
      >
        <StatusBar
          style={path === "/" || path === "/offers" ? "light" : "dark"}
        />
        {storageError && (
          <T
            size={11}
            color="#b91c1c"
            style={{ backgroundColor: "#fff", padding: 6 }}
          >
            {storageError}
          </T>
        )}
        {live && (
          <View style={{ backgroundColor: "#fff7ed", padding: 8, gap: 5 }}>
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
              <Row style={{ justifyContent: "space-between" }}>
                <T>Shop with Gulmeli Fancy Stores</T>
                <Button title="Sign in" onPress={() => router.push("/auth")} />
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
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#f4f4f4" },
            animation: "none",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="offers" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="account" />
        </Stack>
        <BottomNavigation />
      </SafeAreaView>
    </View>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ShopProvider>
        <AppFrame />
      </ShopProvider>
    </SafeAreaProvider>
  );
}
