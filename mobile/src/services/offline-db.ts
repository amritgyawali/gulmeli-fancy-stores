// Shared offline cache. Native devices use expo-sqlite (see offline-db.native.ts);
// web falls back to AsyncStorage, which covers static exports and dev builds.
import AsyncStorage from "@react-native-async-storage/async-storage";

type Entry = { value: string; updated_at: number };

export const offlineDb = {
  available(): boolean {
    return true;
  },
  async saveCatalog(key: string, rows: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `gulmeli:offline:${key}`,
        JSON.stringify(rows.map((value) => ({ value, updated_at: Date.now() }) as Entry)),
      );
    } catch {
      /* cache write failure is non-fatal */
    }
  },
  async loadCatalog<T>(key: string): Promise<T[] | null> {
    try {
      const raw = await AsyncStorage.getItem(`gulmeli:offline:${key}`);
      const rows = raw ? (JSON.parse(raw) as Entry[]) : null;
      return rows ? rows.map((r) => JSON.parse(r.value) as T) : null;
    } catch {
      return null;
    }
  },
  async put(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `gulmeli:offline:kv:${key}`,
        JSON.stringify({ value, updated_at: Date.now() } as Entry),
      );
    } catch {
      /* ignore */
    }
  },
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(`gulmeli:offline:kv:${key}`);
      return raw ? ((JSON.parse(raw) as Entry).value ? (JSON.parse((JSON.parse(raw) as Entry).value) as T) : null) : null;
    } catch {
      return null;
    }
  },
  async count(key: string): Promise<number> {
    const rows = await this.loadCatalog(key);
    return rows?.length ?? 0;
  },
  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem("gulmeli:offline:products");
    } catch {
      /* ignore */
    }
  },
};
