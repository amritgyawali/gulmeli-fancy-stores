import { f, options, type FieldDef } from "./fields.ts";

/**
 * Declarative description of the configuration document, so the Appearance and
 * Settings screens render themselves from the same source of truth the
 * storefront reads. Each field name is a dotted path into `StorefrontConfig`.
 */
export interface ConfigGroup {
  key: string;
  label: string;
  icon: string;
  description?: string;
  module: string;
  fields: FieldDef[];
}

const themeGroup: ConfigGroup = {
  key: "theme",
  label: "Colours & typography",
  icon: "palette",
  module: "appearance",
  description: "Applies to the app and the website. Preview before publishing.",
  fields: [
    f.color("theme.primaryColor", "Primary colour", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.secondaryColor", "Secondary colour", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.accentColor", "Accent colour", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.backgroundColor", "Page background", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.surfaceColor", "Card background", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.textColor", "Text", { section: "Colours", width: "third" }),
    f.color("theme.mutedTextColor", "Muted text", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.borderColor", "Borders", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.successColor", "Success", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.warningColor", "Warning", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.dangerColor", "Danger", {
      section: "Colours",
      width: "third",
    }),
    f.color("theme.buttonColor", "Button background", {
      section: "Buttons",
      width: "third",
    }),
    f.color("theme.buttonTextColor", "Button text", {
      section: "Buttons",
      width: "third",
    }),
    f.number("theme.buttonRadius", "Button radius", {
      section: "Buttons",
      width: "third",
      min: 0,
      max: 40,
    }),
    f.number("theme.cardRadius", "Card radius", {
      section: "Shape",
      width: "third",
      min: 0,
      max: 40,
    }),
    f.number("theme.inputRadius", "Input radius", {
      section: "Shape",
      width: "third",
      min: 0,
      max: 40,
    }),
    f.number("theme.borderWidth", "Border width", {
      section: "Shape",
      width: "third",
      min: 0,
      max: 6,
    }),
    f.number("theme.spacing", "Layout spacing", {
      section: "Shape",
      width: "third",
      min: 4,
      max: 32,
    }),
    f.select(
      "theme.shadowLevel",
      "Shadow",
      options(["0", "None"], ["1", "Soft"], ["2", "Medium"], ["3", "Strong"]),
      {
        section: "Shape",
        width: "third",
      },
    ),
    f.select(
      "theme.fontFamily",
      "Font family",
      options(
        ["system", "System default"],
        ["serif", "Serif"],
        ["monospace", "Monospace"],
        ["rounded", "Rounded"],
      ),
      { section: "Typography", width: "third" },
    ),
    f.number("theme.baseFontSize", "Base font size", {
      section: "Typography",
      width: "third",
      min: 10,
      max: 20,
    }),
    f.number("theme.headingScale", "Heading scale", {
      section: "Typography",
      width: "third",
      min: 1,
      max: 2,
    }),
    f.select(
      "theme.headingWeight",
      "Heading weight",
      options(["600", "Semibold"], ["700", "Bold"], ["800", "Extra bold"]),
      {
        section: "Typography",
        width: "third",
      },
    ),
    f.select(
      "theme.colorScheme",
      "Colour scheme",
      options(
        ["light", "Light"],
        ["dark", "Dark"],
        ["system", "Follow the device"],
      ),
      {
        section: "Dark mode",
        width: "third",
      },
    ),

    f.color("darkTheme.backgroundColor", "Dark background", {
      section: "Dark mode",
      width: "third",
    }),
    f.color("darkTheme.surfaceColor", "Dark card", {
      section: "Dark mode",
      width: "third",
    }),
    f.color("darkTheme.textColor", "Dark text", {
      section: "Dark mode",
      width: "third",
    }),
    f.color("darkTheme.mutedTextColor", "Dark muted text", {
      section: "Dark mode",
      width: "third",
    }),
    f.color("darkTheme.borderColor", "Dark borders", {
      section: "Dark mode",
      width: "third",
    }),
    f.code("theme.customCss", "Custom CSS (website only)", {
      section: "Advanced",
      rows: 6,
    }),
  ],
};

const brandingGroup: ConfigGroup = {
  key: "branding",
  label: "Branding",
  icon: "copyright",
  module: "appearance",
  fields: [
    f.text("branding.companyName", "Company name", { width: "half" }),
    f.text("branding.legalName", "Legal company name", { width: "half" }),
    f.text("branding.tagline", "Tagline", {}),
    f.image("branding.logo", "Primary logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.logoLight", "Light logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.logoDark", "Dark logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.mobileLogo", "Mobile logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.favicon", "Favicon", {
      help: "Updates the browser tab icon after publication.",
      section: "Logos",
      width: "third",
    }),
    f.image("branding.appIcon", "App icon", {
      help: "Launcher icon for the next Android/iOS release. Upload a square image; preparing a new build downloads the published asset.",
      section: "Logos",
      width: "third",
    }),
    f.image("branding.splashLogo", "Splash-screen logo", {
      help: "Native launch artwork for the next Android/iOS build.",
      section: "Logos",
      width: "third",
    }),
    f.image("branding.emailLogo", "Email logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.invoiceLogo", "Invoice logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.footerLogo", "Footer logo", {
      section: "Logos",
      width: "third",
    }),
    f.image("branding.socialShareImage", "Default social-sharing image", {
      section: "Logos",
      width: "third",
    }),
  ],
};

const headerFooterGroup: ConfigGroup = {
  key: "chrome",
  label: "Header, footer & announcement",
  icon: "window-maximize",
  module: "appearance",
  fields: [
    f.boolean("header.showLogo", "Show logo", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showSearch", "Show search", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showCart", "Show cart", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showWishlist", "Show wishlist", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showProfile", "Show profile", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showContactNumber", "Show contact number", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.showSocialIcons", "Show social icons", {
      section: "Header",
      width: "third",
    }),
    f.boolean("header.sticky", "Sticky header", {
      section: "Header",
      width: "third",
    }),
    f.color("header.backgroundColor", "Header background", {
      section: "Header",
      width: "third",
    }),
    f.color("header.textColor", "Header text", {
      section: "Header",
      width: "third",
    }),
    f.text("header.searchPlaceholder", "Search placeholder", {
      section: "Header",
    }),

    f.boolean("announcement.enabled", "Show the announcement bar", {
      section: "Announcement bar",
      width: "third",
    }),
    f.boolean("announcement.scrolling", "Scroll the text", {
      section: "Announcement bar",
      width: "third",
    }),
    f.text("announcement.text", "Announcement text", {
      section: "Announcement bar",
    }),
    f.url("announcement.link", "Link", {
      section: "Announcement bar",
      width: "half",
    }),
    f.color("announcement.backgroundColor", "Background", {
      section: "Announcement bar",
      width: "third",
    }),
    f.color("announcement.textColor", "Text colour", {
      section: "Announcement bar",
      width: "third",
    }),
    f.datetime("announcement.startsAt", "Show from", {
      section: "Announcement bar",
      width: "half",
    }),
    f.datetime("announcement.endsAt", "Hide after", {
      section: "Announcement bar",
      width: "half",
    }),

    f.boolean("footer.enabled", "Show the footer", {
      section: "Footer",
      width: "third",
    }),
    f.textarea("footer.aboutText", "About text", {
      section: "Footer",
      rows: 3,
    }),
    f.boolean("footer.showQuickLinks", "Quick links", {
      section: "Footer",
      width: "third",
    }),
    f.boolean("footer.showPolicies", "Policies", {
      section: "Footer",
      width: "third",
    }),
    f.boolean("footer.showSocial", "Social media", {
      section: "Footer",
      width: "third",
    }),
    f.boolean("footer.showNewsletter", "Newsletter", {
      section: "Footer",
      width: "third",
    }),
    f.boolean("footer.showPaymentIcons", "Payment icons", {
      section: "Footer",
      width: "third",
    }),
    f.boolean("footer.showAppLinks", "App download links", {
      section: "Footer",
      width: "third",
    }),
    f.text("footer.newsletterHeading", "Newsletter heading", {
      section: "Footer",
      width: "half",
    }),
    f.text("footer.copyright", "Copyright", {
      section: "Footer",
      width: "half",
    }),
    f.color("footer.backgroundColor", "Footer background", {
      section: "Footer",
      width: "third",
    }),
    f.color("footer.textColor", "Footer text", {
      section: "Footer",
      width: "third",
    }),
  ],
};

const storeGroup: ConfigGroup = {
  key: "store",
  label: "Store details",
  icon: "shop",
  module: "settings",
  fields: [
    f.text("contact.phone", "Phone", { width: "half" }),
    f.text("contact.supportPhone", "Support phone", { width: "half" }),
    f.email("contact.email", "Email", { width: "half" }),
    f.email("contact.supportEmail", "Support email", { width: "half" }),
    f.textarea("contact.address", "Address", { rows: 3 }),
    f.url("contact.mapsUrl", "Google Maps location", { width: "half" }),
    f.text("contact.businessHours", "Business hours", { width: "half" }),
    f.text("contact.panVat", "PAN / VAT", { width: "half" }),
    f.text("contact.registrationNumber", "Registration number", {
      width: "half",
    }),
  ],
};

const socialGroup: ConfigGroup = {
  key: "social",
  label: "Social media & login",
  icon: "share-nodes",
  module: "settings",
  fields: [
    f.multiselect(
      "social.enabled",
      "Show these networks",
      options(
        "facebook",
        "instagram",
        "tiktok",
        "youtube",
        "linkedin",
        "x",
        "pinterest",
        "whatsapp",
      ),
      { section: "Social links" },
    ),
    f.url("social.facebook", "Facebook", {
      section: "Social links",
      width: "half",
    }),
    f.url("social.instagram", "Instagram", {
      section: "Social links",
      width: "half",
    }),
    f.url("social.tiktok", "TikTok", {
      section: "Social links",
      width: "half",
    }),
    f.url("social.youtube", "YouTube", {
      section: "Social links",
      width: "half",
    }),
    f.url("social.linkedin", "LinkedIn", {
      section: "Social links",
      width: "half",
    }),
    f.url("social.x", "X", { section: "Social links", width: "half" }),
    f.url("social.pinterest", "Pinterest", {
      section: "Social links",
      width: "half",
    }),
    f.text("social.whatsapp", "WhatsApp number", {
      section: "Social links",
      width: "half",
    }),
    f.boolean("auth.googleLogin", "Google login", {
      section: "Social login",
      width: "third",
    }),
    f.boolean("auth.appleLogin", "Apple login", {
      section: "Social login",
      width: "third",
    }),
    f.boolean("auth.facebookLogin", "Facebook login", {
      section: "Social login",
      width: "third",
    }),
    f.text("auth.googleClientId", "Google client ID", {
      section: "Social login",
      width: "third",
    }),
    f.text("auth.appleServiceId", "Apple service ID", {
      section: "Social login",
      width: "third",
    }),
    f.text("auth.facebookAppId", "Facebook app ID", {
      section: "Social login",
      width: "third",
    }),
  ],
};

const authGroup: ConfigGroup = {
  key: "auth",
  label: "Authentication & security",
  icon: "shield-halved",
  module: "settings",
  fields: [
    f.boolean("auth.emailPassword", "Email and password", {
      section: "Sign-in methods",
      width: "third",
    }),
    f.boolean("auth.phoneOtp", "Phone OTP", {
      section: "Sign-in methods",
      width: "third",
    }),
    f.boolean("auth.emailOtp", "Email OTP", {
      section: "Sign-in methods",
      width: "third",
    }),
    f.boolean("security.twoFactorRequired", "Require two-factor for admins", {
      section: "Policy",
      width: "third",
    }),
    f.number("security.passwordMinLength", "Minimum password length", {
      section: "Policy",
      width: "third",
      min: 6,
      max: 64,
    }),
    f.boolean("security.passwordRequiresNumber", "Require a number", {
      section: "Policy",
      width: "third",
    }),
    f.boolean("security.passwordRequiresSymbol", "Require a symbol", {
      section: "Policy",
      width: "third",
    }),
    f.number("security.maxLoginAttempts", "Login attempt limit", {
      section: "Policy",
      width: "third",
      min: 1,
    }),
    f.number("security.lockoutMinutes", "Lockout minutes", {
      section: "Policy",
      width: "third",
      min: 1,
    }),
    f.number("security.sessionHours", "Session expiry (hours)", {
      section: "Policy",
      width: "third",
      min: 1,
    }),
    f.boolean("security.adminLoginAlerts", "Alert on admin logins", {
      section: "Policy",
      width: "third",
    }),
    f.boolean("security.captchaOnAuth", "CAPTCHA on sign-in", {
      section: "Policy",
      width: "third",
    }),
    f.number("security.rateLimitPerMinute", "API rate limit per minute", {
      section: "Policy",
      width: "third",
      min: 1,
    }),
    f.number("security.trashRetentionDays", "Empty the trash after (days)", {
      section: "Policy",
      width: "third",
      min: 1,
    }),
  ],
};

const featureGroup: ConfigGroup = {
  key: "features",
  label: "Feature switches",
  icon: "toggle-on",
  module: "settings",
  description: "Turn storefront features on or off without a release.",
  fields: [
    f.boolean("features.wishlist", "Wishlist", { width: "third" }),
    f.boolean("features.reviews", "Reviews", { width: "third" }),
    f.boolean("features.questions", "Questions & answers", { width: "third" }),
    f.boolean("features.cashOnDelivery", "Cash on delivery", {
      width: "third",
    }),
    f.boolean("features.coupons", "Coupons", { width: "third" }),
    f.boolean("features.loyalty", "Loyalty", { width: "third" }),
    f.boolean("features.giftCards", "Gift cards", { width: "third" }),
    f.boolean("features.chat", "Chat", { width: "third" }),
    f.boolean("features.blog", "Blog", { width: "third" }),
    f.boolean("features.flashSales", "Flash sales", { width: "third" }),
    f.boolean("features.guestCheckout", "Guest checkout", { width: "third" }),
    f.boolean("features.productComparison", "Product comparison", {
      width: "third",
    }),
    f.boolean("features.recentlyViewed", "Recently viewed", { width: "third" }),
    f.boolean("features.recommendations", "Recommendations", {
      width: "third",
    }),
    f.boolean("features.backInStockAlerts", "Back-in-stock alerts", {
      width: "third",
    }),
    f.boolean("features.priceDropAlerts", "Price-drop alerts", {
      width: "third",
    }),
    f.boolean("features.preorders", "Preorders", { width: "third" }),
    f.boolean("features.storePickup", "Store pickup", { width: "third" }),
    f.boolean("features.referrals", "Referrals", { width: "third" }),
    f.boolean("features.newsletterPopup", "Newsletter popup", {
      width: "third",
    }),
  ],
};

const checkoutGroup: ConfigGroup = {
  key: "checkout",
  label: "Checkout",
  icon: "cart-shopping",
  module: "settings",
  fields: [
    f.boolean("checkout.guestCheckout", "Allow guest checkout", {
      width: "third",
    }),
    f.boolean("checkout.loginRequired", "Require sign-in", { width: "third" }),
    f.boolean("checkout.deliveryNotes", "Delivery notes field", {
      width: "third",
    }),
    f.multiselect(
      "checkout.requiredFields",
      "Required fields",
      options(
        "name",
        "phone",
        "email",
        "address",
        "city",
        "district",
        "province",
        "postalCode",
        "landmark",
      ),
    ),
    f.multiselect(
      "checkout.optionalFields",
      "Optional fields",
      options(
        "name",
        "phone",
        "email",
        "address",
        "city",
        "district",
        "province",
        "postalCode",
        "landmark",
      ),
    ),
    f.currency("checkout.minimumOrder", "Minimum order", {
      width: "third",
      min: 0,
    }),
    f.currency("checkout.maximumOrder", "Maximum order", {
      width: "third",
      min: 0,
    }),
    f.currency("checkout.codLimit", "Cash-on-delivery limit", {
      width: "third",
      min: 0,
    }),
    f.currency("checkout.freeShippingThreshold", "Free shipping above", {
      width: "third",
      min: 0,
    }),
    f.currency("checkout.defaultShippingFee", "Default shipping fee", {
      width: "third",
      min: 0,
    }),
    f.boolean("checkout.showUpsells", "Show checkout upsells", {
      width: "third",
    }),
    f.boolean("checkout.termsAgreement", "Require terms agreement", {
      width: "third",
    }),
    f.textarea("checkout.termsText", "Terms text", { rows: 3 }),
  ],
};

const catalogGroup: ConfigGroup = {
  key: "catalog",
  label: "Product display & filters",
  icon: "table-cells",
  module: "settings",
  fields: [
    f.number("catalog.productsPerPage", "Products per page", {
      width: "third",
      min: 4,
      max: 100,
    }),
    f.select(
      "catalog.defaultSort",
      "Default sort",
      options(
        "relevance",
        "newest",
        "price_low",
        "price_high",
        "rating",
        "bestselling",
      ),
      { width: "third" },
    ),
    f.number("catalog.gridColumnsMobile", "Grid columns on mobile", {
      width: "third",
      min: 1,
      max: 3,
    }),
    f.number("catalog.gridColumnsDesktop", "Grid columns on desktop", {
      width: "third",
      min: 2,
      max: 8,
    }),
    f.boolean("catalog.showStockCount", "Show stock count", { width: "third" }),
    f.number("catalog.lowStockBadgeAt", "Low-stock badge at", {
      width: "third",
      min: 0,
    }),
    f.boolean("catalog.showRatings", "Show ratings", { width: "third" }),
    f.boolean("catalog.showSoldCount", "Show sold count", { width: "third" }),
    f.repeater(
      "catalog.filters",
      "Filters",
      [
        f.text("key", "Key", { width: "third" }),
        f.text("label", "Label", { width: "third" }),
        f.number("sortOrder", "Order", { width: "third" }),
        f.boolean("enabled", "Enabled"),
      ],
      {
        help: "Controls which filters the storefront offers, and in what order.",
      },
    ),
    f.boolean("personalisation.recommendedProducts", "Recommended products", {
      section: "Personalisation",
      width: "third",
    }),
    f.boolean("personalisation.relatedProducts", "Related products", {
      section: "Personalisation",
      width: "third",
    }),
    f.boolean("personalisation.personalisedHomepage", "Personalised homepage", {
      section: "Personalisation",
      width: "third",
    }),
    f.boolean(
      "personalisation.locationSuggestions",
      "Location-based suggestions",
      {
        section: "Personalisation",
        width: "third",
      },
    ),
    f.boolean(
      "personalisation.purchaseHistorySuggestions",
      "Purchase-history suggestions",
      {
        section: "Personalisation",
        width: "third",
      },
    ),
    f.number("personalisation.recentlyViewedCount", "Recently viewed count", {
      section: "Personalisation",
      width: "third",
      min: 0,
      max: 50,
    }),
    f.boolean("personalisation.comparisonEnabled", "Product comparison", {
      section: "Comparison",
      width: "third",
    }),
    f.number(
      "personalisation.comparisonMaxProducts",
      "Maximum compared products",
      {
        section: "Comparison",
        width: "third",
        min: 2,
        max: 8,
      },
    ),
    f.tags("personalisation.comparisonAttributes", "Comparison attributes", {
      section: "Comparison",
    }),
  ],
};

const seoGroup: ConfigGroup = {
  key: "seo",
  label: "SEO",
  icon: "magnifying-glass",
  module: "seo",
  fields: [
    f.text("seo.siteTitle", "Site title", { width: "half" }),
    f.text("seo.titleTemplate", "Title template", {
      width: "half",
      help: "{page} and {site} are replaced.",
    }),
    f.textarea("seo.metaDescription", "Meta description", { rows: 3 }),
    f.tags("seo.keywords", "Keywords"),
    f.text("seo.robots", "Robots directive", { width: "half" }),
    f.boolean("seo.sitemapEnabled", "Generate a sitemap", { width: "half" }),
    f.image("seo.openGraphImage", "Open Graph image", { width: "half" }),
    f.text("seo.twitterHandle", "X / Twitter handle", { width: "half" }),
    f.boolean("seo.productSchema", "Product schema", {
      section: "Structured data",
      width: "third",
    }),
    f.boolean("seo.organizationSchema", "Organization schema", {
      section: "Structured data",
      width: "third",
    }),
    f.boolean("seo.breadcrumbSchema", "Breadcrumb schema", {
      section: "Structured data",
      width: "third",
    }),
    f.boolean("seo.faqSchema", "FAQ schema", {
      section: "Structured data",
      width: "third",
    }),
    f.text("seo.googleVerification", "Google verification code", {
      section: "Verification",
      width: "half",
    }),
    f.text("seo.bingVerification", "Bing verification code", {
      section: "Verification",
      width: "half",
    }),
  ],
};

const localisationGroup: ConfigGroup = {
  key: "localisation",
  label: "Localisation",
  icon: "language",
  module: "settings",
  fields: [
    f.text("localisation.defaultLanguage", "Default language", {
      width: "third",
    }),
    f.text("localisation.defaultCurrency", "Default currency", {
      width: "third",
    }),
    f.text("localisation.currencySymbol", "Currency symbol", {
      width: "third",
    }),
    f.select(
      "localisation.currencyPosition",
      "Symbol position",
      options(["before", "Before"], ["after", "After"]),
      {
        width: "third",
      },
    ),
    f.text("localisation.timezone", "Timezone", { width: "third" }),
    f.select(
      "localisation.dateFormat",
      "Date format",
      options("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"),
      {
        width: "third",
      },
    ),
    f.select(
      "localisation.numberFormat",
      "Number format",
      options("1,234.56", "1.234,56", "1 234.56"),
      {
        width: "third",
      },
    ),
    f.repeater(
      "localisation.languages",
      "Languages",
      [
        f.text("code", "Code", { width: "third" }),
        f.text("label", "Label", { width: "third" }),
        f.boolean("enabled", "Enabled", { width: "third" }),
      ],
      {},
    ),
  ],
};

const appGroup: ConfigGroup = {
  key: "app",
  label: "App & website",
  icon: "mobile-screen",
  module: "settings",
  fields: [
    f.text("app.appName", "App name", { section: "App", width: "half" }),
    f.text("app.packageName", "Package name", {
      section: "App",
      width: "half",
    }),
    f.text("app.currentVersion", "Current version", {
      section: "App",
      width: "third",
    }),
    f.text("app.minimumVersion", "Minimum supported version", {
      section: "App",
      width: "third",
    }),
    f.boolean("app.forceUpdate", "Force update", {
      section: "App",
      width: "third",
    }),
    f.textarea("app.updateMessage", "Update message", {
      section: "App",
      rows: 2,
    }),
    f.url("app.playStoreUrl", "Play Store link", {
      section: "App",
      width: "half",
    }),
    f.url("app.appStoreUrl", "App Store link", {
      section: "App",
      width: "half",
    }),
    f.text("app.deepLinkScheme", "Deep-link scheme", {
      section: "App",
      width: "half",
    }),
    f.text("app.shareMessage", "Share message", {
      section: "App",
      width: "half",
    }),
    f.text("website.domain", "Domain", { section: "Website", width: "half" }),
    f.text("website.siteName", "Site name", {
      section: "Website",
      width: "half",
    }),
    f.boolean("app.maintenanceMode", "App maintenance mode", {
      section: "Maintenance",
      width: "third",
    }),
    f.boolean("website.maintenanceMode", "Website maintenance mode", {
      section: "Maintenance",
      width: "third",
    }),
    f.boolean(
      "website.allowAdminsDuringMaintenance",
      "Admins can still browse",
      {
        section: "Maintenance",
        width: "third",
      },
    ),
    f.textarea("app.maintenanceMessage", "App maintenance message", {
      section: "Maintenance",
      rows: 2,
    }),
    f.textarea("website.maintenanceMessage", "Website maintenance message", {
      section: "Maintenance",
      rows: 2,
    }),
    f.text("app.maintenanceEta", "Estimated recovery", {
      section: "Maintenance",
      width: "half",
    }),
  ],
};

const chatGroup: ConfigGroup = {
  key: "liveChat",
  label: "Live chat",
  icon: "comments",
  module: "support",
  fields: [
    f.boolean("liveChat.enabled", "Enable live chat", { width: "half" }),
    f.select(
      "liveChat.provider",
      "Provider",
      options(
        ["none", "None"],
        ["widget", "Built-in widget"],
        ["whatsapp", "WhatsApp"],
        ["messenger", "Messenger"],
        ["chatbot", "AI chatbot"],
      ),
      { width: "half" },
    ),
    f.text("liveChat.whatsappNumber", "WhatsApp number", { width: "half" }),
    f.url("liveChat.messengerUrl", "Messenger link", { width: "half" }),
    f.text("liveChat.supportHours", "Support hours", { width: "half" }),
    f.text("liveChat.greeting", "Greeting", { width: "half" }),
    f.textarea("liveChat.offlineMessage", "Offline message", { rows: 2 }),
  ],
};

const invoiceGroup: ConfigGroup = {
  key: "invoice",
  label: "Invoices",
  icon: "file-invoice",
  module: "finance",
  fields: [
    f.text("invoice.numberFormat", "Invoice number format", {
      width: "half",
      help: "{year} and {number} are replaced.",
    }),
    f.number("invoice.nextNumber", "Next invoice number", {
      width: "half",
      min: 1,
    }),
    f.boolean("invoice.autoGenerate", "Generate invoices automatically", {
      width: "half",
    }),
    f.boolean("invoice.showLogo", "Show the logo", { width: "half" }),
    f.text("invoice.companyName", "Company name", { width: "half" }),
    f.text("invoice.panVat", "PAN / VAT", { width: "half" }),
    f.textarea("invoice.address", "Address", { rows: 2 }),
    f.text("invoice.phone", "Phone", { width: "half" }),
    f.color("invoice.accentColor", "Accent colour", { width: "half" }),
    f.textarea("invoice.footer", "Footer", { rows: 2 }),
    f.textarea("invoice.terms", "Terms", { rows: 3 }),
  ],
};

const textGroup: ConfigGroup = {
  key: "text",
  label: "App & website wording",
  icon: "quote-left",
  module: "content",
  description:
    "Reword buttons, headings, empty states and error messages without a release.",
  fields: [
    f.text("text.addToCart", "Add to cart", {
      section: "Buttons",
      width: "third",
    }),
    f.text("text.buyNow", "Buy now", { section: "Buttons", width: "third" }),
    f.text("text.checkout", "Checkout", { section: "Buttons", width: "third" }),
    f.text("text.login", "Login", { section: "Buttons", width: "third" }),
    f.text("text.signup", "Sign up", { section: "Buttons", width: "third" }),
    f.text("text.logout", "Log out", { section: "Buttons", width: "third" }),
    f.text("text.search", "Search", { section: "Buttons", width: "third" }),
    f.text("text.homeHeading", "Home heading", { section: "Headings" }),
    f.text("text.homeSubheading", "Home subheading", { section: "Headings" }),
    f.text("text.offersHeading", "Offers heading", { section: "Headings" }),
    f.text("text.promoMessage", "Promotional message", { section: "Headings" }),
    f.text("text.freeShippingMessage", "Free-shipping message", {
      section: "Headings",
    }),
    f.text("text.outOfStock", "Out of stock", {
      section: "Stock",
      width: "half",
    }),
    f.text("text.lowStock", "Low stock", { section: "Stock", width: "half" }),
    f.text("text.emptyCart", "Empty cart", { section: "Empty states" }),
    f.text("text.emptyWishlist", "Empty wishlist", { section: "Empty states" }),
    f.text("text.emptyOrders", "No orders", { section: "Empty states" }),
    f.text("text.emptySearch", "No search results", {
      section: "Empty states",
    }),
    f.text("text.genericError", "Generic error", { section: "Messages" }),
    f.text("text.networkError", "Network error", { section: "Messages" }),
    f.text("text.orderPlaced", "Order placed", { section: "Messages" }),
    f.text("text.thankYou", "Thank you", { section: "Messages" }),
  ],
};

export const CONFIG_GROUPS: ConfigGroup[] = [
  themeGroup,
  brandingGroup,
  headerFooterGroup,
  storeGroup,
  socialGroup,
  authGroup,
  featureGroup,
  checkoutGroup,
  catalogGroup,
  seoGroup,
  localisationGroup,
  appGroup,
  chatGroup,
  invoiceGroup,
  textGroup,
];

export function configGroup(key: string): ConfigGroup | null {
  return CONFIG_GROUPS.find((group) => group.key === key) ?? null;
}

/** Ready-made palettes offered on the Appearance screen. */
export const THEME_PRESETS: {
  name: string;
  values: Record<string, string | number>;
}[] = [
  {
    name: "Gulmeli orange",
    values: {
      "theme.primaryColor": "#f85606",
      "theme.secondaryColor": "#ff4600",
      "theme.accentColor": "#ffba00",
      "theme.buttonColor": "#f85606",
      "header.backgroundColor": "#f85606",
    },
  },
  {
    name: "Deep indigo",
    values: {
      "theme.primaryColor": "#4338ca",
      "theme.secondaryColor": "#6366f1",
      "theme.accentColor": "#f59e0b",
      "theme.buttonColor": "#4338ca",
      "header.backgroundColor": "#4338ca",
    },
  },
  {
    name: "Forest",
    values: {
      "theme.primaryColor": "#15803d",
      "theme.secondaryColor": "#16a34a",
      "theme.accentColor": "#facc15",
      "theme.buttonColor": "#15803d",
      "header.backgroundColor": "#15803d",
    },
  },
  {
    name: "Midnight",
    values: {
      "theme.primaryColor": "#0f172a",
      "theme.secondaryColor": "#334155",
      "theme.accentColor": "#38bdf8",
      "theme.buttonColor": "#0f172a",
      "header.backgroundColor": "#0f172a",
    },
  },
  {
    name: "Rose",
    values: {
      "theme.primaryColor": "#be123c",
      "theme.secondaryColor": "#e11d48",
      "theme.accentColor": "#fb7185",
      "theme.buttonColor": "#be123c",
      "header.backgroundColor": "#be123c",
    },
  },
];
