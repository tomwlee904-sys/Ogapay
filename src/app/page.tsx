import Link from "next/link";
import { ArrowRight, CheckCircle, Zap, Users, Briefcase, Globe } from "lucide-react";
import StatCard from "@/components/StatCard";
import AccentBadge from "@/components/AccentBadge";
import SectionWrapper from "@/components/SectionWrapper";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#f0f0ff] dark:bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Live in Nigeria
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight text-[#0a0a0a] dark:text-white max-w-3xl">
            Earn Rewards.{" "}
            <span className="text-[#8b5cf6]">Crypto</span>
            <br />
            Bounties. Real Pay.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
            Nigeria&apos;s leading platform for digital rewards, crypto bounties, and
            engagement tasks. Complete tasks, earn every Thursday.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl 
                bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a] 
                font-semibold text-sm hover:opacity-90 transition-all duration-200"
            >
              Start Earning
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl 
                border border-gray-300 dark:border-[#2a2a3e] text-[#0a0a0a] dark:text-white 
                font-semibold text-sm hover:border-purple-400 transition-all duration-200"
            >
              Create a Job
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <SectionWrapper bg="white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 -mt-24 relative z-10">
          <StatCard number="24,390" label="Active Members" />
          <StatCard number="NGN 182M+" label="Rewards Distributed" />
          <StatCard number="4,821" label="Active Jobs" />
        </div>
      </SectionWrapper>

      {/* How It Works */}
      <SectionWrapper bg="lavender">
        <div className="text-center mb-12">
          <AccentBadge>How It Works</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            Three Simple <span className="text-[#8b5cf6]">Steps</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <UserPlus className="w-7 h-7 text-purple-600" />,
              step: "01",
              title: "Sign Up Free",
              desc: "Create your account in seconds. Choose a plan that fits your goals.",
            },
            {
              icon: <ClipboardList className="w-7 h-7 text-purple-600" />,
              step: "02",
              title: "Complete Tasks",
              desc: "Browse available tasks, surveys, and bounties. Complete them and earn.",
            },
            {
              icon: <Wallet className="w-7 h-7 text-purple-600" />,
              step: "03",
              title: "Get Paid Weekly",
              desc: "Receive your earnings every Thursday in Naira or USDC.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl p-6 transition-all duration-200 hover:border-purple-400"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-3xl font-extrabold text-gray-200 dark:text-gray-700">
                  {item.step}
                </span>
              </div>
              <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* For Whom */}
      <SectionWrapper bg="white">
        <div className="text-center mb-12">
          <AccentBadge>Who It&apos;s For</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            Built for <span className="text-[#8b5cf6]">Everyone</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Users className="w-6 h-6" />,
              title: "For Members",
              desc: "Complete tasks, earn crypto bounties, participate in surveys and referrals.",
              features: ["Weekly payouts", "Crypto rewards", "Flexible tasks"],
            },
            {
              icon: <Briefcase className="w-6 h-6" />,
              title: "For Businesses",
              desc: "Post tasks, run campaigns, hire micro-influencers, and track engagement.",
              features: ["Real engagement", "Targeted reach", "Analytics dashboard"],
            },
            {
              icon: <Globe className="w-6 h-6" />,
              title: "For the Ecosystem",
              desc: "Bridging Web2 and Web3, making crypto rewards accessible to all Nigerians.",
              features: ["DeFi accessible", "Web3 integration", "No technical barriers"],
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl p-6 transition-all duration-200 hover:border-purple-400"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 text-purple-600">
                {item.icon}
              </div>
              <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                {item.desc}
              </p>
              <ul className="space-y-2">
                {item.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA */}
      <section className="bg-[#0a0a0a] dark:bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Start <span className="text-[#8b5cf6]">Earning</span>?
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto">
            Join 24,390 workers already earning on OgaPay every week.
          </p>
          {/* Avatar stack */}
          <div className="flex items-center justify-center gap-1 mt-6 mb-8">
            {["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"].map(
              (color, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center 
                    text-white text-xs font-bold"
                  style={{ backgroundColor: color, marginLeft: i > 0 ? "-12px" : "0" }}
                >
                  {["A", "B", "C", "D", "E"][i]}
                </div>
              )
            )}
            <span className="text-sm text-gray-400 ml-2">+24k members</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/about"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl 
                bg-white text-[#0a0a0a] font-semibold text-sm hover:bg-gray-100 transition-all duration-200"
            >
              Start Earning
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl 
                border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-all duration-200"
            >
              Create a Job
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Need these icons
function UserPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" x2="19" y1="8" y2="14"/>
      <line x1="22" x2="16" y1="11" y2="11"/>
    </svg>
  );
}
function ClipboardList(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="M12 11h4"/>
      <path d="M12 16h4"/>
      <path d="M8 11h.01"/>
      <path d="M8 16h.01"/>
    </svg>
  );
}
function Wallet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
      <circle cx="18" cy="15" r="1.5" fill="currentColor"/>
    </svg>
  );
}
