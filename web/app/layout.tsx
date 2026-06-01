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
  metadataBase: new URL("https://jumplogs.com"),
  title: {
    default: "Jump Logs — The Skydiving Logbook App",
    template: "%s — Jump Logs",
  },
  description: "The modern skydiving logbook — track every jump, gear, currency and certification in one place. iOS & Android. Works offline.",
  keywords: [
    "skydiving logbook",
    "skydiving app",
    "jump log",
    "parachute logbook",
    "skydiving currency tracker",
    "gear tracking",
    "AAD repack",
    "reserve repack",
    "skydiving statistics",
    "USPA logbook",
    "APF logbook",
    "freefall time tracker",
  ],
  authors: [{ name: "Jump Logs", url: "https://jumplogs.com" }],
  creator: "Jump Logs",
  publisher: "Jump Logs",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [
      { url: "/logo/png/mark-on-dark-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/logo/png/mark-on-dark-64.png",  sizes: "64x64",   type: "image/png" },
      { url: "/logo/png/mark-on-dark-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: { url: "/logo/png/mark-on-dark-256.png", sizes: "256x256", type: "image/png" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://jumplogs.com",
    siteName: "Jump Logs",
    title: "Jump Logs — The Skydiving Logbook App",
    description: "The modern skydiving logbook — track every jump, gear, currency and certification in one place. iOS & Android. Works offline.",
    images: [{ url: "/social-og-1200x630.png", width: 1200, height: 630, alt: "Jump Logs — skydiving logbook app" }],
  },
  alternates: {
    canonical: "https://jumplogs.com",
  },
  category: "sports",
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
      <head>
        <link rel="me" href="https://www.instagram.com/jumplogs" />
      </head>
      <body className="antialiased">
        <ThemeApplier theme={theme} />
        {children}
      </body>
    </html>
  );
}
