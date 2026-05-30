// SkydiveLog — Gear (3), Certificates (2), Profile (7) screens

// ─── 24 Gear List ──────────────────────────────────────────────────────
function ScreenGearList() {
  const gear = [
    { type: 'rig', name: 'Vector 3 · V348', sn: 'VK-22-118472', status: 'In service', days: 38, due: 142, kind: 'ok' },
    { type: 'canopy', name: 'Sabre3 · 170', sn: 'PD-A24-09913', status: 'In service', days: 38, due: 142, kind: 'ok' },
    { type: 'aad', name: 'Cypres 2', sn: 'CY-194822', status: 'Service due', days: null, due: 0, kind: 'warn', subtitle: '4-yr service due Jun 2026' },
    { type: 'canopy', name: 'PD Reserve 176', sn: 'PD-R-218833', status: 'Repack overdue', days: 188, due: -8, kind: 'danger' },
    { type: 'rig', name: 'Wings W-12 (loaner)', sn: 'WS-22-118744', status: 'In service', days: 12, due: 168, kind: 'ok' },
  ];
  return (
    <Screen tab="gear">
      <TopBar title="Gear" sub="5 items · 1 needs attention" trailing={<IconBtn name="plus" />} />
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <Chip active>All</Chip>
        <Chip>Rigs</Chip>
        <Chip>Canopies</Chip>
        <Chip>AADs</Chip>
        <Chip leading={<Icon name="bell" size={12} />}>Due soon</Chip>
      </div>
      <div className="sd-body" style={{ paddingTop: 4 }}>
        {gear.map(g => (
          <Card key={g.sn} style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: g.kind === 'danger' ? 'var(--danger)' : g.kind === 'warn' ? 'var(--warn)' : 'var(--sky)',
                flex: '0 0 auto',
              }}>
                <Icon name={g.type === 'aad' ? 'shield' : 'parachute'} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{g.name}</div>
                  <Badge kind={g.kind === 'ok' ? 'ok' : g.kind === 'warn' ? 'warn' : 'danger'}>
                    {g.status}
                  </Badge>
                </div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                  S/N {g.sn}
                </div>
                {g.subtitle ? (
                  <div className="sd-mono" style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6 }}>
                    {g.subtitle}
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      <span>{g.days} days since {g.type === 'canopy' && g.kind === 'danger' ? 'repack' : 'service'}</span>
                      <span style={{ color: g.due < 0 ? 'var(--danger)' : g.due < 30 ? 'var(--warn)' : 'var(--fg-3)' }}>
                        {g.due < 0 ? `${-g.due}D overdue` : `${g.due}D left`}
                      </span>
                    </div>
                    <Progress
                      value={g.due < 0 ? 100 : Math.min(((180 - g.due)/180)*100, 100)}
                      color={g.due < 0 ? 'var(--danger)' : g.due < 30 ? 'var(--warn)' : 'var(--ok)'}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

// ─── 25 Gear Detail ────────────────────────────────────────────────────
function ScreenGearDetail() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="PD Reserve 176" large={false}
        trailing={<><IconBtn name="edit" /><IconBtn name="dots" /></>} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{
          background: 'var(--danger-bg)', borderColor: 'var(--danger)',
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Icon name="bell" size={20} color="var(--danger)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, color: 'var(--fg)' }}>Repack overdue</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>8 days past due · book a rigger</div>
          </div>
          <Icon name="chevron" size={16} color="var(--fg-3)" />
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Card style={{ padding: 14, textAlign: 'center' }}>
            <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>JUMPS ON</div>
            <div className="sd-mono" style={{ fontSize: 26, fontWeight: 500, marginTop: 4 }}>284</div>
          </Card>
          <Card style={{ padding: 14, textAlign: 'center' }}>
            <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>HOURS</div>
            <div className="sd-mono" style={{ fontSize: 26, fontWeight: 500, marginTop: 4 }}>18.4</div>
          </Card>
        </div>

        <div className="sd-section-title">Specifications</div>
        <Card style={{ marginBottom: 12 }}>
          <Field label="Type" value="Reserve canopy" />
          <Field label="Model" value="Performance Designs Reserve 176" />
          <Field label="Serial number" value="PD-R-218833" mono />
          <Field label="Manufactured" value="Aug 2022" mono />
          <Field label="Wing loading" value="0.95" mono />
        </Card>

        <div className="sd-section-title">Service log</div>
        <Card>
          {[
            ['Repack', 'Rigger J. Faulkner', '17 Nov 2025', 'danger'],
            ['Repack', 'Rigger J. Faulkner', '12 May 2025', 'muted'],
            ['Inspection', 'Rigger M. Lo', '08 Feb 2025', 'muted'],
          ].map(([n, by, d, k], i, a) => (
            <div key={d} style={{
              display: 'flex', gap: 12, padding: '10px 0',
              borderBottom: i < a.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4,
                background: k === 'danger' ? 'var(--danger)' : 'var(--surface-3)',
                marginTop: 6, flex: '0 0 auto',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{n}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{by}</div>
              </div>
              <div className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)', alignSelf: 'center' }}>{d}</div>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 26 Add/Edit Gear ──────────────────────────────────────────────────
function ScreenAddGear() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="close" />} title="Add gear" large={false}
        trailing={<span style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 15 }}>Save</span>} />
      <div className="sd-body" style={{ paddingTop: 8 }}>
        <div className="sd-section-title">Type</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 18 }}>
          {[
            ['Rig', 'parachute', false],
            ['Canopy', 'parachute', true],
            ['AAD', 'shield', false],
          ].map(([n, ic, a]) => (
            <button key={n} style={{
              padding: 14, borderRadius: 10,
              background: a ? 'var(--sky-bg)' : 'var(--surface)',
              border: `1px solid ${a ? 'var(--sky)' : 'var(--border)'}`,
              color: a ? 'var(--sky)' : 'var(--fg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              fontFamily: 'inherit',
            }}>
              <Icon name={ic} size={20} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{n}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Make & model" placeholder="e.g. PD Sabre3 170" />
          <Input label="Serial number" placeholder="PD-A24-…" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Date of manufacture" value="Aug 2024" icon="calendar" />
            <Input label="Jumps on" value="0" />
          </div>
          <Input label="Last repack" value="—" icon="calendar" />
          <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Set repack reminder</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Notify 14 days before due.</div>
            </div>
            <Toggle on />
          </Card>
        </div>
      </div>
    </Screen>
  );
}

// ─── 27 Certificates list ──────────────────────────────────────────────
function ScreenCerts() {
  const certs = [
    { name: 'B Licence', body: 'APF', issued: 'Mar 2022', expires: null, status: 'ok' },
    { name: 'AFF Instructor', body: 'APF', issued: 'Oct 2024', expires: '08 Oct 2026', status: 'ok', days: 138 },
    { name: 'Tandem Master', body: 'UPT', issued: 'Jun 2023', expires: '15 Jun 2026', status: 'warn', days: 22 },
    { name: 'Class 1 Medical', body: 'CASA', issued: 'May 2025', expires: '12 Jun 2026', status: 'warn', days: 19 },
    { name: 'First Aid Cert', body: 'St John', issued: 'Feb 2024', expires: '08 Feb 2027', status: 'ok', days: 261 },
    { name: 'Coach 1', body: 'APF', issued: 'Sep 2023', expires: null, status: 'ok' },
  ];
  return (
    <Screen tab="certs">
      <TopBar title="Certificates" sub="2 expiring soon" trailing={<IconBtn name="plus" />} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        {certs.map(c => (
          <Card key={c.name} style={{ marginBottom: 8, padding: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: c.status === 'warn' ? 'var(--warn-bg)' : 'var(--sky-bg)',
                color: c.status === 'warn' ? 'var(--warn)' : 'var(--sky)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flex: '0 0 auto',
              }}>
                <Icon name="cert" size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</div>
                  {c.expires
                    ? <Badge kind={c.status === 'warn' ? 'warn' : 'ok'}>{c.days}D LEFT</Badge>
                    : <Badge kind="muted">NO EXPIRY</Badge>}
                </div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                  {c.body} · ISSUED {c.issued}
                  {c.expires && ` · EXPIRES ${c.expires}`}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

// ─── 28 Add Certificate ────────────────────────────────────────────────
function ScreenAddCert() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="close" />} title="Add certificate" large={false}
        trailing={<span style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 15 }}>Save</span>} />
      <div className="sd-body" style={{ paddingTop: 8 }}>
        <div className="sd-section-title">Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {[
            ['Licence', true],
            ['Rating', false],
            ['Medical', false],
          ].map(([n, a]) => (
            <button key={n} style={{
              padding: '14px 0', borderRadius: 10,
              background: a ? 'var(--sky-bg)' : 'var(--surface)',
              border: `1px solid ${a ? 'var(--sky)' : 'var(--border)'}`,
              color: a ? 'var(--sky)' : 'var(--fg)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            }}>{n}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Title" value="B Licence" />
          <Input label="Issuing body" value="APF" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Issued" value="Mar 2022" icon="calendar" />
            <Input label="Expires" value="—" icon="calendar" />
          </div>
          <Input label="Reference / number" placeholder="optional" />
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 500 }}>Attach document</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>PDF or image.</div>
              </div>
              <button style={{
                padding: '8px 14px', background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--fg)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              }}>Upload</button>
            </div>
          </Card>
        </div>
      </div>
    </Screen>
  );
}

// ─── 29 Profile ────────────────────────────────────────────────────────
function ScreenProfile() {
  return (
    <Screen tab="profile">
      <TopBar title="Profile" trailing={<IconBtn name="gear" />} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{ padding: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar initials="EM" size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Erin Morrison</div>
            <div className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>APF 14829 · B-LICENCE</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Badge kind="sky" icon="shield">PRO</Badge>
              <Badge kind="ok">CURRENT</Badge>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            ['JUMPS', '847'],
            ['FF TIME', '14h'],
            ['DZs', '12'],
          ].map(([l, v]) => (
            <Card key={l} style={{ padding: 12, textAlign: 'center' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>{l}</div>
              <div className="sd-mono" style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{v}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginBottom: 10, padding: 0 }}>
          {[
            ['user', 'Edit profile'],
            ['gear', 'Settings'],
            ['shield', 'Subscription'],
            ['export', 'Export logbook'],
            ['tag', 'Manage tags'],
            ['bell', 'Notifications'],
          ].map(([ic, l], i, a) => (
            <div key={l} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderBottom: i < a.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <Icon name={ic} size={18} color="var(--fg-2)" />
              <span style={{ flex: 1, fontSize: 15 }}>{l}</span>
              <Icon name="chevron" size={14} color="var(--fg-3)" />
            </div>
          ))}
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <Icon name="export" size={18} color="var(--danger)" />
            <span style={{ flex: 1, fontSize: 15, color: 'var(--danger)' }}>Sign out</span>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 30 Edit Profile ───────────────────────────────────────────────────
function ScreenEditProfile() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Edit profile" large={false}
        trailing={<span style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 15 }}>Save</span>} />
      <div className="sd-body" style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ position: 'relative' }}>
            <Avatar initials="EM" size={88} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 30, height: 30, borderRadius: 15,
              background: 'var(--sky)', border: '2px solid var(--bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="edit" size={14} color="#001426" stroke={2.5} />
            </div>
          </div>
        </div>

        <div className="sd-section-title">Personal</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Full name" value="Erin Morrison" />
          <Input label="Email" value="erin@example.com" icon="mail" />
          <Input label="Licence number" value="APF 14829" />
          <Input label="Date of birth" value="14 Apr 1994" icon="calendar" />
        </div>

        <div className="sd-section-title" style={{ marginTop: 18 }}>Home dropzone</div>
        <Input value="Skydive Picton, NSW" icon="dz" />

        <div className="sd-section-title" style={{ marginTop: 18 }}>Emergency contact</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Name" value="Sara Morrison" />
          <Input label="Relationship" value="Sister" />
          <Input label="Phone" value="+61 412 098 224" />
        </div>
      </div>
    </Screen>
  );
}

// ─── 31 Settings ───────────────────────────────────────────────────────
function ScreenSettings() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Settings" large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div className="sd-section-title">Notifications</div>
        <Card style={{ padding: 0, marginBottom: 14 }}>
          {[
            ['Currency alerts', 'Remind me before lapsing', true],
            ['Repack reminders', '14 days before due', true],
            ['Cert expiry warnings', '30 days before expiry', true],
            ['Marketing', '', false],
          ].map(([n, s, on], i, a) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderBottom: i < a.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15 }}>{n}</div>
                {s && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{s}</div>}
              </div>
              <Toggle on={on} />
            </div>
          ))}
        </Card>

        <div className="sd-section-title">Display layout</div>
        <Card style={{ padding: 0, marginBottom: 14 }}>
          {[
            ['Jump list',     ['Compact', 'Cards', 'Timeline'], 0],
            ['Jump detail',   ['Standard', 'Cockpit', 'Photo-led'], 1],
            ['Stats overview',['Cards', 'Cockpit', 'Photo story'], 1],
          ].map(([label, opts, active], i, arr) => (
            <div key={label} style={{
              padding: '14px 16px',
              borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 15 }}>{label}</span>
                <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{opts[active]}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {opts.map((o, j) => <Chip key={o} active={j === active}>{o}</Chip>)}
              </div>
            </div>
          ))}
        </Card>

        <div className="sd-section-title">Units & display</div>
        <Card style={{ padding: 0, marginBottom: 14 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>Altitude</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>ft</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip active>Feet</Chip>
              <Chip>Metres</Chip>
            </div>
          </div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15 }}>Date format</span>
              <span className="sd-mono" style={{ fontSize: 13, color: 'var(--fg-3)' }}>DD MMM YYYY</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15 }}>Theme</span>
              <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Dark</span>
            </div>
          </div>
        </Card>

        <div className="sd-section-title">Sync & storage</div>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>Offline mode</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Last sync 2 min ago</div>
            </div>
            <Toggle on />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15 }}>Clear cache</span>
            <span className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>184 MB</span>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 32 Subscription Management ────────────────────────────────────────
