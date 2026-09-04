# TouRose — inventaire écrans V1

Statut : **validé** le 2026-08-15 (P1-02).
Les écrans maquette Trafic / Sortir / Patrimoine / Bonnes adresses / TouRose+ ne sont **pas** des écrans V1.

Convention : chaque fiche a un but, des éléments **in**, ce qu’on **ignore** dans la maquette, des états, des liens.

---

## Carte des liens V1

```
[S1.1 Accueil onboarding]
    → S1.2 Favoris        (Commencer)
    → S2 Accueil          (Voir le tableau de bord / Plus tard)
[S1.2 Favoris]
    → S1.3 Briefing       (Continuer, 1 à 3 favoris)
    → S1.1                (Retour)
[S1.3 Briefing WhatsApp]
    → S1.4 Prêt           (Activer le briefing)
    → S1.4 ou S2          (Plus tard = pas de numéro)
    → S1.2                (Retour)
[S1.4 Prêt]
    → S2 Accueil          (Ouvrir mon tableau de bord)
[S2 Accueil desktop / mobile]
    → S3 Carte
    → S4 Fiche Vélô
    → S5 Parkings
    → S6 Météo & air
    → S7 Réglages
    → S2 Favoris (onglet mobile / panneau)
[S3 Carte] → S4, S5, S2
[S4 Vélô]  → S2, S4 (station proche)
[S5 Parkings] → S2, éventuellement cartes externes
[S6 Météo] → S2
[S7 Réglages] → S2
```

Navigation mobile persistante : **Accueil · Carte · Favoris · Réglages**. Pas de Trafic / Sortir / Patrimoine / Briefing dans la barre.

---

## S1 — Onboarding (4 étapes)

### S1.1 — Accueil marketing

| | |
| --- | --- |
| **But** | Comprendre TouRose en 5 secondes et choisir : configurer, ou aller direct au dashboard. |
| **In** | Titre « Toute la ville rose. Un seul écran. » ; mention open data Toulouse Métropole ; CTA Commencer ; lien « Voir le tableau de bord » ; mention « 1 min · aucune inscription ». Aperçus Vélô / Tisséo / briefing **illustratifs** (données réelles si déjà en cache, sinon statiques). |
| **Out maquette** | Rien de bloquant. |
| **Vide** | Sans données live : garder les extraits illustratifs, ne pas bloquer. |
| **Erreur** | Aucune — écran statique. |
| **Liens** | Commencer → S1.2 ; Voir le tableau de bord → S2. |
| **Terminé si** | On peut skipper l’onboarding et atterrir sur S2 sans rien remplir. |

### S1.2 — Trois favoris

| | |
| --- | --- |
| **But** | Épingler jusqu’à 3 favoris : 1 station Vélô, 1 ligne Tisséo, 1 quartier. |
| **In** | Recherche ; onglets Vélôs / Lignes / Quartiers ; liste avec nom + méta ; bouton épingler ; compteur « n sélectionnés » ; Retour / Continuer. |
| **Out** | Favoris illimités (TouRose+). |
| **Vide** | Recherche sans résultat : « Aucune station / ligne / quartier ». Liste source indisponible : message + Continuer quand même (0 favori). |
| **Erreur** | Échec chargement catalogues : même message, onboarding non bloqué. |
| **Liens** | Continuer → S1.3 (même avec 0 favori) ; Retour → S1.1. |
| **Terminé si** | Les 3 types sont épinglables, persistés sur l’appareil, et on peut continuer à 0. |

### S1.3 — Activer le briefing WhatsApp

| | |
| --- | --- |
| **But** | Recueillir numéro + heure, avec consentement, ou reporter. |
| **In** | Champ numéro WhatsApp ; créneaux 07:00 / 07:30 / 08:00 / 08:30 ; mention lun–ven par défaut (jours fins dans S7) ; aperçu court du message ; « Répondez STOP à tout moment » ; Activer / Plus tard. |
| **Out** | Pastille « vérifié » tant qu’on n’a pas de vrai opt-in (P4-03). Pas de Telegram. |
| **Vide** | Numéro vide : Activer désactivé. |
| **Erreur** | Numéro invalide : message sous le champ. Échec opt-in : rester sur S1.3, texte clair. |
| **Liens** | Activer → S1.4 ; Plus tard → S1.4 ou S2 sans briefing ; Retour → S1.2. |
| **Terminé si** | On peut activer (numéro + heure) **ou** tout reporter, sans compte. |

