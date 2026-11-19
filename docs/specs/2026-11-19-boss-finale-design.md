# Boss final et attaque ultime : cadrage

Deux animations de combat, en canvas pixel art, sur deux écrans qui existent déjà. Rien ne change dans les règles ni dans la base : tout se calcule à partir des duels du vendredi.

Maquettes validées le 19/11 :
- Boss final à deux (écran de fin d'objectif) : https://claude.ai/artifact/CnUpSPrQnsL2qjY1QTyDJo (`docs/maquettes/boss-final-duo.html`)
- Attaque ultime (duel perdu) : https://claude.ai/artifact/2hv4Me1VAQbHWrpLgZ7jV1 (`docs/maquettes/boss-ultime-ko.html`)
- Pistes écartées, gardées en référence : `docs/maquettes/boss-epique.html`, `docs/maquettes/boss-final.html`

## Parcours

```
[/objectif/fin]  objectif atteint ou temps écoulé
  - arène : la quête rejouée contre le boss final, « Passer »
  - bilan (inchangé) + boutons « Nouvel objectif » / « Reprendre le combat »
[/duel]  duel perdu
  - arène : attaque ultime du boss, K.O., les héros se relèvent, « Passer »
  - bilan du duel (inchangé, titre « … vous met K.O. ») + « Continuer »
```

## 1. Boss final (`/objectif/fin`)

**Les semaines.** Les duels du vendredi de l'objectif, du premier vendredi qui suit sa création au dernier joué, plus le duel en cours s'il compte encore (objectif atteint en semaine). Pour chaque semaine : mes coups `a`, ceux du binôme `n` (0 s'il ne combattait pas), les PV du boss `hp`, gagné ou non. Au-delà de 12 semaines, les semaines consécutives sont regroupées par paquets pour ne jamais dépasser 12 attaques (les sommes restent justes).

**La barre.** PV = somme des `hp`. Une semaine n'enlève jamais plus que son `hp`. « Mission accomplie » : le coup ultime achève le reste. « Temps écoulé » : la barre s'arrête sur ce qui reste.

**Les attaques.** Une attaque par héros et par semaine, un seul impact, le chiffre de ses coups au contact (moi à gauche, le binôme à droite). Palier selon les coups : 1-3 estocade, 4-8 uppercut, 9+ coup plongeant / tourbillon / saut par-dessus (en alternance). Le plus petit frappe d'abord. Une semaine sur quatre où les deux ont 4 coups ou plus : relais (l'un lance le boss, l'autre l'écrase). Semaine perdue : contre-attaque du boss (onde au sol ou bond), les héros esquivent.

**Le final.** Part des coups entre 40 et 60 % chacun : coup ultime à deux. Sinon, celui qui a le plus frappé. Binôme sans aucun coup : il n'apparaît pas. Temps écoulé : coup chargé à moitié, entaille, boss sonné (étoiles) ; on ne voit jamais le boss gagner. Le chiffre de la dernière semaine éclate aussi à l'entaille.

**Game feel.** Élan avant chaque coup, arrêt sur image au contact (0 / 60 / 120 ms selon le palier, jamais empilé), secousse en sinus qui décroît, flash blanc franc réservé aux gros coups. Durée visée 15 à 19 s.

## 2. Attaque ultime (`/duel`, duel perdu)

Face à face, charge du boss (bandes noires, anneaux rouges, le sol gronde), attaque propre au boss, K.O. (arrêt sur image, un flash, héros projetés dans la pose K.O.), le boss ricane et sort, les héros se relèvent ternis avec un bandage. Environ 7 s.

| Boss | Attaque |
| --- | --- |
| Le Recruteur fantôme | Hurlement spectral : trois ondes blanches |
| Le Golem ATS | Rejet automatique : rayon vert, tampon « REJETÉ » |
| La Pile de refus | Avalanche de refus : pluie de lettres |
| Le Silence radio | Onde muette : onde noire, les couleurs s'éteignent |

Les deux combattants du duel sont mis K.O., même celui qui n'a porté aucun coup. Titre : « Le Golem ATS vous met K.O. ».

## Communs

- Les vrais personnages (personnage, couleur, forme affichée) via `sprite()` et `bossSprite()`.
- « Passer » saute à l'image finale. `prefers-reduced-motion` : image finale d'office.
- L'animation se rejoue à chaque ouverture de l'écran, tant qu'il est affiché (objectif pas encore relancé, duel pas encore « Continuer »).
- Canvas 384×216 mis à l'échelle (`image-rendering: pixelated`), largeur 100 % : même rendu mobile et ordinateur.
- L'intro ne change pas (aucune règle nouvelle) : pas d'écran ni de `LATEST_NEWS`.

## No-gos

- Les trois cas encore ouverts du boss à l'échéance (nouvel objectif après une victoire en avance, échéance en milieu de semaine, bandage après le dernier duel) : décision à part.
- Animation de victoire du duel du vendredi, son, nouvelles poses de sprites.

## Fondrières

- Le moteur canvas : un seul module pur côté client, pas de dépendance ajoutée.
- Quête très longue : regroupement à 12 attaques au plus, pas de durée qui s'allonge.
