// SkydiveLog — Onboarding screens (6)
// Splash, Welcome, Sign In, Create Account, Paywall, Forgot Password

// ─── 01 Splash ─────────────────────────────────────────────────────────
function ScreenSplash() {
  return (
    <Screen noStatus>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1A2A4A 0%, #0A1220 60%)',
      }}>
        <svg width="72" height="72" viewBox="0 0 32 32" fill="none">
          <path d="M4 12a12 12 0 0124 0" stroke="var(--sky)" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 12l12 7 12-7" stroke="var(--sky)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 19v9" stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="29" r="2" fill="var(--fg)" />
        </svg>
        <div style={{
          fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 28,
          color: 'var(--fg)', letterSpacing: '-0.02em', marginTop: 16,
        }}>SkydiveLog</div>
        <div className="sd-mono" style={{
          fontSize: 11, color: 'var(--fg-3)',
          textTransform: 'uppercase', letterSpacing: '0.2em',
          marginTop: 6,
        }}>v 2.4.1 · Loading</div>
        <div style={{ position: 'absolute', bottom: 100, width: 120 }}>
          <Progress value={68} />
        </div>
      </div>
    </Screen>
  );
}

// ─── 02 Welcome ────────────────────────────────────────────────────────
function ScreenWelcome() {
  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', padding: '40px 24px 0' }}>
          <Placeholder label="hero · canopy over DZ" height={360} style={{ marginBottom: 28 }} />
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            The logbook<br/>built for jumpers.
          </div>
          <div style={{ fontSize: 15, color: 'var(--fg-2)', marginTop: 12, lineHeight: 1.5 }}>
            Sign every jump in your pocket. Track gear, currency and certifications. Built by skydivers, for skydivers.
          </div>
        </div>
        <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button>Create account</Button>
          <Button variant="ghost">I already have an account</Button>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }} className="sd-mono">
            $5 / year · cancel any time
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─── 03 Sign In ────────────────────────────────────────────────────────
function ScreenSignIn() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Sign in" large={false} />
      <div style={{ padding: '12px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome back.</div>
        <div style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: 28 }}>Sign in to keep your logbook in sync.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Email" placeholder="you@example.com" icon="mail" value="erin@example.com" />
          <Input label="Password" placeholder="••••••••" icon="lock" type="password" value="••••••••••" />
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 13, color: 'var(--sky)', fontWeight: 500 }}>Forgot password?</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 24 }}>
          <Button>Sign in</Button>
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--fg-2)' }}>
            New here? <span style={{ color: 'var(--sky)', fontWeight: 500 }}>Create account</span>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ─── 04 Create Account ─────────────────────────────────────────────────
function ScreenCreate() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Create account" large={false} />
      <div style={{ padding: '12px 24px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Set up your logbook.</div>
        <div style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: 24 }}>You can edit these later in your profile.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Full name" placeholder="Erin Morrison" />
          <Input label="Email" placeholder="you@example.com" icon="mail" />
          <Input label="Password" placeholder="At least 8 characters" icon="lock" type="password" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Licence #" placeholder="APF 14829" />
            <Input label="Rating" placeholder="B" />
          </div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
            marginTop: 4,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5, background: 'var(--sky)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1,
            }}>
              <Icon name="check" size={14} color="#001426" stroke={3} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.45 }}>
              I agree to the <span style={{ color: 'var(--fg)' }}>Terms</span> and <span style={{ color: 'var(--fg)' }}>Privacy Policy</span>.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 22 }}>
          <Button>Continue</Button>
        </div>
      </div>
    </Screen>
  );
}

// ─── 05 Paywall ─────────────────────────────────────────────────────────
function ScreenPaywall() {
  return (
    <Screen>
      <div style={{ padding: '8px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <IconBtn name="close" />
      </div>
      <div style={{ flex: 1, padding: '20px 24px 0', overflowY: 'auto' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: 'var(--sky-bg)', color: 'var(--sky)',
          fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: 14,
        }}>
          <Icon name="shield" size={12} stroke={2.2} /> SkydiveLog Pro
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          One subscription.<br />Every jump, forever.
        </div>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['log', 'Unlimited jumps', 'Log offline, sync when back in range.'],
            ['signature', 'Instructor sign-off', 'QR sign-off works for any verifier.'],
            ['export', 'Export your logbook', 'PDF and CSV. Yours to keep.'],
            ['bell', 'Currency & repack alerts', 'Never miss a re-qual or AAD service.'],
          ].map(([icon, t, s]) => (
            <div key={t} style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--sky)', flex: '0 0 auto',
              }}>
                <Icon name={icon} size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
        <Card style={{ marginTop: 24, borderColor: 'var(--sky)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>Annual</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Billed once, renews yearly.</div>
            </div>
            <div className="sd-mono" style={{ fontSize: 22, fontWeight: 500 }}>
              $5<span style={{ fontSize: 12, color: 'var(--fg-2)' }}>/yr</span>
            </div>
          </div>
        </Card>
      </div>
      <div style={{ padding: '16px 24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button icon="card">Subscribe with Apple Pay</Button>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          $5.00 USD billed today · Stripe · cancel anytime
        </div>
      </div>
    </Screen>
  );
}

// ─── 06 Forgot Password ────────────────────────────────────────────────
function ScreenForgot() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Reset password" large={false} />
      <div style={{ padding: '12px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>Forgot password?</div>
        <div style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: 24 }}>
          Enter the email on your account and we'll send a reset link.
        </div>
        <Input label="Email" placeholder="you@example.com" icon="mail" />
        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button>Send reset link</Button>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-2)' }}>
            Remember it? <span style={{ color: 'var(--sky)', fontWeight: 500 }}>Sign in</span>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  ScreenSplash, ScreenWelcome, ScreenSignIn, ScreenCreate, ScreenPaywall, ScreenForgot,
});
