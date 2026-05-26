export default function PrivacyPage() {
  const sections = [
    {
      id: "collect",
      title: "What we collect",
      content: "We collect the information you provide when creating an account (name, email, licence number), the jump and gear data you log, and basic usage data to improve the product. We do not collect data beyond what is needed to provide the service.",
    },
    {
      id: "use",
      title: "How we use it",
      content: "Your data is used exclusively to provide the Jump Logs service — displaying your logbook, computing statistics, sending expiry reminders, and processing your subscription. We never use your jump data for advertising or sell it to third parties.",
    },
    {
      id: "share",
      title: "Who we share with",
      content: "We share data with Stripe (for payment processing) and Supabase (for database hosting). Both are GDPR-compliant. We do not share your data with any other party.",
    },
    {
      id: "rights",
      title: "Your rights",
      content: "You can export all your data at any time from the logbook page. You can delete your account from Settings. For data correction requests, contact hello@skydivelog.app. If you are in the EU, you have rights under GDPR.",
    },
    {
      id: "cookies",
      title: "Cookies",
      content: "We use a single session cookie for authentication. We do not use advertising cookies or third-party tracking.",
    },
    {
      id: "contact",
      title: "Contact",
      content: "For privacy questions, email hello@skydivelog.app. We aim to respond within 5 business days.",
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
          <h1 className="text-h1-lg font-bold text-fg tracking-tight">Privacy policy</h1>
          <p className="text-sm text-fg-4 mt-2">Last updated: January 2025</p>
        </div>
      </section>

      <section className="py-14 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* TOC */}
          <nav className="hidden md:block space-y-1.5">
            {sections.map(({ id, title }) => (
              <a
                key={id}
                href={`#${id}`}
                className="block text-xs text-fg-4 hover:text-fg transition-colors py-0.5"
              >
                {title}
              </a>
            ))}
          </nav>

          {/* Content */}
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
