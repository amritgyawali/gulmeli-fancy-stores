import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Device-level preferences kept with Zustand: they belong to this handset,
// never to the shared account state, so they live outside ShopProvider's
// Supabase/AsyncStorage sync and are cheap to read from anywhere.

interface PrefsState {
  pushOptIn: boolean;
  biometricsEnabled: boolean;
  setPushOptIn(value: boolean): void;
  setBiometricsEnabled(value: boolean): void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      pushOptIn: true,
      biometricsEnabled: false,
      setPushOptIn: (pushOptIn) => set({ pushOptIn }),
      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
    }),
    { name: "gulmeli:prefs:v1", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
