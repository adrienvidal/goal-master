# Notifications : Web Push + e-mail

Maquette validée : https://claude.ai/artifact/T7UcytDdGCRdEMB4uwnFNu (`docs/maquettes/notifications.html`).

## Règles

- Chaque notification part **en Web Push** (appareils abonnés) **et par e-mail** (toujours, sans interrupteur propre).
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

`notify(playerId, event)` : catégorie coupée → rien ; plafond atteint → rien ; insertion du journal (la contrainte unique garantit l'envoi unique) ; puis push + e-mail. Les envois déclenchés par une action passent dans `after()` pour ne pas ralentir la réponse. Décisions pures (plafond, rouille, évolution, K.O.) dans `src/game/notifications.ts`, testées.

## Cron

Un seul cron quotidien `/api/cron/daily` à `0 17 * * *` (UTC ; Hobby = une fois par jour, dans l'heure), soit 18 h–19 h Paris l'hiver, 19 h–20 h l'été : toujours après le duel du vendredi 18 h. Il remplace `/api/cron/duel-reminder`.

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
