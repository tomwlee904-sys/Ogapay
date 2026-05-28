"use client";

import { useState } from "react";
import { Search, Mail, MessageCircle, UserCheck, Plus, Minus, CheckCircle, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import AccentBadge from "@/components/AccentBadge";
import Divider from "@/components/Divider";

const faqTabs = [
  { id: "account", label: "Account & Registration" },
  { id: "tasks", label: "Tasks & Submissions" },
  { id: "payouts", label: "Payouts & Payments" },
  { id: "security", label: "Security & Safety" },
];

const faqData: Record<string, { q: string; a: string }[]> = {
  account: [
    { q: "How do I create an OgaPay account?", a: "Simply click 'Sign Up' on the homepage, provide your email address, full name, and phone number. You'll receive a verification link to activate your account. Once verified, you can complete your profile and start earning." },
    { q: "Is there any cost to join OgaPay?", a: "No, the basic Free plan is completely free to join. You can start earning immediately without any upfront payment. Our paid plans (Member and Member+) offer additional benefits and features." },
    { q: "Can I have multiple accounts?", a: "No, OgaPay allows only one account per individual. Creating multiple accounts is a violation of our Terms of Service and may result in suspension of all associated accounts and forfeiture of earnings." },
    { q: "How do I delete my account?", a: "You can delete your account through your profile settings. Once initiated, your account will be permanently deactivated after 30 days. Any pending balance will be paid out within 30 days of account deletion." },
  ],
  tasks: [
    { q: "What types of tasks are available on OgaPay?", a: "Tasks include surveys, content creation, social media engagement, app testing, data entry, referral campaigns, crypto bounties, and micro-influencer promotions. New tasks are posted daily across various categories." },
    { q: "How are task submissions reviewed?", a: "OgaPay uses an AI-powered review system combined with manual quality checks. Most submissions are reviewed within 24-48 hours. The system checks for accuracy, completeness, and compliance with the task brief." },
    { q: "What happens if my submission is rejected?", a: "If your submission is rejected, you will receive a reason for the rejection. You can re-attempt the task or submit an appeal within 7 days. Our support team will review appeals within 48 hours." },
    { q: "Can I withdraw a task submission?", a: "No, once a task submission is submitted, it cannot be withdrawn. You can contact support if you believe you made an error in your submission, and we may be able to help depending on the status of the review." },
  ],
  payouts: [
    { q: "When are payouts processed?", a: "Payouts are processed every Thursday (Net-7). This means earnings from the previous week (Monday-Sunday) are paid out the following Thursday. For example, tasks completed in Week 1 are paid on Thursday of Week 2." },
    { q: "What payment methods are available?", a: "We offer payments in Nigerian Naira (NGN) via bank transfer, and USDC (crypto) for crypto bounties. Naira payments are sent to your registered bank account, while crypto payments are sent to your connected wallet address." },
    { q: "Is there a minimum payout threshold?", a: "Yes, the minimum payout threshold varies by membership tier. Free members must earn at least ₦1,000 before withdrawal. Member and Member+ plans have lower or no minimum thresholds." },
    { q: "What fees apply to payouts?", a: "Free plan members pay a 5% processing fee on payouts. Member plan members pay a 3% fee. Member+ plan members pay no processing fees on payouts. Crypto transactions may incur additional network fees." },
  ],
  security: [
    { q: "How does OgaPay protect my personal information?", a: "We use industry-standard encryption for data in transit and at rest. We employ strict access controls, regular security audits, and comply with Nigerian data protection regulations. We never sell your personal information." },
    { q: "What should I do if I suspect fraudulent activity on my account?", a: "Immediately change your password and contact our security team at security@ogapay.net. We will investigate and take appropriate action. Enable two-factor authentication for additional account security." },
  ],
};

const contactMethods = [
  { email: "support@ogapay.net", label: "General Support" },
  { email: "business@ogapay.net", label: "Business Inquiries" },
  { email: "security@ogapay.net", label: "Security Issues" },
];

const supportHours = [
  { channel: "Email Support", hours: "Mon-Fri 8AM-8PM WAT", response: "24-48hrs" },
  { channel: "Live Chat", hours: "Mon-Fri 9AM-6PM WAT", response: "Immediate" },
  { channel: "Account Manager", hours: "Business Hours", response: "Same Day" },
  { channel: "Security", hours: "24/7", response: "Within 12 Hours" },
];

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState("account");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
  });

  const toggleFaq = (key: string) => {
    setOpenFaq(openFaq === key ? null : key);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <>
      <PageHeader
        title="Support → Center"
        accentWord="Center"
        subtitle="We are here to help — every step of the way."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Support" }]}
      />

      {/* Search Bar */}
      <section className="bg-[#f0f0ff] dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-[#2a2a3e]">
        <div className="max-w-2xl mx-auto px-4 pb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-[#2a2a3e]
                bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:border-purple-400 transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <SectionWrapper bg="white">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Mail className="w-6 h-6" />,
              title: "Email Support",
              badge: "All Members",
              badgeBg: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
              detail: "support@ogapay.net",
              note: "24-48 hour response",
              button: "Send Email",
            },
            {
              icon: <MessageCircle className="w-6 h-6" />,
              title: "Live Chat",
              badge: "Member & Member+",
              badgeBg: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
              detail: "Mon-Fri, 9AM-6PM WAT",
              note: "",
              button: "Start Chat",
            },
            {
              icon: <UserCheck className="w-6 h-6" />,
              title: "Dedicated Manager",
              badge: "Member+ Only",
              badgeBg: "bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a]",
              detail: "Direct support for your account",
              note: "",
              button: "Access Dashboard",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl p-6 transition-all duration-200 hover:border-purple-400"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 text-purple-600">
                {card.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white">{card.title}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${card.badgeBg}`}>
                  {card.badge}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.detail}</p>
              {card.note && <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{card.note}</p>}
              <div className="mt-4">
                <button className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#2a2a3e] 
                  text-sm font-medium text-[#0a0a0a] dark:text-white
                  hover:border-purple-400 transition-all duration-200">
                  {card.button}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* FAQ Section */}
      <SectionWrapper bg="lavender">
        <div className="text-center mb-10">
          <AccentBadge>FAQ</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            Frequently <span className="text-[#8b5cf6]">Asked</span> Questions
          </h2>
        </div>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {faqTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setOpenFaq(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a]"
                  : "bg-transparent border border-gray-200 dark:border-[#2a2a3e] text-gray-600 dark:text-gray-400 hover:border-purple-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-2xl mx-auto space-y-3">
          {faqData[activeTab]?.map((faq) => {
            const key = `${activeTab}-${faq.q}`;
            const isOpen = openFaq === key;
            return (
              <div
                key={key}
                className={`bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                  rounded-xl transition-all duration-200 ${
                    isOpen ? "border-l-2 border-l-purple-400" : ""
                  }`}
              >
                <button
                  onClick={() => toggleFaq(key)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-sm text-[#0a0a0a] dark:text-white pr-4">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <Minus className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionWrapper>

      {/* Contact Form */}
      <SectionWrapper bg="white">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white">
            Still Need <span className="text-[#8b5cf6]">Help</span>?
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Send us a message and we will get back to you within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Form */}
          <div>
            {formSubmitted ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Message sent! We will respond within 24-48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e]
                      bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-purple-400 transition-colors text-sm"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e]
                      bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-purple-400 transition-colors text-sm"
                  />
                </div>
                <div>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e]
                      bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-purple-400 transition-colors text-sm appearance-none"
                  >
                    <option value="">Select a topic</option>
                    <option value="account">Account Issue</option>
                    <option value="task">Task Submission</option>
                    <option value="payout">Payout Issue</option>
                    <option value="technical">Technical Problem</option>
                    <option value="business">Business Inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <textarea
                    placeholder="Message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e]
                      bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-purple-400 transition-colors text-sm resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                    bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a]
                    font-semibold text-sm hover:opacity-90 transition-all duration-200"
                >
                  Send Message
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Right panel */}
          <div className="bg-gray-50 dark:bg-[#1a1a2e] rounded-2xl p-6 border border-gray-200 dark:border-[#2a2a3e]">
            <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-4">Quick Contact</h3>
            <div className="space-y-4">
              {contactMethods.map((method) => (
                <div key={method.email}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{method.label}</p>
                  <a
                    href={`mailto:${method.email}`}
                    className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {method.email}
                  </a>
                </div>
              ))}
              <Divider />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Support Hours</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Monday - Friday
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  8:00 AM - 8:00 PM (WAT)
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Support Hours Table */}
      <SectionWrapper bg="lavender">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-[#0a0a0a] dark:text-white mb-6 text-center">
            Support Hours
          </h3>
          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-[#2a2a3e]">
            <table className="w-full">
              <thead>
                <tr className="bg-white dark:bg-[#1a1a2e] border-b border-gray-200 dark:border-[#2a2a3e]">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0a0a0a] dark:text-white">Channel</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0a0a0a] dark:text-white">Hours</th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-[#0a0a0a] dark:text-white">Response Time</th>
                </tr>
              </thead>
              <tbody>
                {supportHours.map((row, i) => (
                  <tr
                    key={row.channel}
                    className={`bg-white dark:bg-[#1a1a2e] ${
                      i < supportHours.length - 1 ? "border-b border-gray-100 dark:border-[#2a2a3e]" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-sm font-medium text-[#0a0a0a] dark:text-white">{row.channel}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{row.hours}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{row.response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionWrapper>
    </>
  );
}
