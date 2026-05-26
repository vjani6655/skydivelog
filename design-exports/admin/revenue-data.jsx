// Admin · Revenue + Data & platform

// ─── 5 Revenue Dashboard ───────────────────────────────────────────────
function AdminRevenue() {
  return (
    <AdminShell active="revenue">
      <AdminPageHeader title="Revenue" sub="Lifetime · USD" actions={
        <>
          <button style={{
            padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Icon name="calendar" size={12} /> Last 12 months</button>
          <button style={{
            padding: '7px 12px', background: 'var(--sky)', color: '#001426',
            border: 'none', borderRadius: 6,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          }}>Export to Stripe</button>
        </>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="MRR" value="$14,212" sub="Annual / 12" trend="+3.4%" accent="var(--sky)" />
        <KPI label="ARR" value="$170,544" sub="Run-rate" trend="+18% YoY" />
        <KPI label="Net new (30d)" value="+$682" sub="142 paid" trend="+24%" accent="var(--ok)" />
        <KPI label="Churn rate" value="1.8%" sub="30d net" trend="-0.3%" />
        <KPI label="Renewal forecast" value="$48,210" sub="next 90 days" trend="92% hist." />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <AdminCard title="MRR · 12 MONTHS" action={
          <div style={{ display: 'flex', gap: 14, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--sky)' }} /> MRR
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cyan)' }} /> Renewals
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--danger)' }} /> Churn
            </span>
          </div>
        }>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
            <span className="sd-mono" style={{ fontSize: 32, fontWeight: 500 }}>$14,212</span>
            <span style={{ fontSize: 13, color: 'var(--ok)' }}>+$432 this month</span>
          </div>
          <BarChart h={180} data={[
            { label: 'Jun', v: 7800 },
            { label: 'Jul', v: 8200 },
            { label: 'Aug', v: 8800 },
            { label: 'Sep', v: 9400 },
            { label: 'Oct', v: 9900 },
            { label: 'Nov', v: 10800 },
            { label: 'Dec', v: 11400 },
            { label: 'Jan', v: 12100 },
            { label: 'Feb', v: 12600 },
            { label: 'Mar', v: 13200 },
            { label: 'Apr', v: 13800 },
            { label: 'May', v: 14212, highlight: true },
          ]} />
        </AdminCard>

        <AdminCard title="REVENUE BREAKDOWN · 30D">
          <div style={{ marginBottom: 18 }}>
            <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500 }}>$1,684</div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>NET REVENUE</div>
          </div>
          {[
            ['Renewals', 1428, 'var(--sky)', 84.8],
            ['New subscriptions', 312, 'var(--ok)', 18.5],
            ['Refunds', -38, 'var(--warn)', 2.3],
            ['Failed retries', -18, 'var(--danger)', 1.1],
          ].map(([n, amt, col, pct]) => (
            <div key={n} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--fg-2)' }}>{n}</span>
                <span className="sd-mono">{amt < 0 ? '-' : ''}${Math.abs(amt).toLocaleString()}</span>
              </div>
              <Progress value={Math.min(pct * 5, 100)} color={col} height={4} />
            </div>
          ))}
        </AdminCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <AdminCard title="GEOGRAPHY · TOP 5">
          {[
            ['Australia', 14842, 38.6],
            ['United States', 9421, 24.5],
            ['United Kingdom', 4218, 11.0],
            ['Canada', 2188, 5.7],
            ['New Zealand', 1402, 3.6],
          ].map(([n, c, pct]) => (
            <div key={n} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--fg-2)' }}>{n}</span>
                <span className="sd-mono">{c.toLocaleString()} <span style={{ color: 'var(--fg-3)' }}>· {pct}%</span></span>
              </div>
              <Progress value={pct * 2.5} color="var(--sky)" height={4} />
            </div>
          ))}
        </AdminCard>

        <AdminCard title="RENEWAL FORECAST · 90D">
          {[
            ['Next 30 days', '$16,420', 3284, 'high'],
            ['31 — 60 days', '$15,890', 3178, 'high'],
            ['61 — 90 days', '$15,900', 3180, 'mid'],
          ].map(([w, amt, c, conf]) => (
            <div key={w} style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{w}</span>
                <span className="sd-mono" style={{ fontSize: 14, fontWeight: 500 }}>{amt}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{c.toLocaleString()} accounts</span>
                <span className="sd-mono" style={{ fontSize: 10, color: conf === 'high' ? 'var(--ok)' : 'var(--warn)' }}>CONF {conf.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="PAYMENT FAILURES · 30D">
          <div style={{ marginBottom: 12 }}>
            <div className="sd-mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--warn)' }}>62</div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>1.8% OF ATTEMPTS</div>
          </div>
          {[
            ['Card declined', 28, 'danger'],
            ['Insufficient funds', 18, 'warn'],
            ['Card expired', 12, 'muted'],
            ['Other', 4, 'muted'],
          ].map(([n, c, k]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--fg-2)' }}>{n}</span>
              <span className="sd-mono">{c}</span>
            </div>
          ))}
        </AdminCard>
      </div>
    </AdminShell>
  );
}

// ─── 6 Subscriptions list ──────────────────────────────────────────────
function AdminSubscriptions() {
  const subs = [
    ['sub_R8421', '#18472', 'Erin Morrison',  'Active',   '$5/yr', '14 Mar 25', '14 Mar 27', 'Visa •••• 4842'],
    ['sub_R8420', '#18471', 'Jake Rivera',    'Active',   '$5/yr', '08 Oct 24', '08 Oct 27', 'Mastercard •••• 1122'],
    ['sub_R8419', '#18470', 'Mira Kowalski',  'Active',   '$5/yr', '15 Jun 24', '15 Jun 27', 'Apple Pay'],
    ['sub_R8418', '#18469', 'Sara Davies',    'Trial',    '—',     '04 May 26', 'Trial ends 03 Jun', '—'],
    ['sub_R8417', '#18468', 'Kevin Tan',      'Active',   '$5/yr', '12 Feb 25', '12 Feb 28', 'Visa •••• 9081'],
    ['sub_R8416', '#18467', 'Tom Bauer',      'Cancelled','—',     '02 May 24', 'Expired 02 May 26', '—'],
    ['sub_R8415', '#18466', 'Lin Pham',       'Active',   '$5/yr', '07 Sep 23', '07 Sep 27', 'Mastercard •••• 0024'],
    ['sub_R8414', '#18465', 'Diego Ortiz',    'Overdue',  '$5/yr', '13 May 24', 'Retry · 26 May 26', 'Visa •••• 7711'],
    ['sub_R8413', '#18464', 'Anna Sundqvist', 'Active',   '$5/yr', '22 Nov 24', '22 Nov 27', 'Stripe Link'],
    ['sub_R8412', '#18463', 'Marcus O\'Reilly','Active',  '$5/yr', '06 Jan 25', '06 Jan 28', 'Visa •••• 2284'],
  ];
  return (
    <AdminShell active="subs">
      <AdminPageHeader title="Subscriptions" sub="Stripe-backed · 34,118 active" actions={
        <button style={{
          padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><Icon name="export" size={12} /> Sync from Stripe</button>
      } />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 240, height: 34,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
        }}>
          <Icon name="search" size={13} color="var(--fg-3)" />
          <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Search by sub ID, user, email…</span>
        </div>
        <Chip active>All <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>38,471</span></Chip>
        <Chip>Active <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>34,118</span></Chip>
        <Chip>Trial <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>1,824</span></Chip>
        <Chip>Overdue <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--warn)' }}>208</span></Chip>
        <Chip>Cancelled <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>2,321</span></Chip>
      </div>

      <AdminTable
        cols={[
          { key: 'sub',     label: 'Sub. ID',  width: '130px', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{v}</span> },
          { key: 'uid',     label: 'User',     width: '80px',  render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'name',    label: 'Name',     width: '1.4fr' },
          { key: 'status',  label: 'Status',   width: '110px', render: v => <StatusBadge status={v} /> },
          { key: 'price',   label: 'Price',    width: '90px',  render: v => <span className="sd-mono">{v}</span> },
          { key: 'started', label: 'Started',  width: '110px', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'renew',   label: 'Next',     width: '1.4fr', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'method',  label: 'Method',   width: '1.6fr', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{v}</span> },
        ]}
        rows={subs.map(r => ({
          sub: r[0], uid: r[1], name: r[2], status: r[3], price: r[4], started: r[5], renew: r[6], method: r[7],
        }))}
      />
    </AdminShell>
  );
}

