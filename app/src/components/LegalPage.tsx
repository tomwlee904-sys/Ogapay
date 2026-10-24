import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from './Layout'
import '../styles/legal.css'

/* One template for Terms, Privacy, License and Copyright: the shared page frame
   and header, a switcher between the four pages, and (for long pages) a
   contents list that follows you: beside the text from tablet up, a sticky chip
   row on phone with the current section scrolled into view. */

export type LegalSection = { id: string; title: string }

const PAGES = [['Terms', '/terms'], ['Privacy', '/privacy'], ['License', '/license'], ['Copyright', '/copyright']]

export default function LegalPage({ title, updated, lead, sections, intro, children }: {
  title: string
  updated: string
  lead?: ReactNode
  /** Sections for the contents list; leave out for short pages */
  sections?: LegalSection[]
  /** Shown above the text, e.g. Terms' key points */
  intro?: ReactNode
  children: ReactNode
}) {
  const { pathname } = useLocation()
  const [active, setActive] = useState(sections?.[0]?.id || '')
  const tocRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sections?.length) return
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-120px 0px -60% 0px' })
    sections.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [sections])

  // Phone: keep the current section's chip in view (the row scrolls sideways)
  useEffect(() => {
    const toc = tocRef.current
    const chip = toc?.querySelector<HTMLElement>('button.on')
    if (!toc || !chip || toc.scrollWidth <= toc.clientWidth) return
    toc.scrollTo({ left: chip.offsetLeft - toc.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' })
  }, [active])

  const go = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const offset = (parseFloat(getComputedStyle(el).scrollMarginTop) || 80)
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' })
  }

  return (
    <Layout>
      <div className="ui-page">
        <header className="lg-head">
          <span className="ui-eyebrow"><i className="ti ti-scale" /> Legal</span>
          <h1 className="ui-title">{title}</h1>
          <p className="lg-date">Last updated {updated}</p>
          {lead && <p className="lg-lead">{lead}</p>}
          <nav className="lg-switch" aria-label="Legal pages">
            {PAGES.map(([label, to]) => (
              <Link key={to} to={to} className={pathname === to ? 'on' : ''} aria-current={pathname === to ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
        </header>

        <div className={`lg-body${sections?.length ? '' : ' no-toc'}`}>
          {!!sections?.length && (
            <nav className="lg-toc" aria-label="On this page" ref={tocRef}>
              <div className="lg-toc-label">On this page</div>
              {sections.map((s, i) => (
                <button key={s.id} type="button" className={active === s.id ? 'on' : ''} onClick={() => go(s.id)}>
                  <span>{String(i + 1).padStart(2, '0')}</span>{s.title}
                </button>
              ))}
            </nav>
          )}
          <article className="lg-text lg-prose">
            {intro}
            {children}
          </article>
        </div>
      </div>
    </Layout>
  )
}
