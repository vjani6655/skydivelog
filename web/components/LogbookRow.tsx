"use client"

import { useRouter } from "next/navigation"

export default function LogbookRow({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const router = useRouter()
  return (
    <tr
      className="hover:bg-surface-2 transition-colors cursor-pointer"
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  )
}
