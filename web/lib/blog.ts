import type { ComponentType } from "react"

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string // ISO date string YYYY-MM-DD
  readingMins: number
  tags: string[]       // used for OG article:tag and JSON-LD keywords
  content: ComponentType
}

// Registry — import each post and add to this array in newest-first order
import { post as currency } from "@/lib/blog-posts/currency"
import { post as repackTracking } from "@/lib/blog-posts/repack-tracking"
import { post as jumpWorkflow } from "@/lib/blog-posts/jump-workflow"
import { post as certificates } from "@/lib/blog-posts/certificates"

export const ALL_POSTS: BlogPost[] = [
  currency,
  repackTracking,
  jumpWorkflow,
  certificates,
]

export function getPost(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug)
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}
