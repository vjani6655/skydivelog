import type { BlogPost } from "@/lib/blog"
import Link from "next/link"

export const post: BlogPost = {
  slug: "track-skydiving-licences-ratings-medicals",
  title: "Never let a skydiving licence, rating, or medical expire silently",
  description:
    "Expired medicals and lapsed ratings are easy to miss. Jump Logs stores your certificates with multi-stage expiry warnings so you always know what's coming up.",
  publishedAt: "2026-06-01",
  readingMins: 3,
  tags: ["skydiving licence", "skydiving medical", "instructor rating", "certificate tracking", "APF", "USPA"],
  content: Content,
}

function Content() {
  return (
    <article>
      <p>
        An expired medical certificate can ground you on the day of a jump. A lapsed instructor rating can have consequences beyond just not being allowed to sign students. These things rarely expire with any drama &mdash; they just quietly tick past the date while you&apos;re focused on other things.
      </p>
      <p>
        The Certificates section in Jump Logs stores your licences, ratings, and medicals with automatic expiry warnings.
      </p>

      <h2>What you can store</h2>
      <p>
        The app supports three certificate categories: <strong>Licence</strong>, <strong>Rating</strong>, and <strong>Medical</strong>. For each one, you record:
      </p>
      <ul>
        <li>The certificate title (e.g. &ldquo;APF C Licence&rdquo;, &ldquo;USPA Coach Rating&rdquo;, &ldquo;CASA Class 2 Medical&rdquo;)</li>
        <li>The issuing body</li>
        <li>A reference or certificate number</li>
        <li>The expiry date</li>
        <li>An optional photo of the certificate</li>
      </ul>
      <p>
        The issuing body and reference number fields are free-text, so they work for any governing body or country.
      </p>

      <h2>When does the app warn you?</h2>
      <p>
        Jump Logs sends warnings at three intervals before expiry: 30 days out, 7 days out, and on the expiry date itself. This gives you plenty of time to renew well before the deadline.
      </p>
      <p>
        The multi-stage approach means you don&apos;t get a single notification that&apos;s easy to dismiss and then forget about. You get a reminder with enough time to act, then a follow-up closer to the date.
      </p>

      <h2>Attaching a photo</h2>
      <p>
        When adding a certificate, you can attach a photo of the physical certificate. This is useful if you ever need to reference the exact wording, certificate number, or issue date while away from home. The app accepts image files up to 10 MB.
      </p>

      <h2>What this is for</h2>
      <p>
        This is a personal reminder tool, not an official record. The source of truth for your licence status is always your governing body&apos;s records. But having a copy in your logbook app &mdash; with warnings built in &mdash; means you&apos;re far less likely to be caught off-guard.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/features"
          className="inline-block border border-border-strong text-fg-2 font-medium px-5 py-2.5 rounded-sm text-sm hover:bg-surface-2 hover:text-fg transition-colors"
        >
          See all features
        </Link>
        <Link
          href="/signup"
          className="inline-block bg-sky text-on-sky font-semibold px-5 py-2.5 rounded-sm text-sm hover:bg-sky/90 transition-colors"
        >
          Start free trial
        </Link>
      </div>
    </article>
  )
}
