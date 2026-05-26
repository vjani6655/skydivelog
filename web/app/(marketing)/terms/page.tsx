export default function TermsPage() {
  const sections = [
    {
      id: "account",
      title: "Your account",
      content: "You are responsible for keeping your login credentials secure. You must be at least 16 years old to use Jump Logs. You may not use the service for any unlawful purpose.",
    },
    {
      id: "subscription",
      title: "Subscription",
      content: "Jump Logs Pro is billed annually at $12 USD. Your subscription renews automatically. You can cancel at any time from your account settings. No refunds are issued for the remaining period of a cancelled subscription, but you retain access until the period ends.",
    },
    {
      id: "accuracy",
      title: "Accuracy",
      content: "Jump Logs is a logbook tool, not an official record. It is your responsibility to ensure the accuracy of your logged data. We are not responsible for errors in jump counts, currency calculations, or equipment records.",
    },
    {
      id: "use",
      title: "Use of the service",
      content: "You may not attempt to reverse-engineer, scrape, or disrupt the service. You may not upload content that violates any law or third-party rights. We reserve the right to suspend accounts that violate these terms.",
    },
    {
      id: "liability",
      title: "Limitation of liability",
      content: "Jump Logs is provided as-is. We are not liable for any damages arising from your use of the service, including but not limited to data loss, errors in calculations, or service interruption.",
    },
    {
      id: "law",
      title: "Governing law",
      content: "These terms are governed by the laws of Australia. Any disputes will be resolved in Australian courts.",
    },
  ]

  return (
    <>
      <section
        className="pt-16 pb-10 px-5 border-b border-border"
        style={{ background: "radial-gradient(ellipse at 50% -10%, #132A50 0%, #0A1220 60%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-3">Legal</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight">Terms of service</h1>
          <p className="text-sm text-fg-4 mt-2">Last updated: January 2025</p>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <nav className="hidden md:block space-y-1.5">
            {sections.map(({ id, title }) => (
              <a key={id} href={`#${id}`} className="block text-xs text-fg-4 hover:text-fg transition-colors py-0.5">
                {title}
              </a>
            ))}
          </nav>

          <div className="md:col-span-3 space-y-8">
            {sections.map(({ id, title, content }) => (
              <div key={id} id={id}>
                <h2 className="text-base font-semibold text-fg mb-2">{title}</h2>
                <p className="text-sm text-fg-3 leading-relaxed">{content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
