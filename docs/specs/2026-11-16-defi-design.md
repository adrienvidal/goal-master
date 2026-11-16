# Défi entre les deux joueurs

Maquette validée : https://claude.ai/artifact/FGU4wdTYcMar8hPngDhvyz (`docs/maquettes/defi.html`).

Exception assumée au non-objectif « pas de compétition » du cadrage : un affrontement court, accepté par les deux, sans XP en jeu. Les candidatures du défi comptent aussi pour l'XP et pour le boss : le perdant a quand même fait avancer l'équipe.

## Règles

- **Lancer** : depuis la carte du binôme, « Défier ». Cible 3, 5 ou 10 candidatures ; échéance « ce soir minuit » (minuit suivant, heure de Paris) ou « vendredi 18 h » (le prochain, comme le duel). « Ce soir minuit » n'est plus proposé à partir de 21 h.
- **Un défi ouvert à la fois pour vous deux** (en attente ou en cours).
- **Un défi lancé par jour et par personne** (jour de Paris). Un défi refusé, ou expiré sans réponse, ne compte pas ; un défi annulé compte (pas d'envoi en boucle de notifications).
- **Répondre** : le destinataire relève le défi ou passe son tour, tant que l'échéance n'est pas passée. Le lanceur peut annuler tant que le défi est en attente.
- **Course** : seules comptent les candidatures envoyées entre l'acceptation et la fin (victoire ou échéance). Une candidature retirée après la fin ne change plus le score.
- **Victoire** : le premier qui atteint la cible gagne aussitôt ; `winnerId` et `wonAt` sont enregistrés à cet instant et ne se retirent plus (comme un succès). Échéance passée sans gagnant : nul.
- **Couronne** : le gagnant porte une couronne sur son avatar, partout où il s'affiche, jusqu'à la fin du lendemain de sa victoire (heure de Paris). Calculée, jamais stockée. Elle se pose par-dessus la rouille et le bandage. Pas d'option pour la retirer.
- **Aucune XP en jeu.** XP, niveau, forme et succès existants ne bougent pas.

## Succès

| Code | Titre | Condition |
|---|---|---|
| `duelist` | Duelliste | Gagner un défi |
| `unbeaten` | Invaincu | Gagner 3 défis d'affilée (un nul ou une défaite remet à zéro) |

## Notifications (catégorie Duel, hors plafond)

| Événement | Destinataire | Clé | Déclencheur | Clic |
|---|---|---|---|---|
| Défi reçu | destinataire | `challenge:<id>` | `launchChallenge` | `/` |
| Défi gagné / perdu | les deux | `challenge-end:<id>` | `addApplication` (cible atteinte) | `/defi` |

Pas de notification pour un nul, une expiration, un refus ou une annulation : ces fins tombent souvent à minuit, et l'app les montre à la prochaine ouverture.

## Données (une migration)

`Challenge { id, challengerId, opponentId, target, deadline, status (PENDING | ACCEPTED | DECLINED | CANCELLED), createdAt, acceptedAt?, closedAt?, winnerId?, wonAt? }`. L'état affiché (en attente, expiré, en cours, gagné, nul) se déduit de ces champs et de l'heure.

## Écrans

- **Accueil** : bouton « Défier » à côté de « Motiver » (grisé avec la raison), panneau de lancement dans la carte du binôme ; bandeau « X te défie » chez le destinataire ; carte « en attente » avec « Annuler » chez le lanceur ; bandeaux refusé / expiré (fermables) ; carte de course au-dessus de « + Candidature ».
- **`/defi`** : résultat du dernier défi terminé (victoire, défaite, nul), ouvert une fois d'office par appareil, comme `/duel`.
- **Intro** : 7e écran « Le Défi » ; `INTRO_STEP_COUNT` = 7, `LATEST_NEWS` = « le Défi ».
- **`/succes`** : les deux succès.

Écart avec la maquette : la carte de course reste dans la colonne du joueur sur ordinateur (pas en pleine largeur), pour ne pas déplacer la grille de l'accueil.
