// SkydiveLog Web — Account pages (6)

// ─── 14 Account Dashboard ──────────────────────────────────────────────
function PageDashboard() {
  return (
    <AccountShell active="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
        <div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Dashboard</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', margin: '4px 0 0' }}>Hi, Erin.</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge kind="ok" icon="check">CURRENT</Badge>
          <Badge kind="sky" icon="shield">PRO</Badge>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <WebStat label="Total jumps" value="847" trend="+12 / 30D" />
        <WebStat label="Freefall" value="14h 23m" sub="avg 61s · 51,780 s" />
        <WebStat label="Currency" value="24D" sub="lapses in 6 days" trend="OK" />
        <WebStat label="Gear due" value="2" sub="repack & AAD service" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        {/* Activity chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>LAST 12 MONTHS</div>
              <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>256 <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>jumps</span></div>
            </div>
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 3, fontSize: 12 }}>
              <span style={{ padding: '6px 12px', background: 'var(--surface-3)', borderRadius: 6, color: 'var(--fg)' }}>Month</span>
              <span style={{ padding: '6px 12px', color: 'var(--fg-3)' }}>Year</span>
              <span style={{ padding: '6px 12px', color: 'var(--fg-3)' }}>All</span>
            </div>
          </div>
          <BarChart h={180} data={[
            { label: 'Jun', v: 8 }, { label: 'Jul', v: 14 }, { label: 'Aug', v: 18 },
            { label: 'Sep', v: 22 }, { label: 'Oct', v: 28 }, { label: 'Nov', v: 19 },
            { label: 'Dec', v: 24 }, { label: 'Jan', v: 34, highlight: true }, { label: 'Feb', v: 31 },
            { label: 'Mar', v: 26 }, { label: 'Apr', v: 20 }, { label: 'May', v: 12 },
          ]} />
        </div>

        {/* Recent jumps */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>RECENT</div>
            <span style={{ color: 'var(--sky)', fontSize: 12, fontWeight: 500 }}>View all →</span>
          </div>
          {[
            ['#847', 'Tracking', 'Picton · 24 May'],
            ['#846', 'Belly', 'Picton · 24 May'],
            ['#845', 'Wingsuit', 'Picton · 23 May'],
            ['#844', 'Freefly', 'Mission · 18 May'],
          ].map((r, i, a) => (
            <div key={r[0]} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < a.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r[0]}</div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r[1]}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r[2]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>NEEDS ATTENTION</div>
          {[
            ['Reserve repack', '8 days overdue', 'danger'],
            ['Tandem Master', 'Expires in 22 days', 'warn'],
            ['Class 1 Medical', 'Expires in 19 days', 'warn'],
          ].map(([t, s, k]) => (
            <div key={t} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: k === 'danger' ? 'var(--danger)' : 'var(--warn)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s}</div>
              </div>
              <span style={{ color: 'var(--sky)', fontSize: 12, fontWeight: 500 }}>Resolve</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>QUICK ACTIONS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['export', 'Export logbook'],
              ['eye', 'View jumps'],
              ['parachute', 'Manage gear'],
              ['cert', 'Add certificate'],
            ].map(([ic, l]) => (
              <div key={l} style={{
                padding: 14, background: 'var(--surface-2)', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Icon name={ic} size={16} color="var(--sky)" />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

// ─── 15 Logbook Viewer (web table) ─────────────────────────────────────
function PageLogbookViewer() {
  const rows = [
    [847, '24 May 26', 'Tracking',  'Picton',  'PAC 750XL',    'VH-PXM', '14,000', '0:60', '4:32', 'signed'],
    [846, '24 May 26', 'Belly',     'Picton',  'PAC 750XL',    'VH-PXM', '14,000', '0:58', '4:18', 'signed'],
    [845, '23 May 26', 'Wingsuit',  'Picton',  'PAC 750XL',    'VH-PXM', '14,000', '1:15', '5:02', 'signed'],
    [844, '18 May 26', 'Freefly',   'Mission', 'Cessna 208B',  'VH-CTC', '12,000', '0:50', '3:48', 'signed'],
    [843, '18 May 26', 'Belly',     'Mission', 'Cessna 208B',  'VH-CTC', '12,000', '0:48', '4:08', 'signed'],
    [842, '17 May 26', 'Tracking',  'Mission', 'Cessna 208B',  'VH-CTC', '12,000', '0:52', '3:58', 'signed'],
    [841, '11 May 26', 'Belly',     'Sydney',  'Twin Otter',   'VH-AZW', '14,000', '1:00', '4:42', 'pending'],
    [840, '10 May 26', 'Tracking',  'Sydney',  'Twin Otter',   'VH-AZW', '14,000', '0:55', '4:30', 'signed'],
    [839, '04 May 26', 'Belly',     'Picton',  'PAC 750XL',    'VH-PXM', '14,000', '0:58', '4:22', 'signed'],
    [838, '03 May 26', 'Coach',     'Picton',  'PAC 750XL',    'VH-PXM', '12,000', '0:50', '4:10', 'signed'],
    [837, '03 May 26', 'AFF L4',    'Picton',  'PAC 750XL',    'VH-PXM', '12,000', '0:45', '5:18', 'signed'],
    [836, '26 Apr 26', 'Belly',     'Picton',  'PAC 750XL',    'VH-PXM', '14,000', '1:02', '4:08', 'signed'],
  ];
  return (
    <AccountShell active="logbook">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Logbook · read-only</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>847 jumps</h1>
        </div>
        <Button style={{ width: 'auto', height: 40, padding: '0 18px' }} icon="export">Export</Button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, minWidth: 240, height: 40,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
        }}>
          <Icon name="search" size={16} color="var(--fg-3)" />
          <span style={{ color: 'var(--fg-3)' }}>Search by DZ, type, tag, number…</span>
        </div>
        <Chip leading={<Icon name="calendar" size={13} />}>2026</Chip>
        <Chip active>All types</Chip>
        <Chip>Signed</Chip>
        <Chip leading={<Icon name="star-fill" size={12} color="var(--warn)" />}>Favs</Chip>
        <Chip leading={<Icon name="filter" size={13} />}>More</Chip>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 100px 110px 110px 130px 80px 80px 60px 60px 70px',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase', gap: 6,
        }}>
          <span>#</span><span>Date</span><span>Type</span><span>DZ</span><span>Aircraft</span>
          <span>Rego</span><span>Exit</span><span>FF</span><span>Canopy</span><span>Status</span>
        </div>
        {rows.map((r, i) => (
          <div key={r[0]} style={{
            display: 'grid', gridTemplateColumns: '60px 100px 110px 110px 130px 80px 80px 60px 60px 70px',
            padding: '12px 18px', borderBottom: i < rows.length-1 ? '1px solid var(--border)' : 'none',
            fontSize: 13, gap: 6, alignItems: 'center',
          }}>
            <span className="sd-mono" style={{ color: 'var(--fg-3)' }}>#{r[0]}</span>
            <span className="sd-mono">{r[1]}</span>
            <span style={{ fontWeight: 500 }}>{r[2]}</span>
            <span style={{ color: 'var(--fg-2)' }}>{r[3]}</span>
            <span style={{ color: 'var(--fg-2)' }}>{r[4]}</span>
            <span className="sd-mono" style={{ color: 'var(--fg-3)' }}>{r[5]}</span>
            <span className="sd-mono">{r[6]}</span>
            <span className="sd-mono">{r[7]}</span>
            <span className="sd-mono">{r[8]}</span>
            <span>{r[9] === 'signed' ? <Badge kind="ok">✓</Badge> : <Badge kind="warn">…</Badge>}</span>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 14, fontSize: 13, color: 'var(--fg-3)',
      }}>
        <span className="sd-mono">Showing 1 — 12 of 847</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>‹</span>
          <span style={{ padding: '6px 12px', background: 'var(--sky-bg)', border: '1px solid var(--sky)', borderRadius: 6, color: 'var(--sky)' }}>1</span>
          <span style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>2</span>
          <span style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>3</span>
          <span style={{ padding: '6px 12px', color: 'var(--fg-3)' }}>…</span>
          <span style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>71</span>
          <span style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>›</span>
        </div>
      </div>
    </AccountShell>
  );
}

// ─── 16 Account Settings ───────────────────────────────────────────────
function PageAccountSettings() {
  return (
    <AccountShell active="settings">
      <div style={{ marginBottom: 28 }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Settings</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Account</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48 }}>
        <aside>
          {['Profile', 'Security', 'Email & notifications', 'Display', 'Privacy', 'Delete account'].map((s, i) => (
            <div key={s} style={{
              padding: '8px 12px', fontSize: 14, borderRadius: 6,
              background: i === 0 ? 'var(--sky-bg)' : 'transparent',
              color: i === 0 ? 'var(--sky)' : 'var(--fg-2)',
              fontWeight: i === 0 ? 500 : 400, marginBottom: 2,
            }}>{s}</div>
          ))}
        </aside>

        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Profile</h3>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 22 }}>Visible only to you and your instructors.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <Avatar initials="EM" size={64} />
              <div>
                <button style={{
                  padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, fontFamily: 'inherit', fontSize: 13, color: 'var(--fg)',
                }}>Change photo</button>
                <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 6 }}>PNG / JPG · max 2 MB</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label="Full name" value="Erin Morrison" />
              <Input label="Email" value="erin@example.com" icon="mail" />
              <Input label="Licence number" value="APF 14829" />
              <Input label="Rating" value="B" />
              <Input label="Home dropzone" value="Skydive Picton, NSW" icon="dz" />
              <Input label="Date of birth" value="14 Apr 1994" icon="calendar" />
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>Emergency contact</h3>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 22 }}>Shared with your home DZ in case of incident.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <Input label="Name" value="Sara Morrison" />
              <Input label="Relationship" value="Sister" />
              <Input label="Phone" value="+61 412 098 224" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <Button variant="ghost" style={{ width: 'auto', padding: '0 22px' }}>Cancel</Button>
            <Button style={{ width: 'auto', padding: '0 22px' }}>Save changes</Button>
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

// ─── 17 Subscription Management (web) ──────────────────────────────────
function PageWebSubMgmt() {
  return (
    <AccountShell active="sub">
      <div style={{ marginBottom: 28 }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Subscription</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Your plan</h1>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, rgba(74,158,255,0.18), transparent)',
        border: '1px solid var(--sky)', borderRadius: 16, padding: 32, marginBottom: 22,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32,
      }}>
        <div style={{ flex: 1 }}>
          <Badge kind="sky" icon="shield">PRO · ACTIVE</Badge>
          <div className="sd-mono" style={{ fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 14 }}>$5 / year</div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 6 }}>
            Renews <span style={{ color: 'var(--fg)' }}>14 March 2027</span> · started 14 March 2025
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
          <Button style={{ height: 44 }}>Update card</Button>
          <Button variant="sub" style={{ height: 44 }}>Cancel subscription</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>PAYMENT METHOD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 32, borderRadius: 6,
              background: 'linear-gradient(135deg, #4A4A4A, #2A2A2A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '0.05em',
            }}>VISA</div>
            <div style={{ flex: 1 }}>
              <div className="sd-mono" style={{ fontSize: 14 }}>•••• 4842</div>
              <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>EXPIRES 09 / 28</div>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>BILLING ADDRESS</div>
          <div className="sd-mono" style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-2)' }}>
            Erin Morrison<br/>
            12 Hawthorn Rd<br/>
            Picton NSW 2571<br/>
            Australia
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

