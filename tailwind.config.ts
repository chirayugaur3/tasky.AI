import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0D0D14",
          primary: "#0D0D14",
          surface: "#13131E",
          elevated: "#1C1C2E",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          subtle: "rgba(255,255,255,0.06)",
          default: "rgba(255,255,255,0.10)",
        },
        text: {
          DEFAULT: "#EEEEF5",
          primary: "#EEEEF5",
          secondary: "#7878A0",
          disabled: "#3D3D55",
        },
        accent: {
          DEFAULT: "#7B6EF6",
          primary: "#7B6EF6",
          hover: "#9B8FF8",
          subtle: "rgba(123,110,246,0.12)",
        },
        status: {
          success: "rgba(74,222,128,0.9)",
          warning: "rgba(251,146,60,0.9)",
          danger: "rgba(248,113,113,0.9)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "meta": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "body": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "ui": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "section": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "stat": ["28px", { lineHeight: "32px", fontWeight: "700" }],
        "hero": ["36px", { lineHeight: "40px", fontWeight: "700" }],
      },
      letterSpacing: {
        "wordmark": "0.2em",
        "section": "0.1em",
      },
      borderRadius: {
        chip: "4px",
        button: "6px",
        card: "8px",
        modal: "12px",
      },
      boxShadow: {
        modal: "0 24px 48px rgba(0,0,0,0.4)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "slide-in-right": "slide-in-right 200ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
