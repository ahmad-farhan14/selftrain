import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#090D16",
        panel: "#111722",
        line: "#222B38",
        muted: "#8C96A8",
        emerald: "#31D69A",
      },
    },
  },
  plugins: [],
};

export default config;
