import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ALL_POSTS, getPost, fmtDate } from "@/lib/blog"
import BlogDisclaimer from "@/components/blog/BlogDisclaimer"

type Props = { params: { slug: string } }

export function generateStaticParams() {
  return ALL_POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPost(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    alternates: { canonical: `https://jumplogs.com/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `https://jumplogs.com/blog/${post.slug}`,
      title: `${post.title} — Jump Logs`,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.publishedAt,
      authors: ["https://jumplogs.com"],
      section: "Skydiving",
      tags: post.tags,
      images: [{ url: "/social-og-1200x630.png", width: 1200, height: 630, alt: post.title }],
    },
  }
}

export default function BlogPostPage({ params }: Props) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const { title, publishedAt, readingMins, content: Content } = post

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: post.description,
    keywords: post.tags.join(", "),
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: { "@type": "Organization", name: "Jump Logs", url: "https://jumplogs.com" },
    publisher: { "@type": "Organization", name: "Jump Logs", url: "https://jumplogs.com", logo: { "@type": "ImageObject", url: "https://jumplogs.com/logo/png/mark-on-dark-256.png" } },
    image: "https://jumplogs.com/social-og-1200x630.png",
    url: `https://jumplogs.com/blog/${post.slug}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://jumplogs.com/blog/${post.slug}` },
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://jumplogs.com" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://jumplogs.com/blog" },
      { "@type": "ListItem", position: 3, name: title, item: `https://jumplogs.com/blog/${post.slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-10 px-5 hero-gradient border-b border-border">
        <div className="max-w-2xl mx-auto">
          <Link href="/blog" className="text-xs text-fg-4 hover:text-fg transition-colors mb-6 inline-flex items-center gap-1">
            ← Blog
          </Link>
          <p className="text-overline text-fg-4 font-semibold tracking-widest uppercase mb-3">
            {fmtDate(publishedAt)} · {readingMins} min read
          </p>
          <h1 className="text-h1 font-bold text-fg tracking-tight leading-tight">
            {title}
          </h1>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <section className="py-14 px-5">
        <div className="max-w-2xl mx-auto prose-blog">
          <Content />
          <BlogDisclaimer />
        </div>
      </section>

      {/* ── More posts ───────────────────────────────────────────────── */}
      {ALL_POSTS.filter((p) => p.slug !== post.slug).length > 0 && (
        <section className="py-14 px-5 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <p className="text-overline text-fg-4 font-semibold tracking-widest uppercase mb-6">More articles</p>
            <div className="space-y-4">
              {ALL_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3).map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="block group bg-surface border border-border rounded-lg p-4 hover:border-sky/40 transition-colors"
                >
                  <p className="text-overline text-fg-4 font-semibold tracking-widest uppercase mb-1">
                    {p.readingMins} min read
                  </p>
                  <p className="text-sm font-semibold text-fg group-hover:text-sky transition-colors">
                    {p.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
