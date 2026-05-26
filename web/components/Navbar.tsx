"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-base font-bold text-blue-600 tracking-tight"
          >
            Jump Logs
          </Link>
          <Link
            href="/logbook"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Logbook
          </Link>
          <Link
            href="/settings"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Settings
          </Link>
          <Link
            href="/subscription"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Subscription
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
