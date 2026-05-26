// SkydiveLog Admin — shell + table primitives
// Denser than the user-facing web. Same palette, more data, tighter rows.

function AdminShell({ children, active }) {
  const groups = [
    [null, [['dashboard', 'Dashboard', 'chart']]],
    ['Users & accounts', [
      ['users', 'Users', 'user'],
      ['flagged', 'Flagged entries', 'shield'],
    ]],
    ['Revenue', [
      ['revenue', 'Revenue', 'card'],
      ['subs', 'Subscriptions', 'shield'],
      ['pricing', 'Plans & pricing', 'tag'],
      ['discounts', 'Discounts', 'star'],
    ]],
    ['Platform', [
      ['platform', 'Platform stats', 'chart'],
      ['export', 'Data export', 'export'],
    ]],
    ['Support', [
      ['tickets', 'Tickets', 'mail'],
      ['announce', 'Announcements', 'bell'],
    ]],
    ['Settings', [
      ['settings', 'Admin settings', 'gear'],
    ]],
  ];
  return (
    <div style={{
      width: 1440, minHeight: 960, background: '#06090F',
      color: 'var(--fg)', fontFamily: 'var(--font-ui)',
      display: 'flex',
    }}>
      <aside style={{
        width: 240, borderRight: '1px solid var(--border)',
        padding: '20px 12px', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
        background: '#080C16',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 22px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M16 19v9" stroke="#E8EEF8" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="16" cy="29" r="2" fill="#E8EEF8"/>
          </svg>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>SkydiveLog</div>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--warn)', letterSpacing: '0.1em', marginTop: 3 }}>ADMIN · PROD</div>
          </div>
        </div>

        {groups.map(([title, items], idx) => (
          <div key={title || idx} style={{ marginBottom: 14 }}>
            {title && (
              <div className="sd-mono" style={{
                fontSize: 9, color: 'var(--fg-4)', letterSpacing: '0.12em',
                textTransform: 'uppercase', padding: '6px 10px',
              }}>{title}</div>
            )}
            {items.map(([k, l, ic]) => (
              <div key={k} style={{
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '8px 10px', borderRadius: 6,
                background: active === k ? 'var(--sky-bg)' : 'transparent',
                color: active === k ? 'var(--sky)' : 'var(--fg-2)',
                fontSize: 13, fontWeight: 500, marginBottom: 2,
              }}>
                <Icon name={ic} size={15} />
                {l}
              </div>
            ))}
          </div>
        ))}

        <div style={{ flex: 1 }} />
        <div style={{
          padding: 12, borderRadius: 8, background: 'var(--surface)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Avatar initials="DK" size={28} color="var(--cyan)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Dani Kelleher</div>
            <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)' }}>SUPER-ADMIN</div>
          </div>
          <Icon name="down" size={12} color="var(--fg-3)" />
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          height: 52, padding: '0 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14, background: '#06090F',
          flex: '0 0 auto',
        }}>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>
            SkydiveLog / Admin
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
            background: 'var(--ok-bg)', borderRadius: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />
            <span className="sd-mono" style={{ fontSize: 10, color: 'var(--ok)', letterSpacing: '0.08em' }}>ALL SYSTEMS NORMAL</span>
          </div>
          <div style={{
            padding: '5px 10px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="search" size={12} color="var(--fg-3)" />
            <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>SEARCH · ⌘K</span>
          </div>
          <Icon name="bell" size={16} color="var(--fg-2)" />
        </div>

        <div style={{ flex: 1, padding: '24px 28px' }}>{children}</div>
      </main>
    </div>
  );
}

function AdminPageHeader({ title, sub, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
      <div>
        {sub && <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sub}</div>}
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>{title}</h1>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
    </div>
  );
}

function AdminCard({ children, title, action, style, padding = 18 }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding,
      ...style,
    }}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {title && <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</div>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function KPI({ label, value, sub, trend, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 16,
      borderLeft: accent ? `2px solid ${accent}` : '1px solid var(--border)',
    }}>
      <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div className="sd-mono" style={{ fontSize: 26, fontWeight: 500, marginTop: 6, lineHeight: 1, color: accent || 'var(--fg)' }}>{value}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {sub && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{sub}</div>}
        {trend && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: trend.startsWith('+') || trend === 'OK' ? 'var(--ok)' : trend === '—' ? 'var(--fg-3)' : 'var(--danger)' }}>
            {trend !== '—' && <Icon name={trend.startsWith('+') || trend === 'OK' ? 'up' : 'down'} size={10} stroke={2.5} />}
            <span className="sd-mono">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTable({ cols, rows, dense = true }) {
  // cols: [{key, label, width, render?}]
  // rows: array of objects
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: cols.map(c => c.width || '1fr').join(' '),
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
        letterSpacing: '0.1em', textTransform: 'uppercase', gap: 10,
      }}>
        {cols.map(c => <span key={c.key}>{c.label}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={r.id || i} style={{
          display: 'grid', gridTemplateColumns: cols.map(c => c.width || '1fr').join(' '),
          padding: dense ? '8px 16px' : '12px 16px',
          borderBottom: i < rows.length-1 ? '1px solid var(--border)' : 'none',
          fontSize: 13, gap: 10, alignItems: 'center',
        }}>
          {cols.map(c => (
            <span key={c.key} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.render ? c.render(r[c.key], r) : r[c.key]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// Line chart (super simple, for new signups etc.)
function LineChart({ data, color = 'var(--sky)', h = 140, fill = true }) {
  const max = Math.max(...data.map(d => d.v)) * 1.1;
  const w = 100;
  const pts = data.map((d, i) => [(i/(data.length-1))*w, h - (d.v/max) * (h - 20)]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const fillPath = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ln" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3"/>
          <stop offset="1" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fill && <path d={fillPath} fill="url(#ln)" />}
      <path d={path} stroke={color} strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

Object.assign(window, {
  AdminShell, AdminPageHeader, AdminCard, KPI, AdminTable, LineChart,
});
