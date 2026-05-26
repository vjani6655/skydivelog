# SkydiveLog · Component guide

Every component used across mobile, web, and admin. Variants and states are
exactly what appears in the designs — no speculative props.

---

## Button

```
<Button variant="primary" size="md" icon="signature">Sign jump</Button>
```

| Prop | Values |
|---|---|
| `variant` | `primary` · `ghost` · `sub` · `danger` |
| `size` | `sm` (h 30–34) · `md` (h 38) · `lg` (h 52, default for hero CTA) |
| `icon` | optional leading icon name |
| `iconPosition` | `leading` (default) · `trailing` |
| `fullWidth` | boolean (mobile defaults to true) |

**States:** `default` · `hover` · `pressed` · `focused` (1.5px sky ring) · `disabled` (50% opacity) · `loading` (spinner replaces icon).

**Colour:**
- `primary` — `bg=sky`, `text=on-sky (#001426)`
- `ghost` — `bg=transparent`, `border=border-strong`, `text=fg`
- `sub` — `bg=surface`, `border=border`, `text=fg`
- `danger` — `bg=danger`, `text=on-sky`

---

## Input

```
<Input label="Email" placeholder="you@example.com" icon="mail" value={...} />
```

| Prop | Values |
|---|---|
| `label` | optional mono uppercase label above the field |
| `placeholder` | string |
| `icon` | optional leading icon |
| `type` | `text` · `email` · `password` · `number` |
| `helper` | optional helper / error text below |
| `state` | `default` · `focused` · `error` · `disabled` |

**States:**
- `default` — `bg=surface`, `border=border`
- `focused` — `border=sky`
- `error` — `border=danger`, helper text in `danger`
- `disabled` — 50% opacity, no caret

**Notes:** height 52 (with padding for icon), border radius `md` (10). Mono labels are 11px, uppercase, `letterSpacing 0.06em`, colour `fg-2`.

---

## Field (read-only)

Display of a captured value with mono uppercase label and a value below. Used in jump detail, gear detail, admin user detail.

| Prop | Values |
|---|---|
| `label` | required |
| `value` | required (string / node) |
| `mono` | boolean — use mono numerals for value |
| `sub` | optional small line below value |
| `action` | optional trailing button / link |

Layout: 14px top/bottom padding, 1px bottom border, label 11px mono, value 15px ui.

---

## Card

```
<Card>...</Card>
```

| Prop | Values |
|---|---|
| `variant` | `default` · `elevated` (adds `shadow-card`) · `promo` (bg gradient + sky border) · `success` · `warning` · `danger` |
| `padding` | number (default 16) · `none` for tables |
| `interactive` | boolean — adds hover state, cursor pointer |

**Variants:**
- `default` — `bg=surface`, `border=1px border`, `radius=md`
- `promo` — `bg=card-promo gradient`, `border=sky`, `shadow=glow`
- `success` — `bg=ok-bg`, `border=ok`
- `warning` — `bg=warn-bg`, `border=warn`
- `danger` — `bg=danger-bg`, `border=danger`

---

## Badge

Small mono uppercase indicator.

```
<Badge kind="ok" icon="check">SIGNED</Badge>
```

| Prop | Values |
|---|---|
| `kind` | `sky` · `ok` · `warn` · `danger` · `muted` |
| `icon` | optional leading 11px icon |
| `size` | `sm` (h 18) · `md` (h 22, default) |

Each kind uses its `*-bg` background and full-colour text. `muted` = surface-2 bg, fg-2 text. Border radius 5, padding 2/8, font 11px mono.

---

## Tag (pill)

Coloured tag chip used on jumps. Distinct from system Badge — Tag carries a colour the user chose for the tag itself.

```
<Tag color="#34D2D6">video</Tag>
```

| Prop | Values |
|---|---|
| `color` | hex / colour token — the tag's own colour |
| `removable` | boolean — adds × trailing icon (used in announcement filters) |
| `size` | `sm` · `md` |

Render: rounded 999, padding 4/10, 5×5 coloured dot leading, 12px label, background `color @ 10% opacity`, border `color @ 20%`.

---

## Chip

Filter / pill that toggles active state. Used in filter sheets, segmented controls, jump-type pickers.

```
<Chip active leading={<Icon name="star" />}>Favourites</Chip>
```

| Prop | Values |
|---|---|
| `active` | boolean — when true, `bg=sky-bg`, `border=sky`, `text=sky` |
| `leading` / `trailing` | optional nodes |
| `onPress` | handler |

**Inactive:** `bg=surface`, `border=border`, `text=fg-2`. Height 30, radius 999, font 13.

---

## Avatar

| Prop | Values |
|---|---|
| `initials` | 1–2 chars (used when no image) |
| `image` | optional source |
| `size` | 26 · 32 · 40 · 64 · 88 (the sizes that actually appear) |
| `color` | accent colour for the initials gradient — default sky, also seen with cyan for admin avatars |

