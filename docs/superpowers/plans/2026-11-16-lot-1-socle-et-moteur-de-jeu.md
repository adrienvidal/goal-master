# Lot 1 : socle et moteur de jeu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser le projet Next.js et coder, en fonctions pures testées, toutes les règles du jeu (XP, niveaux, formes, série, plafond, relances, rétrogradation, succès), plus le schéma de base.

**Architecture:** Le moteur de jeu vit dans `src/game/`, sans dépendance à la base ni à React : chaque règle prend des données brutes (candidatures, relances, date du jour) et renvoie un état calculé. L'XP, le niveau, la forme et l'humeur ne sont jamais stockés, ils se recalculent (règle du CLAUDE.md). Seuls les succès débloqués sont stockés, car ils ne se retirent jamais.

**Tech Stack:** Next.js App Router + TypeScript strict, npm, Vitest, Tailwind, Prisma (Neon).

**Spec:** `docs/specs/2026-11-16-goal-master-mvp-design.md`

## Feuille de route MVP (un plan par lot, écrit au début de chaque lot)

1. **Socle et moteur de jeu** (ce plan).
2. Connexion par code e-mail (Neon Auth OTP, 2 adresses autorisées) et premier lancement (pseudo, personnage, couleur, objectif).
3. Accueil : « + Candidature » (entreprise, doublon, annulation, plafond), progression, carte du binôme et fil.
4. Avatars : rendu des sprites (Chevalier, Panda, 6 formes, 3 poses, humeurs), évolution et retour en grâce animés.
5. Motiver : 4 messages, 1 par jour, bonus, notifications push (Web Push, PWA).
6. Succès et fin d'objectif (victoire, temps écoulé, changement de personnage).
7. Déploiement Vercel + Neon.

## Global Constraints

- XP : +10 par candidature, +15 pour chacun par relance suivie d'effet.
- Niveau n → n+1 coûte `20 + 2 × n` XP ; on démarre au niveau 1 avec 0 XP.
- Formes aux niveaux 1, 4, 8, 12, 16, 20 (6 formes).
- Plafond : au-delà de 15 candidatures dans la journée, elles comptent mais rapportent 0 XP.
- Jours découpés à minuit, fuseau `Europe/Paris`.
- Série : jours calendaires consécutifs avec au moins une candidature.
- Inactivité de l'avatar comptée en jours ouvrés (lundi à vendredi).
- Rétrogradation : 2 jours ouvrés → endormi, 4 → fatigué, 7 → épuisé et déchu (une forme de moins), +1 forme perdue tous les 5 jours ouvrés de plus, plancher forme 1.
- Reconquête : 3 candidatures réparties sur 2 jours calendaires consécutifs.
- Relance suivie d'effet : le destinataire candidate dans les 24 h après l'envoi.
- Une candidature annulée ne compte nulle part (XP, série, succès futurs).
- npm uniquement ; nommage du code en anglais.

## Review Focus

- **Candidature à 23 h 30 heure de Paris** → comptée ce jour-là, pas le lendemain UTC. Test dans Task 2.
- **Changement d'heure (dernier dimanche d'octobre / mars)** → le découpage des jours reste juste. Test dans Task 2.
- **16ᵉ candidature du jour annulée** → la suivante récupère le droit aux XP (le plafond compte les candidatures non annulées). Test dans Task 4.
- **Week-end sans candidature** → aucune progression de l'inactivité. Test dans Task 5.
- **Joueur déchu qui candidate 1 fois puis s'arrête** → reste déchu, ne cumule pas de pertes en double. Test dans Task 5.

---

### Task 1: Scaffold Next.js, Vitest, Prisma

**Files:**
- Create: projet Next.js à la racine (`package.json`, `src/app/`, `tsconfig.json`, Tailwind), `vitest.config.ts`, `src/game/smoke.test.ts`, `.gitignore`, `.env.example`

