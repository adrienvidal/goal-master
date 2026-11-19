# Encart job-finder (lot 1 : Goal Master) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Goal Master sait être relié à job-finder par une clé, recevoir des candidatures par API et servir un encart `/widget` affichable depuis `localhost`.

**Architecture:** Une clé par joueur (hachée en base) donne deux droits : ajouter une candidature, lire l'état du héros. La logique d'ajout de la saisie est extraite dans une fonction serveur qui prend le joueur en paramètre, partagée par l'action et l'API. `/widget` est une page client sans session : elle reçoit la clé par `postMessage` et lit l'état par l'API.

**Tech Stack:** Next.js App Router, Prisma 7 (Postgres), Vitest, Tailwind.

**Spec:** `docs/specs/2026-11-19-encart-job-finder-design.md` · Maquettes : `docs/maquettes/encart-job-finder.html`

## Global Constraints

- Une clé active au plus par joueur ; en créer une révoque la précédente. Format `gm_` + 32 octets aléatoires en base64url. Stockée en SHA-256 (hex), jamais en clair.
- Origines admises pour l'affichage et la liaison : `http://localhost:<port>` et `http://127.0.0.1:<port>` seulement.
- `frame-ancestors http://localhost:* http://127.0.0.1:*` sur `/widget` seulement.
- La candidature reçue par API est datée de sa réception ; `sentAt` n'est que gardé pour information (pas de colonne : non stocké).
- Doublon : même `externalRef` pour le joueur → rien d'ajouté ; même entreprise saisie à la main (`source` vide) le même jour de Paris, doublon « sûr » de `findDuplicate` → rattachée (on pose `externalRef` et `source` dessus), pas recréée ; sinon, ajout sans confirmation.
- `source` vaut `"job-finder"` pour une candidature venue de l'API.
- Plafond, XP, succès, défi, notifications : exactement ceux de la saisie (`addApplication`).
- Pas d'écran d'intro, pas de `LATEST_NEWS`.
- Textes en français, ceux des maquettes.

## Review Focus

1. Clé inconnue, révoquée, mal formée ou absente → 401 sans détail, partout (état et ajout).
2. Même `ref` envoyée deux fois de suite (réponse perdue) → une seule candidature, 200 les deux fois.
3. Entreprise vide ou de plus de 80 caractères → 400 avec le message de la saisie, rien d'ajouté.
4. `origin` de `/relier` hostile (`https://evil.example`, `http://localhost.evil.example`) → refusée, pas de clé créée.
5. Adresse de retour après connexion hostile (`//evil.example`, `https://…`) → retour à `/`.

Chacune a son test dans la tâche qui possède le code (Tâches 2, 3 et 4).

---

