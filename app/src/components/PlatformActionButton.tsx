// ChevronDown icon as inline SVG

interface PlatformActionButtonProps {
  icon: React.ReactNode;
  label: string;
  actionCount?: number;
  hasDropdown?: boolean;
  onClick?: () => void;
}

export function PlatformActionButton({
  icon,
  label,
  actionCount,
  hasDropdown = true,
  onClick,
}: PlatformActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "12px 16px", borderRadius: 12,
        border: "1px solid var(--border-color, var(--border))",
        background: "var(--surface-bg, var(--card))",
        cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color, var(--border))"; }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 8,
          background: "var(--icon-bg, rgba(var(--accent-rgb), 0.08))",
          color: "var(--icon-color, var(--accent))", flexShrink: 0,
        }}>
          {icon}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary, var(--text))" }}>
            {label}
          </span>
          {actionCount !== undefined && (
            <span style={{ fontSize: 13, color: "var(--text-muted, var(--text2))" }}>
              {actionCount}
            </span>
          )}
        </span>
      </span>
      {hasDropdown && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted, var(--text2))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
      )}
    </button>
  );
}
