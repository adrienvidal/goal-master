# Plan : Bottes plein écran

Spec : `docs/specs/2026-11-18-arene-bottes-plein-ecran-design.md`. Branche `feat/arena-botte-cutin`.

No-gos : pas de règle ni de chiffre changés, pas de son, pas de nouvelle pose dessinée, pas d'écran d'intro.
Fondrière : l'enchaînement avec le rejeu et la confirmation du serveur (lot Impact). Limite : la séquence est une
phase avant `show()` ; tout le reste (contact, PV, chiffres) part de `show()` comme aujourd'hui.

1. **Barème pur** `src/lib/arenaBotte.ts` (test d'abord) : `botteCut(kind, levelForm, { replay, reduced })` →
   palier, durée, et réglages par palier (fantômes, poussée, tours, entailles, feuilles, fissure). `tierOf` exporté
   de `src/game/arena.ts` pour ne pas dupliquer.
2. **Calques du sprite** `spriteLayers()` dans `src/lib/sprites.ts` (test) : corps et arme de la pose de repos, pivot
   de l'arme (le poing). Corps + arme = le sprite de repos, case pour case ; pas d'arme à l'évolution 1.
3. **Composant** `src/components/BotteCutIn.tsx` : superposition fixe plein écran, animations Web Animations
   portées de la maquette, `onDone` en fin ou au tap, version réduite. Styles dans `globals.css`.
4. **Branchement** dans `ArenaLive` : `fighters` en prop (page `/arene`) ; état `cut` ; mon coup : séquence puis
   `show()`, la confirmation arrivée pendant la séquence est gardée et appliquée au départ, et l'horloge de confirmation (`optimistic.at`) repart du début de l'impact ; rejeu : la séquence
   retarde `show()`, le contact et la fin du pas ; « Passer » du rejeu coupe aussi la séquence.

Vérification : `npm test`, `tsc`, eslint, puis en local à deux joueurs : estoc et tourbillon aux trois paliers, mon
coup et rejeu, tap pour passer, réduire les animations, téléphone (390 px) et ordinateur.
