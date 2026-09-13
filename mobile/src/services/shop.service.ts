import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AccountSnapshot, ShopState } from "@/types/shop";

// Replace this adapter when API contracts are available. No speculative production endpoints.
export interface AccountService {
  getAccount(): Promise<AccountSnapshot>;
}
export const initialAccount: AccountSnapshot = {
  name: "Arjun Gyawali",
  wishlistCount: 10,
  followedStores: 3,
  voucherCount: 1,
  reviewCount: 1,
};
export const accountService: AccountService = {
  async getAccount() {
    // Local adapter latency makes the supplied loading state exercisable without claiming a server update.
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    return { ...initialAccount };
  },
};
const key = "gulmeli:shop:v1";
export const persistence = {
  async load(): Promise<unknown> {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  },
  async save(state: ShopState) {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        commerce: state.commerce,
        cart: state.cart,
        vouchersCollected: state.vouchersCollected,
        messagesRead: state.messagesRead,
      }),
    );
  },
};
