// Shared contracts with the mobile app (same Supabase tables and JSON docs).
export type ProductGroup =
  "home" | "offer" | "recommendation" | "choice" | "unavailable";

export interface Product {
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
}

export interface CartItem {
  productId: string;
  quantity: number;
  selected: boolean;
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
  items: { productId: string; name: string; quantity: number; price: number }[];
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
