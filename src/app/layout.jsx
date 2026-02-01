'use client';

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});

export default function RootLayout({ children }) {
    return (
        <html lang="th" className="scroll-smooth">
            <head>
                <title>Wealthiness Registry | VIP Member Registration</title>
                <meta name="description" content="Register for exclusive 7-Day VIP Access to Wealthiness trading community." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </head>
            <body className={`${inter.variable} antialiased bg-background text-foreground`}>
                {children}
            </body>
        </html>
    );
}
