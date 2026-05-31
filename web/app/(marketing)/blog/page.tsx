import type { Metadata } from "next"
import Link from "next/link"
import { ALL_POSTS, fmtDate } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides and tips for skydivers — currency tracking, gear maintenance, logbook workflow, and more from the Jump Logs team.",
  alternates: { canonical: "https://jumplogs.com/blog" },
  openGraph: {
    url: "https://jumplogs.com/blog",
    title: "Blog — Jump Logs",
    description: "Guides and tips for skydivers — currency tracking, gear maintenance, logbook workflow, and more.",
    images: [{ url: "/social-og-1200x630.png", width: 1200, height: 630, alt: "Jump Logs Blog" }],
  },
}

export default function BlogIndexPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://jumplogs.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://jumplogs.com/blog" },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="pt-20 pb-14 px-5 hero-gradient">
        <div className="max-w-3xl mx-auto">
          <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">Blog</p>
          <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-4">Guides for skydivers.</h1>
          <p className="text-base text-fg-3 max-w-lg">
            Practical articles on currency tracking, gear maintenance, logbook workflows, and getting the most out of Jump Logs.
          </p>
        </div>
      </section>

      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto space-y-6">
          {ALL_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block group bg-surface border border-border rounded-xl p-6 hover:border-sky/40 transition-colors"
            >
              <p className="text-overline text-fg-4 font-semibold tracking-widest uppercase mb-2">
                {fmtDate(post.publishedAt)} · {post.readingMins} min read
              </p>
              <h2 className="text-lg font-bold text-fg mb-2 group-hover:text-sky transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-fg-3 leading-relaxed">{post.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
