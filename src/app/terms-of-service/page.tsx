"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import Divider from "@/components/Divider";
import AccentBadge from "@/components/AccentBadge";

const tocItems = [
  { id: "introduction", label: "Introduction" },
  { id: "eligibility", label: "Eligibility" },
  { id: "account-registration", label: "Account Registration" },
  { id: "membership-plans", label: "Membership Plans" },
  { id: "tasks-and-submissions", label: "Tasks and Submissions" },
  { id: "payouts", label: "Payouts and Payments" },
  { id: "prohibited", label: "Prohibited Activities" },
  { id: "advertiser-terms", label: "Advertiser Terms" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "privacy", label: "Privacy" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "termination", label: "Termination" },
  { id: "dispute-resolution", label: "Dispute Resolution" },
  { id: "general-provisions", label: "General Provisions" },
  { id: "contact-information", label: "Contact Information" },
];

const plans = [
  {
    name: "Free",
    badge: "Free Forever",
    price: "₦0",
    label: "Easy Tasks Plan",
    bestFor: "Customers",
    border: false,
    featured: false,
    features: [
      "Deals & EarnBack",
      "Community Access",
      "Weekly Deals Newsletter",
      "Net-7 Weekly Payouts",
    ],
  },
  {
    name: "Member",
    badge: "Most Popular",
    price: "₦3,000",
    label: "/year",
    bestFor: "Individuals",
    border: true,
    featured: true,
    features: [
      "Everything in Free",
      "Easy Tasks",
      "Crypto Bounties",
      "Member Support",
      "EarnBack Rewards",
      "Hire Micro-Influencers",
      "Net-7 Payouts (3% fee)",
    ],
  },
  {
    name: "Member+",
    badge: "For Business",
    price: "₦10,000",
    label: "/year",
    bestFor: "Businesses",
    border: false,
    featured: false,
    features: [
      "Everything in Member",
      "List Crypto Bounties",
      "Priority Support",
      "Private Community",
      "Instant Job Notifications",
      "Verified Task Listings",
    ],
  },
];

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <>
        <p>
          Welcome to OgaPay. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
          OgaPay platform, website, and services. By creating an account or using our services, you agree to
          be bound by these Terms.
        </p>
        <p className="mt-4">
          OgaPay is a digital rewards and crypto bounty platform that connects businesses with individuals
          who complete tasks, surveys, and engagement campaigns for rewards.
        </p>
        <p className="mt-4">
          Please read these Terms carefully before using our platform. If you do not agree to these Terms,
          you may not access or use our services.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    content: (
      <>
        <p>By using OgaPay, you represent and warrant that:</p>
        <ul className="space-y-2 mt-4">
          {[
            "You are at least 18 years of age",
            "You are a resident of Nigeria or another jurisdiction where our services are available",
            "You have the legal capacity to enter into a binding contract",
            "You have not been previously suspended or removed from our platform",
            "You will provide accurate and complete information during registration",
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
    id: "account-registration",
    title: "3. Account Registration",
    content: (
      <>
        <p>
          To access certain features of our platform, you must create an account. You are responsible for
          maintaining the confidentiality of your account credentials and for all activities that occur under
          your account.
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "You must provide accurate, current, and complete information",
            "You are responsible for keeping your password secure",
            "You must notify us immediately of any unauthorized use of your account",
            "You may not share your account with others",
            "We reserve the right to refuse service, terminate accounts, or remove content",
            "One account per individual; duplicate accounts may be suspended",
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
    id: "membership-plans",
    title: "4. Membership Plans",
    content: (
      <>
        <p>
          OgaPay offers three membership tiers. Each tier provides different levels of access and benefits:
        </p>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 my-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 border transition-all duration-200 
                ${plan.featured 
                  ? "border-purple-400 ring-1 ring-purple-400 relative" 
                  : "border-gray-200 dark:border-[#2a2a3e]"
                }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="text-center mb-6">
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 
                  ${plan.featured 
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" 
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                  {plan.badge}
                </span>
                <div className="text-3xl font-extrabold text-[#0a0a0a] dark:text-white">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{plan.label}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Best for: {plan.bestFor}</p>
              </div>
              <ul className="space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p>
          All fees are non-refundable unless otherwise stated. OgaPay reserves the right to modify pricing
          with 30 days&apos; notice. Members will be notified of any price changes via email.
        </p>
      </>
    ),
  },
  {
    id: "tasks-and-submissions",
    title: "5. Tasks and Submissions",
    content: (
      <>
        <p>
          Tasks are posted by businesses (&ldquo;Advertisers&rdquo;) and completed by members (&ldquo;Workers&rdquo;).
          By submitting work, you agree to:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Complete tasks accurately and honestly according to the brief provided",
            "Submit original work that does not infringe on any third-party rights",
            "Not use automated tools, bots, or scripts to complete tasks",
            "Not submit fraudulent or misleading submissions",
            "Comply with any specific instructions provided by the Advertiser",
            "Understand that submissions are reviewed and may be rejected",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          OgaPay uses an AI-powered review system to verify task submissions. Rejected submissions may be
          appealed within 7 days.
        </p>
      </>
    ),
  },
  {
    id: "payouts",
    title: "6. Payouts and Payments",
    content: (
      <>
        <p>
          OgaPay processes member payouts every Thursday (Net-7). The following terms apply:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Minimum payout threshold may apply",
            "Payouts are made in Nigerian Naira (NGN) or USDC",
            "Payment processing fees may apply depending on membership tier",
            "You must provide accurate bank account or wallet details",
            "OgaPay is not responsible for incorrect payment details provided by you",
            "Chargebacks or disputed payments may result in account suspension",
            "Tax reporting: Members are responsible for declaring earnings as required by law",
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
    id: "prohibited",
    title: "7. Prohibited Activities",
    content: (
      <>
        <p>You agree not to engage in any of the following prohibited activities:</p>
        <ul className="space-y-2 mt-4">
          {[
            "Creating multiple accounts to abuse rewards or referral programs",
            "Using bots, scripts, or automated methods to complete tasks",
            "Posting fraudulent, misleading, or deceptive content",
            "Attempting to hack, manipulate, or disrupt platform operations",
            "Engaging in money laundering or any illegal activity",
            "Harassing, threatening, or abusing other users or staff",
            "Sharing your account credentials with others",
            "Reverse engineering any aspect of the platform",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Violation of these prohibitions may result in immediate account termination and forfeiture of
          earnings.
        </p>
      </>
    ),
  },
  {
    id: "advertiser-terms",
    title: "8. Advertiser Terms",
    content: (
      <>
        <p>
          Businesses and brands posting tasks on OgaPay (&ldquo;Advertisers&rdquo;) agree to:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "Provide clear, accurate, and lawful task briefs",
            "Not post tasks that require illegal or unethical activities",
            "Pay all fees associated with their campaigns",
            "Respond to disputes or inquiries in a timely manner",
            "Comply with all applicable laws and regulations",
            "Not use the platform to collect personal data without consent",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          OgaPay reserves the right to review, modify, or remove any advertiser content that violates our
          policies.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "9. Intellectual Property",
    content: (
      <>
        <p>
          The OgaPay platform, including its design, logo, content, and technology, is owned by OgaPay and
          protected by intellectual property laws.
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "You may not copy, modify, or distribute OgaPay&apos;s intellectual property without permission",
            "Task submissions remain the property of the Advertiser who commissioned them",
            "You retain ownership of your account data as described in our Privacy Policy",
            "Feedback and suggestions may be used by OgaPay without compensation",
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
    id: "privacy",
    title: "10. Privacy",
    content: (
      <>
        <p>
          Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your
          personal information. By using OgaPay, you consent to our data practices as described in the
          Privacy Policy.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "11. Disclaimers",
    content: (
      <>
        <p>
          OgaPay provides its platform on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
          We make no warranties, expressed or implied, regarding:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "The availability or uninterrupted operation of the platform",
            "The accuracy or reliability of any task or content",
            "The quality or suitability of tasks posted by Advertisers",
            "The approval of task submissions",
            "The value or liquidity of crypto rewards",
          ].map((item) => (
            <li key={item} className="pl-4 border-l-2 border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          OgaPay is not responsible for any losses, damages, or claims arising from your use of the platform.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "12. Termination",
    content: (
      <>
        <p>
          Either party may terminate this agreement under the following conditions:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            "You may delete your account at any time through platform settings",
            "OgaPay may suspend or terminate your account for violation of these Terms",
            "Upon termination, you lose access to your account and any pending earnings may be forfeited",
            "Remaining balances will be paid out within 30 days of termination, subject to deductions",
            "Sections relating to Intellectual Property, Disclaimers, and Dispute Resolution survive termination",
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
    id: "dispute-resolution",
    title: "13. Dispute Resolution",
    content: (
      <>
        <p>Any disputes arising from these Terms shall be resolved as follows:</p>
        <ul className="space-y-2 mt-4">
          {[
            "Informal resolution: Contact support@ogapay.net to resolve the issue",
            "Mediation: If informal resolution fails, parties agree to mediate in Lagos, Nigeria",
            "Arbitration: Binding arbitration in accordance with Nigerian law",
            "Jurisdiction: The courts in Lagos, Nigeria have exclusive jurisdiction",
            "Class action waiver: All disputes must be brought individually",
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
    id: "general-provisions",
    title: "14. General Provisions",
    content: (
      <>
        <ul className="space-y-2 mt-4">
          {[
            "Entire agreement: These Terms constitute the entire agreement between you and OgaPay",
            "Severability: If any part of these Terms is found invalid, the rest remains in effect",
            "Waiver: Failure to enforce any right does not constitute a waiver",
            "Force majeure: OgaPay is not liable for circumstances beyond its reasonable control",
            "Assignment: You may not assign your rights without OgaPay&apos;s consent",
            "Notices: Communications will be sent to the email address associated with your account",
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
    id: "contact-information",
    title: "15. Contact Information",
    content: (
      <>
        <p>For questions or concerns regarding these Terms, please contact us:</p>
        <ul className="space-y-2 mt-4">
          {[
            "Email: support@ogapay.net",
            "Email: legal@ogapay.net",
            "Address: Lagos, Nigeria",
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

export default function TermsOfServicePage() {
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
        title="Terms of → Service"
        accentWord="Service"
        subtitle="Effective January 1, 2025 · Last Updated May 2026"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Terms of Service" }]}
      />

      <SectionWrapper bg="white">
        {/* Mobile TOC */}
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

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
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

          {/* Content */}
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
