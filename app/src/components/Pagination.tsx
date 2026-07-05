interface PaginationProps {
  page: number
  totalPages: number
  firstItem: number
  lastItem: number
  totalItems: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  firstItem,
  lastItem,
  totalItems,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Generate visible page numbers (max 7)
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 0',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
        {totalItems > 0 ? `${firstItem}–${lastItem} of ${totalItems}` : 'No results'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          style={{
            height: 34,
            minWidth: 34,
            padding: '0 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--card)',
            color: page <= 1 ? 'var(--text3)' : 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          ‹ Prev
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              style={{
                width: 34,
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text3)',
              }}
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                height: 34,
                minWidth: 34,
                padding: '0 8px',
                border: p === page ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 8,
                background: p === page ? 'var(--accent)' : 'var(--card)',
                color: p === page ? '#fff' : 'var(--text)',
                fontSize: 13,
                fontWeight: p === page ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all .15s',
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            height: 34,
            minWidth: 34,
            padding: '0 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'var(--card)',
            color: page >= totalPages ? 'var(--text3)' : 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
