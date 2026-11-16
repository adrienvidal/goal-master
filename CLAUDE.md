# CLAUDE.md : Goal Master

Goal Master : app gamifiée (XP, niveaux, succès, avatar 8 bits) qui aide deux amis à tenir leur objectif de candidatures en se motivant mutuellement.

## Session Continuity

En début de session :

- Lire le fichier de la dernière session dans `.claude/sessions/`
- Identifier où on s'est arrêté et les blockers en cours
- Recopier son bloc « Reprise » (à défaut, le rédiger), puis finir par une seule
  question qui porte la proposition

En fin de session :

- Sauvegarder un résumé dans `.claude/sessions/[date]_[sujet].md`
- Commencer par un bloc « Reprise » juste sous le titre, puis : Réalisé, Reste à
  faire, Blockers, Décisions
- Si un fichier existe déjà pour aujourd'hui, le compléter plutôt que le remplacer,
  bloc « Reprise » compris

Gabarit du bloc « Reprise » (une ligne par rubrique, phrases courtes, échéance
datée entre parenthèses, et pour les blockers seulement qui on attend), sous un
titre `## Reprise` et dans un bloc de code pour garder l'alignement :

```
✅ Fait      Base restructurée, interface republiée, formulaire en ligne
⛔ Bloqué    Clé d'API (Juliette), accès Microsoft 365 (Alexis)
🎯 Priorité  Import du tableau de Mathilde (échéance 06/11)
```

En début de session, ajouter « J-n » à l'échéance (calculé avec `date`) et coiffer
le bloc de « Reprise · JJ/MM · sujet ». Les trois pictogrammes restent dans les
fichiers de session et le récapitulatif.

Ce bloc est aussi ce que le hook de fin de session publie dans le Cockpit (bloc
« À côté ») : une session sans bloc « Reprise » n'y apparaît pas.

Format du nom de fichier : `YYYY-MM-DD_sujet-en-kebab-case.md`
Exemple : `2026-03-10_audit-cabinet-merlin.md`

Règles :

- Toujours lire AVANT d'agir – ne pas redemander ce qui est déjà documenté
- Les blockers non résolus de la session précédente deviennent la priorité
- Quand un blocker est levé, le noter explicitement dans "Réalisé"

### Archivage des sessions

Le dossier `.claude/sessions/` ne garde visibles à la racine que les sessions utiles à la reprise. Les autres vont dans `.claude/sessions/archive/`.

- **Garder actives** : les 3 sessions les plus récentes, plus toute session rattachée à un chantier encore ouvert.
- **Archiver, ne pas supprimer** : déplacer via `git mv` vers `archive/` (réversible, tracé dans git). Une session est archivable quand elle est close et que son contenu vit déjà ailleurs (code, CLAUDE.md, git).
- **Filet anti-oubli, impératif** : avant d'archiver une session, reporter chacun de ses « Reste à faire » encore ouverts dans `.claude/sessions/reste-a-faire.md` (le backlog vivant, jamais archivé). Ne jamais archiver une session tant qu'un item ouvert n'a pas été soit fait, soit reporté dans ce backlog. Cocher puis retirer un item du backlog quand il est fait.
- **Quand** : en fin de session, après avoir sauvegardé le résumé du jour, vérifier si d'anciennes sessions sont devenues archivables et les déplacer.
- **Archivage automatique** : le déplacement se fait sans demander, une fois le filet anti-oubli passé. En cas de doute (chantier peut-être encore ouvert), la session reste à la racine. Les sessions archivées sont listées dans « Réalisé » du résumé du jour.
- **Ne jamais toucher** au « Reste à faire » de la session active la plus récente : c'est la liste de priorités vivante.
- **Hygiène de fond** au passage : corriger une contradiction à sa source (pas seulement dans le dernier fichier), refermer un « Reste à faire » qu'une session ultérieure a accompli, signaler une info devenue fausse (par exemple un agent supprimé depuis).
- **Toute suppression se confirme avec Adrien** avant d'agir.

Rappel : les fichiers de session sont un journal de passation, pas la mémoire vivante.

## Méthode de développement

Tout travail de construction (dérouler une tâche du plan, ajouter une commande,
reprendre le fil en début de session) passe par le skill `lean-development` dès
qu'il s'applique. Il fixe la façon d'avancer sans brûler le contexte : lectures
ciblées plutôt que fichiers entiers, sous-agents seulement quand ils paient,
passes de revue non multipliées. L'invoquer au début du travail, pas une fois le
contexte déjà saturé.

## Maquettes

Tout écran se maquette avant d'être développé. Une maquette se jette, un écran
déjà codé se défend.

1. **Lister les écrans et le parcours** avant de dessiner : le nom de chaque
   écran, sa route, ce qu'il permet de finir, et vers quel écran il mène. Faire
   valider cette liste. Dessiner quinze écrans dont cinq n'étaient pas voulus
   est le seul vrai gaspillage de l'étape.
2. **Dessiner tous les écrans** dans un fichier HTML unique publié en Artifact,
   un écran par section, empilés, chacun annoncé par sa route et par ce à quoi
   il sert. Le parcours entier se lit d'une traite, c'est ce qui fait voir
   l'étape manquante.
3. **Rendre le parcours cliquable par des ancres** : chaque bouton porte
   l'ancre de l'écran où il mène (`<a href="#offre-detail">Garder</a>`), et un
   menu d'ancres en tête de page permet de sauter n'importe où. Un bouton mort
   ne dit rien, un bouton qui emmène quelque part fait apparaître les impasses.
