import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ogadark: "#0F0F0F",
        ogaviolet: "#7C3AED",
        ogagreen: "#10B981"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(124,58,237,0.35)"
      }
    }
  },
  plugins: []
} satisfies Config;
