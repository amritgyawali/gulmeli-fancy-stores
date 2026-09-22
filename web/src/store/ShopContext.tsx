import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CartItem,
  Commerce,
  LocalOrder,
  Product,
  Profile,
  ShopUi,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  addItem,
  mergeCustomerCart,
  restoreCart,
  setQuantity,
  totals,
} from "@/lib/cart";
import {
  customerSnapshot,
  initialCommerce,
  profileError,
} from "@/lib/commerce";
import {
  cancelRemoteOrder,
  checkoutRequest,
  completeCheckoutRequest,
  loadCatalog,
  loadCustomer,
  saveCustomer,
  submitOrder,
} from "@/lib/shop-api";
import { errorMessage } from "@/lib/format";

const GUEST_KEY = "gulmeli:shop:web:v1";

const emptyCommerce = (): Commerce => ({
  ...initialCommerce,
  profile: { name: "", phone: "", address: "", avatar: "" },
});

interface ShopValue {
  products: Product[];
  productById: Record<string, Product>;
  catalogReady: boolean;
  homeProducts: Product[];
  offerProducts: Product[];
  choiceProducts: Product[];
  recommendations: Product[];
  cart: CartItem[];
  count: number;
  subtotal: number;
  cartCount: number;
  commerce: Commerce;
  session: Session | null;
  sessionReady: boolean;
  customerReady: boolean;
  backendError: string;
  syncStatus: string;
  ui: ShopUi;
  add: (p: Product) => void;
  setQty: (p: Product, q: number) => void;
  toggle: (id: string) => void;
  select: (ids: string[], selected: boolean) => void;
  removeSelected: () => void;
  removeItem: (id: string) => void;
  updateCommerce: (update: (current: Commerce) => Commerce) => void;
  collectVouchers: () => void;
  markMessagesRead: () => void;
  setFilter: (
    key: "offerQuery" | "offerCategory" | "homeFeed",
    value: string,
  ) => void;
  checkout: (profile: Profile, voucher?: string) => Promise<string>;
  cancelOrder: (id: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  retryBackend: () => void;
  signOut: () => Promise<void>;
}

const ShopContext = createContext<ShopValue | null>(null);

function loadGuestCart(catalog: Record<string, Product>): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) return restoreCart(JSON.parse(raw).cart, catalog) ?? [];
  } catch {
    /* start fresh */
  }
  return [];
}

/*
 * A guest's wishlist and browsing history, kept on this device. Without it a
 * visitor who saved five products lost all of them on reload, and the
 * "recently viewed" rail could never show anything to someone not signed in.
 * Once signed in, the account's own lists take over.
 */
const ids = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter((x): x is string => typeof x === "string"))].slice(0, 100)
    : [];

function loadGuestLists(): Pick<Commerce, "wishlist" | "recent"> {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "{}");
    return { wishlist: ids(raw.wishlist), recent: ids(raw.recent) };
  } catch {
    return { wishlist: [], recent: [] };
  }
}

