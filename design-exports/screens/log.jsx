// SkydiveLog — Log tab screens (13: includes 3 variants on Jump List & Jump Detail)

const SAMPLE_JUMPS = [
  { num: 847, date: 'Sat 24 May', dz: 'Skydive Picton', ac: 'PAC 750XL', type: 'Tracking', alt: 14000, ff: 60, fav: true, tags: ['sunset', 'video'] },
  { num: 846, date: 'Sat 24 May', dz: 'Skydive Picton', ac: 'PAC 750XL', type: 'Belly', alt: 14000, ff: 58, tags: ['8-way'] },
  { num: 845, date: 'Fri 23 May', dz: 'Skydive Picton', ac: 'PAC 750XL', type: 'Wingsuit', alt: 14000, ff: 75, fav: true, tags: ['solo'] },
  { num: 844, date: 'Sun 18 May', dz: 'Mission Beach', ac: 'Cessna 208B', type: 'Freefly', alt: 12000, ff: 50, tags: ['beach'] },
  { num: 843, date: 'Sun 18 May', dz: 'Mission Beach', ac: 'Cessna 208B', type: 'Belly', alt: 12000, ff: 48 },
  { num: 842, date: 'Sat 17 May', dz: 'Mission Beach', ac: 'Cessna 208B', type: 'Tracking', alt: 12000, ff: 52, tags: ['coach'] },
  { num: 841, date: 'Sun 11 May', dz: 'Skydive Sydney', ac: 'Twin Otter', type: 'Belly', alt: 14000, ff: 60 },
];

