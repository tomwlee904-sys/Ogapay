"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import Divider from "@/components/Divider";

const tocItems = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "legal-basis", label: "Legal Basis for Processing" },
  { id: "sharing", label: "Sharing Your Information" },
  { id: "data-retention", label: "Data Retention" },
  { id: "cookies", label: "Cookies and Tracking" },
  { id: "data-security", label: "Data Security" },
  { id: "your-rights", label: "Your Rights" },
  { id: "children-privacy", label: "Children's Privacy" },
  { id: "international-transfers", label: "International Transfers" },
  { id: "changes", label: "Changes to Policy" },
  { id: "contact", label: "Contact Us" },
];

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <>
        <p>
          OgaPay (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
          visit our platform or use our services.
        </p>
        <p className="mt-4">
          By accessing or using OgaPay, you agree to the collection and use of information in accordance with
          this policy. If you do not agree with the terms of this Privacy Policy, please do not access the
          platform.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    content: (
      <>
        <p>We collect several types of information to provide and improve our services:</p>
        <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-4 mb-2">Personal Information</h4>
        <p>When you register, we may collect your name, email address, phone number, bank account details for
        payouts, and government-issued identification for verification purposes.</p>
        <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-4 mb-2">Usage Data</h4>
        <p>We automatically collect information about how you interact with our platform, including pages
        visited, time spent, tasks completed, and referral activity.</p>
        <h4 className="text-lg font-semibold text-purple-600 dark:text-purple-400 mt-4 mb-2">Device Information</h4>
        <p>We may collect information about your device, including IP address, browser type, operating system,
        and device identifiers.</p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use the information we collect for the following purposes:</p>
        <ul className="space-y-2 mt-4">
          {[
            "To create and maintain your account",
            "To process and facilitate payments and rewards",
            "To verify your identity and prevent fraud",
            "To communicate with you about your account, tasks, and payouts",
            "To improve our platform and user experience",
            "To comply with legal obligations and regulatory requirements",
            "To send you marketing communications (with your consent)",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "4. Legal Basis for Processing",
    content: (
      <>
        <p>
          Under applicable data protection laws, we process your personal information based on the following
          legal grounds:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Consent: You have given clear consent for us to process your personal data for specific purposes",
            "Contract: Processing is necessary for the performance of a contract with you (e.g., to provide our services)",
            "Legal obligation: Processing is necessary for compliance with a legal obligation",
            "Legitimate interests: Processing is necessary for our legitimate interests (e.g., improving our services, preventing fraud)",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "5. Sharing Your Information",
    content: (
      <>
        <p>
          We may share your information with third parties in the following circumstances:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Payment processors and financial institutions to facilitate payouts",
            "Service providers who assist us in operating our platform",
            "Law enforcement or regulatory authorities when required by law",
            "Business partners with your consent or as necessary to provide services",
            "In connection with a business transfer, merger, or acquisition",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          We do not sell your personal information to third parties.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    content: (
      <>
        <p>
          We retain your personal information only for as long as necessary to fulfill the purposes outlined
          in this Privacy Policy, unless a longer retention period is required or permitted by law.
        </p>
        <p className="mt-4">
          When you delete your account, we will delete or anonymize your personal information within 30 days,
          except where we are legally required to retain certain data (e.g., for tax or regulatory purposes).
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "7. Cookies and Tracking",
    content: (
      <>
        <p>
          We use cookies and similar tracking technologies to track activity on our platform and store certain
          information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
        </p>
        <p className="mt-4">We use the following types of cookies:</p>
        <ul className="space-y-2 mt-4">
          {[
            "Essential cookies: Required for the platform to function properly",
            "Analytics cookies: Help us understand how users interact with our platform",
            "Preference cookies: Remember your settings and preferences",
            "Marketing cookies: Used to deliver relevant advertisements",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          You can control cookie preferences through your browser settings. Disabling certain cookies may
          affect platform functionality.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "8. Data Security",
    content: (
      <>
        <p>
          We implement appropriate technical and organizational measures to protect your personal information
          against unauthorized access, alteration, disclosure, or destruction.
        </p>
        <p className="mt-4">Our security measures include:</p>
        <ul className="space-y-2 mt-4">
          {[
            "Encryption of data in transit and at rest",
            "Regular security audits and vulnerability assessments",
            "Access controls and authentication protocols",
            "Employee training on data protection best practices",
            "Incident response and breach notification procedures",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "9. Your Rights",
    content: (
      <>
        <p>
          Depending on your jurisdiction, you may have the following rights regarding your personal information:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Right to access your personal data",
            "Right to rectify inaccurate data",
            "Right to delete your data (right to be forgotten)",
            "Right to restrict processing",
            "Right to data portability",
            "Right to object to processing",
            "Right to withdraw consent at any time",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          To exercise any of these rights, please contact us at privacy@ogapay.net. We will respond to your
          request within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "children-privacy",
    title: "10. Children's Privacy",
    content: (
      <>
        <p>
          Our platform is not intended for individuals under the age of 18. We do not knowingly collect personal
          information from minors. If we become aware that a minor has provided us with personal data, we will
          take steps to delete that information.
        </p>
        <p className="mt-4">
          If you are a parent or guardian and believe your child has provided us with personal information,
          please contact us immediately at privacy@ogapay.net.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "11. International Transfers",
    content: (
      <>
        <p>
          Your information may be transferred to and maintained on computers located outside of your state,
          province, country, or other governmental jurisdiction where data protection laws may differ.
        </p>
        <p className="mt-4">
          We take appropriate safeguards to ensure that your personal information receives an adequate level
          of protection regardless of where it is processed, including through standard contractual clauses
          and other lawful transfer mechanisms.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "12. Changes to This Privacy Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting
          the new policy on this page and updating the &ldquo;Last Updated&rdquo; date at the top.
        </p>
        <p className="mt-4">
          We encourage you to review this Privacy Policy periodically for any changes. Changes to this
          Privacy Policy are effective when they are posted on this page.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "13. Contact Us",
    content: (
      <>
        <p>
          If you have any questions about this Privacy Policy, please contact us:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Email: privacy@ogapay.net",
            "Email: support@ogapay.net",
            "Address: Lagos, Nigeria",
            "Response time: Within 30 days",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileTocOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <PageHeader
        title="Privacy → Policy"
        accentWord="Policy"
        subtitle="Effective January 1, 2025 · Last Updated May 2026"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />

      <SectionWrapper bg="white">
        <div className="flex gap-8 relative">
          {/* Mobile TOC Dropdown */}
          <div className="lg:hidden w-full mb-6">
            <button
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl 
                border border-gray-200 dark:border-[#2a2a3e] bg-white dark:bg-[#1a1a2e]
                text-sm font-medium text-[#0a0a0a] dark:text-white"
            >
              <span>On this page</span>
              {mobileTocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {mobileTocOpen && (
              <div className="mt-2 p-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e] bg-white dark:bg-[#1a1a2e]">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === item.id
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar TOC */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                    activeSection === item.id
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium border-l-2 border-purple-500"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {sections.map((section, i) => (
              <div key={section.id} id={section.id}>
                <h2 className="text-2xl font-bold text-[#0a0a0a] dark:text-white mb-4">
                  {section.title}
                </h2>
                <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {section.content}
                </div>
                {i < sections.length - 1 && <Divider />}
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
