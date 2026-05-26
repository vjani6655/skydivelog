# JumpLogs · Brand pack

Final logo: **Open Canopy** — a 7-cell ram-air canopy silhouette with line-set converging on the jumper's body. Reads as a real canopy at large sizes; abstracts cleanly to <24 px.

## Files

```
brand/
├── svg/
│   ├── mark-on-dark.svg          ← canonical mark, sky on navy
│   ├── mark-on-light.svg         ← canonical mark, sky on paper
│   ├── mark-on-sky.svg           ← for use INSIDE sky-coloured surfaces
│   ├── mark-mono-light.svg       ← single-colour, light
│   ├── mark-mono-dark.svg        ← single-colour, dark
│   ├── mark-simple-on-dark.svg   ← simplified — use at <32 px
│   ├── mark-simple-on-light.svg
│   ├── wordmark-on-dark.svg      ← mark + "JumpLogs" lockup
│   ├── wordmark-on-light.svg
│   ├── app-icon-1024.svg         ← iOS / Android icon with bg gradient
│   ├── favicon.svg               ← currentColor — recolour via CSS
│   └── social-og.svg             ← 1200×630 OG / Twitter card
└── png/
    ├── mark-on-{dark,light}-{16,24,32,48,64,128,256,512,1024}.png
    ├── wordmark-on-{dark,light}-{256,512,1024}.png
    ├── app-icon-{180,192,512,1024}.png
    ├── social-og-1200x630.png
    └── favicon-{16,32}.png
```

## When to use what

| Surface | File |
|---|---|
| iOS app icon | `png/app-icon-1024.png` (Xcode generates the rest) |
| Android adaptive icon (foreground) | `png/app-icon-512.png` + `svg/app-icon-1024.svg` |
| Android adaptive icon (background) | linear gradient `#0A1220 → #1A2A4A` 135° |
| Web favicon | `svg/favicon.svg` (modern) + `png/favicon-32.png` (legacy) |
| Header logo (nav bars) | `svg/mark-on-dark.svg` at 22–28 px |
| Marketing hero | `svg/wordmark-on-dark.svg` |
| OG / social card | `png/social-og-1200x630.png` |
| Sky-coloured buttons / chips | `svg/mark-on-sky.svg` |
| Anywhere ≤ 24 px | `svg/mark-simple-on-dark.svg` (or the matching favicon PNGs) |

## Colour usage

- **Primary blue** `#4A9EFF` — canopy fill, line-set
- **Light fg** `#E8EEF8` — body silhouette + cell ribs on dark bgs
- **Navy fg** `#0A1220` — body silhouette on light bgs

Cell ribs are drawn at 35% opacity in the canonical mark, 50% in the mono variants.

## Clearspace

Reserve a margin equal to **the height of the jumper body** (12% of mark height) on all sides. Don't tuck other elements inside this margin.

## Don't

- Re-colour the canopy in non-brand colours.
- Tilt the mark — the plumb line is canonical.
- Apply drop shadows or strokes around the canopy outline.
- Use the simplified version above 32 px or the detailed version below 24 px (cell ribs become noise).
- Re-letter "JumpLogs" — always one word, capital S, capital L.

## CSS one-liner for the favicon

```html
<link rel="icon" type="image/svg+xml" href="/brand/svg/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/brand/png/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/brand/png/app-icon-180.png" />
```

The SVG favicon uses `currentColor`, so:

```css
:root      { color: #4A9EFF; }   /* default sky */
@media (prefers-color-scheme: light) { :root { color: #0A1220; } }
```