// ─── 07 Jump List · A (default — compact rows) ─────────────────────────
function JumpListA() {
  return (
    <Screen tab="log">
      <TopBar title="Logbook" sub="847 jumps · 14h 23m freefall" trailing={
        <><IconBtn name="search" /><IconBtn name="plus" /></>
      } />
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <Chip active leading={<Icon name="filter" size={13} />}>All</Chip>
        <Chip>Tracking</Chip>
        <Chip>Wingsuit</Chip>
        <Chip>Freefly</Chip>
        <Chip>Belly</Chip>
      </div>
      <div className="sd-body" style={{ paddingTop: 8 }}>
        {SAMPLE_JUMPS.slice(0, 7).map((j, i) => (
          <div key={j.num} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 4px', borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
          }}>
            <div className="sd-mono" style={{
              fontSize: 11, color: 'var(--fg-3)', minWidth: 38, letterSpacing: '0.04em',
            }}>#{j.num}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{j.type}</span>
                {j.fav && <Icon name="star-fill" size={12} color="var(--warn)" />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                {j.dz} · {j.ac}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="sd-mono" style={{ fontSize: 13 }}>{(j.alt/1000).toFixed(0)}k</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{j.date.split(' ').slice(1).join(' ')}</div>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

// ─── 07 Jump List · B (card-based with full data) ──────────────────────
function JumpListB() {
  return (
    <Screen tab="log">
      <TopBar title="Logbook" sub="847 jumps logged" trailing={
        <><IconBtn name="filter" /><IconBtn name="plus" /></>
      } />
      <div style={{ padding: '0 20px 12px' }}>
        <SearchBar placeholder="Search by DZ, type, tag…" />
      </div>
      <div className="sd-body" style={{ paddingTop: 4 }}>
        {SAMPLE_JUMPS.slice(0, 5).map(j => (
          <Card key={j.num} style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.06em' }}>JUMP #{j.num}</div>
                <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>{j.type} · {j.dz}</div>
              </div>
              {j.fav && <Icon name="star-fill" size={16} color="var(--warn)" />}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>EXIT</div>
                <div className="sd-mono" style={{ fontSize: 14, marginTop: 2 }}>{(j.alt/1000).toFixed(1)}k<span style={{ fontSize: 10, color: 'var(--fg-3)' }}> ft</span></div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FF</div>
                <div className="sd-mono" style={{ fontSize: 14, marginTop: 2 }}>{j.ff}<span style={{ fontSize: 10, color: 'var(--fg-3)' }}> s</span></div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DATE</div>
                <div className="sd-mono" style={{ fontSize: 12, marginTop: 4 }}>{j.date}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}

// ─── 07 Jump List · C (timeline / grouped by month) ────────────────────
function JumpListC() {
  const grouped = [
    { month: 'May 2026', jumps: SAMPLE_JUMPS.slice(0, 4) },
    { month: 'Apr 2026', jumps: SAMPLE_JUMPS.slice(4, 7) },
  ];
  return (
    <Screen tab="log">
      <TopBar title="Logbook" trailing={<><IconBtn name="search" /><IconBtn name="plus" /></>} />
      <div className="sd-body">
        {grouped.map(g => (
          <div key={g.month}>
            <div className="sd-section-title" style={{ margin: '8px 0 14px' }}>
              <span>{g.month}</span>
              <span className="sd-mono" style={{ color: 'var(--fg-3)' }}>{g.jumps.length} jumps</span>
            </div>
            <div style={{ position: 'relative', paddingLeft: 28 }}>
              <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
              {g.jumps.map(j => (
                <div key={j.num} style={{ position: 'relative', paddingBottom: 18 }}>
                  <div style={{
                    position: 'absolute', left: -22, top: 6,
                    width: 9, height: 9, borderRadius: 5,
                    background: 'var(--bg)', border: '2px solid var(--sky)',
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{j.type}</div>
                    <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>#{j.num}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>
                    {j.dz} · {j.ac} · <span className="sd-mono">{(j.alt/1000).toFixed(0)}k ft</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

// ─── 08 Filter & Sort bottom sheet ─────────────────────────────────────
function FilterSheet() {
  return (
    <Screen>
      {/* dimmed list behind */}
      <div style={{ flex: 1, position: 'relative', background: '#06090F', opacity: 0.95 }}>
        <TopBar title="Logbook" sub="847 jumps" trailing={<><IconBtn name="search" /><IconBtn name="plus" /></>} />
        <div style={{ padding: '0 20px', opacity: 0.5 }}>
          {SAMPLE_JUMPS.slice(0, 3).map((j, i) => (
            <div key={j.num} style={{ padding: '14px 4px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 500 }}>{j.type}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{j.dz}</div>
            </div>
          ))}
        </div>
        {/* Sheet */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'var(--bg)', borderRadius: '20px 20px 0 0',
          padding: '8px 20px 28px',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
          maxHeight: '76%', overflowY: 'auto',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface-3)', margin: '6px auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Filter & sort</div>
            <button style={{ background: 'none', border: 'none', color: 'var(--sky)', fontSize: 14, fontWeight: 500 }}>Reset</button>
          </div>

          <div className="sd-section-title" style={{ margin: '6px 0 8px' }}>Sort by</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip active>Date · newest</Chip>
            <Chip>Jump number</Chip>
            <Chip>Freefall time</Chip>
          </div>

          <div className="sd-section-title" style={{ margin: '18px 0 8px' }}>Jump type</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW', 'AFF', 'Tandem'].map(t => (
              <Chip key={t} active={t === 'Tracking' || t === 'Wingsuit'}>{t}</Chip>
            ))}
          </div>

          <div className="sd-section-title" style={{ margin: '18px 0 8px' }}>Dropzone</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip active>Picton</Chip>
            <Chip>Mission Beach</Chip>
            <Chip>Sydney</Chip>
            <Chip>+ Add</Chip>
          </div>

          <div className="sd-section-title" style={{ margin: '18px 0 8px' }}>Other</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip leading={<Icon name="star-fill" size={12} color="var(--warn)" />}>Favourites only</Chip>
            <Chip leading={<Icon name="signature" size={12} />}>Signed</Chip>
          </div>

          <div style={{ marginTop: 22 }}>
            <Button>Apply · 36 jumps</Button>
          </div>
        </div>
      </div>
      <HomeIndicator />
    </Screen>
  );
}

// ─── 09 Jump Detail · A (standard) ─────────────────────────────────────
function JumpDetailA() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Jump #847" large={false}
        trailing={<><IconBtn name="star-fill" /><IconBtn name="dots" /></>} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Badge kind="sky" icon="map">Tracking</Badge>
          <Badge kind="ok" icon="check">Signed</Badge>
        </div>
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <StatBig label="Exit alt" value="14,000" unit="ft" />
            <StatBig label="Freefall" value="0:60" />
            <StatBig label="Canopy" value="4:32" />
            <StatBig label="Pull alt" value="3,500" unit="ft" />
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <Field label="Date" value="Sat 24 May 2026 · 16:42" mono />
          <Field label="Dropzone" value="Skydive Picton, NSW" />
          <Field label="Aircraft" value="PAC 750XL · VH-PXM" mono />
          <div style={{ padding: '14px 0 0', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-2)', marginBottom: 4 }}>Tags</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Tag>sunset</Tag>
                <Tag color="var(--cyan)">video</Tag>
              </div>
            </div>
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div className="sd-label">Notes</div>
          <div style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5, marginTop: 4 }}>
            Tracked east of the DZ with Jake and Mira. Clean exit, good break-off at 5k. Filmed by Sara.
          </div>
        </Card>
        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="sd-label" style={{ marginBottom: 2 }}>Signed by</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Jake Rivera</div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>APF 9821 · D-Licence</div>
          </div>
          <svg width="80" height="36" viewBox="0 0 80 36" fill="none">
            <path d="M5 24c4-2 7-12 10-12s4 10 7 10 5-14 9-14 4 16 8 16 6-10 10-10 6 8 12 8 8-6 14-6" stroke="var(--sky)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 09 Jump Detail · B (instrument panel — dense grid) ────────────────
function JumpDetailB() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="#847 · Tracking" large={false}
        trailing={<IconBtn name="dots" />} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        {/* "instrument panel" */}
        <div style={{
          background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
          border: '1px solid var(--border-strong)', borderRadius: 14,
          padding: 18, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--sky)', letterSpacing: '0.12em' }}>JUMP TELEMETRY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--ok)' }} />
              <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.08em' }}>LOG VERIFIED</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['EXIT', '14,000', 'ft'],
              ['PULL', '3,500', 'ft'],
              ['FREEFALL', '0:60', 's'],
              ['CANOPY', '4:32', 's'],
              ['DEPLOY', '10,500', 'ft·Δ'],
              ['DESCENT', '12.4', 'k/m'],
            ].map(([l, v, u]) => (
              <div key={l} style={{ paddingBottom: 4, borderBottom: '1px dashed var(--border)' }}>
                <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>{l}</div>
                <div className="sd-mono" style={{ fontSize: 22, fontWeight: 500 }}>{v} <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Card style={{ padding: 12 }}>
            <div className="sd-label">DZ</div>
            <div style={{ fontWeight: 500, marginTop: 2 }}>Picton</div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>34.2°S 150.6°E</div>
          </Card>
          <Card style={{ padding: 12 }}>
            <div className="sd-label">Aircraft</div>
            <div style={{ fontWeight: 500, marginTop: 2 }}>PAC 750XL</div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>VH-PXM</div>
          </Card>
        </div>
        <Card style={{ marginBottom: 12 }}>
          <div className="sd-label">Notes</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>Clean tracking line east. Break-off 5k. Filmed by Sara.</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Tag>sunset</Tag>
            <Tag color="var(--cyan)">video</Tag>
          </div>
        </Card>
        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="sd-label" style={{ marginBottom: 2 }}>Signed</div>
            <div className="sd-mono" style={{ fontSize: 13 }}>J. RIVERA · APF 9821</div>
          </div>
          <Icon name="check" size={20} color="var(--ok)" stroke={2.5} />
        </Card>
      </div>
    </Screen>
  );
}

// ─── 09 Jump Detail · C (hero photo led) ───────────────────────────────
function JumpDetailC() {
  return (
    <Screen>
      <div style={{ position: 'relative', height: 280, flex: '0 0 auto' }}>
        <Placeholder label="canopy photo · 1024×768" height={280} style={{ borderRadius: 0, border: 'none' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,18,32,0.4) 0%, rgba(10,18,32,0) 30%, rgba(10,18,32,0.95) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 44, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <IconBtn name="back" />
          <div style={{ display: 'flex', gap: 8 }}>
            <IconBtn name="star-fill" />
            <IconBtn name="share" />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)', letterSpacing: '0.08em' }}>JUMP #847 · SAT 24 MAY</div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 2 }}>Tracking · Picton</div>
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
          {[['Exit', '14k ft'], ['FF', '0:60'], ['Canopy', '4:32']].map(([l, v]) => (
            <Card key={l} style={{ padding: 12, textAlign: 'center' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}</div>
              <div className="sd-mono" style={{ fontSize: 16, marginTop: 4 }}>{v}</div>
            </Card>
          ))}
        </div>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="sd-label">Dropzone</div>
              <div style={{ fontWeight: 500 }}>Skydive Picton</div>
            </div>
            <div>
              <div className="sd-label">Aircraft</div>
              <div className="sd-mono" style={{ fontSize: 13 }}>VH-PXM · PAC 750XL</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            <Tag>sunset</Tag>
            <Tag color="var(--cyan)">video</Tag>
          </div>
        </Card>
        <Card>
          <div className="sd-label">Notes</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4 }}>
            Tracked east with Jake and Mira. Filmed by Sara.
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 10 Create Jump · Step 1 ───────────────────────────────────────────
function CreateStep1() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="close" />} title="New jump" large={false}
        trailing={<span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>1 / 4</span>} />
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= 1 ? 'var(--sky)' : 'var(--surface-2)',
            }} />
          ))}
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 18 }}>The basics</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Date" value="Sat 24 May 2026" icon="calendar" />
            <Input label="Jump #" value="847" />
          </div>
          <Input label="Dropzone" value="Skydive Picton" icon="dz" />
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <Input label="Aircraft type" value="PAC 750XL" icon="plane" />
            <Input label="Rego" value="VH-PXM" />
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 24px 28px', display: 'flex', gap: 10 }}>
        <Button variant="ghost" style={{ flex: 1 }}>Cancel</Button>
        <Button style={{ flex: 2 }} icon="chevron">Continue</Button>
      </div>
    </Screen>
  );
}

// ─── 11 Create Jump · Step 2 ───────────────────────────────────────────
function CreateStep2() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="New jump" large={false}
        trailing={<span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>2 / 4</span>} />
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 2 ? 'var(--sky)' : 'var(--surface-2)' }} />
          ))}
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 18 }}>Altitudes & time</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Exit altitude (ft)" value="14,000" icon="altitude" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Freefall (s)" value="60" />
            <Input label="Canopy time (m:ss)" value="4:32" />
          </div>
          <div>
            <label className="sd-label">Jump type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {['Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW', 'AFF', 'Tandem', 'Coach', 'Demo'].map(t => (
                <Chip key={t} active={t === 'Tracking'}>{t}</Chip>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 24px 28px', display: 'flex', gap: 10 }}>
        <Button variant="ghost" style={{ flex: 1 }}>Back</Button>
        <Button style={{ flex: 2 }} icon="chevron">Continue</Button>
      </div>
    </Screen>
  );
}

// ─── 12 Create Jump · Step 3 ───────────────────────────────────────────
function CreateStep3() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="New jump" large={false}
        trailing={<span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>3 / 4</span>} />
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 3 ? 'var(--sky)' : 'var(--surface-2)' }} />
          ))}
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 18 }}>Tags & notes</div>

        <div style={{ marginBottom: 18 }}>
          <label className="sd-label">Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <Tag>sunset</Tag>
            <Tag color="var(--cyan)">video</Tag>
            <button className="sd-chip" style={{ height: 26, padding: '4px 10px' }}>
              <Icon name="plus" size={12} /> Add tag
            </button>
          </div>
        </div>

        <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 500 }}>Favourite jump</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Star this for quick access.</div>
          </div>
          <Toggle on />
        </Card>

        <div>
          <label className="sd-label">Notes</label>
          <textarea
            className="sd-input"
            style={{ minHeight: 120, resize: 'none', fontFamily: 'var(--font-ui)', lineHeight: 1.5, paddingTop: 12 }}
            defaultValue="Tracked east of the DZ with Jake and Mira. Clean exit, good break-off at 5k. Filmed by Sara."
          />
        </div>
      </div>
      <div style={{ padding: '12px 24px 28px', display: 'flex', gap: 10 }}>
        <Button variant="ghost" style={{ flex: 1 }}>Back</Button>
        <Button style={{ flex: 2 }} icon="signature">Sign jump</Button>
      </div>
    </Screen>
  );
}

