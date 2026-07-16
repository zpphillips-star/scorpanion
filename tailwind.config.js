/** @type {import('tailwindcss').Config} */
// NOTE: Tailwind CSS v4 uses CSS-first configuration via @theme in globals.css.
// This file documents the brand color tokens and is referenced via @config if needed.
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "bg-base":     "#0a0a0f",
        "bg-surface":  "#12121a",
        "bg-elevated": "#1c1c28",
        "bg-subtle":   "#242433",

        "border-subtle":  "#1e1e2e",
        "border-default": "#2a2a3f",
        "border-strong":  "#3a3a55",

        accent:       "#00d4ff",
        "accent-dim": "#00a8cc",
        "accent-muted": "#003d4d",

        "text-primary":   "#f0f0f8",
        "text-secondary": "#9090b0",
        "text-tertiary":  "#5a5a7a",

        "status-win":       "#22c55e",
        "status-loss":      "#ef4444",
        "status-live":      "#00d4ff",
        "status-final":     "#5a5a7a",
        "status-upcoming":  "#9090b0",
        "status-postponed": "#f59e0b",
      },
      fontFamily: {
        display: ["var(--font-barlow)", "Barlow Condensed", "system-ui", "sans-serif"],
        body:    ["var(--font-inter)",  "Inter",            "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
