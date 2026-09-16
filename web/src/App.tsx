import { HashRouter, Route, Routes } from "react-router-dom";
import { ShopProvider } from "@/store/ShopContext";
import { StoreLayout } from "@/components/StoreLayout";
import { StoreM3Layout } from "@/layouts/StoreM3Layout";
import { Home } from "@/pages/Home";
import { ProductPage } from "@/pages/ProductPage";
import CheckoutPage from "@/pages/CheckoutPage";
import HelpPage from "@/pages/HelpPage";
import SellPage from "@/pages/SellPage";
import { CartPage } from "@/pages/CartPage";
import { OffersPage } from "@/pages/OffersPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { AccountPage } from "@/pages/AccountPage";
import { AuthPage } from "@/pages/AuthPage";
import { SearchPage } from "@/pages/SearchPage";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminOverview } from "@/admin/AdminOverview";
import { AdminProducts } from "@/admin/AdminProducts";
import { AdminOrders } from "@/admin/AdminOrders";
import { AdminMedia } from "@/admin/AdminMedia";
import { AdminCustomers } from "@/admin/AdminCustomers";
import { AdminSettings } from "@/admin/AdminSettings";
import { AdminAnalytics } from "@/admin/AdminAnalytics";
import { AdminReports } from "@/admin/AdminReports";
import { AdminTrash } from "@/admin/AdminTrash";
import { ResourceList } from "@/admin/ResourceList";
import { OpsSection } from "@/admin/OpsLayout";
import { CommandCenter } from "@/admin/consoles/CommandCenter";
import { CatalogConsole } from "@/admin/consoles/CatalogConsole";
import { OrdersPipeline } from "@/admin/consoles/OrdersPipeline";
import { CampaignOrchestrator } from "@/admin/consoles/CampaignOrchestrator";
import { VoucherPoolConsole } from "@/admin/consoles/VoucherPoolConsole";
import { DexRoutingConsole } from "@/admin/consoles/DexRoutingConsole";
import { ThreePlConsole } from "@/admin/consoles/ThreePlConsole";
import { CommissionLedger } from "@/admin/consoles/CommissionLedger";
import { KycQueue } from "@/admin/consoles/KycQueue";
import { MallApprovals } from "@/admin/consoles/MallApprovals";
import { RiskSentinel } from "@/admin/consoles/RiskSentinel";

export default function App() {
  return (
    <ShopProvider>
      <HashRouter>
        <Routes>
          {/* Orange Daraz chrome (homepage_clone design) */}
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="search" element={<SearchPage />} />
          </Route>
          {/* Material-3 chrome (product/checkout/account/seller/help designs) */}
          <Route element={<StoreM3Layout />}>
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="sell" element={<SellPage />} />
          </Route>
          {/* Ops Central — the enterprise operations suite from the desktop
              designs; its own full-screen shell (AdminProvider inside). */}
          <Route path="admin/ops" element={<OpsSection><CommandCenter /></OpsSection>} />
          <Route path="admin/ops/catalog" element={<OpsSection><CatalogConsole /></OpsSection>} />
          <Route path="admin/ops/orders" element={<OpsSection><OrdersPipeline /></OpsSection>} />
          <Route path="admin/ops/campaigns" element={<OpsSection><CampaignOrchestrator /></OpsSection>} />
          <Route path="admin/ops/vouchers" element={<OpsSection><VoucherPoolConsole /></OpsSection>} />
          <Route path="admin/ops/logistics/dex" element={<OpsSection><DexRoutingConsole /></OpsSection>} />
          <Route path="admin/ops/logistics/3pl" element={<OpsSection><ThreePlConsole /></OpsSection>} />
          <Route path="admin/ops/finance/commissions" element={<OpsSection><CommissionLedger /></OpsSection>} />
          <Route path="admin/ops/sellers/kyc" element={<OpsSection><KycQueue /></OpsSection>} />
          <Route path="admin/ops/sellers/mall" element={<OpsSection><MallApprovals /></OpsSection>} />
          <Route path="admin/ops/risk" element={<OpsSection><RiskSentinel /></OpsSection>} />
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
      </HashRouter>
    </ShopProvider>
  );
}
