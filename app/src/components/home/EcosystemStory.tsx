import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* Six chapters, scrolled through while the canvas stays pinned. On phones the
   pinned view is hidden by CSS and the same chapters render as a plain list. */
const STEPS = [
  { tab: "Hire", eyebrow: "Work on demand", title: "Hire in minutes",
    body: "Promote a launch, test your app, collect research or run a campaign. Post a paid task, run a contest, or pick one person for a project.",
    cta: "Create a job", href: "/create", chip: "New job posted" },
  { tab: "Earn", eyebrow: "Earn on your terms", title: "Work that fits your day",
    body: "Follow, test, review, write or design. Pick paid tasks that match your time and skills, or sell your services in the OgaPay Store.",
    cta: "Explore paid jobs", href: "/tasks", chip: "Reward released" },
  { tab: "Budget", eyebrow: "Small budgets welcome", title: "Start with one task",
    body: "No subscription and no minimum campaign. Fund a single task in Naira or USDC, see the results, then scale when you need more done.",
    cta: "Create your first job", href: "/create", chip: "Escrow funded" },
  { tab: "Agents", eyebrow: "For apps and AI agents", title: "Put people behind your API",
    body: "Let your app or AI agent post paid tasks, collect results and pay through the OgaPay API. Human judgment, exactly when your product needs it.",
    cta: "Build with OgaPay", href: "/developer", chip: "Task created via API" },
  { tab: "Trust", eyebrow: "Your job, your rules", title: "Choose who takes part",
    body: "Require KYC, a minimum OgaScore, a worker level or a verified X account. Funds stay in escrow until you approve the work.",
    cta: "See job requirements", href: "/faq", chip: "KYC verified" },
  { tab: "Community", eyebrow: "Better together", title: "Work with your people",
    body: "Bring your community or build one from people you trust. Share paid tasks with members first and grow together.",
    cta: "Explore communities", href: "/communities", chip: "Joined a community" },
];

type Pt = [number, number];
type Shape = { square: boolean; curves: ((t: number) => Pt)[] };

const bez = (a: Pt, b: Pt, c: Pt, d: Pt) => (t: number): Pt => {
  const m = 1 - t;
  return [
    m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0],
    m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1],
  ];
};
const circle = (cx: number, cy: number, r: number, turns = 1, r2 = r) => (t: number): Pt => {
  const a = t * Math.PI * 2 * turns;
  const rr = r + (r2 - r) * t;
  return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
};

// One shape per chapter, in a unit box. "square" shapes keep their aspect.
const SHAPES: Shape[] = [
  { square: false, curves: [
    bez([0.05, 0.8], [0.35, 0.05], [0.62, 0.95], [0.98, 0.35]),
    bez([0.02, 0.3], [0.4, 1.0], [0.62, 0.05], [0.95, 0.62]),
    bez([0.1, 0.95], [0.45, 0.55], [0.7, 0.6], [1.0, 0.8]),
  ] },
  { square: true, curves: [circle(0.5, 0.5, 0.04, 2.3, 0.46), circle(0.5, 0.5, 0.1, 1.6, 0.34), circle(0.5, 0.5, 0.48, 1)] },
  { square: false, curves: [
    (t) => [t, 0.85 - 0.6 * t - 0.07 * Math.sin(t * 14)],
    (t) => [t, 0.92 - 0.45 * t - 0.05 * Math.sin(t * 9 + 1)],
    (t) => [t, 0.95 - 0.28 * t],
  ] },
  { square: true, curves: [
    circle(0.5, 0.5, 0.42, 1),
    (t) => [0.08 + 0.84 * t, 0.5 + 0.18 * Math.sin(t * Math.PI * 2)],
    (t) => [0.5 + 0.18 * Math.sin(t * Math.PI * 2), 0.08 + 0.84 * t],
  ] },
  { square: true, curves: [
    (t) => { // shield outline
      const a = t * 2;
      if (a < 1) { const u = a; return [0.15 + 0.7 * u, 0.12 + 0.05 * Math.sin(u * Math.PI)]; }
      const u = a - 1;
      const side = u < 0.5 ? 1 : -1;
      const k = u < 0.5 ? u * 2 : (1 - u) * 2;
      return [0.5 + side * 0.35 * Math.cos((1 - k) * Math.PI / 2) * (0.35 + 0.65 * k), 0.12 + 0.8 * (1 - k * k * 0.6) * (1 - k * 0.1)];
    },
    circle(0.5, 0.45, 0.18, 1),
    (t) => [0.38 + 0.24 * t, 0.46 + (t < 0.4 ? t * 0.25 : 0.1 - (t - 0.4) * 0.3)],
  ] },
  { square: false, curves: [circle(0.25, 0.5, 0.16, 1), circle(0.55, 0.38, 0.2, 1), circle(0.82, 0.6, 0.14, 1)] },
];

const CHIP_POS = [
  { right: "12%", top: "30%" }, { right: "18%", top: "58%" }, { right: "9%", top: "24%" },
  { right: "14%", top: "40%" }, { right: "22%", top: "28%" }, { right: "8%", top: "52%" },
];

type P = { c: number; t: number; o: number; s: number; a: number; r: number; x: number; y: number };

function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

