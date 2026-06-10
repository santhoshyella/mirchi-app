/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ['"DM Mono"', "ui-monospace", '"SF Mono"', "Menlo", "monospace"],
      },
      colors: {
        // Brand
        brand: {
          orange: "#f97316",
          "orange-hover": "#ea6c0c",
          navy: "#0f172a",
          "navy-700": "#1e293b",
          "navy-600": "#334155",
        },
        // Variety colors
        variety: {
          teja: "#f97316",
          334: "#3b82f6",
          341: "#10b981",
          no5: "#8b5cf6",
        },
        // Surfaces
        surface: {
          0: "#ffffff",
          1: "#f8fafc",
          2: "#f1f5f9",
          3: "#e2e8f0",
        },
        // Text
        ink: {
          0: "#0f172a",
          1: "#334155",
          2: "#64748b",
          3: "#94a3b8",
        },
        // Semantic
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
      },
      borderRadius: {
        "vv-sm": "6px",
        "vv-md": "10px",
        "vv-lg": "14px",
      },
    },
  },
  plugins: [],
};
