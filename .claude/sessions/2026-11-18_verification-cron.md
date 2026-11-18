# 2026-11-18 · Vérification du cron et des notifications

## Reprise

```
✅ Fait      Quêtes et bilan du jour en prod, e-mails de test réservés à Adrien
⛔ Bloqué    Aucun
🎯 Priorité  Relire le premier bilan du jour et le rappel du boss (échéance 19/11)
```

## Réalisé
- Exécution n8n du 17/11 à 18 h 01 : succès (`considered: 3`) ; celle du 16/11 était en erreur, avant le correctif
- `NotificationLog` en production alimenté : provocation, tours d'Arène, relances, Nouveauté
- Nicolas prévenu par le cron de 18 h 01 qu'il avait la main (`arena-turn:…:8`) : point « prévenir Nicolas » refermé

## Reste à faire
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss, puis résultat du duel (relire n8n et `NotificationLog`)
- Premier vrai combat d'Arène et premier vrai défi avec Nicolas en production
- Parcours du tour injouable pas testé en navigateur : regarder le journal au prochain combat
- Pour que le vrai Nicolas teste un aperçu : retirer `PREVIEW_DIRECT_LOGIN` et `DEV_MAIL_TO` de Preview
- Effets non portés : impact sur l'attaque simple, aura des Bottes à l'évolution 5 (si le combat paraît encore sec)
- Base locale : une Arène de test `local-test` (à effacer si gênante)
- Toujours ouverts (session du 16/11) : relance Android app ouverte, textes de la carte du boss

## Blockers
- Aucun

## Décisions
- Lecture de la base de production par `neonctl connection-string main --project-id plain-smoke-71180083` (organisation Vercel), en lecture seule

---

## Suite : Quêtes et compagnons

### Réalisé
- Cadrage avec Adrien : une quête = une action de recherche d'emploi hors candidature, lancée à l'autre, validée à la main ; +20 XP pour celui qui la fait, +5 XP pour le donneur ; coffre ouvert d'office à la prochaine visite, 3 compagnons tirés au hasard, on en adopte un
- Cadrage `docs/specs/2026-11-18-quetes-design.md`, plan `docs/superpowers/plans/2026-11-18-quetes.md`
- Maquettes validées : https://claude.ai/artifact/86zZiZqnT4u6KJaabopjJG (`docs/maquettes/quetes.html`)
- PR #77 fusionnée dans `dev` : moteur `src/game/quests.ts`, migration `quests` (table `Quest`, `Player.companion`), actions, écrans `/quete/nouvelle`, `/quete/[id]`, `/coffre`, `/menagerie`, carte Quêtes sur l'accueil, compagnons sur l'accueil et dans l'Arène, 9e écran d'intro, succès Dompteur et Mentor, notifications « Quêtes » hors plafond ; 200 tests verts
- Revue indépendante de la branche : écran de coffre bloqué avec deux coffres, succès en retard, évolution non annoncée, coffre vide possible, élision « d'Adrien » ; tout corrigé
- Parcours testé en local à deux joueurs, mobile (320 et 390 px) et ordinateur
- Aperçu de `dev` construit sur Vercel après fusion (migration comprise)

### Reste à faire
- Tester les Quêtes sur l'aperçu de `dev` (https://goal-master-git-dev-adrienvidals-projects.vercel.app), puis mise en production sur accord d'Adrien
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss, puis résultat du duel
- Premier vrai combat d'Arène et premier vrai défi avec Nicolas en production
- Base locale : quêtes de test (dont `test-chest-2`) et Arène `local-test`, à effacer si gênantes
- Plus tard : accessoires portés par le héros, nouveaux compagnons quand les collections se remplissent

### Blockers
- Aucun

### Décisions
- Récompense visible plutôt qu'un chiffre : des compagnons à côté du héros ; accessoires écartés pour l'instant (à redessiner par personnage, évolution et pose)
- Tirage stocké sur la quête à la validation (l'ajout d'un animal au catalogue ne rebrasse rien) ; collection calculée
- Dernier compagnon restant : montré seul dans le coffre plutôt que donné en silence ; collection complète : XP seules, pas de coffre
- Notifications des quêtes hors plafond quotidien, une par étape, chaque « pas encore » renotifie

---

## Suite : e-mails (bilan du jour)

