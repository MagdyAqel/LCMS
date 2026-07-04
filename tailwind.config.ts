import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Tajawal",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#17202A",
        "learning-blue": "#2563EB",
        "learning-green": "#10B981",
        "learning-gold": "#F59E0B",
        "learning-red": "#EF4444",
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(23, 32, 42, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
