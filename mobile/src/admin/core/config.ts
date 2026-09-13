/**
 * The storefront configuration document.
 *
 * This is the contract between the admin dashboard and the customer app: the
 * app reads colours, logos, menus, wording, payment and shipping behaviour and
 * feature switches from here, so changing any of them is an admin edit rather
 * than a code change and a redeploy.
 *
 * `defaultConfig` exists only as the fallback for a store that has never been
 * configured (and so that the app still renders offline). Everything in it is
 * editable from Appearance, Content, Settings and the Homepage Builder.
 */

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: number;
  cardRadius: number;
  inputRadius: number;
  borderWidth: number;
  spacing: number;
  fontFamily: string;
  baseFontSize: number;
  headingScale: number;
  headingWeight: "600" | "700" | "800";
  shadowLevel: 0 | 1 | 2 | 3;
  colorScheme: "light" | "dark" | "system";
  /** Extra CSS applied to the web build only. */
  customCss: string;
}

export interface DarkThemeConfig {
  enabled: boolean;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
}

export interface BrandingConfig {
  companyName: string;
  legalName: string;
  tagline: string;
  logo: string;
  logoDark: string;
  logoLight: string;
  mobileLogo: string;
  favicon: string;
  appIcon: string;
  splashLogo: string;
  emailLogo: string;
  invoiceLogo: string;
  footerLogo: string;
  socialShareImage: string;
}

export interface ContactConfig {
  phone: string;
  supportPhone: string;
  email: string;
  supportEmail: string;
  address: string;
  mapsUrl: string;
  businessHours: string;
  panVat: string;
  registrationNumber: string;
}

export interface SocialConfig {
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  x: string;
  pinterest: string;
  whatsapp: string;
  /** Which of the links above are shown; a link with no URL is hidden anyway. */
  enabled: string[];
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  link: string;
  backgroundColor: string;
  textColor: string;
  scrolling: boolean;
  startsAt: string;
  endsAt: string;
}

export interface HeaderConfig {
  showLogo: boolean;
  showSearch: boolean;
  showCart: boolean;
  showWishlist: boolean;
  showProfile: boolean;
  showContactNumber: boolean;
  showSocialIcons: boolean;
  sticky: boolean;
  backgroundColor: string;
  textColor: string;
  searchPlaceholder: string;
}

export interface FooterConfig {
  enabled: boolean;
  aboutText: string;
  showQuickLinks: boolean;
  showPolicies: boolean;
  showSocial: boolean;
  showNewsletter: boolean;
  showPaymentIcons: boolean;
  showAppLinks: boolean;
  newsletterHeading: string;
  copyright: string;
  backgroundColor: string;
  textColor: string;
}

export interface FeatureFlags {
  wishlist: boolean;
  reviews: boolean;
  questions: boolean;
  cashOnDelivery: boolean;
  coupons: boolean;
  loyalty: boolean;
  giftCards: boolean;
  chat: boolean;
  blog: boolean;
  flashSales: boolean;
  guestCheckout: boolean;
  productComparison: boolean;
  recentlyViewed: boolean;
  recommendations: boolean;
  backInStockAlerts: boolean;
  priceDropAlerts: boolean;
  preorders: boolean;
  storePickup: boolean;
  referrals: boolean;
  newsletterPopup: boolean;
}

export interface CheckoutConfig {
  guestCheckout: boolean;
  loginRequired: boolean;
  requiredFields: string[];
  optionalFields: string[];
  deliveryNotes: boolean;
  minimumOrder: number;
  maximumOrder: number;
  codLimit: number;
  termsAgreement: boolean;
  termsText: string;
  showUpsells: boolean;
  freeShippingThreshold: number;
  defaultShippingFee: number;
}

