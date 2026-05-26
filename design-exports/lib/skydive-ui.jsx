// SkydiveLog shared UI components & primitives
// Exports Screen, StatusBar, HomeIndicator, TopBar, BottomTabs, Icon, Card,
// Chip, Badge, Button, Input, Field, plus various visual primitives.

// ─── Icons ──────────────────────────────────────────────────────────────
function Icon({ name, size = 20, color = 'currentColor', stroke = 1.8 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'log': return <svg {...p}><path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
    case 'chart': return <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case 'parachute': return <svg {...p}><path d="M3 11a9 9 0 0118 0"/><path d="M3 11l9 5 9-5"/><path d="M12 16v5"/><path d="M9 21h6"/></svg>;
    case 'cert': return <svg {...p}><path d="M9 3h6l4 4v14H5V7l4-4z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'user': return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case 'filter': return <svg {...p}><path d="M3 5h18M6 12h12M10 19h4"/></svg>;
    case 'plus': return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'back': return <svg {...p}><path d="M15 5l-7 7 7 7"/></svg>;
    case 'close': return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'check': return <svg {...p}><path d="M5 12l5 5 9-11"/></svg>;
    case 'chevron': return <svg {...p}><path d="M9 5l7 7-7 7"/></svg>;
    case 'down': return <svg {...p}><path d="M5 9l7 7 7-7"/></svg>;
    case 'up': return <svg {...p}><path d="M5 15l7-7 7 7"/></svg>;
    case 'star': return <svg {...p}><path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.4L12 17l-5.7 3.3 1.5-6.4L3 9.6 9.3 9z"/></svg>;
    case 'star-fill': return <svg {...p} fill={color}><path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.5 6.4L12 17l-5.7 3.3 1.5-6.4L3 9.6 9.3 9z"/></svg>;
    case 'edit': return <svg {...p}><path d="M14 4l6 6-11 11H3v-6L14 4z"/></svg>;
    case 'trash': return <svg {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>;
    case 'plane': return <svg {...p}><path d="M21 12l-9 4-9-4 4-2 5 2 5-2 4 2z"/><path d="M12 16v4M10 20h4"/></svg>;
    case 'map': return <svg {...p}><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15M15 6v15"/></svg>;
    case 'tag': return <svg {...p}><path d="M3 12V3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.5"/></svg>;
    case 'qr': return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 14v3M14 21h3M21 17v4"/></svg>;
    case 'signature': return <svg {...p}><path d="M3 17c2-1 3-3 4-5s2-4 3-4 1 2 2 4 2 4 3 4 2-2 3-3"/><path d="M3 21h18"/></svg>;
    case 'gear': return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>;
    case 'bell': return <svg {...p}><path d="M6 10a6 6 0 0112 0v5l2 3H4l2-3v-5z"/><path d="M10 21h4"/></svg>;
    case 'export': return <svg {...p}><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 21h14"/></svg>;
    case 'eye': return <svg {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'clock': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'arrow-up-right': return <svg {...p}><path d="M7 17L17 7M7 7h10v10"/></svg>;
    case 'dz': return <svg {...p}><path d="M12 22s7-7 7-13a7 7 0 10-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'altitude': return <svg {...p}><path d="M3 20l5-12 4 8 3-5 6 9z"/></svg>;
    case 'shield': return <svg {...p}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/></svg>;
    case 'menu': return <svg {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'dots': return <svg {...p}><circle cx="6" cy="12" r="1.4" fill={color}/><circle cx="12" cy="12" r="1.4" fill={color}/><circle cx="18" cy="12" r="1.4" fill={color}/></svg>;
    case 'lock': return <svg {...p}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
    case 'mail': return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case 'card': return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/></svg>;
    case 'pie': return <svg {...p}><path d="M12 3v9l8 5A9 9 0 1112 3z"/></svg>;
    case 'bar': return <svg {...p}><rect x="4" y="12" width="3" height="8"/><rect x="10" y="6" width="3" height="14"/><rect x="16" y="9" width="3" height="11"/></svg>;
    case 'wifi-off': return <svg {...p}><path d="M3 3l18 18M16.7 10A9 9 0 005 6"/><path d="M19 13c-1-1-2-2-3-2"/></svg>;
    case 'share': return <svg {...p}><path d="M12 3v13M7 8l5-5 5 5"/><path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5"/></svg>;
    case 'pdf': return <svg {...p}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"/><path d="M14 3v6h6"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

// ─── Status bar + home indicator ────────────────────────────────────────
function StatusBar({ time = '9:41' }) {
  return (
    <div className="sd-statusbar">
      <span style={{ fontFamily: 'var(--font-ui)' }}>{time}</span>
      <div className="sd-sb-icons">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="0.5"/>
          <rect x="4.5" y="5" width="3" height="6" rx="0.5"/>
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.5"/>
          <rect x="13.5" y="0" width="3" height="11" rx="0.5"/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
          <path d="M8 2.5C10.2 2.5 12.2 3.3 13.6 4.7L14.7 3.6C13 2 10.6 1 8 1S3 2 1.3 3.6L2.4 4.7C3.8 3.3 5.8 2.5 8 2.5z"/>
          <path d="M8 5.8C9.3 5.8 10.5 6.3 11.4 7.2L12.5 6.1C11.3 4.9 9.7 4.2 8 4.2S4.7 4.9 3.5 6.1L4.6 7.2C5.5 6.3 6.7 5.8 8 5.8z"/>
          <circle cx="8" cy="9.3" r="1.5"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" strokeOpacity="0.5"/>
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor"/>
          <path d="M23 4v4c.7-.2 1.2-.9 1.2-2S23.7 4.2 23 4z" fill="currentColor" fillOpacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

function HomeIndicator() { return <div className="sd-home-indicator" />; }

// ─── Screen wrapper ─────────────────────────────────────────────────────
function Screen({ children, tab, noStatus, noHome, style }) {
  return (
    <div className="sd-screen" style={style}>
      {!noStatus && <StatusBar />}
      {children}
      {tab && <BottomTabs active={tab} />}
      {!noHome && <HomeIndicator />}
    </div>
  );
}

// ─── Top bar ────────────────────────────────────────────────────────────
function TopBar({ title, sub, leading, trailing, large = true }) {
  return (
    <div className="sd-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        {leading}
        <div style={{ minWidth: 0 }}>
          <div className="sd-topbar-title" style={{ fontSize: large ? 28 : 19 }}>{title}</div>
          {sub && <div className="sd-topbar-sub">{sub}</div>}
        </div>
      </div>
      {trailing && <div className="sd-topbar-actions">{trailing}</div>}
    </div>
  );
}

function IconBtn({ name, onClick, badge, style }) {
  return (
    <button className="sd-icon-btn" onClick={onClick} style={{ position: 'relative', ...style }}>
      <Icon name={name} size={18} />
      {badge && <span style={{
        position: 'absolute', top: 5, right: 5, width: 7, height: 7,
        borderRadius: 4, background: 'var(--sky)', border: '2px solid var(--surface)',
      }} />}
    </button>
  );
}

// ─── Bottom tabs ────────────────────────────────────────────────────────
function BottomTabs({ active = 'log' }) {
  const tabs = [
    { id: 'log',    label: 'Log',     icon: 'log' },
    { id: 'stats',  label: 'Stats',   icon: 'chart' },
    { id: 'gear',   label: 'Gear',    icon: 'parachute' },
    { id: 'certs',  label: 'Certs',   icon: 'cert' },
    { id: 'profile',label: 'Profile', icon: 'user' },
  ];
  return (
    <div className="sd-tabbar">
      {tabs.map(t => (
        <button key={t.id} className={`sd-tab ${active === t.id ? 'is-active' : ''}`}>
          <Icon name={t.icon} size={22} stroke={active === t.id ? 2 : 1.8} />
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Primitives ─────────────────────────────────────────────────────────
function Card({ children, style, onClick }) {
  return <div className="sd-card" style={style} onClick={onClick}>{children}</div>;
}

function Button({ children, variant = 'primary', icon, style, onClick }) {
  const cls = variant === 'ghost' ? 'sd-btn sd-btn-ghost' : variant === 'sub' ? 'sd-btn sd-btn-sub' : 'sd-btn';
  return (
    <button className={cls} style={style} onClick={onClick}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

function Chip({ children, active, leading, trailing, onClick }) {
  return (
    <button className={`sd-chip ${active ? 'is-active' : ''}`} onClick={onClick}>
      {leading}
      {children}
      {trailing}
    </button>
  );
}

function Badge({ children, kind = 'sky', icon }) {
  return (
    <span className={`sd-badge sd-badge-${kind}`}>
      {icon && <Icon name={icon} size={11} stroke={2.2} />}
      {children}
    </span>
  );
}

function Input({ placeholder, value, label, icon, type = 'text', style }) {
  return (
    <div style={style}>
      {label && <label className="sd-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)' }}><Icon name={icon} size={18} /></span>}
        <input
          className="sd-input"
          placeholder={placeholder}
          defaultValue={value}
          type={type}
          style={{ paddingLeft: icon ? 44 : 14 }}
        />
      </div>
    </div>
  );
}

function Field({ label, value, mono, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-2)', marginBottom: 4 }}>{label}</div>
        <div className={mono ? 'sd-mono' : ''} style={{ fontSize: 15, color: 'var(--fg)' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}

// ─── Search input compact ──────────────────────────────────────────────
function SearchBar({ placeholder = 'Search jumps' }) {
  return (
    <div style={{
      position: 'relative',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      height: 40,
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: 10,
    }}>
      <Icon name="search" size={16} color="var(--fg-3)" />
      <span style={{ color: 'var(--fg-3)', fontSize: 15, flex: 1 }}>{placeholder}</span>
    </div>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────
function Avatar({ initials, size = 40, color = 'var(--sky)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size,
      background: `linear-gradient(135deg, ${color}, var(--sky-dim))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#001426', fontWeight: 600, fontSize: size * 0.4,
      fontFamily: 'var(--font-ui)', letterSpacing: '0.02em',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>{initials}</div>
  );
}

// ─── Placeholder image ─────────────────────────────────────────────────
function Placeholder({ label, height = 120, style }) {
  return <div className="sd-img-placeholder" style={{ height, ...style }}>{label}</div>;
}

// ─── Tag chip with color ────────────────────────────────────────────────
function Tag({ children, color = 'var(--sky)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, padding: '4px 10px', borderRadius: 999,
      background: 'rgba(74,158,255,0.1)', color,
      border: `1px solid ${color}33`,
      fontFamily: 'var(--font-ui)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 3, background: color }} />
      {children}
    </span>
  );
}

// ─── Big stat ──────────────────────────────────────────────────────────
function StatBig({ label, value, sub, unit }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-2)' }}>{label}</div>
      <div className="sd-mono" style={{ fontSize: 36, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.1, marginTop: 4 }}>
        {value}
        {unit && <span style={{ fontSize: 14, color: 'var(--fg-2)', marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────
function Progress({ value = 50, color = 'var(--sky)', height = 6 }) {
  return (
    <div style={{
      height, borderRadius: height,
      background: 'var(--surface-2)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${value}%`, height: '100%',
        background: color, borderRadius: height,
      }} />
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────
function Toggle({ on }) {
  return (
    <div style={{
      width: 44, height: 26, borderRadius: 14,
      background: on ? 'var(--sky)' : 'var(--surface-3)',
      position: 'relative', flex: '0 0 auto',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 22, height: 22, borderRadius: 11,
        background: '#fff',
        transition: 'left .15s',
      }} />
    </div>
  );
}

// ─── Currency ring (for currency bar in stats) ─────────────────────────
function CurrencyRing({ percent, label, sub, color = 'var(--ok)', size = 80 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--surface-2)" strokeWidth="4" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent/100)}
          strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div className="sd-mono" style={{ fontSize: 16, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── SkydiveLog wordmark ───────────────────────────────────────────────
function Logo({ size = 28, color = 'var(--fg)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M4 12a12 12 0 0124 0" stroke="var(--sky)" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M4 12l12 7 12-7" stroke="var(--sky)" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M16 19v9" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="16" cy="29" r="2" fill={color} />
      </svg>
      <span style={{
        fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: size * 0.65,
        color, letterSpacing: '-0.02em',
      }}>
        SkydiveLog
      </span>
    </div>
  );
}

Object.assign(window, {
  Icon, StatusBar, HomeIndicator, Screen, TopBar, IconBtn, BottomTabs,
  Card, Button, Chip, Badge, Input, Field, SearchBar, Avatar, Placeholder,
  Tag, StatBig, Progress, Toggle, CurrencyRing, Logo,
});
