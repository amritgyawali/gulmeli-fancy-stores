// Shared contracts with the mobile app (same Supabase tables and JSON docs).
import type { ClothingDetails } from "@/shared/mobile/data/clothing";
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
  illustration?: string;
  description?: string;
  brand?: string;
  store?: string;
  stock: number;
  rating?: string;
  sold?: number;
  gems?: number;
  fastDelivery?: boolean;
  voucher?: boolean;
  badge?: string;
  variants?: { title?: string; size?: string; color?: string; stock?: number }[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  selected: boolean;
  /* The size and colour chosen on the product page, when it has them. */
  size?: string;
  color?: string;
}

export interface Profile {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}

export interface LocalOrder {
  id: string;
  createdAt: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  profile: Profile;
  status:
    | "Saved locally"
    | "Placed"
    | "Confirmed"
    | "Processing"
    | "Packed"
    | "Out_for_delivery"
    | "Returned"
    | "Refunded"
    | "Failed"
    | "Shipped"
    | "Delivered"
    | "Cancelled";
}

export interface Commerce {
  profile: Profile;
  wishlist: string[];
  following: string[];
  recent: string[];
  orders: LocalOrder[];
  reviews: { productId: string; rating: number; text: string }[];
  drafts: { id: string; text: string; createdAt: string }[];
  notifications: boolean;
  gems: number;
  lastCheckIn: string;
  voucher: string;
}

export interface ShopUi {
  vouchersCollected: boolean;
  messagesRead: boolean;
  offerQuery: string;
  offerCategory: string;
  homeFeed: string;
}