export interface SeoConfig {
  siteTitle: string;
  titleTemplate: string;
  metaDescription: string;
  keywords: string[];
  robots: string;
  sitemapEnabled: boolean;
  openGraphImage: string;
  twitterHandle: string;
  productSchema: boolean;
  organizationSchema: boolean;
  breadcrumbSchema: boolean;
  faqSchema: boolean;
  googleVerification: string;
  bingVerification: string;
}

export interface LocalisationConfig {
  defaultLanguage: string;
  languages: { code: string; label: string; enabled: boolean }[];
  defaultCurrency: string;
  currencySymbol: string;
  currencyPosition: "before" | "after";
  timezone: string;
  dateFormat: string;
  numberFormat: string;
}

export interface AppConfig {
  appName: string;
  packageName: string;
  minimumVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateMessage: string;
  playStoreUrl: string;
  appStoreUrl: string;
  deepLinkScheme: string;
  shareMessage: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEta: string;
}

export interface WebsiteConfig {
  domain: string;
  siteName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowAdminsDuringMaintenance: boolean;
}

export interface LiveChatConfig {
  enabled: boolean;
  provider: "none" | "widget" | "whatsapp" | "messenger" | "chatbot";
  whatsappNumber: string;
  messengerUrl: string;
  supportHours: string;
  offlineMessage: string;
  greeting: string;
}

export interface InvoiceConfig {
  numberFormat: string;
  nextNumber: number;
  showLogo: boolean;
  companyName: string;
  panVat: string;
  address: string;
  phone: string;
  footer: string;
  terms: string;
  accentColor: string;
  autoGenerate: boolean;
}

export interface SecurityConfig {
  twoFactorRequired: boolean;
  passwordMinLength: number;
  passwordRequiresNumber: boolean;
  passwordRequiresSymbol: boolean;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  sessionHours: number;
  adminLoginAlerts: boolean;
  captchaOnAuth: boolean;
  rateLimitPerMinute: number;
  trashRetentionDays: number;
}

export interface AuthConfig {
  emailPassword: boolean;
  phoneOtp: boolean;
  emailOtp: boolean;
  googleLogin: boolean;
  appleLogin: boolean;
  facebookLogin: boolean;
  googleClientId: string;
  appleServiceId: string;
  facebookAppId: string;
}

export interface PersonalisationConfig {
  recommendedProducts: boolean;
  recentlyViewedCount: number;
  relatedProducts: boolean;
  personalisedHomepage: boolean;
  locationSuggestions: boolean;
  purchaseHistorySuggestions: boolean;
  comparisonEnabled: boolean;
  comparisonMaxProducts: number;
  comparisonAttributes: string[];
}

export interface CatalogDisplayConfig {
  productsPerPage: number;
  defaultSort: string;
  gridColumnsMobile: number;
  gridColumnsDesktop: number;
  showStockCount: boolean;
  lowStockBadgeAt: number;
  showRatings: boolean;
  showSoldCount: boolean;
  filters: {
    key: string;
    label: string;
    enabled: boolean;
    sortOrder: number;
  }[];
}

/** Every user-facing string the owner may want to reword without a release. */
export interface TextConfig {
  addToCart: string;
  buyNow: string;
  checkout: string;
  outOfStock: string;
  lowStock: string;
  login: string;
  signup: string;
  logout: string;
  search: string;
  homeHeading: string;
  homeSubheading: string;
  offersHeading: string;
  promoMessage: string;
  freeShippingMessage: string;
  emptyCart: string;
  emptyWishlist: string;
  emptyOrders: string;
  emptySearch: string;
  genericError: string;
  networkError: string;
  orderPlaced: string;
  thankYou: string;
}

export interface StorefrontConfig {
  version: number;
  theme: ThemeConfig;
  darkTheme: DarkThemeConfig;
  branding: BrandingConfig;
  contact: ContactConfig;
  social: SocialConfig;
  announcement: AnnouncementConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  features: FeatureFlags;
  checkout: CheckoutConfig;
  seo: SeoConfig;
  localisation: LocalisationConfig;
  app: AppConfig;
  website: WebsiteConfig;
  liveChat: LiveChatConfig;
  invoice: InvoiceConfig;
  security: SecurityConfig;
  auth: AuthConfig;
  personalisation: PersonalisationConfig;
  catalog: CatalogDisplayConfig;
  text: TextConfig;
}

