# Plan : bilan du jour

Spec : `docs/specs/2026-11-18-bilan-du-jour-design.md`. Branche `feat/bilan-du-jour`, partie de
`fix/arena-turn-no-email` (PR #79, dont elle reprend `sendsEmail`).

No-gos : pas de nouvel écran, pas de réglage, pas de suivi de lecture.
Fondrière : le calcul des XP du jour. Limite : instantané « avant minuit » (candidatures, relances et
validations de quête antérieures), différence bornée à 0.

1. **Schéma** : `event Json?` et `mailedAt DateTime?` sur `NotificationLog`, migration Prisma, `prisma generate`.
2. **Règles pures** `src/game/digest.ts` (test d'abord) : `digestOf(rows, today)` → résultat du duel à part, lignes
   triées avec leur libellé d'heure, événement en tête, objet. Plus `xpGainedSince`.
3. **`notify()`** : catégorie coupée → rien ; plafond → pas de push mais ligne notée ; `event` stocké si
   `sendsEmail` ; plus d'e-mail immédiat. `shouldSend` remplacé par `isMuted` + `pushAllowed`.
4. **Gabarit** `digestMail()` dans `src/server/mail.ts`, remplace `notificationMail` ; compte du jour, cadre du
   duel, liste, bouton, pied.
5. **Envoi** `src/server/digest.ts` `sendDigests(now)` : lignes en attente par joueur, filtre des catégories
   coupées, compte du jour, scène, envoi, `mailedAt` posé si l'envoi passe. Appel en fin de cron.
6. **Textes et docs** : réglages (« Par e-mail ») et `PushSetup` disent « un bilan chaque soir » au lieu de
   « chaque notification par e-mail » ; spec notifications renvoyée vers le bilan.

Vérification : `npm test`, `tsc`, eslint, puis rendu d'un bilan réel en local (cron appelé avec CRON_SECRET,
e-mail détourné vers DEV_MAIL_TO).
