import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "../../styles/helix.css";

/* The OgaPay ecosystem, laid out like wurk.fun's helix: a particle double helix
   pinned under the header (at most 800px tall, so tall screens and phones in
   "desktop site" mode keep it compact at the top), with the six stories, live
   "created a job" chips, then the discovery panels (jobs, store, blogs,
   communities) and two closing buttons passing over it as you scroll. The same
   scene runs on every screen size. */

const STEPS = [
  { tab: "Hire", icon: "ti-send", eyebrow: "Work on demand", title: "Hire in minutes",
    body: "Promote a launch, test your app, collect research or run a campaign. Post a paid task, run a contest, or pick one person for a project.",
    cta: "Create a job", href: "/create" },
  { tab: "Earn", icon: "ti-briefcase", eyebrow: "Earn on your terms", title: "Work that fits your day",
    body: "Follow, test, review, write or design. Pick paid tasks that match your time and skills, or sell your services in the OgaPay Store.",
    cta: "Explore paid jobs", href: "/tasks" },
  { tab: "Budget", icon: "ti-adjustments-horizontal", eyebrow: "Small budgets welcome", title: "Start with one task",
    body: "No subscription and no minimum campaign. Fund a single task in Naira or USDC, see the results, then scale when you need more done.",
    cta: "Create your first job", href: "/create" },
  { tab: "Agents", icon: "ti-robot", eyebrow: "For apps and AI agents", title: "Bring OgaPay into your app",
    body: "With an API key, your app or AI agent can list open jobs and read your jobs, submissions and balance. Posting and payouts stay in OgaPay, with escrow on every job.",
    cta: "Get an API key", href: "/developer" },
  { tab: "Trust", icon: "ti-shield-check", eyebrow: "Your job, your rules", title: "Choose who takes part",
    body: "Require KYC, a minimum OgaScore, a worker level or a verified X account. Funds stay in escrow until you approve the work.",
    cta: "See job requirements", href: "/faq" },
  { tab: "Community", icon: "ti-users", eyebrow: "Better together", title: "Work with your people",
    body: "Bring your community or build one from people you trust. Share paid tasks with members first and grow together.",
    cta: "Explore communities", href: "/communities" },
];

export type HelixPanel = { key: string; node: ReactNode };
type Job = { id?: string; createdAt?: string; poster?: { username?: string; avatarUrl?: string | null } | null };

