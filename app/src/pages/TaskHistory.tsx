// @ts-nocheck
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'

export default function TaskHistory() {
  const [history, setHistory] = useState([])

  // Load from localStorage or API
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_task_history') || '[]')
      setHistory(stored)
    } catch { setHistory([]) }
  }, [])

  return (
    <Layout sidebar={false}>
      <div style={{ padding: '28px 20px 60px', maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Task History</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>Your completed and past tasks.</p>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 14 }}>
            <i className="ti ti-clock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            <p>No task history yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text2)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Task</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text2)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text2)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>{item.title || `Task #${i + 1}`}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ color: item.status === 'completed' ? '#16a34a' : 'var(--text3)' }}>{item.status || 'pending'}</span></td>
                    <td style={{ padding: '12px 16px', color: 'var(--text2)' }}>{item.date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
