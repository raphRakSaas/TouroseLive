# TouRose — façon de travailler

Source de vérité : ce fichier + `docs/BACKLOG.md` + `docs/SCOPE_V1.md` + `docs/SCREENS_V1.md` + `docs/FLOWS_V1.md` + `docs/ARCHITECTURE_V1.md` + `docs/DATA_MODEL_V1.md` + `docs/DECISIONS.md`.
Le canvas de suivi dans Cursor est un miroir visuel ; le backlog Git reste la référence.

## Principe

On ne code pas le produit tant que la phase en cours n’est pas **Prêt**.
Chaque session a un objectif unique, écrit en tête du backlog. On clôture en mettant à jour le backlog (statuts, notes, décisions).

## Phases (dans l’ordre, pas en parallèle)

| Phase | Nom | Sortie attendue | Code produit ? |
| --- | --- | --- | --- |
| P0 | Alignement | Méthode + backlog V1 figé + écarts maquette / CDC listés | Non |
| P1 | Gel de scope | Liste des écrans V1, exclusions, critères d’acceptation | Non |
| P2 | Cartographie UX | Inventaire écran par écran (maquette HTML → flux) | Non |
| P3 | Conception technique | Architecture, modèle de données, contrats API internes | Non |
| P4 | Spikes (timebox) | Preuves : sources open data, canal WhatsApp vs Telegram, ATMO | Spikes isolés seulement |
| P5 | Découpage d’implémentation | Tickets READY avec ordre et dépendances | Non |
| P6 | Construction V1 | Tranches verticales (une valeur utilisateur à la fois) | Oui |
| P7 | Usage réel restreint | Toi, Anita, cercle proche — avant toute V2 | Oui (correctifs) |

## Rituel de session

1. **Ouverture (2 min)** : lire l’objectif courant dans `BACKLOG.md`, confirmer qu’on ne dérive pas.
2. **Travail** : uniquement les tickets `now` / `in_progress`.
3. **Clôture (5 min)** : déplacer les tickets, noter les décisions dans `docs/DECISIONS.md`, écrire l’objectif de la session suivante.

Si une idée V2/V3 apparaît : on l’ajoute en `later`, on ne l’implémente pas.

## Définition de Prêt (un ticket)

- Problème utilisateur clair (ou livrable de plan clair)
- Hors exclusions V1 du cahier des charges
- Dépendances identifiées
- Critère de « terminé » en une phrase

## Définition de Terminé (un ticket)

- Critère d’acceptation vérifié
- Backlog mis à jour
- Si code : pas de secret dans le dépôt, source des données citée

## Rôles dans Cursor

- **Toi** : décide du scope, priorise, valide les maquettes et les choix (WhatsApp vs Telegram, stack).
- **L’agent** : propose, documente, tient le backlog à jour, n’avance pas de phase sans ton feu vert.

## Interdits volontaires (discipline de scope)

- Pas de V2 (événements, vocal, alertes temps réel, historique long) pendant P0–P6.
- Pas de multi-villes, pas d’app store, pas de social.
- Pas de « petit extra » sorti de la maquette s’il n’est pas dans `docs/SCOPE_V1.md`.
