# TouRose — tickets P6 (READY)

Statut : **P6 lecture API** (D-10). Tranche B **close** (T-06→T-09). T-02 / tranche D **gelés**.

Légende : `front` Angular · `api` NestJS · `data` Supabase · `agent` n8n · `ops` compte / secret

---

## Tranche A — Lecture Vélô (premier écran utile)

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-01 | ops | Repo Angular + NestJS + env, sans feature | `ng serve` et `nest start` tourne à vide |
| T-02 | data | Tables `data_snapshots` (+ RLS lecture catalogue) | **GELÉ (D-10)** |
| T-03 | api | Poller GBFS v3 + `GET /v1/velo/stations` | JSON `{ status, fetchedAt, data }` ; stations live |
| T-04 | front | S2 + S3 + S4 **Vélô seulement** (tokens maquette, Leaflet) | Carte, liste, fiche, fraîcheur, état `unavailable` |
| T-05 | front | Mentions JCDecaux / ODbL | Visibles dashboard |

## Tranche B — Reste du dashboard lecture

| ID | Couche | Titre | Terminé si |
| --- | --- | --- | --- |
| T-06 | api+front | Parkings ODS (capacité, tarif, **pas** occupation) | S5 + couche carte ; « dispo inconnue » |
| T-07 | api+front | Open-Meteo par quartier (lat/lng) | S6 météo heure par heure + 5 jours |
| T-08 | api+front | ATMO EPCI 243100518, échelle 1–6 | S2/S6 « Toulouse Métropole », pas 58 |
| T-09 | api+front | Tisséo Alert GTFS-RT **ou** `unavailable` | S2 liste perturbations ; 502 = F-06, pas crash |
| T-10 | api | Catalogue lignes (GTFS zip) pour favori | **Later** (favoris optionnels) |

## Tranche C — Personnalisation locale

**Later** tant que le focus = lecture API (D-10). Favoris `localStorage` possibles après T-09.

## Tranche D — Agent WhatsApp

**GELÉE (D-10).** Pas de WABA / n8n / profils notification pour l’instant.

## Hors P6

Mail `opendata@tisseo.fr` (clé v2) : parallèle, pas un ticket de code.

## Définition de Terminé (tous les tickets)

Critère de la ligne + backlog mis à jour + pas de secret dans Git + source citée si donnée publique.
