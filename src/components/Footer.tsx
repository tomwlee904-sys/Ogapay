import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

const footerLinks = {
  Company: [
    { href: "/about", label: "About Us" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ],
  Support: [
    { href: "/support", label: "Help Center" },
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-of-service", label: "Terms of Service" },
  ],
  Community: [
    { href: "#", label: "Telegram" },
    { href: "#", label: "WhatsApp" },
    { href: "#", label: "Twitter / X" },
    { href: "#", label: "Instagram" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#f0f0ff] dark:bg-[#0d0d1a] border-t border-gray-100 dark:border-[#2a2a3e]">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#0a0a0a] dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-[#0a0a0a] font-extrabold text-sm">O</span>
              </div>
              <span className="font-bold text-lg text-[#0a0a0a] dark:text-white">
                OgaPay
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              Nigeria&apos;s leading digital rewards and crypto bounty platform.
            </p>
            <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-500" />
                <span>support@ogapay.net</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                <span>Lagos, Nigeria</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm text-[#0a0a0a] dark:text-white mb-3 uppercase tracking-wider">
                {title}
              </h4>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 dark:text-gray-400 
                        hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-[#2a2a3e]">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            &copy; {new Date().getFullYear()} OgaPay. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
