# 2026-11-18 · Vérification du cron et des notifications

## Reprise

```
✅ Fait      Fonds vivants en prod (animés, heure de Paris, forme de l'écran)
⛔ Bloqué    Aucun
🎯 Priorité  Prévenir Nicolas, vérifier le duel du boss (échéance 20/11 18 h)
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


---

## Suite : skills de jeu et équilibrage de l'Arène (v3)

### Réalisé
- Skills `game-feel`, `rpg` et `game-ui-ux` installés dans le projet seulement (PR #112)
- Diagnostic par simulation (règles v2) : l'ouvreur gagnait 92 %, une évolution d'écart 94 %, le Panda 1 % contre le Chevalier, la Botte était perdante, 3-4 tours par combat
- Cibles validées par Adrien, puis PR #113 fusionnée dans `dev` : règles versionnées par combat (`Arena.rules`, migration `arena_rules`, combats existants en v2), règles v3, test d'équilibrage `src/game/arena-balance.test.ts`, textes (provocation, Arène, intro, résumé de tour), cadrage §v3 ; 228 tests verts ; aperçu de `dev` construit
- Mesures v3 sur 1 000 combats : ouverture ~60 %, une évolution d'écart 59-61 %, écart maximal ~75 %, Panda 54 %, Botte 63 %, 9,4 tours

### Reste à faire
- Vendredi 20/11 à 18 h 01 : fin du combat en cours (v2), rappel du boss, duel
- Après la fin du combat : mettre la v3 en production sur accord d'Adrien
- Prévenir Nicolas : nouvelles règles de l'Arène (v2 puis v3)
- Tester un combat v3 sur l'aperçu de `dev`
- Plus tard, si le combat paraît sec : `game-feel` (tremblement, gel à l'impact), dégâts flottants du Bambou tourbillon sur l'adversaire

### Blockers
- Aucun

### Décisions
- Règles figées par combat plutôt qu'une date de bascule : un combat ne change jamais de règles en cours de route
- Ouverture à ~60 % et écart maximal à ~75 % : en limite haute des cibles, acceptés
- Bambou tourbillon : 1 action perdue à tous les paliers (2 au dernier palier écrasaient le Chevalier)
- Écartés : coup critique (affichage à part), nouvelle action, notification « les règles changent »

---

## Suite : retours d'Adrien sur la v3 (Panda, actions et PA)

### Réalisé
- Panda penché et rayé : depuis la v3, le premier tour plus court de l'ouvreur passait pour un étourdissement ; `isStunned` testé ; un sprite incliné laissait voir le fond entre ses rangées de pixels, corrigé par un léger chevauchement des rangées
- « 2 actions » à côté de « 4 PA » prêtait à confusion : en v3, les PA sont la seule limite d'un tour ; le Bambou tourbillon retire 1 PA au tour suivant ; le lanceur reçoit 3 PA, celui qui répond part avec 1 PA ; chiffres réajustés (PV 48 + 2 × évolution, Coup d'estoc 4+palier à 12+palier, Bambou 3 dégâts et +1+palier PV)
- Mesures (1 000 combats) : ouverture 58 %, une évolution d'écart 55-56 %, écart maximal 75 %, Panda 51-54 %, Botte 50 %, 8,3 tours ; le test tolère 2 points de bruit de mesure
- PR #115 fusionnée dans `dev` (231 tests verts), aperçu reconstruit ; combat v3 vérifié en local
- Arènes purgées sur l'aperçu à la demande d'Adrien (2 combats, leurs actions, 21 notifications) ; production non touchée

### Reste à faire
- Adrien teste un combat v3 sur l'aperçu
- Vendredi 20/11 à 18 h 01 : fin du combat en cours (v2), puis v3 en production sur accord
- Prévenir Nicolas des nouvelles règles

### Décisions
- Un seul compteur, les PA ; la v3 n'étant pas en production, modifiée sur place plutôt qu'une v4
- Écartés pour l'instant (idées d'Adrien) : recharge de 1-2 tours sur la Botte (deuxième compteur, aucun abus mesuré) et attaque ultime à charger (troisième compteur, nouvelle action et animations : lot à cadrer avec maquette si l'idée revient après de vrais combats)

---

## Suite : bouton d'acceptation et mise en production de la v3

### Réalisé
- Retour d'Adrien : le bouton qui accepte une provocation disait « Entrer dans l'Arène » ; devenu « Accepter le combat », lien de l'e-mail « Répondre à la provocation » (PR #117)
- Branches nettoyées (seules `dev` et `main` restent)
- **Mise en production** sur accord d'Adrien (PR #118, commit de fusion) : déploiement Vercel réussi, migration `arena_rules` appliquée ; le combat en cours en production est bien resté en règles v2 (fin le 20/11 18 h) ; les prochaines provocations partiront en v3
- Le « Reste à faire » « v3 en production après la fin du combat » est donc fait plus tôt, sans risque pour le combat en cours grâce aux règles figées par combat

### Reste à faire
- Prévenir Nicolas : nouvelles règles de l'Arène (valables à partir du prochain combat)
- Vendredi 20/11 à 18 h 01 : fin du combat v2 (résultat, couronne, notification), rappel du boss et duel
- Premier vrai combat v3 : regarder si le Bambou tourbillon ou la Botte sont abusés (piste : recharge) avant toute attaque ultime

---

## Suite : purge des Arènes en production

### Réalisé
- À la demande d'Adrien : combat v2 en cours supprimé en production (1 Arène, 10 actions) avec ses 7 notifications d'Arène (`arena:*`, `arena-turn:*`), en une transaction ; aucun succès d'Arène n'était débloqué ; XP, candidatures, quêtes intactes
- Le « Reste à faire » « vendredi : fin du combat v2 (résultat, couronne) » tombe : plus de combat en cours

### Reste à faire
- Prévenir Nicolas : Arène remise à zéro, règles v3 (3 PA par tour, plus de lien avec les candidatures)
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss puis duel (inchangés, indépendants de l'Arène)
- Premier vrai combat v3 : regarder si le Bambou tourbillon ou la Botte sont abusés
- Prochaine fonctionnalité : à cadrer avec Adrien

### Décisions
- Le duel du vendredi contre le boss est gardé : il ne dépend que des candidatures et des niveaux, pas des règles de l'Arène

---

## Suite : lot Impact (effets de l'Arène)

### Réalisé
- Relance reçue en prod vérifiée : envoyée par Nicolas le 18/11 à 12 h 45
- Cadrage du lot avec Adrien (skill `game-feel`) : effets seulement, ni règles ni chiffres
- Maquette animée validée : https://claude.ai/artifact/M6BXDH9vaLciTTvq2wJ55J (`docs/maquettes/arene-impact.html`)
- PR #121 fusionnée dans `dev` : barème `src/lib/arenaImpact.ts` (testé), élan et ruée de l'attaquant, gel de la scène au contact (60 / 120 / 250 ms), tremblement décroissant, flash, étincelles, chiffres qui rebondissent, « Paré ! » et « +1 PA », dégâts du Bambou sur la cible, PV qui changent au contact pendant le rejeu, traînée des barres de PV, chute au K.O., flash et « K.O. ! » qui claque ; mode « réduire les animations » en teinte ; 236 tests verts
- Vérifié en local à 390 px (coup joué, rejeu, K.O. jusqu'au résultat) ; testé par Adrien sur l'aperçu
- Mise en production sur accord d'Adrien

### Reste à faire
- Prévenir Nicolas : Arène remise à zéro, règles v3, nouveaux effets
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss puis duel
- Premier vrai combat v3 : Bambou tourbillon ou Botte abusés ?
- Plus tard si besoin : son, vibration du téléphone (écartés de ce lot)

### Décisions
- Au rejeu, les PV changent au contact du coup, plus à son départ
- Pour mon propre coup, les chiffres arrivent avec la réponse du serveur : affichés tout de suite s'ils arrivent après le contact
- La chute au K.O. se joue quand les PV passent à zéro sous les yeux, pas à l'ouverture d'un combat fini
- Mode « réduire les animations » : pas de mouvement du corps (règle existante de l'app), teinte rouge au lieu du flash ; la maquette gardait l'élan
- Scripts de test locaux : écrire les dates en UTC (`now() at time zone 'UTC'`), sinon le pilote `pg` décale d'une heure et les coups passent « dans le futur »

---

## Suite : Bottes plein écran

### Réalisé
- Recherche de skills d'animation (`find-skills`) : rien à installer, l'Arène garde CSS et Web Animations
- Maquette animée validée (mobile, ordinateur en fenêtre entière, mouvements niveau B) : https://claude.ai/artifact/Ki46GFJCGM5Wi2GeAenQnV (`docs/maquettes/arene-botte.html`)
- Spec `docs/specs/2026-11-18-arene-bottes-plein-ecran-design.md`, plan `docs/superpowers/plans/2026-11-18-arene-bottes-plein-ecran.md`, une relecture
- PR #124 fusionnée dans `dev` : barème `src/lib/arenaBotte.ts` (testé), `tierOf` exporté des règles, `spriteLayers` (corps et arme séparés, testé), composant `BotteCutIn`, branchement dans `ArenaLive` (mon coup et rejeu) ; 244 tests verts
- Vérifié en local à deux joueurs : estoc ★★★ téléphone, tourbillon ★★ ordinateur, rejeu par la droite, réduire les animations, tap pour passer ; correctif : PV figés pendant ma propre séquence
- Testé par Adrien sur l'aperçu, **mise en production** sur son accord (PR #125)

### Reste à faire
- Prévenir Nicolas : Arène remise à zéro, règles v3, effets d'impact et Bottes plein écran
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss puis duel
- Premier vrai combat v3 : Bambou tourbillon ou Botte abusés ?
- Base locale : Arène de test en cours (Adrien évol. 6 contre Nicolas évol. 4), à effacer si gênante
- Plus tard si besoin : son et vibration, style des encadrés à barre gauche (`.err`, `.arena-hint`, `.note`) signalé par impeccable

### Décisions
- Palier de la mise en scène = `tierOf(levelForm)` des règles ; sprite du bandeau = forme affichée
- « PERCE LA PARADE ! » seulement sur mon coup (l'état de Parade d'un coup passé n'est pas connu au rejeu)
- Sur ordinateur, la séquence couvre toute la fenêtre, pas la scène seule
- Pendant ma séquence, les PV gardent leur valeur de départ ; la confirmation du serveur est appliquée au départ de l'impact

---

## Suite : fonds vivants

### Réalisé
- Skill `pixel-art-sprites` (omer-metin, 3,3 K installations) installé dans le projet
- Maquette animée validée : https://claude.ai/artifact/2cA5UyXq8xefDD6i11XdpY (`docs/maquettes/fonds-vivants.html`) ; corrigée après retours d'Adrien (bâtiments, chalet et sapins qui flottaient au-dessus des collines ; recadrage sur téléphone)
- Cadrage `docs/specs/2026-11-18-fonds-vivants-design.md`, plan `docs/superpowers/plans/2026-11-18-fonds-vivants.md`
- PR #127 fusionnée dans `dev` : logique testée `src/lib/landscapes.ts` (taille de toile, moment de la journée, heure de Paris, recentrage), moteur `src/lib/landscapeArt.ts`, composant `Landscape` (boucle 8 i/s, pause page cachée, mouvement réduit, redimensionnement), ancien château gardé pour l'en-tête e-mail (`src/lib/emailCastle.ts`) ; 251 tests verts, lint et build OK
- Vérifié en local : téléphone 390 × 844 (fond 130 × 282) et ordinateur 1440 × 900 (288 × 180)
- **Mise en production** sur accord d'Adrien (PR #129, commit de fusion) : déploiement Vercel réussi

### Reste à faire
- Regarder les fonds en journée sur un vrai téléphone (vérifiés seulement de nuit en local)
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss puis duel
- Prévenir Nicolas : Arène remise à zéro, règles v3, effets d'impact, Bottes plein écran, fonds vivants

### Décisions
- Paysages dessinés par le code plutôt qu'en images : s'adaptent à toute forme d'écran
- Toile à la forme de l'écran, pixels entiers, au moins 120 × 180 ; l'élément principal se recentre au lieu d'une version compacte (il tient dès 120 de large)
- Noms sans moment de la journée (« Château », « Montagnes ») ; pas de migration
- Intro inchangée : pas de nouveau geste, donc ni `INTRO_STEP_COUNT` ni `LATEST_NEWS`
