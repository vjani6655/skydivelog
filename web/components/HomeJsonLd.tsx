/**
 * JSON-LD structured data for the homepage.
 * Includes SoftwareApplication, Organization, and WebSite (with SearchAction) schemas.
 */
export default function HomeJsonLd() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Jump Logs",
      description:
        "The modern skydiving logbook — track every jump, gear, currency and certification in one place. iOS & Android. Works offline.",
      url: "https://jumplogs.com",
      applicationCategory: "SportsApplication",
      operatingSystem: "iOS, Android",
      offers: {
        "@type": "Offer",
        price: "12.00",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
        description: "Annual subscription after free trial",
      },
      screenshot: "https://jumplogs.com/social-og-1200x630.png",
      featureList: [
        "Offline jump logging with QR instructor sign-off",
        "30-day rolling currency tracking",
        "AAD and reserve repack tracking",
        "Certificate and medical expiry warnings",
        "PDF and CSV logbook export",
        "Verifiable jump records",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Jump Logs",
      url: "https://jumplogs.com",
      logo: "https://jumplogs.com/logo/png/mark-on-dark-256.png",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@jumplogs.com",
        contactType: "customer support",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Jump Logs",
      url: "https://jumplogs.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://jumplogs.com/verify?code={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
