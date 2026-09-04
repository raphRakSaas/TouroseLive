# TouRose — tickets P6 (READY)

Statut : **P6 en cours** (T-01, T-03→T-07 faits). T-02 SQL prêt, pas encore appliqué.

Légende : `front` Angular · `api` NestJS · `data` Supabase · `agent` n8n · `ops` compte / secret

---

## Tranche A — Lecture Vélô (premier écran utile)

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-01 | ops | Repo Angular + NestJS + env, sans feature | `ng serve` et `nest start` tourne à vide |
| T-02 | data | Tables `data_snapshots` (+ RLS lecture catalogue) | Migration appliquée, pas de numéros perso |
| T-03 | api | Poller GBFS v3 + `GET /v1/velo/stations` | JSON `{ status, fetchedAt, data }` ; 466 stations en local |
| T-04 | front | S2 + S3 + S4 **Vélô seulement** (tokens maquette, Leaflet) | Carte, liste, fiche, fraîcheur, état `unavailable` |
| T-05 | front | Mentions JCDecaux / ODbL | Visibles dashboard |

## Tranche B — Reste du dashboard lecture

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-06 | api+front | Parkings ODS (capacité, tarif, **pas** occupation) | S5 + couche carte ; « dispo inconnue » |
| T-07 | api+front | Open-Meteo par quartier (lat/lng) | S6 météo heure par heure + 5 jours |
| T-08 | api+front | ATMO EPCI 243100518, échelle 1–6 | S2/S6 « Toulouse Métropole », pas 58 |
| T-09 | api+front | Tisséo Alert GTFS-RT **ou** `unavailable` | S2 liste perturbations ; 502 = F-06, pas crash |
| T-10 | api | Catalogue lignes (GTFS zip) pour favori | Liste lignes S1.2 même sans RT |

## Tranche C — Personnalisation locale

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-11 | front | S1 onboarding skippable + 0–3 favoris `localStorage` | F-01 à F-03 |
| T-12 | front | S2 selon favoris ; 0 favori = CTA | F-02 |
| T-13 | front | S7 UI (toggle, heure, jours, aperçu **local**) | Aperçu sans envoi réel |

## Tranche D — Agent (après usage réel du dashboard)

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-14 | ops | WABA test + template soumis (actions humaines P4-03) | Catégorie Meta notée dans DECISIONS |
| T-15 | data+api | `notification_profiles` + `briefing_deliveries` + POST/PATCH/DELETE | Opt-in, jeton, RGPD delete |
| T-16 | agent | n8n : cron + Send Template + webhook STOP | Un test vers numéro whitelist |
| T-17 | front | S7 « Envoyer un test » branché | F-14 |

## Hors P6

Mail `opendata@tisseo.fr` (clé v2) : parallèle, pas un ticket de code.
Vérification Meta business : seulement si on dépasse le cercle proche.

## Définition de Terminé (tous les tickets)

Critère de la ligne + backlog mis à jour + pas de secret dans Git + source citée si donnée publique.