// ─── 7 Extend / Revoke Subscription ────────────────────────────────────
function AdminSubOverride() {
  return (
    <AdminShell active="subs">
      <div style={{ marginBottom: 18, fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--fg-2)' }}>Subscriptions</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span className="sd-mono">sub_R8418</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span style={{ color: 'var(--fg-2)' }}>Override</span>
      </div>

      <AdminPageHeader title="Manual subscription override" sub="sub_R8418 · Sara Davies · #18469" />

      <div style={{
        background: 'var(--warn-bg)', border: '1px solid var(--warn)',
        borderRadius: 10, padding: 16, marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Icon name="shield" size={20} color="var(--warn)" />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fg)' }}>
          <b>This bypasses Stripe.</b> Manual overrides require a reason and create an audit log entry that's visible to the user on request.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="CURRENT STATE">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 14, columnGap: 18 }}>
              {[
                ['Status', 'Trial', false, 'sky'],
                ['Trial ends', '03 Jun 2026', true, null],
                ['Started', '04 May 2026', true, null],
                ['Payment on file', 'None', false, null],
                ['Stripe customer', 'cus_QR9Yz1nM4j', true, null],
                ['Last invoice', '—', false, null],
              ].map(([k, v, mono, bk]) => (
                <div key={k}>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{k}</div>
                  {bk
                    ? <div style={{ marginTop: 4 }}><Badge kind={bk}>{v.toUpperCase()}</Badge></div>
                    : <div className={mono ? 'sd-mono' : ''} style={{ fontSize: 13, marginTop: 4 }}>{v}</div>}
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="ACTION">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
              {[
                ['Extend trial', 'plus', true,  '+ 14 days'],
                ['Comp full year', 'shield', false, '$5 credit'],
                ['Revoke immediately', 'trash', false, 'Cancel · no refund'],
              ].map(([t, ic, active, sub]) => (
                <div key={t} style={{
                  padding: 14, borderRadius: 8,
                  background: active ? 'var(--sky-bg)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--sky)' : 'var(--border)'}`,
                }}>
                  <Icon name={ic} size={18} color={active ? 'var(--sky)' : 'var(--fg-2)'} />
                  <div style={{ fontWeight: 600, marginTop: 8, fontSize: 13, color: active ? 'var(--sky)' : 'var(--fg)' }}>{t}</div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className="sd-label">Effective date</div>
            <Input value="Immediately" icon="calendar" />

            <div className="sd-label" style={{ marginTop: 14 }}>Reason · required</div>
            <textarea className="sd-input" style={{ minHeight: 100, resize: 'none', paddingTop: 12, fontSize: 13 }}
              defaultValue="Booking confirmed via support email — student visiting Australia for 2 weeks, will subscribe properly on return. Approved by DK." />

            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 2 }}>
                <Icon name="check" size={12} color="#001426" stroke={3} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Notify user by email with reason summary.
              </div>
            </div>
          </AdminCard>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Cancel</Button>
            <Button style={{ width: 'auto', padding: '0 18px', height: 38 }}>Apply override</Button>
          </div>
        </div>

        <AdminCard title="AUDIT LOG · sub_R8418">
          {[
            ['Trial started', 'system', '04 May 2026 · 09:42'],
            ['Account created', 'sara.d@example.com', '04 May 2026 · 09:41'],
          ].map(([t, who, when]) => (
            <div key={when} style={{
              padding: '10px 0', borderBottom: '1px dashed var(--border)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3 }}>{who.toUpperCase()}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{when}</div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 14, fontStyle: 'italic' }}>
            Every manual action is logged here with admin ID, reason, and timestamp. Logs are immutable.
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}

// ─── 8 Platform Stats ──────────────────────────────────────────────────
function AdminPlatform() {
  return (
    <AdminShell active="platform">
      <AdminPageHeader title="Platform stats" sub="Aggregated · last 30 days" actions={
        <button style={{
          padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, fontFamily: 'inherit', fontSize: 12, color: 'var(--fg-2)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}><Icon name="export" size={12} /> Export PDF report</button>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="Jumps logged" value="4,218,902" sub="+8.4k / 24h" trend="+18% YoY" />
        <KPI label="Hours of freefall" value="71,438" sub="+142 / 24h" trend="+22% YoY" />
        <KPI label="Active jumpers · 30d" value="14,218" sub="37% of users" trend="+8%" />
        <KPI label="Avg jumps / user" value="109.7" sub="lifetime" trend="—" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
        <AdminCard title="TOP DROPZONES · 30D" action={<span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>BY JUMPS</span>}>
          {[
            ['Skydive Eloy',         'AZ · US',  4218, 'var(--sky)'],
            ['Skydive Perris',       'CA · US',  3942, 'var(--cyan)'],
            ['Skydive Picton',       'NSW · AU', 3128, 'var(--warn)'],
            ['Skydive DeLand',       'FL · US',  2884, '#A78BFA'],
            ['Skydive Empuriabrava', 'GIR · ES', 2418, 'var(--ok)'],
            ['Skydive Dubai',        'DXB · AE', 2102, 'var(--danger)'],
            ['Mission Beach',        'QLD · AU', 1884, '#F472B6'],
            ['Skydive Sydney',       'NSW · AU', 1422, 'var(--sky)'],
          ].map(([n, l, c, col]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: col, flex: '0 0 auto' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{l}</div>
              </div>
              <span className="sd-mono" style={{ fontSize: 13 }}>{c.toLocaleString()}</span>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="TOP AIRCRAFT · 30D">
          {[
            ['PAC 750XL',         'turbine · 14k', 32184],
            ['Cessna 208B',       'turbine · 14k', 28412],
            ['Twin Otter',        'twin · 15k',    18482],
            ['Skyvan',            'twin · 12k',    12104],
            ['Cessna 182',        'piston · 9k',   8418],
            ['King Air 90',       'twin · 17k',    6128],
            ['Pilatus PC-6',      'turbine · 15k', 4412],
          ].map(([n, s, c]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{n}</div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{s}</div>
              </div>
              <span className="sd-mono" style={{ fontSize: 13, alignSelf: 'center' }}>{c.toLocaleString()}</span>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="JUMP TYPE MIX · 30D">
          {[
            ['Belly',    49, 'var(--sky)'],
            ['Tracking', 26, 'var(--cyan)'],
            ['Wingsuit', 15, 'var(--warn)'],
            ['Freefly',  7,  '#A78BFA'],
            ['CRW',      3,  'var(--ok)'],
          ].map(([n, pct, col]) => (
            <div key={n} style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--fg-2)' }}>{n}</span>
                <span className="sd-mono">{pct}%</span>
              </div>
              <Progress value={pct * 2} color={col} height={5} />
            </div>
          ))}
          <div className="sd-divider" />
          <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            Wingsuit share growing fastest YoY (+3.2pp). Tandem entries excluded — students only.
          </div>
        </AdminCard>
      </div>
    </AdminShell>
  );
}

// ─── 9 Flagged Entries ─────────────────────────────────────────────────
function AdminFlagged() {
  const flags = [
    ['F-2284', '#18472', 'Erin M.', 'AFF L4', 'Implausible FF time',  '#837', '0:45 · alt 12k', 'algorithm',  'high'],
    ['F-2283', '#18465', 'Diego O.', 'Wingsuit', 'Exit alt > aircraft ceiling', '#192', '21,000 ft · PC-6', 'algorithm', 'high'],
    ['F-2282', '#18421', 'Liam B.', 'Tracking', '12 jumps in 90 min',  '#421-432','—', 'algorithm',  'mid'],
    ['F-2281', '#18398', 'Hana W.', 'Belly',    'Future-dated jump',   '#118', 'date 30 May 26 · today 24', 'algorithm', 'mid'],
    ['F-2280', '#18472', 'Erin M.', 'Coach',    'Self-signed coach jump','#831', 'flagged by reviewer', 'manual',    'low'],
    ['F-2279', '#18112', 'Sam P.',  'AFF L1',   'Duplicate jump # (3 entries)', '#42','—', 'algorithm',  'mid'],
    ['F-2278', '#17988', 'Olive K.','Tracking', 'Aircraft rego not registered',  '#221', 'VH-XYZ unknown', 'algorithm', 'low'],
    ['F-2277', '#17841', 'Ben R.',  'Demo',     'Demo jump on non-demo licence','#84', 'C-licence req', 'algorithm', 'mid'],
  ];
  return (
    <AdminShell active="flagged">
      <AdminPageHeader title="Flagged entries" sub="Auto-flagged · review queue" actions={
        <Badge kind="warn">12 OPEN</Badge>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="Open" value="12" sub="needs review" accent="var(--warn)" />
        <KPI label="Resolved · 30d" value="184" sub="92% upheld" />
        <KPI label="Dismissed · 30d" value="14" sub="false positives" />
        <KPI label="Flag rate" value="0.04%" sub="of all jumps" />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <Chip active>All open</Chip>
        <Chip>High severity</Chip>
        <Chip>Algorithm</Chip>
        <Chip>Manual</Chip>
        <Chip>Resolved</Chip>
      </div>

      <AdminTable
        cols={[
          { key: 'id',    label: 'Flag',    width: '90px',  render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'uid',   label: 'User',    width: '80px',  render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{v}</span> },
          { key: 'name',  label: 'Name',    width: '1fr' },
          { key: 'type',  label: 'Type',    width: '110px', render: v => <span style={{ color: 'var(--fg-2)' }}>{v}</span> },
          { key: 'reason',label: 'Reason',  width: '2fr',   render: v => <span>{v}</span> },
          { key: 'jump',  label: 'Jump #',  width: '90px',  render: v => <span className="sd-mono" style={{ fontSize: 11 }}>{v}</span> },
          { key: 'detail',label: 'Detail',  width: '1.8fr', render: v => <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{v}</span> },
          { key: 'src',   label: 'Source',  width: '90px',  render: v => <Badge kind={v === 'algorithm' ? 'sky' : 'muted'}>{v.toUpperCase()}</Badge> },
          { key: 'sev',   label: 'Sev.',    width: '70px',  render: v => <Badge kind={v === 'high' ? 'danger' : v === 'mid' ? 'warn' : 'muted'}>{v.toUpperCase()}</Badge> },
        ]}
        rows={flags.map(r => ({
          id: r[0], uid: r[1], name: r[2], type: r[3], reason: r[4], jump: r[5], detail: r[6], src: r[7], sev: r[8],
        }))}
      />
    </AdminShell>
  );
}

// ─── 10 Data Export ────────────────────────────────────────────────────
function AdminDataExport() {
  return (
    <AdminShell active="export">
      <AdminPageHeader title="Data export" sub="CSV · gzipped · UTF-8" />

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 22, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22, background: 'var(--warn-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warn)',
          flex: '0 0 auto',
        }}><Icon name="shield" size={20} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>Exports are logged.</div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
            Every export creates an audit entry with your name, dataset, filters and timestamp. Files are encrypted at rest and expire after 7 days.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="DATASET">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                ['Users', 'user', true,  '38,471 rows · 21 cols'],
                ['Jumps', 'log',  false, '4.2M rows · 24 cols'],
                ['Revenue', 'card', false,'8,418 invoices · 14 cols'],
              ].map(([t, ic, active, s]) => (
                <div key={t} style={{
                  padding: 16, borderRadius: 8,
                  background: active ? 'var(--sky-bg)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--sky)' : 'var(--border)'}`,
                }}>
                  <Icon name={ic} size={18} color={active ? 'var(--sky)' : 'var(--fg-2)'} />
                  <div style={{ fontWeight: 600, marginTop: 8, fontSize: 14, color: active ? 'var(--sky)' : 'var(--fg)' }}>{t}</div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>{s}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="FILTERS">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="From date" value="14 Mar 2025" icon="calendar" />
              <Input label="To date" value="24 May 2026" icon="calendar" />
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Subscription status</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <Chip active>Active</Chip>
                <Chip active>Trial</Chip>
                <Chip>Overdue</Chip>
                <Chip>Cancelled</Chip>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Country</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <Chip active>All</Chip>
                <Chip>+ AU only</Chip>
                <Chip>+ US only</Chip>
                <Chip>+ Custom</Chip>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="FIELDS · 21">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 14, rowGap: 8 }}>
              {[
                'id', 'email', 'name', 'licence', 'rating', 'country', 'created_at',
                'last_seen_at', 'subscription_status', 'plan', 'renews_at', 'stripe_id',
                'jump_count', 'ff_seconds', 'home_dz', 'phone', 'dob', 'emergency_contact',
                'two_factor', 'last_ip', 'preferred_units',
              ].map((f, i) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: i < 18 ? 'var(--sky)' : 'transparent',
                    border: i < 18 ? 'none' : '1px solid var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i < 18 && <Icon name="check" size={10} color="#001426" stroke={3} />}</div>
                  <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{f}</span>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="EXPORT PREVIEW">
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                <span>Rows</span><span style={{ color: 'var(--fg)' }}>38,471</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                <span>Columns</span><span style={{ color: 'var(--fg)' }}>18 / 21</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                <span>Size (est.)</span><span style={{ color: 'var(--fg)' }}>2.4 MB · gz</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>Format</span><span style={{ color: 'var(--fg)' }}>CSV · UTF-8</span>
              </div>
            </div>
            <Button style={{ marginTop: 14, height: 42 }} icon="export">Queue export</Button>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', textAlign: 'center', marginTop: 10, letterSpacing: '0.05em' }}>
              ~ 20 SECONDS · EMAILED WHEN READY
            </div>
          </AdminCard>

          <AdminCard title="RECENT EXPORTS">
            {[
              ['users.csv.gz', '38k', 'today · 09:12', 'DK'],
              ['jumps_2025.csv.gz', '1.4M', 'yesterday', 'DK'],
              ['revenue_q1.csv', '212', '21 May', 'AB'],
            ].map(([n, sz, when, by]) => (
              <div key={when} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="export" size={14} color="var(--fg-3)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sd-mono" style={{ fontSize: 12 }}>{n}</div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{sz} ROWS · {by} · {when}</div>
                </div>
                <Icon name="chevron" size={12} color="var(--fg-4)" />
              </div>
            ))}
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, {
  AdminRevenue, AdminSubscriptions, AdminSubOverride,
  AdminPlatform, AdminFlagged, AdminDataExport,
});
