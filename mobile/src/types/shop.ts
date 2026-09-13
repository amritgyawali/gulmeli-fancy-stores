import type { Commerce } from "../store/commerce";
export type ProductGroup =
  "home" | "offer" | "recommendation" | "choice" | "unavailable";
export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  group: ProductGroup;
  category: string;
  imageKey?: string;
  imageUrl?: string;
  illustration?: string;
  brand?: string;
  store?: string;
  stock: number;
  rating?: string;
  sold?: number;
  gems?: number;
  fastDelivery?: boolean;
  voucher?: boolean;
  badge?: string;
}
export interface CartItem {
  productId: string;
  quantity: number;
  selected: boolean;
}
export interface AccountSnapshot {
  name: string;
  wishlistCount: number;
  followedStores: number;
  voucherCount: number;
  reviewCount: number;
}
export interface ShopState {
  commerce: Commerce;
  cart: CartItem[];
  vouchersCollected: boolean;
  messagesRead: boolean;
  account: AccountSnapshot;
  offerQuery: string;
  offerCategory: string;
  homeFeed: string;
}
