import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                wealth: {
                    primary: "#2563EB", // Royal Blue
                    light: "#60A5FA",   // Lighter Blue
                    dark: "#1E40AF",    // Darker Blue
                },
                dark: {
                    DEFAULT: "#000000",
                    secondary: "#111111",
                    tertiary: "#1a1a1a",
                    card: "#0a0a0a",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            backgroundImage: {
                "wealth-gradient": "linear-gradient(135deg, #2563EB 0%, #60A5FA 50%, #2563EB 100%)",
                "dark-gradient": "radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%)",
            },
            boxShadow: {
                "wealth": "0 0 20px rgba(37, 99, 235, 0.3)",
                "wealth-lg": "0 0 40px rgba(37, 99, 235, 0.4)",
                "wealth-glow": "0 0 60px rgba(96, 165, 250, 0.2)",
            },
            animation: {
                "shimmer": "shimmer 2s linear infinite",
                "pulse-wealth": "pulse-wealth 2s ease-in-out infinite",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "pulse-wealth": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(37, 99, 235, 0.3)" },
                    "50%": { boxShadow: "0 0 40px rgba(96, 165, 250, 0.5)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
