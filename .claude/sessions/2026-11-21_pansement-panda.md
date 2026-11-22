# 2026-11-21 · Pansement du héros blessé sur le front

## Reprise

```
✅ Fait      Pansement sur le front, une ligne d'épaisseur, en prod
⛔ Bloqué    Aucun
🎯 Priorité  Vérifier le boss à 34 PV, puis trancher les 3 cas du boss à l'échéance (31/12)
```

## Réalisé
- Le pansement du Panda flottait au-dessus de la tête : il se plaçait à 12 % du haut et sur 56 % de la largeur de l'image, faussés par le bâton et les oreilles (PR #167)
- Il se place maintenant d'après le dessin : ligne du front au-dessus des yeux (deux lignes au-dessus chez le Panda, une chez le Chevalier), 3e ligne de la tête pour les casques fermés, d'un bord à l'autre du contour ; suit la couronne et les poses, ne bouge pas au sommeil, absent au K.O.
- Sur les petits avatars (carte du binôme), la hauteur minimale de 4 px écran le faisait presque deux lignes et cachait les yeux : il fait une seule ligne à toutes les tailles (PR #168)
- Mise en production (PR #169), déploiement Vercel réussi
- Planche de cinq variantes de pansement : https://claude.ai/artifact/QHVQzCyjQLXM3mEhiPeRm4 (Adrien a gardé la A, le bandeau sur le front)
- Archivées : sessions du 16/11 et du 17/11, leurs items encore ouverts reportés dans `reste-a-faire.md`

## Reste à faire
- Vérifier le boss à 34 PV, puis trancher les 3 cas du boss à l'échéance (31/12) (repris du 20/11)
- Backlog : `reste-a-faire.md`

## Blockers
- Aucun

## Décisions
- Pansement : bandeau blanc sur le front (variante A), préféré au sparadrap en croix
- Épaisseur fixée à une ligne du dessin, quelle que soit la taille d'affichage
