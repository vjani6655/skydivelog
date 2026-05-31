import type { BlogPost } from "@/lib/blog"
import Link from "next/link"

export const post: BlogPost = {
  slug: "reserve-repack-and-aad-service-tracking",
  title: "Reserve repacks and AAD service: how Jump Logs keeps you on schedule",
  description:
    "Missing a repack deadline is a serious safety issue — and an easy administrative one to prevent. Here's how Jump Logs tracks your reserve and AAD service dates so you always know what's due.",
  publishedAt: "2026-06-01",
  readingMins: 5,
  tags: ["reserve repack", "AAD service", "gear tracking", "skydiving equipment", "parachute maintenance"],
  content: Content,
}

function Content() {
  return (
    <article>
      <p>
        A reserve parachute that&apos;s overdue for repack is not legal to jump. Neither is an AAD that&apos;s past its service interval. These aren&apos;t paperwork technicalities &mdash; they&apos;re hard maintenance requirements that affect your safety and your ability to board the aircraft.
      </p>
      <p>
        Jump Logs tracks both so you know well in advance when something is coming due.
      </p>

      <h2>What you track in the gear section</h2>
      <p>
        The app&apos;s gear section covers three equipment types: rigs, canopies, and AADs. Each has its own fields.
      </p>
      <p>
        For a <strong>canopy</strong>, you record whether it&apos;s a main or reserve. For a reserve, the app asks for the last repacked date and the next repack due date. You also record make and model, serial number, and date of manufacture.
      </p>
      <p>
        For an <strong>AAD</strong>, the key field is the next service date &mdash; the date by which the manufacturer requires a maintenance check. You also record make and model, serial number, and date of manufacture.
      </p>
      <p>
        For a <strong>rig</strong> (container), you record make and model, serial number, and date of manufacture.
      </p>

      <h2>When does the app remind you?</h2>
      <p>
        Jump Logs sends a notification 14 days before a reserve repack is due. The same applies to AAD service deadlines. This gives you enough runway to book in with a rigger without being caught short.
      </p>
      <p>
        The 14-day lead time is adjustable in settings if you&apos;d prefer more or less notice.
      </p>

      <h2>Attaching documentation</h2>
      <p>
        When adding or editing a gear item, you can attach a photo &mdash; useful for storing a photo of the repack card or the AAD service certificate alongside the record. The app accepts image files up to 10 MB.
      </p>

      <h2>What this doesn&apos;t replace</h2>
      <p>
        Jump Logs is a personal tracking tool. It does not replace the physical repack card in your container, the rigger&apos;s records, or any documentation required by your governing body. If there&apos;s ever a discrepancy between the app and your physical documentation, the physical documentation takes precedence.
      </p>
      <p>
        The app is there to make sure you see the deadline coming &mdash; not to act as the official record.
      </p>

      <h2>Setting it up</h2>
      <p>
        Go to the Gear tab in the app and add your equipment. For a reserve, tap Canopy &rarr; Reserve and fill in the dates. For an AAD, tap AAD and enter the next service date. The app will take it from there.
      </p>
      <div className="mt-6">
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