Gradient: `linear-gradient(135deg, color, sky-dim)`, text colour `on-sky`, weight 600, font size `≈ size × 0.4`. 1px white-10% border.

---

## Toggle

```
<Toggle on={value} onChange={setValue} />
```

Track 44×26 radius 14. On = `sky`, off = `surface-3`. Knob 22 white. Transition 150ms.

---

## TabBar (bottom — mobile)

```
<TabBar active="log" tabs={[
  { id: 'log', label: 'Log', icon: 'log' },
  ...
]}/>
```

Fixed height 78 (18 home-indicator padding included), `border-top=1px border`, `bg=bg`. Each tab: column, 22px icon + 11px label. Active = `sky`, inactive = `fg-3`. Icon stroke 2 when active, 1.8 when inactive.

---

## TopBar

| Prop | Values |
|---|---|
| `title` | required |
| `sub` | optional mono uppercase subtitle |
| `large` | boolean (default true) — toggles 28px large title vs 19px small title |
| `leading` | optional node (typically back button) |
| `trailing` | optional node array of icon buttons |

Padding 8/20/16/20. Large title uses h2 style (28/700/-0.03em).

---

## IconButton

36×36 square, radius 10, `bg=surface`, `border=1px border`, icon 18, colour `fg`. Hover → `bg=surface-2`. Supports an optional 7×7 sky dot badge in the top-right corner.

---

## BottomSheet

Slide-up panel from the bottom edge. Used for Filter & sort.

| Prop | Values |
|---|---|
| `open` | boolean |
| `title` | optional |
| `onDismiss` | handler |
| `snapPoint` | `auto` · `0.5` · `0.76` (max — used by Filter sheet) · `1` |

Render: `bg=bg`, `border-radius=20 20 0 0`, `shadow=sheet`, 36×4 grab handle, 28px padding. The page behind dims to `#06090F @ 95%`.

---

## SearchBar

Inline 40-high pill, `bg=surface`, `border=1px border`, radius 10, 16px search icon leading, placeholder colour `fg-3`. No separate "active" state — focusing applies the same focused border (`border=sky`) as Input.

---

## Progress

Linear bar — height 6 (or 4 in tables), radius 6. Filled portion uses passed colour, track is `surface-2`. Always rounded ends. Used for currency, gear repack countdown, password strength.

---

## Placeholder (image stand-in)

Striped 135° pattern between `surface` and `surface-2`. Used until real images are wired in. Props: `label` (mono uppercase caption centred), `height` (number), `width` (defaults 100%).

---

## CurrencyRing

Circular progress, default size 80, stroke 4, track `surface-2`, filled colour passed in (typically `ok`). Centre shows mono number + small mono caption.

---

## Stat / KPI

Two flavours:

- **`<StatBig>`** — mono numerals 36px, mono uppercase label above, optional unit suffix, optional sub line below. Mobile.
- **`<WebStat>` / `<KPI>`** — boxed card variant for web + admin. Web is roomier (28px padding, 30/42 number), admin is denser (16px padding, 26 number) and gains a left accent bar (`borderLeft: 2px solid <accent>`) and an optional trend chip.

---

## Table (admin / web logbook)

Fixed-grid header + rows. Per-column config: `key`, `label`, `width`, optional `render(value, row)`.

- Header: `borderBottom=1px border`, `bg=surface`, font 10px mono uppercase, colour `fg-3`, padding 10/16.
- Rows: dense `8/16` or roomy `12/16` padding, `borderBottom=1px border` between rows.
- Status cells render `<Badge>`.

---

## Layout shells

- **`<Screen>`** (mobile) — 390×844, status bar + content + optional `<TabBar>` + home indicator.
- **`<WebPage>`** (web marketing) — 1280 wide, sticky `<WebNav>` + content + `<WebFooter>`.
- **`<AuthShell>`** (web auth) — 1280×900, centred card with auth-glow background gradient.
- **`<AccountShell>`** (logged-in web) — 240 sidebar + main, sidebar shows the user pill + nav.
- **`<AdminShell>`** (admin) — 240 sidebar (darker `#080C16`), 52-high topbar, "PROD" environment indicator.

---

## Icons

Single-stroke 24×24 grid, default stroke 1.8 (2.5 when emphasised). Names used in the designs:

`log · chart · parachute · cert · user · search · filter · plus · back · close · check · chevron · down · up · star · star-fill · edit · trash · plane · map · tag · qr · signature · gear · bell · export · eye · clock · calendar · arrow-up-right · dz · altitude · shield · menu · dots · lock · mail · card · pie · bar · wifi-off · share · pdf`

---

## Tag colour palette (Tag pill `color` token)

Suggested seed values when creating tags:

`#4A9EFF` sky · `#34D2D6` cyan · `#FFB74A` warn · `#4ADE80` ok · `#FF6B6B` danger · `#A78BFA` violet · `#F472B6` pink.

Users can pick any hex; these match the existing palette.
