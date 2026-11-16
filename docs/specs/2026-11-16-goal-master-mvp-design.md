# Goal Master — Cadrage MVP (métier & expérience utilisateur)

*16/11/2026 — document fonctionnel, aucune décision technique ici.*

## 1. Intention

Deux amis cherchent un emploi en même temps. Candidater, c'est répétitif et plein de refus : on décroche vite. Goal Master transforme chaque candidature envoyée en expérience (XP), fait évoluer un avatar 8 bits, et surtout **rend la progression de chacun visible à l'autre** pour qu'ils se tiennent mutuellement.

**Pourquoi ce design** (issu de la veille) :
- L'effet « jeu » seul s'essouffle en ~2 semaines (retours Habitica). Ce qui fait revenir, c'est l'engagement envers une autre personne (Duolingo Friend Streak) → le binôme est au cœur, pas une option.
- On récompense l'**effort** (candidature envoyée), pas le résultat (réponse) : les refus ne doivent pas casser la motivation.
- Une évolution d'avatar rare et marquante vaut mieux qu'un changement à chaque niveau.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Envoyer une candidature et la compter en **un clic**.
- Voir sa progression et celle de son binôme en un coup d'œil.
- Pouvoir relancer l'autre quand il décroche.

**Non-objectifs (MVP)**
- Pas de suivi de chaque candidature (entreprise, statut, relances) : on compte, on ne gère pas.
- Pas de prospection : uniquement « candidater ».
- Pas d'inscription ouverte : l'app sert à 2 personnes.
- Pas de classement ni de compétition.

