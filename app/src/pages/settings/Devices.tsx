import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { Card, Row } from './ui'

type Device = { id: string; name: string | null; browser: string | null; os: string | null; lastActiveAt: string | null; createdAt: string }

// Rough "Chrome on Windows" from the stored user agent
function describe(ua?: string | null) {
  const u = String(ua || '')
  const b = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : ''
  const o = /Windows/.test(u) ? 'Windows' : /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iPhone or iPad' : /Mac OS X/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : ''
  return b && o ? `${b} on ${o}` : b || o || (u ? u.slice(0, 40) : 'Device')
}

// The old section had its own code generator and a "Link a device" box that only
// accepted 6 digits (pairing codes are 25 characters), so linking never worked.
export default function Devices() {
  const { toast } = useToast()
  const [list, setList] = useState<Device[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = () => apiRequest<Device[]>('/devices').then((d) => setList(Array.isArray(d) ? d : [])).catch(() => setList([]))
  useEffect(() => { load() }, [])

  const remove = async (d: Device) => {
    if (!window.confirm(`Remove ${describe(d.name)}? It will be signed out.`)) return
    setBusy(d.id)
    try {
      await apiRequest(`/devices/${d.id}`, { method: 'DELETE' })
      setList((l) => (l || []).filter((x) => x.id !== d.id))
      toast('Device removed and signed out', 'success')
    } catch (e: any) {
      toast(e?.message || "Couldn't remove the device", 'error')
    }
    setBusy(null)
  }

  return (
    <>
      <Card title="Pair a device" sub="Sign in on a phone or another computer without typing your password: create a code here and enter it (or scan it) on the other device.">
        <Row title="Pairing codes last 5 minutes"><Link className="up-btn primary" to="/pair-device"><i className="ti ti-qrcode" /> Pair a device</Link></Row>
      </Card>
      <Card title="Paired devices">
        {list === null ? <p className="st2-muted">Loading…</p> : list.length === 0 ? <p className="st2-muted">No paired devices.</p> : list.map((d) => (
          <div key={d.id} className="st2-conn">
            <span className="st2-conn-ico"><i className="ti ti-device-mobile" /></span>
            <div className="st2-conn-t">
              <strong>{describe(d.name)}</strong>
              <span>Paired {new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{d.lastActiveAt ? ` · last used ${new Date(d.lastActiveAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</span>
            </div>
            <button className="up-btn" onClick={() => remove(d)} disabled={busy === d.id}>{busy === d.id ? 'Removing…' : 'Remove'}</button>
          </div>
        ))}
      </Card>
    </>
  )
}
