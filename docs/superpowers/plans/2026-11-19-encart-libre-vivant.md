# Plan : encart libre vivant

Cadrage : `docs/specs/2026-11-19-encart-libre-vivant-design.md`. Branche `feat/encart-libre-vivant`, un commit par tâche, exécution en ligne.

1. **Compagnons en balade, données** : `Player.walkers` + migration `walkers` (recopie du compagnon affiché) ; `MAX_WALKERS`, `checkWalkers(raw, owned)`, `walkersAfterAdopt(walkers, id)` dans `src/game/quests.ts`, tests d'abord ; `adoptCompanion` s'en sert ; action `setWalkers`.
2. **Ménagerie** : partie « En balade dans job-finder » (`Walkers`, client, interrupteurs, compteur n / 3, au-delà de 3 désactivés + message, erreur qui remet l'interrupteur, rien si aucun compagnon) ; indice « Relie job-finder dans les Réglages » si aucune clé active.
3. **État de l'encart** : `formName` et `companions` dans `WidgetState` (`widgetState` reçoit les choisis et leurs noms), tests.
4. **Monstres et scène pure** : `src/lib/monsters.ts` (grilles, palette) ; `gridRects` prend une palette ; `src/lib/freeScene.ts` (délais, bulle, visiteur), tests.
5. **FreeScene** : moteur, clics par `goal-master:poke`, envoi `goal-master:hitboxes`, victoire, silhouette, mouvement réduit ; CSS `fs-*` ; remplace `FreeView`.
6. **Page d'essai** : relais des clics en mode free dans `scripts/essai-job-finder.mjs`.
7. **Vérification** : `npm test`, `npx tsc --noEmit`, lint ; navigateur : scène (visites, monstre, clics par relais, victoire), mouvement réduit, Ménagerie mobile et desktop.
8. **Passation job-finder** : `docs/passation/2026-11-19-encart-libre-vivant.md`. PR vers `dev`.
