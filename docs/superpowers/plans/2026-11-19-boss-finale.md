# Plan : boss final et attaque ultime

Cadrage : `docs/specs/2026-11-19-boss-finale-design.md`. Exécution inline, un commit par tâche.

1. **`src/game/finale.ts` (test d'abord)** : `buildFinale(duels, meId, partnerId, outcome)` → semaines `{ a, n, hp, won }` regroupées à 12 au plus, `duo`, parts, `finisher` (`me` | `partner` | `both`), PV total, dégâts plafonnés par semaine, boss du dernier duel ; `null` sans semaine. Tests : seuils 40/60 %, binôme absent, plafond par semaine, regroupement, boss.
2. **`src/components/arena/engine.ts`** : moteur canvas porté des maquettes (horloge, tweens, arrêt sur image, secousse en sinus, particules, anneaux, textes qui grossissent, sprites pré-rendus depuis `sprite()` / `bossSprite()`).
3. **`src/components/arena/finale.ts` + `BossFinale.tsx`** : script du boss final (attaques par palier, relais, contre-attaque, coup ultime) ; composant client avec « Passer » et `prefers-reduced-motion`. Branché sur `/objectif/fin` (deux issues).
4. **`src/components/arena/ultimate.ts` + `BossUltimate.tsx`** : script de l'attaque ultime (quatre attaques) ; branché sur `/duel` quand le duel est perdu, titre « … vous met K.O. ».
5. **Vérification** : `npm test`, `npx tsc --noEmit`, lint, parcours joué dans le navigateur en local (mobile et ordinateur), puis PR vers `dev`, mise en production sur accord (donné le 19/11).