// ─── 18 Billing History ────────────────────────────────────────────────
function PageBilling() {
  const invoices = [
    ['INV-2026-0314', '14 Mar 2026', 'Annual renewal', '$5.00 USD', 'Paid'],
    ['INV-2025-0314', '14 Mar 2025', 'Annual renewal', '$5.00 USD', 'Paid'],
    ['INV-2024-0314', '14 Mar 2024', 'Initial subscription', '$5.00 USD', 'Paid'],
    ['INV-2024-0214', '14 Feb 2024', 'Trial expired', '$0.00 USD', 'Comp'],
  ];
  return (
    <AccountShell active="billing">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
        <div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Billing</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Invoice history</h1>
        </div>
        <Button variant="sub" style={{ width: 'auto', padding: '0 18px', height: 40 }} icon="export">Download all</Button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '180px 130px 1fr 130px 100px 60px',
          padding: '14px 22px', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase', gap: 12,
        }}>
          <span>Invoice</span><span>Date</span><span>Description</span><span>Amount</span><span>Status</span><span></span>
        </div>
        {invoices.map((inv, i) => (
          <div key={inv[0]} style={{
            display: 'grid', gridTemplateColumns: '180px 130px 1fr 130px 100px 60px',
            padding: '16px 22px',
            borderBottom: i < invoices.length-1 ? '1px solid var(--border)' : 'none',
            fontSize: 14, gap: 12, alignItems: 'center',
          }}>
            <span className="sd-mono" style={{ fontSize: 12 }}>{inv[0]}</span>
            <span className="sd-mono" style={{ fontSize: 13 }}>{inv[1]}</span>
            <span style={{ color: 'var(--fg-2)' }}>{inv[2]}</span>
            <span className="sd-mono" style={{ fontWeight: 500 }}>{inv[3]}</span>
            <span><Badge kind={inv[4] === 'Paid' ? 'ok' : 'muted'}>{inv[4]}</Badge></span>
            <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Icon name="pdf" size={16} color="var(--fg-3)" />
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 22, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Icon name="mail" size={18} color="var(--fg-2)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Receipts email</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Sent to erin@example.com after every renewal.</div>
        </div>
        <span style={{ color: 'var(--sky)', fontSize: 13, fontWeight: 500 }}>Change</span>
      </div>
    </AccountShell>
  );
}

// ─── 19 Delete Account ─────────────────────────────────────────────────
function PageDelete() {
  return (
    <AccountShell active="settings">
      <div style={{ marginBottom: 28 }}>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Settings · Delete account</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Delete account</h1>
      </div>

      <div style={{ maxWidth: 680 }}>
        <div style={{
          background: 'var(--danger-bg)', border: '1px solid var(--danger)',
          borderRadius: 12, padding: 22, marginBottom: 22,
          display: 'flex', gap: 16,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 18, background: 'var(--danger)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
          }}>
            <Icon name="trash" size={18} color="#001426" stroke={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>This is permanent.</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginTop: 6 }}>
              All 847 jumps, gear records, certificates and notes will be deleted after a 30-day grace window. We can't recover them after that.
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 12 }}>Before you go — export your logbook</h3>
          <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
            Take a copy of everything. Free, no restrictions, even after deletion (30-day window).
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="sub" style={{ width: 'auto', padding: '0 16px', height: 38 }} icon="pdf">Download PDF</Button>
            <Button variant="sub" style={{ width: 'auto', padding: '0 16px', height: 38 }} icon="export">Download CSV</Button>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>Confirm deletion</h3>
          <Input label='Type "DELETE" to confirm' value="" />
          <div style={{ marginTop: 14 }}>
            <Input label="Password" placeholder="••••••••" icon="lock" type="password" />
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 18, height: 18, borderRadius: 4, border: '1px solid var(--border-strong)', flex: '0 0 auto', marginTop: 1,
            }} />
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
              I understand my data will be deleted after 30 days and cannot be recovered.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" style={{ width: 'auto', padding: '0 22px' }}>Cancel</Button>
          <Button style={{ width: 'auto', padding: '0 22px', background: 'var(--danger)' }}>Delete account permanently</Button>
        </div>
      </div>
    </AccountShell>
  );
}

Object.assign(window, {
  PageDashboard, PageLogbookViewer, PageAccountSettings,
  PageWebSubMgmt, PageBilling, PageDelete,
});
