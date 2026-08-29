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
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
        serif: ["Georgia", "Cambria", "serif"],
      },
      colors: {
        navy: {
          950: "#030814",
          900: "#061024",
          850: "#091733",
          800: "#0c1f42",
          700: "#132d5e",
          600: "#1b3c7b",
          500: "#244d99",
          400: "#3d6ab8",
          300: "#608cd6",
          200: "#9bb8ee",
          100: "#d5e2fa",
          50: "#eff4fd",
        },
        paper: {
          white: "#FFFFFF",
          cream: "#F8FAFC",
          mist: "#F1F5F9",
          border: "#D1DDEB",
          shadow: "rgba(6, 16, 36, 0.12)",
        },
      },
      boxShadow: {
        paper: "0 4px 20px -2px rgba(6, 16, 36, 0.08), 0 2px 6px -1px rgba(6, 16, 36, 0.04)",
        "paper-lg": "0 12px 32px -4px rgba(6, 16, 36, 0.14), 0 4px 12px -2px rgba(6, 16, 36, 0.06)",
        "paper-xl": "0 20px 45px -8px rgba(6, 16, 36, 0.18), 0 6px 16px -3px rgba(6, 16, 36, 0.08)",
        "paper-inset": "inset 0 2px 4px 0 rgba(6, 16, 36, 0.06)",
        "navy-glow": "0 0 20px 2px rgba(19, 45, 94, 0.35)",
        "white-glow": "0 0 18px 4px rgba(255, 255, 255, 0.45)",
      },
      keyframes: {
        "pulse-navy": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(19, 45, 94, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(19, 45, 94, 0)" },
        },
        "pulse-paper-white": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 255, 255, 0.7)" },
          "50%": { boxShadow: "0 0 0 10px rgba(255, 255, 255, 0)" },
        },
        "crease-shimmer": {
          "0%": { opacity: "0.85" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.85" },
        },
        "paper-flash": {
          "0%": { transform: "scale(1)", filter: "brightness(1)" },
          "25%": { transform: "scale(1.02)", filter: "brightness(1.2)" },
          "50%": { transform: "scale(0.99)", filter: "brightness(1.1)" },
          "75%": { transform: "scale(1.01)", filter: "brightness(1.15)" },
          "100%": { transform: "scale(1)", filter: "brightness(1)" },
        },
      },
      animation: {
        "pulse-navy": "pulse-navy 2s infinite",
        "pulse-paper-white": "pulse-paper-white 2s infinite",
        "crease-shimmer": "crease-shimmer 3s ease-in-out infinite",
        "paper-flash": "paper-flash 0.6s ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