function ScreenSubMgmt() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Subscription" large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{
          background: 'linear-gradient(135deg, rgba(74,158,255,0.2), transparent)',
          borderColor: 'var(--sky)', padding: 18, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Badge kind="sky" icon="shield">PRO · ACTIVE</Badge>
            <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>SINCE 14 MAR 2025</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>$5 / year</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>
            Renews <span style={{ color: 'var(--fg)' }}>14 March 2027</span>
          </div>
        </Card>

        <div className="sd-section-title">Payment method</div>
        <Card style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 30, borderRadius: 6,
            background: 'linear-gradient(135deg, #4A4A4A, #2A2A2A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 10, letterSpacing: '0.05em',
          }}>VISA</div>
          <div style={{ flex: 1 }}>
            <div className="sd-mono" style={{ fontSize: 13 }}>•••• 4842</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>Expires 09/28</div>
          </div>
          <span style={{ color: 'var(--sky)', fontSize: 13, fontWeight: 500 }}>Update</span>
        </Card>

        <div className="sd-section-title">Billing history</div>
        <Card style={{ padding: 0 }}>
          {[
            ['14 Mar 2026', '$5.00', 'Paid'],
            ['14 Mar 2025', '$5.00', 'Paid'],
          ].map(([d, a, s], i, arr) => (
            <div key={d} style={{
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div className="sd-mono" style={{ fontSize: 13 }}>{d}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Annual renewal</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="sd-mono">{a}</span>
                <Icon name="pdf" size={16} color="var(--fg-3)" />
              </div>
            </div>
          ))}
        </Card>

        <button style={{
          background: 'none', border: 'none', color: 'var(--danger)',
          fontSize: 14, fontWeight: 500, padding: '20px 0', textAlign: 'left',
        }}>Cancel subscription</button>
      </div>
    </Screen>
  );
}

