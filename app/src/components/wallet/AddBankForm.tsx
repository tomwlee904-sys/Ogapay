import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import type { Bank } from '../../lib/wallet'

type BankOption = { code: string; name: string }

// The bank list rarely changes: fetch it once per visit
let banksPromise: Promise<BankOption[]> | null = null
const loadBanks = () => {
  banksPromise ||= apiRequest<any[]>('/wallet/banks/list')
    .then((list) => (Array.isArray(list) ? list : [])
      .map((b) => ({ code: String(b.code), name: String(b.name).trim() }))
      .filter((b) => b.code && b.name)
      .sort((a, b) => a.name.localeCompare(b.name)))
    .catch((e) => { banksPromise = null; throw e })
  return banksPromise
}
// Shown first before anything is typed
const POPULAR = /^(access bank|guaranty trust|gtbank|zenith|first bank|united bank for africa|opay|moniepoint|kuda|palmpay|wema|fidelity)/i

// Add a bank account: pick the bank, type the 10-digit number, and the account
// name comes back from the bank before it can be saved.
// With `action`, the button runs it instead of saving the account (Settings →
// Verification uses it to verify with the account).
type Action = { label: string; busyLabel: string; run: (bank: BankOption, accountNumber: string, accountName: string) => Promise<void> }
export default function AddBankForm({ onSaved, onCancel, makeDefault, action, note }: { onSaved?: (b: Bank) => void; onCancel?: () => void; makeDefault?: boolean; action?: Action; note?: string }) {
  const listId = useId()
  const [banks, setBanks] = useState<BankOption[] | null>(null)
  const [banksErr, setBanksErr] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [bank, setBank] = useState<BankOption | null>(null)
  const [acct, setAcct] = useState('')
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const acctRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBanks().then(setBanks).catch((e) => setBanksErr(e?.message || "Couldn't load the bank list"))
  }, [])

  const matches = useMemo(() => {
    if (!banks) return []
    const q = query.trim().toLowerCase()
    if (!q) return [...banks.filter((b) => POPULAR.test(b.name)), ...banks.filter((b) => !POPULAR.test(b.name))].slice(0, 60)
    return banks.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 60)
  }, [banks, query])

  const choose = (b: BankOption) => {
    setBank(b); setQuery(b.name); setOpen(false); setName(''); setError('')
    setTimeout(() => acctRef.current?.focus(), 0)
  }

  // Look the account up as soon as there are 10 digits
  useEffect(() => {
    setName(''); setError('')
    if (!bank || acct.length !== 10) return
    let live = true
    setChecking(true)
    const t = setTimeout(() => {
      apiRequest<{ account_name?: string }>('/wallet/banks/verify', { method: 'POST', body: JSON.stringify({ accountNumber: acct, bankCode: bank.code }) })
        .then((d) => { if (!live) return; if (d?.account_name) setName(d.account_name); else setError("We couldn't find this account. Check the number and the bank.") })
        .catch((e) => { if (live) setError(/too many/i.test(e?.message || '') ? e.message : "We couldn't find this account. Check the number and the bank.") })
        .finally(() => { if (live) setChecking(false) })
    }, 250)
    return () => { live = false; clearTimeout(t); setChecking(false) }
  }, [bank, acct])

  async function save() {
    if (!bank || !name) return
    setSaving(true); setError('')
    if (action) {
      try { await action.run(bank, acct, name) } catch (e: any) { setError(e?.message || 'Something went wrong. Try again.') }
      setSaving(false)
      return
    }
    try {
      const saved = await apiRequest<Bank>('/wallet/banks', { method: 'POST', body: JSON.stringify({ bankCode: bank.code, bankName: bank.name, accountNumber: acct, accountName: name, setDefault: !!makeDefault }) })
      onSaved?.(saved)
    } catch (e: any) {
      setError(e?.message || "Couldn't save this account. Try again.")
    }
    setSaving(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && matches[active]) { e.preventDefault(); choose(matches[active]) }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
  }

  return (
    <div>
      <div className="wl-field">
        <label className="ui-label" htmlFor={listId + '-q'}>Bank</label>
        <div className="wl-combo">
          <input
            id={listId + '-q'} className="ui-input" placeholder={banks ? 'Search your bank' : banksErr ? 'Bank list unavailable' : 'Loading banks…'}
            role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off" disabled={!banks}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setBank(null); setOpen(true); setActive(0) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKey}
          />
          {open && banks && (
            <ul className="wl-combo-list" id={listId} role="listbox">
              {matches.length ? matches.map((b, i) => (
                <li key={b.code + b.name} role="option" aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(b)} onMouseEnter={() => setActive(i)}>{b.name}</li>
              )) : <li className="none">No bank matches “{query}”</li>}
            </ul>
          )}
        </div>
        {banksErr && <div className="wl-hint err">{banksErr}. <button type="button" className="wl-link" onClick={() => { setBanksErr(''); loadBanks().then(setBanks).catch((e) => setBanksErr(e?.message || "Couldn't load the bank list")) }}>Try again</button></div>}
      </div>

      <div className="wl-field">
        <label className="ui-label" htmlFor={listId + '-n'}>Account number</label>
        <input
          ref={acctRef} id={listId + '-n'} className="ui-input" inputMode="numeric" autoComplete="off" placeholder="10 digits" maxLength={10}
          value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, '').slice(0, 10))}
        />
      </div>

      {checking ? <div className="wl-resolving"><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Checking the account…</div>
        : name ? <div className="wl-resolved" aria-live="polite"><i className="ti ti-circle-check" /> {name}</div>
        : null}
      {error && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
      {name && <p className="wl-note" style={{ margin: '-4px 0 14px' }}>{note || 'Only add accounts in your own name.'}</p>}

      <div className="ui-actions">
        {onCancel && <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>Cancel</button>}
        <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1 }} disabled={!name || saving} onClick={save}>
          {saving ? (action?.busyLabel || 'Saving…') : (action?.label || 'Save account')}
        </button>
      </div>
    </div>
  )
}
