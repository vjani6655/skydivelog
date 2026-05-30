import { AdminPageHeader, AdminCard, Badge } from '@/components/admin/ui'

type BadgeKind = 'ok' | 'sky' | 'warn' | 'danger' | 'muted'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <AdminCard title={title}>
    {children}
  </AdminCard>
)

const Row = ({ label, badge, badgeKind = 'muted', access, trigger, notes }: {
  label: string
  badge: string
  badgeKind?: BadgeKind
  access: string
  trigger: string
  notes?: string
}) => (
  <div className="grid grid-cols-[180px_1fr_1fr] gap-4 py-3 border-b border-border/50 last:border-0 items-start">
    <div className="flex items-center gap-2">
      <Badge kind={badgeKind}>{badge}</Badge>
    </div>
    <div>
      <div className="text-xs font-mono text-fg-3 uppercase tracking-widest mb-1">Access</div>
      <div className="text-sm text-fg">{access}</div>
    </div>
    <div>
      <div className="text-xs font-mono text-fg-3 uppercase tracking-widest mb-1">Set by / Trigger</div>
      <div className="text-sm text-fg">{trigger}</div>
      {notes && <div className="text-xs text-fg-3 mt-1">{notes}</div>}
    </div>
  </div>
)

const ColHeader = () => (
  <div className="grid grid-cols-[180px_1fr_1fr] gap-4 pb-2 border-b border-border mb-1">
    <div className="text-[10px] font-mono text-fg-4 tracking-widest uppercase">Status</div>
    <div className="text-[10px] font-mono text-fg-4 tracking-widest uppercase">User access</div>
    <div className="text-[10px] font-mono text-fg-4 tracking-widest uppercase">Set by / trigger</div>
  </div>
)

const Divider = ({ label }: { label: string }) => (
  <div className="text-[10px] font-mono text-fg-4 tracking-widest uppercase pt-4 pb-1 border-b border-border/40 mb-1">{label}</div>
)

