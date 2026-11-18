# 2026-11-18 · Vérification du cron et des notifications

## Reprise

```
✅ Fait      Arène v2 en prod : PA, rejeu, direct, K.O. animé
⛔ Bloqué    Aucun
🎯 Priorité  Premier vrai tour en v2 avec Nicolas, fin du combat (échéance 20/11 17 h)
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

---

## Suite : retour visuel des boutons

### Réalisé
- Retour d'Adrien : aucun changement d'état ni chargement au clic, partout dans l'app
- PR #88 fusionnée dans `dev` : appui (le bouton s'enfonce), points clignotants sur les liens-boutons (`LinkButton`, `useLinkStatus`) et sur les boutons d'action (`BusyLabel`, `SubmitButton`), écran `loading.tsx` ; 218 tests verts, lint propre ; aperçu de `dev` reconstruit

### Reste à faire
- Adrien reteste sur l'aperçu (Quêtes v2 + boutons), puis mise en production sur accord

### Décisions
- Pas de maquette pour ce lot (accord d'Adrien) : comportement, pas un nouvel écran
- Les points remplacent le texte sans changer la largeur du bouton

---

## Suite : vitesse de chargement

### Réalisé
- Cause trouvée : fonctions Vercel à Washington (`iad1`, en-tête `x-vercel-id` de la prod), base Neon à Francfort ; chaque requête traversait l'Atlantique
- PR #90 fusionnée dans `dev` : `regions: ["fra1"]` dans `vercel.json` ; objectifs actifs chargés avec le jeu (`GameData.goals`, `activeGoal`), l'accueil passe de 7 à 4 allers-retours vers la base ; aperçu reconstruit

### Reste à faire
- Après la mise en production : remesurer `/connexion` (référence avant : 158 ms de médiane depuis Paris) et vérifier que `x-vercel-id` indique `fra1`

### Décisions
- Région des fonctions fixée dans `vercel.json` (versionnée) plutôt que dans les réglages du projet Vercel

---

## Suite : bouton « Valider » bloqué

### Réalisé
- Cause : décalage de version, l'aperçu a été redéployé (fusion de #90) pendant le test d'Adrien ; l'action a bien été faite côté serveur (POST 200, coffre ouvert chez l'autre), mais l'ancienne page n'a pas pu lire la réponse
- PR #92 fusionnée dans `dev` : un bouton qui charge plus de 8 s vérifie `/api/version` et recharge la page si la version a changé ; vérifié dans le navigateur (version simulée)

### Décisions
- Ne plus fusionner dans `dev` pendant qu'Adrien teste l'aperçu (mémoire `pas-de-deploiement-pendant-test`)

---

## Suite : coffre v3 et mise en production

### Réalisé
- Ménageries vidées sur l'aperçu (branche Neon `preview/dev`) et en local : compagnons, noms et coffres en attente effacés ; quêtes et XP gardées
- Bandeau « pas encore » sur l'accueil du destinataire (PR #94)
- Coffre v3 : maquette animée validée (entrée « Coffre v3 »), puis codé (PR #95) : trois coups, apparition une à une, collection x/6, XP qui monte à l'adoption ; testé en local à 390 px
- Décision d'Adrien : mettre `dev` en production avant d'attaquer la prochaine fonctionnalité

- **Mise en production** (PR #97, commit de fusion) : déploiement OK ; production servie depuis `fra1` (`x-vercel-id`) ; `/connexion` 98 ms de médiane contre 158 ms avant ; migrations `quests`, `notification_digest`, `companion_names` appliquées ; aucune quête encore en production

### Reste à faire
- Prochaine fonctionnalité : à cadrer avec Adrien (branche partie de `dev`, maquette d'abord)
- Branche distante `fix/test-mail-only-to-dev` (contenu déjà fusionné par #80) : à supprimer sur accord d'Adrien

### Décisions
- Pendant un test de l'aperçu, rien n'est fusionné dans `dev` ; les documents de session attendent la fin du test

---

## Suite : code de connexion qui ne part pas

### Réalisé
- Cause : Better Auth envoie le code en tâche de fond et avale l'erreur (`runInBackgroundOrAwait`), notre `.catch` n'y changeait rien
- PR #99 fusionnée dans `dev` : le code est noté sur le contexte de la requête, un hook « après » l'envoie en l'attendant ; échec → 503 `MAIL_FAILED` et « Le code n'a pas pu partir. Réessaie dans un instant. » ; vérifié en local (SMTP faux puis vrai), 218 tests verts
- Branche distante `fix/test-mail-only-to-dev` supprimée (accord d'Adrien)
- Point « code de connexion qui ne part pas » du bilan du jour : refermé
- Mise en production sur accord d'Adrien (PR #101, commit de fusion) : déploiement Vercel réussi

### Reste à faire
- Ce soir 18 h 01 : premier bilan du jour en production ; jeudi et vendredi : rappel du boss, puis duel
- Prochaine fonctionnalité : à cadrer avec Adrien

### Décisions
- Envoi du code dans le hook « après » plutôt que retirer `backgroundTasks` : les autres tâches de fond (limiteur de débit) restent confiées à `after()`

---

## Suite : Arène v2 (jeu à part)

### Réalisé
- Cadrage avec Adrien : l'Arène ne dépend plus des candidatures ; stats toujours selon l'évolution ; « Énergie » devient « PA » ; rejeu des coups adverses au retour ; combat en direct à deux
- Maquette validée : https://claude.ai/artifact/Uk8K3M2Zt568hcMHccvVX1 (`docs/maquettes/arene-v2.html`)
- Cadrage mis à jour (`docs/specs/2026-11-17-arene-design.md`, sections v2), plan `docs/superpowers/plans/2026-11-18-arene-v2.md`
- PR #103 fusionnée dans `dev` : +3 PA par tour (gardés, 6 au plus), +1 PA de départ pour le moins évolué, Parade encaissée = +1 PA, 2 potions au départ ; rejeu un par un avec bandeau et « Passer », jusqu'au K.O. puis « Voir le résultat » ; rafraîchissement 3 s et pastille de présence (migration `arena_seen`, `Player.arenaSeenAt`) ; textes accueil, provocation, intro, notifications, résultat
- Combat en cours en production rejoué en lecture seule avec le nouveau moteur : pas d'erreur ; Adrien 12/30, Nicolas 22/32, 6 PA chacun, main à Nicolas jusqu'au 19/11 15 h 12
- Relecture indépendante : 6 points d'affichage, tous corrigés ; testé en local à 390 px (rejeu, direct, Parade, K.O.) ; 214 tests verts, build OK ; aperçu de `dev` reconstruit
- Exceptions du détecteur de design pour la maquette v2 (faux positifs de contraste, police pixel) dans `.impeccable/config.json`

### Reste à faire
- ~~Test sur l'aperçu puis mise en production~~ : fait (voir ci-dessous)
- Prévenir Nicolas du changement de règles

### Décisions
- PA = colonne `energy` dans le code (pas de renommage en base) ; bonus de départ calculé depuis les évolutions, colonnes `challengerEnergy` / `opponentEnergy` ignorées
- Présence par une date notée à chaque affichage de `/arene` plutôt qu'une connexion permanente ; présent = vu il y a moins de 10 s
- Rejeu mémorisé par appareil (stockage local) ; sans trace, seulement les coups adverses depuis mon dernier coup
- Un combat fini reste affiché sur `/arene` une heure, pour rejouer le K.O. avant le résultat
- Écartés : nouvelle action, chat, emotes, notification spéciale « l'Arène change »

---

## Suite : retours d'Adrien sur l'aperçu, mise en production de l'Arène v2

### Réalisé
- Étourdissement incompris : une seule barre (PA), actions restantes et pastille « 💫 étourdi » dans le bandeau du tour, raison sous chaque action grisée (#105, #106)
- Fin du combat : pose K.O., « K.O. ! » ou « Temps écoulé ! » 2,2 s, puis le résultat s'ouvre tout seul chez les deux (#107)
- Action grisée touchée : message de raison 3 s (pas ton tour, PA manquants, plus de potion, rejeu en cours) (#108)
- Arènes purgées à la demande d'Adrien sur l'aperçu (2 combats, 48 actions, 31 notifications) et en local ; production non touchée
- **Mise en production** sur accord d'Adrien (PR #109, commit de fusion) : déploiement OK, migration `arena_seen` appliquée, combat en cours lisible (fin le 20/11 17 h UTC = 18 h Paris)

### Reste à faire
- Prévenir Nicolas que l'Arène a changé (3 PA par tour, plus de lien avec les candidatures)
- Vendredi 20/11 à 18 h 01 : fin du combat (résultat, couronne, notification), rappel du boss et duel
- Base locale : plus d'Arène de test

### Décisions
- PA et actions restent deux limites distinctes (fusion écartée : 6 attaques d'un coup = K.O. en un tour)
- Le message d'action bloquée reste dans l'écran, pas de notification push
- Une action grisée est `aria-disabled` (touchable), plus `disabled`

