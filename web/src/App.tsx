import { Suspense, lazy } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { ShopProvider } from "@/store/ShopContext";
import { StoreLayout } from "@/components/StoreLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Home } from "@/pages/Home";
import { SearchPage } from "@/pages/SearchPage";
import { ProductPage } from "@/pages/ProductPage";
import { CartPage } from "@/pages/CartPage";
import { NotFound } from "@/pages/NotFound";

/*
 * Routing.
 *
 * Two changes here.
 *
 * 1. One storefront shell. The storefront used to be split across two
 *    layouts — an orange "homepage" chrome for /, /cart and /offers, and a
 *    separate Material-3 chrome for /product, /checkout, /account and /help.
 *    Opening a product from the home grid swapped the header, the search
 *    field, the type scale and the footer, which read as two different sites.
 *
 * 2. The admin console and the eleven operations consoles are lazily loaded.
 *    They were in the same bundle as the storefront, so every customer
 *    downloaded the KYC queue, the commission ledger and the courier routing
 *    matrix before they could see a product. Customers now load the shop, and
 *    staff load the consoles when they open one.
 */

/* Storefront: secondary routes, split from the initial payload. */
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OffersPage = lazy(() =>
  import("@/pages/OffersPage").then((m) => ({ default: m.OffersPage })),
);
const MessagesPage = lazy(() =>
  import("@/pages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
);
const AccountPage = lazy(() =>
  import("@/pages/AccountPage").then((m) => ({ default: m.AccountPage })),
);
const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const SellPage = lazy(() => import("@/pages/SellPage"));

/* Staff surfaces. */
const AdminLayout = lazy(() =>
  import("@/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminOverview = lazy(() =>
  import("@/admin/AdminOverview").then((m) => ({ default: m.AdminOverview })),
);
const AdminProducts = lazy(() =>
  import("@/admin/AdminProducts").then((m) => ({ default: m.AdminProducts })),
);
const AdminOrders = lazy(() =>
  import("@/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })),
);
const AdminMedia = lazy(() =>
  import("@/admin/AdminMedia").then((m) => ({ default: m.AdminMedia })),
);
const AdminCustomers = lazy(() =>
  import("@/admin/AdminCustomers").then((m) => ({ default: m.AdminCustomers })),
);
const AdminSettings = lazy(() =>
  import("@/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })),
);
const AdminAnalytics = lazy(() =>
  import("@/admin/AdminAnalytics").then((m) => ({ default: m.AdminAnalytics })),
);
const AdminReports = lazy(() =>
  import("@/admin/AdminReports").then((m) => ({ default: m.AdminReports })),
);
const AdminTrash = lazy(() =>
  import("@/admin/AdminTrash").then((m) => ({ default: m.AdminTrash })),
);
const ResourceList = lazy(() =>
  import("@/admin/ResourceList").then((m) => ({ default: m.ResourceList })),
);
const OpsSection = lazy(() =>
  import("@/admin/OpsLayout").then((m) => ({ default: m.OpsSection })),
);
const CommandCenter = lazy(() =>
  import("@/admin/consoles/CommandCenter").then((m) => ({ default: m.CommandCenter })),
);
const CatalogConsole = lazy(() =>
  import("@/admin/consoles/CatalogConsole").then((m) => ({ default: m.CatalogConsole })),
);
const OrdersPipeline = lazy(() =>
  import("@/admin/consoles/OrdersPipeline").then((m) => ({ default: m.OrdersPipeline })),
);
const CampaignOrchestrator = lazy(() =>
  import("@/admin/consoles/CampaignOrchestrator").then((m) => ({
    default: m.CampaignOrchestrator,
  })),
);
const VoucherPoolConsole = lazy(() =>
  import("@/admin/consoles/VoucherPoolConsole").then((m) => ({
    default: m.VoucherPoolConsole,
  })),
);
const DexRoutingConsole = lazy(() =>
  import("@/admin/consoles/DexRoutingConsole").then((m) => ({
    default: m.DexRoutingConsole,
  })),
);
const ThreePlConsole = lazy(() =>
  import("@/admin/consoles/ThreePlConsole").then((m) => ({ default: m.ThreePlConsole })),
);
const CommissionLedger = lazy(() =>
  import("@/admin/consoles/CommissionLedger").then((m) => ({
    default: m.CommissionLedger,
  })),
);
const KycQueue = lazy(() =>
  import("@/admin/consoles/KycQueue").then((m) => ({ default: m.KycQueue })),
);
const MallApprovals = lazy(() =>
  import("@/admin/consoles/MallApprovals").then((m) => ({ default: m.MallApprovals })),
);
const RiskSentinel = lazy(() =>
  import("@/admin/consoles/RiskSentinel").then((m) => ({ default: m.RiskSentinel })),
);

/* Shown only while a split chunk is in flight. Deliberately quiet: a spinner
   that appears for 80ms reads as a flicker, so this is a neutral hold. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="sr-only">Loading</span>
    </div>
  );
}

const ops = (node: React.ReactNode) => <OpsSection>{node}</OpsSection>;

export default function App() {
  return (
    <ShopProvider>
      <HashRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<StoreLayout />}>
              <Route index element={<Home />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="product/:id" element={<ProductPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="offers" element={<OffersPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="auth" element={<AuthPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="sell" element={<SellPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Operations suite — its own full-screen shell. */}
            <Route path="admin/ops" element={ops(<CommandCenter />)} />
            <Route path="admin/ops/catalog" element={ops(<CatalogConsole />)} />
            <Route path="admin/ops/orders" element={ops(<OrdersPipeline />)} />
            <Route path="admin/ops/campaigns" element={ops(<CampaignOrchestrator />)} />
            <Route path="admin/ops/vouchers" element={ops(<VoucherPoolConsole />)} />
            <Route path="admin/ops/logistics/dex" element={ops(<DexRoutingConsole />)} />
            <Route path="admin/ops/logistics/3pl" element={ops(<ThreePlConsole />)} />
            <Route path="admin/ops/finance/commissions" element={ops(<CommissionLedger />)} />
            <Route path="admin/ops/sellers/kyc" element={ops(<KycQueue />)} />
            <Route path="admin/ops/sellers/mall" element={ops(<MallApprovals />)} />
            <Route path="admin/ops/risk" element={ops(<RiskSentinel />)} />

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="trash" element={<AdminTrash />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="r/:collection" element={<ResourceList />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ShopProvider>
  );
}
