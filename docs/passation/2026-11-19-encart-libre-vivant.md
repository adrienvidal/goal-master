# Passation : relais des clics du mode libre (job-finder)

À reprendre dans job-finder-claude. Suite de `2026-11-19-encart-modes.md` (modes Normal, Small, Libre, Masqué).

## Ce qui change côté Goal Master (19/11)

En mode Libre (`/widget?mode=free`), l'encart n'est plus un héros seul qui patrouille : c'est une petite scène. Le héros patrouille, un compagnon choisi dans la Ménagerie de Goal Master passe le voir toutes les 2 à 4 minutes, un monstre arrive toutes les 2 à 5 minutes et le héros le chasse. Héros, compagnon et monstre se cliquent. Maquette validée : https://claude.ai/artifact/Nq2q3X1CqiokjB4JvWvtPc (écran 4, « Relais des clics »).

L'iframe garde `pointer-events: none` sur toute la page : rien ne change pour le reste de job-finder. Pour que les personnages réagissent au clic, job-finder fait le relais.

## Ce que job-finder ajoute (mode Libre seulement)

1. **Recevoir les boîtes** : l'encart envoie, à l'origine de job-finder (celle qui lui a donné la clé), au plus dix fois par seconde et seulement quand elles changent :
   ```js
   { type: "goal-master:hitboxes", boxes: [{ target: "hero" | "companion" | "monster", x, y, w, h }] }
   ```
   En pixels de l'iframe, qui couvre la fenêtre : ce sont donc des coordonnées `clientX` / `clientY` de la page. `boxes: []` quand rien n'est cliquable. Vérifier `event.origin` (l'adresse de Goal Master) et `event.source === iframe.contentWindow`, comme pour les autres messages.
2. **Curseur** : au survol d'une boîte (`mousemove` sur le document), curseur main ; sinon, le curseur normal.
3. **Clic** : un écouteur `click` en phase de capture sur le document. Si le point tombe dans une boîte : `preventDefault()`, `stopPropagation()`, puis
   ```js
   iframe.contentWindow.postMessage({ type: "goal-master:poke", target }, GOAL_MASTER_ORIGIN);
   ```
   Ailleurs, ne rien faire : le clic atteint la page comme aujourd'hui.
4. **Hors mode Libre** : ignorer les boîtes (les vider au changement de mode ou au rechargement de l'iframe).

Exemple complet, testé : `scripts/essai-job-finder.mjs` dans goal-master (chercher « Relais des clics »).

## Pour tester

- Goal Master local, page d'essai : `node scripts/essai-job-finder.mjs http://localhost:3000` puis `http://localhost:5199/?mode=free&vitesse=20`. `vitesse` accélère visites et monstres, seulement contre un Goal Master local (ignoré en production).
- Sans relais, la scène tourne quand même : seuls les clics sur les personnages ne font rien.