/**
 * Seed values. The colours come from the store's existing Stitch designs so a
 * fresh install looks like the current app until the owner changes it.
 */
export const defaultConfig: StorefrontConfig = {
  version: 1,
  theme: {
    primaryColor: "#f85606",
    secondaryColor: "#ff4600",
    accentColor: "#ffba00",
    backgroundColor: "#f4f4f4",
    surfaceColor: "#ffffff",
    textColor: "#212121",
    mutedTextColor: "#757575",
    borderColor: "#eaeaea",
    successColor: "#16a34a",
    warningColor: "#d97706",
    dangerColor: "#dc2626",
    buttonColor: "#f85606",
    buttonTextColor: "#ffffff",
    buttonRadius: 6,
    cardRadius: 12,
    inputRadius: 8,
    borderWidth: 1,
    spacing: 12,
    fontFamily: "system",
    baseFontSize: 12,
    headingScale: 1.25,
    headingWeight: "700",
    shadowLevel: 1,
    colorScheme: "light",
    customCss: "",
  },
  darkTheme: {
    enabled: false,
    backgroundColor: "#111113",
    surfaceColor: "#1c1c1f",
    textColor: "#f5f5f7",
    mutedTextColor: "#a1a1aa",
    borderColor: "#2a2a2e",
  },
  branding: {
    companyName: "Gulmeli Fancy Stores",
    legalName: "Gulmeli Fancy Stores Pvt. Ltd.",
    tagline: "Everyday fancy goods, delivered.",
    logo: "",
    logoDark: "",
    logoLight: "",
    mobileLogo: "",
    favicon: "",
    appIcon: "",
    splashLogo: "",
    emailLogo: "",
    invoiceLogo: "",
    footerLogo: "",
    socialShareImage: "",
  },
  contact: {
    phone: "",
    supportPhone: "",
    email: "",
    supportEmail: "",
    address: "",
    mapsUrl: "",
    businessHours: "Sunday to Friday, 10:00 - 19:00",
    panVat: "",
    registrationNumber: "",
  },
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    x: "",
    pinterest: "",
    whatsapp: "",
    enabled: ["facebook", "instagram", "tiktok", "youtube"],
  },
  announcement: {
    enabled: false,
    text: "",
    link: "",
    backgroundColor: "#f85606",
    textColor: "#ffffff",
    scrolling: false,
    startsAt: "",
    endsAt: "",
  },
  header: {
    showLogo: true,
    showSearch: true,
    showCart: true,
    showWishlist: true,
    showProfile: true,
    showContactNumber: false,
    showSocialIcons: false,
    sticky: true,
    backgroundColor: "#f85606",
    textColor: "#ffffff",
    searchPlaceholder: "Search for products",
  },
  footer: {
    enabled: true,
    aboutText: "",
    showQuickLinks: true,
    showPolicies: true,
    showSocial: true,
    showNewsletter: true,
    showPaymentIcons: true,
    showAppLinks: true,
    newsletterHeading: "Get offers first",
    copyright: "",
    backgroundColor: "#212121",
    textColor: "#f4f4f4",
  },
  features: {
    wishlist: true,
    reviews: true,
    questions: true,
    cashOnDelivery: true,
    coupons: true,
    loyalty: true,
    giftCards: false,
    chat: true,
    blog: false,
    flashSales: true,
    guestCheckout: false,
    productComparison: false,
    recentlyViewed: true,
    recommendations: true,
    backInStockAlerts: true,
    priceDropAlerts: false,
    preorders: false,
    storePickup: false,
    referrals: true,
    newsletterPopup: false,
  },
  checkout: {
    guestCheckout: false,
    loginRequired: true,
    requiredFields: ["name", "phone", "address"],
    optionalFields: ["email", "landmark"],
    deliveryNotes: true,
    minimumOrder: 0,
    maximumOrder: 0,
    codLimit: 0,
    termsAgreement: false,
    termsText: "",
    showUpsells: true,
    freeShippingThreshold: 0,
    defaultShippingFee: 0,
  },
  seo: {
    siteTitle: "Gulmeli Fancy Stores",
    titleTemplate: "{page} | {site}",
    metaDescription: "",
    keywords: [],
    robots: "index, follow",
    sitemapEnabled: true,
    openGraphImage: "",
    twitterHandle: "",
    productSchema: true,
    organizationSchema: true,
    breadcrumbSchema: true,
    faqSchema: true,
    googleVerification: "",
    bingVerification: "",
  },
  localisation: {
    defaultLanguage: "en",
    languages: [
      { code: "en", label: "English", enabled: true },
      { code: "ne", label: "नेपाली", enabled: false },
    ],
    defaultCurrency: "NPR",
    currencySymbol: "Rs.",
    currencyPosition: "before",
    timezone: "Asia/Kathmandu",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "1,234.56",
  },
  app: {
    appName: "Gulmeli Fancy Stores",
    packageName: "com.gulmeli.fancystore",
    minimumVersion: "1.0.0",
    currentVersion: "1.0.0",
    forceUpdate: false,
    updateMessage: "A newer version of the app is available.",
    playStoreUrl: "",
    appStoreUrl: "",
    deepLinkScheme: "gulmeli",
    shareMessage: "Shop with Gulmeli Fancy Stores",
    maintenanceMode: false,
    maintenanceMessage: "We are updating the app. Please check back shortly.",
    maintenanceEta: "",
  },
  website: {
    domain: "",
    siteName: "Gulmeli Fancy Stores",
    maintenanceMode: false,
    maintenanceMessage:
      "We are updating the website. Please check back shortly.",
    allowAdminsDuringMaintenance: true,
  },
  liveChat: {
    enabled: false,
    provider: "none",
    whatsappNumber: "",
    messengerUrl: "",
    supportHours: "Sunday to Friday, 10:00 - 19:00",
    offlineMessage:
      "We are offline right now. Leave a message and we will reply.",
    greeting: "How can we help?",
  },
  invoice: {
    numberFormat: "INV-{year}-{number}",
    nextNumber: 1,
    showLogo: true,
    companyName: "Gulmeli Fancy Stores",
    panVat: "",
    address: "",
    phone: "",
    footer: "Thank you for shopping with us.",
    terms: "",
    accentColor: "#f85606",
    autoGenerate: true,
  },
  security: {
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordRequiresNumber: true,
    passwordRequiresSymbol: false,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    sessionHours: 24,
    adminLoginAlerts: true,
    captchaOnAuth: false,
    rateLimitPerMinute: 60,
    trashRetentionDays: 30,
  },
  auth: {
    emailPassword: true,
    phoneOtp: false,
    emailOtp: false,
    googleLogin: false,
    appleLogin: false,
    facebookLogin: false,
    googleClientId: "",
    appleServiceId: "",
    facebookAppId: "",
  },
  personalisation: {
    recommendedProducts: true,
    recentlyViewedCount: 10,
    relatedProducts: true,
    personalisedHomepage: false,
    locationSuggestions: false,
    purchaseHistorySuggestions: true,
    comparisonEnabled: false,
    comparisonMaxProducts: 4,
    comparisonAttributes: ["price", "rating", "brand", "stock"],
  },
  catalog: {
    productsPerPage: 20,
    defaultSort: "relevance",
    gridColumnsMobile: 2,
    gridColumnsDesktop: 4,
    showStockCount: true,
    lowStockBadgeAt: 5,
    showRatings: true,
    showSoldCount: true,
    filters: [
      { key: "price", label: "Price", enabled: true, sortOrder: 0 },
      { key: "brand", label: "Brand", enabled: true, sortOrder: 1 },
      { key: "category", label: "Category", enabled: true, sortOrder: 2 },
      { key: "size", label: "Size", enabled: false, sortOrder: 3 },
      { key: "color", label: "Colour", enabled: false, sortOrder: 4 },
      { key: "rating", label: "Rating", enabled: true, sortOrder: 5 },
      {
        key: "availability",
        label: "Availability",
        enabled: true,
        sortOrder: 6,
      },
    ],
  },
  text: {
    addToCart: "Add to Cart",
    buyNow: "Buy Now",
    checkout: "Checkout",
    outOfStock: "Out of Stock",
    lowStock: "Only a few left",
    login: "Login",
    signup: "Sign up",
    logout: "Log out",
    search: "Search",
    homeHeading: "Shop with Gulmeli Fancy Stores",
    homeSubheading: "",
    offersHeading: "Buy more, save more",
    promoMessage: "",
    freeShippingMessage: "",
    emptyCart: "Your cart is empty.",
    emptyWishlist: "Your wishlist is empty.",
    emptyOrders: "You have not placed an order yet.",
    emptySearch: "No products matched that search.",
    genericError: "Something went wrong. Please try again.",
    networkError: "Could not connect to the store. Please try again.",
    orderPlaced: "Your order has been placed.",
    thankYou: "Thank you for shopping with us.",
  },
};

