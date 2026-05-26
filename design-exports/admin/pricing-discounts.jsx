// Admin · Plans & pricing + Discounts

// ─── 14 Plans & Pricing ────────────────────────────────────────────────
function AdminPricing() {
  return (
    <AdminShell active="pricing">
      <AdminPageHeader title="Plans & pricing" sub="Global price · trial · currency" actions={
        <Badge kind="warn">CHANGES APPLY TO NEW & RENEWING SUBS</Badge>
      } />

      <div style={{
        background: 'var(--warn-bg)', border: '1px solid var(--warn)',
        borderRadius: 10, padding: 16, marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Icon name="shield" size={20} color="var(--warn)" />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fg)' }}>
          <b>Pricing changes are audited and reversible.</b> Existing active subscriptions keep their original price until renewal. Trial users see the new price when they convert.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Current price card */}
          <AdminCard title="ANNUAL PLAN · ACTIVE">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginBottom: 6 }}>
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>CURRENT</div>
                <div className="sd-mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, color: 'var(--sky)' }}>$5.00<span style={{ fontSize: 16, color: 'var(--fg-3)' }}> / year</span></div>
              </div>
              <Icon name="chevron" size={22} color="var(--fg-3)" />
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>NEW · STAGED</div>
                <div className="sd-mono" style={{ fontSize: 44, fontWeight: 500, lineHeight: 1, color: 'var(--ok)' }}>$8.00<span style={{ fontSize: 16, color: 'var(--fg-3)' }}> / year</span></div>
              </div>
            </div>
            <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.04em' }}>
              +60% · APPLIES FROM 01 JUL 2026 · 38,471 USERS NOTIFIED
            </div>
          </AdminCard>

          {/* Editor */}
          <AdminCard title="EDIT PRICE">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="sd-label">Currency</div>
                <div style={{ position: 'relative' }}>
                  <input className="sd-input" defaultValue="USD · United States Dollar" style={{ paddingRight: 36 }} />
                  <Icon name="down" size={14} color="var(--fg-3)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
              <div>
                <div className="sd-label">Billing cycle</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <Chip active>Annual</Chip>
                  <Chip>Monthly</Chip>
                  <Chip>Lifetime</Chip>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Price · USD per year</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <span className="sd-mono" style={{ fontSize: 32, color: 'var(--fg-3)' }}>$</span>
                <input className="sd-input sd-mono" defaultValue="8.00" style={{ fontSize: 32, height: 64, padding: '0 16px', fontWeight: 500, letterSpacing: '-0.01em', flex: 1 }} />
                <span className="sd-mono" style={{ fontSize: 14, color: 'var(--fg-3)' }}>/ year</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {['$5', '$8', '$12', '$15', '$24', '$36', '$48'].map(v => (
                  <Chip key={v} active={v === '$8'}>{v}</Chip>
                ))}
              </div>
            </div>

            <div className="sd-divider" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <Input label="Trial length (days)" value="30" />
              </div>
              <div>
                <Input label="Renewal grace period (days)" value="7" />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Effective from</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Chip>Immediately</Chip>
                <Chip active>Schedule</Chip>
              </div>
              <div style={{ marginTop: 8 }}>
                <Input value="01 Jul 2026" icon="calendar" />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Reason · for audit log</div>
              <textarea className="sd-input" style={{ minHeight: 70, fontSize: 13, resize: 'none', paddingTop: 12 }}
                defaultValue="Sustainable pricing review · Q2 board approval · costs up 60% YoY (AWS Sydney). Existing subs grandfathered." />
            </div>
          </AdminCard>

          {/* Other settings */}
          <AdminCard title="PAYMENT METHODS ACCEPTED">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                ['Cards', 'card', true],
                ['Apple Pay', 'shield', true],
                ['Google Pay', 'shield', true],
                ['Stripe Link', 'card', true],
                ['Bank transfer', 'card', false],
                ['Crypto', 'card', false],
                ['PayPal', 'card', false],
                ['Klarna', 'card', false],
              ].map(([n, ic, on]) => (
                <div key={n} style={{
                  padding: 12, borderRadius: 8,
                  background: on ? 'var(--sky-bg)' : 'var(--surface-2)',
                  border: `1px solid ${on ? 'var(--sky)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Icon name={ic} size={14} color={on ? 'var(--sky)' : 'var(--fg-3)'} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: on ? 'var(--sky)' : 'var(--fg-3)', flex: 1 }}>{n}</span>
                  {on && <Icon name="check" size={11} color="var(--sky)" stroke={2.5} />}
                </div>
              ))}
            </div>
          </AdminCard>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Discard</Button>
            <Button variant="sub" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Save as draft</Button>
            <Button style={{ width: 'auto', padding: '0 18px', height: 38 }}>Schedule for 01 Jul</Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="IMPACT ESTIMATE">
            <div style={{ padding: 10, background: 'var(--bg)', borderRadius: 8, marginBottom: 10 }}>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>NEW MRR · MODELLED</div>
              <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500, marginTop: 4, color: 'var(--ok)' }}>$22,739</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--ok)', marginTop: 2 }}>+ $8,527 / MO · +60%</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 10 }}>Assumes 5% churn lift, 88% conversion on existing renewals.</div>
            <div className="sd-divider" />
            {[
              ['Existing subs (grandfathered)', '$5/yr · 34,118'],
              ['New subs (post-effective)',     '$8/yr · est. +218/mo'],
              ['Trial conversions',             '88% → 82% projected'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-2)' }}>{k}</span>
                <span className="sd-mono" style={{ color: 'var(--fg)' }}>{v}</span>
              </div>
            ))}
          </AdminCard>

          <AdminCard title="PRICE HISTORY">
            {[
              ['$5.00 USD / yr', 'current', '14 Mar 2025', 'launch price'],
              ['$3.00 USD / yr', '01 Jul 24 — 14 Mar 25', '01 Jul 2024', 'beta promo'],
              ['Free',           'before 01 Jul 24',   '—',  'closed beta'],
            ].map(([p, period, when, why], i, a) => (
              <div key={when + p} style={{ padding: '10px 0', borderBottom: i < a.length-1 ? '1px dashed var(--border)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span className="sd-mono" style={{ fontWeight: 500, fontSize: 14 }}>{p}</span>
                  <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{when}</span>
                </div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3 }}>{period} · {why}</div>
              </div>
            ))}
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── 15 Discounts & Coupons ────────────────────────────────────────────
function AdminDiscounts() {
  const coupons = [
    ['ELOY2026',        '50% off · 1 year',   'Eloy Boogie attendees',     412,  500,  'Active',   '15 Mar 27', 'percent'],
    ['STUDENTS50',      '50% off · 1 year',   'Verified students',         184,  '∞',  'Active',   '—',         'percent'],
    ['SUMMERLAUNCH',    '$3 off first year',  'Marketing · Jun 2026',      28,   1000, 'Active',   '30 Jun 26', 'flat'],
    ['DZ-PICTON',       '100% off · 1 year',  'Picton sponsorship deal',   38,   50,   'Active',   '14 Mar 27', 'percent'],
    ['FRIEND-2024',     '$5 off · once',      'Referral program · 2024',   2284, '∞',  'Paused',   '—',         'flat'],
    ['BLACKFRIDAY24',   '40% off · 1 year',   'Nov 2024 promo',            142,  '∞',  'Expired',  '02 Dec 24', 'percent'],
  ];
  const userDiscounts = [
    ['#18469', 'Sara Davies',    'Comp · 1 month',  'Manual override',     'DK', '24 May'],
    ['#18472', 'Erin Morrison',  '50% · 1 year',    'ELOY2026 applied',    'sys','15 Mar'],
    ['#18465', 'Diego Ortiz',    '$5 off · once',   'FRIEND-2024 applied', 'sys','13 May'],
    ['#18421', 'Liam Briggs',    'Comp · 6 months', 'Manual · DZ partner', 'AB', '08 May'],
    ['#18112', 'Sam Park',       '50% · 1 year',    'STUDENTS50 applied',  'sys','21 Apr'],
  ];

  return (
    <AdminShell active="discounts">
      <AdminPageHeader title="Discounts" sub="Coupon codes · manual user discounts" actions={
        <Button style={{ width: 'auto', height: 34, padding: '0 14px', fontSize: 13 }} icon="plus">New coupon</Button>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="Active coupons" value="4" sub="2 paused · 12 expired" />
        <KPI label="Redemptions · 30d" value="662" sub="of 1,550 cap" trend="+18%" accent="var(--sky)" />
        <KPI label="Discount given · 30d" value="$1,824" sub="effective rev loss" trend="—" />
        <KPI label="Manual comps" value="38" sub="this month" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>
        <AdminCard title="ACTIVE COUPONS" padding={0}
          action={
            <div style={{ paddingRight: 18, display: 'flex', gap: 8 }}>
              <Chip active>All</Chip>
              <Chip>Active</Chip>
              <Chip>Paused</Chip>
              <Chip>Expired</Chip>
            </div>
          }
        >
          <div style={{
            display: 'grid', gridTemplateColumns: '120px 1fr 1.4fr 70px 70px 90px 100px',
            padding: '12px 18px', borderBottom: '1px solid var(--border)',
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
            letterSpacing: '0.1em', textTransform: 'uppercase', gap: 10,
          }}>
            <span>Code</span><span>Discount</span><span>Use case</span><span>Used</span><span>Cap</span><span>Expires</span><span>Status</span>
          </div>
          {coupons.map((c, i) => {
            const [code, disc, use, used, cap, status, exp, kind] = c;
            return (
              <div key={code} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr 1.4fr 70px 70px 90px 100px',
                padding: '12px 18px',
                borderBottom: i < coupons.length-1 ? '1px solid var(--border)' : 'none',
                fontSize: 13, gap: 10, alignItems: 'center',
                opacity: status === 'Expired' ? 0.5 : 1,
              }}>
                <span className="sd-mono" style={{ fontSize: 12, color: 'var(--sky)', fontWeight: 600 }}>{code}</span>
                <span style={{ fontSize: 12 }}>{disc}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{use}</span>
                <span className="sd-mono" style={{ fontSize: 12 }}>{used.toLocaleString()}</span>
                <span className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-3)' }}>{cap}</span>
                <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{exp}</span>
                <span>
                  <Badge kind={status === 'Active' ? 'ok' : status === 'Paused' ? 'warn' : 'muted'}>{status.toUpperCase()}</Badge>
                </span>
              </div>
            );
          })}
        </AdminCard>

        <AdminCard title="NEW COUPON · QUICK CREATE">
          <Input label="Code" value="JULY-LAUNCH" style={{ marginBottom: 0 }} />
          <div style={{ marginTop: 12 }}>
            <div className="sd-label">Discount type</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Chip active>Percent</Chip>
              <Chip>Flat amount</Chip>
              <Chip>Free</Chip>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <Input label="Amount" value="25" />
            <Input label="Duration" value="1 year" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <Input label="Usage cap" value="500" />
            <Input label="Expires" value="31 Aug 2026" icon="calendar" />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="sd-label">Eligibility</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <Chip active>New users</Chip>
              <Chip>Renewals</Chip>
              <Chip>+ Country</Chip>
              <Chip>+ Licence type</Chip>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="ghost" style={{ flex: 1, height: 36 }}>Cancel</Button>
            <Button style={{ flex: 2, height: 36 }}>Create coupon</Button>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="RECENT MANUAL DISCOUNTS · LAST 30 DAYS" action={
        <span style={{ color: 'var(--sky)', fontSize: 12, fontWeight: 500 }}>View all 38 →</span>
      } padding={0}>
        <div style={{
          display: 'grid', gridTemplateColumns: '90px 1.4fr 1.4fr 2fr 60px 80px 80px',
          padding: '12px 18px', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
          letterSpacing: '0.1em', textTransform: 'uppercase', gap: 10,
        }}>
          <span>User</span><span>Name</span><span>Discount</span><span>Reason / source</span><span>By</span><span>Applied</span><span></span>
        </div>
        {userDiscounts.map((u, i) => (
          <div key={u[0] + u[5]} style={{
            display: 'grid', gridTemplateColumns: '90px 1.4fr 1.4fr 2fr 60px 80px 80px',
            padding: '12px 18px',
            borderBottom: i < userDiscounts.length-1 ? '1px solid var(--border)' : 'none',
            fontSize: 13, gap: 10, alignItems: 'center',
          }}>
            <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u[0]}</span>
            <span style={{ fontWeight: 500 }}>{u[1]}</span>
            <span style={{ fontSize: 12 }}>{u[2]}</span>
            <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{u[3]}</span>
            <span className="sd-mono" style={{ fontSize: 11, color: u[4] === 'sys' ? 'var(--fg-3)' : 'var(--sky)' }}>{u[4].toUpperCase()}</span>
            <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{u[5]}</span>
            <span style={{ textAlign: 'right' }}><Icon name="dots" size={14} color="var(--fg-3)" /></span>
          </div>
        ))}
      </AdminCard>
    </AdminShell>
  );
}

// ─── 16 Apply Discount to User (modal/sheet) ───────────────────────────
function AdminApplyDiscount() {
  return (
    <AdminShell active="users">
      <div style={{ marginBottom: 18, fontSize: 12, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--fg-2)' }}>Users</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span className="sd-mono">#18472</span>
        <Icon name="chevron" size={11} color="var(--fg-4)" />
        <span style={{ color: 'var(--fg-2)' }}>Apply discount</span>
      </div>

      <AdminPageHeader title="Apply discount · Erin Morrison" sub="USER #18472 · sub_R8421 · Active · $5/yr" />

      <div style={{
        background: 'var(--sky-bg)', border: '1px solid var(--sky)',
        borderRadius: 10, padding: 16, marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Icon name="star" size={20} color="var(--sky)" />
        <div style={{ flex: 1, fontSize: 13, color: 'var(--fg)' }}>
          Discounts apply at the next renewal unless you check <i>"effective immediately"</i>. Both the user and Stripe are notified. Logged in audit.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="DISCOUNT TYPE">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                ['Percent off',  'percent', true,  '% of plan'],
                ['Flat amount',  'tag',     false, '$ off price'],
                ['Free months',  'plus',    false, 'comp period'],
                ['Lifetime',     'shield',  false, 'free forever'],
              ].map(([t, ic, active, sub]) => (
                <div key={t} style={{
                  padding: 14, borderRadius: 8,
                  background: active ? 'var(--sky-bg)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--sky)' : 'var(--border)'}`,
                }}>
                  <Icon name={ic === 'percent' ? 'star' : ic} size={16} color={active ? 'var(--sky)' : 'var(--fg-2)'} />
                  <div style={{ fontWeight: 600, marginTop: 8, fontSize: 13, color: active ? 'var(--sky)' : 'var(--fg)' }}>{t}</div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="AMOUNT & DURATION">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div className="sd-label">Discount</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <input className="sd-input sd-mono" defaultValue="50" style={{ fontSize: 32, height: 64, padding: '0 16px', fontWeight: 500, letterSpacing: '-0.01em' }} />
                  <span className="sd-mono" style={{ fontSize: 24, color: 'var(--fg-3)' }}>%</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {['10%', '25%', '50%', '75%', '100%'].map(v => (
                    <Chip key={v} active={v === '50%'}>{v}</Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="sd-label">Duration</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Chip>1 cycle</Chip>
                  <Chip active>1 year</Chip>
                  <Chip>2 years</Chip>
                  <Chip>Forever</Chip>
                </div>
                <div style={{ marginTop: 14 }}>
                  <Input label="Or apply existing coupon" value="ELOY2026" icon="tag" />
                </div>
              </div>
            </div>

            <div className="sd-divider" />

            <div style={{
              padding: 14, background: 'var(--bg)', borderRadius: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>RENEWAL PRICE WITH DISCOUNT</div>
                <div className="sd-mono" style={{ fontSize: 28, fontWeight: 500, marginTop: 4, color: 'var(--ok)' }}>$2.50<span style={{ fontSize: 13, color: 'var(--fg-3)' }}> / year</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>WAS</div>
                <div className="sd-mono" style={{ fontSize: 18, color: 'var(--fg-2)', textDecoration: 'line-through', marginTop: 4 }}>$5.00</div>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="WHEN & WHY">
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <Chip active>Next renewal</Chip>
              <Chip>Immediately (prorate)</Chip>
            </div>
            <div className="sd-label">Reason · required</div>
            <textarea className="sd-input" style={{ minHeight: 90, fontSize: 13, resize: 'none', paddingTop: 12 }}
              defaultValue="Top-1% user (847 jumps) · multi-year subscriber · brand advocate. Approved via support email thread #T-1283." />
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1 }}>
                <Icon name="check" size={12} color="#001426" stroke={3} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
                Send the user an email explaining the discount.
              </div>
            </div>
          </AdminCard>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Cancel</Button>
            <Button style={{ width: 'auto', padding: '0 18px', height: 38 }}>Apply 50% discount</Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="USER · QUICK CONTEXT">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <Avatar initials="EM" size={40} />
              <div>
                <div style={{ fontWeight: 500 }}>Erin Morrison</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>APF 14829 · #18472</div>
              </div>
            </div>
            {[
              ['Member since', '14 Mar 2025'],
              ['Total paid', '$10.00'],
              ['LTV (projected)', '$48.00'],
              ['Tickets', '2 (both resolved)'],
              ['NPS', '9 / 10'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--fg-2)' }}>{k}</span>
                <span className="sd-mono" style={{ color: 'var(--fg)' }}>{v}</span>
              </div>
            ))}
          </AdminCard>

          <AdminCard title="PRIOR DISCOUNTS ON THIS USER">
            <div style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>None</div>
              <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3 }}>This is the first discount applied to this account.</div>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminPricing, AdminDiscounts, AdminApplyDiscount });
