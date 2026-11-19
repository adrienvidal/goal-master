# Cadrage : modes de l'encart et scène d'évolution

Date : 2026-11-19. Maquette validée par Adrien : https://claude.ai/artifact/S7LLMZcTPg4dxT2hAU5Kek (`docs/maquettes/encart-modes.html`, version 3). Suite de `docs/passation/2026-11-19-encart-modes.md`, qu'elle complète (écran 6, décision « annoncée, pas montrée »).

## Appétit

Deux lots, chacun livrable seul :

- **Lot A · Modes de l'encart** : `/widget?mode=normal|small|free`, tailles fixes, victoire dans la boîte, nouvelle forme annoncée en silhouette.
- **Lot B · Scène d'évolution** : notification au joueur, scène de transformation dans Goal Master jouée une fois, encart qui garde l'ancienne forme tant que la scène n'est pas vue.

## Parcours

```
[job-finder] rond → menu → mode (côté job-finder, hors de ce dépôt)
[/widget?mode=…]  repos → candidature reçue → victoire dans la boîte → repos
   nouvelle forme : silhouette + « NOUVELLE FORME ! » ; clic (normal, small) → [/]
[notification]  « Ton héros a évolué ! » → [/]
[/]  forme du niveau > forme vue → scène (ancienne → éclair → nouvelle + nom) → « Continuer » → accueil
```

## Lot A · Modes de l'encart

- `parseWidgetMode(value)` : `normal` | `small` | `free`, toute autre valeur (absente, inconnue, tableau) vaut `normal`. La page `/widget` lit `searchParams.mode` côté serveur et passe le mode à `WidgetView`. Le protocole `goal-master:ready` / `key` / `refresh` / `unlinked` ne change pas.
- Le corps de la page prend la classe du mode (`gm-normal`, `gm-small`, `gm-free`) ; l'encart remplit l'iframe (`100dvh`) sans jamais en sortir (`overflow: hidden`). Tailles posées par job-finder : normal 260 × 130, small 130 × 50, free la page entière.
- **Normal** : barre, héros, pseudo, niveau, XP, « n auj. / série ». Plus de `.gm-msg` : pendant `VICTORY_MS`, la ligne « n auj. / série » est remplacée par un message court sur une ligne, coupé par « … » :
  - `+10` : « **Doctolib** compte » ;
  - niveau sans nouvelle forme : « **Alan** compte · niveau 9 » ;
  - plafond : « **Back Market** · plafond, sans XP » ;
  - rouille partie : « **Qonto** · la rouille part » ;
  - nouvelle forme : « **NOUVELLE FORME !** Va la voir » (or, jamais le nom de la forme).
  Le héros reste un lien vers `/` (nouvel onglet), qui remplace « Voir dans Goal Master ».
