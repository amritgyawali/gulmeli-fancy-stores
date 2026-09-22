import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { prefersReducedMotion } from "@/lib/hooks";

/*
 * Toasts: the confirmation after adding to the cart, saving to the wishlist
 * or copying a link.
 *
 * One region, announced politely, holding at most three messages. A toast
 * that carries an action (View cart) stays up longer and pauses while the
 * pointer is over it, so the action is reachable before it disappears.
 */

type Tone = "success" | "info" | "error";

export interface ToastInput {
  message: string;
  tone?: Tone;
  image?: string | null;
  /* A link (View cart) or a callback (Undo). */
  action?: { label: string; to?: string; onClick?: () => void };
}

interface ToastItem extends ToastInput {
  id: number;
  leaving?: boolean;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => undefined);

export const useToast = () => useContext(ToastContext);

const MAX = 3;

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    /* Leave the DOM after the exit animation, which is shorter than the
       entrance on purpose. */
    setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(
      () => setItems((list) => list.filter((t) => t.id !== id)),
      prefersReducedMotion() ? 0 : 160,
    );
  }, []);

  const schedule = useCallback(
    (id: number, ms: number) => {
      window.clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), ms),
      );
    },
    [dismiss],
  );

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((list) => [...list, { ...toast, id }].slice(-MAX));
      schedule(id, toast.action ? 5000 : 3000);
    },
    [schedule],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            onMouseEnter={() => window.clearTimeout(timers.current.get(t.id))}
            onMouseLeave={() => schedule(t.id, 2000)}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg bg-[#1f2126] py-2.5 pl-2.5 pr-2 text-sm text-white shadow-e3 ring-1 ring-white/10 ${
              t.leaving
                ? "opacity-0 transition-opacity duration-150 ease-in"
                : "animate-fade-up"
            }`}
          >
            {t.image ? (
              <img
                src={t.image}
                alt=""
                className="h-10 w-10 shrink-0 rounded-sm bg-raised object-cover"
              />
            ) : (
              <Icon
                name={t.tone === "error" ? "alert" : t.tone === "info" ? "info" : "checkCircle"}
                size={20}
                className={`ml-1 shrink-0 ${t.tone === "error" ? "text-[#ff8a80]" : "text-[#7ee2a8]"}`}
              />
            )}
            <p className="min-w-0 flex-1 font-medium leading-snug">{t.message}</p>
            {t.action?.to ? (
              <Link
                to={t.action.to}
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-sm px-2.5 py-1.5 text-sm font-semibold text-[#ffb68c] hover:bg-white/10"
              >
                {t.action.label}
              </Link>
            ) : t.action?.onClick ? (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick?.();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-sm px-2.5 py-1.5 text-sm font-semibold text-[#ffb68c] hover:bg-white/10"
              >
                {t.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-white/60 hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/*
 * Sends a copy of the product photo from where it was tapped to the cart
 * button, then lets the badge bump. Purely decorative: it is skipped for
 * reduced-motion users and whenever either end cannot be found, and the cart
 * has already been updated before it starts.
 */
export function flyToCart(from: Element | null | undefined) {
  if (!from || prefersReducedMotion()) return;
  const targets = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")];
  const target = targets.find((el) => el.offsetParent !== null);
  if (!target) return;

  const img = from instanceof HTMLImageElement ? from : from.querySelector("img");
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) return;

  const ghost = document.createElement(img ? "img" : "div");
  if (img && ghost instanceof HTMLImageElement) ghost.src = img.currentSrc || img.src;
  const size = Math.min(a.width, a.height, 160);
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "cover",
    borderRadius: "12px",
    background: "var(--color-brand)",
    boxShadow: "0 8px 24px rgb(20 22 26 / 0.2)",
    zIndex: "80",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const animation = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 60}px) scale(0.55)`, opacity: 0.95, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.4 },
    ],
    { duration: 620, easing: "cubic-bezier(0.55, 0.085, 0.68, 0.53)" },
  );
  animation.onfinish = () => {
    ghost.remove();
    window.dispatchEvent(new CustomEvent("cart:landed"));
  };
  animation.oncancel = () => ghost.remove();
}
