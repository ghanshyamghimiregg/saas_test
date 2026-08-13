import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Brand accent — indigo, used ONLY for actions and active states
        accent: {
          DEFAULT: "#4f46e5",
          hover:   "#4338ca",
          light:   "#eef2ff",
        },
        // Page surfaces
        surface: "#f9fafb",   // cool off-white paper
        canvas:  "#f1f5f9",   // toolbar / table-header background
        // Borders
        border:  "#e2e8f0",
        // Ink scale
        ink: {
          DEFAULT: "#0f172a",  // primary text
          muted:   "#475569",  // secondary labels
          faint:   "#94a3b8",  // placeholder / disabled text
        },
        // Signal colors — state only, never decoration
        signal: {
          green:  "#16a34a",
          red:    "#dc2626",
          amber:  "#d97706",
        },
      },
      borderRadius: {
        // Precision instrument feel — not "friendly SaaS app"
        card:   "0.5rem",   // 8px
        input:  "0.375rem", // 6px
        badge:  "0.25rem",  // 4px
      },
      boxShadow: {
        // Subtle elevation only — flat-first
        card:   "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        modal:  "0 20px 40px -8px rgb(0 0 0 / 0.18), 0 8px 16px -4px rgb(0 0 0 / 0.10)",
        popover:"0 4px 12px -2px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.08)",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "scale(0.97) translateY(4px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to:   { opacity: "0", transform: "translateY(8px)" },
        },
        "spin": {
          to: { transform: "rotate(360deg)" },
        },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%":      { transform: "scale(1.06)" },
        },
      },
      animation: {
        "fade-in":     "fade-in 150ms ease-out",
        "modal-in":    "modal-in 150ms ease-out",
        "toast-in":    "toast-in 150ms ease-out",
        "toast-out":   "toast-out 150ms ease-out forwards",
        "spin":        "spin 700ms linear infinite",
        "pulse-scale": "pulse-scale 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
