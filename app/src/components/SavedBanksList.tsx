import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'

interface BankAccount {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  isDefault: boolean
  createdAt: string
}

export default function SavedBanksList() {
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [accNo, setAccNo] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accName, setAccName] = useState('')
  const [setDefault, setSetDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bankList, setBankList] = useState<{ code: string; name: string }[]>([])

  async function load() {
    try {
      const data = await apiRequest<BankAccount[]>('/wallet/banks')
      setBanks(data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function loadBanks() {
    try {
      const data = await apiRequest<any[]>('/wallet/banks/list')
      setBankList((data || []).map((b: any) => ({ code: b.code, name: b.name })))
    } catch { /* ignore */ }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!accNo || accNo.length < 10) { setError('Valid 10-digit account number required'); return }
    if (!bankCode) { setError('Select a bank'); return }
    setError('')
    setSaving(true)
    try {
      await apiRequest('/wallet/banks', {
        method: 'POST',
        body: JSON.stringify({ bankCode, bankName, accountNumber: accNo, accountName: accName, setDefault }),
      })
      await load()
      setShowAdd(false)
      setAccNo(''); setBankCode(''); setBankName(''); setAccName(''); setSetDefault(false)
    } catch (e: any) {
      setError(e.message || 'Failed to add bank account')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    try {
      await apiRequest(`/wallet/banks/${id}`, { method: 'DELETE' })
      setBanks(prev => prev.filter(b => b.id !== id))
    } catch { /* ignore */ }
  }

  async function handleSetDefault(id: string) {
    try {
      await apiRequest(`/wallet/banks/${id}/default`, { method: 'PUT' })
      setBanks(prev => prev.map(b => ({ ...b, isDefault: b.id === id })))
    } catch { /* ignore */ }
  }

  const openAdd = () => {
    setShowAdd(true)
    setError('')
    loadBanks()
  }

  if (loading) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="sec-title">
        <i className="ti ti-building-bank" /> Saved Banks
        {banks.length > 0 && (
          <button onClick={openAdd} className="wla-btn outline" style={{ marginLeft: 'auto', height: 32, padding: '0 12px', fontSize: 12 }}>
            <i className="ti ti-plus" /> Add Bank
          </button>
        )}
      </div>

      {banks.length === 0 && !showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <i className="ti ti-building-bank" style={{ fontSize: 32, color: 'var(--text3)', marginBottom: 8, display: 'block' }} />
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>No saved bank accounts yet. Add one to withdraw easily.</div>
          <button onClick={openAdd} className="wla-btn primary" style={{ display: 'inline-flex' }}>
            <i className="ti ti-plus" /> Add Bank Account
          </button>
        </div>
      )}

      {banks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {banks.map(bank => (
            <div key={bank.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--card)', border: `1px solid ${bank.isDefault ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 12, padding: '14px 16px', transition: 'all .2s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: bank.isDefault ? 'var(--accent)15' : 'var(--bg2)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                <i className="ti ti-building-bank" style={{ color: bank.isDefault ? 'var(--accent)' : 'var(--text3)', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                  {bank.bankName}
                  {bank.isDefault && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>DEFAULT</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {bank.accountName} • {bank.accountNumber}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {!bank.isDefault && (
                  <button
                    onClick={() => handleSetDefault(bank.id)}
                    style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text3)', fontSize: 14 }}
                    title="Set as default"
                  >
                    <i className="ti ti-star" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(bank.id)}
                  style={{ height: 32, width: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#DC2626', fontSize: 14 }}
                  title="Remove"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
          <button onClick={openAdd} className="wla-btn outline" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <i className="ti ti-plus" /> Add Another Bank
          </button>
        </div>
      )}

      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowAdd(false)}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            maxWidth: 440, width: '100%', padding: 28, maxHeight: '90vh', overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 800, margin: 0 }}>Add Bank Account</h3>
              <button style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text3)', fontSize: 18 }} onClick={() => setShowAdd(false)}>
                <i className="ti ti-x" />
              </button>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#991b1b', marginBottom: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-alert-triangle" />{error}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Bank</label>
              <select
                value={bankCode}
                onChange={e => {
                  const sel = bankList.find(b => b.code === e.target.value)
                  setBankCode(e.target.value)
                  setBankName(sel?.name || '')
                }}
                style={{
                  width: '100%', height: 42, padding: '0 14px', border: '1.5px solid var(--border)',
                  borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14,
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              >
                <option value="">Select a bank</option>
                {bankList.map(b => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Account Number</label>
              <input
                value={accNo}
                onChange={e => setAccNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0123456789"
                maxLength={10}
                style={{
                  width: '100%', height: 42, padding: '0 14px', border: '1.5px solid var(--border)',
                  borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Account Name</label>
              <input
                value={accName}
                onChange={e => setAccName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%', height: 42, padding: '0 14px', border: '1.5px solid var(--border)',
                  borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
              <input type="checkbox" checked={setDefault} onChange={e => setSetDefault(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              Set as default withdrawal account
            </label>

            <button
              onClick={handleAdd}
              disabled={saving}
              style={{
                height: 42, width: '100%', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: 'var(--accent)', color: '#fff', border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : 'Save Bank Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
