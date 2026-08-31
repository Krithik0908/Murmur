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
        sans: ["Nohemi", "Arial", "sans-serif"],
      },
      colors: {
        murmur: {
          bg: "#000000",
          surface: "#1e1c26",
          accent: "#9a8afb",
          text: "#ffffff",
          secondary: "#eaeaf0",
          tertiary: "#a49db5",
          muted: "#767676",
          done: "#46c17d",
          stale: "#d6a94f",
        },
      },
      transitionDuration: {
        250: "250ms",
        300: "300ms",
        500: "500ms",
      },
      borderRadius: {
        3: "3px",
        9: "9px",
        12: "12px",
        16: "16px",
        20: "20px",
        24: "24px",
      },
    },
  },
  plugins: [],
};

export default config;
