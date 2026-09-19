import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";

/*
 * Any unmatched storefront path. Previously these fell through the router and
 * rendered the layout around an empty <main>, which looked like a page that
 * had failed to load rather than an address that does not exist.
 */
export function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <Icon name="search" size={40} className="text-ink-faint" strokeWidth={1.4} />
      <div>
        <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          The address you followed does not match anything in the store.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Go to the home page
        </Link>
        <Link
          to="/search"
          className="rounded-md border border-line bg-raised px-5 py-2.5 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
