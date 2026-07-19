import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const storyImg = (file: string) => `/assets/story/${file}?v=20260719-real-story-assets`;

const features = [
  {
    title: "One Platform",
    subtitle: "OgaPay brings together workers, task owners, creators, and communities in one marketplace. From simple social tasks to full hiring campaigns, everyone gets access to the same earning and growth opportunities.",
    textFirst: true,
    img: storyImg("005_1000488517.png"),
  },
  {
    title: "Freedom & Flexibility",
    subtitle: "Pick tasks that fit your time, skill, and goals. Complete work, submit proof, and get paid into your OgaPay wallet without fixed hours, gatekeepers, or complicated setup.",
    textFirst: false,
    img: storyImg("000_1000488580.png"),
  },
  {
    title: "Hire Workers",
    subtitle: "Post tasks, set your budget, and get results from real people fast. Whether it's social engagement, poster jobs, research, community growth, or testing, OgaPay helps you hire and pay only for approved work.",
    textFirst: true,
    img: storyImg("002_1000488538.png"),
  },
  {
    title: "Communities",
    subtitle: "Create trusted groups, route paid tasks to selected members, onboard ambassadors, and reward participation at scale. OgaPay communities help you grow, organize, and earn together.",
    textFirst: false,
    img: storyImg("001_1000488545.png"),
  },
  {
    title: "AI-Powered",
    subtitle: "OgaPay includes built-in AI assistance for task creation, task completion, guidance, summaries, and workflow support. It helps task owners move faster and helps workers complete jobs with better accuracy.",
    textFirst: true,
    img: storyImg("003_1000488531.svg"),
  },
  {
    title: "Secure Escrow",
    subtitle: "Funds can be secured before work starts and released after approved delivery, helping protect both task owners and workers. OgaPay's escrow flow makes payments clearer, safer, and easier to trust.",
    textFirst: false,
    img: storyImg("004_1000488525.png"),
  },
];

const darkImgs: Record<string, string> = {
  "One Platform": storyImg("005_1000488517_dark.png"),
  "Freedom & Flexibility": storyImg("000_1000488580_dark.png"),
  "Hire Workers": storyImg("002_1000488538_dark.png"),
  "AI-Powered": storyImg("003_1000488531_dark.png"),
  "Communities": storyImg("001_1000488545_dark.png"),
  "Secure Escrow": storyImg("004_1000488525_dark.png"),
};

function StoryCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  const textOnLeft = feature.textFirst;
  const imgOnLeft = !feature.textFirst;

  const textSlide = isMobile
    ? "translate(0, 30px)"
    : textOnLeft
      ? "translate(-40px, 30px)"
      : "translate(40px, 30px)";

  const imgSlide = isMobile
    ? "translate(0, 30px)"
    : imgOnLeft
      ? "translate(-40px, 30px)"
      : "translate(40px, 30px)";

  const transitionCSS = "opacity 0.8s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";

  const textBlockStyle: React.CSSProperties = {
    flex: "1 1 50%",
    background: "var(--card, #ffffff)",
    borderRadius: 16,
    border: "1px solid var(--border)",
    boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.03)",
    padding: "40px 44px",
    opacity: visible ? 1 : 0,
    transform: visible ? "translate(0, 0)" : textSlide,
    transition: transitionCSS,
    transitionDelay: visible ? "0ms" : "0ms",
  };

  const imgBlockStyle: React.CSSProperties = {
    flex: "1 1 50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    opacity: visible ? 1 : 0,
    transform: visible ? "translate(0, 0)" : imgSlide,
    transition: transitionCSS,
    transitionDelay: visible ? "80ms" : "0ms",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      ref={ref}
      style={{
        marginBottom: index < features.length - 1 ? -24 : 0,
        position: "relative",
        zIndex: features.length - index,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : feature.textFirst ? "row" : "row-reverse",
          alignItems: "center",
          gap: isMobile ? 16 : 0,
        }}
      >
        {/* Text block */}
        <div className="fs-text-block" style={textBlockStyle}>
          <h3
            style={{
              margin: "0 0 10px",
              fontFamily: "DM Sans,system-ui,sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text)",
              lineHeight: 1.2,
            }}
          >
            {feature.title}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.65,
              color: "var(--text2)",
            }}
          >
            {feature.subtitle}
          </p>
        </div>

        {/* Image block */}
        <div className="fs-img-block" style={imgBlockStyle}>
          <img
            src={isDark && darkImgs[feature.title] ? darkImgs[feature.title] : feature.img}
            alt={feature.title}
            loading="lazy"
            className="fs-img"
            style={{
              width: "90%",
              height: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function FeatureStorySection() {
  return (
    <section style={{ padding: "72px 0", background: "var(--bg)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 className="section-title fs-title">
            Everything you need in one place
          </h2>
          <p
            className="section-sub fs-subtitle"
            style={{ maxWidth: 600, fontSize: 15, marginTop: 8 }}
          >
            See how OgaPay brings together workers, hiring, communities, and smart
            tools in one marketplace.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {features.map((f, i) => (
            <StoryCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        /* ─── Feature Story Dark Mode ─── */
        [data-theme="dark"] .fs-text-block {
          background: #000000 !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.4) !important;
        }

        [data-theme="dark"] .fs-img-block {
          background: transparent !important;
        }

        /* Image treatment — light mode */
        .fs-img {
          opacity: 0.85;
        }

        /* Image treatment — dark mode */
        [data-theme="dark"] .fs-img {
          opacity: 0.85;
        }

        /* Section heading dark mode */
        [data-theme="dark"] .fs-title {
          color: #ffffff !important;
        }

        [data-theme="dark"] .fs-subtitle {
          color: rgba(255, 255, 255, 0.55) !important;
        }
      `}</style>
    </section>
  );
}
