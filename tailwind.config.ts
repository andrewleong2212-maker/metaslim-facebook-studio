import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#F4F7FF", 100: "#E3EAFD", 200: "#CBD7FA", 300: "#9FB1ED", 400: "#7188DB", 500: "#5068D0", 600: "#4058C8", 700: "#3347AA", 800: "#293985", 900: "#222F68", 950: "#131B3F" },
        ink: "#18213F",
        mist: "#F5F7FC",
        warm: "#FFFDFC"
      },
      boxShadow: { soft: "0 14px 40px rgba(38, 58, 126, 0.08)" },
      borderRadius: { "2xl": "1.125rem" }
    }
  },
  plugins: []
} satisfies Config;
