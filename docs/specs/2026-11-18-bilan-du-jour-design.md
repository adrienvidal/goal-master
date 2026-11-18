# Bilan du jour : un seul e-mail par jour

Maquette validée le 18/11 : `docs/maquettes/bilan-du-jour.html` (Artifact https://claude.ai/artifact/SX3pyJ8tfcHwpts9w4p1BR).
Remplace l'e-mail envoyé à chaque notification (spec notifications du 16/11).

## Pourquoi

Un joueur qui joue beaucoup recevait un e-mail par événement : douze dans la journée. Le push reste l'alerte
instantanée ; l'e-mail devient un bilan, au plus un par jour.

## Règles

- **Push inchangé** : il part tout de suite, à chaque événement, avec le plafond de 2 par jour pour les catégories
  plafonnées.
- **Plus d'e-mail par événement.** Seul le code de connexion part encore tout de suite.
- **Un bilan par joueur et par jour**, envoyé par le cron quotidien de 18 h 01 (heure de Paris), après le
  rappel du jeudi, le résultat du vendredi, l'Arène et la rouille.
- **Contenu** : toutes les notifications du joueur pas encore envoyées par e-mail, dans l'ordre d'arrivée, avec
  l'heure (préfixée de « hier » ou de la date si elles datent d'avant aujourd'hui) et le lien de chacune.
- **Exclus du bilan** : le tour d'Arène « À toi de jouer » (`sendsEmail`, périmé le soir), et les catégories
  coupées, que ce soit au moment de l'événement ou au moment du bilan.
- **Le plafond ne touche que le push** : une notification plafonnée au-delà de 2 est notée sans push, et figure
  dans le bilan.
- **En tête** : le compte du jour, calculé : candidatures du jour, XP gagnées depuis minuit (jamais négatives),
  coups portés au boss sur PV (le duel tranché aujourd'hui s'il y en a un, sinon le duel en cours ; case
  absente sans objectif).
- **Résultat du duel** : s'il fait partie du bilan, il sort de la liste et s'affiche en tête, dans un cadre doré
  (victoire) ou rouge (défaite).
- **Objet** : `Ta journée : <titre de l'événement le plus important>`, suivi de `, et N autre(s) nouvelle(s)`.
  Ordre d'importance : résultat du duel, rappel du jeudi, quête (reçue, faite, validée ou refusée), défi, Arène,
  relance, binôme, rouille, nouveauté, quête annulée.
- **Image** : la scène 8 bits de l'événement le plus important (`sceneFor`).
- **Rien à dire** : pas d'e-mail.
- **Envoi raté** : les lignes restent en attente et partent avec le bilan suivant.

## Données

`NotificationLog` gagne deux colonnes : `event Json?` (l'événement, à mettre dans le bilan) et `mailedAt
DateTime?`. En attente = `event` posé et `mailedAt` nul. Les lignes d'avant la migration ont `event` nul : jamais
envoyées. Le texte se recalcule par `textOf(event)`, rien d'autre n'est stocké.

## Hors périmètre

Réglage de l'heure d'envoi, second bilan à midi, retrait de ce que le joueur a déjà vu dans l'app.
