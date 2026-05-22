import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        "glow-violet": "0 0 20px rgba(124, 58, 237, 0.25)",
        "glow-violet-sm": "0 0 10px rgba(124, 58, 237, 0.18)",
      },
      colors: {
        cinema: {
          bg: "#09090b",
          surface: "#18181b",
          card: "#1c1c20",
          border: "#27272a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
