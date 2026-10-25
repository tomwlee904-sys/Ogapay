import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

// Copyright: what OgaPay owns, what stays with the people who post, and how to
// report content that copies someone else's work.

export default function Copyright() {
  return (
    <Layout>
      <style>{`
        .cr-sec{margin-top:40px}
        .cr-sec h2{margin:0;font-size:18px;font-weight:600;color:var(--text)}
        .cr-sec p,.cr-sec li{font-size:14px;line-height:1.7;color:var(--text2);max-width:720px}
        .cr-sec p{margin:8px 0 0}
        .cr-sec ul{margin:10px 0 0;padding-left:20px}
      `}</style>
      <div className="ui-page">
        <header>
          <span className="ui-eyebrow"><i className="ti ti-copyright" /> Legal</span>
          <h1 className="ui-title">Copyright</h1>
          <p className="ui-sub">Last updated 6 October 2026</p>
        </header>

        <section className="cr-sec">
          <h2>1. What OgaPay owns</h2>
          <p>
            Copyright © 2026 OgaPay Technologies Ltd. The OgaPay name and logo, the design of the website and app, and the text
            and images we publish (including our guides, FAQ and blog posts written by OgaPay) belong to OgaPay Technologies Ltd.
          </p>
        </section>

        <section className="cr-sec">
          <h2>2. What you post</h2>
          <p>
            People who post on OgaPay (jobs, submissions, store listings, community posts, blog posts and profiles) keep the
            rights they have in their own content. How OgaPay may show that content to run the service is covered in the{' '}
            <Link to="/terms">Terms</Link>. Only post work you made or have the right to use.
          </p>
        </section>

        <section className="cr-sec">
          <h2>3. Reporting copied content</h2>
          <p>If something on OgaPay copies your work without permission, email <a href="mailto:support@ogapay.app">support@ogapay.app</a> with:</p>
          <ul>
            <li>a link to the content on OgaPay,</li>
            <li>what it copies (a link to your original, or a description of it),</li>
            <li>your name and how to reach you, and a statement that you own the work or act for the owner.</li>
          </ul>
          <p>We review every report, remove content that infringes, and may close accounts that do it repeatedly.</p>
        </section>

        <section className="cr-sec">
          <h2>4. Other people's materials</h2>
          <p>
            Third-party names, logos and trademarks (for example banks, wallets and social networks) belong to their owners.
            Open-source software we use keeps its own license; see <Link to="/license">Software license</Link>.
          </p>
        </section>
      </div>
    </Layout>
  )
}