export function ShopProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>([]);
  const productById = useMemo(
    () =>
      Object.fromEntries(products.map((p) => [p.id, p])) as Record<
        string,
        Product
      >,
    [products],
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [commerce, setCommerce] = useState<Commerce>(emptyCommerce);
  const [ui, setUi] = useState<ShopUi>({
    vouchersCollected: false,
    messagesRead: false,
    offerQuery: "",
    offerCategory: "Hot deals",
    homeFeed: "For You",
  });
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [customerReady, setCustomerReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [retry, setRetry] = useState(0);

  const userId = session?.user.id || null;
  const stateRef = useRef({ commerce, cart });
  stateRef.current = { commerce, cart };
  const remoteQueue = useRef(Promise.resolve());
  const savedSnapshot = useRef("");
  const remoteEpoch = useRef(0);
  const activeUser = useRef<string | null>(null);

  // Session
  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      const id = next?.user.id || null;
      if (activeUser.current !== id) {
        activeUser.current = id;
        remoteEpoch.current += 1;
        savedSnapshot.current = "";
        setCustomerReady(false);
        setSyncStatus("");
        setCommerce(id ? emptyCommerce() : emptyCommerce());
        setCart([]);
      }
      setSession(next);
      setSessionReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      activeUser.current = data.session?.user.id || null;
      setSession(data.session);
      setSessionReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Guest persistence
  const guestListsLoaded = useRef(false);
  useEffect(() => {
    if (userId || !sessionReady) {
      guestListsLoaded.current = false;
      return;
    }
    if (guestListsLoaded.current) return;
    guestListsLoaded.current = true;
    const saved = loadGuestLists();
    setCommerce((current) => ({
      ...current,
      wishlist: [...new Set([...current.wishlist, ...saved.wishlist])],
      recent: [...new Set([...current.recent, ...saved.recent])].slice(0, 30),
    }));
  }, [userId, sessionReady]);
  useEffect(() => {
    if (userId || !sessionReady || !catalogReady || !guestListsLoaded.current) return;
    try {
      localStorage.setItem(
        GUEST_KEY,
        JSON.stringify({
          version: 1,
          cart,
          wishlist: commerce.wishlist,
          recent: commerce.recent,
        }),
      );
    } catch {
      /* private mode */
    }
  }, [cart, commerce.wishlist, commerce.recent, userId, sessionReady, catalogReady]);
  useEffect(() => {
    if (userId || !catalogReady) return;
    setCart((current) =>
      current.length ? current : loadGuestCart(productById),
    );
  }, [userId, catalogReady, productById]);

  // Catalog + realtime
  const refreshCatalog = useCallback(async () => {
    const catalog = await loadCatalog();
    setProducts(catalog);
    setCatalogReady(true);
    const map = Object.fromEntries(catalog.map((p) => [p.id, p])) as Record<
      string,
      Product
    >;
    setCart((current) => restoreCart(current, map) || []);
  }, []);
  useEffect(() => {
    let active = true;
    void refreshCatalog().catch((error) => {
      if (active) setBackendError(errorMessage(error));
    });
    return () => {
      active = false;
    };
  }, [refreshCatalog, retry]);
  useEffect(() => {
    const reload = () => {
      void refreshCatalog().catch((error) =>
        setBackendError(errorMessage(error)),
      );
    };
    window.addEventListener("online", reload);
    window.addEventListener("focus", reload);
    const poll = setInterval(reload, 30000);
    const channel = supabase
      .channel("gulmeli-web-catalog")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void refreshCatalog().catch(() => undefined),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener("online", reload);
      window.removeEventListener("focus", reload);
      clearInterval(poll);
    };
  }, [refreshCatalog]);

  // Customer state + realtime orders
  useEffect(() => {
    if (!sessionReady || !userId) return;
    let active = true;
    void loadCustomer(userId)
      .then(({ commerce: loaded, cart: loadedCart }) => {
        if (!active) return;
        savedSnapshot.current = JSON.stringify(
          customerSnapshot(loaded, loadedCart),
        );
        setCommerce(loaded);
        setCart((current) => mergeCustomerCart(loadedCart, current));
        setCustomerReady(true);
      })
      .catch((error) => {
        if (active) setBackendError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [userId, sessionReady, retry]);
  useEffect(() => {
    if (!userId || !customerReady) return;
    let active = true,
      loading = false;
    const reload = () => {
      if (loading) return;
      loading = true;
      void loadCustomer(userId)
        .then((loaded) => {
          if (!active || activeUser.current !== userId) return;
          const current = stateRef.current;
          if (
            JSON.stringify(customerSnapshot(current.commerce, current.cart)) ===
            savedSnapshot.current
          ) {
            savedSnapshot.current = JSON.stringify(
              customerSnapshot(loaded.commerce, loaded.cart),
            );
            setCommerce(loaded.commerce);
            setCart(loaded.cart);
          } else
            setCommerce((current) => ({
              ...current,
              orders: loaded.commerce.orders,
            }));
        })
        .catch((error) => {
          if (active) setBackendError(errorMessage(error));
        })
        .finally(() => {
          loading = false;
        });
    };
    const channel = supabase
      .channel(`gulmeli-web-account-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        reload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_state",
          filter: `user_id=eq.${userId}`,
        },
        reload,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") reload();
      });
    const poll = setInterval(reload, 30000);
    window.addEventListener("focus", reload);
    window.addEventListener("online", reload);
    return () => {
      active = false;
      void supabase.removeChannel(channel);
      clearInterval(poll);
      window.removeEventListener("focus", reload);
      window.removeEventListener("online", reload);
    };
  }, [userId, customerReady]);

  // Debounced save queue for signed-in customers (mirrors the app).
  const queueCustomerSave = useCallback((owner: string) => {
    const epoch = remoteEpoch.current;
    const captured = stateRef.current;
    const snapshot = JSON.stringify(
      customerSnapshot(captured.commerce, captured.cart),
    );
    const task = remoteQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (activeUser.current !== owner || epoch !== remoteEpoch.current)
          return;
        await saveCustomer(owner, captured.commerce, captured.cart);
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
  }, []);
  useEffect(() => {
    if (!userId || !customerReady) return;
    if (
      JSON.stringify(customerSnapshot(commerce, cart)) === savedSnapshot.current
    )
      return;
    setSyncStatus("Saving account...");
    const timer = setTimeout(() => {
      void queueCustomerSave(userId).catch((error) => {
        if (activeUser.current === userId)
          setSyncStatus(`Account not saved: ${errorMessage(error)}`);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [commerce, cart, userId, customerReady, queueCustomerSave]);

  const updateCommerce = useCallback(
    (update: (current: Commerce) => Commerce) => {
      if (userId && !customerReady) return;
      setCommerce((current) => update(current));
    },
    [userId, customerReady],
  );

  const add = useCallback(
    (product: Product) => setCart((current) => addItem(current, product)),
    [],
  );
  const setQty = useCallback(
    (product: Product, count: number) =>
      setCart((current) => setQuantity(current, product, count)),
    [],
  );
  const toggle = useCallback(
    (id: string) =>
      setCart((current) =>
        current.map((i) =>
          i.productId === id ? { ...i, selected: !i.selected } : i,
        ),
      ),
    [],
  );
  const select = useCallback(
    (ids: string[], selected: boolean) =>
      setCart((current) =>
        current.map((i) =>
          ids.includes(i.productId) ? { ...i, selected } : i,
        ),
      ),
    [],
  );
  const removeSelected = useCallback(
    () => setCart((current) => current.filter((i) => !i.selected)),
    [],
  );
  const removeItem = useCallback(
    (id: string) => setCart((current) => current.filter((i) => i.productId !== id)),
    [],
  );
  const collectVouchers = useCallback(
    () => setUi((current) => ({ ...current, vouchersCollected: true })),
    [],
  );
  const markMessagesRead = useCallback(
    () => setUi((current) => ({ ...current, messagesRead: true })),
    [],
  );
  const setFilter = useCallback(
    (key: "offerQuery" | "offerCategory" | "homeFeed", value: string) =>
      setUi((current) => ({ ...current, [key]: value })),
    [],
  );

  const checkoutLock = useRef(false);
  const checkout = async (profile: Profile, voucherOverride?: string) => {
    const error = profileError(profile);
    if (error) throw new Error(error);
    if (checkoutLock.current)
      throw new Error("An order is already being submitted. Please wait.");
    const owner = activeUser.current;
    if (!owner) throw new Error("Sign in before placing an order.");
    if (!customerReady) throw new Error("Wait for your account to load.");
    if (!catalogReady) throw new Error("Wait for the catalog to load.");
    checkoutLock.current = true;
    try {
      const snapshot = stateRef.current;
      const voucher = voucherOverride ?? snapshot.commerce.voucher;
      const requestId = await checkoutRequest(owner, snapshot.cart, voucher);
      if (activeUser.current !== owner)
        throw new Error("Your account changed. Please sign in again.");
      const order = await submitOrder(
        snapshot.cart,
        profile,
        voucher,
        requestId,
      );
      if (activeUser.current !== owner)
        throw new Error("Account changed. Sign in again to see your order.");
      setCart((current) =>
        current.filter(
          (i) =>
            !snapshot.cart.some(
              (ordered) =>
                ordered.selected && ordered.productId === i.productId,
            ),
        ),
      );
      setCommerce((current) => ({
        ...current,
        profile,
        orders: [order, ...current.orders.filter((o) => o.id !== order.id)],
      }));
      try {
        completeCheckoutRequest(owner);
      } catch {
        setBackendError(
          "Order placed, but the checkout receipt could not be cleared. Reload your orders before buying again.",
        );
      }
      void refreshCatalog().catch((e) => setBackendError(errorMessage(e)));
      return order.id;
    } finally {
      checkoutLock.current = false;
    }
  };
  const cancelOrder = async (id: string) => {
    const owner = activeUser.current;
    const order = await cancelRemoteOrder(id);
    if (activeUser.current !== owner) return;
    setCommerce((current) => ({
      ...current,
      orders: current.orders.map((o) => (o.id === id ? order : o)),
    }));
    void refreshCatalog().catch((e) => setBackendError(errorMessage(e)));
  };
  const retryBackend = () => {
    setBackendError("");
    setRetry((value) => value + 1);
  };
  const signOut = async () => {
    if (userId && customerReady) await queueCustomerSave(userId);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  };

  const { count, subtotal, cartCount } = useMemo(
    () => totals(cart, productById),
    [cart, productById],
  );

  const catalog = useMemo(
    () => ({
      homeProducts: products.filter((p) => p.group === "home"),
      offerProducts: products.filter((p) => p.group === "offer"),
      choiceProducts: products.filter(
        (p) => p.group === "choice" || p.group === "unavailable",
      ),
      recommendations: products.filter((p) => p.group === "recommendation"),
    }),
    [products],
  );

  const value: ShopValue = {
    products,
    productById,
    catalogReady,
    ...catalog,
    cart,
    count,
    subtotal,
    cartCount,
    commerce,
    session,
    sessionReady,
    customerReady,
    backendError,
    syncStatus,
    ui,
    add,
    setQty,
    toggle,
    select,
    removeSelected,
    removeItem,
    updateCommerce,
    collectVouchers,
    markMessagesRead,
    setFilter,
    checkout,
    cancelOrder,
    refreshCatalog,
    retryBackend,
    signOut,
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error("ShopProvider is missing");
  return value;
}
