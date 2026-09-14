import { useEffect, useState, type PropsWithChildren } from "react";
import { AppState, Platform, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { usePrefs } from "@/store/prefs";
import { Button, T } from "@/components/ui";

// Optional biometric lock (Face ID / fingerprint / device credential).
// It stays hidden until the customer turns it on in Settings. While locked,
// the app content is replaced by this veil; the navigator state is untouched.

export function AppLock({ children }: PropsWithChildren) {
  const enabled = usePrefs((s) => s.biometricsEnabled);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    let active = true;
    // Lock on cold start and whenever the app returns to the foreground.
    const unlock = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!compatible || !enrolled) {
          usePrefs.getState().setBiometricsEnabled(false);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Gulmeli Fancy Stores",
          disableDeviceFallback: false,
          cancelLabel: "Cancel",
        });
        if (!active) return;
        setLocked(!result.success);
        setNotice(
          result.success
            ? ""
            : "Biometric unlock failed. Open the app again to try.",
        );
      } catch {
        if (active) setLocked(false);
      }
    };
    void unlock();
    // Lock again when the app returns from the background.
    const subscription = AppState.addEventListener("change", (value) => {
      if (value === "active") void unlock();
      else if (value === "background") setLocked(true);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [enabled]);

  if (!enabled || Platform.OS === "web" || !locked) return <>{children}</>;
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#161616",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
      }}
    >
      <T size={20} bold color="#fff">
        Gulmeli Fancy Stores is locked
      </T>
      {!!notice && (
        <T color="#fca5a5" accessibilityRole="alert">
          {notice}
        </T>
      )}
      <Button
        title="Unlock with biometrics"
        onPress={() => {
          setNotice("");
          void (async () => {
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: "Unlock Gulmeli Fancy Stores",
            });
            setLocked(!result.success);
            if (!result.success)
              setNotice("Biometric unlock failed. Try again.");
          })();
        }}
      />
    </View>
  );
}