type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Merges a stored document over the defaults, key by key. A stored value is
 * only accepted when it has the same shape as the default, so an old or partly
 * written document can never break the storefront.
 */
export function mergeConfig<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return base;
  const result: Plain = { ...base };
  for (const [key, defaultValue] of Object.entries(base)) {
    if (!(key in override)) continue;
    const value = override[key];
    if (isPlainObject(defaultValue)) {
      result[key] = mergeConfig(defaultValue, value);
    } else if (Array.isArray(defaultValue)) {
      if (Array.isArray(value)) result[key] = value;
    } else if (typeof value === typeof defaultValue && value !== null) {
      result[key] = value;
    }
  }
  return result as T;
}

/** Reads any persisted document into a complete, valid configuration. */
export function restoreConfig(value: unknown): StorefrontConfig {
  return mergeConfig(defaultConfig, value);
}

/** Returns the value at a dotted path, such as `theme.primaryColor`. */
export function configValue(config: StorefrontConfig, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) => (isPlainObject(value) ? value[key] : undefined),
      config as unknown,
    );
}

/** Immutably sets the value at a dotted path. */
export function setConfigValue(
  config: StorefrontConfig,
  path: string,
  value: unknown,
): StorefrontConfig {
  const keys = path.split(".");
  const clone = JSON.parse(JSON.stringify(config)) as Plain;
  let cursor: Plain = clone;
  for (const key of keys.slice(0, -1)) {
    const next = cursor[key];
    if (!isPlainObject(next)) return config;
    cursor = next;
  }
  const last = keys[keys.length - 1];
  if (last === undefined) return config;
  cursor[last] = value;
  return clone as unknown as StorefrontConfig;
}

/** Dotted paths whose values differ between two documents. */
export function configDiff(
  before: StorefrontConfig,
  after: StorefrontConfig,
): string[] {
  const paths: string[] = [];
  const walk = (left: unknown, right: unknown, prefix: string) => {
    if (isPlainObject(left) && isPlainObject(right)) {
      for (const key of new Set([
        ...Object.keys(left),
        ...Object.keys(right),
      ])) {
        walk(left[key], right[key], prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    if (JSON.stringify(left) !== JSON.stringify(right)) paths.push(prefix);
  };
  walk(before, after, "");
  return paths.filter((path) => path && path !== "version");
}
