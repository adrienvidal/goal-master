# Quêtes et compagnons · cadrage

Date : 18/11/2026. Statut : à valider par Adrien.

## Pourquoi

Une candidature n'est pas le seul geste qui fait trouver un poste. Adrien veut pouvoir pousser Nicolas
(et inversement) vers les autres : poster un article sur LinkedIn (« ça attire les recruteurs »),
relancer un contact, mettre son CV à jour, aller à un salon. La Quête est ce geste, écrit par l'un pour
l'autre, validé à la main par celui qui l'a donnée.

La récompense se voit : un compagnon 8 bits (chat, chien…) qui se tient à côté du héros. À la validation,
un coffre s'ouvre sur trois compagnons tirés au hasard, et le joueur en adopte un. Quelques XP l'accompagnent pour que la quête compte dans la progression.

## Objectifs

- Lancer une quête en texte libre à l'autre joueur.
- Le destinataire la marque faite (avec un lien facultatif, le post LinkedIn par exemple).
- Le donneur la valide ou la renvoie (« pas encore ») ; la validation ouvre un coffre.
- Le coffre propose jusqu'à trois compagnons que le joueur n'a pas encore ; il en adopte un. Plus des XP fixes.
- Chacun choisit le compagnon affiché parmi ceux qu'il possède (page Ménagerie).

## Non-objectifs (plus tard)

- Accessoires portés par le héros (à redessiner par personnage, évolution et pose : trop cher pour v1).
- Rareté, doublons, échanges, achat de compagnons.
- Quêtes à échéance, quêtes récurrentes, quêtes que l'on se donne à soi-même.
- Compagnon dans les e-mails.

## Anti-objectifs

- Que les quêtes deviennent une liste de tâches : une seule quête en cours dans chaque sens.
- Que l'XP des quêtes éclipse celle des candidatures : récompense fixe, modeste.
- Que le mot « Défi » soit réutilisé : il désigne déjà la course aux candidatures.

## Règles

- **Une quête en cours à la fois dans chaque sens.** Adrien → Nicolas et Nicolas → Adrien peuvent
  coexister. « En cours » = ni validée ni annulée.
- **Texte libre**, obligatoire, 120 caractères au plus.
- **États** : `OPEN` (lancée) → `DONE` (marquée faite par le destinataire) → `VALIDATED` (validée par le
  donneur). « Pas encore » ramène de `DONE` à `OPEN`. Le donneur peut annuler (`CANCELLED`) tant que la
  quête n'est pas validée. Pas d'échéance.
- **Une validation ne se retire jamais**, comme un succès débloqué : ni le compagnon ni les XP.
- **Récompense** : `XP_QUEST_DONE = 20` pour celui qui a accompli la quête (deux candidatures),
  `XP_QUEST_GIVEN = 5` pour celui qui l'a donnée (une demi-candidature), hors plafond quotidien des
  candidatures. L'XP reste calculée : elle découle des quêtes validées, à leur date de validation.
  L'énergie de l'Arène reste réservée aux candidatures.
- **Coffre** : à la validation, tirage uniforme de 3 compagnons parmi ceux du catalogue que le
  destinataire ne possède pas encore ; cette offre est **stockée sur la quête** (`offer`), un rechargement
  ne la retire pas. Le joueur en adopte un (`companion`), les autres retournent au catalogue. Le coffre s'ouvre
  **d'office à la prochaine ouverture de l'app**, en plein écran avant l'accueil, et ne se ferme pas tant
  qu'un compagnon n'est pas adopté ; fermer l'app en plein choix redonne la même offre. Les XP comptent dès
  la validation. Restent 2 :
  offre de 2. Reste 1 : le coffre le montre seul, sans choix à faire (« Adopter »). Aucun : XP seules, pas de
  coffre.
- Le tirage exclut aussi les compagnons proposés dans un coffre pas encore ouvert du même joueur (deux
  coffres ne peuvent pas donner le même animal). *Choix de Claude.*
- **Collection** = compagnons des quêtes validées du joueur (calculée). **Compagnon affiché** = choix
  stocké sur le joueur (`Player.companion`, nul tant qu'il n'en a aucun) ; le premier gagné s'affiche
  d'office.
- Seul le donneur valide, seul le destinataire marque faite : vérifié côté serveur.

## Approches considérées

