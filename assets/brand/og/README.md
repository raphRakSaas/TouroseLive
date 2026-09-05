# TouRose Open Graph

Image active : **Ville rose** (proposition 2).

| Fichier | Rôle |
| --- | --- |
| `assets/brand/og/tourose-og-ville-rose-1200x630-v2.jpg` | Source JPEG **baseline** (WhatsApp) |
| `web/public/brand/og-ville-rose-v2.jpg` | Servie en prod (`og:image`) |
| `web/public/brand/og-ville-rose.jpg` | Ancienne progressive (ne plus référencer) |
| `web/public/brand/og-ville-rose.png` | Fallback PNG |

Meta dans `web/src/index.html`. JPEG **baseline** (pas progressive), &lt; 300 ko, 1200×630.

WhatsApp cache agressivement et n’a pas de bouton « refresh » : après deploy, tester avec  
`https://tourose.netlify.app/?wa=2` (nouvelle URL = nouveau scrape).  
Facebook : [Sharing Debugger](https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Ftourose.netlify.app%2F) → **Scrape Again**.
