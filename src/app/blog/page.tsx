"use client";

import { useState } from "react";
import { ArrowRight, ChevronRight, BookOpen, FileText } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SectionWrapper from "@/components/SectionWrapper";
import AccentBadge from "@/components/AccentBadge";

const categories = [
  "All",
  "Getting Started",
  "Earning Tips",
  "Crypto & Web3",
  "Platform Insights",
  "For Advertisers",
  "Payouts & Finance",
  "Digital Marketing",
  "Community Stories",
];

const articles = [
  {
    category: "Getting Started",
    title: "Getting Started on OgaPay: A Complete Beginner's Guide",
    excerpt: "Everything you need to know to hit the ground running — from choosing the right plan to your first payout.",
    date: "January 2025",
    readTime: "5 min read",
    featured: true,
  },
  {
    category: "Crypto & Web3",
    title: "Crypto Bounties Explained: How to Earn Tokens on OgaPay",
    excerpt: "Learn what crypto bounties are, how they work, and how to get your submissions approved every time.",
    date: "February 2025",
    readTime: "7 min read",
  },
  {
    category: "Platform Insights",
    title: "How OgaPay is Bridging Web2 and Web3 for Everyday Nigerians",
    excerpt: "How OgaPay makes both traditional online earning and the decentralized economy accessible to everyday Africans.",
    date: "March 2025",
    readTime: "6 min read",
  },
  {
    category: "Earning Tips",
    title: "10 Tips to Get Your OgaPay Submissions Approved Every Time",
    excerpt: "Avoid unnecessary rejections with these 10 practical strategies from our review team.",
    date: "April 2025",
    readTime: "4 min read",
  },
  {
    category: "For Advertisers",
    title: "OgaPay for Businesses: How to Run a Successful Engagement Campaign",
    excerpt: "A step-by-step guide for brands on setting up campaigns, writing task briefs, and measuring ROI.",
    date: "May 2025",
    readTime: "8 min read",
  },
  {
    category: "Payouts & Finance",
    title: "Understanding OgaPay Payouts: Everything About Thursday Payments",
    excerpt: "Full visibility into how OgaPay processes and releases member earnings every Thursday.",
    date: "June 2025",
    readTime: "5 min read",
  },
  {
    category: "Digital Marketing",
    title: "The Rise of Micro-Influencer Marketing in Nigeria",
    excerpt: "How OgaPay connects brands with a vetted community of creators ready to promote with genuine enthusiasm.",
    date: "July 2025",
    readTime: "6 min read",
  },
];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const featuredArticle = articles.find((a) => a.featured);
  const filteredArticles = articles.filter(
    (a) => activeCategory === "All" || a.category === activeCategory
  );

  return (
    <>
      <PageHeader
        title="OgaPay → Blog"
        accentWord="Blog"
        subtitle="Insights, Updates, and Guides from the OgaPay Team"
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      {/* Featured Article */}
      <SectionWrapper bg="lavender">
        {featuredArticle && (
          <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AccentBadge>Featured</AccentBadge>
                  <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {featuredArticle.category}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#0a0a0a] dark:text-white leading-tight mb-4">
                  {featuredArticle.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  {featuredArticle.excerpt}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-6">
                  <span>{featuredArticle.date}</span>
                  <span>·</span>
                  <span>{featuredArticle.readTime}</span>
                </div>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl 
                  bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a] 
                  font-semibold text-sm hover:opacity-90 transition-all duration-200">
                  Read Article
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden md:flex items-center justify-center bg-purple-100 dark:bg-purple-900/20 rounded-xl h-64">
                <BookOpen className="w-16 h-16 text-purple-300 dark:text-purple-600" />
              </div>
            </div>
          </div>
        )}
      </SectionWrapper>

      {/* Category Filter */}
      <SectionWrapper bg="white">
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-[#0a0a0a] dark:bg-white text-white dark:text-[#0a0a0a]"
                    : "border border-gray-200 dark:border-[#2a2a3e] text-gray-600 dark:text-gray-400 hover:border-purple-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Article Grid */}
      <SectionWrapper bg="white" className="-mt-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div
              key={article.title}
              className="group bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e] 
                rounded-2xl overflow-hidden transition-all duration-200 
                hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* Accent bar */}
              <div className="h-1 bg-purple-500" />
              <div className="p-5">
                <span className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 
                  text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3">
                  {article.category}
                </span>
                <h3 className="font-bold text-lg text-[#0a0a0a] dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readTime}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-purple-500 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Newsletter Banner */}
      <section className="bg-[#0a0a0a] dark:bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Never Miss an <span className="text-[#8b5cf6]">Update</span>
          </h2>
          <p className="mt-4 text-gray-400 max-w-lg mx-auto mb-8">
            Weekly articles, platform news, and earning tips straight to your inbox.
          </p>
          {subscribed ? (
            <p className="text-green-400 font-medium">You&apos;re subscribed! ✓</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setSubscribed(true);
              }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white text-[#0a0a0a] 
                  placeholder-gray-400 focus:outline-none text-sm"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold text-sm 
                  hover:bg-purple-700 transition-all duration-200"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
