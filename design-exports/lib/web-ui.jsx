// SkydiveLog Web — shared chrome (nav, footer, hero blocks)
// Used by marketing, auth, and account pages.

function WebNav({ active, authed = false }) {
  const items = [
    ['Features', 'features'],
    ['Pricing', 'pricing'],
    ['About', 'about'],
    ['Contact', 'contact'],
  ];
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 56px', borderBottom: '1px solid var(--border)',
      background: 'rgba(10,18,32,0.85)', backdropFilter: 'blur(12px)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M16 19v9" stroke="#E8EEF8" strokeWidth="2.2" strokeLinecap="round"/>
          <circle cx="16" cy="29" r="2" fill="#E8EEF8"/>
        </svg>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>SkydiveLog</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {items.map(([l, k]) => (
          <a key={k} style={{
            color: active === k ? 'var(--fg)' : 'var(--fg-2)',
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}>{l}</a>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {authed ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}>
              <Avatar initials="EM" size={26} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Erin M.</span>
            </div>
          </>
        ) : (
          <>
            <a style={{ color: 'var(--fg-2)', fontSize: 14, fontWeight: 500 }}>Log in</a>
            <button style={{
              background: 'var(--sky)', color: '#001426', border: 'none',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              padding: '10px 18px', borderRadius: 8, cursor: 'pointer',
            }}>Sign up</button>
          </>
        )}
      </div>
    </nav>
  );
}

function WebFooter() {
  return (
    <footer style={{
      padding: '56px 56px 40px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M16 19v9" stroke="#E8EEF8" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="16" cy="29" r="2" fill="#E8EEF8"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700 }}>SkydiveLog</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-3)', maxWidth: 280, lineHeight: 1.55 }}>
            The professional logbook built for licensed skydivers. $5/year, no ads, your data is yours.
          </div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 22, letterSpacing: '0.06em' }}>© 2026 SkydiveLog · v2.4.1</div>
        </div>
        {[
          ['Product', ['Features', 'Pricing', 'Download iOS', 'Download Android', 'Change log']],
          ['Company', ['About', 'Contact', 'Press kit', 'Careers']],
          ['Resources', ['Help centre', 'Status', 'Roadmap', 'Community']],
          ['Legal', ['Privacy', 'Terms', 'Cookies', 'DPA']],
        ].map(([title, links]) => (
          <div key={title}>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>{title}</div>
            {links.map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 8 }}>{l}</div>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}

// Page shell — sticky nav + main area + footer
function WebPage({ children, nav = true, footer = true, active, authed }) {
  return (
    <div style={{
      width: 1280, minHeight: 900, background: 'var(--bg)',
      color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: 15,
      letterSpacing: '-0.01em', position: 'relative', overflow: 'hidden',
    }}>
      {nav && <WebNav active={active} authed={authed} />}
      {children}
      {footer && <WebFooter />}
    </div>
  );
}

// Hero stat counter
function LiveStat({ value, label, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sky)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div className="sd-mono" style={{ fontSize: 36, fontWeight: 500, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Auth shell — centered card
function AuthShell({ children, title, sub, width = 440 }) {
  return (
    <div style={{
      width: 1280, height: 900, background: 'var(--bg)',
      color: 'var(--fg)', fontFamily: 'var(--font-ui)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(74,158,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(52,210,214,0.08) 0%, transparent 50%)',
      }} />
      <div style={{ position: 'absolute', top: 40, left: 56, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="2.2" strokeLinejoin="round"/>
          <path d="M16 19v9" stroke="#E8EEF8" strokeWidth="2.2" strokeLinecap="round"/>
          <circle cx="16" cy="29" r="2" fill="#E8EEF8"/>
        </svg>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>SkydiveLog</span>
      </div>
      <div style={{ position: 'relative', width, padding: '48px 44px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{title}</div>
        {sub && <div style={{ color: 'var(--fg-2)', fontSize: 14, marginBottom: 28 }}>{sub}</div>}
        {children}
      </div>
    </div>
  );
}

// Account shell — sidebar layout
function AccountShell({ children, active }) {
  const items = [
    ['dashboard', 'Dashboard', 'chart'],
    ['logbook',   'Logbook',   'log'],
    ['settings',  'Settings',  'gear'],
    ['sub',       'Subscription', 'shield'],
    ['billing',   'Billing',   'card'],
  ];
  return (
    <div style={{
      width: 1280, minHeight: 900, background: 'var(--bg)',
      color: 'var(--fg)', fontFamily: 'var(--font-ui)',
      display: 'flex',
    }}>
      <aside style={{
        width: 240, borderRight: '1px solid var(--border)',
        padding: '24px 16px', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 24px' }}>
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M16 19v9" stroke="#E8EEF8" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="16" cy="29" r="2" fill="#E8EEF8"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700 }}>SkydiveLog</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(([k, l, ic]) => (
            <div key={k} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8,
              background: active === k ? 'var(--sky-bg)' : 'transparent',
              color: active === k ? 'var(--sky)' : 'var(--fg-2)',
              fontSize: 14, fontWeight: 500,
            }}>
              <Icon name={ic} size={17} />
              {l}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{
          padding: 14, borderRadius: 10, background: 'var(--surface)',
          border: '1px solid var(--border)', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Avatar initials="EM" size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Erin Morrison</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>APF 14829</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge kind="sky" icon="shield">PRO</Badge>
            <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>RENEWS 14 MAR 27</span>
          </div>
        </div>
        <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="export" size={15} /> Sign out
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: '32px 48px' }}>{children}</main>
    </div>
  );
}

// Stat tile (web)
function WebStat({ value, label, sub, trend, large = false }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: large ? 28 : 22,
    }}>
      <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div className="sd-mono" style={{ fontSize: large ? 42 : 30, fontWeight: 500, marginTop: 8, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 6 }}>{sub}</div>}
      {trend && (
        <div style={{
          marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, color: trend.startsWith('+') ? 'var(--ok)' : 'var(--danger)',
        }}>
          <Icon name={trend.startsWith('+') ? 'up' : 'down'} size={12} stroke={2.5} /> {trend}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  WebNav, WebFooter, WebPage, LiveStat, AuthShell, AccountShell, WebStat,
});
