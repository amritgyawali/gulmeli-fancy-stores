import { useEffect } from "react";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
export function BrandDocument() {
  const { config } = useStorefront();
  const theme = useStorefrontTheme();
  useEffect(() => {
    document.title = config.branding.companyName;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = /^(https:\/\/|\/|data:image\/)/.test(config.branding.favicon)
      ? config.branding.favicon
      : "/favicon.ico";
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = theme.primary;
    document.documentElement.style.colorScheme = theme.dark ? "dark" : "light";
  }, [
    config.branding.companyName,
    config.branding.favicon,
    theme.primary,
    theme.dark,
  ]);
  return config.theme.customCss ? (
    <style>{config.theme.customCss}</style>
  ) : null;
}
