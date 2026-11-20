# 2026-11-20 · Encart relié depuis une machine Tailscale

## Reprise

```
✅ Fait      Encart reliable depuis le Mac mini distant de Nicolas, en prod
⛔ Bloqué    Aucun
🎯 Priorité  Nicolas reclique « Relier », puis trancher les 3 cas du boss à l'échéance
```

## Réalisé
- Nicolas ne pouvait pas relier l'encart (« Lien impossible ») : job-finder tourne sur un Mac mini distant, ouvert par une adresse Tailscale `http://100.x.x.x:port`, et Goal Master n'acceptait que `localhost` et `127.0.0.1`
- **PR #160 fusionnée dans `dev`** : `isLocalOrigin` (`src/lib/localOrigin.ts`) accepte aussi les adresses `http` en 100.64.0.0/10 (Tailscale), jamais `https` ni une adresse publique ; l'en-tête CSP de `/widget` passe dans `src/middleware.ts` (une plage d'IP ne s'écrit pas dans `frame-ancestors` : on ajoute la page qui charge l'encart, lue dans le Referer, si elle est locale) ; tests écrits d'abord, 352 tests verts, build OK, en-têtes vérifiés sur un serveur local
- **Mise en production** sur accord d'Adrien (PR #161, commit de fusion) : en-tête vérifié sur goal.viloris.io avec une adresse 100.x
- Archivage : rien d'archivé. 16/11 porte toujours le duel du boss ; 17/11 a encore des points ouverts non vérifiés, donc dans le doute il reste à la racine

## Reste à faire
- **Nicolas** : recharger job-finder et recliquer sur « Relier » ; si ça bloque encore, demander une capture avec l'adresse complète de la fenêtre
- Duel du vendredi 20/11 à 18 h : pas vérifié dans cette session (PV adoucis, coups d'entraide, attaque ultime sur un vrai téléphone si le duel est perdu)
- **Boss à l'échéance, trois cas à trancher** (maquette `boss-echeance.html`), recommandations proposées en début de session, sans réponse d'Adrien pour l'instant : plafonner le boss au rythme de l'objectif précédent après une victoire en avance ; duel final au prorata le jour de l'échéance en milieu de semaine ; bandage laissé tel quel après le dernier duel
- Le reste des points ouverts de la session du 19/11 tient toujours (côté job-finder-claude, bases locales de test, petit reste de `/objectif/fin`)
- Remarques de design remontées par un outil de vérification, non traitées : bordures colorées sur un côté dans `globals.css` (antérieures) et contraste faible dans `docs/maquettes/encart-libre-sans-compagnon.html` (sans doute venu de l'autre session)

## Blockers
- Aucun

## Décisions
- L'encart et `/relier` acceptent une machine Tailscale du joueur (100.64.0.0/10) en plus de `localhost` : un job-finder sur une autre machine du même réseau privé est un usage normal. Remplace la décision « `/widget` affichable seulement depuis localhost »
- Pas de noms de machines MagicDNS (`*.ts.net`) pour l'instant : seule l'adresse IP Tailscale est acceptée
