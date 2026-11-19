# Passation : trois modes pour l'encart job-finder

À reprendre depuis une session dans `~/Workspace/apps/goal-master`, selon son CLAUDE.md (branche depuis `dev`, PR, tests). Suite de `2026-11-19-encart-job-finder-lot2.md`, désormais livré : job-finder affiche `/widget` dans une iframe, en bas à droite, et un rond dans sa barre l'affiche ou le masque (job-finder-claude #241, fusionnée le 19/11, testée de bout en bout avec un Goal Master local).

## Ce qu'Adrien veut (19/11)

1. **L'encart ne grandit jamais**, pas même pour la victoire. Aujourd'hui la boîte fait 260 × 190 px fixes côté job-finder : au repos il reste un grand vide sous le héros, et un long message (« Nouvelle forme… » avec son bouton) risque d'être coupé.
2. **Trois modes**, choisis dans job-finder :
   - **normal** : celui d'aujourd'hui (barre, héros, pseudo, niveau, XP, « n auj. », série), sans le vide en dessous ;
   - **small** : une tête, le niveau et les candidatures du jour (l'état « Replié » de la maquette, écran 1, à reprendre) ;
   - **free** : le personnage se balade sur la page de job-finder.

## Ce qui est à faire ici, sur `/widget`

- **Le mode se lit dans l'adresse** : `/widget?mode=normal|small|free`, `normal` par défaut (une valeur inconnue vaut `normal`). job-finder recharge l'iframe quand le mode change ; la clé repart par le même échange `goal-master:ready` → `goal-master:key`, rien à changer au protocole.
- **Tailles fixes, à tenir dans chaque état** (repos, victoire, passage de niveau, nouvelle forme, plafond, rouille, lien coupé, « Ton héros arrive… ») :
  - normal : **260 × 130 px** ;
  - small : **130 × 50 px** ;
  - free : la fenêtre entière de job-finder (voir plus bas).
  Ces chiffres sont ceux que job-finder posera sur l'iframe. S'ils ne tiennent pas, les changer ici et le dire dans la PR : job-finder les reprendra.
- **La victoire tient dans la boîte** :
  - normal : le message (« Doctolib compte dans Goal Master », « NIV. 8 ! », « Nouvelle forme : Écuyer ») remplace la ligne « n auj. / série » le temps de la victoire (`VICTORY_MS`), sur une ligne, coupée par « … » si besoin ; le lien « Voir dans Goal Master » devient un clic sur le héros (il ouvre déjà `/`). Plus de `.gm-msg` sous le corps.
  - small : « +10 » (ou « NIV. 8 ! ») à côté de la tête, saut et étincelles dans la tête ; pas de texte d'entreprise.
  - free : le héros saute là où il est, « +10 XP » au-dessus de lui.
- **Mode free** :
  - Fond **transparent** (`body` et `.gm-widget` sans fond, sans bord), rien d'autre que le personnage. job-finder pose l'iframe sur toute sa page avec `pointer-events: none` : **les clics traversent**, donc pas de clic sur le héros dans ce mode (on garde ce geste en normal et small).
  - Le personnage marche le long du bas de la fenêtre, s'arrête, repart, change de sens. `DecorView` fait déjà marcher des personnages (`walker`, `sitting`) : partir de là plutôt que d'écrire une marche neuve.
  - Pas de pseudo ni de barre d'XP : seulement le personnage, sa forme, sa rouille, et la victoire.
  - `prefers-reduced-motion` : il reste immobile dans un coin, la victoire sans saut.
- **Lien coupé et attente** : dans chaque mode, un état qui tient dans la taille (small : la tête grisée ; free : rien, job-finder dessine lui-même son encart « Lien coupé »).
- Tests : un test par mode sur ce qui est logique (choix du mode depuis l'adresse, valeur inconnue) ; les mises en page se vérifient dans le navigateur, avec `scripts/essai-job-finder.mjs` (à étendre d'un choix de mode et de tailles fixes).

## Ce que fera job-finder ensuite (pour information)

- Le rond de la barre ouvre un petit menu : Normal, Small, Libre, Masqué ; choix gardé par le navigateur.
- L'iframe prend la taille du mode (260 × 130, 130 × 50, ou toute la page en `pointer-events: none` pour free) et l'adresse `…/widget?mode=…`.
- Les états que job-finder dessine lui-même (non relié, lien coupé, candidatures en attente) restent les siens.

## Non-objectifs

- Pas de nouveau message entre les deux pages (pas de hauteur envoyée par `/widget` : les tailles sont fixes).
- Pas de déplacement du héros par glisser-déposer, pas de clic en mode free.
- Rien ne change à l'API (`/api/widget/state`, `/api/widget/applications`) ni à la liaison.
