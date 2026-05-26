// SkydiveLog Web — Marketing pages (7)

// Reused
function FeatureRow({ icon, title, desc, reverse }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center',
      padding: '64px 0',
    }}>
      <div style={{ order: reverse ? 2 : 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 11, background: 'var(--sky-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--sky)', marginBottom: 18,
        }}>
          <Icon name={icon} size={22} />
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, marginBottom: 12 }}>{title}</div>
        <div style={{ fontSize: 16, color: 'var(--fg-2)', lineHeight: 1.6 }}>{desc}</div>
      </div>
      <Placeholder label={`${icon} · feature illustration`} height={300} style={{ borderRadius: 12 }} />
    </div>
  );
}

// ─── 1 Homepage ────────────────────────────────────────────────────────
function PageHome() {
  return (
    <WebPage active="">
      {/* HERO */}
      <section style={{
        position: 'relative', padding: '80px 56px 0',
        background: 'radial-gradient(ellipse at top, rgba(74,158,255,0.12) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: 880, marginBottom: 56 }}>
          <div className="sd-mono" style={{ fontSize: 12, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
            v 2.4 · iOS & Android
          </div>
          <h1 style={{ fontSize: 88, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.95, margin: 0 }}>
            Every jump.<br />
            <span style={{ color: 'var(--fg-2)' }}>Forever logged.</span>
          </h1>
          <p style={{ fontSize: 20, color: 'var(--fg-2)', lineHeight: 1.5, maxWidth: 580, marginTop: 28 }}>
            SkydiveLog is the digital logbook built for licensed jumpers. Sign every jump in your pocket, track gear and currency, never miss a repack.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32, alignItems: 'center' }}>
            <button style={{ background: 'var(--sky)', color: '#001426', border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 10, cursor: 'pointer' }}>Start free trial</button>
            <button style={{ background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, padding: '14px 22px', borderRadius: 10, cursor: 'pointer' }}>See features</button>
            <span className="sd-mono" style={{ marginLeft: 12, fontSize: 12, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>$5 / YEAR · CANCEL ANY TIME</span>
          </div>
        </div>

        {/* Live stats strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
          padding: '28px 32px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 16,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 14, right: 16,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />
            <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>LIVE</span>
          </div>
          <LiveStat label="Total jumps logged" value="4,218,902" sub="across the platform" />
          <LiveStat label="Registered jumpers" value="38,471" sub="124 countries" />
          <LiveStat label="Hours of freefall" value="71,438" sub="and counting" />
          <LiveStat label="DZs represented" value="1,182" sub="from 18,000 ft to 3,500" />
        </div>
      </section>

      {/* Mockup band */}
      <section style={{ padding: '120px 56px', textAlign: 'center' }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>The app</div>
        <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>Built like cockpit instruments.</h2>
        <p style={{ fontSize: 17, color: 'var(--fg-2)', maxWidth: 600, margin: '0 auto 56px' }}>
          Clear at a glance. Honest about your data. No gimmicks, no ads, no upsells.
        </p>
        <Placeholder label="3 phone mockups · log · stats · gear" height={460} style={{ maxWidth: 980, margin: '0 auto', borderRadius: 16 }} />
      </section>

      {/* Features grid */}
      <section style={{ padding: '0 56px 96px' }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>What's in it</div>
        <h2 style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 56 }}>One subscription. Every feature.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            ['log', 'Sign jumps on the dropzone', 'Step-by-step entry, instructor sign-off via QR. Works offline.'],
            ['chart', 'Track currency & progress', 'Auto-rolling 30-day window, custom alerts, never lapse without warning.'],
            ['parachute', 'Gear & repack tracking', 'AAD service, reserve repacks, jumps per canopy. Alerts before you need them.'],
            ['cert', 'Certificates & medicals', 'Licences, ratings, medicals — expiry tracking with multi-stage warnings.'],
            ['export', 'Export your logbook', 'PDF and CSV. APF, USPA, CSPA, BPA layouts supported.'],
            ['shield', 'Yours, forever', 'Cancel any time — keep a full export. We never sell data.'],
          ].map(([ic, t, d]) => (
            <div key={t} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 28,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'var(--sky-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky)', marginBottom: 16,
              }}>
                <Icon name={ic} size={20} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing band */}
      <section style={{ padding: '0 56px 100px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(74,158,255,0.18), rgba(52,210,214,0.05))',
          border: '1px solid var(--sky)', borderRadius: 18,
          padding: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32,
        }}>
          <div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>$5 a year.</h2>
            <p style={{ fontSize: 16, color: 'var(--fg-2)', maxWidth: 480, marginTop: 12 }}>
              That's it. Same price for every feature. One-tap to cancel. Renewal reminder a month before.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
            <button style={{ background: 'var(--sky)', color: '#001426', border: 'none', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: '14px 24px', borderRadius: 10, cursor: 'pointer' }}>Get SkydiveLog</button>
            <button style={{ background: 'transparent', color: 'var(--fg)', border: '1px solid var(--border-strong)', fontFamily: 'inherit', fontSize: 14, padding: '12px 22px', borderRadius: 10, cursor: 'pointer' }}>Compare to others</button>
          </div>
        </div>
      </section>

      {/* App download */}
      <section style={{ padding: '0 56px 100px', display: 'flex', gap: 28, justifyContent: 'center' }}>
        {[
          ['App Store', 'iOS 16+'],
          ['Google Play', 'Android 11+'],
        ].map(([s, v]) => (
          <div key={s} style={{
            padding: '14px 26px', background: 'var(--surface)',
            border: '1px solid var(--border-strong)', borderRadius: 10,
            display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div style={{ width: 32, height: 32, background: 'var(--surface-2)', borderRadius: 8 }} />
            <div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>DOWNLOAD ON</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{s}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{v}</div>
            </div>
          </div>
        ))}
      </section>
    </WebPage>
  );
}

// ─── 2 Features ────────────────────────────────────────────────────────
function PageFeatures() {
  return (
    <WebPage active="features">
      <section style={{ padding: '80px 56px 0' }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Features</div>
        <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', margin: 0, lineHeight: 1 }}>
          Designed for licensed jumpers.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--fg-2)', maxWidth: 640, marginTop: 24 }}>
          Built with feedback from APF, USPA and BPA jumpers. Every feature earns its keep — no filler.
        </p>
      </section>
      <section style={{ padding: '0 56px' }}>
        <FeatureRow icon="log"
          title="Sign every jump in 30 seconds."
          desc="Pre-fill DZ and aircraft. Tap-to-add tags. Draw your signature on the manifest line. Hand to your instructor for QR sign-off. Works offline — syncs when you're back in range." />
        <FeatureRow icon="chart" reverse
          title="Currency you can trust."
          desc="A 30-day rolling window with custom thresholds for B, C, D and instructor ratings. Get a warning a week before you lapse — not after." />
        <FeatureRow icon="parachute"
          title="Track every component."
          desc="Rigs, canopies, AADs, reserves. Jumps-on, hours, repack and service due. Notifications fire 14 days before a repack — adjustable in settings." />
        <FeatureRow icon="cert" reverse
          title="Certificates that never lapse silently."
          desc="Add licences, ratings, and medicals. Multi-stage expiry warnings: 30d, 7d, day-of. Attach scanned PDFs for verification." />
        <FeatureRow icon="export"
          title="Your data, exportable forever."
          desc="One-tap PDF in APF, USPA, CSPA or BPA layout. CSV for whatever else. Even cancelled accounts can still export for 30 days." />
      </section>
    </WebPage>
  );
}

// ─── 3 Pricing ─────────────────────────────────────────────────────────
function PagePricing() {
  return (
    <WebPage active="pricing">
      <section style={{ padding: '80px 56px 40px', textAlign: 'center' }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Pricing</div>
        <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', margin: 0 }}>One price. Forever.</h1>
        <p style={{ fontSize: 18, color: 'var(--fg-2)', maxWidth: 600, margin: '20px auto 0' }}>
          No tiers, no add-ons, no surprise upgrade prompts.
        </p>
      </section>
      <section style={{ padding: '0 56px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 480, padding: 40,
          background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
          border: '1px solid var(--sky)', borderRadius: 18,
          boxShadow: '0 20px 60px rgba(74,158,255,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
            <Badge kind="sky" icon="shield">SKYDIVELOG PRO</Badge>
            <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>BILLED ANNUALLY</span>
          </div>
          <div className="sd-mono" style={{ fontSize: 80, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
            $5<span style={{ fontSize: 24, color: 'var(--fg-2)', letterSpacing: 0 }}> / year</span>
          </div>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Unlimited jumps & gear',
              'Offline-first, syncs automatically',
              'PDF & CSV export in 4 formats',
              'Instructor QR sign-off',
              'Currency, repack, expiry alerts',
              'Priority support',
            ].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="check" size={16} color="var(--sky)" stroke={2.5} />
                <span style={{ fontSize: 15 }}>{t}</span>
              </div>
            ))}
          </div>
          <button style={{
            width: '100%', marginTop: 28, height: 52, borderRadius: 10,
            background: 'var(--sky)', color: '#001426', border: 'none',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 600, cursor: 'pointer',
          }}>Subscribe — $5</button>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'center', marginTop: 14, letterSpacing: '0.04em' }}>
            CANCEL ANY TIME · YOUR DATA STAYS YOURS
          </div>
        </div>
      </section>
      <section style={{ padding: '0 56px 96px' }}>
        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' }}>Frequently asked</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          {[
            ['Why so cheap?', "We're built by skydivers, not VCs. $5 covers servers and one person on support. No funding, no growth-at-all-cost."],
            ['Is there a free version?', 'Sign-up unlocks a 30-day free trial — full features. After that, $5/year or read-only mode (you can still export).'],
            ['What if I cancel?', "Your logbook stays exportable for 30 days. After that it's archived for 12 months — pay $5 to reactivate any time."],
            ['Do you offer student rates?', 'No — $5 is already the student rate. Free for DZs that sponsor 20+ jumpers.'],
          ].map(([q, a]) => (
            <div key={q} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 22,
            }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{q}</div>
              <div style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.55 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>
    </WebPage>
  );
}

// ─── 4 About ───────────────────────────────────────────────────────────
function PageAbout() {
  return (
    <WebPage active="about">
      <section style={{ padding: '80px 56px 40px' }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>About</div>
        <h1 style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', margin: 0, maxWidth: 800, lineHeight: 1.05 }}>
          A logbook by jumpers, for jumpers.
        </h1>
        <p style={{ fontSize: 18, color: 'var(--fg-2)', maxWidth: 660, marginTop: 28, lineHeight: 1.6 }}>
          We started SkydiveLog after carrying a soggy paper logbook through too many wet manifests. The idea was simple: build something we'd want on the DZ — fast, honest, no marketing junk.
        </p>
      </section>
      <section style={{ padding: '40px 56px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
        <Placeholder label="team · candid DZ photo" height={420} style={{ borderRadius: 14 }} />
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14 }}>Built in the open.</h3>
          <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.7 }}>
            Two people. Both jumpers. We publish a public roadmap, ship every two weeks, and answer support emails ourselves.
          </p>
          <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.7, marginTop: 12 }}>
            We do not raise venture capital. We are not for sale. The price is $5 and it will stay that way.
          </p>
          <div style={{ marginTop: 26, padding: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>OUR COMMITMENTS</div>
            {[
              ['No ads', 'Anywhere. Ever.'],
              ['No data sale', 'Your jumps are yours.'],
              ['Open export', 'PDF + CSV, always free.'],
              ['Open API', 'Public, documented, rate-limited.'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--fg)' }}>{k}</span>
                <span style={{ color: 'var(--fg-2)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </WebPage>
  );
}

// ─── 5 Contact ─────────────────────────────────────────────────────────
function PageContact() {
  return (
    <WebPage active="contact">
      <section style={{ padding: '80px 56px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
        <div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--sky)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Contact</div>
          <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em', margin: 0, lineHeight: 1.05 }}>Talk to us.</h1>
          <p style={{ fontSize: 17, color: 'var(--fg-2)', marginTop: 18, lineHeight: 1.6 }}>
            Real people answer. Usually within a day. Faster on weekdays.
          </p>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              ['mail', 'Email', 'hello@skydivelog.app'],
              ['shield', 'Press', 'press@skydivelog.app'],
              ['bell', 'Status & incidents', 'status.skydivelog.app'],
            ].map(([ic, l, v]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky)' }}>
                  <Icon name={ic} size={18} />
                </div>
                <div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>{l.toUpperCase()}</div>
                  <div className="sd-mono" style={{ fontSize: 14, marginTop: 2 }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 32,
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Drop a note</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Your name" placeholder="Erin Morrison" />
            <Input label="Email" placeholder="you@example.com" icon="mail" />
            <div>
              <label className="sd-label">Topic</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <Chip active>Support</Chip>
                <Chip>Billing</Chip>
                <Chip>Feature request</Chip>
                <Chip>Bug</Chip>
                <Chip>Press</Chip>
              </div>
            </div>
            <div>
              <label className="sd-label">Message</label>
              <textarea className="sd-input" style={{ minHeight: 130, resize: 'none', paddingTop: 12 }} placeholder="Tell us what's up…" />
            </div>
            <Button>Send message</Button>
          </div>
        </div>
      </section>
    </WebPage>
  );
}

// ─── 6 Privacy ─────────────────────────────────────────────────────────
function PageLegal({ kind = 'privacy' }) {
  const sections = kind === 'privacy' ? [
    ['What we collect', 'Account email, encrypted password hash, and the jump entries, gear, certificates and notes you create. Nothing else. We do not track your location, contacts, or third-party app usage.'],
    ['How we use it', "To run your account, deliver alerts you've enabled, and produce your exports. That's it. No personalised ads, no profiling for resale."],
    ['Who we share with', 'Stripe (payments — PCI scoped). Mailgun (transactional email). AWS (hosted in Sydney, ap-southeast-2). Nobody else.'],
    ['Your rights', 'Export, edit, delete — any time, from the app or web. Cancellations remove all personal data after a 30-day grace window unless you request immediate deletion.'],
    ['Cookies', 'We use one session cookie. No third-party analytics, no fingerprinting. The marketing site uses Plausible (anonymous, EU-hosted).'],
    ['Contact', 'For privacy questions or DSARs, write to privacy@skydivelog.app. We aim to respond within 5 business days.'],
  ] : [
    ['Your account', 'You must be at least 16, and must hold a valid licence in your jurisdiction to use SkydiveLog as a real logbook. Demo accounts are free for unlicensed students.'],
    ['Subscription', '$5 USD per year, billed annually via Stripe. Cancellations effective at end of term. No partial refunds, but you keep full access to existing data.'],
    ['Accuracy', 'You are responsible for the accuracy of your entries. SkydiveLog provides storage, not verification, except where an instructor co-signs through the QR flow.'],
    ['Use of the service', "Don't try to break it, don't scrape it, don't resell access. Be reasonable. We reserve the right to terminate accounts used in bad faith."],
    ['Limitation of liability', 'SkydiveLog is provided as a record-keeping tool. We make no warranty of fitness for purpose, regulatory compliance, or evidentiary use in court.'],
    ['Governing law', 'These terms are governed by the laws of New South Wales, Australia.'],
  ];
  return (
    <WebPage>
      <section style={{ padding: '80px 56px 96px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: 80 }}>
        <aside>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Last updated</div>
          <div className="sd-mono" style={{ fontSize: 15 }}>14 Mar 2026</div>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '28px 0 10px' }}>Sections</div>
          {sections.map(([t]) => (
            <div key={t} style={{ fontSize: 13, color: 'var(--fg-2)', padding: '6px 0' }}>{t}</div>
          ))}
        </aside>
        <div>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
            {kind === 'privacy' ? 'Privacy policy' : 'Terms of service'}
          </h1>
          <div style={{ fontSize: 16, color: 'var(--fg-2)', marginTop: 14, marginBottom: 40, lineHeight: 1.6, maxWidth: 640 }}>
            {kind === 'privacy'
              ? 'Plain-English version. The legal-counsel version says the same thing — slower.'
              : "What you can expect from us, and what we expect from you."}
          </div>
          {sections.map(([t, c]) => (
            <div key={t} style={{ paddingBottom: 32, marginBottom: 32, borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 10 }}>{t}</h3>
              <p style={{ fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.65, margin: 0, maxWidth: 640 }}>{c}</p>
            </div>
          ))}
        </div>
      </section>
    </WebPage>
  );
}

Object.assign(window, {
  PageHome, PageFeatures, PagePricing, PageAbout, PageContact, PageLegal,
});
