// @ts-nocheck
import Layout from '../components/Layout'

export default function Privacy() {
  return (
    <Layout sidebar={false}>
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>Last updated: June 2026</p>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
          <p>OgaPay Technologies Ltd. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>Information We Collect</h3>
          <p>We collect information you provide directly to us, including name, email address, wallet address, and profile information when you create an account.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>How We Use Your Information</h3>
          <p>We use your information to operate our platform, process transactions, send notifications, and improve our services.</p>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginTop: 24 }}>Contact</h3>
          <p>If you have questions about this policy, contact us at support@ogapay.com.</p>
        </div>
      </div>
    </Layout>
  )
}
