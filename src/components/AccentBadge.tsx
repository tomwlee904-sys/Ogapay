interface AccentBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function AccentBadge({
  children,
  className = "",
}: AccentBadgeProps) {
  return (
    <span
      className={`inline-block bg-purple-100 text-purple-700 
        dark:bg-purple-900/30 dark:text-purple-300 
        rounded-full px-3 py-1 text-sm font-medium ${className}`}
    >
      {children}
    </span>
  );
}
