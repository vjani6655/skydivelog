// Admin · Support + Settings

// ─── 11 Support Tickets ────────────────────────────────────────────────
function AdminTickets() {
  const tickets = [
    ['#T-1284', '#18465', 'Diego Ortiz',    "Card declined — can't renew",  'open',      'billing',  '2h ago',   'high'],
    ['#T-1283', '#18472', 'Erin Morrison',  'Export PDF formatting bug',    'open',      'bug',      '4h ago',   'mid'],
    ['#T-1282', '#18112', 'Sam Park',       'Lost access after device wipe','waiting',   'support',  '8h ago',   'mid'],
    ['#T-1281', '#18421', 'Liam Briggs',    'Flag dispute · F-2282',        'open',      'flag',     '11h ago',  'mid'],
    ['#T-1280', '#18398', 'Hana Walker',    'Wingsuit alt cap suggestion',  'open',      'feature',  '14h ago',  'low'],
    ['#T-1279', '#17988', 'Olive Kapoor',   'How to merge two accounts?',   'open',      'support',  '1d ago',   'low'],
    ['#T-1278', '#18472', 'Erin Morrison',  'PDF export · all good now',    'closed',    'bug',      '2d ago',   'low'],
    ['#T-1277', '#17841', 'Ben Robertson',  'Annual receipt for tax',       'closed',    'billing',  '2d ago',   'low'],
    ['#T-1276', '#17602', 'Maya Singh',     'Subscription extension please','closed',    'billing',  '3d ago',   'mid'],
  ];

  return (
    <AdminShell active="tickets">
      <AdminPageHeader title="Support tickets" sub="Inbox · 8 open" actions={
        <button style={{
          padding: '7px 12px', background: 'var(--sky)', color: '#001426',
          border: 'none', borderRadius: 6,
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
        }}>+ New ticket</button>
      } />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <Chip active>All open <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>8</span></Chip>
        <Chip>Waiting <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>3</span></Chip>
        <Chip>Mine <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>2</span></Chip>
        <Chip>Closed <span className="sd-mono" style={{ marginLeft: 6, color: 'var(--fg-3)' }}>148</span></Chip>
        <div style={{ flex: 1 }} />
        <div style={{
          padding: '6px 10px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--fg-2)',
        }}>
          <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>SORT</span>
          Newest <Icon name="down" size={11} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 4fr', gap: 14 }}>
        {/* List */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {tickets.map((t, i) => {
            const [id, uid, name, subj, status, cat, when, sev] = t;
            const active = i === 1;
            return (
              <div key={id} style={{
                padding: '14px 16px',
                borderBottom: i < tickets.length-1 ? '1px solid var(--border)' : 'none',
                background: active ? 'var(--sky-bg)' : 'transparent',
                borderLeft: active ? '2px solid var(--sky)' : '2px solid transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{id}</span>
                    <Badge kind={status === 'open' ? 'sky' : status === 'waiting' ? 'warn' : 'muted'}>{status.toUpperCase()}</Badge>
                    <Badge kind="muted">{cat.toUpperCase()}</Badge>
                  </div>
                  <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{when}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{subj}</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{name} · {uid}</div>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>#T-1283</span>
                  <Badge kind="sky">OPEN</Badge>
                  <Badge kind="warn">BUG</Badge>
                  <Badge kind="muted">MID</Badge>
                </div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>Export PDF formatting bug</div>
                <div className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>FROM ERIN MORRISON · USER #18472 · 4 HOURS AGO</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, fontFamily: 'inherit', fontSize: 11, color: 'var(--fg-2)',
                }}>Assign</button>
                <button style={{
                  padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, fontFamily: 'inherit', fontSize: 11, color: 'var(--fg-2)',
                }}>Close</button>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div style={{ padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar initials="EM" size={32} />
              <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Erin Morrison</span>
                  <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>4H AGO</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                  Hey — exporting my logbook as a PDF for APF currency review, but jumps 700-800 are missing the canopy time column. CSV is fine. iPhone 15, app v2.4.1, iOS 17.4.
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <div style={{
                    padding: '6px 10px', background: 'var(--bg)',
                    borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: 'var(--fg-2)', display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Icon name="pdf" size={12} /> logbook_export.pdf · 412 KB
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar initials="DK" size={32} color="var(--cyan)" />
              <div style={{ flex: 1, background: 'rgba(74,158,255,0.08)', borderRadius: 10, padding: 14, border: '1px solid rgba(74,158,255,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Dani Kelleher · Support</span>
                  <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>3H AGO</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                  Thanks Erin — confirmed the bug, it's a clipping issue on the 100-row page in APF layout. Hotfix going out tonight (v2.4.2). I'll re-export your logbook and email it within the hour.
                </div>
              </div>
            </div>
          </div>

          {/* Reply */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
            <textarea className="sd-input" style={{ minHeight: 70, fontSize: 13, resize: 'none', paddingTop: 10 }} placeholder="Reply to Erin…" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Chip>Saved replies</Chip>
                <Chip>Snippets</Chip>
              </div>
              <Button style={{ width: 'auto', padding: '0 18px', height: 34 }} icon="mail">Send reply</Button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── 12 Announcements ──────────────────────────────────────────────────
function AdminAnnouncements() {
  return (
    <AdminShell active="announce">
      <AdminPageHeader title="Announcements" sub="Compose · push & in-app" actions={
        <Badge kind="warn">SENDS TO 34,118 USERS</Badge>
      } />

      <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="MESSAGE">
            <div className="sd-label">Channel</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, marginBottom: 16 }}>
              <Chip active leading={<Icon name="bell" size={12} />}>Push</Chip>
              <Chip active>In-app banner</Chip>
              <Chip>Email</Chip>
            </div>

            <Input label="Title" value="v2.5 just landed — wingsuit FAI badge" />

            <div style={{ marginTop: 14 }}>
              <div className="sd-label">Body</div>
              <textarea className="sd-input" style={{ minHeight: 110, resize: 'none', paddingTop: 12, fontSize: 13 }}
                defaultValue="If you've got a wingsuit licence on file, you can now log FAI-format records and submit straight from the app. Update SkydiveLog to 2.5 and check the wingsuit tab." />
            </div>

            <div className="sd-label" style={{ marginTop: 14 }}>Deep link · optional</div>
            <Input value="skydivelog://feature/wingsuit-fai" icon="arrow-up-right" />

            <div className="sd-label" style={{ marginTop: 14 }}>Schedule</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Chip active>Send now</Chip>
              <Chip>Schedule</Chip>
              <Chip>Draft</Chip>
            </div>
          </AdminCard>

          <AdminCard title="SEGMENT · WHO RECEIVES THIS">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--sky-bg)', border: '1px solid var(--sky)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--sky)' }}>Wingsuit jumpers</div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 4 }}>HAS WS LICENCE · ACTIVE · 14D</div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>+ New segment</div>
              </div>
            </div>

            <div className="sd-divider" />
            <div className="sd-label">Filters applied</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <Chip active trailing={<Icon name="close" size={11} />}>Has WS rating</Chip>
              <Chip active trailing={<Icon name="close" size={11} />}>Active subscription</Chip>
              <Chip active trailing={<Icon name="close" size={11} />}>Logged in last 14d</Chip>
              <Chip>+ Add filter</Chip>
            </div>

            <div style={{
              marginTop: 16, padding: 14, background: 'var(--bg)',
              borderRadius: 8, display: 'flex', justifyContent: 'space-between',
            }}>
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>RECIPIENTS</div>
                <div className="sd-mono" style={{ fontSize: 24, fontWeight: 500, marginTop: 4 }}>2,184</div>
              </div>
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>EST. DELIVERY</div>
                <div className="sd-mono" style={{ fontSize: 14, marginTop: 4, color: 'var(--fg-2)' }}>~ 40 sec</div>
              </div>
              <div>
                <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.08em' }}>COST</div>
                <div className="sd-mono" style={{ fontSize: 14, marginTop: 4, color: 'var(--fg-2)' }}>$0.18</div>
              </div>
            </div>
          </AdminCard>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Save draft</Button>
            <Button variant="sub" style={{ width: 'auto', padding: '0 18px', height: 38 }}>Send test to me</Button>
            <Button style={{ width: 'auto', padding: '0 18px', height: 38 }} icon="bell">Send to 2,184</Button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard title="PREVIEW · iOS PUSH">
            <div style={{
              background: 'linear-gradient(180deg, #1a2a4a 0%, #0a1220 100%)',
              borderRadius: 14, padding: 18, position: 'relative',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.95)', color: '#000',
                borderRadius: 14, padding: '12px 14px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                fontFamily: '-apple-system, system-ui',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: 'linear-gradient(135deg, #0A1220, #1A2740)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 32 32" fill="none">
                      <path d="M4 12a12 12 0 0124 0" stroke="#4A9EFF" strokeWidth="3" strokeLinecap="round"/>
                      <path d="M4 12l12 7 12-7" stroke="#4A9EFF" strokeWidth="3" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6 }}>SKYDIVELOG · now</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>v2.5 just landed — wingsuit FAI badge</div>
                <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
                  If you've got a wingsuit licence on file, you can now log FAI-format records…
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="RECENT SENDS">
            {[
              ['Reserve repack reminder rollout', '12 May', 4218, 'all'],
              ['Trial reminder · day 25', '08 May', 312, 'trial'],
              ['v2.4.2 hotfix', '02 May', 34118, 'all'],
              ['Eloy boogie discount', '14 Apr', 9421, 'us'],
            ].map(([t, d, c, seg]) => (
              <div key={d + t} style={{ padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{d.toUpperCase()} · {seg.toUpperCase()}</span>
                  <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{c.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}

// ─── 13 Admin Settings (admin accounts, roles, audit log) ──────────────
function AdminSettings() {
  const admins = [
    ['DK', 'Dani Kelleher',  'dani@skydivelog.app',  'Super-admin', 'You · today',     true],
    ['AB', 'Alex Booker',    'alex@skydivelog.app',  'Admin',       'today · 09:14',   true],
    ['MR', 'Mira Reyes',     'mira@skydivelog.app',  'Support',     'today · 08:42',   true],
    ['JS', 'Jordan Singh',   'jordan@skydivelog.app','Finance',     'yesterday · 16:08', true],
    ['CL', 'Claude (bot)',   'agent@skydivelog.app', 'Read-only',   '24 May · 11:00',  true],
    ['PT', 'Pat Tan',        'pat@skydivelog.app',   'Admin',       '21 Apr (last)',   false],
  ];
  const audit = [
    ['Sub override applied',     'sub_R8418 · +14d trial',     'DK', '24 May · 11:42'],
    ['Flagged entry resolved',   'F-2284 · upheld',            'AB', '24 May · 11:18'],
    ['User locked',              '#18465 · payment dispute',   'JS', '24 May · 10:56'],
    ['Announcement sent',        '2,184 wingsuit jumpers',     'DK', '24 May · 09:30'],
    ['Data export queued',       'jumps_2025.csv.gz · 1.4M',   'DK', '23 May · 17:11'],
    ['Admin invited',            'mira@skydivelog.app · Support', 'DK', '21 May · 14:22'],
    ['Password reset · admin',   'pat@skydivelog.app',         'system', '21 Apr · 19:08'],
    ['Sub revoked',              'sub_R8141 · refund issued',  'JS', '20 Apr · 11:00'],
  ];

  return (
    <AdminShell active="settings">
      <AdminPageHeader title="Admin settings" sub="Accounts · roles · audit" />

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 28 }}>
        <aside>
          {['Admin accounts', 'Roles & permissions', 'Audit log', 'API tokens', 'Webhooks', 'Branding', 'Security'].map((s, i) => (
            <div key={s} style={{
              padding: '8px 12px', fontSize: 13, borderRadius: 6,
              background: i === 0 ? 'var(--sky-bg)' : 'transparent',
              color: i === 0 ? 'var(--sky)' : 'var(--fg-2)',
              fontWeight: i === 0 ? 500 : 400, marginBottom: 2,
            }}>{s}</div>
          ))}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AdminCard
            title="ADMIN ACCOUNTS · 6"
            action={<Button style={{ width: 'auto', height: 30, padding: '0 12px', fontSize: 12 }} icon="plus">Invite admin</Button>}
            padding={0}
          >
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1.6fr 2fr 1fr 1fr 80px',
              padding: '12px 18px', borderBottom: '1px solid var(--border)',
              fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-3)',
              letterSpacing: '0.1em', textTransform: 'uppercase', gap: 14,
            }}>
              <span></span><span>Name</span><span>Email</span><span>Role</span><span>Last sign-in</span><span></span>
            </div>
            {admins.map((a, i) => (
              <div key={a[2]} style={{
                display: 'grid', gridTemplateColumns: '40px 1.6fr 2fr 1fr 1fr 80px',
                padding: '12px 18px',
                borderBottom: i < admins.length-1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center', gap: 14, fontSize: 13,
                opacity: a[5] ? 1 : 0.5,
              }}>
                <Avatar initials={a[0]} size={26} color={i === 0 ? 'var(--sky)' : i === 4 ? 'var(--cyan)' : 'var(--sky)'} />
                <span style={{ fontWeight: 500 }}>{a[1]}</span>
                <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{a[2]}</span>
                <Badge kind={a[3] === 'Super-admin' ? 'sky' : a[3] === 'Read-only' ? 'muted' : 'ok'}>{a[3].toUpperCase()}</Badge>
                <span className="sd-mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{a[4]}</span>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Icon name="dots" size={14} color="var(--fg-3)" />
                </div>
              </div>
            ))}
          </AdminCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <AdminCard title="ROLES · 5">
              {[
                ['Super-admin', 'Full access · billing · admin mgmt', 1, 'var(--sky)'],
                ['Admin',       'Full access · no billing config',     2, 'var(--ok)'],
                ['Finance',     'Revenue, subs, billing',              1, 'var(--cyan)'],
                ['Support',     'Users, tickets, announcements',       1, 'var(--warn)'],
                ['Read-only',   'Dashboards & exports only',           1, 'var(--fg-3)'],
              ].map(([n, d, c, col]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: col }} /> {n}
                    </div>
                    <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3 }}>{d}</div>
                  </div>
                  <span className="sd-mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>{c}</span>
                </div>
              ))}
            </AdminCard>

            <AdminCard title="AUDIT LOG · LAST 8" action={<span style={{ color: 'var(--sky)', fontSize: 11, fontWeight: 500 }}>View all →</span>}>
              {audit.map(([action, detail, who, when], i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < audit.length-1 ? '1px dashed var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{action}</span>
                    <span className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{who}</span>
                  </div>
                  <div className="sd-mono" style={{ fontSize: 10, color: 'var(--fg-3)' }}>{detail} · {when}</div>
                </div>
              ))}
            </AdminCard>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

Object.assign(window, { AdminTickets, AdminAnnouncements, AdminSettings });
