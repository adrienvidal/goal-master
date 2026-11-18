# Arène : combat au tour par tour entre les deux joueurs

Maquettes validées : https://claude.ai/artifact/SM7mSDbDSK1K7V4e1DKX7j (`docs/maquettes/arene.html`).

**v2 (18/11)** : l'Arène devient un jeu à part, sans lien avec les candidatures ; seule l'évolution (le chemin parcouru) fixe les stats. Maquette v2 : https://claude.ai/artifact/Uk8K3M2Zt568hcMHccvVX1 (`docs/maquettes/arene-v2.html`).

Pourquoi : Adrien veut **piloter son héros** contre celui de Nicolas, en RPG, chacun quand il peut. Le Défi (la course) reste à côté, inchangé. Comme le Défi, c'est une exception assumée au « pas de compétition » du cadrage : rien n'est en jeu sur l'XP, et seules les candidatures font avancer le combat.

**Anti-objectifs** : ~~un jeu qui récompense la tactique plus que les candidatures~~ (levé en v2) ; un combat joué d'avance par celui qui a de l'avance ; un héros rouillé exclu au moment où il a besoin d'un coup de pouce.

## Règles

- **Provoquer** : depuis la carte du binôme, bouton « Arène ». Rien à régler. Une Arène ouverte à la fois pour vous deux (en attente ou en cours) ; une provocation par jour et par personne (jour de Paris). Une provocation refusée ou restée sans réponse 24 h ne compte pas ; une provocation retirée compte. Un Défi en cours ne bloque pas l'Arène.
- **Répondre** : « Entrer dans l'Arène » ou « Pas cette fois », dans les 24 h. Le lanceur peut retirer sa provocation tant qu'elle est en attente.
- **Fin** : au K.O., sinon au vendredi 18 h (Paris) qui suit l'acceptation ; s'il reste moins de 48 h avant ce vendredi, le suivant. Au temps, le plus de PV restants gagne ; à égalité, nul.
- **Stats figées à l'acceptation**, selon l'évolution réelle (celle du niveau, jamais la forme rouillée) :

| Évol. | PV | Attaque | Coup d'estoc (Chevalier) | Bambou tourbillon (Panda) |
|---|---|---|---|---|
| 1-2 | 30 / 32 | 4-6 | 12 dégâts | +8 PV, adversaire −1 action |
| 3-4 | 34 / 36 | 5-7 | 14 dégâts | +10 PV, adversaire −1 action |
| 5-6 | 38 / 40 | 6-8 | 16 dégâts, perce la Parade | +12 PV, adversaire −2 actions |

