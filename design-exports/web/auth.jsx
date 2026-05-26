// SkydiveLog Web — Auth pages (6)

// ─── 8 Sign Up ─────────────────────────────────────────────────────────
function PageWebSignUp() {
  return (
    <AuthShell title="Create your logbook." sub="30-day free trial. No card required.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Full name" placeholder="Erin Morrison" />
        <Input label="Email" placeholder="you@example.com" icon="mail" />
        <Input label="Password" placeholder="At least 8 characters" icon="lock" type="password" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="Licence #" placeholder="APF 14829" />
          <Input label="Rating" placeholder="B" />
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
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
        <Button>Create account</Button>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
          Already have an account? <span style={{ color: 'var(--sky)', fontWeight: 500 }}>Log in</span>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── 9 Payment (Stripe) ────────────────────────────────────────────────
function PagePayment() {
  return (
    <AuthShell title="One last step." sub="$5 / year — cancel any time." width={520}>
      <div style={{
        background: 'rgba(74,158,255,0.08)', border: '1px solid var(--sky)',
        borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 22,
      }}>
        <Icon name="shield" size={20} color="var(--sky)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>SkydiveLog Pro · Annual</div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Trial ends 13 Jun. Billed $5 USD then.</div>
        </div>
        <div className="sd-mono" style={{ fontSize: 18, fontWeight: 500 }}>$5.00</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Card number" placeholder="1234 1234 1234 1234" icon="card" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="Expiry" placeholder="MM / YY" />
          <Input label="CVC" placeholder="123" />
        </div>
        <Input label="Cardholder name" placeholder="As shown on card" />
        <Input label="Postal code" placeholder="2000" />
      </div>

      <Button style={{ marginTop: 22 }} icon="lock">Pay $5 · Start trial</Button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        <Icon name="lock" size={12} color="var(--fg-3)" />
        <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>SECURED BY STRIPE · PCI-DSS COMPLIANT</span>
      </div>
    </AuthShell>
  );
}

// ─── 10 Sign Up Success ────────────────────────────────────────────────
function PageSignUpSuccess() {
  return (
    <AuthShell title="You're in." sub="Your 30-day trial just started." width={500}>
      <div style={{
        width: 70, height: 70, borderRadius: 35, background: 'var(--ok-bg)',
        border: '2px solid var(--ok)', margin: '0 auto 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="check" size={36} color="var(--ok)" stroke={2.5} />
      </div>

      <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 8 }}>NEXT</div>
      <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>Get the app.</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', textAlign: 'center', marginBottom: 22 }}>The logbook lives on your phone. Web is read-only.</div>

      <div style={{ display: 'flex', gap: 10 }}>
        {[
          ['App Store', 'iOS 16+'],
          ['Google Play', 'Android 11+'],
        ].map(([s, v]) => (
          <div key={s} style={{
            flex: 1, padding: 14, background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg)' }} />
            <div>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)' }}>DOWNLOAD</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 22, padding: 14, background: 'var(--surface-2)',
        borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Icon name="qr" size={28} color="var(--fg-2)" />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fg-2)' }}>
          Or scan with your phone to send a download link to yourself.
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <span style={{ color: 'var(--sky)', fontSize: 14, fontWeight: 500 }}>Go to web logbook →</span>
      </div>
    </AuthShell>
  );
}

// ─── 11 Log In ─────────────────────────────────────────────────────────
function PageWebLogin() {
  return (
    <AuthShell title="Welcome back." sub="Sign in to your account.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email" placeholder="you@example.com" icon="mail" value="erin@example.com" />
        <Input label="Password" placeholder="••••••••" icon="lock" type="password" value="••••••••••" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-2)' }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, background: 'var(--sky)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={12} color="#001426" stroke={3} />
            </div>
            Keep me signed in
          </label>
          <span style={{ color: 'var(--sky)', fontSize: 13, fontWeight: 500 }}>Forgot password?</span>
        </div>
        <Button>Sign in</Button>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
          New here? <span style={{ color: 'var(--sky)', fontWeight: 500 }}>Create an account</span>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── 12 Forgot ─────────────────────────────────────────────────────────
function PageWebForgot() {
  return (
    <AuthShell title="Forgot password?" sub="We'll send a reset link to your inbox.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email" placeholder="you@example.com" icon="mail" />
        <Button>Send reset link</Button>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
          <span style={{ color: 'var(--sky)', fontWeight: 500 }}>← Back to sign in</span>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── 13 Reset Password ─────────────────────────────────────────────────
function PageWebReset() {
  return (
    <AuthShell title="Choose a new password." sub="At least 8 characters.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="New password" placeholder="••••••••" icon="lock" type="password" />
        <Input label="Confirm password" placeholder="••••••••" icon="lock" type="password" />
        <div style={{
          padding: 12, background: 'var(--surface-2)', borderRadius: 8,
          fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5,
        }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', marginBottom: 6 }}>STRENGTH</div>
          <Progress value={75} color="var(--ok)" height={5} />
          <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--ok)' }}>✓ 8+ chars</span>
            <span style={{ color: 'var(--ok)' }}>✓ Mixed case</span>
            <span style={{ color: 'var(--fg-3)' }}>✗ Number or symbol</span>
          </div>
        </div>
        <Button>Update password</Button>
      </div>
    </AuthShell>
  );
}

Object.assign(window, {
  PageWebSignUp, PagePayment, PageSignUpSuccess,
  PageWebLogin, PageWebForgot, PageWebReset,
});
