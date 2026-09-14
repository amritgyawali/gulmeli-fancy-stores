import { HashRouter, Route, Routes } from "react-router-dom";
import { ShopProvider } from "@/store/ShopContext";
import { StoreLayout } from "@/components/StoreLayout";
import { Home } from "@/pages/Home";
import { ProductPage } from "@/pages/ProductPage";
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

export default function App() {
  return (
    <ShopProvider>
      <HashRouter>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="product/:id" element={<ProductPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="offers" element={<OffersPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="search" element={<SearchPage />} />
          </Route>
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