**Anti-objectifs** (échec même si « ça marche »)
- Enregistrer une candidature prend plus de 5 secondes (bouton + nom de l'entreprise).
- L'app devient un jeu en soi (interface chargée, mécaniques à apprendre).
- La relance devient du harcèlement.

## 3. Utilisateurs

Exactement 2 : Adrien et son ami. Seules leurs deux adresses email sont autorisées. Chacun voit tout de l'autre.

## 4. Parcours utilisateur

### 4.1 Connexion
1. Saisie de l'email.
2. Si l'email n'est pas l'un des deux autorisés → message neutre « Cette adresse n'a pas accès ».
3. Sinon, un code à 6 chiffres est envoyé par mail (valable 10 min).
4. Saisie du code → connecté. La session reste ouverte sur l'appareil (pas de reconnexion à chaque ouverture).

### 4.2 Premier lancement
1. Choix du pseudo.
2. Choix de son personnage (Chevalier ou Panda), puis de sa couleur parmi 6 : bleu, rouge, vert, violet, orange, noir. Les deux joueurs peuvent prendre le même personnage ; la couleur déjà prise par le binôme est grisée. Aperçu en direct sur le bébé (forme 1) du personnage choisi.
3. Création de l'objectif : nombre de candidatures (défaut 100) + date limite.
4. Autorisation des notifications (pour recevoir les relances).
5. Arrivée sur l'écran principal.

### 4.3 Boucle quotidienne
1. Ouvrir l'app.
2. Taper **« + Candidature »**, saisir l'entreprise → +10 XP, animation, barre qui avance.
3. Regarder la carte du binôme ; le motiver si besoin.

### 4.4 Fin d'objectif
- **Objectif atteint** → écran de victoire (avatar qui célèbre, succès débloqué), puis proposition d'un nouvel objectif. XP, niveau, avatar et succès sont conservés. C'est le seul moment où l'on peut changer de personnage (la forme suit le niveau, quel que soit le personnage).
- **Date limite dépassée sans atteindre la cible** → écran « Temps écoulé » sans pénalité, choix : prolonger la date ou fixer un nouvel objectif.

## 5. Écran principal

```
┌──────────────────────────────┐
│ [avatar]  Adrien · Niv. 7  🔥5│
│ ████████░░  640/800 XP       │
│                              │
│   42 / 100 candidatures      │
│   ██████░░░░  J-45           │
│                              │
│     [  + CANDIDATURE  ]      │
├──────────────────────────────┤
│ [avatar] Tom · Niv. 5  🔥3   │
│ 31/100 · +2 aujourd'hui      │
│        [ ⚔️ MOTIVER ]        │
└──────────────────────────────┘
```

- **Haut** : mon avatar, pseudo, niveau, série (🔥 jours), barre d'XP.
- **Centre** : progression de l'objectif, compte à rebours, bouton principal.
- **Bas** : carte du binôme (avatar, niveau, série, progression, activité du jour) + bouton Motiver.
- Un accès aux **succès** (grille des badges, débloqués / verrouillés).
- **Annuler** : après un « + Candidature », un lien « Annuler » reste visible quelques secondes. Une candidature annulée retire ses XP.

## 6. Règles du jeu

### 6.1 XP
| Action | XP |
|---|---|
| Candidature envoyée | +10 |
| Relance suivie d'effet (pour les deux) | +15 |

### 6.2 Niveaux
Passer du niveau *n* au niveau *n+1* coûte `20 + 2 × n` XP (montée progressive).
Repère : 100 candidatures + quelques bonus ≈ 1 100 XP ≈ niveau 22-24.
*(Courbe proposée, ajustable après usage.)*

### 6.3 Avatar 8 bits : du bébé au chevalier légendaire
L'avatar **grandit physiquement** : minuscule au départ, il remplit la carte à la fin. Chaque joueur a sa couleur (armure, cape, blason), choisie au premier lancement.

| # | Forme | Niveau | ≈ Candidatures | Apparence |
|---|---|---|---|---|
| 1 | Bébé | 1 | 0 | En couche, casserole trop grande en casque, hochet en guise d'épée |
| 2 | Gamin | 4 | ~7 | Armure en carton, couvercle de poubelle en bouclier, épée en bois |
| 3 | Écuyer | 8 | ~20 | Ado en tunique, épée courte, petit bouclier rond |
| 4 | Homme d'armes | 12 | ~35 | Cotte de mailles, casque ouvert, bouclier blasonné |
| 5 | Chevalier | 16 | ~54 | Armure de plates complète, heaume fermé, cape, épée longue |
| 6 | Chevalier légendaire | 20 | ~75 | Armure dorée brillante, cape au vent, plumet, épée lumineuse, aura animée |

La forme finale arrive vers 75 candidatures : on finit son objectif de 100 en armure dorée.

**Évolution** : animation plein écran (flash, silhouette qui grandit, révélation de la nouvelle forme + son nom « Tu es devenu Écuyer ! »). Le binôme voit « Tom est devenu Chevalier ⚔️ » dans son fil.

**Humeurs**, déclinées pour chaque forme :
- **Normal**
- **Endormi (zzz)** : aucune candidature depuis 2 jours ouvrés (le bébé suce son pouce, le chevalier ronfle appuyé sur son épée).
- **En fête** : passage de niveau, objectif atteint (le bébé agite son hochet, le chevalier lève son épée).

### 6.3 ter Deuxième personnage : le Panda gardien des bambous

Mêmes règles que le Chevalier (6 formes aux mêmes niveaux, couleur, humeurs, rétrogradation) ; seul l'univers change : la forêt de bambous. **Silhouette ronde et massive** (grosse tête, gros ventre, jambes courtes), mais costume original : pas de reprise d'un personnage de film existant.

| # | Forme | Niveau | Apparence |
|---|---|---|---|
| 1 | Bébé panda | 1 | Roulé en boule, mâchouille une pousse de bambou |
| 2 | Panda curieux | 4 | Debout, bandeau de sa couleur, petit bout de bambou en bâton |
| 3 | Novice | 8 | Torse nu, gros ventre visible, short de sa couleur, ceinture de corde, tige de bambou |
| 4 | Moine voyageur | 12 | Grand chapeau de paille, écharpe de sa couleur en bandoulière, short, corde, sandales |
| 5 | Moine gardien | 16 | Gilet ouvert de sa couleur à liseré doré sur le ventre nu, collier de perles, ceinture dorée, bâton à pointe dorée |
| 6 | Grand maître | 20 | Nettement le plus grand : robe de moine de sa couleur drapée sur l'épaule, liseré doré, collier de perles de prière, grand bâton doré, aura |

La lignée suit le chemin du moine, avec la silhouette ronde du Grand maître dès le Novice. Le corps reste visible jusqu'au Moine gardien, et chaque palier ajoute un vêtement : short, puis écharpe et chapeau, puis gilet et collier, et enfin la robe complète du Grand maître.

**Fatigue propre au Panda** (mêmes paliers que §6.3 bis) :
- Endormi : roulé en boule, yeux fermés.
- Fatigué : les taches noires des yeux coulent vers le bas comme des cernes, la fourrure blanche grisonne, oreilles tombantes ; l'armure ne rouille pas, le bambou **se fend et se ternit**. Fil du binôme : « Le bambou de Tom se fend ».
- Épuisé : les grosses joues **se dégonflent** (le visage se creuse), cernes plus longs, voûté, le bambou à mâchouiller tombe.

### 6.3 quater Ninja (en pause, hors MVP)

Archétype du ninja, sans reprendre un personnage existant : cheveux en pointes, bandeau frontal à plaque de métal (symbole propre au jeu), écharpe, kunai puis katana. La couleur s'applique à la tenue et à l'écharpe.

| # | Forme | Niveau | Apparence |
|---|---|---|---|
| 1 | Bébé ninja | 1 | Grenouillère, bandeau trop grand, shuriken-hochet |
| 2 | Petit ninja | 4 | Cheveux en pointes, bandeau, kunai en bois |
| 3 | Ninja | 8 | Écharpe au vent, kunai en métal |
| 4 | Ninja d'élite | 12 | Gilet tactique, katana dans le dos |
| 5 | Maître ninja | 16 | Tenue sombre, longue écharpe, katana dégainé |
| 6 | Ninja légendaire | 20 | Tenue de ninja intégrale avec cagoule (seuls les yeux visibles), énorme kunai lumineux, aura |

### 6.3 quinquies Guerrière (en pause, hors MVP)

Héroïne de fantasy. Les formes enfants (1 à 3) restent des enfants, sans aucune sexualisation ; l'allure séduisante et puissante n'arrive qu'aux formes adultes (4 à 6) : armure ajustée, bras et épaules nus, longue chevelure, bottes hautes. La couleur s'applique à la tenue et à la cape.

| # | Forme | Niveau | Apparence |
|---|---|---|---|
| 1 | Bébé guerrière | 1 | Nœud sur la tête, épée en bois |
| 2 | Fillette | 4 | Queue de cheval, tunique, petit bouclier rond, épée en bois |
| 3 | Apprentie | 8 | Cheveux longs, tunique ceinturée, épée courte |
| 4 | Combattante | 12 | Corset de cuir et tenue ajustée, bras nus, bottes hautes |
| 5 | Guerrière | 16 | Armure ajustée argentée, épaulières, cape, diadème, épée longue |
| 6 | Reine barbare | 20 | Style barbare de fantasy : bikini d'armure doré, pagne de sa couleur, bracelets dorés, cheveux sauvages, grande épée lumineuse, aura |

Fatigue du Ninja et de la Guerrière : mêmes signes que le Chevalier (cernes, teint pâle, joues creuses, posture voûtée), équipement terni.

### 6.3 sexies Poses

Chaque forme a des poses liées à un moment du jeu :

| Pose | Quand | Dessin |
|---|---|---|
| Repos | En permanence (boucle de 2 images) | Dessinée |
| Action | À chaque « + Candidature » (coup d'épée, moulinet de bâton) | Dessinée |
| Victoire | Montée de niveau, évolution, objectif atteint (arme levée) | Dessinée |
| Sommeil | Endormi | Dérivée de la pose Repos |
| Épuisé | Fatigué, épuisé, déchu | Dérivée de la pose Repos |

Volume MVP : 2 personnages × 6 formes × 3 poses dessinées = 36 dessins.

### 6.3 bis Rétrogradation (visuelle uniquement)

L'inactivité dégrade l'**apparence** de l'avatar, jamais l'XP, le niveau ni les succès. Les jours d'inactivité se comptent en **jours ouvrés** (lundi à vendredi) : un week-end sans candidature ne pénalise pas.

| Jours ouvrés sans candidature | État | Visage | Posture | Armure | Fil du binôme |
|---|---|---|---|---|---|
| 2 | **Endormi** | Yeux fermés, « zzz » | Légèrement penché | Intacte | Bouton Motiver qui clignote |
| 4 | **Fatigué** | Cernes violets sous les yeux, teint pâle et grisâtre, joues sans couleur | Épaules tombantes, épée tenue basse | Rouillée : couleur délavée, taches de rouille | « L'armure de Tom rouille » |
| 7 | **Épuisé et déchu** | Joues creuses (ombre sous les pommettes), cernes plus marqués, goutte de sueur | Voûté, tête plus basse, pointe de l'épée qui traîne au sol | Rouillée, et l'avatar affiche la forme précédente avec le titre « <forme du niveau> déchu » (ex. « Chevalier déchu » sous l'apparence d'Homme d'armes) | « Tom a perdu son armure de Chevalier » |
| +5 par palier | Épuisé | idem | idem | Une forme de moins à chaque fois, plancher : Bébé | « Tom redescend encore » |

**Casques fermés** (Chevalier, Chevalier légendaire) : dès l'état Fatigué, la visière se relève pour montrer le visage creusé. Pour le Légendaire, le plumet retombe et l'aura s'éteint.

- **Forme affichée** = forme du niveau, moins les formes perdues. Le niveau et la barre d'XP restent affichés tels quels.
- **Reconquête** : 3 candidatures réparties sur 2 jours consécutifs → retour immédiat à la forme du niveau, quel que soit le nombre de formes perdues. Animation plein écran « Retour en grâce » : les joues reprennent leur couleur, le dos se redresse, la visière se referme.
- Dès la première candidature, un avatar endormi ou fatigué retrouve son état normal. Un avatar **épuisé et déchu** le reste jusqu'à la reconquête.

### 6.4 Série (🔥)
Un jour compte s'il contient au moins une candidature (fuseau Europe/Paris, minuit). Un jour vide remet la série à 0.

### 6.5 Succès (MVP)
| Succès | Condition |
|---|---|
| Premier pas | 1ʳᵉ candidature |
| En route | 10 candidatures |
| Quart de quête | 25 candidatures |
| Mi-parcours | 50 candidatures |
| Centurion | 100 candidatures |
| Échauffement | Série de 3 jours |
| Semaine de feu | Série de 7 jours |
| Machine | Série de 30 jours |
| Mission accomplie | Objectif atteint |
| Duo | Les deux ont candidaté le même jour |
| Coach | 5 relances suivies d'effet |
| Phénix | Candidater après avoir reçu une relance |
| Revenant | Sortir de l'état Déchu par une reconquête |

Un succès débloqué reste acquis, même si une candidature est annulée ensuite.

## 7. Bouton « Motiver »

- **Toujours disponible** sur la carte du binôme ; il **clignote** quand le binôme n'a rien envoyé depuis 2 jours ouvrés (son avatar est alors endormi).
- **1 relance par jour maximum** (par personne). Une fois envoyée, le bouton affiche « Relance envoyée ✓ » jusqu'au lendemain.
- **Choix d'un message** parmi 4 :
  - Bienveillants : « Juste une candidature aujourd'hui ? » · « Allez, on lâche rien ! 💪 »
  - Chambreurs : « Alors, on fait la sieste ? 😴 » · « Ton avatar prend la poussière… »
- **Réception** : notification sur l'appareil (même app fermée) — « ⚔️ Adrien te motive : Alors, on fait la sieste ? 😴 » — puis bandeau dans l'app avec l'avatar de l'expéditeur.
- **Récompense** : si le destinataire candidate dans les 24 h suivant la relance → +15 XP pour les deux (une seule fois par relance), compteur pour le succès Coach, succès Phénix pour le destinataire.

## 8. Anti-triche (léger)

La confiance reste la base ; on rend juste la triche pénible et visible.

1. **Plafond quotidien** : au-delà de 15 candidatures dans la journée, elles sont comptées mais ne rapportent plus d'XP.
2. **« Chez qui ? »** : « + Candidature » ouvre un champ unique, le nom de l'entreprise (obligatoire), puis on valide. Le fil du binôme affiche les entreprises (« Tom → Doctolib, Alan, Qonto »). Si on a déjà candidaté chez la même entreprise, l'app prévient (« Déjà candidaté chez Alan le 12/11, continuer ? ») sans bloquer.

V2 : réaction « 🤨 Preuve ? » sur une candidature du binôme.

## 9. Plateformes

Utilisable sur ordinateur et sur mobile, avec la même expérience. Les notifications de relance doivent arriver sur le téléphone.

## 10. Approches considérées (périmètre)

| Approche | Retenue ? | Pourquoi |
|---|---|---|
| Compteur ludique (un clic + nom de l'entreprise = une candidature) | ✅ | Le plus rapide à utiliser au quotidien ; MVP. |
| Mini-CRM de candidatures (entreprise, statut, relances) | ❌ V2 | Plus utile mais plus lourd à remplir ; casse le « un clic ». |
| Ouverture à d'autres duos (invitations, groupes) | ❌ | Vous êtes 2 ; parcours d'invitation inutile. |

## 11. Version 2 (hors MVP)

Bonus XP pour refus / réponse / entretien, XP pondérés selon la qualité, quêtes communes hebdomadaires, saisons, accessoires d'avatar, objectif « prospecter », message libre dans les relances.

## 12. Laissé au constructeur

- Le dessin des 6 formes d'avatar (dans le respect des descriptions §6.3) et le style visuel 8 bits.
- La durée exacte de la fenêtre « Annuler ».
- Les textes des écrans (hors messages de relance, fixés ci-dessus).
- Tous les choix techniques.
