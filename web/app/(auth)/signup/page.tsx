"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Mail, Lock, User, IdCard } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [licenceNumber, setLicenceNumber] = useState("")
  const [rating, setRating] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const clearField = (key: string) => {
    if (fieldErrors[key]) setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!fullName.trim())                      errs.fullName = "Full name is required"
    if (!email.trim())                         errs.email    = "Email is required"
    else if (!EMAIL_RE.test(email.trim()))     errs.email    = "Enter a valid email address"
    if (!password)                             errs.password = "Password is required"
    else if (password.length < 8)             errs.password = "Must be at least 8 characters"
    if (!agreed)                               errs.agreed   = "You must agree to the Terms and Privacy Policy"
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          licence_number: licenceNumber,
          licence_rating: rating,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Insert profile row
    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        licence_number: licenceNumber || null,
        licence_rating: rating || null,
      })
    }

    router.push("/signup/success")
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fg tracking-tight mb-1.5">Create your logbook.</h1>
        <p className="text-sm text-fg-3">14-day free trial. No card required.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Full name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearField("fullName") }}
              className={`w-full bg-surface-2 border rounded-sm pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${fieldErrors.fullName ? "border-danger/60 focus:border-danger" : "border-border focus:border-sky"}`}
              placeholder="James Smith"
            />
          </div>
          {fieldErrors.fullName && <p className="mt-1 text-xs text-danger">{fieldErrors.fullName}</p>}
        </div>

        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearField("email") }}
              className={`w-full bg-surface-2 border rounded-sm pl-9 pr-4 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${fieldErrors.email ? "border-danger/60 focus:border-danger" : "border-border focus:border-sky"}`}
              placeholder="you@example.com"
            />
          </div>
          {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
        </div>

        <div>
          <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
            <input
              type={showPass ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearField("password") }}
              className={`w-full bg-surface-2 border rounded-sm pl-9 pr-10 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none transition-colors ${fieldErrors.password ? "border-danger/60 focus:border-danger" : "border-border focus:border-sky"}`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-4 hover:text-fg-2"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password
            ? <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
            : <p className="mt-1 text-xs text-fg-4">At least 8 characters</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
              Licence #
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4" />
              <input
                type="text"
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                placeholder="APF 14829"
              />
            </div>
          </div>
          <div>
            <label className="block text-overline font-semibold tracking-widest uppercase text-fg-3 mb-1.5">
              Rating
            </label>
            <input
              type="text"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
              placeholder="B"
            />
          </div>
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); clearField("agreed") }}
              className="mt-0.5 w-3.5 h-3.5 rounded-sm accent-sky flex-shrink-0"
            />
            <span className="text-xs text-fg-3 leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-sky hover:text-sky/80">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-sky hover:text-sky/80">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {fieldErrors.agreed && <p className="mt-1 text-xs text-danger">{fieldErrors.agreed}</p>}
        </div>

        {error && (
          <p className="text-xs text-danger bg-danger-bg border border-danger/20 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky text-on-sky font-semibold rounded-sm py-2.5 text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-xs text-center text-fg-3">
        Already have an account?{" "}
        <Link href="/login" className="text-sky hover:text-sky/80">
          Log in
        </Link>
      </p>
    </div>
  )
}