export default function EcosystemStory() {
  const secRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRef = useRef(0);
  const [step, setStep] = useState(0);

  // Scroll position → active chapter
  useEffect(() => {
    const onScroll = () => {
      const el = secRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      if (span <= 0) return;
      const p = Math.min(0.999, Math.max(0, -rect.top / span));
      const i = Math.floor(p * STEPS.length);
      if (i !== stepRef.current) { stepRef.current = i; setStep(i); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    const sec = secRef.current;
    if (!canvas || !sec) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = window.innerWidth < 1100 ? 1100 : 1700;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = false;
    let ink = "#111";

    const readInk = () => { ink = getComputedStyle(sec).getPropertyValue("--hv-ink").trim() || "#111"; };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const map = (shape: Shape, pt: Pt): Pt => {
      if (shape.square) {
        const S = Math.min(w * 0.55, h * 0.78);
        return [w * 0.6 + (pt[0] - 0.5) * S, h * 0.56 + (pt[1] - 0.5) * S];
      }
      return [w * (0.12 + 0.82 * pt[0]), h * (0.22 + 0.66 * pt[1])];
    };

    const ps: P[] = Array.from({ length: N }, () => ({
      c: Math.floor(Math.random() * 3), t: Math.random(), o: gauss(), s: 0.0004 + Math.random() * 0.0012,
      a: 0.12 + Math.random() * 0.7, r: 0.6 + Math.random() * 0.9, x: 0, y: 0,
    }));

    const target = (p: P, shape: Shape): Pt => {
      const f = shape.curves[p.c];
      const a = map(shape, f(p.t));
      const b = map(shape, f(Math.min(1, p.t + 0.002)));
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      const spread = (p.c === 0 ? 14 : 9) * (0.6 + 0.4 * Math.sin(p.t * Math.PI * 3 + p.c));
      return [a[0] + nx * p.o * spread, a[1] + ny * p.o * spread];
    };

    const init = () => {
      const shape = SHAPES[stepRef.current];
      for (const p of ps) { const [x, y] = target(p, shape); p.x = x; p.y = y; }
    };

    const frame = () => {
      const shape = SHAPES[stepRef.current];
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink;
      for (const p of ps) {
        if (!reduce) { p.t += p.s; if (p.t > 1) p.t -= 1; }
        const [tx, ty] = target(p, shape);
        p.x += (tx - p.x) * 0.055; p.y += (ty - p.y) * 0.055;
        ctx.globalAlpha = p.a * (0.35 + 0.65 * Math.sin(p.t * Math.PI));
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
      ctx.globalAlpha = 1;
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };

    readInk(); size(); init(); frame();
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) { readInk(); raf = requestAnimationFrame(frame); }
    });
    io.observe(sec);
    const ro = new ResizeObserver(() => { size(); init(); frame(); });
    ro.observe(canvas);
    const mo = new MutationObserver(() => { readInk(); if (reduce) frame(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    let lastStep = stepRef.current;
    const stepWatch = window.setInterval(() => { if (reduce && stepRef.current !== lastStep) { lastStep = stepRef.current; init(); frame(); } }, 200);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); window.clearInterval(stepWatch); };
  }, []);

  const jumpTo = (i: number) => {
    const el = secRef.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    const top = window.scrollY + el.getBoundingClientRect().top;
    window.scrollTo({ top: top + span * ((i + 0.5) / STEPS.length), behavior: "smooth" });
  };
  const skip = () => {
    const el = secRef.current;
    if (!el) return;
    window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().bottom - 60, behavior: "smooth" });
  };

  const s = STEPS[step];
  return (
    <section ref={secRef} id="ecosystem" className="hv-eco" style={{ height: `${STEPS.length * 90 + 100}vh` }} aria-label="The OgaPay ecosystem">
      <div className="hv-eco-sticky">
        <canvas ref={canvasRef} aria-hidden="true" />
        <div className="hv-eco-top">
          <span className="hv-mono">The OgaPay ecosystem</span>
          <div className="hv-tabs" role="tablist">
            {STEPS.map((x, i) => (
              <button key={x.tab} role="tab" aria-selected={i === step} className={`hv-tab${i === step ? " on" : ""}`} onClick={() => jumpTo(i)}>
                <span className="n">0{i + 1}</span>{x.tab}
              </button>
            ))}
          </div>
          <span className="hv-mono" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            Scroll to explore <i className="ti ti-arrow-down" />
          </span>
          <button className="hv-eco-skip hv-mono" onClick={skip}>Skip exploration <i className="ti ti-arrow-bar-to-down" /></button>
        </div>

        <div className="hv-eco-chip hv-fade" key={`chip-${step}`} style={CHIP_POS[step]}>
          <i className="ti ti-circle-check" style={{ color: "var(--green)" }} /> {s.chip}
        </div>

        <div className="hv-eco-big" aria-hidden="true">0{step + 1}</div>

        <div className="hv-eco-card hv-fade" key={`card-${step}`}>
          <span className="hv-mono">0{step + 1} · {s.eyebrow}</span>
          <h3 className="hv-h3">{s.title}</h3>
          <p>{s.body}</p>
          <Link to={s.href} className="hv-btn hv-btn-dark">{s.cta} <i className="ti ti-arrow-right" /></Link>
        </div>
      </div>

      <div className="hv-inner hv-eco-list">
        <div className="hv-center" style={{ marginBottom: 8 }}><span className="hv-mono">The OgaPay ecosystem</span></div>
        {STEPS.map((x, i) => (
          <div className="hv-eco-item" key={x.tab}>
            <span className="hv-mono">0{i + 1} · {x.eyebrow}</span>
            <h3 className="hv-h3">{x.title}</h3>
            <p>{x.body}</p>
            <Link to={x.href} className="hv-btn hv-btn-ghost" style={{ height: 40, fontSize: 13 }}>{x.cta} <i className="ti ti-arrow-right" /></Link>
          </div>
        ))}
      </div>
    </section>
  );
}
