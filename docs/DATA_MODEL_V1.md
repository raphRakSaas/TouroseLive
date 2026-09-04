# TouRose — modèle de données V1 (conceptuel)

Statut : **P3-02** — 2026-08-15. Pas de SQL de prod ici. Noms stables pour P5/P6.

## Côté appareil (pas en base tant que briefing = off)

`local_preferences`

- `onboardingSeen` (boolean)
- `favoriteVeloStationId` (string | null)
- `favoriteTisseoLineId` (string | null)
- `favoriteDistrictId` (string | null)
- `briefingEnabled` (boolean, miroir UI)
- `profileToken` (string | null) — lie l’appareil au profil serveur
- `parkingInBriefing` (boolean, toujours false en V1)

Un seul slot par type (F-03).

## Côté serveur

### `data_snapshots`

Cache unifié des sources externes.

- `id`
- `source` : `velo_gbfs` | `parking` | `tisseo_gtfsrt` | `tisseo_gtfs_static` | `weather` | `air_atmo`
- `externalId` : station, ligne, quartier, ou `metro` pour un blob
- `payload` : JSON normalisé (contrat Angular)
- `fetchedAt`
- `expiresAt`
- `status` : `ok` | `stale` | `unavailable`

Index : `(source, externalId)`, `expiresAt`.
On n’historise pas 12 h (hors V1). Un snapshot courant suffit ; `stale` = on sert le dernier `ok` périmé.

### `notification_profiles`

Créé seulement après consentement briefing.

- `id` (uuid)
- `profileTokenHash` (hash du jeton appareil, pas le jeton en clair)
- `phoneE164`
- `enabled`
- `sendHour` / `sendMinute` (Europe/Paris)
- `sendDays` : masque lun–dim (défaut lun–ven)
- `favoriteVeloStationId`
- `favoriteTisseoLineId`
- `favoriteDistrictId`
- `consentedAt`
- `optedOutAt` (null si actif)
- `createdAt` / `updatedAt`

Pas d’email. Un numéro ≈ un profil (unique `phoneE164`).

### `briefing_deliveries`

Journal d’envoi (audit, retry, S7).

- `id`
- `profileId`
- `plannedFor` (date + créneau)
- `sentAt`
- `channel` : `whatsapp`
- `templateName` / `templateLanguage`
- `variablePayload` (JSON des variables réellement envoyées)
- `status` : `queued` | `sent` | `failed` | `skipped`
- `errorCode` (nullable)
- `isTest` (boolean)

Contrainte utile : au plus un `sent` non-test par profil et par jour civil Paris.

### Catalogues quasi-statiques (optionnel V1)

Si les IDs GBFS / Tisséo / quartiers sont trop lourds à dériver du snapshot live :

- `velo_stations` (id, name, lat, lng, address)
- `tisseo_lines` (id, label, mode)
- `districts` (id, name, lat, lng) — liste courte Toulouse

Peut être dérivé du dernier snapshot `ok` au début, sans tables dédiées.

## Contrats API (forme, pas d’implémentation)

Lecture (public) :

- `GET /v1/velo/stations`
- `GET /v1/velo/stations/:stationId`
- `GET /v1/parkings`
- `GET /v1/tisseo/alerts`
- `GET /v1/weather?districtId=`
- `GET /v1/air?districtId=`

Chaque réponse : `{ status, fetchedAt, expiresAt, data }`.

Briefing (jeton) :

- `POST /v1/notifications/profiles` — opt-in
- `PATCH /v1/notifications/profiles/me` — heure, jours, favoris, enabled
- `POST /v1/notifications/profiles/me/test`
- `DELETE /v1/notifications/profiles/me` — effacement (RGPD)
- `POST /v1/webhooks/whatsapp` — inbound STOP (secret Meta)

## Mapping écrans

| Écran | Lecture | Écriture |
| --- | --- | --- |
| S1.2 / S2 favoris | catalogues | localStorage |
| S2–S6 | snapshots | — |
| S1.3 / S7 on | — | profil serveur |
| S7 STOP UI | profil (enabled) | PATCH enabled=false |
| Agent matin | snapshots + profils | deliveries |
