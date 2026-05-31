import type { BlogPost } from "@/lib/blog"
import Link from "next/link"

export const post: BlogPost = {
  slug: "how-to-track-skydiving-currency",
  title: "How to track your skydiving currency with Jump Logs",
  description:
    "Currency lapses sneak up on you. Jump Logs shows you exactly how many days since your last jump and warns you before the window closes — not after.",
  publishedAt: "2026-06-01",
  readingMins: 4,
  tags: ["skydiving currency", "logbook", "jump tracking", "skydiving app"],
  content: Content,
}

function Content() {
  return (
    <article>
      <p>
        Currency in skydiving is simple in theory: jump within a rolling time window or you&apos;re considered lapsed. In practice, it&apos;s easy to lose track &mdash; especially in winter, during busy periods at work, or after an injury. By the time you realise you need another jump, the window may already have closed.
      </p>
      <p>
        Jump Logs tracks this automatically so you never have to do the mental maths on the dropzone.
      </p>

      <h2>What the currency window actually does</h2>
      <p>
        The app calculates how many days have passed since your last recorded jump. It compares that number against your configured currency window (the default is 30 days, adjustable in settings). If you&apos;re within the window, you&apos;re current. If you&apos;ve crossed it, you&apos;re lapsed.
      </p>
      <p>
        You can see this at a glance on the Stats screen &mdash; it shows days since last jump and whether you&apos;re currently within your window, displayed alongside your total jumps, freefall time, and other lifetime numbers.
      </p>

      <h2>Configuring your currency window</h2>
      <p>
        Different governing bodies and DZ operators have different rules. Some require a jump every 30 days; others use a 60-day or 90-day window. Jump Logs lets you configure the threshold to match whatever applies to you.
      </p>
      <p>
        The default is 30 days &mdash; but if your situation is different, change it in settings and the currency display will update immediately.
      </p>

      <h2>Getting a warning before you lapse</h2>
      <p>
        This is the part that matters most. Jump Logs shows you a warning before the window closes &mdash; not a failure notice after the fact. You&apos;ll see your current status on the Stats screen whenever you open the app, so there&apos;s no need to remember to check separately.
      </p>
      <p>
        There&apos;s no subscription or special setting required for this. It works as long as your jump history is logged in the app.
      </p>

      <h2>Why keeping jump history accurate matters</h2>
      <p>
        The currency calculation is only as good as your logged data. If you&apos;re logging your jumps as you make them &mdash; which the app is designed for &mdash; the number will always be accurate. If you&apos;re backfilling old jumps, make sure the dates are correct; the calculation is date-based, not entry-based.
      </p>
      <p>
        Most users log jumps on the DZ immediately after landing, while the details are fresh. The new jump form pre-fills the dropzone and aircraft from your previous jump, so repeat visits take seconds.
      </p>

      <h2>Ready to set it up?</h2>
      <p>
        If you&apos;re not already logging in Jump Logs, the free trial gives you full access from day one &mdash; including currency tracking, stats, gear reminders, and export.
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