// ─── 13 Create Jump · Signature ────────────────────────────────────────
function CreateSig() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Sign jump" large={false}
        trailing={<span style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-mono)' }}>4 / 4</span>} />
      <div style={{ padding: '0 24px 8px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--sky)' }} />
          ))}
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Sign-off</div>
        <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 4, marginBottom: 16 }}>
          Sign as the jumper, or hand to an instructor to sign.
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          height: 200, position: 'relative', marginBottom: 16,
        }}>
          <svg width="100%" height="100%" viewBox="0 0 320 200" style={{ position: 'absolute', inset: 0 }}>
            <path d="M20 140 C 40 80, 80 60, 120 100 S 200 160, 240 120 S 290 80, 300 100" stroke="var(--sky)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{
            position: 'absolute', left: 16, right: 16, bottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>SIGN HERE</div>
            <button style={{ background: 'none', border: 'none', color: 'var(--fg-2)', fontSize: 12 }}>Clear</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Signed by" value="Erin Morrison" />
          <Input label="Licence #" value="APF 14829" />
        </div>
      </div>
      <div style={{ padding: '12px 24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button icon="check">Save & sign jump</Button>
        <Button variant="ghost" icon="qr">Hand to instructor (QR)</Button>
      </div>
    </Screen>
  );
}