### S1.4 — C’est prêt

| | |
| --- | --- |
| **But** | Confirmer que tout est local, puis ouvrir le dashboard. |
| **In** | « Tout est enregistré sur cet appareil » ; récap des favoris choisis ; CTA « Ouvrir mon tableau de bord ». |
| **Out** | Bloc TouRose+ / création de compte. |
| **Vide / erreur** | N/A. |
| **Liens** | CTA → S2. |
| **Terminé si** | Aucune demande de compte ; S2 s’ouvre avec les favoris locaux. |

---

## S2 — Tableau de bord (vue quotidienne)

Deux layouts, **même contenu**. Desktop : grille. Mobile : pile + barre du bas.

| | |
| --- | --- |
| **But** | En un coup d’œil : mes favoris + perturbations + accès carte. |
| **In** | Horodatage « maj. … · auto ~30 s » ; carte Vélô favorite (vélos, places, distance si géoloc) ; carte Tisséo favorite (ligne, sévérité, texte court) ; carte météo quartier ; carte ATMO ; liste perturbations (ligne, sévérité, heure, texte) ; carte/miniature « Carte de la métropole » (Vélôs / Parkings — **pas** pistes cyclables en engagement) ; panneau « Ajouter un favori » (desktop) / onglet Favoris (mobile). |
| **Out** | Bloc « Ce week-end dans la métropole » / agenda. Lien « Voir toutes les lignes » **n’ouvre pas** l’écran Trafic maquette : il étend la liste des perturbations sur place. Pistes cyclables : ignorées. |
| **Vide** | Pas de favori : cartes avec CTA « Choisir une station / ligne / quartier ». 0 perturbation : « Aucune alerte Tisséo en cours ». |
| **Erreur** | Source down : carte en état « donnée temporairement indisponible » + dernière maj connue, **pas** d’écran blanc. Géoloc refusée : cacher « 240 m / 3 min », garder le nom de station. |
| **Liens** | Carte Vélô → S4 ; météo/ATMO → S6 ; « Voir les parkings » / couche parkings → S5 ou S3 ; miniature carte → S3 ; engrenage / Réglages → S7. |
| **Terminé si** | Les 4 blocs favoris + perturbations + fraîcheur s’affichent, et chaque source peut tomber sans casser la page. |

---

## S3 — Carte métropole

| | |
| --- | --- |
| **But** | Voir où sont les vélos et les parkings, ouvrir une fiche. |
| **In** | Carte ; compteur de stations + horodatage ; filtres Vélôs / Parkings ; légende (5+ vélos, 1–4, vide, parking) ; markers cliquables. |
| **Out** | Couche pistes cyclables (nice-to-have, pas V1). |
| **Vide** | Aucun marker : message « stations indisponibles » + retry. |
| **Erreur** | Tuile carte / flux GBFS down : fond carte si possible + bandeau d’erreur. |
| **Liens** | Marker Vélô → S4 ; marker parking → S5 (détail) ; retour → S2. |
| **Terminé si** | On filtre Vélô vs parking et on ouvre une fiche depuis un marker. |

---

## S4 — Fiche station Vélô

| | |
| --- | --- |
| **But** | Décider si je vais à cette station maintenant. |
| **In** | Nom, adresse, distance si géoloc ; vélos dispo ; **dont électriques** (GBFS `electrical`) ; places libres / bornes ; état (en service / hors service) ; horodatage ; favori on/off ; stations à proximité (nom, code, distance, vélos, places) ; source JCDecaux / VélôToulouse ; lien Itinéraire (Maps externe). |
| **Out** | Prévision 30 min ; courbe 12 h ; « Signaler ». |
| **Vide** | Station inconnue : 404 douce → retour S2. |
| **Erreur** | Snapshot expiré : chiffres grisés + « dernière donnée à … ». Hors service : badge, chiffres à 0 si fournis. |
| **Liens** | Retour S2 ; station proche → S4 ; Itinéraire → app cartes. |
| **Terminé si** | Vélos, places, statut et source sont visibles ; favori bascule sur l’appareil. |