1. **Tirage (l'offre) stocké sur la quête à la validation** (retenue). Collection recalculée depuis les quêtes,
   tirage figé : ajouter un animal au catalogue ne change rien aux tirages passés.
2. Tirage recalculé à partir de l'identifiant de la quête. Fidèle à « rien ne se stocke », mais ajouter
   un animal rebrasse les tirages passés ; il faudrait versionner le catalogue. Écartée.
3. Table d'inventaire séparée. Utile seulement si les compagnons s'achetaient ou s'échangeaient. Écartée.

Adrien a choisi la 1, et le coffre surprise plutôt qu'un animal choisi par le donneur ; puis un choix
parmi trois compagnons tirés au hasard plutôt qu'un seul imposé.

## Données

```prisma
enum QuestStatus { OPEN DONE VALIDATED CANCELLED }

model Quest {
  id          String      @id @default(cuid())
  giverId     String
  receiverId  String
  text        String
  link        String?     // facultatif, posé en marquant faite
  status      QuestStatus @default(OPEN)
  offer       String[]    @default([]) // compagnons proposés par le coffre, posés à la validation
  companion   String?     // compagnon adopté (parmi offer), posé au choix
  createdAt   DateTime    @default(now())
  doneAt      DateTime?
  validatedAt DateTime?
  closedAt    DateTime?   // annulation
}
```

`Player.companion String?` pour le compagnon affiché. Migration Prisma Migrate, puis `npx prisma generate`.

## Calcul

- Moteur pur `src/game/quests.ts` (testé) : quête en cours par sens, transitions permises, tirage
  (aléa injecté pour les tests), collection, XP des quêtes jusqu'à une date.
- `totalXp` prend les quêtes validées en plus, des deux côtés (receveur et donneur) : tous ses appelants passent les quêtes, filtrées à la date
  voulue là où le niveau se calcule dans le passé (`duel.ts`, `playerView.ts`).
- Les succès d'XP et de niveau en profitent d'office. Nouveaux succès : « Dompteur » (3 compagnons) et
  « Mentor » (3 quêtes données et validées).

## Compagnons

- Catalogue de départ : chat, chien, renard, hibou, lapin, petit dragon (`src/lib/companions.ts`).
  D'autres s'ajouteront quand les collections se rempliront.
- Sprites 8 bits dessinés comme ceux des héros (grilles de pixels, rendu SVG), deux poses : repos et
  saut de joie. Indépendants du personnage, de l'évolution et de la couleur.
- Affichés à côté du héros sur l'accueil (les deux joueurs) et dans l'Arène (saut à chaque coup porté).

## Écrans (à maquetter avant tout code)

- Accueil : carte « Quêtes » à deux lignes, une par sens (« Pour toi » : reçue / faite, en attente ;
  « Pour Nicolas » : lancer / en cours / à valider), et compagnon à côté du héros. *Choix de Claude.*
- Fil d'activité : une ligne « Quête validée · a gagné le renard » chez celui qui l'a accomplie, pour que
  l'autre voie la récompense. *Choix de Claude.*
- Lancer une quête : texte libre, exemples proposés (« Poste un article sur LinkedIn »…).
- Quête reçue : texte, bouton « C'est fait » avec lien facultatif.
- Quête à valider (donneur) : texte, lien cliquable, « Valider » / « Pas encore ».
- Coffre (plein écran, avant l'accueil, sans bouton pour fermer) : ouverture animée, trois compagnons au choix, « Adopter », + 20 XP ; offre de 2, compagnon
  donné d'office, collection complète : XP seules. Le donneur voit
  « + 5 XP » après sa validation.
- Ménagerie : compagnons possédés (choisir l'affiché), silhouettes des autres.
- Intro : un 9e écran, `INTRO_STEP_COUNT = 9`, `LATEST_NEWS = "les Quêtes"`.
- États : aucune quête, quête déjà en cours (lancement bloqué), lien absent, collection complète, erreur.

## Notifications

Une par étape, via le système existant, dans une nouvelle catégorie « Quêtes » (coupable dans les
réglages) : `quest` (quête reçue → destinataire), `quest-done` (faite → donneur), `quest-end` (validée
avec le compagnon gagné, ou « pas encore » → destinataire). Pas de cron : tout part sur action.

*Choix de Claude* : ces notifications **ne comptent pas dans le plafond quotidien** (une quête n'avance
que si l'autre est prévenu, comme « À toi de jouer » dans l'Arène). Chaque aller-retour « pas encore »
notifie à nouveau : la clé de dédoublonnage porte la quête et le numéro de passage (`doneAt`).

## Laissé au constructeur

- Dessin exact des compagnons et de l'animation du coffre (dans la maquette).
- Validation du lien (format URL simple, sans vérifier LinkedIn).
- Placement exact de la carte Quête sur l'accueil par rapport aux cartes Défi et Arène.

## v2 · après le test sur l'aperçu (18/11)

Retours d'Adrien : la carte Quêtes permanente fait austère et mélange les actions (lancer à gauche, Motiver,
Défier, Arène à droite) ; on doit pouvoir nommer son compagnon ; la Ménagerie est introuvable.
Maquette v2 validée (même lien, écrans Accueil, Coffre, Ménagerie).

- **Accueil** : la carte Quêtes disparaît. Tout ce qui vise le binôme est dans sa carte :
  - 4e action « 📜 Quête » à côté de Motiver, Défier, Arène ; grisée avec la raison quand une quête est déjà en
    cours dans ce sens ; mène à `/quete/nouvelle`.
  - ligne « Ta quête pour X » (texte, état « En cours » ou « Faite · à valider », bouton « Voir » ou « Valider »)
    tant que la quête donnée est en cours.
  - à gauche, un bandeau parchemin « 📜 X te lance une quête » avec le héros du binôme, **seulement** quand une
    quête reçue est en cours (« Faite · en attente » si on l'a déjà marquée faite), bouton « Voir ».
  - ligne de trois boutons : Mes succès · Ménagerie · Réglages.
- **Nom du compagnon** : `Quest.companionName String?`, posé à l'adoption, modifiable dans la Ménagerie.
  `trim`, 16 caractères au plus ; vide = nom de l'espèce. Affiché sous le compagnon sur l'accueil (les deux
  joueurs), dans le fil (« a adopté Roux »), dans le titre d'adoption (« Roux te suit ! ») et comme libellé du
  compagnon dans l'Arène.
- **Coffre** : champ « Son nom » prérempli avec l'espèce choisie, bouton « Adopter <nom> ».
- **Ménagerie** : nom de chaque compagnon, espèce en dessous ; champ « Renommer ton <espèce> » pour le compagnon
  affiché, bouton « Enregistrer ».
