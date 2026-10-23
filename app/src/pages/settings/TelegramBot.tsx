import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { Card, Row, Toggle } from './ui'

/* Settings > Connections > Telegram bot. Get a one-time code, send it to the
   bot (or open the bot's link, which sends it for you), and the bot can show
   your balance, new jobs, alert you about new jobs and post raid jobs.
   Server: routes/telegram.routes.js */

type Status = { available: boolean; botUsername: string | null; linked: boolean; username: string | null; alertsOn: boolean }
type LinkCode = { code: string; expiresAt: string; botUsername: string | null; link: string | null }

export default function TelegramBot() {
  const { toast } = useToast()
  const [st, setSt] = useState<Status | null>(null)
  const [code, setCode] = useState<LinkCode | null>(null)
  const [busy, setBusy] = useState('')

  const load = () => apiRequest<Status>('/telegram/status').then(setSt).catch(() => setSt(null))
  useEffect(() => { load() }, [])
  // While a code is shown, check now and then whether the bot got it
  useEffect(() => {
    if (!code || st?.linked) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [code, st?.linked])
  useEffect(() => { if (st?.linked) setCode(null) }, [st?.linked])

  const getCode = async () => {
    setBusy('code')
    try { setCode(await apiRequest<LinkCode>('/telegram/link-code', { method: 'POST' })) }
    catch (e: any) { toast(e?.message || "Couldn't make a code", 'error') }
    setBusy('')
  }
  const setAlerts = async (on: boolean) => {
    setSt((s) => (s ? { ...s, alertsOn: on } : s))
    try { await apiRequest('/telegram/alerts', { method: 'PATCH', body: JSON.stringify({ on }) }) }
    catch (e: any) { setSt((s) => (s ? { ...s, alertsOn: !on } : s)); toast(e?.message || "Couldn't save", 'error') }
  }
  const unlink = async () => {
    if (!window.confirm('Unlink Telegram? The bot stops working for your account until you link it again.')) return
    setBusy('unlink')
    try { await apiRequest('/telegram/link', { method: 'DELETE' }); toast('Telegram unlinked', 'success'); await load() }
    catch (e: any) { toast(e?.message || "Couldn't unlink", 'error') }
    setBusy('')
  }
  const copy = (text: string) => { navigator.clipboard?.writeText(text).then(() => toast('Copied', 'success')).catch(() => {}) }

  if (!st) return null
  const bot = st.botUsername ? `@${st.botUsername}` : 'the OgaPay bot'

  return (
    <Card title="Telegram bot" sub={<>Check your balance, see new jobs and post raid jobs from Telegram with {bot}.</>}>
      {!st.available ? (
        <p className="st2-muted">The Telegram bot is coming soon.</p>
      ) : st.linked ? (
        <>
          <div className="st2-conn">
            <span className="st2-conn-ico"><i className="ti ti-brand-telegram" /></span>
            <div className="st2-conn-t"><strong>Linked</strong><span>{st.username ? `Telegram @${st.username}` : 'Your Telegram account'}</span></div>
            <button className="up-btn" onClick={unlink} disabled={busy === 'unlink'}>Unlink</button>
          </div>
          <Row title={<span id="tg-alerts">New-job alerts in Telegram</span>} sub="The same jobs as your push alerts (Notifications > Push alerts).">
            <Toggle on={st.alertsOn} onChange={setAlerts} labelledBy="tg-alerts" />
          </Row>
          <p className="st2-muted tgb-cmds">In the bot: /balance, /jobs, /raid followed by an X post link (posts a job from a saved template with "raid" in its name, after you press Confirm), /alerts on or off.</p>
        </>
      ) : code ? (
        <div className="tgb-code">
          <p>Send this code to {bot} within 15 minutes:</p>
          <div className="tgb-code-row">
            <code>/link {code.code}</code>
            <button className="up-btn" onClick={() => copy(`/link ${code.code}`)}><i className="ti ti-copy" aria-hidden="true" /> Copy</button>
          </div>
          {code.link && <a className="up-btn primary tgb-open" href={code.link} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" aria-hidden="true" /> Open {bot} and link</a>}
          <p className="st2-muted">The code works once. This page updates when the bot has it.</p>
        </div>
      ) : (
        <div className="st2-conn">
          <span className="st2-conn-ico"><i className="ti ti-brand-telegram" /></span>
          <div className="st2-conn-t"><strong>Not linked</strong><span>Takes a one-time code</span></div>
          <button className="up-btn primary" onClick={getCode} disabled={busy === 'code'}>{busy === 'code' ? 'Getting code…' : 'Link Telegram'}</button>
        </div>
      )}
    </Card>
  )
}
