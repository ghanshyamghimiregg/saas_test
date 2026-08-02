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
      },
      colors: {
        accent: {
          DEFAULT: "#4f46e5",   // indigo-600
          hover: "#4338ca",
          light: "#eef2ff",
        },
        surface: "#f8fafc",
        border: "#e2e8f0",
      },
    },
  },
  plugins: [],
};
export default config;
