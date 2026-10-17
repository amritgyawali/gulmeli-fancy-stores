import type { Commerce } from "../store/commerce";
import type { ClothingDetails } from "../data/clothing";
export type ProductGroup =
  "home" | "offer" | "recommendation" | "choice" | "unavailable";
export interface Product extends ClothingDetails {
  createdAt?: string;
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  group: ProductGroup;
  category: string;
  imageKey?: string;
  imageUrl?: string;
  images?: string[];
  imageIllustrative?: boolean;
  description?: string;
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
  /* Dashboard-defined variants (size/colour/stock), when the store adds them. */
  variants?: { title?: string; size?: string; color?: string; stock?: number }[];
}
export interface CartItem {
  productId: string;
  quantity: number;
  selected: boolean;
  /* The size and colour chosen on the product page, when the product has them. */
  size?: string;
  color?: string;
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
