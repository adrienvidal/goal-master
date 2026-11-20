# 2026-11-20 · Encart relié depuis une machine Tailscale, bandage et guérison

## Reprise

```
✅ Fait      Bandage qui suit le héros, guérison par les coups, échéance au 31/12, en prod
⛔ Bloqué    Aucun
🎯 Priorité  Vérifier le boss à 34 PV, puis trancher les 3 cas du boss à l'échéance (31/12)
```

## Réalisé
- Nicolas ne pouvait pas relier l'encart (« Lien impossible ») : job-finder tourne sur un Mac mini distant, ouvert par une adresse Tailscale `http://100.x.x.x:port`, et Goal Master n'acceptait que `localhost` et `127.0.0.1`
- **PR #160 fusionnée dans `dev`** : `isLocalOrigin` (`src/lib/localOrigin.ts`) accepte aussi les adresses `http` en 100.64.0.0/10 (Tailscale), jamais `https` ni une adresse publique ; l'en-tête CSP de `/widget` passe dans `src/middleware.ts` (une plage d'IP ne s'écrit pas dans `frame-ancestors` : on ajoute la page qui charge l'encart, lue dans le Referer, si elle est locale) ; tests écrits d'abord, 352 tests verts, build OK, en-têtes vérifiés sur un serveur local
- **Mise en production** sur accord d'Adrien (PR #161, commit de fusion) : en-tête vérifié sur goal.viloris.io avec une adresse 100.x
- Archivage : rien d'archivé. 16/11 porte toujours le duel du boss ; 17/11 a encore des points ouverts non vérifiés, donc dans le doute il reste à la racine

### Suite de la journée : bandage, guérison, échéance
- **PR #163** : le bandage était posé à côté de l'image du héros et restait figé quand il respirait ou penchait ; il est maintenant dessiné dans l'image (`Sprite.tsx`), la teinte de blessure ne touche plus que le corps. Vérifié en local sur un héros endormi
- **PR #164** : nouvelle règle de guérison (voir Décisions). `isWounded` et `hitsLeft` dans `src/game/duel.ts`, test écrit d'abord ; carte du boss « Encore N coups pour guérir. » ; textes alignés (page du duel, intro, notification de défaite, CLAUDE.md). 353 tests verts
- **Mise en production** sur accord d'Adrien (PR #165, commit de fusion), déploiement vérifié
- **Échéance des deux objectifs repoussée du 16/12 au 31/12** directement en base de production (mise à jour des deux lignes `Goal` actives) : le boss de la semaine passe de 50 à 34 PV (17 par joueur), calculé, pas encore vu à l'écran
- Archivage : rien d'archivé, même raison que plus haut

## Reste à faire
- Recharger l'accueil et vérifier que le Golem ATS affiche bien 34 PV et le compteur « Encore N coups pour guérir »
- Le duel du 25/12 tombe le jour de Noël : rien de prévu, à voir si on veut le décaler
- Pas de test de composant possible pour l'instant : Vitest n'inclut que `*.test.ts` et ne transforme pas le JSX ; à régler si on veut tester l'affichage
- **Nicolas** : recharger job-finder et recliquer sur « Relier » ; si ça bloque encore, demander une capture avec l'adresse complète de la fenêtre
- Duel du vendredi 20/11 à 18 h : pas vérifié dans cette session (PV adoucis, coups d'entraide, attaque ultime sur un vrai téléphone si le duel est perdu)
- **Boss à l'échéance, trois cas à trancher** (maquette `boss-echeance.html`), recommandations proposées en début de session, sans réponse d'Adrien pour l'instant : plafonner le boss au rythme de l'objectif précédent après une victoire en avance ; duel final au prorata le jour de l'échéance en milieu de semaine ; bandage laissé tel quel après le dernier duel
- Le reste des points ouverts de la session du 19/11 tient toujours (côté job-finder-claude, bases locales de test, petit reste de `/objectif/fin`)
- Remarques de design remontées par un outil de vérification, non traitées : bordures colorées sur un côté dans `globals.css` (antérieures) et contraste faible dans `docs/maquettes/encart-libre-sans-compagnon.html` (sans doute venu de l'autre session)

## Blockers
- Aucun

## Décisions
- **Guérison** : après un duel perdu, les bandages tombent dès que les coups de la semaine atteignent les PV du boss (coup de grâce non compris), sans attendre le vendredi. Remplace « bandage jusqu'à la victoire suivante »
- Le changement de texte de l'intro (écran du duel) n'ajoute pas d'écran : `INTRO_STEP_COUNT` et `LATEST_NEWS` inchangés
- Objectif trop serré (100 en 4 semaines, boss à 50 PV) : on repousse l'échéance plutôt que d'appliquer un coefficient au boss, pour que battre le boss veuille toujours dire tenir l'objectif. Nouvelle échéance commune : 31/12
- L'encart et `/relier` acceptent une machine Tailscale du joueur (100.64.0.0/10) en plus de `localhost` : un job-finder sur une autre machine du même réseau privé est un usage normal. Remplace la décision « `/widget` affichable seulement depuis localhost »
- Pas de noms de machines MagicDNS (`*.ts.net`) pour l'instant : seule l'adresse IP Tailscale est acceptée
