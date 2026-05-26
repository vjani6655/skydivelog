# SkydiveLog — Project Context

## Overview
SkydiveLog is a skydiving logbook app that lets jumpers record, track, and manage their jump history.

## Stack

### Web (`web/`)
- **Framework**: Next.js 14 (App Router)
- **Auth / Database**: Supabase (auth + PostgreSQL)
- **Payments**: Stripe
- **Auth helpers**: NextAuth

### Mobile (`mobile/`)
- **Framework**: React Native with Expo
- **Auth / Database**: Supabase (auth + PostgreSQL)

## Folder Structure
```
skydivelog/
├── mobile/                        # React Native / Expo mobile application
│   └── assets/
│       ├── fonts/                 # Loaded font files
│       ├── images/                # App icons (app-icon-{180,192,512,1024}.png)
│       ├── icons/                 # UI icon SVGs (empty — icons via @expo/vector-icons)
│       └── logo/                  # Brand SVGs + PNG sub-folder
│           ├── *.svg              # mark-on-dark, mark-on-light, wordmark-on-dark,
│           │                      # wordmark-on-light, mark-mono-dark, mark-mono-light,
│           │                      # mark-on-sky, mark-simple-on-dark, mark-simple-on-light,
│           │                      # app-icon-1024, favicon, social-og
│           └── png/               # Same marks + wordmarks as PNGs (16–1024px)
├── web/                           # Next.js 14 App Router web application
│   └── public/
│       ├── logo/                  # Brand SVGs (same set as mobile)
│       │   └── png/               # Logo PNGs
│       ├── icons/                 # Web icon SVGs (empty — icons via Lucide/Heroicons)
│       ├── app-icon-{180,192,512,1024}.png
│       ├── favicon-{16,32}.png
│       └── social-og-1200x630.png
├── design-exports/                # Read-only design reference — do not import in app code
│   ├── DATA-FIELDS.md             # Full field catalogue from design tool
│   ├── screens/                   # Mobile screen designs as JSX (log, onboarding, rest, stats)
│   ├── web/                       # Web page designs as JSX (auth, account, marketing)
│   ├── admin/                     # Admin panel designs (dashboard-users, pricing, revenue, support)
│   ├── lib/                       # Shared design-tool UI primitives (skydive-ui, web-ui, admin-ui)
│   ├── design-system/             # Design-system source: tokens.ts, typography.ts, tailwind.config.js, COMPONENT-GUIDE.md
│   └── canvases/                  # HTML design canvases (Mobile Designs, Website Designs, Admin Designs, Logo Explorations, Roadmap, Prototype)
├── supabase/                      # Supabase schema, migrations, edge functions
├── CONTEXT.md                     # This file
└── COMPONENT-GUIDE.md             # Root copy of component guide
```

### Asset quick-reference

| Asset type | Mobile path | Web path |
|---|---|---|
| Logo SVGs | `mobile/assets/logo/*.svg` | `web/public/logo/*.svg` |
| Logo PNGs (all sizes) | `mobile/assets/logo/png/*.png` | `web/public/logo/png/*.png` |
| App icon PNGs | `mobile/assets/images/app-icon-*.png` | `web/public/app-icon-*.png` |
| Favicon PNGs | — | `web/public/favicon-{16,32}.png` |
| Social OG image | `mobile/assets/logo/png/social-og-1200x630.png` | `web/public/social-og-1200x630.png` |
| Custom fonts | `mobile/assets/fonts/` | loaded via `next/font/google` |
| UI icons | via `@expo/vector-icons` (Ionicons) | via Lucide / Heroicons |

### Logo SVG variants
| File | Use |
|---|---|
| `mark-on-dark.svg` | Canopy mark on dark background |
| `mark-on-light.svg` | Canopy mark on light background |
| `mark-mono-dark.svg` | Monochrome mark for dark bg |
| `mark-mono-light.svg` | Monochrome mark for light bg |
| `mark-on-sky.svg` | Mark on sky-blue background |
| `mark-simple-on-dark/light.svg` | Simplified/outlined mark variants |
| `wordmark-on-dark.svg` | Full "SkydiveLog" wordmark on dark |
| `wordmark-on-light.svg` | Full "SkydiveLog" wordmark on light |
| `app-icon-1024.svg` | App store icon source |
| `favicon.svg` | Browser tab favicon |
| `social-og.svg` | Social share image source |

## Credentials & Environment Variables

All credentials and secrets are stored in environment files and **must never be hardcoded** in source code.

| File | Scope | Contains |
|------|-------|----------|
| `web/.env.local` | Web app (local dev) | Supabase URL/keys, Stripe keys, NextAuth secret, app URL |
| `mobile/.env` | Mobile app (local dev) | Supabase URL/anon key |

### Web environment variables (`web/.env.local`)
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (exposed to browser) |
| `SUPABASE_SECRET_KEY` | Supabase service-role key (server only) |
| `STRIPE_SECRET_KEY` | Stripe secret key (server only) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Stripe price ID for the subscription plan |
| `NEXTAUTH_SECRET` | Secret used to sign NextAuth tokens |
| `NEXT_PUBLIC_APP_URL` | Canonical URL of the web app |

### Mobile environment variables (`mobile/.env`)
| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Security Rules
- `.env`, `.env.local`, and `.env.*.local` are listed in `.gitignore` and must never be committed.
- Server-only variables (no `NEXT_PUBLIC_` / `EXPO_PUBLIC_` prefix) must not be imported in client-side code.
- Rotate any credential that is accidentally committed immediately.