// Timeline, in "units" of scroll: one per story, then the panels, then the finale
const PANEL_UNITS = 1.8;
const FINALE_UNITS = 1.4;
// Where each story's card sits across the stage (card centre, fraction of width)
const STORY_X = [0.42, 0.6, 0.5, 0.4, 0.64, 0.46];
const MINI_X = [0.2, 0.8, 0.26, 0.76, 0.22, 0.74];
const CHIP_AT = [[0.14, 0.2], [0.8, 0.3], [0.1, 0.62], [0.84, 0.6], [0.3, 0.84], [0.66, 0.12]];
const PANEL_X = [0, -0.05, 0.05, 0];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
const ago = (d?: string) => {
  if (!d) return "";
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export default function HelixStory({ panels, jobs }: { panels: HelixPanel[]; jobs: Job[] }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storyEls = useRef<(HTMLElement | null)[]>([]);
  const miniEls = useRef<(HTMLElement | null)[]>([]);
  const chipEls = useRef<(HTMLElement | null)[]>([]);
  const panelEls = useRef<(HTMLElement | null)[]>([]);
  const finaleEl = useRef<HTMLDivElement>(null);
  const tRef = useRef(0);
  const [tab, setTab] = useState(0);
  const tabRef = useRef(0);

  const T = STEPS.length + panels.length * PANEL_UNITS + FINALE_UNITS;
  const TRef = useRef(T); TRef.current = T;

  // Recent jobs as the live "created a job" chips
  const chips = jobs.filter((j) => j?.poster?.username).slice(0, 6);

  // Scroll: sizes, progress, and every layer's position
  useEffect(() => {
    const scene = sceneRef.current, stage = stageRef.current;
    if (!scene || !stage) return;
    let unit = 300, stageTop = 84, H = 800, W = 0, raf = 0;

    const measure = () => {
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
      stageTop = nav + 12;
      const bn = document.querySelector(".btb") as HTMLElement | null;
      const bnH = bn && getComputedStyle(bn).display !== "none" ? bn.getBoundingClientRect().height : 0;
      H = Math.round(Math.max(420, Math.min(800, window.innerHeight - stageTop - (bnH ? bnH + 12 : 24))));
      W = stage.clientWidth;
      unit = window.innerWidth < 769 ? 260 : 300;
      stage.style.top = `${stageTop}px`;
      stage.style.height = `${H}px`;
      scene.style.height = `${H + TRef.current * unit}px`;
    };

    const place = () => {
      raf = 0;
      const r = scene.getBoundingClientRect();
      const L = scene.offsetHeight - H;
      const t = clamp((stageTop - r.top) / Math.max(1, L)) * TRef.current;
      tRef.current = t;
      const narrow = W < 640;

      // Stories: one card over the helix at a time, neighbours as small ghosts
      STEPS.forEach((_, i) => {
        const d = t - (i + 0.5);
        const card = storyEls.current[i];
        if (card) {
          const dd = i === 0 ? Math.max(0, d) : d; // the first card is there when you arrive
          const o = clamp(1 - (Math.abs(dd) - 0.26) / 0.3);
          const cw = card.offsetWidth, ch = card.offsetHeight;
          const x = narrow ? W / 2 : W * STORY_X[i];
          // settles in the middle for a moment, then moves on
          const y = H * 0.46 - Math.sign(dd) * Math.max(0, Math.abs(dd) - 0.12) * H * 0.7;
          card.style.opacity = String(o);
          card.style.transform = `translate(${Math.round(x - cw / 2)}px, ${Math.round(y - ch / 2)}px) scale(${0.95 + 0.05 * o})`;
          card.style.visibility = o > 0.01 ? "visible" : "hidden";
          card.toggleAttribute("inert", o < 0.5);
        }
        const mini = miniEls.current[i];
        if (mini) {
          const a = Math.abs(d);
          const o = clamp((a - 0.45) / 0.25) * clamp((2 - a) / 0.6) * 0.9;
          const x = narrow ? (i % 2 ? W - mini.offsetWidth / 2 - 8 : mini.offsetWidth / 2 + 8) : W * MINI_X[i];
          const y = H * 0.46 - d * H * 0.4;
          mini.style.opacity = String(o);
          mini.style.visibility = o > 0.01 ? "visible" : "hidden";
          mini.style.transform = `translate(${Math.round(x - mini.offsetWidth / 2)}px, ${Math.round(y - mini.offsetHeight / 2)}px)`;
        }
      });

      // Live chips during the stories
      chipEls.current.forEach((el, k) => {
        if (!el) return;
        const d = t - (k * 0.95 + 0.7);
        const o = clamp(1 - Math.abs(d) / 1.1) * 0.95;
        const [fx, fy] = CHIP_AT[k % CHIP_AT.length];
        const x = narrow ? (k % 2 ? W - el.offsetWidth - 6 : 6) : W * fx - el.offsetWidth / 2;
        const y = H * fy - d * H * 0.22;
        el.style.opacity = String(o);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      });

      // Discovery panels, one after another, scaled to fit the stage
      panelEls.current.forEach((el, k) => {
        if (!el) return;
        const half = PANEL_UNITS / 2;
        const d = (t - (STEPS.length + k * PANEL_UNITS + half)) / half;
        const a = Math.abs(d), sg = Math.sign(d);
        const e = Math.max(0, a - 0.35) / 0.65; // 0 while it holds in the middle
        const o = clamp(1 - (a - 0.4) / 0.5); // fades as it moves; the next one comes in as this one leaves
        const pw = el.offsetWidth, ph = el.offsetHeight;
        const fit = Math.min(1, (H - 16) / Math.max(1, ph), (W - 8) / Math.max(1, pw));
        const room = Math.max(0, (W - pw * fit) / 2); // keep it on screen
        const x = W / 2 + (narrow ? 0 : clamp(PANEL_X[k % PANEL_X.length] * W, -room, room));
        const y = H / 2 - sg * e * H * 0.85;
        el.style.opacity = String(o);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
        el.style.transform = `translate(${Math.round(x - pw / 2)}px, ${Math.round(y - ph / 2)}px) scale(${fit * (0.94 + 0.06 * o)}) rotate(${(sg * e * 3).toFixed(2)}deg)`;
        el.toggleAttribute("inert", o < 0.6);
      });

      // Closing buttons
      if (finaleEl.current) {
        const o = smooth((t - (TRef.current - FINALE_UNITS)) / 0.5);
        finaleEl.current.style.opacity = String(o);
        finaleEl.current.style.visibility = o > 0.01 ? "visible" : "hidden";
        finaleEl.current.style.transform = `translate(-50%, ${Math.round((1 - o) * 30)}px)`;
        finaleEl.current.toggleAttribute("inert", o < 0.6);
      }

      const active = t < STEPS.length ? Math.min(STEPS.length - 1, Math.floor(t)) : -1;
      if (active !== tabRef.current) { tabRef.current = active; setTab(active); }
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(place); };
    const onResize = () => { measure(); place(); };
    measure(); place();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => { measure(); place(); });
    ro.observe(stage);
    panelEls.current.forEach((el) => el && ro.observe(el));
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [panels.length, chips.length]);

  // The helix
  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 769;
    const N = small ? 2800 : 5200;
    const DUST = small ? 90 : 180;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = false, ink = "#111", ts = tRef.current, spin = 0, last = 0;
    // b: across the ribbon (-1..1); k: 0 main coil, 1 second strand (fades in for the panels), 2 spray
    const ps = Array.from({ length: N }, () => {
      const roll = Math.random();
      return {
        s: Math.random(), k: roll < 0.62 ? 0 : roll < 0.9 ? 1 : 2,
        b: Math.random() * 2 - 1, j: gauss(), q: gauss(), v: 0.00004 + Math.random() * 0.00012,
        a: 0.3 + Math.random() * 0.7, r: 0.55 + Math.random() * 1.05,
      };
    });
    const dust = Array.from({ length: DUST }, () => ({ x: Math.random(), y: Math.random(), a: 0.06 + Math.random() * 0.22, r: 0.6 + Math.random() * 1.2 }));
    const marks = Array.from({ length: small ? 3 : 7 }, () => ({ x: Math.random(), y: Math.random(), a: Math.random() * Math.PI * 2, z: 7 + Math.random() * 9 }));

    const readInk = () => { ink = getComputedStyle(stage).getPropertyValue("--hv-ink").trim() || "#111"; };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Point on the shape: s along the axis, f the angle, b across the ribbon
    const geo = (m: number) => {
      const portrait = w < h * 0.9;
      return {
        cx: w * 0.5,
        y0: lerp(h * 0.04, h * 0.03, m), y1: lerp(h * 0.97, h * 0.97, m),
        R: lerp(portrait ? w * 0.46 : Math.min(w * 0.36, h * 0.62), Math.min(w * 0.17, h * 0.15), m),
        tilt: lerp(0.2, 0.06, m),
        turns: lerp(portrait ? 1.85 : 1.55, 1.3, m),
        band: lerp(Math.max(14, Math.min(w, h) * 0.075), Math.max(6, Math.min(w, h) * 0.02), m),
      };
    };

    const draw = (now: number) => {
      if (!w || !h) return;
      const dt = last ? Math.min(64, now - last) : 16; last = now;
      ts += (tRef.current - ts) * (reduce ? 1 : 0.1);
      if (!reduce) spin += dt * 0.00018;
      const S = STEPS.length;
      const m = smooth((ts - (S - 0.8)) / 1.8); // 0 coil, 1 double helix
      const g = geo(m);
      const phase = spin + ts * 0.85;
      const pt = (sAx: number, f: number, b: number): [number, number, number] => {
        const front = (Math.cos(f) + 1) / 2;
        const x = g.cx + g.R * Math.sin(f);
        const y = g.y0 + (g.y1 - g.y0) * sAx + g.R * g.tilt * Math.cos(f) + b * g.band * (0.35 + 0.65 * front);
        return [x, y, front];
      };

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = ink; ctx.strokeStyle = ink;
      // Fine parallel wires along the ribbon (and the second strand as it appears)
      const strands = m > 0.02 ? 2 : 1;
      for (let st = 0; st < strands; st++) {
        const off = st ? Math.PI : 0;
        const aS = st ? m : 1;
        for (let wi = -3; wi <= 3; wi++) {
          ctx.lineWidth = 0.6;
          // in runs of 8 segments, each with the brightness of its middle
          for (let c = 0; c < 160; c += 8) {
            const mid = (c + 4) / 160;
            const fm = mid * g.turns * Math.PI * 2 + phase + off;
            const edge = smooth(mid / 0.06) * smooth((1 - mid) / 0.06);
            ctx.globalAlpha = (0.02 + 0.09 * (Math.cos(fm) + 1) / 2) * edge * aS;
            ctx.beginPath();
            for (let i = c; i <= c + 8; i++) {
              const sAx = i / 160, f = sAx * g.turns * Math.PI * 2 + phase + off;
              const [x, y] = pt(sAx, f, wi / 3);
              if (i === c) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }
      // Particles: dense and dark on the near side of each loop, faint behind
      for (const p of ps) {
        if (!reduce) { p.s += p.v * dt * 0.06; if (p.s > 1) p.s -= 1; }
        const sAx = p.s;
        const f = sAx * g.turns * Math.PI * 2 + phase + (p.k === 1 ? Math.PI : 0);
        const [x0, y0, front] = pt(sAx, f, p.b);
        const scatter = p.k === 2 ? 0.55 : 0.1 + 0.18 * (1 - front);
        const x = x0 + p.j * g.band * scatter * 1.4, y = y0 + p.q * g.band * scatter;
        const edge = smooth(sAx / 0.06) * smooth((1 - sAx) / 0.06);
        const strand = p.k === 1 ? m : 1;
        const lit = p.k === 2 ? 0.18 : 0.08 + 0.92 * Math.pow(front, 1.6);
        ctx.globalAlpha = p.a * edge * strand * lit;
        if (ctx.globalAlpha < 0.015) continue;
        const r = p.r * (0.7 + 0.75 * front);
        ctx.fillRect(x, y, r, r);
      }
      // Dust and a few faint paper-plane marks around it
      for (const d of dust) { ctx.globalAlpha = d.a; ctx.fillRect(d.x * w, d.y * h, d.r, d.r); }
      ctx.lineWidth = 0.8;
      for (const mk of marks) {
        const x = mk.x * w, y = mk.y * h, a = mk.a + spin * 0.4;
        ctx.globalAlpha = 0.16; ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * mk.z, y + Math.sin(a) * mk.z);
        ctx.lineTo(x + Math.cos(a + 2.5) * mk.z * 0.7, y + Math.sin(a + 2.5) * mk.z * 0.7);
        ctx.lineTo(x + Math.cos(a - 2.5) * mk.z * 0.7, y + Math.sin(a - 2.5) * mk.z * 0.7);
        ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => { draw(now); raf = visible && !reduce ? requestAnimationFrame(loop) : 0; };
    readInk(); size(); draw(performance.now());
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf); raf = 0;
      if (visible) { readInk(); raf = requestAnimationFrame(loop); }
    });
    io.observe(sceneRef.current || canvas);
    const ro = new ResizeObserver(() => { size(); draw(performance.now()); });
    ro.observe(canvas);
    const mo = new MutationObserver(() => { readInk(); draw(performance.now()); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onScroll = () => { if (reduce) draw(performance.now()); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  const scrollToUnit = (u: number) => {
    const scene = sceneRef.current, stage = stageRef.current;
    if (!scene || !stage) return;
    const L = scene.offsetHeight - stage.offsetHeight;
    const top = window.scrollY + scene.getBoundingClientRect().top - (parseFloat(stage.style.top) || 84);
    window.scrollTo({ top: top + (u / T) * L, behavior: "smooth" });
  };
  const skip = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    window.scrollTo({ top: window.scrollY + scene.getBoundingClientRect().bottom - 80, behavior: "smooth" });
  };

  return (
    <section className="hx" id="ecosystem" aria-label="The OgaPay ecosystem">
      <header className="hx-lead">
        <p className="hx-sign hv-mono">The OgaPay ecosystem</p>
        <nav className="hx-nav" aria-label="Ecosystem stories">
          {STEPS.map((x, i) => (
            <button key={x.tab} type="button" className={`hx-tab${i === tab ? " on" : ""}`} aria-current={i === tab ? "step" : undefined} onClick={() => scrollToUnit(i + 0.5)}>
              <span className="n">0{i + 1}</span><span className="t">{x.tab}</span>
            </button>
          ))}
        </nav>
        <p className="hx-cue hv-mono">Scroll to explore <i className="ti ti-arrow-down" /></p>
        <button type="button" className="hx-skip hv-mono" onClick={skip}>Skip exploration <i className="ti ti-arrow-down-right" /></button>
      </header>

      <div className="hx-scene" ref={sceneRef}>
        <div className="hx-stage" ref={stageRef}>
          <canvas className="hx-canvas" ref={canvasRef} aria-hidden="true" />

          <div className="hx-layer" aria-hidden="true">
            {chips.map((j, k) => (
              <div key={j.id || k} className="hx-chip" ref={(el) => { chipEls.current[k] = el; }} title={`${j.poster?.username} created a job`}>
                <span className="hx-av">{j.poster?.avatarUrl ? <img src={j.poster.avatarUrl} alt="" loading="lazy" /> : (j.poster?.username || "?")[0].toUpperCase()}</span>
                <span><b>Created a job</b><small>{ago(j.createdAt)}</small></span>
              </div>
            ))}
            {STEPS.map((s, i) => (
              <div key={`m${i}`} className="hx-mini" ref={(el) => { miniEls.current[i] = el; }}>
                <i className={`ti ${s.icon}`} /><span><small>0{i + 1}</small>{s.title}</span>
              </div>
            ))}
          </div>

          <div className="hx-layer">
            {STEPS.map((s, i) => (
              <article key={s.tab} className="hx-story" ref={(el) => { storyEls.current[i] = el; }} aria-label={`${i + 1} of ${STEPS.length}: ${s.title}`}>
                <div className="hx-story-top">
                  <span className="hx-ic"><i className={`ti ${s.icon}`} /></span>
                  <span className="hv-mono">0{i + 1}<br />{s.eyebrow}</span>
                  <span className="hx-brand hv-mono">OgaPay</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <Link to={s.href} className="hv-btn hv-btn-dark">{s.cta} <i className="ti ti-arrow-up-right" /></Link>
              </article>
            ))}
          </div>

          <div className="hx-layer">
            {panels.map((p, k) => (
              <div key={p.key} className="hx-panel" ref={(el) => { panelEls.current[k] = el; }}>{p.node}</div>
            ))}
          </div>

          <div className="hx-finale" ref={finaleEl}>
            <Link to="/tasks" className="hx-orbit">Start earning <i className="ti ti-arrow-up-right" /></Link>
            <Link to="/create" className="hx-orbit dark">Create a job <i className="ti ti-arrow-up-right" /></Link>
          </div>
          <div className="hx-shadow" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
