// Admin · Dashboard + Users

// ─── 1 Dashboard ───────────────────────────────────────────────────────
function AdminDashboard() {
  return (
    <AdminShell active="dashboard">
      <AdminPageHeader title="Dashboard" sub="Overview · 24h" actions={
        <>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 6,
            fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="calendar" size={12} /> Last 30 days
          </button>
          <button style={{
            padding: '7px 12px', background: 'var(--sky)', color: '#001426',
            border: 'none', borderRadius: 6,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="export" size={12} stroke={2.5} /> Export
          </button>
        </>
      } />

      {/* Top KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="Total users" value="38,471" sub="124 countries" trend="+218 / 30D" accent="var(--sky)" />
        <KPI label="Active subs" value="34,118" sub="88.7%" trend="+1.2%" />
        <KPI label="MRR" value="$14,212" sub="annual / 12" trend="+3.4%" />
        <KPI label="ARR" value="$170,544" sub="run-rate" trend="+18% YoY" />
        <KPI label="Churn 30D" value="1.8%" sub="net" trend="-0.3%" accent="var(--ok)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Sign-up chart */}
        <AdminCard title="NEW SIGN-UPS · LAST 30 DAYS" action={
          <div style={{ display: 'flex', gap: 4 }}>
            {['7D', '30D', '90D'].map((p, i) => (
              <span key={p} style={{
                padding: '3px 8px', borderRadius: 4, fontSize: 11,
                background: i === 1 ? 'var(--surface-2)' : 'transparent',
                color: i === 1 ? 'var(--fg)' : 'var(--fg-3)',
                fontFamily: 'var(--font-mono)',
              }}>{p}</span>
            ))}
          </div>
        }>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <span className="sd-mono" style={{ fontSize: 28, fontWeight: 500 }}>1,218</span>
            <span style={{ fontSize: 12, color: 'var(--ok)' }}>+18% vs. prior 30D</span>
          </div>
          <LineChart h={160} data={[
            {v: 14}, {v: 18}, {v: 22}, {v: 19}, {v: 28}, {v: 31}, {v: 26},
            {v: 30}, {v: 34}, {v: 38}, {v: 32}, {v: 28}, {v: 35}, {v: 42},
            {v: 48}, {v: 52}, {v: 44}, {v: 41}, {v: 46}, {v: 54}, {v: 62},
            {v: 58}, {v: 51}, {v: 48}, {v: 56}, {v: 64}, {v: 68}, {v: 72},
            {v: 65}, {v: 78},
          ]} />
        </AdminCard>

        {/* Live activity */}
        <AdminCard title="LIVE ACTIVITY" action={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />
            <span className="sd-mono" style={{ fontSize: 10, color: 'var(--ok)' }}>LIVE</span>
          </span>
        }>
          {[
            ['+', 'New signup', 'kevin.t@protonmail', '2m ago'],
            ['$', 'Renewal · $5', 'mira.k@gmail', '4m ago'],
            ['J', 'Jump #847 logged', 'erin.m · APF 14829', '6m ago'],
            ['J', 'Jump #218 signed', 'jake.r · APF 9821', '9m ago'],
            ['!', 'Flagged entry', 'user 18472 · #129', '11m ago'],
            ['x', 'Cancellation', 'tom.b@example', '14m ago'],
          ].map(([k, t, who, when], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
            }}>
              <div className="sd-mono" style={{
                width: 22, height: 22, borderRadius: 4,
                background: k === '+' ? 'var(--ok-bg)' : k === '$' ? 'var(--sky-bg)' : k === '!' ? 'var(--warn-bg)' : k === 'x' ? 'var(--danger-bg)' : 'var(--surface-2)',
                color: k === '+' ? 'var(--ok)' : k === '$' ? 'var(--sky)' : k === '!' ? 'var(--warn)' : k === 'x' ? 'var(--danger)' : 'var(--fg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flex: '0 0 auto',
              }}>{k}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</div>
              </div>
              <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{when}</span>
            </div>
          ))}
        </AdminCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <AdminCard title="PLATFORM TOTALS">
          {[
            ['Jumps logged', '4,218,902', '+8,412 / 24h'],
            ['Hours of freefall', '71,438', '+142 / 24h'],
            ['Dropzones tracked', '1,182', '+3 / 30d'],
            ['Aircraft tracked', '4,128', '+12 / 30d'],
            ['Certs registered', '128,941', ''],
          ].map(([k, v, s]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{k}</span>
              <div style={{ textAlign: 'right' }}>
                <div className="sd-mono" style={{ fontSize: 14, fontWeight: 500 }}>{v}</div>
                {s && <div className="sd-mono" style={{ fontSize: 10, color: 'var(--ok)' }}>{s}</div>}
              </div>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="OPEN INCIDENTS · 3">
          {[
            ['warn', 'Sync delay · ap-southeast-2', '24m', 'investigating'],
            ['warn', 'Stripe webhook retries elevated', '1h', 'monitoring'],
            ['ok', 'PDF export queue backlog cleared', '3h', 'resolved'],
          ].map(([k, t, when, st]) => (
            <div key={t} style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{t}</span>
                <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{when}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: k === 'warn' ? 'var(--warn)' : 'var(--ok)' }} />
                <span className="sd-mono" style={{ fontSize: 10, color: k === 'warn' ? 'var(--warn)' : 'var(--ok)', letterSpacing: '0.08em' }}>{st.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="QUEUE · NEEDS HUMAN">
          {[
            ['Flagged entries', 12, 'var(--warn)'],
            ['Support tickets · open', 8, 'var(--sky)'],
            ['Manual subscription overrides', 2, 'var(--fg-2)'],
            ['User-reported bugs', 4, 'var(--danger)'],
          ].map(([l, c, col]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{l}</span>
              <span className="sd-mono" style={{ fontSize: 16, fontWeight: 500, color: col }}>{c}</span>
            </div>
          ))}
        </AdminCard>
      </div>
    </AdminShell>
  );
}

// ─── 2 User List ───────────────────────────────────────────────────────
const SAMPLE_USERS = [
  ['#18472', 'Erin Morrison',     'erin.m@example.com',          'APF 14829',  'Active',   '847',  '14 Mar 27',  '24 May'],
  ['#18471', 'Jake Rivera',       'jake.r@example.com',          'APF 9821',   'Active',   '2,184','08 Oct 27',  '22 May'],
  ['#18470', 'Mira Kowalski',     'mira.k@example.com',          'APF 11203',  'Active',   '512',  '15 Jun 27',  '24 May'],
  ['#18469', 'Sara Davies',       'sara.d@example.com',          'APF 14004',  'Trial',    '38',   'Trial ends 03 Jun', '21 May'],
  ['#18468', 'Kevin Tan',         'kevin.t@protonmail.com',      'USPA D-39884','Active',  '1,041','12 Feb 28',  '20 May'],
  ['#18467', 'Tom Bauer',         'tom.b@example.com',           'BPA C-2284', 'Cancelled','276',  'Expired 02 May','01 May'],
  ['#18466', 'Lin Pham',          'lin.p@example.com',           'APF 13388',  'Active',   '622',  '07 Sep 27',  '18 May'],
  ['#18465', 'Diego Ortiz',       'diego.o@example.com',         'USPA D-41902','Overdue', '194',  'Failed 14 May','13 May'],
  ['#18464', 'Anna Sundqvist',    'anna.s@example.com',          'CSPA D-1124','Active',   '388',  '22 Nov 27',  '24 May'],
  ['#18463', 'Marcus O\'Reilly',  'marcus.o@example.com',        'APF 12047',  'Active',   '1,488','06 Jan 28',  '23 May'],
  ['#18462', 'Yuki Tanaka',       'yuki.t@example.com',          'JPA 8821',   'Active',   '702',  '14 Mar 27',  '24 May'],
  ['#18461', 'Priya Sharma',      'priya.s@example.com',         'IPS 2284',   'Trial',    '12',   'Trial ends 12 Jun','24 May'],
];

function StatusBadge({ status }) {
  const map = {
    Active: 'ok', Trial: 'sky', Overdue: 'warn', Cancelled: 'muted',
  };
  return <Badge kind={map[status]}>{status.toUpperCase()}</Badge>;
}

function AdminUserList() {
  return (
    <AdminShell active="users">
      <AdminPageHeader title="Users" sub="38,471 total · 34,118 active" actions={
        <button style={{
          padding: '7px 12px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 6,
          fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="export" size={12} /> Export CSV
        </button>
      } />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 260, height: 34,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
        }}>
          <Icon name="search" size={13} color="var(--fg-3)" />
          <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Search users by name, email, licence, ID…</span>
        </div>
        <Chip active>All</Chip>
        <Chip>Active</Chip>
        <Chip>Trial</Chip>
        <Chip>Overdue</Chip>
        <Chip>Cancelled</Chip>
        <Chip leading={<Icon name="filter" size={11} />}>More</Chip>
        <div style={{
          padding: '6px 10px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)',
        }}>
          <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>SORT</span>
          Last seen <Icon name="down" size={11} />
        </div>
      </div>

      <AdminTable
        cols={[
          { key: 'id',      label: 'ID',          width: '80px' },
          { key: 'name',    label: 'Name',        width: '1.4fr' },
          { key: 'email',   label: 'Email',       width: '2fr' },
          { key: 'licence', label: 'Licence',     width: '1.2fr' },
          { key: 'status',  label: 'Status',      width: '110px', render: v => <StatusBadge status={v} /> },
          { key: 'jumps',   label: 'Jumps',       width: '70px',  render: v => <span className="sd-mono">{v}</span> },
          { key: 'renew',   label: 'Sub. renews', width: '1.4fr', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'seen',    label: 'Last seen',   width: '80px',  render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{v}</span> },
        ]}
        rows={SAMPLE_USERS.map(r => ({
          id: r[0], name: r[1], email: r[2], licence: r[3], status: r[4], jumps: r[5], renew: r[6], seen: r[7],
        }))}
      />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14, fontSize: 12, color: 'var(--fg-3)',
      }}>
        <span className="sd-mono">Showing 1 — 12 of 38,471</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {['‹', '1', '2', '3', '…', '3,206', '›'].map((p, i) => (
            <span key={i} style={{
              padding: '5px 11px', background: p === '1' ? 'var(--sky-bg)' : 'var(--surface)',
              border: `1px solid ${p === '1' ? 'var(--sky)' : 'var(--border)'}`,
              borderRadius: 5, fontSize: 12,
              color: p === '1' ? 'var(--sky)' : 'var(--fg-2)',
              fontFamily: 'var(--font-mono)',
            }}>{p}</span>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

// ─── 3 User Detail ─────────────────────────────────────────────────────
function AdminUserDetail() {
  return (
    <AdminShell active="users">
      <div style={{ marginBottom: 18, fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--fg-2)' }}>Users</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span className="sd-mono">#18472</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
        <Avatar initials="EM" size={64} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Erin Morrison</div>
          <div className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>USER #18472 · APF 14829 · B-LICENCE</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Badge kind="ok">ACTIVE</Badge>
            <Badge kind="sky" icon="shield">PRO</Badge>
            <Badge kind="muted">PICTON, NSW</Badge>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Icon name="mail" size={12} /> Email user</button>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Icon name="eye" size={12} /> View as user</button>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Icon name="dots" size={12} /> More</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI label="Jumps logged" value="847" sub="lifetime" trend="+12 / 30D" />
            <KPI label="Freefall" value="14:23" sub="hours" trend="—" />
            <KPI label="Account age" value="1y 71d" sub="signed up Mar 25" trend="—" />
            <KPI label="LTV" value="$10" sub="2 renewals" trend="—" />
          </div>

          <AdminCard title="ACCOUNT DETAILS">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 12, columnGap: 18 }}>
              {[
                ['Email', 'erin.m@example.com', true],
                ['Full name', 'Erin Morrison', true],
                ['Date of birth', '14 Apr 1994', false],
                ['Phone', '+61 412 098 224', false],
                ['Home DZ', 'Skydive Picton, NSW', false],
                ['Country', 'Australia (AU)', false],
                ['Account created', '14 Mar 2025 · 09:42 AEDT', false],
                ['Last sign-in', '24 May 2026 · 16:51 AEDT · iOS', false],
                ['IP (last seen)', '203.45.18.72', false],
                ['2FA', 'Enabled · TOTP', false],
              ].map(([k, v, mono]) => (
                <div key={k}>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</div>
                  <div className={mono ? 'sd-mono' : ''} style={{ fontSize: 13, marginTop: 3, color: 'var(--fg)' }}>{v}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="ACTIVITY · LAST 7 DAYS">
            {[
              ['Logged jump #847 (Tracking)', '24 May · 16:42', 'log'],
              ['Logged jump #846 (Belly)', '24 May · 14:18', 'log'],
              ['Updated profile · home DZ', '23 May · 10:02', 'edit'],
              ['Signed in · web', '22 May · 19:48', 'eye'],
              ['Subscription auto-renewed · $5', '14 Mar · 03:00', 'card'],
            ].map(([t, when, ic], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
                <Icon name={ic} size={13} color="var(--fg-3)" />
                <span style={{ flex: 1, fontSize: 12 }}>{t}</span>
                <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{when}</span>
              </div>
            ))}
          </AdminCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="SUBSCRIPTION">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <Badge kind="sky" icon="shield">PRO · ACTIVE</Badge>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 8 }}>BILLED ANNUALLY · STRIPE</div>
              </div>
              <div className="sd-mono" style={{ fontSize: 18, fontWeight: 500 }}>$5/yr</div>
            </div>
            <div className="sd-divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--fg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Started</span><span className="sd-mono">14 Mar 2025</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Renews</span><span className="sd-mono">14 Mar 2027</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Method</span><span className="sd-mono">Visa •••• 4842</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Stripe ID</span><span className="sd-mono" style={{ fontSize: 11 }}>cus_QR8Tx2bN9k</span></div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
              <button style={{
                flex: 1, padding: '7px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
              }}>Extend</button>
              <button style={{
                flex: 1, padding: '7px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--danger)',
              }}>Revoke</button>
            </div>
          </AdminCard>

          <AdminCard title="MANUAL ACTIONS">
            {[
              ['Send password reset', 'mail'],
              ['Force sign-out', 'lock'],
              ['Apply discount…', 'star'],
              ['Comp / extend subscription', 'plus'],
              ['Lock account', 'shield'],
              ['Delete account…', 'trash'],
            ].map(([t, ic]) => (
              <div key={t} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0', borderBottom: '1px dashed var(--border)',
                color: t.startsWith('Delete') ? 'var(--danger)' : 'var(--fg-2)',
                fontSize: 13,
              }}>
                <Icon name={ic} size={13} />
                <span style={{ flex: 1 }}>{t}</span>
                <Icon name="chevron" size={11} color="var(--fg-4)" />
              </div>
            ))}
          </AdminCard>

          <AdminCard title="ADMIN NOTES" action={<span style={{ color: 'var(--sky)', fontSize: 11, fontWeight: 500 }}>+ Add</span>}>
            <div style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                Verified APF licence via PDF upload — checked against APF roster. 14 Mar 25.
              </div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>DK · 14 MAR 2025</div>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── 4 User Jump Log (read-only view of a user's jumps) ────────────────
function AdminUserJumps() {
  const rows = [
    [847, '24 May 26', 'Tracking',  'Picton',  'PAC 750XL · VH-PXM', '14,000', '0:60', '4:32', 'signed'],
    [846, '24 May 26', 'Belly',     'Picton',  'PAC 750XL · VH-PXM', '14,000', '0:58', '4:18', 'signed'],
    [845, '23 May 26', 'Wingsuit',  'Picton',  'PAC 750XL · VH-PXM', '14,000', '1:15', '5:02', 'signed'],
    [844, '18 May 26', 'Freefly',   'Mission', 'C208B · VH-CTC',     '12,000', '0:50', '3:48', 'signed'],
    [843, '18 May 26', 'Belly',     'Mission', 'C208B · VH-CTC',     '12,000', '0:48', '4:08', 'signed'],
    [842, '17 May 26', 'Tracking',  'Mission', 'C208B · VH-CTC',     '12,000', '0:52', '3:58', 'signed'],
    [841, '11 May 26', 'Belly',     'Sydney',  'Twin Otter · VH-AZW','14,000', '1:00', '4:42', 'pending'],
    [840, '10 May 26', 'Tracking',  'Sydney',  'Twin Otter · VH-AZW','14,000', '0:55', '4:30', 'signed'],
    [839, '04 May 26', 'Belly',     'Picton',  'PAC 750XL · VH-PXM', '14,000', '0:58', '4:22', 'signed'],
    [838, '03 May 26', 'Coach',     'Picton',  'PAC 750XL · VH-PXM', '12,000', '0:50', '4:10', 'signed'],
    [837, '03 May 26', 'AFF L4',    'Picton',  'PAC 750XL · VH-PXM', '12,000', '0:45', '5:18', 'flagged'],
    [836, '26 Apr 26', 'Belly',     'Picton',  'PAC 750XL · VH-PXM', '14,000', '1:02', '4:08', 'signed'],
  ];
  return (
    <AdminShell active="users">
      <div style={{ marginBottom: 18, fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--fg-2)' }}>Users</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span className="sd-mono">#18472</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span style={{ color: 'var(--fg-2)' }}>Jumps</span>
      </div>

      <AdminPageHeader title="Erin Morrison · jumps" sub="USER #18472 · APF 14829" actions={
        <>
          <Badge kind="muted">READ-ONLY</Badge>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Icon name="export" size={12} /> Export</button>
        </>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 14 }}>
        <KPI label="Total jumps" value="847" />
        <KPI label="Signed" value="841" sub="99.3%" />
        <KPI label="Pending" value="5" />
        <KPI label="Flagged" value="1" accent="var(--warn)" />
        <KPI label="Disputed" value="0" />
      </div>

      <AdminTable
        cols={[
          { key: 'num',     label: '#',        width: '60px',  render: v => <span className="sd-mono" style={{ color: 'var(--fg-3)' }}>#{v}</span> },
          { key: 'date',    label: 'Date',     width: '110px', render: v => <span className="sd-mono">{v}</span> },
          { key: 'type',    label: 'Type',     width: '110px' },
          { key: 'dz',      label: 'DZ',       width: '110px', render: v => <span style={{ color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'ac',      label: 'Aircraft', width: '1.6fr', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'exit',    label: 'Exit',     width: '80px',  render: v => <span className="sd-mono">{v}</span> },
          { key: 'ff',      label: 'FF',       width: '60px',  render: v => <span className="sd-mono">{v}</span> },
          { key: 'canopy',  label: 'Canopy',   width: '70px',  render: v => <span className="sd-mono">{v}</span> },
          { key: 'status',  label: 'Status',   width: '90px',  render: v => (
            v === 'flagged' ? <Badge kind="warn">FLAG</Badge> :
            v === 'pending' ? <Badge kind="muted">…</Badge> :
            <Badge kind="ok">✓</Badge>
          ) },
        ]}
        rows={rows.map(r => ({
          num: r[0], date: r[1], type: r[2], dz: r[3], ac: r[4], exit: r[5], ff: r[6], canopy: r[7], status: r[8],
        }))}
      />
    </AdminShell>
  );
}

Object.assign(window, {
  AdminDashboard, AdminUserList, AdminUserDetail, AdminUserJumps,
});
