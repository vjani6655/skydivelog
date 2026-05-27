import Link from "next/link"
import BrandMark from "@/components/BrandMark"
import WebThemeToggle from "@/components/WebThemeToggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="hero-gradient min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4">
        <WebThemeToggle />
      </div>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <BrandMark size={26} variant="simple" />
        <span className="text-fg font-bold text-lg tracking-tight">Jump Logs</span>
      </Link>

      <div className="w-full max-w-[400px]">{children}</div>

      <p className="mt-10 text-xs text-fg-3">
        © {new Date().getFullYear()} Jump Logs ·{" "}
        <Link href="/privacy" className="hover:text-fg-2 underline underline-offset-2">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="hover:text-fg-2 underline underline-offset-2">
          Terms
        </Link>
      </p>
    </div>
  )
}
