# TouRose — journal de décisions

Format : date · décision · pourquoi · conséquences.

## Tranchées

### D-02 — Moment de création de compte — 2026-08-15

**Décision :** pas de compte utilisateur en V1. Favoris sur l’appareil. Le briefing demande un numéro + consentement + commande STOP. Compte email / TouRose+ plus tard.

**Pourquoi :** aligné sur la maquette (friction minimale, 1 min sans inscription). Le CDC §4.2.5 demandait un compte trop tôt pour un usage personnel + cercle proche.

**Conséquences :** pas de sync multi-appareils en V1 ; RGPD limité au numéro et aux préférences de briefing ; le modèle « Utilisateur » du CDC se réduit à un profil de notification local / côté agent.

### D-01 — Canal de briefing V1 — 2026-08-15

**Décision :** WhatsApp est le canal produit. Pas Telegram en V1, sauf filet de sécurité si l’accès à l’API WhatsApp Business est refusé ou trop long (alors on le note et on décide, on ne le code pas en parallèle).

**Pourquoi :** c’est le canal déjà ouvert plusieurs fois par jour (insight CDC). Choix produit tranché, plus un A/B technique.

**Conséquences :** le spike P4-03 devient « comment on ouvre un compte WhatsApp Business (WABA) en solo » : opt-in, templates, fenêtre 24 h, STOP, coût. L’UI parle WhatsApp uniquement.

### D-03a — Frontend — 2026-08-15

**Décision :** Angular (standalone + signals). Pas Next.js / React pour TouRose.

**Pourquoi :** un dashboard « plus joli plus vite » se ferait aujourd’hui plutôt en React + Tailwind, mais TouRose a un second objectif : portfolio Angular pour le marché toulousain (Java/Angular). Angular 19/20 suffit largement pour carte, listes, indicateurs, maquette HTML. Le joli vient du design system de la maquette, pas du framework.

**Conséquences :** P3 part d’un app Angular ; cartes (MapLibre ou Leaflet), pas besoin d’Angular Material si on reprend les tokens de la maquette.

### D-04 — Écarts maquette vs CDC — 2026-08-15

**Décision :** scope figé dans `docs/SCOPE_V1.md`. Onboarding + quotidien + carte + fiches + briefing **in**. Tourisme, stats avancées Vélô, paywall, vocal, app **out**.

**Pourquoi :** livrer un usage réel matin (CDC §10 discipline de scope) plutôt que copier toute la maquette.

**Conséquences :** P1 n’inventorie que les 7 familles d’écrans listées dans SCOPE_V1.md.

### D-03b — Reste du stack — 2026-08-15

**Décision :**

- Backend : NestJS (ingestion + API catalogue + profils briefing)
- Données : Supabase / PostgreSQL + RLS (NestJS en service role sur les profils)
- Agent : n8n self-host pour cron, envoi, inbound STOP
- Carte : Leaflet (D-05)
- Texte WhatsApp : template Meta, Mistral hors chemin critique (D-06)
- Infra : Scaleway + projet Supabase dédié

**Pourquoi :** stack déjà maîtrisé, CDC, séparation nette cache vs envoi.

**Conséquences :** voir `docs/ARCHITECTURE_V1.md`.

### D-05 — Bibliothèque carte — 2026-08-15

**Décision :** Leaflet. Pas MapLibre en V1.

**Pourquoi :** markers + filtres suffisent ; moins de surface à apprendre en plus d’Angular.

### D-06 — Génération du briefing — 2026-08-15

**Décision :** le matin = **template WhatsApp** à variables. Mistral n’envoie pas le message. Conseil S6 = règles déterministes en V1.

**Pourquoi :** un envoi Business initié par nous doit être un modèle pré-approuvé ; un LLM casse l’approbation et la fiabilité.

### D-07 — Source Vélô — 2026-08-15

**Décision :** GBFS v3 `api.cyclocity.fr/contracts/toulouse/gbfs/v3/` sans clé. Pas l’API JCDecaux historique à clé.

**Pourquoi :** live 466 stations, ETag, vélos méca + élec. Preuve `docs/SPIKE_OPEN_DATA.md`.

### D-08 — Source qualité de l’air — 2026-08-15

**Décision :** indice ATMO officiel via FeatureServer Atmo Occitanie, zone EPCI `243100518` (Toulouse Métropole). Échelle 1–6 + libellé. Pas de score 0–100. Open-Meteo EAQI n’est pas affiché comme ATMO.

**Pourquoi :** flux sans clé, ODbL, données J et J+1. Pas d’indice par quartier dans l’open data.

**Conséquences :** S6 / briefing = « ATMO · Toulouse Métropole ». Poll 1–2×/jour. Preuve `docs/SPIKE_ATMO.md`.

### D-09 — Accès WhatsApp — 2026-08-15

**Décision :** Cloud API Meta + n8n (pas de BSP au lancement). Un template `tourose_briefing_matin`. On **anticipe une catégorie Marketing**. Le dashboard P6 n’attend pas le WABA prod.

**Pourquoi :** spike `docs/SPIKE_WHATSAPP.md`. Un digest quotidien n’est en général pas Utility. Cercle proche = coût faible. Test Meta whitelist suffit pour T-16.

### D-10 — Focus lecture open data (pause WhatsApp + Supabase) — 2026-09-04

**Décision :** pour la phase courante, TouRoseLive = **affichage des données open data via l’API NestJS** uniquement. **Pas** de WhatsApp (tranche D), **pas** de Supabase / `data_snapshots` (T-02). Caches = mémoire process. Briefing, opt-in, n8n : hors sprint jusqu’à nouvelle décision.

**Pourquoi :** livrer un dashboard utile (Vélô, parkings, météo, ATMO, Tisséo) avant l’infra perso / agent.

**Conséquences :** T-02, T-13 (aperçu briefing), T-14→T-17 passent en **later / gelés**. Onboarding favoris locaux (T-11/T-12) reste optionnel après la tranche B lecture. Backlog = T-08 → T-09 puis polish UI.

## En attente

- Clé Tisséo API v2 (mail)
- Catégorie réelle du template (après soumission Meta, T-14) — **gelé avec D-10**
- Reprise WhatsApp / Supabase : explicitement hors scope jusqu’à D-10 levée
