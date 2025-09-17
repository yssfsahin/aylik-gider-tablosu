// apps/web/tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#6b7280",
        card: "#ffffff",
        bg: "#0f172a",
        brand: "#4f46e5",
      },
      borderRadius: { xl: "16px" },
      boxShadow: { soft: "0 10px 30px -12px rgba(0,0,0,0.25)" },
    },
  },
  plugins: [],
};