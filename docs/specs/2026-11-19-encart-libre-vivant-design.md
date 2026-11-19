# Cadrage : encart libre vivant

Maquette validée par Adrien le 19/11 : https://claude.ai/artifact/Nq2q3X1CqiokjB4JvWvtPc (`docs/maquettes/encart-libre-vivant.html`).

## But

En mode libre (`/widget?mode=free`), le bas de job-finder devient une petite scène. Le héros patrouille, un compagnon choisi dans la Ménagerie passe le voir de temps en temps, un monstre arrive plus rarement et le héros le chasse. Héros, compagnon et monstre se cliquent.

Appétit : un lot côté Goal Master. job-finder n'a qu'un relais de clics à ajouter, décrit dans une note de passation.

## Parcours

```
[Ménagerie /menagerie]
  - « En balade dans job-finder » : un interrupteur par compagnon adopté, 3 au plus
      ↓
[job-finder, encart en mode Libre]
  - le héros patrouille seul la plupart du temps
  - toutes les 2 à 4 min, un compagnon choisi entre, flâne (marche, suit, s'assoit, dort) ~1 min, repart
  - toutes les 2 à 5 min, un monstre entre par le côté le plus loin du héros ; le héros fonce, 3 coups, fumée
  - clic héros → saut + bulle (niveau, forme, série, XP avant le niveau suivant)
  - clic compagnon → cœur, petit bond, son nom
  - clic monstre → le héros fonce tout de suite
  - candidature envoyée → la victoire actuelle ; le compagnon présent saute aussi
```

## Règles

- **Décor seulement** : un monstre ne rapporte rien et ne blesse jamais le héros (ses charges le font juste vaciller). L'XP reste aux candidatures.
- **Un seul compagnon et un seul monstre à la fois.** Au premier affichage, aucun compagnon n'est là : le premier passe après 20 à 40 s, pour que la scène ne paraisse pas morte.
- **Mouvement réduit** (`prefers-reduced-motion`) : héros immobile en bas à gauche, ni visite ni monstre ; les clics donnent encore la bulle, sans saut.
- **Nouvelle forme en attente** : silhouette et « ! » comme aujourd'hui ; un clic sur le héros dit « NOUVELLE FORME ! Ouvre Goal Master pour la voir », jamais le nom.
- **Attente, lien coupé** : rien, comme aujourd'hui (job-finder dessine sa carte).

## Données

- `Player.walkers String[] @default([])` : les compagnons choisis, dans l'ordre. Migration `walkers` : on y recopie le compagnon affiché des joueurs qui en ont un (le défaut « ton compagnon affiché se balade »).
- À l'adoption d'un compagnon, si `walkers` est vide, il y entre.
- `setWalkers(ids)` (action serveur) : chaque id doit être adopté par le joueur, sans doublon, 3 au plus (`checkWalkers`, pur, testé).
- `WidgetState` gagne `formName` (forme affichée) et `companions: { id, name }[]` (les choisis, avec le nom donné dans la Ménagerie).

## Relais des clics (protocole)

L'iframe garde `pointer-events: none`. Messages, toujours vers l'origine du parent connue depuis `goal-master:key` :

- Goal Master → job-finder : `{ type: "goal-master:hitboxes", boxes: [{ target: "hero" | "companion" | "monster", x, y, w, h }] }`, en pixels de l'iframe (= de la page, l'iframe la couvre), au plus 10 fois par seconde et seulement quand ça change ; `boxes: []` quand rien n'est cliquable.
- job-finder → Goal Master : `{ type: "goal-master:poke", target }`. Même contrôle que les autres messages (source = parent, origine locale).
- job-finder : curseur main au survol d'une boîte ; au clic dans une boîte, il garde le clic (la page ne le reçoit pas) et envoie le `poke`. Ailleurs, rien ne change.
- Sans relais, la scène tourne ; seuls les clics ne font rien.

## Rendu

- Un moteur impératif (`requestAnimationFrame`, positions écrites dans le DOM par des refs) dans `FreeScene` : pas de rendu React par image. Les sprites sont rendus une fois par React (héros, compagnons choisis, trois monstres) et montrés ou cachés.
- Ce qui se calcule sans DOM est pur et testé (`src/lib/freeScene.ts`) : délais tirés, texte de la bulle, choix du visiteur.
- Monstres : slime, chauve-souris (vole, deux images d'ailes), champignon, grilles 8 bits dans `src/lib/monsters.ts`.
- La bulle reste dans la page : calée à gauche ou à droite près des bords.
- Onglet caché : `requestAnimationFrame` s'arrête ; au retour, le pas de temps est plafonné.

## No-gos

- Les compagnons ne se battent pas, ne meurent pas.
- Pas de son, pas de glisser-déposer, pas de monstres selon la forme.
- Pas d'écran d'intro ni de « Nouveauté » : la fonctionnalité vit dans job-finder.
- Rien en mode normal ni small.

## Fondrières

- Le relais dépend de job-finder : on le teste dans `scripts/essai-job-finder.mjs`, qui fait le relais comme job-finder le fera.
- Performance d'une iframe pleine page animée pendant le travail : cinq éléments au plus, positions par `style.left`, envoi des boîtes plafonné.
