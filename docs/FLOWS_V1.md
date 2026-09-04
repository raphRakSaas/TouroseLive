# TouRose — flux V1

Statut : **figé** le 2026-08-15 (P2-01), d’après SCREENS_V1 validé.
On ne code pas encore. Ce fichier sert de référence pour P3 (architecture) et P6 (tickets).

## Principes

- Premier usage sans compte, sans WhatsApp, sans géoloc.
- L’onboarding n’est jamais obligatoire.
- Une source externe en échec isole sa carte / son bloc, jamais toute l’app.
- STOP WhatsApp = briefing off, dashboard inchangé.

## Parcours nominaux

### A — Découverte rapide (skip)

S1.1 → « Voir le tableau de bord » → S2 (0 favori, briefing off).
Onboarding marqué « vu » sur l’appareil pour ne pas le rejouer au prochain chargement (on peut le rouvrir depuis S7 plus tard si besoin : pas un écran V1 dédié, un lien suffit).

### B — Configuration complète

S1.1 → S1.2 (1 à 3 favoris) → S1.3 (numéro + heure) → S1.4 → S2.
Briefing on. Jours par défaut : lun–ven.

### C — Favoris sans briefing

S1.1 → S1.2 → S1.3 « Plus tard » → S1.4 → S2.
Favoris locaux, briefing off. Activation possible ensuite dans S7.

### D — Consultation quotidienne (revisit)

Ouvrir l’app → S2 (pas d’onboarding).
Puis S3 / S4 / S5 / S6 selon le besoin. S7 pour l’heure ou STOP.

### E — Premier briefing le matin (côté agent, pas un écran)

Heure locale Toulouse + jour coché + briefing on → composer le message depuis le cache + favoris → WhatsApp.
Échec d’envoi → retry (NFR CDC) ; l’UI S7 le signale au prochain chargement si on a un journal.

## Cas limites (contrats)

| ID | Situation | Comportement V1 |
| --- | --- | --- |
| F-01 | Retour visiteur, onboarding déjà skippé ou fini | S2 direct |
| F-02 | 0 favori sur S2 | Cartes avec CTA vers épinglage ; météo : point Toulouse centre ; **ATMO : toujours Toulouse Métropole** |
| F-03 | Plus d’un favori du même type | Impossible : 1 station, 1 ligne, 1 quartier max |
| F-04 | Géoloc refusée ou absente | Pas de distance / « 3 min » ; stations et parkings restent listés |
| F-05 | GBFS Vélô down | S2/S3/S4 : « donnée temporairement indisponible » + dernière maj si cache |
| F-06 | GTFS-RT Tisséo down | Repli horaires théoriques **si** dispo, sinon message d’indispo sur le bloc Tisséo ; le reste de S2 vit |
| F-07 | Open-Meteo down | Bloc météo en erreur ; ATMO peut rester |
| F-08 | ATMO down | Bloc ATMO en erreur ; météo peut rester ; conseil du jour masqué si les deux manquent |
| F-09 | Parking sans taux d’occupation | Liste + carte, libellé « disponibilité inconnue » |
| F-10 | Numéro WhatsApp invalide | S1.3 / S7 : Activer bloqué, erreur sous le champ |
| F-11 | Opt-in / API WhatsApp échoue | Rester sur S1.3 ou S7, briefing reste off |
| F-12 | Utilisateur envoie STOP | Briefing off ; S7 toggle off ; pas de suppression des favoris |
| F-13 | Utilisateur réactive dans S7 | Nouveau consentement (même écran numéro + heure) |
| F-14 | Test WhatsApp depuis S7 | Un message immédiat ; échec visible ; ne change pas l’heure programmée |
| F-15 | Hors créneau (week-end, jour décoché) | Pas d’envoi |
| F-16 | Deep link Itinéraire | Ouvre Maps / Apple Plans ; on ne calcule pas d’itinéraire dans TouRose |

## Ce que le frontend Angular doit persister en local (conceptuel)

- Onboarding : vu / non vu
- Favoris : au plus { veloStationId, tisseoLineId, quartierId }
- Briefing : off | on, numéro, heure, jours, parkingInclus = false
- Pas de mot de passe, pas d’email

Le backend / agent (P3) n’a besoin d’un profil notification **que** si le briefing est on.
