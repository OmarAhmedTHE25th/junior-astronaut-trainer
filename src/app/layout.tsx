import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Junior Astronaut Mission Trainer | NASA Space Apps 2026",
  description:
    "Can you survive 30 sols on Mars? A turn-based Mars outpost survival game for kids, powered by real NASA data.",
  keywords: [
    "NASA",
    "Space Apps",
    "Mars",
    "game",
    "education",
    "kids",
    "STEM",
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-space-navy text-starlight">
        {children}
      </body>
    </html>
  );
}