// ─── 33 Export Logbook ─────────────────────────────────────────────────
function ScreenExport() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Export logbook" large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div className="sd-section-title">Format</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            ['PDF', 'pdf', true, '12 pages'],
            ['CSV', 'export', false, '847 rows'],
          ].map(([n, ic, a, s]) => (
            <Card key={n} style={{
              padding: 14, borderColor: a ? 'var(--sky)' : 'var(--border)',
              background: a ? 'var(--sky-bg)' : 'var(--surface)',
            }}>
              <Icon name={ic} size={22} color={a ? 'var(--sky)' : 'var(--fg-2)'} />
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 8 }}>{n}</div>
              <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{s}</div>
            </Card>
          ))}
        </div>

        <div className="sd-section-title">Date range</div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Chip active>All time</Chip>
            <Chip>2026</Chip>
            <Chip>Year</Chip>
            <Chip>Custom</Chip>
          </div>
          <div className="sd-divider" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div className="sd-label">From</div>
              <div className="sd-mono" style={{ fontSize: 15, marginTop: 4 }}>02 Mar 2022</div>
            </div>
            <div>
              <div className="sd-label">To</div>
              <div className="sd-mono" style={{ fontSize: 15, marginTop: 4 }}>24 May 2026</div>
            </div>
          </div>
        </Card>

        <div className="sd-section-title">Preview</div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            background: '#F5F5F0', color: '#1A1A1A',
            padding: 14, position: 'relative',
            fontFamily: 'var(--font-mono)', fontSize: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', color: '#0A1220' }}>SKYDIVELOG · Erin Morrison · APF 14829</div>
            <div style={{ fontSize: 8, color: '#666', marginBottom: 10 }}>Page 1 of 12 · Jumps #1 — #75</div>
            {[
              ['#847', '24 May 26', 'Picton', 'PAC 750XL', 'Track', '14k', '60s', '4:32'],
              ['#846', '24 May 26', 'Picton', 'PAC 750XL', 'Belly', '14k', '58s', '4:18'],
              ['#845', '23 May 26', 'Picton', 'PAC 750XL', 'WS',    '14k', '75s', '5:02'],
              ['#844', '18 May 26', 'Mission', 'C208B',    'FF',    '12k', '50s', '3:48'],
            ].map(row => (
              <div key={row[0]} style={{ display: 'grid', gridTemplateColumns: '30px 60px 60px 60px 35px 30px 30px 35px', gap: 2, borderBottom: '0.5px solid #ccc', padding: '4px 0' }}>
                {row.map((c, i) => <span key={i}>{c}</span>)}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ padding: '12px 24px 28px' }}>
        <Button icon="share">Export & share</Button>
      </div>
    </Screen>
  );
}