// ─── 14 Jump Saved confirmation ────────────────────────────────────────
function ScreenSaved() {
  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 40,
          background: 'var(--ok-bg)', border: '2px solid var(--ok)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 22,
        }}>
          <Icon name="check" size={42} color="var(--ok)" stroke={2.5} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Jump #847 saved.</div>
        <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Tracking jump from Picton signed off. 847 jumps in your logbook.
        </div>
        <Card style={{ width: '100%', marginTop: 26, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>TOTAL</div>
              <div className="sd-mono" style={{ fontSize: 16, marginTop: 4 }}>847</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>FF TIME</div>
              <div className="sd-mono" style={{ fontSize: 16, marginTop: 4 }}>14h 23m</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>STREAK</div>
              <div className="sd-mono" style={{ fontSize: 16, marginTop: 4 }}>5 days</div>
            </div>
          </div>
        </Card>
      </div>
      <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button icon="eye">View jump</Button>
        <Button variant="ghost">Done</Button>
      </div>
    </Screen>
  );
}

// ─── 15 Edit Jump (like detail but editable) ───────────────────────────
function EditJump() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="close" />} title="Edit jump #847" large={false}
        trailing={<span style={{ color: 'var(--sky)', fontWeight: 500, fontSize: 15 }}>Save</span>} />
      <div className="sd-body" style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Date" value="Sat 24 May 2026" icon="calendar" />
          <Input label="Dropzone" value="Skydive Picton" icon="dz" />
          <Input label="Aircraft" value="PAC 750XL · VH-PXM" icon="plane" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Input label="Exit (ft)" value="14,000" />
            <Input label="Freefall (s)" value="60" />
          </div>
          <div>
            <label className="sd-label">Jump type</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {['Belly', 'Tracking', 'Wingsuit', 'Freefly'].map(t => (
                <Chip key={t} active={t === 'Tracking'}>{t}</Chip>
              ))}
            </div>
          </div>
          <div>
            <label className="sd-label">Notes</label>
            <textarea className="sd-input" style={{ minHeight: 90, resize: 'none', paddingTop: 12 }}
              defaultValue="Tracked east of the DZ with Jake and Mira." />
          </div>
          <button style={{
            background: 'none', border: 'none', color: 'var(--danger)',
            fontSize: 14, fontWeight: 500, padding: '14px 0', textAlign: 'left',
          }}>
            Delete jump
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ─── 16 Favourites ─────────────────────────────────────────────────────
function ScreenFavourites() {
  const favs = SAMPLE_JUMPS.filter(j => j.fav);
  return (
    <Screen tab="log">
      <TopBar title="Favourites" sub={`${favs.length} starred jumps`} leading={<IconBtn name="back" />}
        trailing={<IconBtn name="filter" />} large={false} />
      <div className="sd-body" style={{ paddingTop: 8 }}>
        {favs.map(j => (
          <Card key={j.num} style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="star-fill" size={14} color="var(--warn)" />
                  <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>JUMP #{j.num}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{j.type}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>{j.dz} · {j.date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sd-mono" style={{ fontSize: 13 }}>{(j.alt/1000).toFixed(0)}k</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{j.ff}s FF</div>
              </div>
            </div>
            {j.tags && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {j.tags.map(t => <Tag key={t} color={t === 'video' ? 'var(--cyan)' : 'var(--sky)'}>{t}</Tag>)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </Screen>
  );
}

// ─── 17 Browse by tag ──────────────────────────────────────────────────
function ScreenTags() {
  const tags = [
    { name: 'sunset', count: 18, color: 'var(--warn)' },
    { name: 'video', count: 47, color: 'var(--cyan)' },
    { name: 'beach', count: 12, color: 'var(--sky)' },
    { name: 'coach', count: 38, color: 'var(--ok)' },
    { name: 'demo', count: 6, color: 'var(--danger)' },
    { name: 'comp', count: 22, color: '#A78BFA' },
    { name: 'night', count: 4, color: '#F472B6' },
    { name: '8-way', count: 14, color: 'var(--sky)' },
  ];
  return (
    <Screen tab="log">
      <TopBar title="Tags" leading={<IconBtn name="back" />} large={false} />
      <div style={{ padding: '0 20px 12px' }}>
        <SearchBar placeholder="Search tags…" />
      </div>
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tags.map(t => (
            <Card key={t.name} style={{ padding: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 5, background: t.color }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
              </div>
              <div className="sd-mono" style={{ fontSize: 20, fontWeight: 500 }}>{t.count}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                {t.count === 1 ? 'jump' : 'jumps'}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ─── 18 QR Sign-off (display) ──────────────────────────────────────────
function ScreenQR() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="close" />} title="Hand to instructor" large={false} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 24px' }}>
        <div style={{ fontSize: 14, color: 'var(--fg-2)', textAlign: 'center', marginBottom: 24 }}>
          Show this code to an instructor to scan and sign jump <span className="sd-mono">#847</span>.
        </div>
        <div style={{
          width: 260, height: 260, background: '#fff', padding: 16,
          borderRadius: 14, marginBottom: 24,
        }}>
          {/* fake QR */}
          <div style={{
            width: '100%', height: '100%',
            background: `
              radial-gradient(circle at 10% 10%, #000 0 18%, transparent 19%),
              radial-gradient(circle at 90% 10%, #000 0 18%, transparent 19%),
              radial-gradient(circle at 10% 90%, #000 0 18%, transparent 19%),
              repeating-conic-gradient(#000 0 25%, #fff 25% 50%)`,
            backgroundSize: '36% 36%, 36% 36%, 36% 36%, 22px 22px',
            backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat',
            backgroundPosition: '0 0, 100% 0, 0 100%, center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: 50, height: 50, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, border: '2px solid #000',
            }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M4 12a12 12 0 0124 0M4 12l12 7 12-7M16 19v9" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
        <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>EXPIRES IN 04:58</div>
        <Card style={{ width: '100%', marginTop: 22, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="sd-label" style={{ marginBottom: 2 }}>Jump</div>
              <div className="sd-mono">#847 · Tracking · Picton</div>
            </div>
            <Badge kind="warn">PENDING</Badge>
          </div>
        </Card>
      </div>
    </Screen>
  );
}

// ─── 19 Instructor Scan & Sign ─────────────────────────────────────────
function ScreenScanSign() {
  return (
    <Screen>
      <TopBar leading={<IconBtn name="back" />} title="Sign as instructor" large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{
          background: 'var(--ok-bg)', border: '1px solid var(--ok)',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
        }}>
          <Icon name="check" size={20} color="var(--ok)" />
          <div>
            <div style={{ fontWeight: 500 }}>Code scanned</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>Verifying jump details…</div>
          </div>
        </Card>

        <div className="sd-section-title">Jump being signed</div>
        <Card style={{ marginBottom: 14 }}>
          <Field label="Jumper" value="Erin Morrison · APF 14829" mono />
          <Field label="Jump #" value="847 · Tracking" mono />
          <Field label="Aircraft" value="PAC 750XL · VH-PXM" mono />
          <Field label="Exit / FF" value="14,000 ft · 0:60" mono />
        </Card>

        <div className="sd-section-title">Sign as instructor</div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
          height: 140, marginBottom: 12, position: 'relative',
        }}>
          <svg width="100%" height="100%" viewBox="0 0 320 140" style={{ position: 'absolute', inset: 0 }}>
            <path d="M20 90 C 50 50, 80 100, 110 70 S 180 40, 210 80 S 280 90, 300 70" stroke="var(--sky)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <div className="sd-mono" style={{ position: 'absolute', bottom: 10, left: 16, fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>INSTRUCTOR SIGNATURE</div>
        </div>
        <Input label="Name" value="Jake Rivera" />
        <Input style={{ marginTop: 10 }} label="Licence" value="APF 9821 · D-Licence" />
      </div>
      <div style={{ padding: '12px 24px 28px' }}>
        <Button icon="check">Confirm & sign</Button>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  JumpListA, JumpListB, JumpListC, FilterSheet,
  JumpDetailA, JumpDetailB, JumpDetailC,
  CreateStep1, CreateStep2, CreateStep3, CreateSig, ScreenSaved, EditJump,
  ScreenFavourites, ScreenTags, ScreenQR, ScreenScanSign,
});