- **PA (points d'action)**, depuis la v2 (18/11) : chaque tour donne +3 PA, plafond 6 ; les PA non dépensés passent au tour suivant. Au départ, 0 PA en réserve, +1 pour le moins évolué (outsider), calculé depuis les évolutions figées (les colonnes `challengerEnergy` / `opponentEnergy` ne servent plus). Un héros rouillé part comme les autres. Les candidatures ne donnent plus rien. Une Parade qui encaisse un coup (non percé) rend 1 PA, plafond 6.
- **Tour** : le lanceur ouvre. 3 actions au plus (moins en cas d'étourdissement, jamais moins de 1), puis « Finir mon tour », ou fin automatique à la dernière action, ou quand il ne reste ni PA ni potion. 24 h sans action : le tour passe tout seul en Parade (calculé, rien de stocké). Un tour commencé mais pas fini au bout de 24 h se termine tel quel. Le « tour injouable » de la v1 disparaît : on a toujours des PA au début de son tour. Un coup enregistré garde sa main au rejeu.
- **Actions** : Attaque (1 PA, dégâts tirés dans la fourchette) ; Parade (1 PA, le prochain coup reçu est divisé par deux, arrondi au-dessous ; ne se cumule pas) ; Botte (3 PA) ; Potion (+6 PV, sans PA). PV jamais au-dessus du maximum.
- **Potions** : 2 chacun au départ, sans en regagner (v2 : les relances n'en donnent plus).
- **Victoire** : déduite des actions seules (PV, temps morts, parades), donc figée dès le K.O. ou l'échéance : rien d'extérieur au combat ne le change. Couronne du Défi sur le gagnant jusqu'à la fin du lendemain ; si les deux ont une couronne le même jour, chacun garde la sienne. **Aucune XP en jeu.**

Tout se déduit de l'Arène et de ses actions (v2 : plus rien ne vient des candidatures ni des relances) ; seuls la provocation, la réponse et les actions (avec leur valeur tirée) sont stockés.

## Succès

| Code | Titre | Condition |
|---|---|---|
| `gladiator` | Gladiateur | Gagner une Arène |
| `masterstroke` | Coup de maître | Gagner par K.O. dans le tour où l'on a joué sa Botte (le Bambou tourbillon soigne : le Panda y a droit aussi) |

## Notifications (catégorie Duel, hors plafond)

| Événement | Destinataire | Clé | Déclencheur |
|---|---|---|---|
| Provocation reçue | adversaire | `arena:<id>` | provocation (variante « rouillé ») |
| À toi de jouer | celui dont c'est le tour | `arena-turn:<id>:<n° de tour>` | fin d'un tour ; cron quotidien pour les tours passés au temps |
| Résultat | les deux | `arena-end:<id>` | K.O. ; cron pour la fin au temps |

Une seule notification par tour, jamais une par action.

## Données (une migration)

- `Arena { id, challengerId, opponentId, status (PENDING | ACCEPTED | DECLINED | CANCELLED), createdAt, acceptedAt?, deadline?, challengerForm?, opponentForm?, challengerEnergy?, opponentEnergy? }` ; les formes et l'énergie de départ sont figées à l'acceptation, le personnage vient du joueur (il ne change qu'avec un nouvel objectif).
- `ArenaAction { id, arenaId, playerId, kind (ATTACK | PARRY | THRUST | WHIRL | POTION | END), value, createdAt }` ; `value` = dégâts ou soin tirés. La Botte est stockée sous son nom (Coup d'estoc = THRUST, Bambou tourbillon = WHIRL) pour que le rejeu n'ait pas besoin du personnage.

## Écrans

- **Accueil** : bouton « Arène » à côté de « Motiver » et « Défier » (grisé avec la raison), panneau de provocation (stats comparées), carte en attente, bandeau « X te provoque » (variante rouillé), carte compacte du combat (PV, énergie, à qui de jouer) au-dessus de « + Candidature ».
- **`/arene`** : scène, ligne de tour, énergie, quatre actions, journal (colonne à droite sur ordinateur).
- **`/arene/resultat`** : K.O., défaite, victoire aux points, nul ; ouvert une fois d'office par appareil, comme `/defi`.
- **Intro** : 8e écran « L'Arène », `INTRO_STEP_COUNT` = 8, `LATEST_NEWS` = « l'Arène ».
- **`/succes`** : les deux succès.

## Sprites

Poses dérivées par le code de la pose Repos (section 10 de la maquette) : en garde, attaque (l'arme pivote autour du poing), parade (bouclier du Chevalier passé devant ; bambou en travers pour le Panda), potion (fiole), touché, étourdi, K.O., victoire (arme brandie par le bras, couronne, étincelles, saut). Effets et images des Bottes dessinés une fois. Le correctif de la pose Action actuelle (épée détachée de la main, pixels de garde orphelins) part dans une PR à part, avant l'Arène, car le défaut est en production.

## v2 : rejeu et direct (18/11)

- **Rejeu au retour** : l'appareil retient la dernière action vue de chaque Arène (stockage local). À l'ouverture de `/arene`, les actions de l'adversaire jouées depuis se rejouent une par une (1,5 s chacune) : animation, PV qui baissent, ligne qui s'ajoute au journal ; bandeau « Pendant ton absence, X a joué · k/n » avec « Passer ». Les actions sont verrouillées pendant le rejeu. Sans action vue retenue, seules les actions de l'adversaire depuis ton dernier coup se rejouent.
- **Direct** : `/arene` se rafraîchit toutes les 3 s, quel que soit le tour ; chaque nouvelle action de l'adversaire passe par le même rejeu (sans bandeau). Pastille de présence « X est dans l'Arène » : chaque affichage de `/arene` note l'heure sur le joueur (`Player.arenaSeenAt`, une migration) ; présent = vu il y a moins de 10 s. Hors connexion : « Connexion perdue · on réessaie ».
- **Textes** : « Énergie ⚡ » devient « PA » partout ; plus de bouton « + Candidature » dans l'Arène ; écran « L'Arène » de l'intro réécrit (pas de nouvel écran) ; notification de provocation sans variante « rouillé ».
- **Combat en cours** : passe aux nouvelles règles au déploiement (le rejeu recalcule tout).
