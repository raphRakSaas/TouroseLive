# TouRose — architecture V1

Statut : **validé** le 2026-08-15. Pas de code de production ici.
Complète `docs/DATA_MODEL_V1.md`. Stack : D-03a + D-03b.

## Objectif technique

Deux boucles **indépendantes** qui partagent un cache serveur. Le navigateur ne parle **jamais** aux API publiques (Vélô, Tisséo, ATMO, Open-Meteo).

```
Sources open data ──poll──► NestJS ──► PostgreSQL (snapshots)
                                │
                    lecture JSON │
                                ▼
                         Angular (S1–S7)
                         localStorage favoris

Profil briefing on ──POST──► NestJS ──► table notification_profiles
                                              │
                         cron n8n ────────────┤
                                              ▼
                                    cache + favoris
                                              │
                                    template WhatsApp
                                              ▼
                                    Cloud API WhatsApp
                                              │
                                    STOP (webhook) ──► briefing off
```

## Composants

| Composant | Rôle V1 | Techno |
| --- | --- | --- |
| App web | Écrans S1–S7, tokens de la maquette, pas Angular Material | Angular (standalone, signals) |
| Carte | Markers Vélô / parkings | Leaflet |
| API | Lecture agrégée + écriture profil briefing | NestJS |
| Base | Snapshots, profils, journal d’envoi | Supabase (PostgreSQL + RLS) |
| Collecte | Poll GBFS v3, GTFS-RT (souvent 502), parkings ODS **sans occupation**, Open-Meteo, ATMO | Jobs NestJS (voir SPIKE_OPEN_DATA.md) |
| Agent | Cron matin, test S7, inbound STOP | n8n (Scaleway) |
| Texte WhatsApp | Message structuré, variables bornées | **Template Meta**, pas un roman Mistral |
| Conseil du jour (S6) | Phrase courte météo + ATMO | Règles déterministes d’abord ; Mistral optionnel plus tard |
| Canal | Envoi + opt-in | WhatsApp Cloud API |
| Infra | Front statique + API + n8n | Scaleway ; Supabase hébergé |

## Boucle 1 — Consultation (dashboard)

1. Jobs NestJS rafraîchissent les snapshots (TTL : ~30–60 s Vélô via ETag GBFS, Tisséo si le flux répond, parkings catalogue rare, ~1 h météo).
2. Angular appelle uniquement l’API TouRose (`GET /velo/stations`, `/tisseo/alerts`, `/weather`, `/air`, `/parkings`).
3. Chaque ressource renvoie `{ data, fetchedAt, expiresAt, status: ok | stale | unavailable }`.
4. Angular affiche selon F-05 à F-09 : bloc isolé, jamais d’écran blanc.
5. Favoris et onboarding : `localStorage` uniquement.

Pas d’auth sur les GET publics. Rate limiting basique sur l’API.

## Boucle 2 — Briefing WhatsApp

Contrainte Meta (à valider en P4-03, mais elle structure déjà le design) : un message **initié par nous** le matin doit passer par un **modèle pré-approuvé**, pas un texte libre généré.

1. S1.3 / S7 : l’utilisateur consent, envoie numéro + heure + jours + IDs de favoris.
2. NestJS crée/maj `notification_profiles` (opt-in horodaté). Un jeton opaque reste dans `localStorage` pour les maj / test / désactivation UI.
3. n8n, toutes les minutes (ou au créneau) : profils `enabled` dont l’heure Toulouse + jour matchent et pas encore envoyés aujourd’hui.
4. n8n lit le cache (HTTP NestJS ou SQL) → remplit les variables du template (Vélô, Tisséo, météo/ATMO). Parking **exclu**.
5. Envoi Cloud API. Échec → retry borné. Succès → `briefing_deliveries`.
6. Inbound : mot STOP (et équivalents) → `enabled = false`. Favoris locaux intacts (F-12).
7. « Envoyer un test » (S7) : même template, immédiat, hors créneau.

**Mistral n’est pas sur le chemin critique de l’envoi V1.** Les templates WhatsApp n’aiment pas le texte généré long / instable. On pourra s’en servir plus tard pour le conseil S6 ou un lissage des variables, pas pour inventer le message.

## Front Angular — découpage logique (pas encore de repo)

- `core` : HTTP, modèles `status`, horloge fraîcheur
- `features/onboarding` : S1
- `features/home` : S2
- `features/map` : S3
- `features/velo` : S4
- `features/parking` : S5
- `features/weather` : S6
- `features/briefing` : S7
- `data/local-preferences` : favoris, onboarding vu, jeton profil

Géoloc : optionnelle, seulement pour distances (F-04).

## Backend NestJS — modules logiques

- `ingestion` : pollers + normalisation
- `catalog` : lecture snapshots pour l’app
- `notifications` : CRUD profil, test, état d’envoi pour S7
- `webhooks/whatsapp` : inbound STOP (si on ne le met pas que dans n8n)

n8n orchestre le **calendrier et l’envoi**. NestJS reste la source de vérité des profils et du cache. On évite que n8n recolle les API publiques (doublon, moins bon citoyen).

## Sécurité & RGPD (V1)

- Pas d’email, pas de mot de passe.
- Numéro WhatsApp + favoris IDs + horaires = données perso. Base en UE (Supabase). Consentement explicite avant premier envoi.
- Droit à l’effacement : endpoint / commande (S7 « tout supprimer » à prévoir au plus tard en P6, même simple).
- Secrets API (WhatsApp, éventuellement ATMO) : jamais dans Angular.
- RLS : les GET catalogue peuvent être `anon` lecture snapshots ; les profils : accès service role côté NestJS seulement, pas d’exposition directe PostgREST des numéros.

## Hébergement

- Angular : static (Scaleway Object + CDN, ou container léger).
- NestJS + n8n : même VPS / deux services Scaleway.
- Supabase : projet dédié TouRose.

Coût visé CDC : ~20–35 €/mois.

## Hors architecture V1

- Auth utilisateurs, Capacitor, websockets (le poll 30 s Angular + cache suffit).
- Génération vocale, multi-villes.
- n8n qui appelle JCDecaux / Tisséo en direct.

## Décisions techniques prises ici

Voir `docs/DECISIONS.md` D-03b, D-05 (Leaflet), D-06 (template WhatsApp, Mistral hors chemin critique).
