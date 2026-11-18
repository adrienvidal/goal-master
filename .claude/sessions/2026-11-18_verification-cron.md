# 2026-11-18 · Vérification du cron et des notifications

## Reprise

```
✅ Fait      Cron n8n du 17/11 OK, notifications de l'Arène parties
⛔ Bloqué    Aucun
🎯 Priorité  Rappel du boss jeudi 19/11 à 18 h 01 (échéance 19/11)
```

## Réalisé
- Exécution n8n du 17/11 à 18 h 01 : succès (`considered: 3`) ; celle du 16/11 était en erreur, avant le correctif
- `NotificationLog` en production alimenté : provocation, tours d'Arène, relances, Nouveauté
- Nicolas prévenu par le cron de 18 h 01 qu'il avait la main (`arena-turn:…:8`) : point « prévenir Nicolas » refermé

## Reste à faire
- Jeudi 19/11 et vendredi 20/11 à 18 h 01 : rappel du boss, puis résultat du duel (relire n8n et `NotificationLog`)
- Premier vrai combat d'Arène et premier vrai défi avec Nicolas en production
- Parcours du tour injouable pas testé en navigateur : regarder le journal au prochain combat
- Pour que le vrai Nicolas teste un aperçu : retirer `PREVIEW_DIRECT_LOGIN` et `DEV_MAIL_TO` de Preview
- Effets non portés : impact sur l'attaque simple, aura des Bottes à l'évolution 5 (si le combat paraît encore sec)
- Base locale : une Arène de test `local-test` (à effacer si gênante)
- Toujours ouverts (session du 16/11) : relance Android app ouverte, textes de la carte du boss

## Blockers
- Aucun

## Décisions
- Lecture de la base de production par `neonctl connection-string main --project-id plain-smoke-71180083` (organisation Vercel), en lecture seule
