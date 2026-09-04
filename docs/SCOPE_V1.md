# TouRose — scope V1 gelé

Statut : **gelé** le 2026-08-15 (P0-02).
Toute fonction hors de ce fichier va dans `docs/BACKLOG.md` → later, pas dans P6.

Promesse V1 : **un écran quotidien + un message le matin**, à partir de données publiques toulousaines.

**Focus courant (D-10, 2026-09-04) :** pour l’instant on livre **uniquement l’affichage des open data** (dashboard + fiches). Briefing WhatsApp et Supabase sont **hors sprint** jusqu’à nouvelle décision.

**Extension lecture (D-11, 2026-09-04) :** agenda culturel + lieux à découvrir (musées, patrimoine MH, aires de jeux, jardins, balades) via open data Toulouse — **in** pour la phase lecture.

---

## In — on construit ça

| Bloc | Contenu | Condition |
| --- | --- | --- |
| Onboarding 4 étapes | Accueil → 3 favoris → heure + numéro briefing → prêt | On peut tout passer en « plus tard » |
| Vue quotidienne | Cartes Vélô, Tisséo, météo, ATMO + liste de perturbations | Desktop et mobile |
| Carte | Stations Vélô + parkings, fraîcheur des données | Filtres Vélôs / Parkings |
| Fiche station Vélô | Vélos, places, statut, proximité | Données GBFS / JCDecaux |
| Fiche parkings | Places : **inconnue en V1** (pas de flux occupation). Localisation, capacité, tarifs ODS. | Dégradé gracieux |
| Fiche météo & air | Température quartier (Open-Meteo) ; indice ATMO **métropole** (échelle 1–6) ; conseil du jour | Open-Meteo + Atmo Occitanie |
| Favoris | 1 station, 1 ligne Tisséo, 1 quartier — stockés sur l’appareil | Sans compte |
| Briefing | Message quotidien WhatsApp (heure au choix, jours), aperçu, test, STOP | D-01 : WhatsApp |
| Mentions | Sources et licences open data visibles | Obligation ODbL / équivalent |
| Agenda culturel | Manifestations à venir / en cours (ODS So Toulouse) | Gratuit, sans clé |
| Lieux à découvrir | Musées, galeries, théâtres, aires de jeux, jardins partagés, balades, monuments MH (Mérimée) | Gratuit, sans clé |

## Out — explicitement pas V1

- Bonnes adresses éditoriales / contenu « influencer »
- Alertes push temps réel, TouRose+, paywall
- Prévision 30 min Vélô, courbe 12 h, tendances
- Pistes cyclables sur la carte (nice-to-have, pas un engagement)
- Vocal ElevenLabs, app stores, widget B2B, multi-villes, social
- Compte email / mot de passe (reporté avec TouRose+)
- WhatsApp / Supabase (gelés D-10)

## Écrans V1 (détail : `docs/SCREENS_V1.md`)

1. Onboarding — étapes 01 à 04
2. Tableau de bord — vue quotidienne (desktop + mobile)
3. Carte métropole
4. Détail station Vélô
5. Liste / détail parkings
6. Détail météo & air (quartier)
7. Réglages briefing (activation, heure, jours, contenu, aperçu)
8. Agenda culturel (événements à venir / en cours)
9. Lieux à découvrir (musées, patrimoine MH, parcs/jeux, balades)

Les perturbations Tisséo sont sur l’accueil. Briefing WhatsApp gelé (D-10).

## Compte et données perso (D-02)

- Consultation et favoris : **sans compte**, sur l’appareil.
- Briefing : **numéro WhatsApp** + consentement explicite + STOP.
- Compte « vrai » (email, sync multi-appareils, offre payante) : **pas V1**.
