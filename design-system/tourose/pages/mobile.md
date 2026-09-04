# TouRose — Mobile overrides

These rules apply only below desktop breakpoints. Desktop / web layout must stay unchanged.

## Breakpoints

- Tablet / phone landscape: `max-width: 900px` (header + categories)
- Phone: `max-width: 720px` (pages, listings, search, map)
- Small phone: `max-width: 480px`

## UX rules (from ui-ux-pro-max)

- Touch targets ≥ 44px (menu, chips, CTAs, drawer links)
- No horizontal page scroll (`overflow-x: hidden` on body)
- Sticky header respects `safe-area-inset-top`
- Category strip: horizontal scroll + snap, not wrapping crush
- Search input `font-size: 16px` to avoid iOS zoom
- Map event rail: edge-to-edge scroll with padding
- Primary CTAs full-width on phone
- Drawer: bottom sheet style on small screens

## Brand (unchanged)

- Accent `#E8527A`
- Plus Jakarta Sans
- No purple, no emoji icons, light mode only
