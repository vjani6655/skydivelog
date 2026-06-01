"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/app/actions/auth"

export default function MarketingSignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-fg-3 hover:text-fg px-3 py-1.5 rounded-sm transition-colors"
    >
      Log out
    </button>
  )
}
