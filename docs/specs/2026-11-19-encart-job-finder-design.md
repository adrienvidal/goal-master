# Encart Goal Master dans job-finder : cadrage

Date : 19/11/2026. Maquettes validées : https://claude.ai/artifact/RxGMgkLbRr2nGRqyYyphxc (`docs/maquettes/encart-job-finder.html`).

## Intention

Adrien et Nicolas préparent et envoient leurs candidatures dans job-finder (outil local, `~/Workspace/apps/job-finder-claude`, chacun sur sa machine). Aujourd'hui, ils doivent ensuite ressaisir l'entreprise dans Goal Master. On veut qu'une candidature passée à « envoyée » dans job-finder compte d'office dans Goal Master, et que le héros, visible dans un coin de job-finder, gagne son XP et prenne sa pose de victoire au moment où l'on travaille. La récompense arrive là où l'effort se fait.

## Objectifs

- Une candidature passée à « envoyée » dans job-finder compte dans Goal Master, quel que soit le chemin (interface ou Claude dans le terminal).
- Un encart dans job-finder montre le héros du joueur (forme, rouille), son niveau, sa barre d'XP, ses candidatures du jour et sa série, et joue la victoire quand une candidature compte.
- Côté Nicolas, une seule fois : « mets à jour job-finder et branche Goal Master » à Claude, puis un clic sur « Relier ». Rien à copier. Ensuite, les mises à jour de job-finder arrivent toutes seules.

## Non-objectifs

- Pas d'import des candidatures envoyées avant la mise en route.
- Pas d'annulation dans Goal Master quand une candidature revient en arrière dans job-finder (Goal Master permet déjà de la retirer à la main le jour même).
- L'encart ne montre ni le fil, ni l'Arène, ni les quêtes, ni l'autre joueur. Un clic sur le héros ouvre Goal Master dans un nouvel onglet.
- Pas de base en ligne pour job-finder : ses données restent sur la machine de chacun.

## Anti-objectifs (échec même si ça marche)

- Une donnée de job-finder autre que le nom de l'entreprise (et une référence technique de l'offre) part vers Goal Master.
- Un ami qui utilise job-finder sans Goal Master voit quoi que ce soit.
- Une candidature comptée deux fois (relance réseau, deux chemins qui envoient la même).
- Une candidature envoyée sans réseau qui se perd en silence.
- La clé qui fuit dans une adresse web, un journal ou git.

## Contraintes

- Goal Master : deux comptes, toute écriture filtrée sur le joueur courant (ici : le joueur de la clé). L'XP se calcule. Plafond de 15 par jour, jours à minuit heure de Paris.
- job-finder : outil local (Node, SQLite, interface Vite sur `localhost`), serveur MCP lancé par Claude Code, données dans `donnees/` (ignoré par git), « pas de candidature automatique » (on ne touche pas à cette règle : on compte une candidature que le candidat a envoyée lui-même).
- L'encart est affiché dans job-finder (origine `http://localhost:*`), donc en contexte tiers : les cookies de connexion de Goal Master n'y sont pas fiables (Safari, Chrome). L'encart ne s'appuie pas dessus.
- Adresse de Goal Master en dur dans job-finder (production), surchargeable par une variable d'environnement pour viser l'aperçu de `dev` ou le local.

## Approches envisagées

