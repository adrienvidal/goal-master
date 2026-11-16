# 2026-11-16 · Cadrage MVP et lots 1 à 3

## Reprise

```
✅ Fait      Cadrage + maquettes validés, lots 1 (moteur), 2 (connexion), 3 (accueil) fusionnés
⛔ Bloqué    2e adresse e-mail autorisée (Adrien, quand son ami sera prêt)
🎯 Priorité  Base Postgres locale (Docker) pour le dev, puis lot 4 (sprites)
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
