# 2026-11-19 · Encart Goal Master dans job-finder

## Reprise

```
✅ Fait      Encart job-finder en prod, boss adouci et coups d'entraide dans dev
⛔ Bloqué    Aucun
🎯 Priorité  Boss adouci à essayer sur l'aperçu puis en prod, lot 2 job-finder (duel 20/11 18 h)
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
- Fin de soirée : PR #139 fusionnée dans `dev` (boss adouci). PV = le plus doux du rythme de départ (objectif ÷ vendredis de l'objectif) et du rythme qui reste : le retard ne fait plus grossir le boss, l'avance le fait maigrir. Coups d'entraide : relance suivie d'effet avant le duel = 1 coup pour qui relance, quête validée dans la semaine = 1 coup pour qui l'a faite. Écran de résultat « dont n d'entraide », texte de l'intro du boss, règle du CLAUDE.md ; 281 tests verts
- Fin de soirée : archivage vérifié, rien à archiver

## Reste à faire
- **Boss adouci** : essayer sur l'aperçu de `dev`, puis mise en production sur accord d'Adrien (avant le duel du 20/11 18 h si on veut qu'il compte déjà)
- `docs/maquettes/encart-modes.html` traîne non suivi dans le dépôt (venu d'une autre session) : à committer ou effacer
- **Lot 2 dans job-finder-claude**, depuis une session dans ce dépôt, d'après `docs/passation/2026-11-19-encart-job-finder-lot2.md` : réglage du profil, file « à compter » dans `changerStatut`, envoi et reprises, encart, `/collect` qui se met à jour
- Puis Nicolas : « mets à jour job-finder et branche Goal Master » à Claude, et clic sur « Relier »
- Jeudi 19/11 (ce soir) et vendredi 20/11 à 18 h 01 : rappel du boss puis duel
- Base locale : candidatures de test « Essai Doctolib » et « Alan » (Adrien, source job-finder), clés révoquées ; à effacer si gênantes
- Plus tard si besoin : faire tenir l'aperçu de `dev` pour l'encart (protection Vercel), aujourd'hui seule la production ou un Goal Master local sont visables

## Blockers
- Aucun

## Décisions
- Encart masqué ou affiché par un rond dans la barre de job-finder (pas de case dans le profil), affiché par défaut
- Encart servi par Goal Master (`/widget` en iframe) plutôt que redessiné par job-finder : sprites et animations à un seul endroit
- C'est le serveur local de job-finder qui envoie les candidatures (pas l'encart) : une candidature passée à « envoyée » depuis le terminal compte aussi
- Clé par `postMessage`, gardée hachée en base, jamais dans une adresse ; `/relier` refusée dans un cadre, `/widget` affichable seulement depuis localhost
- Candidature datée de sa réception (pas d'antidatage) : un duel ou un défi passé ne change jamais après coup
- Saisie à la main de la même entreprise le jour même : rattachée, pas recomptée ; une saisie déjà rattachée ne se rattache pas à une deuxième offre
- Pas d'écran d'intro ni de « Nouveauté » : la fonctionnalité vit dans job-finder
- Boss : pas de ligne « retard » (l'écran de l'objectif montre déjà la progression) ; texte de l'intro modifié sans nouvel écran, donc pas de « Nouveauté »
- Boss : une candidature déclenchée par une relance compte deux coups (candidature + entraide), voulu ; le coup de grâce reste affiché à part, pas dans la barre de vie
- Écartés : Goal Master entier dans un panneau (cadrage du matin côté job-finder), base en ligne pour job-finder, import des anciennes candidatures, annulation par job-finder
