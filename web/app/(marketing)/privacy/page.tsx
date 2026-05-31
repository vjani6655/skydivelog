import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — Jump Logs",
  description: "Privacy Policy for Jump Logs, the skydiving logbook app.",
}

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: `Jump Logs ("we", "us", "our") is operated by an individual developer based in Australia. We are committed to protecting your personal information and being transparent about what we collect and why.

This policy applies to the Jump Logs mobile app and website (jumplogs.com). By using the service, you agree to this Privacy Policy.`,
  },
  {
    id: "collect",
    title: "What we collect",
    content: `We collect only what is necessary to provide the service:

Account information: Your name, email address, and password (stored as a secure hash). Optionally, your skydiving licence number and rating.

Logbook data: Jump records you create — including date, dropzone, aircraft, altitude, freefall time, gear, disciplines, notes, and any other fields you choose to fill in.

Equipment & certification records: Gear details, repack dates, certification records, and medical information you enter.

Server logs: Standard web server access logs (IP address, timestamp, HTTP method, response code) retained for security and debugging. These are not linked to your personal account data and are not used for product analytics.

Push notification token: If you enable push notifications, we store your device token to send you reminders (e.g. currency expiry, repack due). You can disable notifications at any time.

Payment information: Processed entirely by Stripe. We never see or store your full card number. We receive a payment confirmation and subscription status from Stripe.`,
  },
  {
    id: "use",
    title: "How we use your data",
    content: `Your data is used exclusively to:
• Operate your logbook and compute statistics (jump counts, freefall time, currency windows, equipment intervals)
• Send you reminders and notifications you have opted into
• Process your subscription payments via Stripe
• Provide customer support when you contact us
• Investigate security incidents or terms violations

We do not use your data for advertising. We do not build profiles for sale. We do not use your jump or equipment data for any purpose other than providing the service to you.`,
  },
  {
    id: "share",
    title: "Who we share data with",
    content: `We share your data with the minimum number of third parties required to operate:

Supabase (supabase.com) — Our database and authentication provider, hosted on AWS infrastructure. Your data is stored in Supabase's managed PostgreSQL database. Supabase is SOC 2 compliant and GDPR-compliant.

Stripe (stripe.com) — Payment processing. Stripe receives your payment card details and billing information. We only receive a subscription status confirmation. Stripe is PCI DSS Level 1 certified.

Resend (resend.com) — Transactional email delivery (e.g. confirmation emails, support replies). We share your email address and the content of transactional messages only.

Expo / Apple / Google — The mobile app is distributed via Expo, Apple App Store, and Google Play Store. These platforms may collect standard device and analytics data under their own privacy policies.

We do not sell your data to any third party. We do not share your personal information or logbook data with any party not listed above.`,
  },
  {
    id: "retention",
    title: "Data retention",
    content: `Your account and logbook data are retained for as long as your account is active. If you delete your account, your personal data and logbook records are permanently deleted within 30 days, subject to any legal obligations to retain records.

We may retain anonymised, aggregated statistics (e.g. total jumps logged across the platform) indefinitely, as these cannot be used to identify you.`,
  },
  {
    id: "security",
    title: "Security",
    content: `We implement reasonable technical and organisational measures to protect your data, including:
• Encrypted connections (HTTPS/TLS) for all data in transit
• Row-level security on all database tables (users can only access their own records)
• Password storage using secure hashing (handled by Supabase Auth)
• Regular security reviews

No system is completely secure. We cannot guarantee absolute security. If you become aware of a security issue, please contact us at support@jumplogs.com.`,
  },
  {
    id: "rights",
    title: "Your rights",
    content: `You have the following rights regarding your personal data:

Access & export: You can export all your jump records, gear, and certifications at any time in PDF or CSV format from the logbook page. This export is always available, even after cancelling a subscription.

Correction: You can edit any of your data directly within the app.

Deletion: You can delete your account and all associated data from Settings in the app or by contacting support@jumplogs.com. Deletion is permanent and irreversible.

Portability: Your data export includes all structured logbook data in a portable format.

If you are in the European Economic Area, you may also have rights under GDPR (including the right to lodge a complaint with your supervisory authority). If you are in Australia, the Australian Privacy Act 1988 may apply.

To exercise any of these rights, contact support@jumplogs.com.`,
  },
  {
    id: "cookies",
    title: "Cookies & tracking",
    content: `We use a single session cookie for authentication (to keep you logged in). This cookie is essential for the service to function and is not used for advertising or tracking.

We do not use advertising cookies, cross-site tracking, or third-party analytics trackers. We do not use Google Analytics or any equivalent service.`,
  },
  {
    id: "children",
    title: "Children",
    content: `Jump Logs is not directed at children under 16. We do not knowingly collect personal information from anyone under 16. If you believe a child under 16 has created an account, contact us at support@jumplogs.com and we will delete the account.`,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of material changes by updating the "Last updated" date and, where appropriate, by sending a notice to your registered email address. Continued use of the service after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    id: "contact-privacy",
    title: "Contact",
    content: `For privacy questions, data requests, or complaints, contact us at support@jumplogs.com. We aim to respond within 5 business days.`,
  },
]

export default function PrivacyPage() {
  return (
    <>
      <section
        className="pt-16 pb-10 px-5 border-b border-border"
        style={{ background: "radial-gradient(ellipse at 50% -10%, #132A50 0%, #0A1220 60%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="font-mono text-[10px] font-semibold tracking-widest uppercase text-fg-4 mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-fg tracking-tight">Privacy policy</h1>
          <p className="text-sm text-fg-4 mt-2">Last updated: May 2026 &nbsp;·&nbsp; <Link href="/terms" className="hover:text-fg transition-colors">Terms of Service</Link></p>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <nav className="hidden md:block space-y-1.5 sticky top-20 self-start">
            {sections.map(({ id, title }) => (
              <a key={id} href={`#${id}`} className="block text-xs text-fg-4 hover:text-fg transition-colors py-0.5">
                {title}
              </a>
            ))}
          </nav>

          <div className="md:col-span-3 space-y-10">
            {sections.map(({ id, title, content }) => (
              <div key={id} id={id}>
                <h2 className="text-base font-semibold text-fg mb-2">{title}</h2>
                <p className="text-sm text-fg-3 leading-relaxed whitespace-pre-line">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
