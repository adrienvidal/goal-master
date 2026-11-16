# 2026-11-16 · Cadrage MVP et lots 1 à 7

## Reprise

```
✅ Fait      MVP en prod sur goal.viloris.io, intro, paysages, objectif et date communs
⛔ Bloqué    Rien
🎯 Priorité  Adrien crée son profil (fixe la date), puis Nicolas se connecte
```

## Réalisé
- Veille, cadrage `docs/specs/2026-11-16-goal-master-mvp-design.md`, maquettes `docs/maquettes/goal-master-maquettes.html` (Artifact https://claude.ai/artifact/JiTMXkmdRQK9AQQkntjA3c)
- PR #1 cadrage, #2 lot 1 (moteur de jeu pur, 37 tests), #3 lot 2 (connexion code e-mail Better Auth + premier lancement), #4 lot 3 (accueil, candidatures, binôme)
- Neon (Frankfurt) relié à Vercel ; variables SMTP_USER/SMTP_PASS (copiées de viloris-studio), BETTER_AUTH_SECRET, ALLOWED_EMAILS=contact@viloris.io ajoutées sur Vercel
- Testé de bout en bout : code reçu dans contact@viloris.io, connexion, premier lancement, ajout/doublon/annulation

## Reste à faire
- **D'abord** : base de test locale demandée par Adrien. Postgres dans Docker (`docker-compose.yml`), `DATABASE_URL` local dans un `.env.development.local` non écrasé par `vercel env pull` (ou script `npm run db`), `prisma migrate deploy` + `prisma generate` ; mettre à jour la ligne Stack du CLAUDE.md (Postgres local dans Docker, base en ligne réservée aux déploiements)
- Annuler la candidature de test « doctolib » dans la base Neon (accord d'Adrien à demander) ou repartir de zéro en prod
- Lot 4 avatars (sprites des maquettes : grilles CHARS/PFORMS, poses, humeurs, évolution animée)
- Lot 5 Motiver (4 messages, 1/jour, bonus, Web Push + PWA)
- Lot 6 page Succès, fin d'objectif (victoire, temps écoulé, changement de personnage)
- Lot 7 déploiement prod (BETTER_AUTH_URL de prod à poser)
- Ajouter la 2e adresse dans ALLOWED_EMAILS (Vercel) quand Adrien l'aura

## Blockers
- 2e adresse e-mail (Adrien)

## Décisions
- Better Auth (comme viloris-studio) plutôt que Neon Auth ; adresse non autorisée → message explicite (cadrage §4.1)
- Ninja et Guerrière en pause ; Chevalier et Panda au MVP ; poses Repos/Action/Victoire dessinées
- Autorisation d'Adrien : fusionner les PR de lot et déployer en prod sans validation
- Aujourd'hui, la base de dev = la base Neon principale (l'intégration Vercel relie Development à main) : le joueur « Adrien » et une candidature de test « doctolib » y existent
- Adrien veut une base de test **locale** (Docker), pas une branche Neon
- `.gitignore` rangé (PR #6) ; `.env` vide de prisma init supprimé

---

## Suite de la session : base locale, lots 4 à 7, mise en production

### Réalisé
- **Blocker levé** : boulom.nicolas@gmail.com ajouté à ALLOWED_EMAILS (dev, preview, prod)
- PR #8 base Postgres locale Docker (`npm run db`, `.env.development.local` prioritaire), ligne Stack du CLAUDE.md à jour
- PR #9 lot 4 : sprites 8 bits portés des maquettes (`src/lib/sprites.ts`, grilles dans `spriteGrids.ts`), humeurs, poses Repos/Action/Victoire, évolution et Retour en grâce plein écran, ligne d'état du binôme
- PR #10 lot 5 : Motiver (4 messages, 1/jour, clignote), bandeau de relance reçue, Web Push (clés VAPID sur Vercel, table PushSubscription), service worker `public/sw.js`, manifeste et icônes PWA
- PR #11 lot 6 : `/succes`, `/objectif/fin` (victoire, temps écoulé : prolonger 4 semaines ou repartir), `/objectif/nouveau` (changement de personnage) ; correctif import web-push
- PR #12 lot 7 : `vercel.json` (preset Next.js), script `vercel-build` qui applique les migrations ; PR #13 dev → main
- Production : https://goal-master-theta.vercel.app, BETTER_AUTH_URL posé, migration appliquée, connexion testée de bout en bout
- Base de prod purgée à la demande d'Adrien (toutes les données, migrations conservées) : la candidature de test « doctolib » a disparu avec
- Badge Git « 10K » de VS Code : vue figée sur un ancien état (avant le .gitignore), dépôt propre ; recharger la fenêtre
- Parcours complet testé en local (connexion, candidature, relance, victoire, succès, nouvel objectif en Panda, temps écoulé)

### Reste à faire
- Adrien recrée son profil en prod (premier lancement)
- Envoyer le lien à Nicolas ; sur iPhone, ajouter l'app à l'écran d'accueil pour recevoir les relances
- Aperçus Vercel en échec « Resource provisioning failed » (intégration Neon, sans doute le quota de branches) : nettoyer les branches Neon des aperçus
- Fil du binôme : « Tom est devenu Chevalier » n'est pas affiché (seuls les états endormi/rouille/déchu le sont)

### Blockers
- Aucun

### Décisions
- Poses Action et Victoire dérivées de la pose Repos par code (arme pointée, arme levée), pas 36 dessins à la main
- Évolution et Retour en grâce détectés par appareil (dernier état vu en localStorage)
- L'invitation aux notifications est sur l'accueil plutôt qu'en 4e étape du premier lancement
- « Mission accomplie » se débloque dès la cible atteinte ; l'objectif est clos au clic sur « Nouvel objectif »
- Pas de domaine personnalisé : on reste sur goal-master-theta.vercel.app

---

## Suite : confort, identité visuelle, intro et domaine

### Réalisé
- PR #16 connexion directe en local (choix d'une adresse autorisée, « Changer de joueur ») ; jamais en production
- PR #18 objectif fixé à 100 candidatures, commun, non modifiable
- PR #19 et #21 icône épée verticale (favicon, Apple, PWA) ; paysages 8 bits en fond, choix personnel dans `/reglages` (Château de nuit par défaut, champ `Player.landscape`) ; date limite commune (le premier la fixe, l'autre la reprend, Prolonger décale les deux)
- PR #21 et #24 intro du premier lancement en 4 écrans (`/intro`, cookie `gm-intro-seen`), héros dans un cadre ; revoir depuis Réglages
- PR #22 et #26 retouches responsive (Mes succès, date sur une ligne, réglages sur deux colonnes), ligne « Ton binôme reprendra cette date »
- Domaine **goal.viloris.io** : CNAME chez name.com, BETTER_AUTH_URL de prod à jour, connexion par code vérifiée
- Base de prod purgée deux fois à la demande d'Adrien, vide en fin de session
- Maquettes de référence : icône et fond https://claude.ai/artifact/W8a7C4erG4kDBCxAJNhsFe ; intro https://claude.ai/artifact/A8WmTezNTQUourDKYfCyaQ

### Reste à faire
- Adrien crée son profil en prod (il fixe la date commune), puis envoie https://goal.viloris.io à Nicolas (sur iPhone : ajouter à l'écran d'accueil pour les relances)
- Aperçus Vercel en échec « Resource provisioning failed » (quota de branches Neon) : nettoyer les branches Neon
- Fil du binôme : « Nicolas est devenu Chevalier » non affiché
- Repasse responsive non faite sur `/connexion`, `/objectif/nouveau`, `/objectif/fin`

### Blockers
- Aucun

### Décisions
- Objectif commun fixe (100) et date limite commune ; le premier joueur choisit la date
- Fond d'écran propre à chaque joueur, intro vue une fois par appareil
- NordVPN met en cache les réponses DNS négatives : le couper pour tester un domaine fraîchement créé
