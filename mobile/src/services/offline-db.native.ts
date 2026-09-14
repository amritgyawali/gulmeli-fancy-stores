import * as SQLite from "expo-sqlite";

// A local mirror of the catalog and the last known account state, so the app
// keeps opening products and the cart while the network is down. Everything
// here is opportunistic: failures degrade to "no cache", never to a crash.

const DATABASE_NAME = "gulmeli-offline.db";

let handle: SQLite.SQLiteDatabase | null = null;
let broken = false;

function open(): SQLite.SQLiteDatabase | null {
  if (broken) return null;
  if (!handle) {
    try {
      handle = SQLite.openDatabaseSync(DATABASE_NAME);
      handle.execSync(`
        create table if not exists catalog (key text primary key, value text not null, updated_at integer not null);
        create table if not exists kv (key text primary key, value text not null, updated_at integer not null);
      `);
    } catch {
      broken = true;
      handle = null;
    }
  }
  return handle;
}

export const offlineDb = {
  available(): boolean {
    return !!open();
  },
  async saveCatalog(key: string, rows: unknown[]): Promise<void> {
    const db = open();
    if (!db) return;
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync("delete from catalog where key = ?", key);
        for (const row of rows)
          await db.runAsync(
            "insert into catalog(key, value, updated_at) values(?,?,?)",
            key,
            JSON.stringify(row),
            Date.now(),
          );
      });
    } catch {
      /* cache write failure is non-fatal */
    }
  },
  async loadCatalog<T>(key: string): Promise<T[] | null> {
    const db = open();
    if (!db) return null;
    try {
      const rows = await db.getAllAsync<{ value: string }>(
        "select value from catalog where key = ?",
        key,
      );
      return rows.length ? rows.map((r) => JSON.parse(r.value) as T) : null;
    } catch {
      return null;
    }
  },
  async put(key: string, value: unknown): Promise<void> {
    const db = open();
    if (!db) return;
    try {
      await db.runAsync(
        "insert into catalog(key,value,updated_at) values(?,?,?) on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at",
        key,
        JSON.stringify(value),
        Date.now(),
      );
    } catch {
      /* ignore */
    }
  },
  async get<T>(key: string): Promise<T | null> {
    const db = open();
    if (!db) return null;
    try {
      const row = await db.getFirstAsync<{ value: string }>(
        "select value from catalog where key = ?",
        key,
      );
      return row ? (JSON.parse(row.value) as T) : null;
    } catch {
      return null;
    }
  },
  async count(key: string): Promise<number> {
    const db = open();
    if (!db) return 0;
    try {
      const row = await db.getFirstAsync<{ n: number }>(
        "select count(*) as n from catalog where key = ?",
        key,
      );
      return row?.n ?? 0;
    } catch {
      return 0;
    }
  },
  async clear(): Promise<void> {
    const db = open();
    if (!db) return;
    try {
      await db.runAsync("delete from catalog");
      await db.runAsync("delete from kv");
    } catch {
      /* ignore */
    }
  },
};