- [ ] **Step 1:** `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (répertoire déjà occupé par `docs/` et `CLAUDE.md` : créer dans un dossier temporaire et déplacer si l'outil refuse).
- [ ] **Step 2:** `npm i -D vitest` ; `vitest.config.ts` avec l'alias `@` → `src` ; script `"test": "vitest run"`.
- [ ] **Step 3:** `src/game/smoke.test.ts` : `expect(1 + 1).toBe(2)` ; `npm test` → PASS.
- [ ] **Step 4:** `npm i prisma @prisma/client` puis `npx prisma init --datasource-provider postgresql` ; `.env.example` contient `DATABASE_URL=`.
- [ ] **Step 5:** Commit `feat: scaffold Next.js app with Vitest and Prisma`.

### Task 2: Calendrier (jours de Paris, jours ouvrés)

**Files:** Create `src/game/calendar.ts`, Test `src/game/calendar.test.ts`

**Interfaces — Produces:**
- `type Day = string` (format `YYYY-MM-DD`)
- `parisDay(date: Date): Day`
- `addDays(day: Day, n: number): Day`
- `isWorkday(day: Day): boolean`
- `dayRange(from: Day, to: Day): Day[]` (bornes incluses, ordre croissant ; vide si `from > to`)

- [ ] **Step 1: tests**
  - `parisDay(new Date('2026-11-16T22:30:00Z'))` → `'2026-11-16'` (23 h 30 Paris) ; `new Date('2026-11-16T23:30:00Z')` → `'2026-11-17'`.
  - Été : `new Date('2026-07-01T22:30:00Z')` → `'2026-07-02'`.
  - Changement d'heure : `addDays('2026-10-24', 1)` → `'2026-10-25'`, `addDays('2026-10-25', 1)` → `'2026-10-26'`.
  - `isWorkday('2026-11-14')` (samedi) → false ; `isWorkday('2026-11-16')` (lundi) → true.
  - `dayRange('2026-11-14','2026-11-16')` → 3 jours ; `dayRange('2026-11-17','2026-11-16')` → `[]`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implémenter avec `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })` pour `parisDay` ; arithmétique de jours sur des dates UTC à midi pour `addDays` (insensible aux changements d'heure).
- [ ] **Step 4:** `npm test` → PASS. Commit `feat: add Paris calendar helpers`.

### Task 3: XP, niveaux, formes

**Files:** Create `src/game/levels.ts`, Test `src/game/levels.test.ts`

**Interfaces — Produces:**
- `XP_PER_APPLICATION = 10`, `XP_NUDGE_BONUS = 15`, `DAILY_XP_CAP = 15`
- `xpToNextLevel(level: number): number` → `20 + 2 * level`
- `levelFromXp(xp: number): { level: number; xpInLevel: number; xpForNext: number }`
- `FORM_LEVELS = [1, 4, 8, 12, 16, 20] as const`
- `type Form = 1 | 2 | 3 | 4 | 5 | 6`
- `formForLevel(level: number): Form`

- [ ] **Step 1: tests**
  - `levelFromXp(0)` → `{ level: 1, xpInLevel: 0, xpForNext: 22 }`.
  - `levelFromXp(22)` → level 2, xpInLevel 0.
  - `levelFromXp(420)` → `{ level: 13, xpInLevel: 24, xpForNext: 46 }` (valeurs des maquettes).
  - `levelFromXp(310)` → level 11.
  - `formForLevel(1)`→1, `(3)`→1, `(4)`→2, `(8)`→3, `(12)`→4, `(16)`→5, `(20)`→6, `(35)`→6.
- [ ] **Step 2–4:** FAIL, implémenter, PASS. Commit `feat: add XP level and form rules`.

### Task 4: Registre d'XP (plafond et bonus de relance)

**Files:** Create `src/game/xp.ts`, Test `src/game/xp.test.ts`

**Interfaces:**
- Consumes: `parisDay`, `XP_PER_APPLICATION`, `XP_NUDGE_BONUS`, `DAILY_XP_CAP`
- Produces:
  - `type Application = { id: string; userId: string; company: string; createdAt: Date; cancelledAt: Date | null }`
  - `type Nudge = { id: string; senderId: string; recipientId: string; sentAt: Date }`
  - `activeApplications(apps: Application[]): Application[]` (sans les annulées)
  - `nudgeSucceeded(nudge: Nudge, apps: Application[]): boolean` (une candidature active du destinataire avec `sentAt < createdAt <= sentAt + 24 h`)
  - `totalXp(userId: string, apps: Application[], nudges: Nudge[]): number`

- [ ] **Step 1: tests**
  - 3 candidatures le même jour → 30 XP.
  - 17 candidatures le même jour → 150 XP ; 15 un jour + 2 le lendemain → 170.
  - 16 candidatures dont la 3ᵉ annulée → 150 XP (le plafond ne compte que les actives).
  - Relance envoyée par A à B le 16/11 10 h, B candidate le 17/11 9 h → `nudgeSucceeded` true, `totalXp(A)` inclut +15, `totalXp(B)` = 10 + 15.
  - B candidate le 17/11 11 h (plus de 24 h) → false, pas de bonus.
  - Candidature de B antérieure à la relance → false.
- [ ] **Step 2–4:** FAIL, implémenter, PASS. Commit `feat: add XP ledger with daily cap and nudge bonus`.

### Task 5: Série et état de l'avatar (rétrogradation)

**Files:** Create `src/game/avatar.ts`, Test `src/game/avatar.test.ts`

**Interfaces:**
- Consumes: `Day`, `addDays`, `isWorkday`, `dayRange`, `Form`
- Produces:
  - `countsByDay(apps: Application[]): Map<Day, number>` (actives seulement, jour de Paris)
  - `currentStreak(counts: Map<Day, number>, today: Day): number` (part d'aujourd'hui s'il compte, sinon d'hier)
  - `bestStreak(counts: Map<Day, number>): number`
  - `type Mood = 'normal' | 'sleep' | 'tired' | 'exhausted'`
  - `avatarState(counts: Map<Day, number>, levelForm: Form, today: Day): { mood: Mood; idleWorkdays: number; lostForms: number; displayedForm: Form; fallen: boolean; reconquests: number }`

Algorithme de `avatarState` (non déterminé par la signature) : parcourir les jours du premier jour avec candidature jusqu'à `today`. Jour avec candidature : si `fallen`, tester la reconquête (ce jour + la veille ont tous deux des candidatures et leur somme ≥ 3 → `fallen=false`, `lostForms=0`, `reconquests++`) ; dans tous les cas `idle=0`. Jour sans candidature et ouvré : `idle++` ; si `idle >= 7` → `fallen=true`, `lostForms = max(lostForms, 1 + floor((idle - 7) / 5))`. `mood` : `fallen` → exhausted, sinon idle ≥ 4 → tired, idle ≥ 2 → sleep, sinon normal. `displayedForm = max(1, levelForm - lostForms)`. Aucune candidature du tout → normal.

- [ ] **Step 1: tests**
  - Série : candidatures 14, 15, 16/11, today 16/11 → 3 ; today 17/11 sans candidature → 3 ; today 18/11 → 0.
  - `bestStreak` sur 1-2-3 et 10-11 → 3.
  - Dernière candidature vendredi 13/11, today lundi 16/11 → idle 1, normal (week-end ignoré).
  - Dernière candidature lundi 9/11, today jeudi 12/11 → idle 3, sleep ; vendredi 13/11 → idle 4, tired.
  - Dernière candidature lundi 2/11, today mercredi 11/11 → idle 7, exhausted, lostForms 1, `displayedForm` 3 pour `levelForm` 4.
  - idle 12 → lostForms 2 ; `levelForm` 1 → `displayedForm` 1 (plancher).
  - Déchu puis 1 candidature le 12/11 → toujours fallen ; puis 2 le 13/11 → fallen false, lostForms 0, reconquests 1.
  - Déchu, 1 candidature le 12/11 puis 1 le 13/11 (somme 2) → toujours fallen, lostForms inchangé.
  - Une candidature annulée ne réveille pas l'avatar.
- [ ] **Step 2–4:** FAIL, implémenter, PASS. Commit `feat: add streak and avatar decline rules`.

### Task 6: Succès

**Files:** Create `src/game/achievements.ts`, Test `src/game/achievements.test.ts`

**Interfaces:**
- Consumes: `activeApplications`, `nudgeSucceeded`, `countsByDay`, `bestStreak`, `avatarState`
- Produces:
  - `type AchievementId = 'first_step' | 'on_the_way' | 'quarter' | 'halfway' | 'centurion' | 'warm_up' | 'week_on_fire' | 'machine' | 'mission' | 'duo' | 'coach' | 'phoenix' | 'revenant'`
  - `ACHIEVEMENTS: Record<AchievementId, { title: string; condition: string }>` (titres et conditions du §6.5 du cadrage, mot pour mot)
  - `earnedAchievements(input: { userId: string; partnerId: string; apps: Application[]; nudges: Nudge[]; goalsReached: number; today: Day; levelForm: Form }): Set<AchievementId>`

Seuils : 1/10/25/50/100 candidatures actives ; meilleure série 3/7/30 ; `goalsReached >= 1` ; duo = un jour où les deux ont une candidature active ; coach = 5 relances envoyées suivies d'effet ; phoenix = au moins une relance reçue suivie d'effet ; revenant = `reconquests >= 1`.

- [ ] **Step 1: tests**
  - 0 candidature → ensemble vide ; 10 → `first_step`, `on_the_way`.
  - Série de 7 jours → `warm_up`, `week_on_fire`.
  - Partenaire ayant candidaté le même jour → `duo`.
  - 5 relances envoyées suivies d'effet → `coach` ; 4 → pas `coach`.
  - Relance reçue puis candidature dans les 24 h → `phoenix`.
  - Scénario de reconquête de la Task 5 → `revenant`.
  - `Object.keys(ACHIEVEMENTS).length` → 13.
- [ ] **Step 2–4:** FAIL, implémenter, PASS. Commit `feat: add achievement rules`.

### Task 7: Schéma Prisma

**Files:** Modify `prisma/schema.prisma`

**Interfaces — Produces (lus par les lots suivants):**
- `enum Character { KNIGHT PANDA }`, `enum Color { BLUE RED GREEN PURPLE ORANGE BLACK }`, `enum GoalStatus { ACTIVE COMPLETED EXPIRED }`
- `Player { id String @id (identifiant Neon Auth), email String @unique, pseudo String, character Character, color Color @unique, createdAt }` (`color` unique : deux joueurs ne partagent pas une couleur)
- `Goal { id, playerId, target Int @default(100), deadline DateTime, status GoalStatus @default(ACTIVE), createdAt, closedAt DateTime? }`
- `Application { id, playerId, company String, createdAt, cancelledAt DateTime? }`, index `(playerId, createdAt)`
- `Nudge { id, senderId, recipientId, message Int (0-3), sentAt }`
- `UnlockedAchievement { playerId, code String, unlockedAt }`, `@@id([playerId, code])`

- [ ] **Step 1:** Écrire le schéma.
- [ ] **Step 2:** `npx prisma validate` → « The schema ... is valid ». `npx prisma generate` → OK.
- [ ] **Step 3:** Commit `feat: add Prisma schema for players goals applications nudges`.
