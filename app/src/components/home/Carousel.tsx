import { ReactNode, useEffect, useRef, useState } from "react";

/* Paged carousel: N cards per view (3 / 2 / 1 by width), a "01 / 03" counter
   and prev/next buttons underneath. Auto-advances unless hovered, focused or
   the user prefers reduced motion. */
export default function Carousel<T>({ items, render, label, autoMs = 6500 }: {
  items: T[];
  render: (item: T, i: number) => ReactNode;
  label: string;
  autoMs?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [perView, setPerView] = useState(3);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setPerView(w >= 900 ? 3 : w >= 560 ? 2 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pages = Math.max(1, Math.ceil(items.length / perView));
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [pages, page]);

  useEffect(() => {
    if (paused || pages < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setPage((p) => (p + 1) % pages), autoMs);
    return () => window.clearInterval(id);
  }, [paused, pages, autoMs]);

  const go = (p: number) => setPage(((p % pages) + pages) % pages);
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
          style={{ transform: `translateX(calc(${-page} * (100% + var(--hv-car-gap))))`, ["--hv-per" as any]: perView }}
        >
          {items.map((it, i) => (
            <div className="hv-car-slide" key={i} aria-hidden={Math.floor(i / perView) !== page}>
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
            <button onClick={() => go(page + 1)} aria-label="Next slide"><i className="ti ti-arrow-right" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
