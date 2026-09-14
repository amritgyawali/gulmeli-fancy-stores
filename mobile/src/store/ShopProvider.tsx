import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { CartItem, Product, ShopState } from "@/types/shop";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import {
  choiceProducts,
  products as localProducts,
  productById as localProductById,
} from "@/data/catalog";
import {
  checkoutRequest,
  completeCheckoutRequest,
} from "@/services/checkout-request";
import { backendConfig } from "@/services/backend-config";
import { supabase, requireSupabase } from "@/services/supabase";
import {
  loadCatalog,
  loadCustomer,
  saveCustomer,
  customerSnapshot,
  submitOrder,
  cancelRemoteOrder,
} from "@/services/remote-shop";
import {
  queryClient,
  CATALOG_QUERY_KEY,
  fetchCatalogCached,
  cachedCatalog,
} from "@/services/queries";
import { offlineDb } from "@/services/offline-db";
import { identifyUser, track } from "@/services/telemetry";
import { scheduleOrderUpdateReminder } from "@/services/notifications";
import {
  accountService,
  initialAccount,
  persistence,
} from "@/services/shop.service";
import { addItem, restoreCart, setQuantity, totals } from "./cart";
import { mergeCustomerCart, restoreCustomerCart } from "./customer-cart";

import {
  initialCommerce,
  restoreCommerce,
  createLocalOrder,
  type Commerce,
  type Profile,
} from "./commerce";

function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Could not connect to the store. Please try again.";
}
function emptyCustomer(): Commerce {
  return {
    ...initialCommerce,
    profile: { name: "", phone: "", address: "", avatar: "" },
  };
}

