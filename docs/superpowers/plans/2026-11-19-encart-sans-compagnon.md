# Plan : encart libre, héros jamais seul

Cadrage : `docs/specs/2026-11-19-encart-sans-compagnon-design.md`. Un lot, une branche `feat/encart-sans-compagnon`.

1. **Données** (`src/lib/widgetState.ts`, `src/server/widget.ts`) : `friend`, `boss`, `canNudge`. Tests d'abord
   (`widgetState.test.ts`) : ami absent, ami actif / inactif / forme non vue, boss en cours / gagné / sans duel,
   relance possible ou non.
2. **Pensées** (`src/lib/freeScene.ts`) : `thoughts(state, now, saidFriendApp)` et `pickThought`, délais
   (`FIRST_MONSTER_S`, `FRIEND_FIRST_S`, `FRIEND_DELAY_S`, `THOUGHT_DELAY_S`). Tests d'abord.
3. **Scène** (`src/app/widget/FreeScene.tsx`, `globals.css`) : échéances en temps réel, héros de l'ami visiteur
   (sprite, salut, bulle, combat, victoire), pensées, gestes. Vérifié au navigateur avec `scripts/essai-job-finder.mjs`
   (`?vitesse=`), largeurs 390 et 1280 px.
4. Revue indépendante, `npm test`, PR vers `dev`, puis mise en production (accord d'Adrien du 19/11).
