import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./agents/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        bg: {
          base: "#030711",
          card: "#0d1117",
          elevated: "#161b22",
          border: "#21262d",
        },
        status: {
          idle: "#4b5563",
          running: "#3b82f6",
          done: "#22c55e",
          stale: "#f59e0b",
          rerunning: "#f59e0b",
        },
      },
      keyframes: {
        "pulse-glow-blue": {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(59,130,246,0.3)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(59,130,246,0.6)" },
        },
        "pulse-glow-amber": {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(245,158,11,0.3)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(245,158,11,0.6)" },
        },
        "pulse-glow-green": {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(34,197,94,0.2)" },
          "50%": { boxShadow: "0 0 16px 4px rgba(34,197,94,0.4)" },
        },
        "flash-card": {
          "0%": { opacity: "1" },
          "25%": { opacity: "0.4" },
          "50%": { opacity: "1" },
          "75%": { opacity: "0.4" },
          "100%": { opacity: "1" },
        },
        "arrow-flow": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-blue": "pulse-glow-blue 2s ease-in-out infinite",
        "pulse-amber": "pulse-glow-amber 1.5s ease-in-out infinite",
        "pulse-green": "pulse-glow-green 3s ease-in-out infinite",
        "flash-card": "flash-card 0.6s ease-in-out",
        "arrow-flow": "arrow-flow 0.8s ease-in-out forwards",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
