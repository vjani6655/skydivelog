# SkydiveLog — Data Field Inventory

Extracted by walking every screen in the design files. Every field below
appears on at least one rendered screen. Nothing has been invented.

Conventions:
- **Type** = data type (text · number · date · datetime · boolean · enum · image · FK · derived)
- **Req?** = required or optional **at the API / persistence level**, not the form level (a notes field might be skippable on create but the column still exists as nullable)
- **Source screens** = which designs show this field
- Fields marked **derived** are shown in UI but should be computed from other tables, not stored.

---

## `jumps`

The central table. Combines the create wizard, jump detail variants, and the read-only views in admin / web.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `user_id` | FK → users | required | every jump belongs to one user |
| `jump_number` | number | required | Create step 1 · Jump #847 · shown everywhere |
| `date` | datetime | required | Create step 1 (date) + Jump detail A shows "Sat 24 May 2026 · 16:42" — store as datetime |
| `dropzone_id` | FK → dropzones | required | Create step 1 · Jump detail · Edit |
| `aircraft_type` | text (or FK → aircraft) | required | Create step 1 · "PAC 750XL" |
| `aircraft_rego` | text | required | Create step 1 · "VH-PXM" |
| `exit_altitude_ft` | number | required | Create step 2 · "14,000 ft" |
| `pull_altitude_ft` | number | optional | Jump detail A shows "Pull alt 3,500 ft" — not in create wizard, can be added in edit |
| `deploy_altitude_ft` | number | optional | Jump detail B (instrument) only · "Deploy 10,500 ft·Δ" |
| `freefall_seconds` | number | required | Create step 2 · "60" |
| `canopy_seconds` | number | required | Create step 2 · "4:32" — store seconds, format mm:ss |
| `descent_rate_kpm` | number | derived | Jump detail B · "12.4 k/m" — calculate, don't store |
| `jump_type` | enum | required | Create step 2 chips: Belly · Tracking · Wingsuit · Freefly · CRW · AFF · Tandem · Coach · Demo |
| `is_favourite` | boolean | optional | Create step 3 toggle · star icon in detail / list |
| `notes` | text (long) | optional | Create step 3 · Jump detail · Edit |
| `photo_url` | image | optional | Jump detail C (photo-led variant) shows "canopy photo · 1024×768" |
| `coordinates_lat` | number | optional | Jump detail B shows "34.2°S 150.6°E" — could be DZ-derived |
| `coordinates_lng` | number | optional | as above |
| `signature_status` | enum | derived | UI shows `signed` / `pending` / `flagged` — compute from `signatures` + `flagged_entries` |
| `created_at` | datetime | required | system |
| `updated_at` | datetime | required | system |
| `deleted_at` | datetime | optional | Edit screen has "Delete jump" — soft delete |

**Notable absences in designs:** no GPS track, no video link, no wind/weather, no exit order. Don't add these without confirmation.

---

## `signatures`

One row per signed jump. Self-sign or instructor-sign via QR.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `jump_id` | FK → jumps | required | every signature attaches to one jump |
| `signature_data` | image (SVG path) | required | drawn signature from Create-signature & Instructor-scan-sign screens |
| `signer_name` | text | required | "Signed by" / "Name" — Erin Morrison or Jake Rivera |
| `signer_licence_number` | text | required | "Licence #" — APF 14829 |
| `signer_licence_rating` | text | optional | "D-Licence" shown in Jump detail A signature card and Scan & sign |
| `signer_user_id` | FK → users | optional | populated if the instructor has a SkydiveLog account (QR-scan flow) |
| `signed_at` | datetime | required | every signed entry has a timestamp |

---

## `tags`