### Task 1: Schéma

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_widget_link/migration.sql` (par `npx prisma migrate dev --name widget_link`)

**Interfaces:**
- Produces: modèle `WidgetKey { id String @id @default(cuid()); playerId String; player Player @relation(...); hash String @unique; createdAt DateTime @default(now()); revokedAt DateTime?; lastUsedAt DateTime? ; @@index([playerId]) }`, relation `Player.widgetKeys WidgetKey[]` ; `Application.externalRef String?`, `Application.source String?`, `@@unique([playerId, externalRef])`.

- [ ] **Step 1:** Modifier le schéma, `npm run db` (conteneur, migration, generate).
- [ ] **Step 2:** `npm test` : tout vert (aucun test ne dépend des nouvelles colonnes).
- [ ] **Step 3:** Commit `feat: add widget key and application source columns`.

### Task 2: Clé, origine et retour (logique pure)

**Files:**
- Create: `src/lib/widgetLink.ts`, `src/lib/widgetLink.test.ts`

**Interfaces:**
- Produces:
  - `newWidgetKey(): { key: string; hash: string }`
  - `hashWidgetKey(key: string): string | null` (null si le format n'est pas `gm_` + 43 caractères base64url)
  - `bearerKey(header: string | null): string | null`
  - `isLocalOrigin(origin: string | null): origin is string`
  - `safeReturnPath(raw: string | null): string` (chemin interne commençant par un seul `/`, sinon `"/"`)

- [ ] **Step 1: Tests qui échouent**

```ts
test("newWidgetKey : préfixe, longueur, hash cohérent", () => {
  const { key, hash } = newWidgetKey();
  expect(key).toMatch(/^gm_[A-Za-z0-9_-]{43}$/);
  expect(hashWidgetKey(key)).toBe(hash);
  expect(newWidgetKey().key).not.toBe(key);
});
test("hashWidgetKey refuse un format inattendu", () => {
  for (const k of ["", "gm_", "abc", "gm_" + "a".repeat(42), "xx_" + "a".repeat(43)]) expect(hashWidgetKey(k)).toBeNull();
});
test("bearerKey", () => {
  expect(bearerKey("Bearer gm_x")).toBe("gm_x");
  expect(bearerKey("Basic abc")).toBeNull();
  expect(bearerKey(null)).toBeNull();
});
test("isLocalOrigin", () => {
  for (const o of ["http://localhost:5173", "http://127.0.0.1:4321", "http://localhost"]) expect(isLocalOrigin(o)).toBe(true);
  for (const o of ["https://localhost:5173", "http://localhost.evil.example", "https://evil.example", "http://localhost:5173/x", null, ""]) expect(isLocalOrigin(o)).toBe(false);
});
test("safeReturnPath", () => {
  expect(safeReturnPath("/relier?origin=http%3A%2F%2Flocalhost%3A5173")).toBe("/relier?origin=http%3A%2F%2Flocalhost%3A5173");
  for (const r of ["//evil.example", "https://evil.example", "/\\evil.example", "relier", null]) expect(safeReturnPath(r)).toBe("/");
});
```

- [ ] **Step 2:** `npx vitest run src/lib/widgetLink.test.ts` → FAIL (module absent).
- [ ] **Step 3:** Implémenter avec `node:crypto` (`randomBytes(32).toString("base64url")`, `createHash("sha256")`). `isLocalOrigin` : `new URL` dans un try, protocole `http:`, hôte `localhost` ou `127.0.0.1`, et `url.origin === origin`.
- [ ] **Step 4:** Le test passe.
- [ ] **Step 5:** Commit `feat: add widget key and origin helpers`.

### Task 3: Ajout partagé et décision de doublon

**Files:**
- Create: `src/lib/widgetIntake.ts`, `src/lib/widgetIntake.test.ts`, `src/server/applications.ts`
- Modify: `src/app/actions.ts` (`addApplication` délègue ; `applicationEvents` déplacé dans `src/server/applications.ts`)

**Interfaces:**
- Produces:
  - `intakeDecision(input: { company: string; ref: string; playerId: string; apps: (Application & { externalRef: string | null; source: string | null })[]; now: Date }): { kind: "known"; id: string } | { kind: "attach"; id: string } | { kind: "create" }` (pur)
  - `createApplication(player: Player, company: string, extra?: { externalRef?: string; source?: string }): Promise<{ id: string }>` (serveur : create, `settleChallenge`, `syncAchievements`, `after(notifyAll…)`, `revalidatePath("/")`)
  - `MAX_COMPANY = 80`, exporté de `src/server/applications.ts`
- Consumes: `findDuplicate` (`src/lib/playerView.ts`), `parisDay`.

`loadGame` renvoie des `Application` de `src/game/xp.ts` : y ajouter `externalRef` et `source` (lecture seule) si le chargement ne les remonte pas déjà.

- [ ] **Step 1: Tests qui échouent** (`widgetIntake.test.ts`), avec `now = 2026-11-19T15:00:00Z` :
  - même `ref` déjà présente pour ce joueur (même annulée ? non : seulement active) → `{ kind: "known", id }`
  - même `ref` chez l'autre joueur → `create`
  - « Doctolib » saisi à la main aujourd'hui (source null) → `attach` sur son id
  - « Doctolib » saisi à la main hier → `create`
  - « Doctolib » déjà venu de job-finder aujourd'hui avec une autre `ref` → `create` (deux offres chez la même entreprise)
  - « Doctolib — Dev front » à la main aujourd'hui, reçu « Doctolib » (doublon seulement possible) → `create`
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implémenter `intakeDecision`, puis `createApplication` en reprenant le corps actuel d'`addApplication` après la vérification de doublon ; `addApplication` garde validation et confirmation puis appelle `createApplication`.
- [ ] **Step 4:** `npm test` vert (les tests existants couvrent l'XP et les succès, inchangés).
- [ ] **Step 5:** Commit `refactor: share application creation between form and API`.

### Task 4: API de l'encart

**Files:**
- Create: `src/server/widget.ts`, `src/lib/widgetState.ts`, `src/lib/widgetState.test.ts`, `src/app/api/widget/state/route.ts`, `src/app/api/widget/applications/route.ts`

**Interfaces:**
- Produces:
  - `type WidgetState = { pseudo: string; character: CharacterId; color: ColorId; displayedForm: Form; levelForm: Form; mood: Mood; idleWorkdays: number; level: number; xpInLevel: number; xpForNext: number; today: number; capReached: boolean; streak: number; recent: { id: string; company: string; at: string; xp: number }[] }`
  - `widgetState(view: PlayerView, apps: Application[], playerId: string, now: Date): WidgetState` (pur ; `recent` = 5 dernières candidatures `source === "job-finder"` du joueur, `xp` = 0 si elle dépassait le plafond du jour, sinon `XP_PER_APPLICATION`)
  - `playerForKey(req: Request): Promise<Player | null>` (dans `src/server/widget.ts` : `bearerKey` → `hashWidgetKey` → clé non révoquée → joueur ; met `lastUsedAt` à jour)
  - `GET /api/widget/state` → 200 `WidgetState` | 401 `{ error: "unauthorized" }`
  - `POST /api/widget/applications` body `{ company: string; ref: string; sentAt?: string }` → 200 `{ added: boolean; attached: boolean; state: WidgetState }` | 400 `{ error: "Indique le nom de l'entreprise." }` | 401
- Consumes: `buildPlayerView`, `activeGoal`, `loadGame`, `intakeDecision`, `createApplication`.

- [ ] **Step 1: Tests qui échouent** (`widgetState.test.ts`) : niveau et XP repris de la vue ; `capReached` vrai à 15 candidatures du jour ; la 16e venue de job-finder a `xp: 0` dans `recent` ; les candidatures saisies à la main ne sont pas dans `recent` ; `recent` ne contient que celles du joueur.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implémenter `widgetState`, `playerForKey`, les deux routes (`export const dynamic = "force-dynamic"`, `Cache-Control: no-store`). Dans l'ajout : `ref` absent ou vide → 400 ; `kind: "known"` → `added:false` ; `attach` → `update` (`externalRef`, `source`) ; `create` → `createApplication(player, company, { externalRef: ref, source: "job-finder" })`.
- [ ] **Step 4:** Vérification manuelle en local, clé créée par la Tâche 5 ou par un script `tsx` : `curl` sans clé → 401 ; avec clé → état ; deux POST même `ref` → une seule candidature (`added:true` puis `false`) ; entreprise de 81 caractères → 400.
- [ ] **Step 5:** Commit `feat: add widget state and application API`.

### Task 5: Relier, retour après connexion, réglages

**Files:**
- Create: `src/app/relier/page.tsx`, `src/app/relier/actions.ts`, `src/app/relier/SendKey.tsx`, `src/app/reglages/WidgetLink.tsx`
- Modify: `src/app/connexion/page.tsx`, `src/app/connexion/LoginForm.tsx`, `src/app/connexion/dev-actions.ts` (paramètre `retour`), `src/server/session.ts` (`requireUser(returnTo?: string)` redirige vers `/connexion?retour=…`), `src/app/reglages/page.tsx`, `src/app/reglages/actions.ts`

**Interfaces:**
- Produces:
  - `linkWidget(origin: string): Promise<{ ok: true; key: string } | { ok: false; error: string }>` (action : `requirePlayer`, `isLocalOrigin` sinon erreur « Adresse de job-finder refusée. », révoque les clés actives du joueur, crée la nouvelle)
  - `unlinkWidget(): Promise<void>` (révoque, `revalidatePath("/reglages")`)
  - Message envoyé à l'ouvreur : `{ type: "goal-master:key", key }`, cible = `origin`.
- Consumes: `newWidgetKey`, `isLocalOrigin`, `safeReturnPath`.

- [ ] **Step 1:** `/relier?origin=…` : origine refusée → écran d'erreur sans bouton ; sinon `requirePlayer` avec retour vers `/relier?origin=…`, écran « Relier job-finder à ton compte ? » de la maquette (ce que l'encart peut et ne peut pas faire, Annuler / Relier). Après « Relier » : `SendKey` poste la clé à `window.opener`, `window.close()` ; sans ouvreur, écran « C'est relié » avec « Retour à job-finder » (pas de clé affichée).
- [ ] **Step 2:** Connexion : `/connexion?retour=` lu, passé par `safeReturnPath` au formulaire (`location.href = retour`) et à `devLogin` (`redirect(retour)`).
- [ ] **Step 3:** Réglages : bloc « job-finder » de la maquette. Relié : depuis (`createdAt` de la clé active), dernière reçue (dernière candidature `source = "job-finder"`), nombre comptées, « Couper le lien » avec confirmation dans l'écran. Pas relié : « Pas relié. Le lien se fait depuis l'encart Goal Master de job-finder, bouton « Relier ». »
- [ ] **Step 4:** Vérifier en local avec la page d'essai de la Tâche 6 : origine hostile refusée ; connexion directe depuis déconnecté qui revient sur `/relier` ; clé reçue par la page d'essai ; « Couper le lien » → l'état répond 401.
- [ ] **Step 5:** Commit `feat: link job-finder from Goal Master`.

### Task 6: Page `/widget`

**Files:**
- Create: `src/app/widget/page.tsx`, `src/app/widget/WidgetView.tsx`, `src/app/widget/layout.tsx` (sans en-tête ni fond vivant), `src/lib/widgetVictory.ts`, `src/lib/widgetVictory.test.ts`, `docs/maquettes/essai-job-finder.html` (page d'essai locale, jouant job-finder)
- Modify: `next.config.ts` (`headers()` : `frame-ancestors` sur `/widget`)

**Interfaces:**
- Produces:
  - `victoryFor(prev: WidgetState | null, next: WidgetState): { company: string; xp: number; levelUp: boolean; newForm: boolean; derust: boolean } | null` (pur : nulle au premier affichage ; sinon la plus récente de `next.recent` absente de `prev.recent`)
  - Messages reçus : `goal-master:key` (clé), `goal-master:refresh`. Messages envoyés au parent : `goal-master:unlinked` (401), `goal-master:ready` (au montage, pour demander la clé).
- Consumes: `WidgetState`, `Sprite`, `formName`.

- [ ] **Step 1: Tests qui échouent** (`widgetVictory.test.ts`) : premier état → null ; même `recent` → null ; nouvelle entrée → sa société et son XP ; niveau 7→8 → `levelUp` ; `levelForm` 2→3 → `newForm` ; `idleWorkdays` > 0 avant et 0 après → `derust`.
- [ ] **Step 2:** FAIL, puis implémenter, PASS.
- [ ] **Step 3:** `WidgetView` (client) : n'accepte les messages que d'une origine `isLocalOrigin` ; garde la clé en mémoire ; lit l'état au reçu de la clé, puis toutes les 30 s si `document.visibilityState === "visible"`, et à `goal-master:refresh` ; joue la victoire de la maquette (saut, étincelles, « +10 XP » ou « +0 XP » avec « compte, sans XP : plafond de 15 atteint aujourd'hui », « NIV. n ! », flash et « Nouvelle forme : … », rouille qui part) ; `prefers-reduced-motion` : ni saut ni flash ; clic sur le héros → `/` dans un nouvel onglet. Le dernier état vu est gardé en `localStorage` (try/catch) pour ne pas rejouer une victoire au rechargement.
- [ ] **Step 4:** `next.config.ts` : `async headers()` qui pose `Content-Security-Policy: frame-ancestors http://localhost:* http://127.0.0.1:*` sur `source: "/widget"`.
- [ ] **Step 5:** Page d'essai `essai-job-finder.html` servie par `npx serve` sur un port local : bouton « Relier » (ouvre `/relier?origin=…`, écoute la clé), iframe `/widget` qui reçoit la clé, bouton « Marquer envoyée » qui `POST` l'API puis envoie `goal-master:refresh`. Vérifier à 390 px et 1280 px : relier, victoire, plafond (après 15), lien coupé.
- [ ] **Step 6:** `npm test`, `npm run lint`, `npm run build` verts. Commit `feat: add job-finder widget page`.

