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
2. Choix de sa couleur (armure, cape, blason) parmi 6 : bleu, rouge, vert, violet, orange, noir. La couleur déjà prise par le binôme est grisée. Aperçu en direct sur le bébé (forme 1).
3. Création de l'objectif : nombre de candidatures (défaut 100) + date limite.
4. Autorisation des notifications (pour recevoir les relances).
5. Arrivée sur l'écran principal.

### 4.3 Boucle quotidienne
1. Ouvrir l'app.
2. Taper **« + Candidature »**, saisir l'entreprise → +10 XP, animation, barre qui avance.
3. Regarder la carte du binôme ; le motiver si besoin.

### 4.4 Fin d'objectif
- **Objectif atteint** → écran de victoire (avatar qui célèbre, succès débloqué), puis proposition d'un nouvel objectif. XP, niveau, avatar et succès sont conservés.
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
- **Endormi (zzz)** : aucune candidature depuis 2 jours (le bébé suce son pouce, le chevalier ronfle appuyé sur son épée).
- **En fête** : passage de niveau, objectif atteint (le bébé agite son hochet, le chevalier lève son épée).

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

Un succès débloqué reste acquis, même si une candidature est annulée ensuite.

## 7. Bouton « Motiver »

- **Toujours disponible** sur la carte du binôme ; il **clignote** quand le binôme n'a rien envoyé depuis 2 jours (son avatar est alors endormi).
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
