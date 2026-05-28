"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative w-9 h-9 flex items-center justify-center rounded-full 
        bg-gray-100 dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#2a2a3e]
        transition-all duration-200 hover:border-purple-400"
      aria-label="Toggle dark mode"
    >
      <Sun
        className={`w-4 h-4 text-amber-500 transition-all duration-300 ${
          isDark ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"
        }`}
      />
      <Moon
        className={`w-4 h-4 text-purple-400 transition-all duration-300 ${
          !isDark ? "opacity-0 scale-0 absolute" : "opacity-100 scale-100"
        }`}
      />
    </button>
  );
}
