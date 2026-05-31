import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import WebThemeToggle from "@/components/WebThemeToggle"
import MarketingSignOutButton from "@/components/MarketingSignOutButton"
import MobileMenu from "@/components/marketing/MobileMenu"
import { createClient } from "@/lib/supabase/server"

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/verify", label: "Verify jump" },
]

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="border-b border-border sticky top-0 z-50 bg-bg/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={20} variant="simple" />
            <span className="text-sm font-bold text-fg tracking-tight">Jump Logs</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="text-sm text-fg-3 hover:text-fg transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <WebThemeToggle />
            {/* Desktop-only CTA buttons */}
            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-sm text-fg-3 hover:text-fg px-3 py-1.5 rounded-sm transition-colors"
                  >
                    Take me to dashboard
                  </Link>
                  <MarketingSignOutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-fg-3 hover:text-fg px-3 py-1.5 rounded-sm transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-sky text-on-sky text-sm font-semibold px-4 py-1.5 rounded-sm hover:bg-sky/90 transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
            {/* Mobile hamburger */}
            <MobileMenu isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center gap-5 text-xs text-fg-4">
          <Link href="/" className="flex items-center gap-1.5 text-fg-3 font-semibold">
            <BrandMark size={14} variant="simple" />
            Jump Logs
          </Link>
          <Link href="/features" className="hover:text-fg transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-fg transition-colors">Pricing</Link>
          <Link href="/about" className="hover:text-fg transition-colors">About</Link>
          <Link href="/contact" className="hover:text-fg transition-colors">Contact</Link>
          <Link href="/verify" className="hover:text-fg transition-colors">Verify jump</Link>
          <Link href="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-fg transition-colors">Terms</Link>
          <a
            href="https://www.instagram.com/jumplogs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Jump Logs on Instagram"
            className="hover:text-fg transition-colors"
          >
            {/* Instagram SVG — lucide-react removed brand icons */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
            </svg>
          </a>
          <span className="ml-auto">© {new Date().getFullYear()} Jump Logs</span>
        </div>
      </footer>
    </div>
  )
}
