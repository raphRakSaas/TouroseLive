# Spike P4-03 — WhatsApp Business (15 août 2026)

Recherche docs Meta / n8n. **Aucun compte créé**, aucun message envoyé. Pas un tutoriel d’évasion des règles Meta.

## Synthèse

| Sujet | Conclusion V1 |
| --- | --- |
| Accès | **Cloud API Meta** (pas Twilio / BSP au lancement) : n8n a déjà le nœud, un seul facturier |
| Solo / auto-entrepreneur | Possible : Portfolio Meta + app WhatsApp + numéro **dédié** (pas ton WhatsApp perso) |
| Briefing du matin | **Toujours un template** pré-approuvé (hors fenêtre 24 h) |
| Catégorie probable | **Marketing**, pas Utility. Un digest quotidien ressemble à une newsletter, pas à un suivi de commande |
| STOP | Webhook inbound + footer template ; honorer **immédiatement** (déjà F-12) |
| Coût ordre de grandeur | Quelques centimes € / message livré en France si marketing ; **négligeable** pour le cercle proche |
| Blocage code dashboard | **Non.** On construit Angular + cache **avant** d’avoir le WABA prod |

## Parcours d’accès (humain, hors Cursor)

1. Compte Meta **établi** (pas un Facebook neuf le jour J) → [developers.facebook.com](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) : app « Connect with customers through WhatsApp ».
2. Business Portfolio (SIRET / auto-entreprise OK en principe) ; vérification business **plus tard** pour monter le plafond (~250 conv. / 24 h sans vérif., suffisant V1).
3. WhatsApp Business Account (WABA) + **numéro dédié** : ne jamais installer l’app WhatsApp grand public sur ce numéro.
4. Mode test : numéros destinataires **whitelist** dans le portail Meta. Suffisant pour toi + Anita.
5. Prod : app **Published**, nom d’affichage « TouRose », token **System User** (pas le jeton temporaire).
6. Webhook HTTPS public (n8n) : `messages` (STOP + statuts de livraison).

## Templates

Hors fenêtre 24 h, **seul** un template passe. Variables bornées, pas de texte Mistral (D-06).

Brouillon (à soumettre, Meta tranche la catégorie) :

```
Bonjour {{1}}. Toulouse, {{2}} — votre briefing.
Vélô : {{3}}
Tisséo : {{4}}
Météo : {{5}}
Air : {{6}}
Répondez STOP pour désactiver.
```

Règles Utility Meta (avr. 2025) : non promo **et** lié à une action / compte / sécurité. Un briefing météo-ville **échouera souvent en Utility** → on **prévoit Marketing**. Pas de « Bonne journée 🌸 » ni CTA promo dans le template.

« Envoyer un test » (S7) : même template (facturé si hors fenêtre). Un vrai SMS/WA libre n’existe que si l’utilisateur vient d’écrire.

## STOP et consentement

- Opt-in **explicite** S1.3 / S7 (RGPD + politique Meta).
- Inbound : `STOP`, `stop`, `Arrêt` → `enabled = false` sans toucher aux favoris.
- Ne pas renvoyer de template après opt-out.

## Coûts (à revérifier sur la rate card Meta au moment du premier envoi)

- Facturation **par template livré** depuis juil. 2025 (plus par conversation 24 h).
- Service (réponse dans les 24 h après un message user) : **gratuit**.
- Utility dans cette fenêtre : gratuit ; **hors fenêtre : payant**.
- Marketing : toujours payant hors fenêtre.
- France : ordre **~0,03 € utility / ~0,06–0,14 € marketing** selon rate card (évolutif ; docs Meta janv./août 2026).
- 10 abonnés × 22 matins ≈ 220 messages/mois → **quelques euros**, pas un risque financier V1.
- Carte bancaire Meta : plafond de dépense à poser (pas de cap par défaut).

n8n Cloud node : Send Template + webhook. Alternative HTTP Graph API si le nœud est limité.

## Découpage construction

| Avant WABA prod | Après (ou en parallèle test) |
| --- | --- |
| Dashboard, cache, favoris, S7 UI (aperçu local) | POST profil, cron n8n, template, STOP |

Le briefing n’est **pas** le premier ticket P6.

## Actions humaines (toi)

- [ ] Créer / lier Portfolio + app WhatsApp (quand on attaque l’agent, pas avant le dashboard)
- [ ] Numéro dédié
- [ ] Soumettre le template
- [ ] Noter la catégorie réelle (Utility vs Marketing)
- [ ] Brancher la carte + plafond

## Décision proposée D-09

Cloud API Meta + n8n. Template unique `tourose_briefing_matin`. Catégorie **attendue Marketing**. Dashboard P6 non bloqué par le WABA.
