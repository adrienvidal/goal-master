# 2026-11-19 · Encart Goal Master dans job-finder

## Reprise

```
✅ Fait      Mode libre vivant, boss final et attaque ultime en prod
⛔ Bloqué    Aucun
🎯 Priorité  Duel du 20/11 18 h, puis trancher les 3 cas du boss à l'échéance
```

## Réalisé
- Point « prévenir Nicolas » abandonné à la demande d'Adrien (plus de message à lui écrire)
- Cadrage avec Adrien : un encart dans job-finder montre le héros ; une candidature passée à « envoyée » compte dans Goal Master et joue la victoire. Pour Nicolas aussi : une mise à jour et un clic « Relier », sans copier de clé ; job-finder caché par défaut pour les autres amis ; mise à jour automatique par `/collect` ensuite (Nicolas a cloné le dépôt)
- Maquettes validées : https://claude.ai/artifact/RxGMgkLbRr2nGRqyYyphxc (`docs/maquettes/encart-job-finder.html`)
- Cadrage `docs/specs/2026-11-19-encart-job-finder-design.md`, plan `docs/superpowers/plans/2026-11-19-encart-job-finder.md` ; relecture du cadrage, du plan et de la branche
- PR #131 fusionnée dans `dev` : table `WidgetKey` et `Application.externalRef` / `source` (migration `widget_link`), ajout de candidature partagé (`src/server/applications.ts`), `/relier`, retour après connexion (`?retour=`), API `/api/widget/state` et `/api/widget/applications`, `/widget`, bloc job-finder des réglages, page d'essai `scripts/essai-job-finder.mjs` ; 277 tests verts
- Parcours joué dans le navigateur en local : liaison avec connexion, victoire avec passage de niveau et nouvelle forme, lien coupé
- Corrigés après relecture : redirection extérieure par tabulation dans `retour`, double rattachement d'une saisie, bandeau de version dans l'encart
- **Mise en production** sur accord d'Adrien (PR #132, commit de fusion) : déploiement réussi, `/widget`, `/relier` et l'API vérifiés sur goal.viloris.io
- Note de passation pour job-finder : `docs/passation/2026-11-19-encart-job-finder-lot2.md` (PR #133)
- Archivage : rien à archiver (la session du 16/11 porte encore le chantier du duel du boss)
- Soir : PR #135 fusionnée dans `dev` (maquette de l'encart : rond dans la barre de job-finder à la place de la case du profil, plus d'état « Replié », encart affiché par défaut ; suit la PR job-finder-claude #241) ; maquette publiée en version 5
- Soir : mise en production sur accord d'Adrien (documentation seule : note de passation, maquette, résumés de session)
- Soir : archivage vérifié, rien à archiver (16/11 porte toujours le duel du boss)
- Fin de soirée : boss adouci arrivé dans `dev` par la PR #140 (une autre session, dans le même dossier, a emporté ces commits ; #139 fermée comme doublon). PV = le plus doux du rythme de départ (objectif ÷ vendredis de l'objectif) et du rythme qui reste : le retard ne fait plus grossir le boss, l'avance le fait maigrir. Coups d'entraide : relance suivie d'effet avant le duel = 1 coup pour qui relance, quête validée dans la semaine = 1 coup pour qui l'a faite. Écran de résultat « dont n d'entraide », texte de l'intro du boss, règle du CLAUDE.md ; 281 tests verts
- Fin de soirée : **mise en production** du boss adouci sur accord d'Adrien
- Fin de soirée : archivage vérifié, rien à archiver (16/11 porte toujours le duel du boss)
- Nuit : mis à jour avec job-finder-claude. **Lot 2 fait côté job-finder** (#241 fusionnée dans leur `dev`, testée de bout en bout), pas encore en production chez eux
- Nuit : maquette des trois modes de l'encart validée par Adrien (version 3, écran 6 « Nouvelle forme » compris) : https://claude.ai/artifact/S7LLMZcTPg4dxT2hAU5Kek (`docs/maquettes/encart-modes.html`) ; PR #140 (maquette et passation)
- Nuit : cadrage `docs/specs/2026-11-19-encart-modes-et-evolution-design.md`, plan `docs/superpowers/plans/2026-11-19-encart-modes-et-evolution.md`, une relecture du cadrage et une de chaque branche, points corrigés
- Nuit : **PR #143 fusionnée dans `dev`** (lot A) : `/widget?mode=normal|small|free`, tailles fixes 260 × 130, 130 × 50, page entière ; victoire dans la boîte ; nouvelle forme en silhouette ; paysage plus dessiné quand il est caché (plantait dans l'iframe de 50 px) ; page d'essai avec choix du mode. Vérifié au navigateur, trois modes
- Nuit : **PR #144 fusionnée dans `dev`** (lot B) : `Player.seenForm` (migration `seen_form`), scène existante de l'accueil jouée une fois tous appareils confondus, encart / image du bilan / coffre plafonnés à la forme vue, notification « Ton héros a évolué ! » au joueur lui-même. Vérifié en local ; 307 tests verts
- Nuit : **PR #146 fusionnée dans `dev`**, à la demande d'Adrien : l'annonce de nouvelle forme reste dans l'encart (silhouette, « NOUVELLE FORME ! Va la voir », « ÉVOLUE ! », « ! » en libre) tant que la scène n'a pas été vue ; 308 tests verts
- Nuit : base locale préparée pour l'essai de l'évolution (5 candidatures « Essai niveau n » sur des jours passés, Adrien à 190 XP, forme vue 2)
- Nuit : **mise en production** sur accord d'Adrien (PR #148, commit de fusion) : déploiement réussi, migration `seen_form` passée, `/widget?mode=small|free` et `/connexion` vérifiés sur goal.viloris.io ; serveurs locaux arrêtés
- Nuit : archivage vérifié, rien à archiver (16/11 porte toujours le duel du boss)
- Fin de nuit : mode libre retravaillé à la demande d'Adrien. Maquette validée (fréquences revues : monstre toutes les 2 à 5 min, un compagnon de passage toutes les 2 à 4 min) : https://claude.ai/artifact/Nq2q3X1CqiokjB4JvWvtPc (`docs/maquettes/encart-libre-vivant.html`) ; cadrage `docs/specs/2026-11-19-encart-libre-vivant-design.md`, plan `docs/superpowers/plans/2026-11-19-encart-libre-vivant.md`
- Fin de nuit : **PR #150 fusionnée dans `dev`** : `Player.walkers` (migration `walkers`, recopie du compagnon affiché), interrupteurs « En balade dans job-finder » dans la Ménagerie (3 au plus), `FreeScene` (héros, compagnon de passage, slime / chauve-souris / champignon, bulle au clic), relais `goal-master:hitboxes` / `goal-master:poke` joué dans `scripts/essai-job-finder.mjs` (`?vitesse=` pour accélérer, hors production), passation `docs/passation/2026-11-19-encart-libre-vivant.md`. Une relecture indépendante (scène remise au repos au redémarrage, interrupteur des Réglages réutilisé) ; 322 tests verts ; vérifié au navigateur, Ménagerie en 390 et 1280 px
- Fin de nuit : travail fait dans une copie séparée du dépôt (une autre session tournait dans le dossier), retirée après fusion
- Fin de nuit : **mise en production** du mode libre vivant sur accord d'Adrien (PR #152, commit de fusion) : déploiement réussi, `/widget?mode=free`, `/connexion` et `/menagerie` répondent sur goal.viloris.io
- Fin de nuit : archivage vérifié, rien à archiver (16/11 porte toujours le duel du boss)

- Soirée (session boss) : scénarios du boss à l'échéance mis en maquette : https://claude.ai/artifact/NYZmyyH5vXkNPjGFGborNM (`docs/maquettes/boss-echeance.html`) ; trois cas jamais tranchés relevés (voir Reste à faire)
- Soirée (session boss) : écran de fin d'objectif rejoué en combat de boss. Pistes successives : https://claude.ai/artifact/USnNG33h19E6M9wFiw2HPX puis https://claude.ai/artifact/B6eTpXLdGazWdda5zna4hY (écartées) ; **maquette validée** : https://claude.ai/artifact/CnUpSPrQnsL2qjY1QTyDJo (`docs/maquettes/boss-final-duo.html`, version 5 : une attaque par héros et par semaine, chiffre à l'impact, arrêt sur image, 15 à 19 s)
- Soirée (session boss) : **maquette validée** de l'attaque ultime du boss quand le duel est perdu : https://claude.ai/artifact/2hv4Me1VAQbHWrpLgZ7jV1 (`docs/maquettes/boss-ultime-ko.html`)
- Soirée (session boss) : cadrage `docs/specs/2026-11-19-boss-finale-design.md`, plan `docs/superpowers/plans/2026-11-19-boss-finale.md` ; **PR #154 fusionnée dans `dev`** : `src/game/finale.ts` (testé d'abord), moteur canvas `src/components/arena/` (engine, finale, ultimate, `useArenaScene`), `BossFinale` sur `/objectif/fin`, `BossUltimate` sur `/duel` (titre « … vous met K.O. »), espace manquant du bouton « Reprendre le combat jusqu'au … » corrigé ; une passe de simplification ; 331 tests verts, build OK ; joué au navigateur en local, 1280 et 390 px, avec une quête d'exemple de 13 semaines (base locale sauvegardée puis restaurée)
- Soirée (session boss) : **mise en production** sur accord d'Adrien (PR #155) : déploiement réussi, goal.viloris.io répond
- Soirée (session boss) : archivage vérifié, rien à archiver (16/11 porte toujours le duel du boss)
## Reste à faire
- **Côté job-finder-claude** : relais des clics du mode libre d'après `docs/passation/2026-11-19-encart-libre-vivant.md`, puis mise en production de #241, puis menu du rond (Normal, Small, Libre, Masqué), taille de l'iframe par mode et `?mode=`, d'après `docs/passation/2026-11-19-encart-modes.md` (section « Livré côté Goal Master ») ; garder un `color-scheme` clair pour la transparence du mode libre
- **Vendredi 20/11 18 h** : vérifier que le duel affiche les PV adoucis et les coups d'entraide
- Puis Nicolas : « mets à jour job-finder et branche Goal Master » à Claude, et clic sur « Relier »
- Jeudi 19/11 (ce soir) et vendredi 20/11 à 18 h 01 : rappel du boss puis duel
- Base locale : candidatures de test « Essai Doctolib », « Alan », « Pennylane », « Doctolib » (Adrien, source job-finder) et une clé de test active ; à effacer si gênantes
- Base locale, essais du mode libre : clés d'encart de test pour Adrien et Nicolas, candidatures « Qonto », « Alan », « Pennylane » (Nicolas, source job-finder), compagnons en balade de Nicolas passés à chat, chien, renard ; à effacer si gênants
- Petit reste connu : `/objectif/fin` montre la nouvelle forme si la candidature qui finit l'objectif fait aussi évoluer (avant la scène)
- Plus tard si besoin : faire tenir l'aperçu de `dev` pour l'encart (protection Vercel), aujourd'hui seule la production ou un Goal Master local sont visables

- **Boss à l'échéance, trois cas à trancher** (maquette `boss-echeance.html`) : nouvel objectif après une victoire en avance (100 sur la date commune, boss énorme ; recommandé : plafonner sa part au rythme de l'objectif précédent), échéance en milieu de semaine (recommandé : duel final le jour de l'échéance au prorata), bandage après le dernier duel (recommandé : laisser tel quel)
- **Vendredi 20/11 18 h** : si le duel est perdu, regarder l'attaque ultime sur un vrai téléphone
- Boss final : les coups du binôme ne comptent que s'il a un objectif en cours (les semaines d'un ancien objectif à lui n'apparaissent pas) ; à revoir seulement si ça se voit
## Blockers
- Aucun

## Décisions
- Encart : jamais agrandi, victoire comprise ; small sans la série (ne tient pas dès deux chiffres) ; libre sur toute la page, transparent, clics qui traversent
- Nouvelle forme : l'encart l'annonce sans la montrer (silhouette, jamais le nom) ; la scène existante de l'accueil la dévoile, une fois tous appareils confondus ; l'encart garde l'ancienne forme d'ici là ; notification au joueur sans le nom de la forme
- La forme reste calculée ; `seenForm` n'est qu'un accusé de lecture, posé sans scène pour un joueur d'avant ce lot
- Encart masqué ou affiché par un rond dans la barre de job-finder (pas de case dans le profil), affiché par défaut
- Encart servi par Goal Master (`/widget` en iframe) plutôt que redessiné par job-finder : sprites et animations à un seul endroit
- C'est le serveur local de job-finder qui envoie les candidatures (pas l'encart) : une candidature passée à « envoyée » depuis le terminal compte aussi
- Clé par `postMessage`, gardée hachée en base, jamais dans une adresse ; `/relier` refusée dans un cadre, `/widget` affichable seulement depuis localhost
- Candidature datée de sa réception (pas d'antidatage) : un duel ou un défi passé ne change jamais après coup
- Saisie à la main de la même entreprise le jour même : rattachée, pas recomptée ; une saisie déjà rattachée ne se rattache pas à une deuxième offre
- Pas d'écran d'intro ni de « Nouveauté » : la fonctionnalité vit dans job-finder
- Boss : pas de ligne « retard » (l'écran de l'objectif montre déjà la progression) ; texte de l'intro modifié sans nouvel écran, donc pas de « Nouveauté »
- Deux sessions Claude dans le même dossier se volent les branches : une copie du dépôt (worktree) par session en parallèle
- Boss : une candidature déclenchée par une relance compte deux coups (candidature + entraide), voulu ; le coup de grâce reste affiché à part, pas dans la barre de vie
- Mode libre : monstres et compagnons ne sont que du décor (ni XP, ni dégâts) ; un seul compagnon de passage et un seul monstre à la fois ; par défaut le compagnon affiché se balade ; l'iframe garde `pointer-events: none` et job-finder relaie les clics
- Boss final : une attaque par héros et par semaine, un seul impact avec le chiffre de ses coups ; coup ultime à deux entre 40 et 60 % des coups chacun, sinon celui qui a le plus frappé ; binôme sans coup absent ; au-delà de 12 semaines, regroupement ; barre = somme des PV des boss de la quête, une semaine n'enlève jamais plus que son boss
- Temps écoulé : le boss de l'animation est « sonné » (jamais vainqueur) ; c'est une mise en scène de l'objectif raté, sans lien avec les duels du vendredi, où le boss perdant reste « en fuite » côté règles
- Duel perdu : attaque ultime propre à chaque boss, les deux héros K.O. même sans coup ; défaite toujours visuelle ; pas d'animation de victoire du duel pour l'instant
- Pas d'écran d'intro ni de « Nouveauté » pour le boss final et l'attaque ultime : aucune règle nouvelle
- Écartés : Goal Master entier dans un panneau (cadrage du matin côté job-finder), base en ligne pour job-finder, import des anciennes candidatures, annulation par job-finder