### Réalisé
- Relecture des notifications e-mail : une notification ratée n'était jamais retentée, un code de connexion qui ne part pas ne prévient personne, et un joueur actif recevait un e-mail par événement
- PR #80 : hors production, tout e-mail part vers DEV_MAIL_TO, et sans DEV_MAIL_TO rien ne part (avant, un aperçu sans la variable ou un `npm start` local écrivaient aux vraies adresses) ; CLAUDE.md aligné (#84)
- Maquette du bilan du jour validée : https://claude.ai/artifact/SX3pyJ8tfcHwpts9w4p1BR (`docs/maquettes/bilan-du-jour.html`)
- PR #81 : un seul e-mail par jour et par joueur, envoyé en fin de cron (18 h 01), qui regroupe les notifications en attente (compte du jour, résultat du duel encadré, liste horodatée) ; push inchangé ; migration `NotificationLog.event` / `mailedAt` ; spec `docs/specs/2026-11-18-bilan-du-jour-design.md`, plan `docs/superpowers/plans/2026-11-18-bilan-du-jour.md` ; 216 tests verts ; bilan réel envoyé en local vers DEV_MAIL_TO
- PR #79 (tours d'Arène en push seul) fermée, reprise dans #81 ; #82 : deux faux positifs du contrôle de design, exceptions limitées à un fichier
- Mise en production (#83, commit de fusion) : Quêtes et compagnons, #80, #81 ; déploiement Vercel réussi, migration appliquée par `vercel-build`. Le « Reste à faire » des Quêtes « mise en production » est donc fait, sans test préalable sur l'aperçu de `dev`

### Reste à faire
- Ce soir 18 h 01 : premier bilan du jour en production (relire n8n, `NotificationLog.mailedAt`, la boîte des deux joueurs)
- Code de connexion qui ne part pas : l'erreur est avalée (`src/server/auth.ts`), l'écran attend un code qui n'arrivera pas ; la laisser remonter
- Correction du point de ce matin « retirer `DEV_MAIL_TO` de Preview pour que Nicolas teste » : depuis #80, sans DEV_MAIL_TO plus rien ne part ; retirer seulement `PREVIEW_DIRECT_LOGIN`, et Adrien transmet le code
- Tester les Quêtes en production avec Nicolas (pas faites sur l'aperçu de `dev`)

### Blockers
- Aucun

### Décisions
- Le push reste l'alerte instantanée ; l'e-mail devient un bilan quotidien à 18 h 01, rien les jours sans nouvelle ; seul le code de connexion part tout de suite
- Le plafond de 2 par jour ne bloque plus que le push : une notification plafonnée figure quand même dans le bilan
- Tours d'Arène hors bilan (périmés le soir) ; catégories coupées hors bilan ; résultat du duel en tête
- Un envoi raté laisse les lignes en attente pour le bilan suivant
- Écartés : second bilan à midi, réglage de l'heure, retrait de ce que le joueur a déjà vu
- Scripts locaux avec `tsx --env-file` : charger `.env.local` avant `.env.development.local`, sinon la base Neon de développement prend le pas sur Docker


---

## Suite : Quêtes v2 après test sur l'aperçu

### Réalisé
- Retours d'Adrien : carte Quêtes austère et actions mélangées, nom du compagnon, Ménagerie introuvable
- Maquette v2 validée (même lien), cadrage §v2, plan `docs/superpowers/plans/2026-11-18-quetes-v2.md`
- PR #86 fusionnée dans `dev` : bandeau de quête reçue, ligne « Ta quête pour X » et 4e action « 📜 Quête » dans la carte du binôme, bouton Ménagerie, nom du compagnon (adoption, renommage, accueil, fil, Arène), migration `companion_names` ; 218 tests verts ; revue de branche corrigée
- Aperçu de `dev` reconstruit avec succès

### Reste à faire
- Adrien reteste les Quêtes v2 sur l'aperçu, puis mise en production sur accord
- Base locale : quêtes de test `t-in`, `t-out`, `t-chest3`, `test-chest-2`

### Décisions
- Tout ce qui vise le binôme vit dans sa carte (Motiver, Défier, Arène, Quête) ; la quête reçue s'annonce en bandeau, comme un défi ou une provocation
- Le nom du compagnon vit sur la quête qui l'a donné (`companionName`), vide = nom de l'espèce
