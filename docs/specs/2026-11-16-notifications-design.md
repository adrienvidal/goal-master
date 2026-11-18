# Notifications : Web Push + e-mail

Maquette validée : https://claude.ai/artifact/T7UcytDdGCRdEMB4uwnFNu (`docs/maquettes/notifications.html`).

## Règles

- Chaque notification part **en Web Push** (appareils abonnés), tout de suite. **L'e-mail est remplacé par le bilan du jour** (un seul e-mail à 18 h 01) : voir `2026-11-18-bilan-du-jour-design.md`.
- Cinq catégories, coupables dans `/reglages` ; une catégorie coupée se tait sur les deux canaux.
- **Plafond : 2 notifications « plafonnées » par jour (Paris) et par personne.** Hors plafond : relance reçue, rappel du jeudi, résultat du duel. Au-delà, abandon (jamais reporté).
- Chaque notification a une **clé** unique par joueur : elle n'est envoyée qu'une fois, même si l'événement se rejoue (annulation puis nouvel ajout, cron relancé).
- Aucun nom d'entreprise dans un texte.

| Événement | Catégorie | Plafonné | Clé | Déclencheur | Clic |
|---|---|---|---|---|---|
| Relance reçue | Relances | non | `nudge:<id>` | `sendNudge` | `/` |
| Relance qui a marché (à l'expéditeur) | Relances | oui | `nudge-ok:<id>` | `addApplication` | `/` |
| Binôme a changé de forme | Binôme | oui | `evo:<joueur>:<forme>` | `addApplication` | `/` |
| Boss K.O. par le binôme | Binôme | oui | `ko:<vendredi>` | `addApplication` | `/` |
| Rappel du jeudi | Duel | non | `remind:<vendredi>` | cron, jeudi | `/` |
| Résultat du duel | Duel | non | `duel:<vendredi>` | cron, vendredi | `/duel` |
| Avatar qui rouille (≥ 3 jours ouvrés) | Rappels | oui | `rust:<dernier jour actif>` | cron, chaque jour | `/` |
| Nouveauté | Nouveautés | oui | `news:<INTRO_STEP_COUNT>` | cron, chaque jour | `/intro` |

## Données (une migration)

- `Player.mutedCategories String[] @default([])` : catégories coupées.
- `NotificationLog { id, playerId, key, capped, sentAt }`, unique `(playerId, key)` : déduplication et comptage du plafond. Ce n'est pas un état de jeu (l'XP reste calculée).

## Envoi (`src/server/notify.ts`)

`notify(playerId, event)` : catégorie coupée → rien ; plafond atteint → rien ; insertion du journal (la contrainte unique garantit l'envoi unique) ; puis push + e-mail (push seul pour les tours d'Arène). Les envois déclenchés par une action passent dans `after()` pour ne pas ralentir la réponse. Décisions pures (plafond, rouille, évolution, K.O.) dans `src/game/notifications.ts`, testées.

## Cron

Un seul cron quotidien `/api/cron/daily`, appelé par n8n (auto.webnrolls.com, workflow « Goal Master · cron quotidien ») chaque jour à 18 h 01 heure de Paris, avec l'en-tête `Authorization: Bearer CRON_SECRET` (identifiant n8n limité au domaine goal.viloris.io). Il remplace le cron Vercel, dont l'heure n'était précise qu'à l'heure près et en UTC.

## Dans l'app

- **Réglages** : section Notifications (canaux + 5 interrupteurs), deux colonnes à partir de `md`, une colonne en mobile.
- **Push** : `PushSetup` factorisé ; état « indisponible » distingue iPhone (étapes d'installation) et autres navigateurs ; bouton Désactiver.
- **Bandeau de relance** : croix (fermeture retenue par appareil), « Relance réussie » 4 s après une candidature qui la valide.
- **Nouvelle version** : `/api/version` (commit déployé) ; vérifié au retour sur l'onglet et toutes les 5 min ; bandeau fixe en haut avec « Recharger ».
- **E-mail** : gabarit unique (bandeau, titre, phrase, bouton, lien vers les réglages).

## Hors périmètre

ntfy, Telegram, résumé hebdomadaire, choix du canal par catégorie.

## Plan

1. Migration + logique pure + tests (`src/game/notifications.ts`).
2. `notify()` + gabarit d'e-mail ; relance reçue branchée dessus.
3. Événements d'`addApplication` (relance réussie, évolution, K.O.).
4. Cron quotidien (rappel, résultat, rouille, nouveauté) ; `vercel.json`.
5. Réglages : section Notifications, `PushSetup` factorisé, catégories.
6. Bandeaux : relance (croix, réussite), nouvelle version.
7. Vérification responsive 375 / 1280, `npm test`, PR.

## Addendum : e-mails 8 bits

Maquette : section E-mail de https://claude.ai/artifact/T7UcytDdGCRdEMB4uwnFNu.

- **Images PNG générées par l'app**, sans dépendance : un encodeur PNG maison (`zlib`), un canevas de pixels qui imite `fillRect` pour réutiliser `drawLandscape`, les sprites (`sprite()`), les boss (`bossSprite()`) et l'épée.
  - `GET /api/email/header` : paysage Château de nuit recadré, épée, « GOAL MASTER » en police bitmap 5 × 7 dorée.
  - `GET /api/email/scene?s=…` : acteurs côte à côte sur fond pierre. Jetons : `hero.PERSONNAGE.COULEUR.FORME.POSE[.rust|.hurt]`, `boss.N[.down]`. Validation stricte, sinon 400. Images publiques (aucune donnée privée), cache d'un an.
- **Rouille** : sprite en humeur fatiguée (palette rouille de l'app). **Blessé** : désaturé comme le filtre `.hurt`. **Boss vaincu** : en gris.
- **Scène par événement** : relance → l'expéditeur en victoire ; relance réussie, évolution → le binôme en victoire ; K.O. → binôme + boss à terre ; rappel → le boss ; duel gagné → les deux en victoire + boss à terre ; perdu → les deux blessés + boss ; rouille → son propre avatar rouillé ; nouveauté → les deux héros.
- **HTML** : 560 px max, largeur fluide, images `width:100%` sur mobile ; titres en Press Start 2P (Apple Mail), sinon Courier ; bouton doré à relief en bordures.

### Plan
1. Encodeur PNG + canevas de pixels + police bitmap, testés.
2. Images d'en-tête et de scène, jetons validés, deux routes.
3. Scène par événement (pure, testée) et gabarit HTML 8 bits.
4. Vérification : rendu des e-mails en 375 et 1280 px, `npm test`, PR.