---

## Design System

The design system is **fully in place** and must be used for every screen — no hardcoded colour, spacing, radius, shadow, or font values anywhere in the codebase.

### Files
| File | Purpose |
|------|---------|
| `COMPONENT-GUIDE.md` | Authoritative component spec — variants, props, states |
| `web/tailwind.config.ts` | Full Tailwind token set (colours, spacing, radii, type scale, shadows) |
| `mobile/constants/tokens.ts` | React Native mirror of the Tailwind tokens |
| `mobile/constants/typography.ts` | React Native type scale (Inter Tight + JetBrains Mono) |

### Base UI components

**Web** — `web/components/ui/`
`Button · Input · Field · Card · Badge · Tag · Chip · Avatar · Toggle · SearchBar · Progress · KPI`
Import via: `import { Button, Card } from '@/components/ui'`

**Mobile** — `mobile/components/ui/`
`Icon · Button · Input · Field · Card · Badge · Tag · Chip · Avatar · Toggle · IconButton · SearchBar · Progress · StatBig`
Import via: `import { Button, Card } from '@/components/ui'`

### Token usage rules
- **Web**: use Tailwind utility classes only (`bg-sky`, `text-fg`, `border-border`, etc.) — never inline styles for design-system values.
- **Mobile**: import from `@/constants/tokens` and `@/constants/typography` — never hardcode hex values, font sizes, or spacing numbers.
- `primary` button = `bg-sky text-on-sky` / `colors.sky` + `colors.onSky`
- Danger actions = `bg-danger text-on-sky` / `colors.danger`
- All cards = `bg-surface border-border rounded-md` / `colors.surface`

### Fonts
The type scale requires these fonts to be loaded:
- **Inter Tight** (weights 400, 500, 600, 700) — used for all UI text
- **JetBrains Mono** (weights 400, 500, 600) — used for labels, badges, numerals

Mobile: load via `expo-font` in `app/_layout.tsx`. Web: load via `next/font/google` in `app/layout.tsx`.

---

## Database Schema (`supabase/schema.sql`)

### Design Decisions

**User identity**
- `public.users` mirrors `auth.users` 1-to-1 (same `id`). A `AFTER INSERT ON auth.users` trigger auto-creates the row with email + full_name from metadata.
- There is no separate `profiles` table — all user fields (preferences, emergency contacts, display settings) live in `public.users`.

**Soft deletes**
- `jumps` has a `deleted_at` column. RLS `SELECT` policies filter `deleted_at IS NULL` so soft-deleted jumps are invisible to app queries but recoverable via the service-role key.

**Admins are a separate table**
- `public.admins` is independent of `auth.users`. Admin RLS policies check whether the authenticated user's email appears in `admins` with `active = true`. This means admin access is controlled in the DB, not just in application code.
- Service-role key (backend / Edge Functions) bypasses RLS entirely.

**Enums**
All categorical fields use PostgreSQL native `ENUM` types defined in the `public` schema. Current enums: `jump_type_enum`, `gear_type_enum`, `gear_service_action_enum`, `certificate_category_enum`, `altitude_unit_enum`, `jump_list_layout_enum`, `jump_detail_layout_enum`, `stats_layout_enum`, `subscription_status_enum`, `announcement_schedule_enum`, `announcement_status_enum`, `flagged_entry_source_enum`, `flagged_entry_severity_enum`, `flagged_entry_status_enum`, `support_ticket_category_enum`, `support_ticket_status_enum`, `admin_role_enum`.

**RLS summary**

| Table | User policy | Admin policy |
|-------|-------------|--------------|
| `users` | own row | read-all |
| `jumps` | own rows (soft-delete filtered) | read-all |
| `signatures` | via jump ownership | read-all |
| `tags` | own rows (all ops) | — |
| `jump_tags` | via jump ownership | — |
| `gear` | own rows | read-all |
| `gear_service_log` | via gear ownership | — |
| `certificates` | own rows | read-all |
| `subscriptions` | read own | read-all |
| `dropzones` | public read | — |
| `aircraft` | public read | — |
| `segments` | — | all ops |
| `announcements` | read sent+in_app_banner | all ops |
| `flagged_entries` | — | all ops |
| `audit_log` | — | all ops |
| `support_tickets` | read+insert own | all ops |
| `ticket_messages` | read+insert via ticket | all ops |
| `notification_preferences` | own row (all ops) | — |
| `app_settings` | — | all ops |
| `admins` | — (email self-check) | read |

**Auto-created rows**
- `public.users` row → created by `on_auth_user_created` trigger on `auth.users INSERT`
- `public.notification_preferences` row → created by `on_user_created_notifications` trigger on `public.users INSERT`
- `public.app_settings` → seeded with one row (price_per_year=5, trial=30d, grace=7d)

**`updated_at` automation**
- `jumps.updated_at` is auto-set via `jumps_set_updated_at` trigger (function `set_updated_at`).

### Tables at a glance
`users`, `dropzones`, `aircraft`, `jumps`, `signatures`, `tags`, `jump_tags`, `gear`, `gear_service_log`, `certificates`, `subscriptions`, `segments`, `announcements`, `flagged_entries`, `audit_log`, `support_tickets`, `ticket_messages`, `notification_preferences`, `app_settings`, `admins`
