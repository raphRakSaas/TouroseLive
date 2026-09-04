# TouRose Design System

Airbnb-inspired local discovery for Toulouse open data.
Light mode only. Photo-first cards. TouRose rose accent.

## Colors

| Token | Hex | Role |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | Page background |
| `--bg-soft` | `#F7F7F7` | Soft sections |
| `--ink` | `#222222` | Primary text |
| `--muted` | `#717171` | Secondary text |
| `--line` | `#EBEBEB` | Borders / dividers |
| `--accent` | `#E8527A` | TouRose rose (CTA, brand mark) |
| `--accent-ink` | `#9B2C4A` | Accent on soft surfaces |
| `--ok` | `#008A05` | Available / healthy |
| `--warn` | `#C13515` | Attention |
| `--card` | `#FFFFFF` | Card surface |

## Typography

- Body / UI: **Plus Jakarta Sans** (400–700)
- Avoid Inter, Roboto, Arial, system stacks for display
- Headings: same family, weight 600–700, tight tracking
- Listing titles: 15–16px semibold; page titles: 26–32px

## Layout rules

- Photo-first listing cards (ratio ~3:2), 12px radius
- No emojis as icons
- No purple, no neon gradients, no glassmorphism clutter
- Cards for interactive listings only — not decorative boxes
- Home = explore grid; full map on dedicated `/carte` page
- Accent used sparingly (brand R, active nav, primary CTA)

## Motion

- Hover: 150–200ms ease, slight lift or image scale 1.03
- Respect `prefers-reduced-motion`

## Images

- Events: OpenAgenda CDN when available, else map tile
- Places: Wikipedia/Wikimedia thumb when found, else OSM tile, else kind stock photo
