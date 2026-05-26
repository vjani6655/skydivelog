import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import ThemeApplier from "@/components/ThemeApplier";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jump Logs",
  description: "The modern skydiving logbook — track every jump, anywhere.",
  icons: {
    icon: [
      { url: "/logo/png/mark-on-dark-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/logo/png/mark-on-dark-64.png",  sizes: "64x64",   type: "image/png" },
      { url: "/logo/png/mark-on-dark-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: { url: "/logo/png/mark-on-dark-256.png", sizes: "256x256", type: "image/png" },
  },
  openGraph: {
    title: "Jump Logs",
    description: "The modern skydiving logbook — track every jump, anywhere.",
    images: [{ url: "/social-og-1200x630.png", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get("pref_theme")?.value ?? "dark") as "dark" | "light" | "system"
  const htmlClass = [theme === "light" ? "light" : "", interTight.variable, jetbrainsMono.variable].filter(Boolean).join(" ")

  return (
    <html lang="en" className={htmlClass}>
      <body className="antialiased">
        <ThemeApplier theme={theme} />
        {children}
      </body>
    </html>
  );
}