// ─── 34 Manage Tags ────────────────────────────────────────────────────
function ScreenManageTags() {
  const tags = [
    ['sunset', 18, 'var(--warn)'],
    ['video', 47, 'var(--cyan)'],
    ['beach', 12, 'var(--sky)'],
    ['coach', 38, 'var(--ok)'],
    ['demo', 6, 'var(--danger)'],
    ['comp', 22, '#A78BFA'],
    ['night', 4, '#F472B6'],
    ['8-way', 14, 'var(--sky)'],
    ['cloud', 9, 'var(--cyan)'],
  ];
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Manage tags" large={false}
        trailing={<IconBtn name="plus" />} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 14 }}>
          Tap a tag to rename, change colour, or merge.
        </div>
        <Card style={{ padding: 0 }}>
          {tags.map(([n, c, col], i) => (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              borderBottom: i < tags.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: col, flex: '0 0 auto' }} />
              <span style={{ flex: 1, fontWeight: 500 }}>{n}</span>
              <span className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c}</span>
              <Icon name="dots" size={16} color="var(--fg-3)" />
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 35 Notification Settings ──────────────────────────────────────────
function ScreenNotif() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Notifications" large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div className="sd-section-title">Currency alerts</div>
        <Card style={{ padding: 0, marginBottom: 14 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>Lapse warning</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>7 days before currency lapses</div>
            </div>
            <Toggle on />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>Lapse confirmation</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>When you've lapsed</div>
            </div>
            <Toggle on />
          </div>
        </Card>

        <div className="sd-section-title">Gear reminders</div>
        <Card style={{ padding: 0, marginBottom: 14 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 15 }}>Reserve repack</span>
              <Toggle on />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip>7 days</Chip>
              <Chip active>14 days</Chip>
              <Chip>30 days</Chip>
            </div>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>AAD service</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>30 days before</div>
            </div>
            <Toggle on />
          </div>
        </Card>

        <div className="sd-section-title">Certificate expiry</div>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>30-day warning</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>For all licences & medicals</div>
            </div>
            <Toggle on />
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>Expired notice</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Same day</div>
            </div>
            <Toggle on />
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 36 Push Notification (lock screen) ───────────────────────────────
function ScreenPushNotification() {
  // iOS lock screen — dark wallpaper, time, push notification widget
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #0d1b35 0%, #0a1220 55%, #081530 100%)',
      position: 'relative', overflow: 'hidden',
      fontFamily: '-apple-system, "SF Pro", system-ui',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 28px 0', color: '#fff',
      }}>
        <span style={{ fontWeight: 600, fontSize: 17 }}>9:41</span>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {/* signal */}
          <svg width="19" height="12" viewBox="0 0 19 12" fill="white">
            <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7"/>
            <rect x="4.8" y="5" width="3.2" height="7" rx="0.7"/>
            <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7"/>
            <rect x="14.4" y="0" width="3.2" height="12" rx="0.7"/>
          </svg>
          {/* wifi */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="white">
            <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"/>
            <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z"/>
            <circle cx="8.5" cy="10.5" r="1.5"/>
          </svg>
          {/* battery */}
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="white" strokeOpacity="0.35"/>
            <rect x="2" y="2" width="20" height="9" rx="2" fill="white"/>
            <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="white" fillOpacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }} />

      {/* Lock screen time */}
      <div style={{ textAlign: 'center', paddingTop: 56, color: '#fff' }}>
        <div style={{ fontSize: 80, fontWeight: 300, lineHeight: 1, letterSpacing: -2 }}>9:41</div>
        <div style={{ fontSize: 18, fontWeight: 400, marginTop: 6, opacity: 0.85 }}>Friday, 29 May</div>
      </div>

      {/* Push notification widget */}
      <div style={{ padding: '32px 16px 0' }}>
        <div style={{
          borderRadius: 20,
          background: 'rgba(30, 40, 60, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          padding: '12px 14px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          {/* App icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(145deg, #2a6fb8, #4A9EFF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 10a6 6 0 0112 0v5l2 3H4l2-3v-5z"/><path d="M10 21h4"/>
            </svg>
          </div>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2, textTransform: 'uppercase' }}>Jump Logs</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>now</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>New feature · Gear module is live</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>Track your rigs, canopies and AADs with service due dates.</div>
          </div>
        </div>
      </div>

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ width: 139, height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.5)' }} />
      </div>
    </div>
  );
}

// ─── 37 In-App Banner ─────────────────────────────────────────────────
function ScreenInAppBanner() {
  // Shows the app open on the Log tab with the announcement banner sliding in from top
  return (
    <Screen tab="log" style={{ position: 'relative' }}>
      {/* Dimmed screen content underneath */}
      <TopBar title="Jump Log" trailing={
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn name="search" />
          <IconBtn name="filter" />
        </div>
      } />
      <div className="sd-body" style={{ opacity: 0.45 }}>
        {[
          { n: 847, dz: 'Skydive Yarra Valley', date: '28 May 2026' },
          { n: 846, dz: 'Skydive Melbourne', date: '15 May 2026' },
          { n: 845, dz: 'Skydive Yarra Valley', date: '2 May 2026' },
          { n: 844, dz: 'Skydive Melbourne', date: '19 Apr 2026' },
        ].map(j => (
          <Card key={j.n} style={{ marginBottom: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', marginBottom: 3 }}>JUMP #{j.n}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{j.dz}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{j.date}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
          </Card>
        ))}
      </div>

      {/* In-app announcement banner — absolute, slides from top */}
      <div style={{
        position: 'absolute', top: 68, left: 12, right: 12, zIndex: 100,
      }}>
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid rgba(74,158,255,0.3)',
          borderRadius: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '12px 12px 12px 14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        }}>
          {/* icon pill */}
          <div style={{
            width: 32, height: 32, borderRadius: 999, flexShrink: 0,
            background: 'rgba(74,158,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A9EFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l7-7 4 4 7-7"/><path d="M21 5h-5v5"/>
            </svg>
          </div>
          {/* text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>New feature · Gear module is live</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.45 }}>Track your rigs, canopies and AADs with service due dates.</div>
          </div>
          {/* dismiss */}
          <div style={{ padding: '2px 0 0', flexShrink: 0, color: 'var(--fg-3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  ScreenGearList, ScreenGearDetail, ScreenAddGear,
  ScreenCerts, ScreenAddCert,
  ScreenProfile, ScreenEditProfile, ScreenSettings, ScreenSubMgmt,
  ScreenExport, ScreenManageTags, ScreenNotif,
  ScreenPushNotification, ScreenInAppBanner,
});
