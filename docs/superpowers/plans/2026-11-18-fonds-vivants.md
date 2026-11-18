# Fonds vivants : plan

Cadrage : `docs/specs/2026-11-18-fonds-vivants-design.md`. Branche `feat/fonds-vivants`. Exécution inline.

**No-gos** : nouveau paysage, son, parallaxe, retouche de l'Arène ou de l'intro.
**Fondrières** : performance sur téléphone → 8 images/s, couches fixes en cache, pause hors écran ; rien de plus tant que ce n'est pas mesuré lent.

## Tâche 1 : logique pure (test d'abord)
- `src/lib/landscapes.test.ts` : `landscapeGrid` (390×844 → 130×282, 1440×900 → 288×180, 2560×1080 → 427×180, petit écran plancher 2), `momentAt` (paliers, bascule à minuit, quarts), `heroShift` (tient : 0 ; ne tient pas : recentré), `parisHour` (fuseau Europe/Paris).
- `src/lib/landscapes.ts` : ces fonctions, noms « Château » et « Montagnes ».
- Commit `feat: landscape grid and time-of-day logic`.

## Tâche 2 : en-tête e-mail isolé
- Déplacer l'ancien dessin du château dans `src/lib/emailCastle.ts` ; `emailArt.ts` l'importe. `emailArt.test.ts` reste vert.
- Commit `refactor: keep the email castle apart from the live landscapes`.

## Tâche 3 : moteur de dessin
- `src/lib/landscapeArt.ts` : port typé de la maquette (`renderLandscape(canvas, id, hour, frame, grid)`).
- Commit `feat: draw living 8-bit landscapes`.

## Tâche 4 : composant et branchement
- `Landscape.tsx` : mode fond (taille de la fenêtre, boucle 8 i/s, pause cachée, mouvement réduit, redimensionnement) et mode vignette (Réglages).
- CSS `.landscape-bg` : la toile couvre la fenêtre sans déformation.
- Vérification en local : téléphone 390 px et ordinateur, Réglages, mode décor.
- Commit `feat: living backgrounds follow Paris time and screen shape`.

## Fin
- `npm test`, `npm run lint`, `npm run build` au vert ; PR vers `dev`.
