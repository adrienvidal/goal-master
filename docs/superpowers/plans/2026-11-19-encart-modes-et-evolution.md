# Plan : modes de l'encart et scène d'évolution

Cadrage : `docs/specs/2026-11-19-encart-modes-et-evolution-design.md`. Maquette : `docs/maquettes/encart-modes.html`. Exécution inline, un commit par tâche, `npm test` vert avant chaque PR.

## Lot A · Modes de l'encart (branche `feat/encart-modes`)

1. **Mode lu dans l'adresse** : `src/lib/widgetMode.ts` (`WidgetMode`, `parseWidgetMode`), test d'abord. `src/app/widget/page.tsx` devient asynchrone, lit `searchParams.mode` et passe `mode` à `WidgetView`.
2. **Ligne de victoire** : `victoryLine(victory, state)` dans `src/lib/widgetVictory.ts` → `{ strong, rest, gold }` (texte court du mode normal) et `victoryPop(victory, state, mode)` (« +10 XP », « +0 XP », « NIV. n ! », « ÉVOLUE ! » en small, « NOUVELLE FORME ! » en free et dans la bulle normale reste « NIV. n ! »). Tests d'abord.
3. **Normal** : `WidgetView` rend la ligne `gm-say` à la place de `gm-sub` pendant la victoire, supprime `.gm-msg` et `VictoryMessage`, attente et lien coupé dans la boîte (`gm-note`). CSS `.gm-normal` : hauteur `100dvh`, plus de vide, silhouette `.evo .gm-hero`.
4. **Small** : composant de rendu small (tête cadrée, niveau, compte ou rouille, `s-say` pendant la victoire, tête grisée en attente / lien coupé). CSS `.gm-small`.
5. **Free** : rendu free (fond transparent sur `html`/`body` via la classe du mode, patrouille `.walker` de `DecorView`, saut et bulle à la victoire, rien en attente / lien coupé, immobile en mouvement réduit).
6. **Page d'essai** : `scripts/essai-job-finder.mjs` gagne un choix de mode et les tailles fixes (iframe 260 × 130, 130 × 50, page entière en `pointer-events: none`). Vérification des trois modes dans le navigateur (repos, victoire, nouvelle forme, lien coupé).
7. Passation `docs/passation/2026-11-19-encart-modes.md` : pointer vers le cadrage, tailles confirmées. PR vers `dev`.

## Lot B · Scène d'évolution (branche `feat/scene-evolution`, depuis `dev` après le lot A)

1. **Migration** `seen_form` : `Player.seenForm Int?`, `npx prisma migrate dev`, `npx prisma generate`.
2. **Logique pure** `src/game/evolution.ts` : `sceneDue(levelForm, seenForm)` → `{ from, to } | null` (`null` si `seenForm` est `null` ou ≥ `levelForm`), `shownForm(displayedForm, levelForm, seenForm)`. Tests d'abord.
3. **Encart** : `widgetState` reçoit `seenForm` et plafonne `displayedForm` ; `/api/widget/state` lit `seenForm`. Test.
4. **Notification** `evo-me` dans `src/game/notifications.ts` (type, règle `reminders` non plafonnée, clé, texte, aide de la catégorie). Envoi dans `applicationEvents` (`src/server/applications.ts`) et dans la validation de quête (`src/app/quete-actions.ts`). Tests.
5. **Scène** : `src/components/EvolutionScene.tsx` (client) + action serveur `seeEvolution()` qui recalcule `levelForm` et pose `seenForm`. Sur `/` : si `seenForm` est `null`, le poser à la forme actuelle sans scène ; si `sceneDue`, rendre la scène. CSS reprise de l'écran 6 de la maquette. Vérification en local (forcer `seenForm` plus bas en base).
6. PR vers `dev`.

## Relectures

Une relecture du cadrage et du plan avant le code, une relecture de chaque branche avant sa PR.
