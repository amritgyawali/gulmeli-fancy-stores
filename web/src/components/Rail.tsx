import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/*
 * A horizontal product rail with previous/next controls.
 *
 * On touch the rail is a native swipe with snap points and nothing else. With
 * a pointer, a mouse wheel cannot scroll sideways, so round arrow buttons
 * appear on the sides — each one only while there is something in its
 * direction, and the trailing edge fades while more cards are hidden there.
 */
export function Rail({
  children,
  label,
  gap = "gap-2.5 sm:gap-3",
}: {
  children: ReactNode;
  label: string;
  gap?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const page = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-raised text-ink shadow-e3 transition-[opacity,transform] duration-200 hover:scale-105 hover:text-brand [@media(hover:hover)]:grid";

  return (
    <div className="relative">
      <ul
        ref={track}
        aria-label={label}
        className={`rail ${gap} py-1 ${edge.end ? "" : "rail-fade"}`}
      >
        {children}
      </ul>
      <button
        type="button"
        aria-label={`Scroll ${label} back`}
        onClick={() => page(-1)}
        className={`${arrow} -left-3 ${edge.start ? "pointer-events-none opacity-0" : ""}`}
        tabIndex={edge.start ? -1 : 0}
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <button
        type="button"
        aria-label={`Scroll ${label} forward`}
        onClick={() => page(1)}
        className={`${arrow} -right-3 ${edge.end ? "pointer-events-none opacity-0" : ""}`}
        tabIndex={edge.end ? -1 : 0}
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