1. **Encart servi par Goal Master, affiché dans job-finder (retenue).** Goal Master sert une page `/widget` qui dessine le héros avec ses composants existants ; job-finder l'affiche dans un coin. Un seul endroit pour les sprites, formes, rouille et animations : toute évolution de Goal Master apparaît d'office.
2. Encart dessiné par job-finder à partir de chiffres fournis par Goal Master. Écartée : sprites et animations recopiés et tenus en double.
3. Encart sans lien automatique (on ajoute la candidature dans l'encart). Écartée : perd ce qu'Adrien demande, voir l'XP monter au moment de l'envoi.

Écartées aussi : Goal Master entier dans un panneau latéral (cadrage du matin côté job-finder, remplacé) ; base en ligne pour job-finder (règle de départ cassée pour économiser un clic, la mise à jour reste nécessaire).

## Conception

### Vue d'ensemble

```
job-finder (machine du joueur)                          Goal Master (Vercel)
┌───────────────────────────────┐                       ┌──────────────────────────────┐
│ statut → « envoyée »          │                       │                              │
│   (interface ou outil MCP)    │                       │                              │
│        │                      │  POST /api/widget/    │                              │
│        ▼                      │  applications         │                              │
│ file « à compter » (SQLite) ──┼──────────────────────►│ ajoute la candidature        │
│   envoi + reprises            │  Authorization: clé   │ (même logique que la saisie) │
│                               │                       │                              │
│ interface : encart            │                       │                              │
│  ├ non relié : rendu job-finder, bouton « Relier » ───┼─► /relier (fenêtre)          │
│  │      ◄─────────── clé par postMessage ─────────────┼── après « Relier »           │
│  └ relié : <iframe /widget> ──┼── clé par postMessage►│ /widget lit son état         │
│                               │                       │   GET /api/widget/state      │
└───────────────────────────────┘                       └──────────────────────────────┘
```

C'est le serveur local de job-finder qui envoie, pas l'encart : une candidature passée à « envoyée » par Claude dans le terminal, page fermée, compte quand même. L'encart, lui, ne fait qu'afficher et jouer la victoire quand l'état a changé.

### Côté Goal Master

**Clé de liaison**
- Nouvelle table `WidgetKey` : `id`, `playerId`, `hash` (SHA-256 de la clé, unique), `createdAt`, `revokedAt`, `lastUsedAt`. Au plus une clé active par joueur : en créer une révoque la précédente.
- La clé : 32 octets aléatoires en base64url, préfixée `gm_`. Montrée une seule fois, jamais stockée en clair, jamais dans une adresse.
- Droits de la clé : ajouter une candidature pour son joueur, lire l'état de son joueur. Rien d'autre.

**Page `/relier`** (maquette écran 2)
- Ouverte en fenêtre par job-finder avec `?origin=http://localhost:5173` (l'origine de la page job-finder). Origine refusée si ce n'est pas `http://localhost:<port>` ou `http://127.0.0.1:<port>`.
- Connexion exigée : passe par `/connexion`, puis retour à `/relier` avec les mêmes paramètres. Ce retour n'existe pas aujourd'hui (`/connexion` renvoie toujours vers `/`) : à construire pour le code e-mail comme pour la connexion directe, avec une adresse de retour limitée aux chemins internes. Joueur sans personnage : renvoyé au premier lancement, comme ailleurs.
- « Relier » (action serveur) crée la clé, la page l'envoie par `window.opener.postMessage({ type: "goal-master:key", key }, origin)` puis se ferme. Sans `opener` (navigateur qui bloque) : écran « C'est relié » avec le bouton de retour, et la clé n'est pas réaffichée (il suffira de relier à nouveau depuis job-finder).

**Page `/widget`** (maquette écran 1)
- Page minimale, sans en-tête ni fond vivant, faite pour une petite boîte (environ 260 × 150 px, repliable).
- En-têtes : `Content-Security-Policy: frame-ancestors http://localhost:* http://127.0.0.1:*` sur `/widget` seulement ; les autres pages gardent le comportement actuel.
- Au chargement, elle attend la clé par `postMessage` de la page parente (origine vérifiée : localhost). Elle la garde en mémoire seulement.
- Elle lit `GET /api/widget/state` (clé en `Authorization: Bearer`) à l'ouverture, toutes les 30 s tant qu'elle est visible, et dès que la page parente envoie `{ type: "goal-master:refresh" }`.
- Quand l'état montre de nouvelles candidatures depuis le dernier affichage (sur cet appareil), elle joue la victoire : saut, étincelles, « +10 XP » (ou « +0 XP » au plafond), barre qui monte, nom de l'entreprise. Passage de niveau : « NIV. n ! ». Nouvelle forme : flash et « Nouvelle forme : … » avec lien vers Goal Master. Rouillé : la rouille part pendant la victoire. Mode « réduire les animations » : pas de saut, pas de flash.
- Clé refusée (révoquée, inconnue) : la page prévient la parente (`{ type: "goal-master:unlinked" }`), qui affiche l'état « Lien coupé ».
- Un clic sur le héros ouvre `/` dans un nouvel onglet.

**API**
- `GET /api/widget/state` → nom, personnage, couleur, forme affichée (avec la rouille), niveau, XP dans le niveau et XP du niveau suivant, candidatures du jour, série, plafond atteint, et les dernières candidatures arrivées par job-finder (entreprise, date, XP rapportée) pour l'animation.
- `POST /api/widget/applications` `{ company, ref, sentAt }` → ajoute la candidature avec la même logique que la saisie (`addApplication` : succès, défi, notifications, bilan), sans demander de confirmation pour un doublon d'entreprise. Réponse : l'état ci-dessus.
  - `ref` : identifiant de l'offre côté job-finder ; une candidature déjà reçue avec la même `ref` pour ce joueur n'est pas recréée (réponse 200, rien d'ajouté). Colonne `Application.externalRef`, unique avec `playerId`.
  - `sentAt` : moment du passage à « envoyée », gardé pour information seulement. La candidature est datée de sa réception, comme une saisie à la main : une candidature reçue en retard ne change jamais après coup un duel, un défi ou une relance déjà joués.
  - Doublon avec une saisie à la main : si le joueur a déjà saisi à la main la même entreprise le même jour de Paris (`source` vide, comparaison de `findDuplicate` en mode sûr), la candidature de job-finder n'est pas recréée ; elle est rattachée à celle-ci (`externalRef`, `source` posés dessus) et la réponse le signale (pas de « +10 XP » à l'animation, message « déjà comptée »).
  - Colonne `Application.source` (`"job-finder"` ou vide) pour le bloc des réglages et l'animation.
- 401 si clé absente, inconnue ou révoquée ; `lastUsedAt` mis à jour à chaque appel accepté.
- La logique d'ajout est extraite de l'action serveur dans une fonction partagée qui prend le joueur en paramètre, pour que l'action et l'API fassent exactement la même chose.

**Réglages** (maquette écran 3) : bloc « job-finder » sous les réglages existants. Relié : depuis quand, dernière candidature reçue, nombre de candidatures comptées par job-finder, « Couper le lien » avec confirmation (révoque la clé ; les candidatures déjà comptées restent). Pas relié : une phrase qui dit que le lien se fait depuis job-finder.

**Intro** : inchangée. Aucun geste nouveau dans Goal Master ; ni `INTRO_STEP_COUNT` ni `LATEST_NEWS` (appel de Claude, voir plus bas).

### Côté job-finder

**Réglage et clé** (maquette écran 4)
- Profil : `goalMaster: z.boolean().default(false)`, à côté de `intermediaires`. Ligne « Goal Master » dans l'édition du profil, avec l'état « Relié au compte de … » quand une clé existe.
- La clé est rangée dans `donnees/` (ignoré par git), jamais dans `recherche.yaml` ni dans un journal.
- « Branche Goal Master » dit à Claude : il coche ce réglage. Rien d'autre à faire côté terminal.

**File « à compter »**
- Au passage d'une offre à `envoyee` depuis un autre statut (`de !== 'envoyee'` : `envoyee → envoyee`, « toujours en attente », passe aussi par `changerStatut` et ne doit rien déclencher), dans `changerStatut` (appelé par `decider`, donc depuis l'interface comme depuis l'outil MCP). Les missions d'appoint (`retenue → envoyee` à l'inscription sur la plateforme) comptent aussi, comme convenu avec Adrien. Condition : si le réglage est coché et une clé présente : une ligne est ajoutée à une table SQLite `goal_master_a_compter` (offre, entreprise, `sentAt`, tentatives, dernière erreur).
- Envoi tout de suite, par le processus qui a fait le changement. En cas d'échec, la ligne reste ; nouvelle tentative au démarrage du serveur de l'interface, au prochain passage à « envoyée », et sur « Réessayer » dans l'encart. Ligne retirée à la réponse 200.
- Réponse 401 : la clé est effacée et l'encart passe à « Lien coupé » ; les lignes en attente restent pour le prochain lien.
- Une même offre n'entre qu'une fois dans la file ; `ref` protège en plus côté Goal Master contre un envoi répété (réponse perdue, reprise).

**Encart** (maquette écrans 1 et 5)
- Caché si le réglage est décoché.
- Coin bas-droite de l'interface, au-dessus du contenu ; une marge en bas de page lui laisse sa place. Repliable en une tête et le niveau (choix gardé par l'interface) ; se déplie le temps d'une victoire puis se replie.
- Non relié : rendu par job-finder, sans iframe ; bouton « Relier à Goal Master » qui ouvre `/relier?origin=…` en fenêtre et écoute la clé par `postMessage` (origine vérifiée : celle de Goal Master), puis l'enregistre par l'API locale.
- Relié : `<iframe src="…/widget">`, clé envoyée par `postMessage` au chargement. Après un passage à « envoyée » fait dans l'interface, la page envoie `goal-master:refresh` pour une victoire immédiate ; depuis le terminal, la victoire arrive au plus 30 s après.
- Candidatures en attente dans la file : bandeau « n'a pas été comptée… Réessayer » sous l'encart, rendu par job-finder.

**Mise à jour automatique**
- `/collect` (commande quotidienne) commence par récupérer la mise à jour de job-finder si l'arbre de travail est propre et sur `main`, puis lance `npm install` si le lockfile a changé. Sinon, il prévient en une ligne et continue.
- La toute première mise à jour reste à faire à la main (« mets à jour job-finder »).
- Nicolas a cloné le dépôt (privé, accès en lecture) : la mise à jour par `git pull` marche chez lui comme chez Adrien.

## Ce qui part de la machine

Le nom de l'entreprise, l'identifiant de l'offre dans job-finder et le moment de l'envoi. Rien d'autre : ni intitulé, ni CV, ni lettre, ni profil. C'est écrit dans le texte de la case du profil.

## Livraison

Deux lots, Goal Master d'abord (c'est là qu'est le risque : affichage dans un autre site, clé, API).

1. **Goal Master** : migration (`WidgetKey`, `Application.externalRef`, `Application.source`), fonction d'ajout partagée, `/relier`, `/widget` et ses en-têtes, API, bloc des réglages, tests. Vérifiable seul avec une petite page locale qui joue le rôle de job-finder.
2. **job-finder** : réglage, file, envoi, encart, `/collect` qui se met à jour, tests.

## Décisions prises par Claude (à relire)

- Envoi par le serveur local de job-finder plutôt que par l'encart : seul moyen de compter une candidature passée à « envoyée » depuis le terminal.
- Clé à l'abri d'une adresse : passée par `postMessage`, gardée en mémoire dans l'encart, hachée en base.
- Pas d'antidatage : une candidature est datée de sa réception, pour ne jamais rejouer un duel ou un défi après coup (relecture du constructeur).
- Doublon du jour avec une saisie à la main : rattaché, pas recompté.
- Pas d'écran d'intro ni de « Nouveauté » : la fonctionnalité vit dans job-finder, pas dans Goal Master.
- Victoire déclenchée par l'état lu (nouvelles candidatures depuis le dernier affichage), pas par un message de job-finder : même comportement par l'interface et par le terminal.

## Laissé au constructeur

- Forme exacte de l'état renvoyé par l'API et du composant `/widget` (réutiliser `Sprite`, `MyAvatar`, la forme affichée et la rouille existantes).
- Nom et emplacement des fichiers, de la table de file et de la clé dans `donnees/`.
- Fréquence exacte du rafraîchissement (30 s proposé) et durée de la victoire.
