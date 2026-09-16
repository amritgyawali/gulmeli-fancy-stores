import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
type Banner = {
  id: string;
  document: Record<string, unknown>;
  collection: string;
};
export function LiveBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void supabase.rpc("storefront_content").then(({ data, error }) => {
        if (active && !error && Array.isArray(data))
          setBanners(
            data.filter(
              (row) =>
                row.collection === "banners" &&
                (row.document.placement ?? "home") === "home",
            ),
          );
      });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="space-y-3">
      {banners.map(({ id, document: b }) => {
        const url = String(b.image || b.mobileImage || "");
        const title = String(b.heading || b.name || "");
        const content = (
          <>
            {url.startsWith("https://") && (
              <img
                src={url}
                alt={title}
                className="max-h-80 w-full object-cover"
              />
            )}
            <div className="p-4">
              <h2 className="text-xl font-bold">{title}</h2>
              <p>{String(b.subheading || "")}</p>
            </div>
          </>
        );
        return (
          <div key={id} className="mb-4 overflow-hidden rounded bg-[var(--store-surface)]">
            {b.productId ? (
              <Link to={`/product/${encodeURIComponent(String(b.productId))}`}>
                {content}
              </Link>
            ) : typeof b.ctaLink === "string" &&
              b.ctaLink.startsWith("https://") ? (
              <a href={b.ctaLink}>{content}</a>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
