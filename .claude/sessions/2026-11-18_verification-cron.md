# 2026-11-18 · Vérification du cron et des notifications

## Reprise

```
✅ Fait      Cron du 17/11 vérifié, Quêtes et compagnons sur dev
⛔ Bloqué    Aucun
🎯 Priorité  Tester les Quêtes sur l'aperçu de dev, puis mise en prod (échéance 19/11)
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
