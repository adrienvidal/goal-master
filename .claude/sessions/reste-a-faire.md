# Reste à faire (backlog vivant)

Items encore ouverts repris des sessions archivées. Cocher puis retirer un item quand il est fait.

- [ ] **Encart pour job-finder en ligne** (https://job.viloris.io, portail en production depuis le 22/11) : aujourd'hui l'encart n'accepte que les adresses locales. Ajouter cette origine, de façon explicite (liste fermée), à `isLocalOrigin` / `widgetFrameAncestors` (`src/lib/localOrigin.ts`), donc au `frame-ancestors` de `/widget` (middleware), aux messages de `WidgetView` et `FreeScene`, et au retour de la page `/relier`. Ensuite, côté job-finder : encart en ligne avec sa propre clé de liaison (gardée dans la base du portail), affichage seul ; les XP restent comptés par l'ordinateur au passage à « envoyée ». Sur téléphone : replié derrière le rond de la barre, ouvert par-dessus (maquette https://claude.ai/artifact/R7V8K5275Qm8oGjbiDmPSL, écran 4) ; pas de mode Libre sur téléphone — 22/11
- [ ] Annuler la candidature de test « doctolib » dans la base Neon, si elle existe encore (accord d'Adrien) — session du 16/11
- [ ] Effets dessinés de la maquette non portés dans l'Arène (traînée d'épée, feuilles, étoiles animées, aura des Bottes), si le combat paraît trop sec — 17/11
- [ ] Base locale : effacer l'Arène de test (actions `test-ko`, `test-ko2`) si gênante — 17/11
- [ ] Premier vrai défi avec Nicolas — 16/11
- [ ] Relance sur Android, app ouverte : à vérifier — 16/11
- [ ] Textes de la carte du boss — 16/11
- [ ] Suppression automatique des branches Neon d'aperçu — 16/11
