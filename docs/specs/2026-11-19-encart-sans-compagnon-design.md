# Encart libre : héros jamais seul

Date : 19/11/2026. Maquette validée : https://claude.ai/artifact/QKXuvCs4v4k8XP4u83NKpW (`docs/maquettes/encart-libre-sans-compagnon.html`).
Suite de `2026-11-19-encart-libre-vivant-design.md`.

## Problème

En mode Libre, sans compagnon adopté (le cas des deux joueurs en production), le héros patrouille seul ; le premier
monstre vient après 2 à 5 minutes de page affichée, et le compteur s'arrête quand l'onglet est caché ou la fenêtre
recouverte (il avance image par image).

## Ce qu'on ajoute

1. **Le héros de l'ami passe.** Visiteur au même titre qu'un compagnon, un seul visiteur à la fois, à tour de rôle
   avec les compagnons s'il y en a. Sans compagnon : premier passage 60 à 120 s après l'ouverture, puis toutes les
   3 à 6 min ; avec des compagnons, le rythme reste celui des compagnons (premier 20 à 40 s, puis 2 à 4 min).
   Reste environ une minute. Il vient jusqu'au héros, les deux se saluent (double bond), sa bulle verte dit sa
   journée : « N candidature(s) aujourd'hui », « Pas encore candidaté aujourd'hui », ou « Rien depuis N jours… »
   s'il est inactif (2 jours ouvrés ou plus). Son sprite est celui de Goal Master, forme affichée et humeur (rouille)
   comprises, sans jamais montrer une forme qu'il n'a pas encore vue. Clic : bulle « PSEUDO · NIV. n · FORME » /
   « n aujourd'hui · série n j ». Un monstre : il se bat aussi (un coup toutes les 0,7 s). S'il candidate pendant sa
   visite (son compte du jour monte entre deux lectures) : il saute avec « +10 XP ».
2. **Pensées.** Toutes les 90 à 180 s, bulle pointillée 4 s, jamais pendant un combat ni par-dessus une autre bulle.
   Tirées de l'état, uniquement si vraies (`thoughts()`), sans répéter la dernière ; « l'ami vient de candidater »
   passe d'abord (dans les 10 min, une fois par candidature) :
   - « PSEUDO vient de candidater chez X ! »
   - « Boss vendredi 18 h : encore N coups » (duel en cours non gagné) / « Boss à terre ! On a gagné cette semaine »
   - « Encore 1 pour garder la série de N jours » (série > 0, rien aujourd'hui) / « Série de N jours. On lâche rien »
   - « Plus que N XP avant le niveau L » (hors plafond) / « 15 aujourd'hui ! Le reste compte, sans XP » (plafond)
   - « Tu peux relancer PSEUDO aujourd'hui » (relance du jour pas faite, l'ami à 0 aujourd'hui)
3. **Gestes.** À une pause de patrouille sur deux : s'asseoir (3 à 5 s), s'étirer, siffloter (♪ ♫), regarder
   autour (« ? »), plus rarement une sieste (z Z, 9 s). Un clic réveille (« ! » et bond) ; un monstre aussi.
4. **Monstre plus tôt, en temps réel.** Premier entre 30 et 60 s, puis toutes les 2 à 5 min. Les échéances (monstre,
   visite, pensée) sont des heures, plus des compteurs d'images : en revenant sur la page, ce qui devait arriver arrive.

## Données

`WidgetState` gagne :
- `friend` : `{ pseudo, character, color, displayedForm, formName, mood, level, today, streak, idleWorkdays, last: { company, at } | null } | null`
- `boss` : `{ left, won } | null` (duel de la semaine en cours ; `left` = PV − coups − coups de grâce, au moins 0)
- `canNudge` : la relance du jour vers l'ami est encore possible et il n'a pas candidaté aujourd'hui

Tout se calcule à chaque lecture ; rien ne se stocke. Les deux joueurs se lisent déjà (règle métier).

## No-gos

- Décor seulement : ni XP, ni coup dans le duel.
- Rien à changer côté job-finder : la boîte du héros de l'ami part comme `companion` dans `goal-master:hitboxes`,
  le `poke` qui revient est rendu au visiteur présent, quel qu'il soit.
- Pas de détection d'activité : la sieste est tirée au hasard.

## Cas limites

- Mouvement réduit : ni visite, ni monstre, ni geste ; les pensées s'affichent, sans animation.
- Pas d'ami (un seul joueur) ou lecture ratée : pas de visite ni de pensée qui le concerne.
- Héros silhouette (nouvelle forme en attente) : les pensées ne nomment jamais la forme.
