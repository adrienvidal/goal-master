# Passation : encart Goal Master, lot 2 côté job-finder-claude

À reprendre depuis une session dans `~/Workspace/apps/job-finder-claude`, selon son propre CLAUDE.md (branche depuis `dev`, PR, tests). Ce document dit tout ce que job-finder doit savoir de Goal Master ; il n'est pas utile de relire le code de Goal Master.

- Cadrage complet : `~/Workspace/apps/goal-master/docs/specs/2026-11-19-encart-job-finder-design.md` (section « Côté job-finder »).
- Maquettes validées : https://claude.ai/artifact/RxGMgkLbRr2nGRqyYyphxc (écrans 4 et 5 pour job-finder).
- Remplace le cadrage du matin du 19/11 noté dans la session job-finder `2026-11-19_fusions.md` (Goal Master entier dans un panneau, aucun envoi) : abandonné.

## État côté Goal Master (fait, en production le 19/11)

Adresse : `https://goal.viloris.io` (à mettre en dur, surchargeable par `JF_GOAL_MASTER_URL`). L'aperçu de `dev` est derrière la protection Vercel : job-finder ne peut viser que la production ou un Goal Master local (`http://localhost:3107` par exemple).

### Relier (une fois par joueur)

1. Encart non relié, rendu par job-finder lui-même (pas d'iframe) : bouton « Relier à Goal Master ».
2. Il ouvre en fenêtre : `window.open(GM + "/relier?origin=" + encodeURIComponent(location.origin), "goal-master-relier", "width=420,height=640")`. L'origine doit être `http://localhost:<port>` ou `http://127.0.0.1:<port>`, sinon Goal Master refuse.
3. Goal Master fait passer par la connexion si besoin, puis « Relier » renvoie à l'ouvreur : `postMessage({ type: "goal-master:key", key }, origin)` et ferme la fenêtre.
4. job-finder écoute `message`, vérifie `event.origin === GM`, puis remet la clé à son serveur local, qui la range dans `donnees/` (jamais dans git, un journal ou une adresse).

Clé : `gm_` + 43 caractères base64url. Une nouvelle liaison révoque la précédente.

### API (appelée par le serveur Node de job-finder, pas par le navigateur)

En-tête : `Authorization: Bearer <clé>`. Pas de CORS : c'est voulu, le navigateur de job-finder n'appelle jamais l'API.

- `POST {GM}/api/widget/applications`, corps JSON `{ "company": string, "ref": string, "sentAt"?: string }`
  - `company` : nom de l'entreprise, 1 à 80 caractères. `ref` : identifiant de l'offre dans job-finder (1 à 64 caractères, ex. `"318"`). `sentAt` : ISO, informatif.
  - 200 `{ added: boolean, attached: boolean, state: WidgetState }`. `added: false` si cette `ref` est déjà arrivée (renvoi sans risque : on peut retenter librement). `attached: true` si le joueur avait déjà saisi la même entreprise à la main le jour même : rattachée, pas recomptée.
  - 400 `{ error }` : entreprise ou référence invalide (ne pas retenter).
  - 401 `{ error: "unauthorized" }` : clé absente, inconnue ou révoquée. Effacer la clé, encart en « Lien coupé », garder les envois en attente pour le prochain lien.
  - Autre (réseau, 5xx) : garder en file et retenter.
- `GET {GM}/api/widget/state` : `WidgetState` (utile pour un test ou un diagnostic ; l'encart le lit lui-même).

La candidature est datée de sa réception par Goal Master, pas de `sentAt` (choix pour ne jamais rejouer un duel passé).

### Encart relié : l'iframe

- `<iframe title="Goal Master" src="{GM}/widget">`, environ 260 × 190 px. `/widget` n'accepte d'être affiché que depuis `http://localhost:*` et `http://127.0.0.1:*`.
- Au montage, l'iframe envoie au parent `{ type: "goal-master:ready" }`. job-finder répond `iframe.contentWindow.postMessage({ type: "goal-master:key", key }, GM)` (à chaque `ready` : l'iframe peut se recharger).
- Après un passage à « envoyée » fait depuis l'interface : envoyer `{ type: "goal-master:refresh" }` à l'iframe pour une victoire immédiate. Depuis le terminal (outil MCP), l'iframe s'en aperçoit seule en 30 s au plus.
- Si la clé est refusée, l'iframe envoie `{ type: "goal-master:unlinked" }` au parent : passer en « Lien coupé » (rendu job-finder, bouton « Relier à nouveau »).
- L'iframe joue elle-même la victoire, le plafond, le passage de niveau, la nouvelle forme et la rouille. job-finder n'a rien à animer.

Une page d'essai qui fait exactement ce rôle existe : `~/Workspace/apps/goal-master/scripts/essai-job-finder.mjs` (serveur Node + page). À lire comme modèle.

## Ce qu'il reste à construire dans job-finder

1. **Réglage** `goalMaster: z.boolean().default(false)` dans `src/profil/schema.ts`, à côté de `intermediaires` ; ligne « Goal Master » dans l'édition du profil (maquette écran 4) : « Afficher mon héros Goal Master », sous-texte « Tes candidatures passées à « envoyée » comptent dans Goal Master : seul le nom de l'entreprise part. », et « ✓ Relié au compte de … » quand une clé existe. « Branche Goal Master » dit à Claude coche ce réglage.
2. **File « à compter »** : table SQLite (ex. `goal_master_a_compter` : offre, entreprise, `sent_at`, tentatives, dernière erreur), remplie dans `changerStatut` quand `de !== 'envoyee' && vers === 'envoyee'` (le passage `envoyee → envoyee`, « toujours en attente », ne compte pas), si le réglage est coché et une clé présente. Les missions d'appoint (`retenue → envoyee`) comptent aussi. Une même offre n'entre qu'une fois.
3. **Envoi** immédiat par le processus qui a changé le statut (serveur de l'interface ou serveur MCP), puis reprises : démarrage du serveur de l'interface, passage suivant à « envoyée », bouton « Réessayer ». Ligne retirée sur 200.
4. **Encart** dans l'interface (maquette écran 5) : caché si le réglage est décoché ; coin bas-droite, marge en bas de page pour ne rien masquer ; repliable en une tête et le niveau (choix gardé par l'interface) ; non relié et lien coupé rendus par job-finder ; relié = iframe ; bandeau « n'a pas été comptée… Réessayer » quand la file n'est pas vide.
5. **`/collect` se met à jour** : au début, `git pull` si l'arbre de travail est propre et sur `main`, puis `npm install` si `package-lock.json` a changé ; sinon une ligne d'avertissement et on continue.

Ce qui part de la machine : nom de l'entreprise, identifiant de l'offre, heure d'envoi. Rien d'autre.

## Mise en route chez Nicolas (après fusion et mise en production de job-finder)

Une seule fois : il dit à Claude, dans job-finder, « mets à jour job-finder et branche Goal Master », puis clique « Relier à Goal Master » dans l'encart (il est déjà connecté à Goal Master dans son navigateur). Il a cloné le dépôt privé : les mises à jour suivantes arrivent par `/collect`.
