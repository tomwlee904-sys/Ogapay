interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon = 'package', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <i
        className={`ti ti-${icon}`}
        style={{ fontSize: 48, color: 'var(--text3)', marginBottom: 16, display: 'block' }}
      />
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
      {description && (
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text2)', maxWidth: 400, lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 20,
            height: 42,
            padding: '0 24px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