const initialState: ShopState = {
  commerce: initialCommerce,
  cart: (backendConfig.live ? [] : choiceProducts)
    .filter((p) => p.stock > 0)
    .map((p) => ({ productId: p.id, quantity: 1, selected: false })),
  messagesRead: false,
  vouchersCollected: false,
  account: initialAccount,
  offerQuery: "",
  offerCategory: "Hot deals",
  homeFeed: "For You",
};
function useShopState() {
  const [state, setState] = useState(() => ({
    ...initialState,
    commerce: backendConfig.live ? emptyCustomer() : initialCommerce,
  }));
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [products, setProducts] = useState<Product[]>(
    backendConfig.live ? [] : localProducts,
  );
  const productById = useMemo(
    () =>
      Object.fromEntries(products.map((p) => [p.id, p])) as Record<
        string,
        Product
      >,
    [products],
  );
  const [session, setSession] = useState<Session | null>(null);
  const userId = session?.user.id || null;
  const activeUser = useRef<string | null>(null);
  const [sessionReady, setSessionReady] = useState(!backendConfig.live);
  const [customerReady, setCustomerReady] = useState(!backendConfig.live);
  const [catalogReady, setCatalogReady] = useState(!backendConfig.live);
  const [backendError, setBackendError] = useState(backendConfig.error);
  const [syncStatus, setSyncStatus] = useState("");
  const [retry, setRetry] = useState(0);
  const remoteQueue = useRef(Promise.resolve());
  const savedSnapshot = useRef("");
  const remoteEpoch = useRef(0);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const accept = (next: Session | null) => {
      if (!active) return;
      const id = next?.user.id || null;
      if (activeUser.current !== id) {
        const previous = activeUser.current;
        activeUser.current = id;
        remoteEpoch.current += 1;
        savedSnapshot.current = "";
        setCustomerReady(false);
        setSyncStatus("");
        setState((s) => ({
          ...s,
          commerce: emptyCustomer(),
          cart: previous ? [] : s.cart,
        }));
      }
      setSession(next);
      setSessionReady(true);
      identifyUser(
        next?.user.id || null,
        next?.user.email ?? next?.user.phone ?? null,
      );
    };
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => accept(next));
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setBackendError(error.message);
          setSessionReady(true);
        } else accept(data.session);
      })
      .catch((error) => {
        if (active) {
          setBackendError(errorMessage(error));
          setSessionReady(true);
        }
      });
    if (Platform.OS !== "web" && AppState.currentState === "active")
      client.auth.startAutoRefresh();
    const appState = AppState.addEventListener("change", (value) => {
      if (Platform.OS !== "web") {
        if (value === "active") client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      appState.remove();
      if (Platform.OS !== "web") client.auth.stopAutoRefresh();
    };
  }, []);

  const refreshCatalog = useCallback(async () => {
    if (!backendConfig.live) return;
    // Realtime/retry paths must bypass the query cache's staleness window.
    const catalog = await queryClient.fetchQuery({
      queryKey: CATALOG_QUERY_KEY,
      staleTime: 0,
      queryFn: async () => {
        const fresh = await loadCatalog();
        void offlineDb.saveCatalog("products", fresh);
        return fresh;
      },
    });
    setProducts(catalog);
    setCatalogReady(true);
    const map = Object.fromEntries(catalog.map((p) => [p.id, p]));
    setState((s) => ({ ...s, cart: restoreCart(s.cart, map) || [] }));
  }, []);
  // Follow catalog changes made by the admin dashboard from any device.
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client
      .channel("gulmeli-catalog")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void refreshCatalog().catch(() => undefined),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refreshCatalog]);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    // Offline-first: show the SQLite-cached catalog immediately, then refresh.
    void cachedCatalog().then((rows) => {
      if (active && rows?.length) setProducts(rows);
    });
    void fetchCatalogCached()
      .then((catalog) => {
        if (active) {
          setProducts(catalog);
          setCatalogReady(true);
        }
      })
      .catch((error) => {
        if (active) setBackendError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  useEffect(() => {
    if (!supabase || !sessionReady || !userId) return;
    let active = true;
    void loadCustomer(userId)
      .then(({ commerce, cart }) => {
        if (!active) return;
        savedSnapshot.current = JSON.stringify(
          customerSnapshot(commerce, cart),
        );
        setState((s) => ({
          ...s,
          commerce,
          cart: mergeCustomerCart(cart, s.cart),
        }));
        setCustomerReady(true);
      })
      .catch(async (error) => {
        if (!active) return;
        // Degrade to the last synced snapshot from SQLite.
        const cached = await offlineDb.get<{ commerce: unknown; cart: unknown }>(
          `customer:${userId}`,
        );
        if (cached?.commerce) {
          setState((s) => ({
            ...s,
            commerce: restoreCommerce(cached.commerce as Commerce),
            cart: restoreCustomerCart(cached.cart),
          }));
          setCustomerReady(true);
        }
        setBackendError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [userId, sessionReady, retry]);

  const queueCustomerSave = useCallback(
    (commerce: Commerce, owner: string, cart: CartItem[]) => {
      const epoch = remoteEpoch.current;
      const snapshot = JSON.stringify(customerSnapshot(commerce, cart));
      const task = remoteQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (activeUser.current !== owner || epoch !== remoteEpoch.current)
            return;
          await saveCustomer(owner, commerce, cart);
          void offlineDb.put(`customer:${owner}`, customerSnapshot(commerce, cart));
          if (activeUser.current === owner && epoch === remoteEpoch.current) {
            savedSnapshot.current = snapshot;
            setSyncStatus(
              JSON.stringify(
                customerSnapshot(
                  stateRef.current.commerce,
                  stateRef.current.cart,
                ),
              ) === snapshot
                ? "Account saved"
                : "Saving account...",
            );
          }
        });
      remoteQueue.current = task;
      return task;
    },
    [],
  );
  useEffect(() => {
    if (!backendConfig.live || !userId || !customerReady) return;
    if (
      JSON.stringify(customerSnapshot(state.commerce, state.cart)) ===
      savedSnapshot.current
    )
      return;
    setSyncStatus("Saving account...");
    const owner = userId;
    const timer = setTimeout(() => {
      void queueCustomerSave(state.commerce, owner, state.cart).catch(
        (error) => {
          if (activeUser.current === owner)
            setSyncStatus(`Account not saved: ${errorMessage(error)}`);
        },
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [state.commerce, state.cart, userId, customerReady, queueCustomerSave]);
  const retryBackend = async () => {
    setBackendError(backendConfig.error);
    if (userId && customerReady) {
      try {
        await queueCustomerSave(
          stateRef.current.commerce,
          userId,
          stateRef.current.cart,
        );
        await refreshCatalog();
      } catch (error) {
        setBackendError(errorMessage(error));
      }
    } else setRetry((value) => value + 1);
  };
  const signOut = async () => {
    if (userId && customerReady)
      await queueCustomerSave(
        stateRef.current.commerce,
        userId,
        stateRef.current.cart,
      );
    const { error } = await requireSupabase().auth.signOut({ scope: "local" });
    if (error) throw error;
  };
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    // Render the same empty frame in static HTML and the first client render.
    if (backendConfig.live) {
      void Promise.resolve().then(() => {
        if (active) setHydrated(true);
      });
      return () => {
        active = false;
      };
    }
    void persistence
      .load()
      .then((value) => {
        if (!active || !value || typeof value !== "object") return;
        const cart =
          "cart" in value ? restoreCart(value.cart, localProductById) : null;
        setState((s) => ({
          ...s,
          cart: cart ?? s.cart,
          commerce: restoreCommerce(
            "commerce" in value ? value.commerce : null,
          ),
          messagesRead: "messagesRead" in value && value.messagesRead === true,
          vouchersCollected:
            "vouchersCollected" in value && value.vouchersCollected === true,
        }));
      })
      .catch(() => {
        if (active)
          setStorageError("Saved shopping state could not be loaded.");
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || backendConfig.live) return;
    saveQueue.current = saveQueue.current
      .then(() => persistence.save(state))
      .catch(() =>
        setStorageError("Shopping state could not be saved on this device."),
      );
  }, [state, hydrated]);
  const add = useCallback(
    (product: Product) => {
      track("add_to_cart", { product_id: product.id, price: product.price });
      setState((s) => ({ ...s, cart: addItem(s.cart, product) }));
    },
    [],
  );
  const quantity = useCallback(
    (product: Product, count: number) =>
      setState((s) => ({ ...s, cart: setQuantity(s.cart, product, count) })),
    [],
  );
  const toggle = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        cart: s.cart.map((i) =>
          i.productId === id ? { ...i, selected: !i.selected } : i,
        ),
      })),
    [],
  );
  const select = useCallback(
    (ids: string[], selected: boolean) =>
      setState((s) => ({
        ...s,
        cart: s.cart.map((i) =>
          ids.includes(i.productId) ? { ...i, selected } : i,
        ),
      })),
    [],
  );
  const removeSelected = useCallback(
    () => setState((s) => ({ ...s, cart: s.cart.filter((i) => !i.selected) })),
    [],
  );
  const remove = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        cart: s.cart.filter((i) => i.productId !== id),
      })),
    [],
  );
  const collect = useCallback(
    () => setState((s) => ({ ...s, vouchersCollected: true })),
    [],
  );
  const markRead = useCallback(
    () => setState((s) => ({ ...s, messagesRead: true })),
    [],
  );
  const setFilter = useCallback(
    (key: "offerQuery" | "offerCategory" | "homeFeed", value: string) =>
      setState((s) => ({ ...s, [key]: value })),
    [],
  );
  const refreshAccount = useCallback(async () => {
    if (backendConfig.live) {
      await refreshCatalog();
      const owner = activeUser.current;
      if (owner) {
        const { commerce } = await loadCustomer(owner);
        if (activeUser.current === owner)
          setState((s) => ({
            ...s,
            commerce: { ...s.commerce, orders: commerce.orders },
          }));
      }
      return;
    }
    const account = await accountService.getAccount();
    setState((s) => ({
      ...s,
      account: { ...account, name: s.commerce.profile.name },
    }));
  }, [refreshCatalog]);
  const updateCommerce = useCallback(
    (update: (current: Commerce) => Commerce) => {
      if (backendConfig.live && activeUser.current && !customerReady) return;
      setState((s) => ({ ...s, commerce: update(s.commerce) }));
    },
    [customerReady],
  );
  const checkoutLock = useRef(false);
  const checkout = async (profile: Profile) => {
    if (checkoutLock.current)
      throw new Error("An order is already being submitted. Please wait.");
    const owner = activeUser.current;
    if (backendConfig.live && (!owner || !customerReady))
      throw new Error(
        "Sign in and wait for your account to load before checkout.",
      );
    if (backendConfig.live && !catalogReady)
      throw new Error("Wait for the catalog to load.");
    checkoutLock.current = true;
    try {
      const cart = stateRef.current.cart;
      const voucher = stateRef.current.commerce.voucher;
      const requestId =
        backendConfig.live && owner
          ? await checkoutRequest(owner, cart, voucher)
          : "";
      if (backendConfig.live && activeUser.current !== owner)
        throw new Error("Your account changed. Please sign in again.");
      const order = backendConfig.live
        ? await submitOrder(cart, profile, voucher, requestId)
        : createLocalOrder(
            cart,
            productById,
            profile,
            voucher,
            `Gulmeli Fancy Stores-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          );
      if (backendConfig.live && activeUser.current !== owner)
        throw new Error("Account changed. Sign in again to see your order.");
      setState((s) => ({
        ...s,
        cart: s.cart.filter(
          (i) =>
            !cart.some(
              (ordered) =>
                ordered.selected && ordered.productId === i.productId,
            ),
        ),
        commerce: {
          ...s.commerce,
          profile,
          orders: [
            order,
            ...s.commerce.orders.filter((o) => o.id !== order.id),
          ],
        },
      }));
      if (backendConfig.live && owner) {
        try {
          await completeCheckoutRequest(owner);
        } catch {
          setBackendError(
            "Order placed, but the checkout receipt could not be cleared on this device. Reload your orders before buying again.",
          );
        }
      }
      if (backendConfig.live)
        void refreshCatalog().catch((error) =>
          setBackendError(errorMessage(error)),
        );
      track("order_placed", {
        order_id: order.id,
        total: "total" in order ? Number(order.total) : undefined,
      });
      void scheduleOrderUpdateReminder(order.id);
      return order.id;
    } finally {
      checkoutLock.current = false;
    }
  };
  const cancelOrder = async (id: string) => {
    const owner = activeUser.current;
    if (backendConfig.live) {
      const order = await cancelRemoteOrder(id);
      if (activeUser.current !== owner) return;
      setState((s) => ({
        ...s,
        commerce: {
          ...s.commerce,
          orders: s.commerce.orders.map((o) => (o.id === id ? order : o)),
        },
      }));
      void refreshCatalog().catch((error) =>
        setBackendError(errorMessage(error)),
      );
    } else
      updateCommerce((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === id ? { ...o, status: "Cancelled" } : o,
        ),
      }));
  };
  const account = {
    ...state.account,
    name: state.commerce.profile.name,
    wishlistCount: state.commerce.wishlist.length,
    followedStores: state.commerce.following.length,
    voucherCount: 0,
    reviewCount: state.commerce.reviews.length,
  };
  return {
    state: { ...state, account },
    products,
    productById,
    live: backendConfig.live,
    session,
    sessionReady,
    customerReady,
    catalogReady,
    backendError,
    syncStatus,
    retryBackend,
    signOut,
    cancelOrder,
    updateCommerce,
    checkout,
    hydrated,
    storageError,
    add,
    quantity,
    toggle,
    select,
    remove,
    removeSelected,
    collect,
    markRead,
    setFilter,
    refreshAccount,
    ...useMemo(
      () => totals(state.cart, productById),
      [state.cart, productById],
    ),
  };
}
const ShopContext = createContext<ReturnType<typeof useShopState> | null>(null);
export function ShopProvider({ children }: PropsWithChildren) {
  const value = useShopState();
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}
export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("ShopProvider is missing");
  return value;
}

export function useCatalog() {
  const { products, productById, live } = useShop();
  return useMemo(
    () => ({
      products,
      productById,
      homeProducts: products.filter(
        (p) => p.group === "home" && (live || p.id.startsWith("home-")),
      ),
      offerProducts: products.filter((p) => p.group === "offer"),
      choiceProducts: products.filter(
        (p) => p.group === "choice" || p.group === "unavailable",
      ),
      recommendations: products.filter((p) => p.group === "recommendation"),
    }),
    [products, productById, live],
  );
}
