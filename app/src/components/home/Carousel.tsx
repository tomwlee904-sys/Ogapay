import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

/* Paged carousel: N cards per view (3, or 1 on phones), a "01 / 03" counter
   and prev/next buttons underneath. Auto-advances unless hovered, focused or
   the user prefers reduced motion. Every page is full: the last one shows the
   last N items (7 jobs page as 1-3, 4-6, 5-7, not 1-3, 4-6, 7 alone). */
// 3 across on tablets and up, one at a time on phones (like wurk.fun). A phone is
// a window under 640px wide; the carousel also needs 480px for three cards.
const PHONE_MAX = 640;
const perViewFor = (carouselW: number) => (window.innerWidth >= PHONE_MAX && carouselW >= 480 ? 3 : 1);

export default function Carousel<T>({ items, render, label, autoMs = 6500 }: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  label: string;
  autoMs?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  // Start from the window width, so a phone never shows three squeezed cards
  // while waiting for the first measurement
  const [perView, setPerView] = useState(() => (typeof window !== "undefined" && window.innerWidth < PHONE_MAX ? 1 : 3));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false); // user pressed pause
  const touchX = useRef<number | null>(null);

  // Measure before the first paint, then follow size changes. The window resize
  // listener backs up the observer, which some phones deliver late. (Narrow
  // tablet cards switch to a compact layout in home-cards.css.)
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => setPerView(perViewFor(el.offsetWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const pages = Math.max(1, Math.ceil(items.length / perView));
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [pages, page]);

  useEffect(() => {
    if (paused || stopped || pages < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setPage((p) => (p + 1) % pages), autoMs);
    return () => window.clearInterval(id);
  }, [paused, stopped, pages, autoMs]);

  const go = (p: number) => setPage(((p % pages) + pages) % pages);
  // First item on this page; the last page backs up so it's never half empty
  const start = Math.max(0, Math.min(page * perView, items.length - perView));
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="hv-car"
      ref={wrap}
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="hv-car-view">
        <div
          className="hv-car-track"
          style={{ transform: `translateX(calc(${-start} * (100% + var(--hv-car-gap)) / ${perView}))`, ["--hv-per" as any]: perView }}
        >
          {items.map((it, i) => (
            <div className="hv-car-slide" key={i} aria-hidden={i < start || i >= start + perView}>
              {render(it, i)}
            </div>
          ))}
        </div>
      </div>
      {pages > 1 && (
        <div className="hv-car-nav">
          <span className="hv-mono" aria-live="polite">{pad(page + 1)} / {pad(pages)}</span>
          <div className="hv-car-btns">
            <button onClick={() => go(page - 1)} aria-label="Previous slide"><i className="ti ti-arrow-left" /></button>
            <button onClick={() => setStopped(s => !s)} aria-label={stopped ? "Play slides" : "Pause slides"} aria-pressed={stopped}>
              <i className={`ti ti-player-${stopped ? "play" : "pause"}`} />
            </button>
            <button onClick={() => go(page + 1)} aria-label="Next slide"><i className="ti ti-arrow-right" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