export default function AdminReferencePage() {
  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Reference"
        sub="Status guide · how the system works"
      />

      <div className="space-y-6">

        {/* ── Subscription statuses ─────────────────────────── */}
        <Section title="Subscription statuses">
          <ColHeader />

          <Divider label="Active subscribers" />

          <Row
            label="active"
            badge="ACTIVE"
            badgeKind="ok"
            access="Full access to all features."
            trigger="Stripe: invoice.payment_succeeded"
            notes="Renewed automatically each billing cycle."
          />
          <Row
            label="overdue"
            badge="OVERDUE"
            badgeKind="warn"
            access="Access blocked. App shows payment-failed paywall."
            trigger="Stripe: invoice.payment_failed"
            notes="Stripe retries automatically (Smart Retries). Resolves to active on payment success or cancelled after all retries fail."
          />

          <Divider label="Cancelled" />

          <Row
            label="cancelled (in grace)"
            badge="CANCELLED"
            badgeKind="muted"
            access="Full access until renews_at date passes (grace period)."
            trigger="Stripe: customer.subscription.deleted"
            notes="renews_at is still in the future — user cancelled but period isn't over yet."
          />
          <Row
            label="cancelled (expired)"
            badge="CANCELLED"
            badgeKind="muted"
            access="Access blocked. App shows paywall."
            trigger="Same event, grace period has now elapsed."
            notes="renews_at is in the past."
          />

          <Divider label="Special" />

          <Row
            label="refunded"
            badge="REFUNDED"
            badgeKind="danger"
            access="Access blocked unless a newer active subscription exists."
            trigger="Admin manually marks refunded_at via Stripe dashboard → webhook or manual admin action."
            notes="Not a DB status enum value. Derived from refunded_at being set. Displayed as REFUNDED badge in subscription history."
          />
        </Section>

        {/* ── Trial statuses ────────────────────────────────── */}
        <Section title="Trial statuses (no subscription row)">
          <ColHeader />

          <Row
            label="free trial"
            badge="TRIAL"
            badgeKind="sky"
            access="Full access. No card required."
            trigger="Automatic — user signed up within the last 14 days and has no subscription."
            notes="Trial window = created_at + 14 days. Can be extended by admin (stored in user_metadata.trial_ends_at)."
          />
          <Row
            label="trial expired"
            badge="EXPIRED"
            badgeKind="warn"
            access="Access blocked. App shows paywall prompting subscription."
            trigger="Automatic — 14 days have passed since signup and no subscription was created."
          />
        </Section>

        {/* ── Multi-subscription logic ──────────────────────── */}
        <Section title="Multi-subscription / re-subscribe logic">
          <div className="space-y-3 text-sm text-fg-2 leading-relaxed">
            <p>
              A user can accumulate multiple subscription rows (e.g. cancelled → refunded → re-subscribed).
              The <strong className="text-fg">effective status</strong> is determined by the most recently
              started subscription row. When two rows share the same <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">started_at</code>,
              status priority wins: <Badge kind="ok">ACTIVE</Badge> &gt; <Badge kind="warn">OVERDUE</Badge> &gt; <Badge kind="muted">CANCELLED</Badge>.
            </p>
            <p>
              The <strong className="text-fg">Subscription history</strong> card on the user detail page always shows all rows
              sorted by <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">started_at DESC</code>,
              with the same tie-breaking logic. A row with <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">refunded_at</code> set
              always shows an orange <Badge kind="danger">REFUNDED</Badge> badge regardless of its DB status.
            </p>
            <p>
              The <strong className="text-fg">Users list</strong> filter tabs (Active / Overdue / Cancelled) and
              per-row status badge both use this same effective-status logic.
            </p>
          </div>
        </Section>

        {/* ── Stripe webhook events ─────────────────────────── */}
        <Section title="Stripe webhook → DB status mapping">
          <ColHeader />
          <Row
            label=""
            badge="invoice.payment_succeeded"
            badgeKind="ok"
            access="Sets status → active"
            trigger="web/app/api/webhooks/stripe/route.ts"
          />
          <Row
            label=""
            badge="invoice.payment_failed"
            badgeKind="warn"
            access="Sets status → overdue"
            trigger="web/app/api/webhooks/stripe/route.ts"
          />
          <Row
            label=""
            badge="subscription.deleted"
            badgeKind="muted"
            access="Sets status → cancelled"
            trigger="web/app/api/webhooks/stripe/route.ts"
          />
          <Row
            label=""
            badge="subscription.updated"
            badgeKind="sky"
            access="Mirrors Stripe status into DB"
            trigger="web/app/api/webhooks/stripe/route.ts"
          />
        </Section>

        {/* ── 2FA ───────────────────────────────────────────── */}
        <Section title="2FA (TOTP)">
          <div className="space-y-3 text-sm text-fg-2 leading-relaxed">
            <p>
              2FA status is read live from <strong className="text-fg">Supabase Auth factors</strong> (not from the users table).
              A user has 2FA enabled when they have a factor with <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">factor_type = totp</code> and{' '}
              <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">status = verified</code>.
            </p>
            <p>
              At login, after <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">signInWithPassword</code> succeeds,
              the app checks <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">mfa.getAuthenticatorAssuranceLevel()</code>.
              If <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">nextLevel === aal2</code> and it differs from currentLevel,
              the user is prompted for their 6-digit TOTP code before being granted a session. This applies to both mobile and web.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-surface-2 rounded-md p-3">
                <div className="text-[10px] font-mono text-fg-3 tracking-widest uppercase mb-2">AAL1 — Password only</div>
                <div className="text-xs text-fg">User has no verified TOTP factor, or has not yet completed MFA step. Normal session.</div>
              </div>
              <div className="bg-surface-2 rounded-md p-3">
                <div className="text-[10px] font-mono text-fg-3 tracking-widest uppercase mb-2">AAL2 — Password + TOTP</div>
                <div className="text-xs text-fg">User completed MFA challenge. Full session granted. Required when a verified TOTP factor exists.</div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── IP tracking ───────────────────────────────────── */}
        <Section title="IP tracking (Last seen)">
          <div className="text-sm text-fg-2 leading-relaxed space-y-2">
            <p>
              Written by <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">web/middleware.ts</code> on every
              authenticated non-API page load, using the <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">x-forwarded-for</code> or{' '}
              <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">x-real-ip</code> header. Stored in <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">users.last_ip</code>.
            </p>
            <p>
              Shows <code className="font-mono text-xs bg-surface-2 px-1 py-0.5 rounded">::1</code> when running locally (IPv6 loopback). Shows real IPs in production.
            </p>
          </div>
        </Section>

      </div>
    </div>
  )
}
