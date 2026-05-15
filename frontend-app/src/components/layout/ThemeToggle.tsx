"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-14 h-7" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
        isDark ? "bg-[#a7a66c]" : "bg-[#e2e2df]"
      }`}
      aria-label="Toggle dark mode"
    >
      {/* Track icons */}
      <span className="absolute left-1.5 text-[11px]">☀️</span>
      <span className="absolute right-1.5 text-[11px]">🌙</span>

      {/* Thumb */}
      <span
        className={`inline-block size-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 z-10 ${
          isDark ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
