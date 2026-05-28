import { Target, Eye, Users, Briefcase, Globe, Shield, Unlock, Lightbulb, Heart, CheckCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import AccentBadge from "@/components/AccentBadge";
import StatCard from "@/components/StatCard";
import Divider from "@/components/Divider";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About → OgaPay"
        accentWord="OgaPay"
        subtitle="Empowering Individuals and Businesses Across Africa's Digital Economy"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      {/* Who We Are */}
      <SectionWrapper bg="white">
        <AccentBadge>Our Story</AccentBadge>
        <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4 mb-6">
          Built for Africa&apos;s <span className="text-[#8b5cf6]">Digital</span> Generation
        </h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          OgaPay is a next-generation digital rewards platform founded in 2024 in Nigeria, connecting
          brands with members who earn through tasks, crypto bounties, and engagement campaigns.
        </p>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
          We were built on a simple but powerful belief — that everyone deserves access to meaningful,
          flexible, and rewarding earning opportunities in the digital economy.
        </p>
      </SectionWrapper>

      {/* Stats Row */}
      <section className="bg-white dark:bg-[#0a0a0a] -mt-8 pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard number="24,390" label="Active Members" />
            <StatCard number="NGN 182M+" label="Rewards Distributed" />
            <StatCard number="4,821" label="Active Jobs" />
          </div>
        </div>
      </section>

      {/* Mission and Vision */}
      <SectionWrapper bg="lavender">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mission */}
          <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-2xl p-6">
            <AccentBadge>Mission</AccentBadge>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mt-4 mb-4">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0a0a0a] dark:text-white mb-3">Our Mission</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              To empower individuals and businesses by providing a trusted, transparent, and accessible
              platform for earning, engagement, and growth — bridging traditional digital marketing with
              the future of decentralized finance.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-2xl p-6">
            <AccentBadge>Vision</AccentBadge>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mt-4 mb-4">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0a0a0a] dark:text-white mb-3">Our Vision</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              To become Africa&apos;s most trusted rewards and engagement platform, where every online
              action creates real value for both individuals and the businesses they support.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* What We Do */}
      <SectionWrapper bg="white">
        <div className="text-center mb-12">
          <AccentBadge>What We Do</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            One Platform, Three <span className="text-[#8b5cf6]">Powerful</span> Benefits
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Users className="w-7 h-7" />,
              num: "01",
              title: "For Members",
              desc: "Complete tasks, earn crypto bounties, participate in surveys and referrals. Get paid every Thursday in Naira or USDC.",
            },
            {
              icon: <Briefcase className="w-7 h-7" />,
              num: "02",
              title: "For Businesses",
              desc: "Post tasks, run campaigns, hire micro-influencers, and track engagement results in real time.",
            },
            {
              icon: <Globe className="w-7 h-7" />,
              num: "03",
              title: "For the Ecosystem",
              desc: "Bridging Web2 and Web3, making crypto rewards accessible to every Nigerian regardless of technical background.",
            },
          ].map((item) => (
            <div
              key={item.num}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl p-6 transition-all duration-200 hover:border-purple-400 relative"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 text-purple-600">
                {item.icon}
              </div>
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-gray-100 dark:text-gray-800">
                {item.num}
              </span>
              <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Core Values */}
      <SectionWrapper bg="lavender">
        <div className="text-center mb-12">
          <AccentBadge>Our Values</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            What We <span className="text-[#8b5cf6]">Stand</span> For
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: <Eye className="w-5 h-5" />, title: "Transparency", desc: "We believe in open, honest operations. Every task, payout, and policy is clearly communicated to our community." },
            { icon: <Shield className="w-5 h-5" />, title: "Integrity", desc: "We uphold the highest ethical standards. Our platform is built on trust, fairness, and accountability." },
            { icon: <Unlock className="w-5 h-5" />, title: "Accessibility", desc: "We make earning opportunities available to everyone, regardless of technical background or experience." },
            { icon: <Lightbulb className="w-5 h-5" />, title: "Innovation", desc: "We are committed to continuous improvement, leveraging Web3 technology to create new earning possibilities." },
            { icon: <Heart className="w-5 h-5" />, title: "Community", desc: "Our members are at the heart of everything we do. We build together, grow together, and succeed together." },
            { icon: <CheckCircle className="w-5 h-5" />, title: "Reliability", desc: "Consistent weekly payouts, dependable platform performance, and a team that shows up every day." },
          ].map((value) => (
            <div
              key={value.title}
              className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-xl p-5 transition-all duration-200 hover:border-purple-400"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 text-purple-600">
                {value.icon}
              </div>
              <h3 className="font-bold text-[#0a0a0a] dark:text-white mb-1">{value.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{value.desc}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Why OgaPay */}
      <SectionWrapper bg="white">
        <div className="text-center mb-12">
          <AccentBadge>Why OgaPay</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            Built <span className="text-[#8b5cf6]">Different</span>
          </h2>
        </div>
        <div className="space-y-8">
          {[
            { title: "Verified Task Listings", desc: "All tasks reviewed before going live" },
            { title: "Reliable Weekly Payouts", desc: "Every Thursday, Net-7, Naira or USDC" },
            { title: "Web3 and Crypto Integration", desc: "Bounties, airdrops, token rewards" },
            { title: "Real Business Results", desc: "Genuine engagement, not bots" },
            { title: "AI-Powered Review System", desc: "Fast, fair, fraud-resistant task review" },
          ].map((item, i) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Journey Timeline */}
      <SectionWrapper bg="lavender">
        <div className="text-center mb-12">
          <AccentBadge>Our Journey</AccentBadge>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0a0a] dark:text-white mt-4">
            How We Got <span className="text-[#8b5cf6]">Here</span>
          </h2>
        </div>
        <div className="space-y-8 max-w-2xl mx-auto">
          {[
            { year: "2024", title: "Founded in Nigeria" },
            { year: "2024", title: "Platform development and beta testing with early members" },
            { year: "2025", title: "Public launch; thousands of members in first months" },
            { year: "2025", title: "Crypto bounties, airdrops, and Member+ plan launched" },
            { year: "2026", title: "AI-powered task review system deployed; African market expansion begins" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                {i < 4 && <div className="w-0.5 h-12 bg-purple-200 dark:bg-purple-800" />}
              </div>
              <div className="flex-1 pb-4">
                <span className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 
                  text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
                  {item.year}
                </span>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* CTA Banner */}
      <section className="bg-[#0a0a0a] dark:bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Start <span className="text-[#8b5cf6]">Earning</span>?
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto">
            Join 24,390 workers already earning on OgaPay every week.
          </p>
          <div className="flex items-center justify-center gap-1 mt-6 mb-8">
            {["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"].map((color, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center 
                  text-white text-xs font-bold"
                style={{ backgroundColor: color, marginLeft: i > 0 ? "-12px" : "0" }}
              >
                {["A", "B", "C", "D", "E"][i]}
              </div>
            ))}
            <span className="text-sm text-gray-400 ml-2">+24k members</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/"
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
