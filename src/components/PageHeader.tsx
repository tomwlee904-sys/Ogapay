interface PageHeaderProps {
  title: string;
  accentWord: string;
  subtitle: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function PageHeader({
  title,
  accentWord,
  subtitle,
  breadcrumb,
}: PageHeaderProps) {
  // Split title on the accent word to highlight it
  const parts = title.split(accentWord);

  return (
    <section className="bg-[#f0f0ff] dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-[#2a2a3e]">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20">
        {/* Breadcrumb */}
        {breadcrumb && (
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300 dark:text-gray-600">→</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[#0a0a0a] dark:text-white font-medium">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-[#0a0a0a] dark:text-white">
          {parts.length > 1 ? (
            <>
              {parts[0]}
              <span className="text-[#8b5cf6]">{accentWord}</span>
              {parts.slice(1).join("")}
            </>
          ) : (
            title
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
