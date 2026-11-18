# Fonds vivants : cadrage

Maquette validée par Adrien le 18/11/2026 : https://claude.ai/artifact/2cA5UyXq8xefDD6i11XdpY (`docs/maquettes/fonds-vivants.html`).

## Intention

Les quatre paysages de fond étaient de petites images fixes (192 × 108) recadrées en plein écran. Sur téléphone tenu droit, on n'en voyait que le quart central : château coupé, donjon et chalet hors champ. Adrien veut des fonds plus beaux, toujours en 8 bits, qui bougent et qui suivent l'heure de Paris.

## Objectifs

- Paysages redessinés en pixel art plus fin : ciels en trame de Bayer, perspective par l'air, liseré de lumière côté soleil ou lune, ombres teintées.
- Animation légère à 8 images par seconde : drapeaux, nuages, fumée, oiseaux, chauves-souris, lucioles, étoiles filantes, bambous et herbes au vent, feuilles.
- Le ciel suit l'heure de Paris : nuit, aube (6 h 30 à 7 h 45), jour (9 h à 17 h 30), crépuscule (19 h à 20 h 15), nuit dès 21 h 30, avec des transitions par paliers d'un quart d'heure. Les fenêtres s'allument une à une.
- Le dessin prend la forme de l'écran : scène de référence 320 × 180, toile de `ceil(vw/s) × ceil(vh/s)` avec `s = max(2, min(floor(vh/180), floor(vw/120)))`. Le sol reste en bas, le ciel s'étend vers le haut ; l'élément principal se recentre s'il ne tient pas à sa place ; les sapins de bord s'accrochent aux bords.

## Non-objectifs

- Pas de nouveau paysage, pas de paysage à débloquer, pas de lien avec la progression.
- L'Arène, l'intro, l'évolution et l'en-tête des e-mails ne changent pas. L'en-tête garde l'ancien Château de nuit, déplacé dans `src/lib/emailCastle.ts`.
- Pas de son, pas de parallaxe au défilement.
- Pas de migration : les identifiants (`CASTLE`, `BAMBOO`, `MOUNTAINS`, `PLAINS`) restent, seuls deux noms affichés changent (« Château », « Montagnes »).

## Contraintes

- Pas de dessin quand la page est cachée ; mode « réduire les animations » : image figée, redessinée au quart d'heure.
- Redessin à la nouvelle forme après rotation ou redimensionnement (attente de 200 ms).
- Les couches fixes sont dessinées une fois par quart d'heure et par taille, puis réutilisées.

## Approches

- **A, retenue** : paysages dessinés par le code, en couches, sur un canevas client. Rien à stocker, tout se calcule, s'ajuste à n'importe quelle forme d'écran.
- B, écartée : images pixel art par couche et par moment (environ 64), animées en CSS. Plus fin seulement si quelqu'un les dessine, et chaque retouche impose de les redessiner ; impossible de les adapter à la forme de l'écran.

## Découpage

- `src/lib/landscapes.ts` : identifiants, noms, `isLandscape`, et la logique pure testée : `landscapeGrid` (taille de la toile), `momentAt` (moment et palier), `parisHour`, `heroShift`.
- `src/lib/landscapeArt.ts` : moteur de dessin porté de la maquette (client).
- `src/components/Landscape.tsx` : fond animé (boucle, visibilité, mouvement réduit, redimensionnement) ou vignette fixe 320 × 180 dans les Réglages.

## Laissé au développeur

- Le code de dessin reprend la maquette tel quel ; ses chiffres font foi.
- Intro : inchangée. Le fond n'ajoute pas de geste nouveau, donc ni `INTRO_STEP_COUNT` ni `LATEST_NEWS` ne bougent.