- **Small** : tête seule (le haut du sprite, cadré dans une case de 48 × 44), niveau, « n auj. » (ou « n j sans » en rouille, tant qu'aucune candidature du jour ; la série ne tient pas à côté dès deux chiffres). Victoire : « +10 XP », « +0 XP », « NIV. 9 ! » ou « ÉVOLUE ! » à la place du compte, petit saut et étincelles dans la case, sans nom d'entreprise. La tête est un lien vers `/`.
- **Free** : fond transparent, pas de barre, ni pseudo, ni XP ; le personnage patrouille le long du bas en reprenant la patrouille de `DecorView` (`.walker`, `patrol`, `face`, `walk-bob`). Victoire : il saute sur place, « +10 XP » / « NIV. 9 ! » / « NOUVELLE FORME ! » au-dessus de lui. Pas de lien (les clics traversent l'iframe). `prefers-reduced-motion` : immobile en bas à gauche, victoire sans saut.
- **Nouvelle forme** (trois modes) : flash, héros en silhouette blanche (`filter: brightness(0) invert(1)`) pendant la victoire.
- **Attente et lien coupé** : normal, « Ton héros arrive… » / « Lien coupé · Tes candidatures ne comptent plus. » dans la boîte ; small, tête grisée (« … » ou « COUPÉ ») ; free, rien. Le message `goal-master:unlinked` part comme aujourd'hui.
- `scripts/essai-job-finder.mjs` : choix du mode et iframe aux tailles fixes, pour vérifier les mises en page dans le navigateur.
- Le texte de victoire se calcule dans une fonction pure (`victoryLine(victory, state)`), testée.

## Lot B · Scène d'évolution

La scène existe déjà : `MyAvatar` (`src/components/MyAvatar.tsx`) joue sur `/` « Tu es devenu X ! », l'ancienne et la nouvelle forme en silhouettes alternées puis le dévoilement (`.evo-overlay`, `globals.css`). Elle se déclenche aujourd'hui par appareil, d'après le dernier état gardé dans le navigateur. Le lot ne la redessine pas : il la rend fiable d'un appareil à l'autre et y raccroche l'encart et la notification.

- **Forme vue** : `Player.seenForm Int?` (migration `seen_form`). Ce n'est pas la forme (elle se calcule) mais l'accusé de lecture de la scène. `null` = joueur d'avant ce lot : au rendu de `/` (après les redirections), il reçoit sa forme actuelle sans scène.
- **Déclenchement** : sur `/`, la scène « évolution » se joue quand la forme affichée dépasse `seenForm` (`sceneDue`), au lieu de la comparaison au navigateur. La forme affichée tient compte de la rouille : un héros rouillé qui gagne une forme voit la scène quand la rouille part, comme aujourd'hui. « Retour en grâce » garde son déclenchement actuel. Fermer la scène appelle une action serveur `seeEvolution()` qui recalcule la forme côté serveur et pose `seenForm = max(seenForm, forme du niveau)` : jamais à la baisse, jamais une valeur reçue du client.
- **Annonce qui reste** (demande d'Adrien, 19/11) : tant que la scène n'a pas été vue (`evolutionPending`), l'encart garde le héros en silhouette blanche et l'annonce, après la victoire comme à chaque ouverture : « NOUVELLE FORME ! Va la voir » (normal), « ÉVOLUE ! » (small), « ! » au-dessus du personnage (free).
- **Encart** : la forme affichée est plafonnée à la forme vue, `min(displayedForm, seenForm ?? levelForm)`, dans `widgetState` (via `stateOf`, `src/server/widget.ts`). La victoire « nouvelle forme » se détecte toujours sur `levelForm`.
- **Notification au joueur** : nouvel événement `evo-me` `{ form }` envoyé au joueur qui change de forme, partout où `evo` part déjà vers son binôme (`applicationEvents` dans `src/server/applications.ts`, qui couvre la saisie et job-finder ; validation de quête dans `src/app/quete-actions.ts`). Texte : « Ton héros a évolué ! », « Viens découvrir sa nouvelle forme. », adresse `/`. Jamais le nom de la forme. Catégorie `reminders` (aide : « Ton avatar change de forme ou commence à rouiller. »), non plafonnée, clé `evo-me:<form>`. Dans le bilan du jour : rang juste après `evo` (`src/game/digest.ts`), lien « Voir ton héros » (`src/server/mail.ts`), image sans la nouvelle forme (`src/lib/emailScene.ts` : le héros à sa forme vue, ou pas d'image).
- La notification `evo` au binôme ne change pas.
- **Ailleurs avant la scène** : l'image du bilan et le coffre montrent aussi le joueur à sa forme vue. Reste connu, rare : `/objectif/fin` montre la forme du niveau quand la candidature qui finit l'objectif fait aussi évoluer.

## No-gos

- Pas de transformation dans l'encart ; jamais le nom de la forme dans l'encart ni dans la notification.
- Pas de nouvelle scène ni de refonte de `.evo-overlay` ; pas de scène hors de `/`, pas de rejouer la scène, pas de galerie des formes.
- Pas de nouveau message entre l'encart et job-finder, pas de hauteur envoyée par l'encart.
- Rien côté job-finder dans ce dépôt (menu du rond, tailles d'iframe : passation).
- Pas d'écran d'intro ni de « Nouveauté » : l'encart vit dans job-finder et la scène s'explique d'elle-même.

## Fondrières

- **Cadrage de la tête en small** : les sprites changent de taille selon la forme (`scale` de `sprite()`). Limite : la tête se cadre par CSS (case fixe, sprite ancré en haut, `overflow: hidden`), pas par une grille par forme. Si une forme sort mal, on ajuste un décalage par personnage, pas plus.
- **Grandes formes en free** : le sprite est dessiné à `px` 2 à partir de la forme 4, comme en normal.
- **`seenForm` en double onglet ou après une annulation** : `max` côté serveur, la valeur ne descend jamais.
- **Mode free et color-scheme** : l'iframe n'est transparente que si son `color-scheme` (forcé à `light` en free) est celui de la page de job-finder. job-finder doit rester en `color-scheme` clair (à noter dans la passation).

## Tests

- `parseWidgetMode` (valeurs connues, inconnue, absente) ; `victoryLine` (chaque cas) ; `widgetState` plafonne la forme à `seenForm` ; `evo-me` : règle, clé, texte sans nom de forme ; détection de la scène (`levelForm > seenForm`, `null`).
- Mises en page vérifiées dans le navigateur avec la page d'essai, scène jouée en local.