---

## S5 — Parkings

| | |
| --- | --- |
| **But** | Trouver un parking (ou un parc relais) avec places si la donnée existe. |
| **In** | Liste (nom, zone, tarif **si connu**, % occupé / libres / total **si connu**) ; carte des parkings ; panneau de sélection ; CTA « Y aller » (Maps). Bloc « Parc relais » **uniquement** si on a une source fiable ; sinon on le cache. |
| **Out** | Inventer un tarif ou un taux d’occupation. |
| **Vide** | Open data sans dispo : liste géolocalisée « disponibilité inconnue ». Aucun parking : message + retry. |
| **Erreur** | Même règle que S2 : dégradé, pas d’écran cassé. |
| **Liens** | Retour S2 ; depuis S3. |
| **Terminé si** | On liste les parkings ; la dispo s’affiche **ou** l’absence de donnée est explicite. |

---

## S6 — Météo et qualité de l’air

| | |
| --- | --- |
| **But** | Décider vélo / effort extérieur (météo du quartier + air de la métropole). |
| **In** | Quartier (météo) ; température, ressenti, min/max, résumé ; heure par heure ; 5 prochains jours ; **indice ATMO officiel 1–6** (libellé Bon → Extrêmement mauvais, couleur, polluant max) à l’échelle **Toulouse Métropole** ; conseil du jour déterministe. |
| **Out** | Score 0–100 type « 58 » ; ATMO par quartier / Saint-Cyprien ; liste d’autres quartiers. |
| **Vide** | Quartier non choisi : CTA vers S2 Favoris. |
| **Erreur** | Météo OK / ATMO KO (ou l’inverse) : l’autre bloc reste. Conseil masqué si les deux manquent. |
| **Liens** | Retour S2. |
| **Terminé si** | Météo courte + ATMO + conseil (quand les sources répondent). |

---

## S7 — Réglages briefing WhatsApp

| | |
| --- | --- |
| **But** | Allumer / régler / tester / couper le message du matin. |
| **In** | Toggle activation ; numéro masqué partiellement ; heure (Toulouse) ; jours L–D ; contenu : Vélô, Tisséo, météo/ATMO inclus ; parking **exclu par défaut** (comme la maquette) ; aperçu type WhatsApp avec STOP ; Envoyer un test. |
| **Out** | Modifier le texte libre du prompt au-delà de l’aperçu. Compte vérifié Meta : affichage honnête selon P4-03. |
| **Vide** | Pas de numéro : CTA « Ajouter un numéro » (même champs que S1.3). 0 favori : aperçu avec météo/ATMO ville seulement + invite à épingler. |
| **Erreur** | Test non envoyé : toast/bandeau, toggle inchangé. STOP reçu côté agent : toggle off au prochain chargement. |
| **Liens** | Retour S2. |
| **Terminé si** | On active, on change l’heure/les jours, on envoie un test, on comprend STOP. |

---

## Hors inventaire V1 (maquette présente, on n’en fait pas de fiches)

| Écran maquette | Sort |
| --- | --- |
| `/trafic & transports` | V2 ou jamais en V1 — perturbations = bloc S2 |
| `/sortir` | V2 |
| `/patrimoine` | V2 |
| `/bonnes adresses` | V2 |
| TouRose+ | V2 |
| Courbe 12 h / prévision 30 min Vélô | V2 |

---

## Points à valider en P1-02 (déjà proposés dans les fiches)

1. Skip onboarding autorisé.
2. 0 à 3 favoris, pas plus en V1.
3. Briefing 100 % optionnel.
4. Une source en panne ne casse pas S2.
5. Pas de couche pistes, pas d’agenda, pas de compte.
