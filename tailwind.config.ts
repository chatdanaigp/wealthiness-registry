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
                gold: {
                    primary: "#D4AF37",
                    light: "#FFD700",
                    dark: "#B8860B",
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
                "gold-gradient": "linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)",
                "dark-gradient": "radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%)",
            },
            boxShadow: {
                "gold": "0 0 20px rgba(212, 175, 55, 0.3)",
                "gold-lg": "0 0 40px rgba(212, 175, 55, 0.4)",
                "gold-glow": "0 0 60px rgba(255, 215, 0, 0.2)",
            },
            animation: {
                "shimmer": "shimmer 2s linear infinite",
                "pulse-gold": "pulse-gold 2s ease-in-out infinite",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "pulse-gold": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" },
                    "50%": { boxShadow: "0 0 40px rgba(255, 215, 0, 0.5)" },
                },
            },
        },
    },
    plugins: [],
};

export default config;
