# Spike P4-02 — ATMO (15 août 2026)

Preuve live, pas d’app. User-Agent `TouRoseSpike/1.0`.

## Synthèse

| Option | Auth | Maille | Live | Pour V1 |
| --- | --- | --- | --- | --- |
| **FeatureServer Atmo Occitanie** | Non | **EPCI** (pas de quartier, pas de commune) | **OK** | **Source officielle** |
| API nationale Atmo Data | Compte + token 1 h, inscription | Commune INSEE | Non testée (compte) | Plus tard si on veut la commune |
| Open-Meteo european_aqi | Non | Point GPS, **pas ATMO** | OK (P4-01) | Repli technique, **ne pas labelliser ATMO** |

Licence : ODbL. Citer **Atmo Occitanie**.

## Flux retenu

ArcGIS REST (couche `ind_occitanie`) :

`https://services9.arcgis.com/7Sr9Ek9c1QTKmbwr/arcgis/rest/services/Indice_quotidien_de_qualité_de_l’air_pour_les_collectivités_territoriales_en_Occitanie/FeatureServer/0/query`

Filtre V1 : `code_zone='243100518'` (Toulouse Métropole).

Champs : `date_ech`, `code_qual` (1–6), `lib_qual`, `coul_qual`, `code_no2`, `code_o3`, `code_pm10`, `code_pm25`, `code_so2`, `source`, `lib_zone`.

Test du jour :

| date_ech | lib_qual | code_qual | polluant max |
| --- | --- | --- | --- |
| 2026-08-15 | Mauvais | 4 | O₃ (4) |
| 2026-08-16 (prévision) | Dégradé | 3 | O₃ (3) |

`type_zone` du jeu = **EPCI uniquement**. `code_zone='31555'` (commune Toulouse) → 0 résultat.

## Échelle (pas celle de la maquette)

L’indice ATMO réglementaire n’est **pas** un score 0–100 (la maquette « 58 Moyen » est un autre barème, type EAQI).

| code_qual | lib_qual |
| --- | --- |
| 1 | Bon |
| 2 | Moyen |
| 3 | Dégradé |
| 4 | Mauvais |
| 5 | Très mauvais |
| 6 | Extrêmement mauvais |
| 0 | Indisponible |

S6 et le briefing doivent afficher **libellé + couleur**, pas « 58 ».

## Fraîcheur

Mise à jour **1× / jour** vers 14 h (J et J+1). Poller NestJS : 1 à 2 fois par jour, **pas** toutes les 30 s. Pic serveurs 13 h–15 h à éviter (consigne Atmo Data).

## Produit

- Le favori « quartier » sert à la **météo** (point Open-Meteo). L’air est **le même pour toute la métropole**.
- S2/S6 : libellé « ATMO · Toulouse Métropole », pas « ATMO · Saint-Cyprien ».
- Conseil du jour : règles sur `code_qual` + polluant max (O₃ cet après-midi).

## Actions humaines

- Inscription Atmo Data nationale (`https://admindata.atmo-france.org/inscription-api`) **seulement** si on veut un jour l’indice **commune**. Pas bloquant V1.
