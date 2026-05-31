import type { BlogPost } from "@/lib/blog"
import Link from "next/link"

export const post: BlogPost = {
  slug: "log-every-jump-workflow",
  title: "Log every jump in seconds — the Jump Logs workflow",
  description:
    "A step-by-step look at how the jump logging flow works: from opening the app on the DZ to walking away with a signed, synced record.",
  publishedAt: "2026-06-01",
  readingMins: 4,
  tags: ["jump logging", "skydiving logbook", "instructor sign-off", "offline logbook", "skydiving app"],
  content: Content,
}

function Content() {
  return (
    <article>
      <p>
        The goal for the jump logging flow was to be completable in the time it takes to walk from the landing area to the packing area. Every field that can be pre-filled is. Every step has a clear purpose.
      </p>
      <p>
        Here&apos;s what actually happens when you log a jump.
      </p>

      <h2>The four steps</h2>
      <p>
        The new jump screen is split into four steps, shown by a progress bar at the top. You move forward with a single button &mdash; no back-and-forth required.
      </p>
      <p>
        <strong>Step 1</strong> covers the basics: date and time, jump type, and whether you&apos;re a licensed jumper or a student. Jump types include Belly, Tracking, Wingsuit, Freefly, CRW, AFF, Tandem, Coach, Demo, Night, and Camera Flying.
      </p>
      <p>
        <strong>Step 2</strong> covers the numbers: dropzone, aircraft, exit altitude, freefall time, and canopy time. The dropzone and aircraft pre-fill from your previous jump, so repeat visits at the same DZ take seconds to complete.
      </p>
      <p>
        <strong>Step 3</strong> is the signature step. You draw your own signature on screen using your finger. There&apos;s an inline pad for quick use and a full-screen mode for more accuracy. Once you&apos;ve signed, you can hand the phone to your instructor.
      </p>
      <p>
        <strong>Step 4</strong> is the instructor sign-off. The app displays a QR code that the instructor scans with their own device. They review the jump details and add their signature. No app download required on the instructor&apos;s end &mdash; it works in a browser.
      </p>

      <h2>Works offline, syncs automatically</h2>
      <p>
        The app works without an internet connection. If you log a jump while offline &mdash; whether at a remote DZ or in an area with poor signal &mdash; the jump is saved locally and queued. When the device reconnects, it syncs automatically in the background.
      </p>
      <p>
        This means you never have to think about connectivity on the DZ. Log the jump as normal; the sync takes care of itself.
      </p>

      <h2>What you end up with</h2>
      <p>
        Once saved, the jump appears in your logbook with a full record: date, DZ, aircraft, altitude, freefall time, canopy time, jump type, and both signatures. It immediately contributes to your currency window calculation and lifetime stats.
      </p>
      <p>
        When you&apos;re ready to export, PDF logbooks can be generated from the web app &mdash; with each jump on its own page or in a 10-per-page compact layout. Each export includes a verification code that can be checked at <Link href="/verify" className="text-sky hover:underline">jumplogs.com/verify</Link>.
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
