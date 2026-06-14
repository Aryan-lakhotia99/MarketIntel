import type { Config } from "tailwindcss";

/**
 * Tailwind v4 uses CSS-first config in src/app/globals.css (@theme, @utility).
 * This file documents the design system and ensures IDE tooling picks up paths.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          strong: "rgba(15, 23, 42, 0.4)",
          border: "rgba(255, 255, 255, 0.1)",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glow-emerald": "0 0 20px rgba(52, 211, 153, 0.25)",
        "glow-rose": "0 0 20px rgba(244, 63, 94, 0.25)",
        "glow-indigo": "0 0 30px rgba(99, 102, 241, 0.15)",
      },
      backdropBlur: {
        glass: "16px",
        "glass-lg": "24px",
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