Per-user tag taxonomy. Each user manages their own ("Manage tags" screen is in the user's profile).

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `user_id` | FK → users | required | tags are scoped to a user |
| `name` | text | required | "sunset" · "video" · "beach" · "coach" · "8-way" · etc. |
| `color` | text (hex) | required | every tag chip has a coloured dot — see Manage tags / Browse by tag |
| `created_at` | datetime | required | system |

**Derived in UI, do not store:**
- jump count per tag (shown on Browse by tag screen) — compute `COUNT(*) FROM jump_tags WHERE tag_id = …`

---

## `jump_tags`

Junction table. No additional fields visible in the designs.

| Field | Type | Req? | Notes |
|---|---|---|---|
| `jump_id` | FK → jumps | required | composite PK with `tag_id` |
| `tag_id` | FK → tags | required | composite PK with `jump_id` |

---

## `gear`

Rigs, canopies, AADs. Both gear list and gear detail use the same row.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `user_id` | FK → users | required | every piece of gear belongs to a user |
| `type` | enum | required | Add-gear picker: `rig` · `canopy` · `aad` |
| `make_model` | text | required | "PD Sabre3 170" · "Vector 3 · V348" · "Cypres 2" — "Make & model" input |
| `serial_number` | text | required | "PD-A24-09913" |
| `manufactured_date` | date | optional | Gear detail · "Aug 2022" · Add-gear "Date of manufacture" |
| `wing_loading` | number | optional | Gear detail · "0.95" — canopies only |
| `jumps_on` | number | optional | Gear detail · "284" · Add-gear "Jumps on" |
| `hours` | number | optional | Gear detail · "18.4" |
| `last_repack_date` | date | optional | Add-gear shows "—" placeholder · canopies + reserves only |
| `repack_reminder_enabled` | boolean | optional | Add-gear toggle "Set repack reminder · Notify 14 days before due" |
| `status` | enum | derived | UI shows `In service` · `Service due` · `Repack overdue` — compute from dates + service log |
| `created_at` | datetime | required | system |

**Related — `gear_service_log` (not directly asked, but shown):**
Gear detail's "Service log" section lists prior repacks / inspections. Fields visible: `action` (Repack / Inspection), `performed_by` (e.g. "Rigger J. Faulkner"), `performed_at` date. Mentioning here because the gear table can't represent it on its own.

---

## `certificates`

Licences, ratings, medicals. One table, distinguished by `category`.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `user_id` | FK → users | required | |
| `category` | enum | required | Add-cert picker: `licence` · `rating` · `medical` |
| `title` | text | required | "B Licence" · "Tandem Master" · "Class 1 Medical" |
| `issuing_body` | text | required | "APF" · "UPT" · "CASA" · "St John" |
| `issued_date` | date | required | "Mar 2022" |
| `expires_date` | date | optional | Some certs never expire (Cert list shows "NO EXPIRY" badge); Add-cert allows "—" |
| `reference_number` | text | optional | Add-cert input is marked "optional" |
| `document_file_url` | image / PDF | optional | Add-cert "Attach document — PDF or image" |
| `created_at` | datetime | required | system |

**Derived in UI:**
- days-until-expiry, status badge (`OK` / warning / expired) — compute from `expires_date`

---

## `users`

Combines the consumer profile, web settings, and admin user-detail views. Several fields only appear in the admin surface — those are still required for the user record (auth, audit) even if the user never sees them.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | shown as "#18472" in admin |
| `email` | text | required | Sign up · Sign in · Profile · admin |
| `password_hash` | text | required | implied by Sign in / Create flows |
| `full_name` | text | required | Sign up · Edit profile · Profile · admin |
| `avatar_url` | image | optional | Edit profile has photo + "Change photo" |
| `licence_number` | text | optional | "APF 14829" — shown but not blocked on signup (Sign-up field exists but no required marker) |
| `licence_rating` | text | optional | "B" · placeholder "B" on Sign up |
| `date_of_birth` | date | optional | Edit profile · admin user detail "14 Apr 1994" |
| `phone` | text | optional | Account settings · admin shows "+61 412 098 224" |
| `home_dropzone_id` | FK → dropzones | optional | Edit profile · Account settings · admin shows "Skydive Picton, NSW" |
| `country` | text | optional | admin user detail shows "Australia (AU)" |
| `emergency_contact_name` | text | optional | Edit profile · Account settings — "Sara Morrison" |
| `emergency_contact_relationship` | text | optional | "Sister" |
| `emergency_contact_phone` | text | optional | "+61 412 098 224" |
| `two_factor_enabled` | boolean | optional | admin user detail shows "Enabled · TOTP" |
| `preferred_altitude_unit` | enum | required | Settings chip: `ft` / `m` |
| `date_format` | text | required | Settings shows "DD MMM YYYY" |
| `theme` | text | required | Settings shows "Dark" (light mode is alluded to as planned) |
| `offline_mode_enabled` | boolean | required | Settings toggle |
| `display_layout_jump_list` | enum | required | Settings picker: `Compact` / `Cards` / `Timeline` |
| `display_layout_jump_detail` | enum | required | Settings picker: `Standard` / `Cockpit` / `Photo-led` |
| `display_layout_stats_overview` | enum | required | Settings picker: `Cards` / `Cockpit` / `Photo story` |
| `created_at` | datetime | required | admin shows "Account created · 14 Mar 2025 · 09:42 AEDT" |
| `last_sign_in_at` | datetime | required | admin shows "24 May 2026 · 16:51 AEDT" |
| `last_sign_in_platform` | text | optional | admin appends "· iOS" |
| `last_ip` | text | optional | admin shows "203.45.18.72 (last seen)" |

**Derived in UI:**
- `jump_count` (shown on Profile as "847") — compute from `jumps`
- `account_age` (admin · "1y 71d") — compute from `created_at`
- `ltv` (admin · "$10") — compute from `subscription_invoices`

**Not in users — separate tables implied but not asked:**
- `subscriptions` (Stripe ID, status, renews_at, plan, price-at-signup) — shown in Profile / Web subscription / Admin sub detail
- `notification_preferences` (currency alerts, repack reminders, expiry warnings) — Notification Settings screen
- `payment_methods` (card brand · last4 · expiry) — Subscription management

---

## `announcements`

The compose-and-send-push screen in admin.

| Field | Type | Req? | Notes / source screens |
|---|---|---|---|
| `id` | uuid | required | system |
| `title` | text | required | "v2.5 just landed — wingsuit FAI badge" |
| `body` | text | required | the longer message text |
| `channels` | enum[] | required | multi-select chips: `push` · `in_app_banner` · `email` |
| `deep_link` | text | optional | label is "Deep link · optional" — e.g. `skydivelog://feature/wingsuit-fai` |
| `segment_id` | FK → segments | required | "Wingsuit jumpers" card · filters applied (has WS rating + active sub + recent activity) |
| `schedule_mode` | enum | required | chips: `now` · `schedule` · `draft` |
| `scheduled_at` | datetime | optional | populated when `schedule_mode = schedule` |
| `sent_at` | datetime | optional | populated once dispatched |
| `status` | enum | required | `draft` · `scheduled` · `sent` (right rail "Recent sends" shows sent ones) |
| `created_by_admin_id` | FK → admins | required | for the audit log |
| `created_at` | datetime | required | system |

**Derived in UI:**
- `recipient_count` (shown as "2,184") — query the segment at send time
- `estimated_cost` (shown as "$0.18") — from push provider's pricing

**Related but separate — `segments`:**
Segment is its own concept on the page (a saved set of filters). Fields visible: `name` ("Wingsuit jumpers"), `filters` (free-form list of predicates — "Has WS rating", "Active subscription", "Logged in last 14d"). Worth modelling so the same segment can be reused across announcements.

---

## Lookup / supporting tables hinted at by the designs

These aren't in your list but are unavoidable based on what's on screen — Claude Code will need them. Listed so nothing surprises later:

- **`dropzones`** — name ("Skydive Picton"), region ("NSW · AU"), latitude/longitude (Jump detail B's coords). Used by jumps, users (home DZ), platform stats top-DZ list.
- **`aircraft`** — type ("PAC 750XL"), category descriptor ("turbine · 14k") — Platform stats lists top aircraft with this metadata.
- **`subscriptions`** — Stripe ID, status (Active/Trial/Overdue/Cancelled), plan, price-at-signup, started_at, renews_at, payment_method_brand+last4+expiry. Source: Profile / Web subscription / Admin sub detail.
- **`app_settings`** — global price (`$5/yr` currently, editable in admin), trial length (30 days), grace window (7 days), accepted payment methods. From admin Plans & pricing screen.
- **`coupons`** — code, discount type (percent/flat/free), amount, duration, usage cap, used count, expires_at, status (Active/Paused/Expired), eligibility filters. From Admin Discounts screen.
- **`user_discounts`** — junction of users to coupons, plus manual comps: user_id, type (percent/flat/free_months/lifetime), amount, duration, applied_at, applied_by_admin_id, reason. From Apply discount screen.
- **`flagged_entries`** — flag ID (F-2284), jump_id, reason, detail, source (algorithm/manual), severity (high/mid/low), status (open/resolved/dismissed). From admin Flagged entries.
- **`audit_log`** — action, target, admin_id, reason, timestamp. Referenced on User detail, Sub override, Pricing, Admin settings.
- **`support_tickets`** — ID, user_id, subject, category (billing/bug/support/feature/flag), status (open/waiting/closed), severity, created_at, assigned_to_admin_id. Plus a `ticket_messages` child table for the thread.
- **`admins`** — name, email, role (super-admin/admin/finance/support/read-only), last_sign_in_at, active.

---

## What's deliberately NOT in the designs

Worth flagging so Claude Code doesn't invent:

- No "weight / harness size" on jumps (would need a USPA-style field) — not in the designs.
- No GPS track / dropzone-side telemetry — only Jump detail B shows derived coordinates.
- No "co-jumpers" / formation peers field — names appear in notes ("with Jake and Mira") but there's no structured field for them.
- No video links / external URLs on jumps.
- No "exit order" or "load number" — both real-world fields but not in this v1.

If any of those should exist, ask before adding.
