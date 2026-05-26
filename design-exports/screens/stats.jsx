// SkydiveLog — Stats tab (4 screens + 3 Stats Overview variants)

// ─── Tiny chart primitives ─────────────────────────────────────────────
function Sparkline({ data = [3, 5, 4, 7, 6, 9, 8, 12, 10, 14, 13, 18], color = 'var(--sky)', h = 32, w = 100 }) {
  const max = Math.max(...data);
  const pts = data.map((d, i) => `${(i/(data.length-1))*w},${h - (d/max)*h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, color = 'var(--sky)', h = 140 }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: h }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%',
            height: `${(d.v/max)*100}%`,
            background: d.highlight ? color : 'var(--surface-2)',
            borderRadius: '3px 3px 0 0',
            position: 'relative',
          }}>
            {d.highlight && (
              <div className="sd-mono" style={{
                position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                fontSize: 10, color: 'var(--fg)',
              }}>{d.v}</div>
            )}
          </div>
          <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.02em' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── 20 Stats Overview · A (default cards) ─────────────────────────────
function StatsA() {
  return (
    <Screen tab="stats">
      <TopBar title="Stats" sub="all time" trailing={<IconBtn name="filter" />} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{ marginBottom: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="sd-label">Total jumps</div>
              <div className="sd-mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, marginTop: 6 }}>847</div>
              <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="up" size={12} stroke={2.5} /> +12 this month
              </div>
            </div>
            <Sparkline w={120} h={48} />
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Card style={{ padding: 14 }}>
            <div className="sd-label">Freefall</div>
            <div className="sd-mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 6 }}>14h 23m</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>51,780 s · avg 61s</div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div className="sd-label">Canopy</div>
            <div className="sd-mono" style={{ fontSize: 22, fontWeight: 500, marginTop: 6 }}>62h 04m</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>avg 4:24</div>
          </Card>
        </div>

        <div className="sd-section-title">Currency</div>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>You're current</div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>30-day window</div>
            </div>
            <CurrencyRing percent={82} label="24" sub="days" color="var(--ok)" />
          </div>
          <div className="sd-divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>Last jump · 24 May</div>
            <Badge kind="ok" icon="check">CURRENT</Badge>
          </div>
        </Card>

        <div className="sd-section-title">By jump type</div>
        <Card>
          {[
            ['Belly', 412, 'var(--sky)', 49],
            ['Tracking', 218, 'var(--cyan)', 26],
            ['Wingsuit', 124, 'var(--warn)', 15],
            ['Freefly', 93, '#A78BFA', 11],
          ].map(([n, c, col, pct]) => (
            <div key={n} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{n}</span>
                <span className="sd-mono" style={{ fontSize: 13 }}>{c} <span style={{ color: 'var(--fg-3)' }}>· {pct}%</span></span>
              </div>
              <Progress value={pct} color={col} />
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 20 Stats Overview · B (cockpit instrument) ────────────────────────
function StatsB() {
  return (
    <Screen tab="stats">
      <TopBar title="Telemetry" sub="lifetime · APF 14829" />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        {/* Big hero gauge */}
        <div style={{
          background: 'radial-gradient(ellipse at center, rgba(74,158,255,0.15) 0%, var(--surface) 70%)',
          border: '1px solid var(--border-strong)', borderRadius: 18,
          padding: 22, marginBottom: 12, textAlign: 'center',
        }}>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--sky)', letterSpacing: '0.18em' }}>TOTAL JUMPS</div>
          <div className="sd-mono" style={{ fontSize: 72, fontWeight: 500, lineHeight: 1, marginTop: 6 }}>847</div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.08em', marginTop: 8 }}>
            +12 LAST 30D · NEXT: 1000 IN 153
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[
            ['FREEFALL', '14:23', 'h:m'],
            ['CANOPY', '62:04', 'h:m'],
            ['MAX FF', '4:18', 'WS'],
            ['MAX ALT', '18k', 'ft'],
          ].map(([l, v, u]) => (
            <div key={l} style={{
              border: '1px solid var(--border)', borderRadius: 10,
              padding: 14, background: 'var(--surface)',
            }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>{l}</div>
              <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>{v}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{u}</div>
            </div>
          ))}
        </div>

        <Card style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em' }}>CURRENCY · 30D</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Current</div>
            </div>
            <Badge kind="ok">OK</Badge>
          </div>
          <div style={{ position: 'relative', height: 6, background: 'var(--surface-2)', borderRadius: 3 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '82%', background: 'linear-gradient(90deg, var(--ok), var(--cyan))', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: '82%', top: -4, width: 2, height: 14, background: 'var(--fg)' }} />
          </div>
          <div className="sd-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-3)', marginTop: 8, letterSpacing: '0.04em' }}>
            <span>NOW</span><span>+24D</span><span>+30D LAPSE</span>
          </div>
        </Card>

        <Card>
          <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.1em', marginBottom: 12 }}>LAST 30 DAYS</div>
          <BarChart h={100} data={[
            { label: '4W', v: 5 }, { label: '3W', v: 8 }, { label: '2W', v: 11, highlight: true },
            { label: 'W', v: 4 }, { label: '6D', v: 0 }, { label: '5D', v: 2 }, { label: '4D', v: 6 }, { label: '0', v: 3 },
          ]} />
        </Card>
      </div>
    </Screen>
  );
}

// ─── 20 Stats Overview · C (story / photo led) ─────────────────────────
function StatsC() {
  return (
    <Screen tab="stats">
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <Placeholder label="hero · cloud break" height={180} style={{ borderRadius: 0, border: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, var(--bg) 100%)' }} />
        <div style={{ position: 'absolute', top: 44, left: 20, right: 20 }}>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)', letterSpacing: '0.1em' }}>YOUR YEAR · 2026</div>
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }} className="sd-mono">182</div>
          <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 2 }}>jumps so far · on pace for 320</div>
        </div>
      </div>
      <div className="sd-body" style={{ paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, marginLeft: -4, paddingLeft: 4 }}>
          {[
            ['Furthest', '3:48', 'WS hold'],
            ['Highest', '18,000', 'ft exit'],
            ['Longest day', '11', 'jumps'],
            ['Best month', 'Jan', '34'],
          ].map(([l, v, s]) => (
            <Card key={l} style={{ minWidth: 130, padding: 14 }}>
              <div className="sd-label">{l}</div>
              <div className="sd-mono" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s}</div>
            </Card>
          ))}
        </div>

        <Card style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="sd-label">Currency · 30d</div>
              <div style={{ fontWeight: 600, fontSize: 16, marginTop: 2 }}>You're current</div>
            </div>
            <CurrencyRing percent={82} label="24" sub="days" color="var(--ok)" />
          </div>
          <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Lapses in 6 days · go log a jump.</div>
        </Card>

        <div className="sd-section-title">Top DZ this year</div>
        <Card>
          {[
            ['Skydive Picton', 67, 'NSW · AU'],
            ['Mission Beach', 41, 'QLD · AU'],
            ['Skydive Sydney', 28, 'NSW · AU'],
          ].map(([n, c, l]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: n === 'Skydive Sydney' ? 'none' : '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{l}</div>
              </div>
              <div className="sd-mono" style={{ fontSize: 15, alignSelf: 'center' }}>{c}</div>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 21 Jumps over time (bar chart) ────────────────────────────────────
function ScreenJumpsTime() {
  const months = [
    { label: 'Jun', v: 8 }, { label: 'Jul', v: 14 }, { label: 'Aug', v: 18 },
    { label: 'Sep', v: 22 }, { label: 'Oct', v: 28 }, { label: 'Nov', v: 19 },
    { label: 'Dec', v: 24 }, { label: 'Jan', v: 34, highlight: true }, { label: 'Feb', v: 31 },
    { label: 'Mar', v: 26 }, { label: 'Apr', v: 20 }, { label: 'May', v: 12 },
  ];
  return (
    <Screen tab="stats">
      <TopBar title="Jumps over time" leading={<IconBtn name="back" />} large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)', padding: 3, marginBottom: 16,
        }}>
          {['Week', 'Month', 'Year'].map((p, i) => (
            <div key={p} style={{
              flex: 1, padding: '8px 0', textAlign: 'center',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: i === 1 ? 'var(--surface-2)' : 'transparent',
              color: i === 1 ? 'var(--fg)' : 'var(--fg-3)',
            }}>{p}</div>
          ))}
        </div>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div>
              <div className="sd-label">Last 12 months</div>
              <div className="sd-mono" style={{ fontSize: 26, fontWeight: 500, marginTop: 2 }}>256 <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>jumps</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ok)' }}>
              <Icon name="up" size={12} stroke={2.5} /> +18% YoY
            </div>
          </div>
          <BarChart data={months} h={160} />
        </Card>

        <div className="sd-section-title">By weekday</div>
        <Card>
          {[
            ['Mon', 12], ['Tue', 8], ['Wed', 14], ['Thu', 11],
            ['Fri', 24], ['Sat', 92, true], ['Sun', 95, true],
          ].map(([d, v, hi]) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <div className="sd-mono" style={{ width: 32, fontSize: 12, color: 'var(--fg-2)' }}>{d}</div>
              <div style={{ flex: 1 }}>
                <Progress value={(v/95)*100} color={hi ? 'var(--sky)' : 'var(--surface-3)'} height={8} />
              </div>
              <div className="sd-mono" style={{ fontSize: 13, width: 30, textAlign: 'right' }}>{v}</div>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 22 Jump type breakdown (pie) ──────────────────────────────────────
function ScreenTypePie() {
  const types = [
    { name: 'Belly',    pct: 49, color: 'var(--sky)',   count: 412 },
    { name: 'Tracking', pct: 26, color: 'var(--cyan)',  count: 218 },
    { name: 'Wingsuit', pct: 15, color: 'var(--warn)',  count: 124 },
    { name: 'Freefly',  pct: 7,  color: '#A78BFA',     count: 60 },
    { name: 'CRW',      pct: 3,  color: 'var(--ok)',    count: 33 },
  ];
  // build SVG donut
  let acc = 0;
  const arcs = types.map(t => {
    const start = acc; acc += t.pct;
    const end = acc;
    const r = 60, cx = 80, cy = 80;
    const a1 = (start/100) * 2 * Math.PI - Math.PI/2;
    const a2 = (end/100) * 2 * Math.PI - Math.PI/2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const big = end - start > 50 ? 1 : 0;
    return { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${big} 1 ${x2} ${y2} Z`, color: t.color };
  });

  return (
    <Screen tab="stats">
      <TopBar title="Jump types" leading={<IconBtn name="back" />} large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <Card style={{ display: 'flex', justifyContent: 'center', paddingTop: 22, paddingBottom: 22, marginBottom: 14 }}>
          <div style={{ position: 'relative', width: 160, height: 160 }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
              <circle cx="80" cy="80" r="40" fill="var(--surface)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="sd-mono" style={{ fontSize: 9, color: 'var(--fg-3)', letterSpacing: '0.12em' }}>TOTAL</div>
              <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500 }}>847</div>
            </div>
          </div>
        </Card>

        <Card>
          {types.map((t, i) => (
            <div key={t.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: i < types.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color }} />
              <span style={{ flex: 1, fontWeight: 500 }}>{t.name}</span>
              <span className="sd-mono" style={{ fontSize: 13, color: 'var(--fg-2)' }}>{t.count}</span>
              <span className="sd-mono" style={{ fontSize: 13, width: 42, textAlign: 'right' }}>{t.pct}%</span>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

// ─── 23 Aircraft & DZ stats ────────────────────────────────────────────
function ScreenAircraftDZ() {
  return (
    <Screen tab="stats">
      <TopBar title="Aircraft & DZs" leading={<IconBtn name="back" />} large={false} />
      <div className="sd-body" style={{ paddingTop: 4 }}>
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)', padding: 3, marginBottom: 16,
        }}>
          {['Dropzones', 'Aircraft'].map((p, i) => (
            <div key={p} style={{
              flex: 1, padding: '8px 0', textAlign: 'center',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: i === 0 ? 'var(--surface-2)' : 'transparent',
              color: i === 0 ? 'var(--fg)' : 'var(--fg-3)',
            }}>{p}</div>
          ))}
        </div>

        <div className="sd-section-title">Top dropzones</div>
        {[
          ['Skydive Picton', 'NSW · AU', 267, 'var(--sky)'],
          ['Mission Beach', 'QLD · AU', 184, 'var(--cyan)'],
          ['Skydive Sydney', 'NSW · AU', 142, 'var(--warn)'],
          ['Eloy', 'AZ · US', 88, '#A78BFA'],
          ['Skydive Byron', 'NSW · AU', 51, 'var(--ok)'],
        ].map(([n, l, c, col]) => (
          <Card key={n} style={{ marginBottom: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${col}, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, flex: '0 0 auto',
            }}>
              <Icon name="dz" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{n}</div>
              <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{l}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="sd-mono" style={{ fontSize: 16, fontWeight: 500 }}>{c}</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>jumps</div>
            </div>
          </Card>
        ))}

        <div className="sd-section-title">Top aircraft</div>
        <Card>
          {[
            ['PAC 750XL', '14k turbine', 412],
            ['Cessna 208B Caravan', '14k turbine', 218],
            ['Twin Otter', '15k twin turbine', 124],
            ['Cessna 182', '9k single piston', 60],
          ].map(([n, s, c], i, a) => (
            <div key={n} style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0',
              borderBottom: i < a.length-1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 500 }}>{n}</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s}</div>
              </div>
              <div className="sd-mono" style={{ fontSize: 15, alignSelf: 'center' }}>{c}</div>
            </div>
          ))}
        </Card>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  StatsA, StatsB, StatsC,
  ScreenJumpsTime, ScreenTypePie, ScreenAircraftDZ,
});
