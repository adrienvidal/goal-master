# Arène : Bottes plein écran

Maquette validée le 18/11 : `docs/maquettes/arene-botte.html` (Artifact https://claude.ai/artifact/Ki46GFJCGM5Wi2GeAenQnV).
Prolonge le lot Impact (`src/lib/arenaImpact.ts`) : purement visuel, ni règles ni chiffres.

## Pourquoi

La Botte (Coup d'estoc du Chevalier, Bambou tourbillon du Panda) est le coup qui coûte et qui se prépare. Elle se
jouait comme une attaque à peine plus forte. Une séquence plein écran avant l'impact en fait un moment, et la
montre plus forte à mesure que le héros évolue.

## Règles

- **Quand** : à chaque Coup d'estoc ou Bambou tourbillon, le mien (au clic) comme celui de l'adversaire (au
  rejeu). Rien pour les autres actions.
- **Ordre** : gel et assombrissement, bandeau, mouvement du héros, effet de la Botte, sortie du bandeau, puis
  l'impact du lot Impact sans changement (gel, tremblement, chiffres, PV au contact).
- **Paliers** : `tierOf(levelForm)` des règles (évolutions 1-2, 3-4, 5-6), l'évolution figée du combat, celle des
  stats. Le sprite du bandeau est la forme affichée (rouille comprise), pose d'attaque, halo à l'évolution 6.
- **Bandeau** : palier ★ pierre ; ★★ acier (estoc) ou bambou (tourbillon) avec lignes de vitesse ; ★★★ doré avec
  reflet. Nom du coup et étoiles du palier.
- **Durées** (mon coup / rejeu) : ★ 1 s / 0,6 s ; ★★ 1,3 s / 0,8 s ; ★★★ 1,6 s / 1 s. Réduire les animations : 0,7 s.
- **Côté** : mon coup entre par la gauche, celui de l'adversaire par la droite, héros retourné.
- **Accessibilité** : la séquence est décorative (le journal annonce le coup) ; toute la surface est un bouton
  « Passer l'animation ».
- **Passer** : un tap n'importe où termine la séquence et lance l'impact tout de suite.
- **Plein écran** : la séquence couvre toute la fenêtre, sur téléphone comme sur ordinateur (pas seulement la
  scène). Bandeau : 150 px sur téléphone, un tiers de la hauteur (260 px au plus) sur grand écran, héros et nom
  centrés.

### Mouvements (corps et arme séparés)

L'arme est un calque à part : les cases que `weaponOf` repère dans le sprite de repos. Les évolutions 1 n'ont pas
d'arme, seul le corps bouge.

- **Chevalier** : recul tassé, épée tirée en arrière, éclat de la lame ; ruée étirée avec des fantômes (2, 3, 4),
  épée pointée ; retour. Au palier ★★★, il traverse le bandeau puis revient.
- **Panda** : accroupi, bambou qui tourne ; saut en vrille par retournements 8 bits (1, 2, 3 tours), il peut sortir
  du bandeau ; atterrissage écrasé et poussière. Au palier ★★★, il flotte un temps.

### Effets

- **Coup d'estoc** : ★ une entaille ; ★★ deux ; ★★★ deux, éclair, l'écran se fissure, et « PERCE LA PARADE ! » si
  la cible pare au moment de mon coup (pas au rejeu : l'état de Parade d'un coup passé n'est pas connu de la scène).
- **Bambou tourbillon** : ★ anneau de 8 feuilles ; ★★ spirale de 16 feuilles et coup de vent ; ★★★ tornade de
  36 feuilles et teinte verte. 1,6 fois plus de feuilles sur grand écran.

### Réduire les animations

Bandeau fixe en fondu, nom et étoiles, une teinte (rouge pour l'estoc, verte pour le tourbillon) à la place de
l'éclair. Aucun mouvement, ni fissure, ni feuilles.

## Hors périmètre

Son et vibration, nouvelle pose dessinée à la main, Bottes de Ninja et Guerrière, changement des règles ou des
chiffres, séquence pour l'attaque simple.