### Task 7: PR

- [ ] `gh pr create --base dev` (titre `feat: Goal Master widget for job-finder`), description : ce que la clé permet, pages et routes, comment essayer avec la page d'essai.

---

## Lot 2 : job-finder (plan à écrire dans son dépôt, après fusion du lot 1)

Dans `~/Workspace/apps/job-finder-claude`, selon son CLAUDE.md : réglage `goalMaster` du profil et ligne d'édition ; clé dans `donnees/` ; table `goal_master_a_compter` remplie dans `changerStatut` quand `de !== 'envoyee'` et `vers === 'envoyee'` ; envoi immédiat et reprises (démarrage du serveur, passage suivant, « Réessayer ») ; 401 → clé effacée ; encart (non relié rendu par job-finder, relié = iframe), marge en bas de page, repli ; `/collect` qui se met à jour (`git pull` si arbre propre sur `main`, `npm install` si le lockfile change) ; adresse de Goal Master en dur, surchargeable par `JF_GOAL_MASTER_URL`.

## Corrections après relecture du plan (prévalent sur les tâches)

1. `intakeDecision` : une `ref` déjà reçue compte comme `known` même annulée (la contrainte unique couvre les annulées) ; la route traite aussi P2002 comme `known` (deux envois simultanés).
2. Pas de CORS : l'API n'est appelée que par le serveur local de job-finder (Node) et par `/widget` (même origine). La page d'essai devient un petit serveur Node `scripts/essai-job-finder.mjs` qui sert la page et fait le POST, comme le fera job-finder.
3. `/widget` ne doit pas porter le fond vivant ni `VersionWatcher` du layout racine : le layout racine les omet quand l'en-tête `x-pathname` (posé par `proxy.ts`) vaut `/widget`, ou à défaut la page les masque. `goal-master:ready` est envoyé à chaque montage pour redemander la clé.
4. Retour après connexion : `requirePlayer(returnTo?)` le transmet à `requireUser` ; `/connexion` lit `retour` et y redirige aussi quand on est déjà connecté.
5. Champs `externalRef` / `source` optionnels dans le type `Application` du jeu (fait).
6. La route valide l'entreprise (vide ou plus de `MAX_COMPANY`) et la `ref` (1 à 64 caractères) → 400.
7. Rattachement : on pose seulement `externalRef`, pas `source` ; une saisie rattachée n'entre donc ni dans `recent` (pas de fausse victoire) ni dans le compte « comptées par job-finder ».
8. `frame-ancestors 'none'` sur `/relier` ; `WidgetView` vérifie `event.source === window.parent` en plus de l'origine.
