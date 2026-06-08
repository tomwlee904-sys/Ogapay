// @ts-nocheck
import Layout from '../components/Layout'

export default function Terms() {
  return (
    <Layout sidebar={false}>
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Terms of Service</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>Last updated: June 2026</p>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
          <p>Welcome to OgaPay. These Terms of Service govern your use of our platform, services, and products.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>Acceptance of Terms</h3>
          <p>By creating an account, you agree to these terms. If you do not agree, do not use the platform.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>User Obligations</h3>
          <p>You agree to provide accurate information, maintain confidentiality of your account, and comply with all applicable laws.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>Limitation of Liability</h3>
          <p>OgaPay shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </div>
      </div>
    </Layout>
  )
}
