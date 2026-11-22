# 2026-11-22 · Encart accepté depuis job-finder en ligne

## Reprise

```
✅ Fait      Encart accepté depuis job.viloris.io, en prod
⛔ Bloqué    Aucun
🎯 Priorité  Vérifier le boss à 34 PV, puis trancher les 3 cas du boss à l'échéance (31/12)
```

## Réalisé
- Note de l'autre session (encart pour job-finder en ligne) fusionnée dans le backlog (PR #171)
- L'encart accepte https://job.viloris.io, adresse exacte en liste fermée, en plus de localhost et Tailscale : `frame-ancestors` de `/widget`, messages de `WidgetView` et `FreeScene`, retour de clé de `/relier` (PR #172). `isLocalOrigin` renommé `isJobFinderOrigin`. Message « Lien impossible » sans « sur ton ordinateur ». Test écrit d'abord, 359 tests verts
- Mise en production sur accord d'Adrien (PR #173) : déploiement réussi, en-tête vérifié sur goal.viloris.io (`frame-ancestors ... https://job.viloris.io`)
- Ménage : branches distantes fusionnées élaguées ; sessions du 18/11 et du 19/11 archivées, leurs points ouverts reportés dans `reste-a-faire.md`

## Reste à faire
- Vérifier le boss à 34 PV, puis trancher les 3 cas du boss à l'échéance (31/12) (repris du 20/11)
- Côté job-finder (autre projet) : encart en ligne avec sa clé de liaison, repli sur téléphone ; puis l'essayer pour de vrai
- Backlog : `reste-a-faire.md`

## Blockers
- Aucun

## Décisions
- job-finder en ligne autorisé par liste fermée d'adresses exactes (`ONLINE_ORIGINS`), pas par motif de domaine
- Goal Master mis en production avant job-finder : job.viloris.io ne peut afficher que l'encart de production
