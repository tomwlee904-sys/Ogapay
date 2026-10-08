import { ReactNode, useEffect, useRef, useState } from "react";

const TABLET_QUERY = "(min-width: 768px)";

/* Paged carousel: 3 / 2 / 1 cards by container width, or 1 on phones and 3 from
   tablet width when requested. A "01 / 03" counter
   and prev/next buttons underneath. Auto-advances unless hovered, focused or
   the user prefers reduced motion. Every page is full: the last one shows the
   last N items (7 jobs page as 1-3, 4-6, 5-7, not 1-3, 4-6, 7 alone). */
export default function Carousel<T>({ items, render, label, autoMs = 6500, layout = "auto" }: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  label: string;
  autoMs?: number;
  layout?: "auto" | "one-or-three";
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [perView, setPerView] = useState(() =>
    layout === "one-or-three" && typeof window !== "undefined"
      ? (window.matchMedia(TABLET_QUERY).matches ? 3 : 1)
      : 3
  );
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false); // user pressed pause
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (layout === "one-or-three") {
      const query = window.matchMedia(TABLET_QUERY);
      const update = () => setPerView(query.matches ? 3 : 1);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      // 3 across like wurk.fun once each card gets ~240px (the desktop panels are
      // ~880px inside, which the old 900px cut-off dropped to 2)
      setPerView(w >= 720 ? 3 : w >= 480 ? 2 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout]);

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
      className={`hv-car${layout === "one-or-three" ? " hv-car--one-or-three" : ""}`}
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
