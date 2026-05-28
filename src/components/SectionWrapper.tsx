interface SectionWrapperProps {
  children: React.ReactNode;
  bg?: "white" | "lavender";
  className?: string;
}

export default function SectionWrapper({
  children,
  bg = "white",
  className = "",
}: SectionWrapperProps) {
  const bgClass =
    bg === "lavender"
      ? "bg-[#f0f0ff] dark:bg-[#0d0d1a]"
      : "bg-white dark:bg-[#0a0a0a]";

  return (
    <section className={`${bgClass} ${className}`}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20">
        {children}
      </div>
    </section>
  );
}
