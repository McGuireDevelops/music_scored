import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        sidebar: {
          DEFAULT: "var(--color-sidebar, #1D0D37)",
          hover: "var(--color-sidebar-hover, #2A1247)",
          active: "var(--color-sidebar-active, #3D1E5C)",
        },
        primary: {
          DEFAULT: "var(--color-primary, #6366F1)",
          light: "var(--color-primary-light, #818CF8)",
          dark: "var(--color-primary-dark, #4F46E5)",
        },
        surface: {
          light: "#F8F9FA",
          card: "#FFFFFF",
        },
        report: {
          success: "#22C55E",
          warning: "#F59E0B",
          error: "#EF4444",
          info: "#3B82F6",
          pending: "#64748B",
        },
      },
      borderRadius: {
        card: "0.5rem",
        button: "0.75rem",
        input: "0.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
