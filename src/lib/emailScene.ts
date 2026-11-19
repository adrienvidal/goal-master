// Ce que montre l'image d'un e-mail, selon l'événement (spec notifications, addendum e-mails 8 bits).
import type { Form } from "@/game/levels";
import type { NotificationEvent } from "@/game/notifications";
import type { Actor } from "./emailArt";
import type { CharacterId, ColorId } from "./onboarding";

export type Hero = { character: CharacterId; color: ColorId; form: Form };

const hero = (h: Hero, pose: "rest" | "action" | "victory", effect: "none" | "rust" | "hurt" = "none", form: Form = h.form): Actor => ({ type: "hero", character: h.character, color: h.color, form, pose, effect });

/** `me` : le destinataire ; `partner` : son binôme. */
export function sceneFor(event: NotificationEvent, me: Hero, partner: Hero | null): Actor[] {
  const p = (pose: "rest" | "victory", effect: "none" | "hurt" = "none", form?: Form): Actor[] => (partner ? [hero(partner, pose, effect, form ?? partner.form)] : []);
  switch (event.kind) {
    case "nudge":
    case "nudge-ok":
      return p("victory");
    case "evo-me":
      // `me` est déjà plafonné à sa forme vue : la nouvelle se découvre dans Goal Master.
      return [hero(me, "victory")];
    case "evo":
      return p("victory", "none", event.form);
    case "ko":
      return [...p("victory"), { type: "boss", boss: event.boss, down: true }];
    case "remind":
      return [hero(me, "action"), { type: "boss", boss: event.boss, down: false }];
    case "duel":
      return event.won
        ? [hero(me, "victory"), { type: "boss", boss: event.boss, down: true }, ...p("victory")]
        : [hero(me, "rest", "hurt"), { type: "boss", boss: event.boss, down: false }, ...p("rest", "hurt")];
    case "rust":
      return [hero(me, "rest", "rust")];
    case "news":
      return [hero(me, "victory"), ...p("victory")];
    case "challenge":
      return p("victory");
    case "challenge-end":
      return event.won ? [hero(me, "victory")] : p("victory");
    case "arena":
      return [...p("victory"), hero(me, "rest")];
    case "arena-turn":
      return [hero(me, "action"), ...p("rest")];
    case "arena-end":
      return event.won ? [hero(me, "victory")] : event.won === null ? [hero(me, "rest"), ...p("rest")] : p("victory");
    case "quest":
    case "quest-done":
      return p("victory");
    case "quest-end":
      return event.validated ? [hero(me, "victory")] : p("rest");
    case "quest-cancel":
      return p("rest");
  }
}
