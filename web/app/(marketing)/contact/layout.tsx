import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Jump Logs for support, billing questions, bug reports, or feature requests. We're here to help.",
  alternates: { canonical: "https://jumplogs.com/contact" },
  openGraph: {
    url: "https://jumplogs.com/contact",
    title: "Contact — Jump Logs",
    description: "Get in touch with the Jump Logs team for support, billing, or anything else.",
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
