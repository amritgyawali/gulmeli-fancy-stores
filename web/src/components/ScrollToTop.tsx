import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/*
 * A router without this scrolls the new route to wherever the previous one
 * was left. Opening a product from halfway down the home grid dropped you
 * halfway down the product page, which read as a rendering bug.
 *
 * Restores the top on a push, leaves the browser's own restoration alone on
 * back/forward, and respects reduced-motion.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (window.history.scrollRestoration) window.history.scrollRestoration = "manual";
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "instant",
    });
  }, [pathname, search]);
  return null;
}
