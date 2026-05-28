"use client";

import { useState } from "react";
import { 
  Headphones, Briefcase, Lock, ShieldAlert, 
  Send, CheckCircle, Mail, Clock, Phone 
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import Divider from "@/components/Divider";

const contactCards = [
  {
    icon: <Headphones className="w-6 h-6" />,
    title: "General Support",
    email: "support@ogapay.net",
    hours: "Mon-Fri, 8AM-8PM WAT",
    badge: "24-48 hrs",
    badgeBg: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  {
    icon: <Briefcase className="w-6 h-6" />,
    title: "Business & Advertisers",
    email: "business@ogapay.net",
    hours: "",
    badge: "24 hrs",
    badgeBg: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: "Privacy & Data",
    email: "privacy@ogapay.net",
    hours: "",
    badge: "30 days",
    badgeBg: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  {
    icon: <ShieldAlert className="w-6 h-6" />,
    title: "Security & Fraud",
    email: "security@ogapay.net",
    hours: "",
    badge: "24/7",
    badgeBg: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  },
];

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <>
      <PageHeader
        title="Contact → Us"
        accentWord="Us"
        subtitle="We would love to hear from you."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      {/* Contact Type Cards */}
      <SectionWrapper bg="lavender">
        <div className="grid sm:grid-cols-2 gap-4">
          {contactCards.map((card) => (
            <div
              key={card.title}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl p-6 transition-all duration-200 hover:border-purple-400"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-purple-600">
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[#0a0a0a] dark:text-white">{card.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${card.badgeBg}`}>
                      {card.badge}
                    </span>
                  </div>
                  <a
                    href={`mailto:${card.email}`}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {card.email}
                  </a>
                  {card.hours && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{card.hours}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Main Section */}
      <SectionWrapper bg="white">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Left - Form */}
          <div className="md:col-span-3">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] dark:text-white mb-2">
              Send a <span className="text-[#8b5cf6]">Message</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Fill out the form below and we&apos;ll get back to you within 24 hours.
            </p>

            {formSubmitted ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Thank you! Your message has been sent. We will respond within 24-48 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
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
                  <input
                    type="text"
                    placeholder="Subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2a3e]
                      bg-white dark:bg-[#1a1a2e] text-[#0a0a0a] dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-purple-400 transition-colors text-sm"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Your Message"
                    required
                    rows={5}
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                    bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a]
                    font-semibold text-sm hover:opacity-90 transition-all duration-200"
                >
                  Send Message
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Right - Quick Info */}
          <div className="md:col-span-2">
            <div className="bg-gray-50 dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-2xl p-6">
              <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-6">Contact Information</h3>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">General Support</p>
                    <a href="mailto:support@ogapay.net" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                      support@ogapay.net
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Business</p>
                    <a href="mailto:business@ogapay.net" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                      business@ogapay.net
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Security</p>
                    <a href="mailto:security@ogapay.net" className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                      security@ogapay.net
                    </a>
                  </div>
                </div>

                <Divider />

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Support Hours</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Monday - Friday</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">8:00 AM - 8:00 PM (WAT)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Response Time</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Within 24-48 hours</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Security: Within 12 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Map / Location */}
      <SectionWrapper bg="lavender">
        <div className="text-center max-w-xl mx-auto">
          <h3 className="text-xl font-bold text-[#0a0a0a] dark:text-white mb-2">Visit Us</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            OgaPay Operations Center
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            Lagos, Nigeria
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Office visits by appointment only. Please contact us first.
          </p>
        </div>
      </SectionWrapper>
    </>
  );
}
