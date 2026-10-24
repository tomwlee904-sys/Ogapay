import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../Avatar'
import Money from '../Money'
import ItemCover, { itemCategoryLabel } from '../ItemCover'
import { spokenMoney } from '../../lib/money'
import '../../styles/store.css'

// Pieces shared by the store pages (Store, My orders, My store).

// Shop | My orders | My store: the same three tabs on every store page, so
// buyers and sellers can move between them without the header buttons
export function StoreTabs({ active }: { active: 'shop' | 'orders' | 'mine' }) {
  const tabs: [typeof active, string, string, string][] = [
    ['shop', '/store', 'Shop', 'ti-building-store'],
    ['orders', '/store/orders', 'My orders', 'ti-receipt'],
    ['mine', '/my-store', 'My store', 'ti-user'],
  ]
  return (
    <nav className="st-tabs" aria-label="Store">
      {tabs.map(([key, to, label, icon]) => (
        <Link key={key} to={to} className={`st-tab${active === key ? ' on' : ''}`} aria-current={active === key ? 'page' : undefined}>
          <i className={`ti ${icon}`} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  )
}

// A "⋯" menu for the less common actions on an order or product. Actions that
// move money or can't be undone are marked danger: red, last, after a line.
export type MenuItem = { label: string; icon?: string; onSelect?: () => void; to?: string; danger?: boolean; disabled?: boolean }
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('touchstart', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  if (!items.length) return null
  const sorted = [...items.filter((i) => !i.danger), ...items.filter((i) => i.danger)]
  return (
    <div className="st-menu" ref={ref}>
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon st-menu-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <i className="ti ti-dots" aria-hidden="true" />
      </button>
      {open && (
        <div className="st-menu-list" role="menu">
          {sorted.map((it) => it.to ? (
            <Link key={it.label} role="menuitem" to={it.to} className="st-menu-item" onClick={() => setOpen(false)}>
              {it.icon && <i className={`ti ${it.icon}`} aria-hidden="true" />}{it.label}
            </Link>
          ) : (
            <button key={it.label} type="button" role="menuitem" className={`st-menu-item${it.danger ? ' danger' : ''}`} disabled={it.disabled}
              onClick={() => { setOpen(false); it.onSelect?.() }}>
              {it.icon && <i className={`ti ${it.icon}`} aria-hidden="true" />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Compact product card for the store grid: picture, two-line title, seller and
// rating on one line, the price in bold. Badges only for exceptions.
export function StoreCard({ item }: { item: any }) {
  const price = Number(item.price ?? 0)
  const cur = item.currency || 'NGN'
  const seller = item.seller || 'OgaPay'
  const stock = item.stock == null ? null : Number(item.stock)
  const soldOut = stock !== null && stock <= 0
  const badge = soldOut ? 'Sold out' : stock !== null && stock <= 3 ? `${stock} left` : item.official ? 'From OgaPay' : ''
  const rated = Number(item.reviewsCount) > 0
  return (
    <Link to={`/store/${item.id}`} className="stc"
      aria-label={`${item.title} by ${seller}, ${item.priceOnRequest ? 'price on request' : spokenMoney(price, cur)}${soldOut ? ', sold out' : ''}`}>
      <div className="stc-media">
        <ItemCover src={item.image} category={item.category} title={item.title} width={320} />
        {badge && <span className={`stc-badge${soldOut ? ' off' : ''}`}>{badge}</span>}
      </div>
      <div className="stc-body">
        <span className="stc-type">{itemCategoryLabel(item.category, item.title)}</span>
        <h3 className="stc-title">{item.title}</h3>
        <span className="stc-by">
          <Avatar src={item.sellerAvatar} name={seller} size={20} />
          <b>{seller}</b>
          {rated
            ? <span className="stc-rate"><i className="ti ti-star" aria-hidden="true" />{Number(item.rating).toFixed(1)}<em>({item.reviewsCount})</em></span>
            : !item.official && <span className="stc-new">New</span>}
        </span>
        <span className="stc-price">
          {item.priceOnRequest ? <b>Price on request</b> : <Money amount={price} currency={cur} size={18} />}
        </span>
      </div>
    </Link>
  )
}
