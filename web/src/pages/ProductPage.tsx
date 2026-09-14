import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShop } from "@/store/ShopContext";
import { ProductVisual, Price, ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";
import { bundledImage } from "@/lib/images";

const TABS = ["Description", "Specifications", "Reviews"];

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    productById,
    catalogReady,
    add,
    cart,
    commerce,
    updateCommerce,
    session,
    products,
  } = useShop();
  const product = id ? productById[id] : undefined;
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState(TABS[0]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setQty(1);
    setNotice("");
  }, [id]);

  const cartItem = product ? cart.find((i) => i.productId === product.id) : undefined;
  const wished = Boolean(product && commerce.wishlist.includes(product.id));
  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const main = bundledImage(product);
    const others = (product.imageUrl ? [product.imageUrl] : []).concat(
      commerce.recent
        .map((r) => productById[r])
        .filter((p) => p && p.id !== product.id)
        .map((p) => bundledImage(p) as string)
        .filter(Boolean)
        .slice(0, 3),
    );
    return [main, ...others].filter((x): x is string => Boolean(x));
  }, [product, commerce.recent, productById]);
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => setActiveImage(0), [id]);
  const related = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.id !== product?.id &&
            p.category === product?.category &&
            p.stock > 0,
        )
        .slice(0, 5),
    [products, product],
  );

  if (!catalogReady)
    return <div className="h-[540px] w-full animate-pulse rounded-2xl bg-slate-200" />;
  if (!product)
    return (
      <div className="rounded-2xl bg-white p-16 text-center shadow-sm">
        <p className="text-3xl">🫥</p>
        <p className="mt-3 text-lg font-bold text-slate-700">
          This product is no longer available.
        </p>
        <Link to="/" className="mt-4 inline-block rounded-xl bg-[#f85606] px-6 py-3 text-sm font-bold text-white">
          Back to shop
        </Link>
      </div>
    );

  const out = product.stock < 1;
  const addToCart = (count = qty) => {
    for (let i = 0; i < count; i += 1) add(product);
    setNotice(`Added ${count} item${count > 1 ? "s" : ""} to your cart.`);
    setTimeout(() => setNotice(""), 2500);
  };
  const buyNow = () => {
    add(product);
    navigate("/cart");
  };
  const toggleWish = () =>
    updateCommerce((current) => ({
      ...current,
      wishlist: current.wishlist.includes(product.id)
        ? current.wishlist.filter((x) => x !== product.id)
        : [...current.wishlist, product.id],
    }));

  return (
    <div className="space-y-8">
      <nav className="text-xs text-slate-500">
        <Link to="/" className="hover:text-slate-800">Home</Link>
        <span className="mx-2">/</span>
        <Link to={`/search?q=${encodeURIComponent(product.category)}`} className="hover:text-slate-800">
          {product.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-800">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[480px_1fr]">
        {/* Gallery */}
        <div className="lg:sticky lg:top-40 lg:self-start">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="aspect-square">
              {activeImage < gallery.length ? (
                <img
                  src={gallery[activeImage]}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ProductVisual product={product} fit="contain" />
              )}
            </div>
            {product.discount && (
              <span className="absolute left-4 top-4 rounded-lg bg-[#ff4d4f] px-3 py-1 text-sm font-black text-white">
                {product.discount} OFF
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-3">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-white transition ${
                    activeImage === i ? "border-[#f85606]" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="min-w-0 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {product.brand && (
                <span className="rounded-full bg-slate-800 px-3 py-1 font-bold text-white">
                  {product.brand}
                </span>
              )}
              {product.store && <span className="text-slate-500">Sold by {product.store}</span>}
              {product.badge && (
                <span className="rounded-full bg-amber-400 px-3 py-1 font-bold text-amber-950">
                  {product.badge}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-black leading-snug lg:text-3xl">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              {product.rating && (
                <span className="flex items-center gap-1 font-bold text-rose-600">
                  <Icon name="star" size={16} className="fill-rose-500 text-rose-500" />
                  {product.rating}
                </span>
              )}
              {product.sold != null && (
                <span className="text-slate-500">{product.sold.toLocaleString()} sold</span>
              )}
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">SKU {product.id.toUpperCase()}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <Price product={product} size="lg" />
            {product.originalPrice != null && product.originalPrice > product.price && (
              <p className="mt-1 text-sm font-bold text-emerald-600">
                You save Rs.
                {(product.originalPrice - product.price).toLocaleString()}
                {product.discount ? ` (${product.discount.replace("-", "")})` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">Inclusive of all taxes</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-slate-300">
                <button
                  aria-label="Decrease quantity"
                  disabled={out || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-3 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <Icon name="minus" size={14} />
                </button>
                <span className="w-12 border-x border-slate-200 py-3 text-center text-base font-black">
                  {qty}
                </span>
                <button
                  aria-label="Increase quantity"
                  disabled={out || qty >= product.stock}
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="px-4 py-3 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                >
                  <Icon name="plus" size={14} />
                </button>
              </div>
              <p className="text-sm text-slate-500">
                {out
                  ? "Currently out of stock"
                  : `Max ${product.stock} per order · ${Math.max(0, product.stock - (cartItem?.quantity ?? 0))} more available`}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                disabled={out}
                onClick={() => addToCart()}
                className="flex items-center gap-2 rounded-xl border-2 border-[#f85606] px-8 py-3.5 text-sm font-black text-[#f85606] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300"
              >
                <Icon name="cart" size={16} /> ADD TO CART
              </button>
              <button
                disabled={out}
                onClick={buyNow}
                className="rounded-xl bg-[#f85606] px-10 py-3.5 text-sm font-black text-white transition hover:bg-[#e14d05] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                BUY NOW
              </button>
              <button
                onClick={toggleWish}
                className={`flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-bold transition ${
                  wished
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-slate-300 text-slate-600 hover:border-rose-300 hover:text-rose-600"
                }`}
              >
                <Icon name="heart" size={16} className={wished ? "fill-rose-500 text-rose-500" : ""} />
                {wished ? "Wishlisted" : "Wishlist"}
              </button>
            </div>

            {notice && (
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                <Icon name="check" size={16} /> {notice}
                <Link to="/cart" className="ml-auto underline">
                  Go to cart →
                </Link>
              </p>
            )}
            {!session && !out && (
              <p className="mt-3 text-xs text-slate-400">
                <Link to="/auth" className="font-bold text-[#f85606]">Sign in</Link> to keep
                your cart, wishlist and orders in sync with the mobile app.
              </p>
            )}
          </div>

          {/* Trust + delivery */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: "shield", title: "Cash on delivery", note: "Pay when it arrives" },
              { icon: "truck", title: "Delivery across Nepal", note: "Free on all orders" },
              { icon: "box", title: "Easy returns", note: "Check store policy" },
            ].map((b) => (
              <div key={b.title} className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-sm">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-50 text-[#f85606]">
                  <Icon name={b.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{b.title}</span>
                  <span className="block text-xs text-slate-400">{b.note}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex gap-1 border-b border-slate-100 p-2">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                    tab === t ? "bg-[#f85606] text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="p-6 text-sm text-slate-600">
              {tab === "Description" && (
                <div className="space-y-3">
                  <p>
                    {product.name} — {product.brand ? `from ${product.brand}. ` : ""}
                    available at Gulmeli Fancy Stores with cash on delivery and
                    same-day dispatch for in-stock items. Genuine products,
                    sourced from verified distributors in Nepal.
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-slate-500">
                    <li>Category: {product.category}</li>
                    {!!product.gems && <li>Earn {product.gems} gems on purchase</li>}
                    {product.fastDelivery && <li>Eligible for Fast Delivery</li>}
                    {product.voucher && <li>Voucher eligible — apply GULMELI10 at checkout</li>}
                  </ul>
                </div>
              )}
              {tab === "Specifications" && (
                <table className="w-full max-w-lg">
                  <tbody className="divide-y divide-slate-100">
                    {(
                      [
                        ["Product ID", product.id],
                        ["Brand", product.brand ?? "—"],
                        ["Store", product.store ?? "Gulmeli Fancy Stores"],
                        ["Availability", out ? "Out of stock" : `In stock (${product.stock})`],
                        ["Price", `Rs.${product.price.toLocaleString()}`],
                        ["Rating", product.rating ?? "Not rated yet"],
                      ] as const
                    ).map(([k, v]) => (
                      <tr key={k}>
                        <th className="w-40 py-2.5 text-left font-bold text-slate-700">{k}</th>
                        <td className="py-2.5 text-slate-500">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === "Reviews" && (
                <div>
                  <p className="font-semibold text-slate-700">
                    {product.rating ?? "No reviews yet"}
                  </p>
                  <p className="mt-1 text-slate-400">
                    Reviews are private account notes on this store — sign in from
                    the mobile app to write yours.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">You may also like</h2>
          <Link to={`/search?q=${encodeURIComponent(product.category)}`} className="text-sm font-bold text-[#f85606]">
            More in {product.category} ›
          </Link>
        </div>
        {related.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white py-10 text-center text-sm text-slate-400 shadow-sm">
            Nothing related yet — check the home feed for suggestions.
          </p>
        )}
      </section>
    </div>
  );
}
