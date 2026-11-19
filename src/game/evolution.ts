// Scène d'évolution (cadrage encart-modes-et-evolution, lot B). La forme se calcule ; seenForm n'est que l'accusé de
// lecture de la scène, posé quand le joueur la ferme sur /.
import type { Form } from "./levels";

/** La scène se joue quand la forme affichée (rouille comprise) dépasse la dernière forme vue. null : rien à rejouer. */
export function sceneDue(displayedForm: Form, seenForm: number | null): boolean {
  return seenForm !== null && displayedForm > seenForm;
}

/** Forme montrée par l'encart : jamais au-delà de la forme vue, pour ne pas gâcher la surprise de la scène. */
export function shownForm(displayedForm: Form, levelForm: Form, seenForm: number | null): Form {
  if (seenForm === null) return displayedForm;
  return Math.min(displayedForm, levelForm, seenForm) as Form;
}

/** Nouvelle forme vue après la scène : jamais à la baisse (double onglet, candidature annulée entre-temps). */
export function nextSeenForm(seenForm: number | null, levelForm: Form): number {
  return Math.max(seenForm ?? 0, levelForm);
}
