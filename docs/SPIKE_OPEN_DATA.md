# Spike P4-01 — open data mobilité (15 août 2026)

Preuves live, pas d’app. User-Agent `TouRoseSpike/1.0`.

## Synthèse

| Source | Live aujourd’hui | Auth | Licence | Pour V1 |
| --- | --- | --- | --- | --- |
| Vélô GBFS v3 Cyclocity | **OK** — 466 stations | Non | ODbL / licence JCDecaux open | **Source principale** |
| Parkings ODS `parcs-de-stationnement` | **OK** — 23 parcs, tarifs, **pas d’occupation** | Non (API explore) | Licence ouverte / schéma Etalab | Carte + tarifs ; dispo = « inconnue » |
| Parkings relais ODS | **OK** — 7 fiches, quotas, **pas un flux minute** | Non | Licence ouverte | Liste P+R statique |
| Tisséo GTFS-RT `api.tisseo.fr/opendata/gtfsrt/` | **502 Bad Gateway** au moment du spike | Non (documenté) | ODbL | Garder l’URL ; F-06 confirmé (bêta) |
| Tisséo GTFS théorique | Publié sur le PAN / ODS | Non | ODbL | Repli horaires / catalogue lignes |
| Tisséo API v2 `api.tisseo.fr/v2/` | Non testée (clé mail) | **Clé** via opendata@tisseo.fr | ODbL | Filet si GTFS-RT reste down |
| Open-Meteo | **OK** | Non | Licence Open-Meteo | Météo S6 |

## VélôToulouse (GBFS 3.0)

- Discovery : `https://api.cyclocity.fr/contracts/toulouse/gbfs/v3/gbfs.json`
- Status : `.../station_status.json` — HTTP 200, `ttl: 1`, `Cache-Control: max-age=1`, ETag
- Info : `.../station_information.json`
- Types : `mechanical` et `electrical` **présents** (`vehicle_types_available[].count`)

Champs utiles status : `station_id`, `num_vehicles_available`, `num_docks_available`, `is_renting`, `is_installed`, `last_reported`.

Info : `name[]` (fr/en/es), `address`, `lat`, `lon`, `capacity`. Prendre `language === "fr"`.

**IDs :** ce n’est pas `00021` Capitole de la maquette. Ex. `station_id` `"21"` = Carnot–Labéda ; Capitole côté maquette ≈ `"6"` Lois–Capitole. La maquette est illustrative.

Poller NestJS : ~30–60 s, respecter ETag. Afficher `last_updated` / `last_reported`. Citer JCDecaux / VélôToulouse / ODbL.

**S4 :** le détail « dont n électriques » peut passer **in V1** (la donnée existe). Mettre à jour SCREENS si validé.

## Parkings

`GET https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/parcs-de-stationnement/records?limit=20`

Champs : `nom`, `adresse`, `nb_places`, `tarif_1h`…`tarif_24h`, `nb_pmr`, geo. **Aucun champ places libres.**

Conséquence produit (déjà F-09) : S5 = localisation + tarif + capacité. Pas de jauge « 212 / 640 » tant qu’un flux occupation n’existe pas. Ne pas scraper tisseo.fr.

P+R : même portail, jeu `parkings-relais` (7 enregistrements). Occupation temps réel vue sur le site Tisséo, **pas** dans l’open data testé.

## Tisséo

Documenté (transport.data.gouv.fr) :

- `https://api.tisseo.fr/opendata/gtfsrt/GtfsRt.pb` (TripUpdate + Alert)
- `https://api.tisseo.fr/opendata/gtfsrt/Alert.pb` (Alert seul)
- JSON équivalent annoncé (bêta)
- Refresh ~5 s, ETag, profondeur 2 h
- Contact : opendata@tisseo.fr

**Test 15/08/2026 17h16 CEST :** Alert.pb, Alert.json, GtfsRt.pb → **HTTP 502**. L’architecture « status: unavailable » n’est pas théorique.

Pour V1 :

1. Poller GTFS-RT Alert (protobuf) quand 200.
2. Sinon snapshot `stale` ou `unavailable` (F-06).
3. En parallèle : demander une clé API v2 (`messages` / `lines`) — démarche humaine, pas du code.
4. GTFS zip : catalogue des lignes pour S1.2 (favori ligne) même sans temps réel.

**Ne pas** réutiliser l’ancienne API temps réel v1 (coupée avril 2022).

## Open-Meteo (hors ticket mais vérifié)

`https://api.open-meteo.com/v1/forecast?latitude=43.6045&longitude=1.444&current=temperature_2m,apparent_temperature,weather_code&hourly=temperature_2m,precipitation_probability&timezone=Europe/Paris`

Sans clé. Suffisant S6 météo. Air : Open-Meteo EAQI existe mais **ce n’est pas l’indice ATMO** → P4-02.

## Décisions / actions

| ID | Action |
| --- | --- |
| D-07 | Vélô = GBFS v3 Cyclocity uniquement (pas l’API JCDecaux à clé) |
| Produit S5 | Occupation live **out** tant qu’il n’y a pas de jeu open data |
| Produit S4 | Électriques **in** (preuve GBFS) — à confirmer (aligné maquette) |
| Ops | Mail Tisséo pour clé v2 + signaler 502 GTFS-RT |
| P4-02 | ATMO officiel ; Open-Meteo air = repli éventuel, pas le libellé « ATMO » |
