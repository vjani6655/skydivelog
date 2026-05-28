"use client"

import { useState } from "react"
import { CheckCircle, Mail, Megaphone, Activity } from "lucide-react"

const TOPICS = ["Support", "Billing", "Feature request", "Bug", "Press"]

export default function ContactPage() {
  const [topic, setTopic] = useState("Support")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, topic, message }),
    })
    if (res.ok) {
      setSent(true)
    } else {
      setError("Something went wrong. Please email us directly at support@jumplogs.com")
      setLoading(false)
    }
  }

  return (
    <>
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-14 items-start">
          {/* Left: contact info */}
          <div>
            <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-4">Contact</p>
            <h1 className="text-h1-lg font-bold text-fg tracking-tight mb-3">Talk to us.</h1>
            <p className="text-base text-fg-3 mb-10">Real people answer. Usually within a day. Faster on weekdays.</p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-sky/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-sky" />
                </div>
                <div>
                  <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-0.5">Email</p>
                  <a href="mailto:support@jumplogs.com" className="text-sm text-fg hover:text-sky transition-colors">support@jumplogs.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-sky/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Megaphone className="w-3.5 h-3.5 text-sky" />
                </div>
                <div>
                  <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-0.5">Press</p>
                  <a href="mailto:press@jumplogs.com" className="text-sm text-fg hover:text-sky transition-colors">press@jumplogs.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-sm bg-sky/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-sky" />
                </div>
                <div>
                  <p className="text-overline font-semibold tracking-widest uppercase text-fg-4 mb-0.5">Status &amp; incidents</p>
                  <a href="https://status.jumplogs.com" target="_blank" rel="noopener noreferrer" className="text-sm text-fg hover:text-sky transition-colors">status.jumplogs.com</a>
                </div>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-surface border border-border rounded-xl p-6">
            {sent ? (
              <div className="py-10 flex flex-col items-center gap-4 text-center">
                <CheckCircle className="w-10 h-10 text-ok" />
                <div>
                  <p className="text-sm font-semibold text-fg mb-1">Message sent.</p>
                  <p className="text-xs text-fg-3">We&apos;ll get back to you within 5 working days.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-sm font-semibold text-fg mb-4">Drop a note</h2>

                <div>
                  <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="James Smith"
                    required
                    className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-surface-2 border border-border rounded-sm pl-9 pr-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Topic</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className={`text-xs px-3 py-1.5 rounded-pill border transition-colors ${
                          topic === t
                            ? "bg-sky/15 border-sky text-sky"
                            : "border-border text-fg-3 hover:text-fg hover:border-border-strong"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-overline font-semibold tracking-widest uppercase text-fg-4 mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's up..."
                    required
                    rows={4}
                    className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2.5 text-sm text-fg placeholder:text-fg-4 focus:outline-none focus:border-sky transition-colors resize-none"
                  />
                </div>

                {error && <p className="text-xs text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sky text-on-sky font-semibold py-2.5 rounded-sm text-sm hover:bg-sky/90 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