4. **Faire valider avant de coder.** Aucune ligne de code applicatif tant que
   les maquettes ne sont pas validées : c'est le dernier moment où changer
   d'avis est gratuit.

Ce qu'une maquette doit montrer :

- **Les états, pas seulement le chemin heureux** : liste vide au premier
  lancement, chargement, erreur, et le cas limite qui fait mal dans ce métier
  (quota atteint, paiement refusé, droit manquant).
- **Des données plausibles** tirées du domaine réel, jamais « Lorem ipsum » ni
  « Client 1, Client 2 ». Le faux texte cache les débordements et les colonnes
  trop étroites, qui sont précisément ce qu'une maquette sert à voir.
- **Le mobile et le desktop**, par media queries dans le même écran. Pas de
  maquette mobile séparée à tenir en double.

Le design reste simple et épuré, et accordé à la niche du projet : un outil de
comptabilité, une librairie et un tableau de bord industriel n'ont ni la même
densité, ni la même typographie, ni la même palette. Regarder ce que fait le
métier avant de choisir, plutôt que reposer le même gris et le même bleu sur
chaque projet.

Les choix pris là (palette, typographie, échelle d'espacement, rayons) sont les
tokens du projet. Les déclarer en variables CSS dans la maquette, puis les
reporter dans le thème Tailwind au moment du développement. Sans ça le design se
refait une seconde fois, en moins bien, au milieu du code.

Une fois un écran développé, le code fait foi et la maquette ment. Garder les
maquettes figées en référence, leur lien Artifact noté dans le fichier de
session, et ne pas chercher à les tenir à jour.

## Workflow git

Un **lot** est un groupe de tâches qui livre quelque chose de vérifiable seul.
On ne travaille jamais directement sur `main` ni `dev`.

`dev` reçoit le développement, `main` la production.
On ne passe d'une branche à la suivante que par une PR.

1. Brancher depuis `dev` à jour.
2. Un commit par tâche. Écrire le test d'abord là où un bug coûte cher et où la
   logique est subtile ; ailleurs, un test ciblé après coup suffit.
3. `npm test` au vert sur toute la suite avant d'ouvrir la PR.
4. `gh pr create --base dev`.
5. Ne jamais fusionner sans accord explicite.
   Seule exception : la PR de résumé de fin de session ouverte par Claude
   (`docs/session-*`, seuls des fichiers de `.claude/sessions/` touchés), que
   Claude fusionne lui-même dès les tests verts. Quand la fusion d'une PR clôt
   la session, le résumé s'écrit avant et se committe dans sa branche. S'il ne
   reste ensuite que des fichiers de `.claude/sessions/` à committer (résumé,
   archives, `reste-a-faire.md`), Claude enchaîne sans demander : branche
   `docs/session-*`, commit `docs: update session summary`, PR, fusion.
6. Après fusion : revenir sur `dev`, `git pull`, supprimer la branche.
7. Mettre en production : `gh pr create --base main --head dev`, sur accord
   explicite.

### Messages de commit

En anglais, à l'impératif, sans point final. Préfixe `feat:`, `fix:`, `test:`,
`docs:` ou `refactor:`.

## Stack

- **npm** comme gestionnaire de paquets, jamais pnpm, yarn ni bun : un seul
  lockfile (`package-lock.json`), et toute commande s'écrit `npm` / `npx`
- Next.js App Router + TypeScript strict, RSC par défaut
- Neon (Postgres serverless) en ligne : une branche de base pour la production,
  et une par déploiement de prévisualisation via l'intégration Vercel ; RLS non
  activé : la sécurité est applicative, toute requête filtre sur l'utilisateur
  courant
- Authentification par code à usage unique envoyé par e-mail (email OTP de Neon
  Auth), sans mot de passe, pas de lien magique ni d'autre fournisseur sans le
  demander
- Pas de notion d'organisation ni d'invitation, ne pas en prévoir
- Prisma comme ORM : schema.prisma = source de vérité du schéma, migrations Prisma Migrate (jamais de SQL manuel via dashboard)
- Tailwind, icônes lucide-react
- Vitest + Testing Library en TypeScript
- Déploiement Vercel + Neon
- Context7 obligatoire (resolve-library-id → query-docs) avant de coder avec une lib de la stack

## Règles métier

Référence complète : `docs/specs/2026-11-16-goal-master-mvp-design.md`.

- **Deux comptes seulement** : seules les deux adresses email autorisées peuvent se connecter. Chacun lit les données de l'autre (progression, avatar, fil) : c'est la seule exception au filtrage par utilisateur courant, qui reste la règle pour toute écriture.
- **L'XP se calcule, elle ne se stocke pas en dur** : elle découle des candidatures et des relances suivies d'effet. Annuler une candidature retire ses XP.
- **Plafond quotidien** : au-delà de 15 candidatures dans la journée, elles comptent mais ne rapportent plus d'XP.
- **Une candidature porte le nom de l'entreprise**, obligatoire. Un doublon d'entreprise avertit sans bloquer.
- **Les jours se découpent à minuit, heure de Paris** (série, plafond, relance quotidienne).
- **Un succès débloqué n'est jamais retiré**, même si une candidature est annulée ensuite.
- **Une relance par jour et par personne.** Si le destinataire candidate dans les 24 h, +15 XP pour les deux, une seule fois par relance.
