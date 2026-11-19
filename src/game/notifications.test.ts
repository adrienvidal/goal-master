import { describe, expect, it } from "vitest";
import type { Duel } from "./duel";
import { formReached, keyOf, koCrossed, nudgesJustSucceeded, isMuted, pushAllowed, pushBody, ruleOf, rustDue, sendsEmail, textOf, type NotificationEvent } from "./notifications";
import type { NudgeRow } from "./nudges";
import type { Application } from "./xp";

const app = (at: string, userId = "b", cancelled = false): Application => ({ id: `${userId}-${at}`, userId, company: "Alan", createdAt: new Date(at), cancelledAt: cancelled ? new Date(at) : null });
const nudge = (sentAt: string): NudgeRow => ({ id: "n1", senderId: "a", recipientId: "b", message: 0, sentAt: new Date(sentAt) });
const evo: NotificationEvent = { kind: "evo", partnerId: "b", partner: "Nicolas", form: 4, formName: "Moine voyageur" };
const nudgeEvent: NotificationEvent = { kind: "nudge", nudgeId: "n1", from: "Adrien", message: 0 };
const duel = (id: string, hits: number, hp = 16): Duel => ({ id, boss: 1, start: new Date(0), at: new Date(0), hp, hits, bonus: 0, fighters: [], won: hits >= hp, resolved: false });

describe("isMuted et pushAllowed", () => {
  it("se tait quand la catégorie est coupée, en push comme dans le bilan", () => {
    expect(isMuted(evo, ["partner"])).toBe(true);
    expect(isMuted(nudgeEvent, ["nudges"])).toBe(true);
    expect(isMuted(evo, ["nudges"])).toBe(false);
  });
  it("plafonne le push à deux par jour, sauf la relance reçue et le duel", () => {
    expect(pushAllowed(evo, 1)).toBe(true);
    expect(pushAllowed(evo, 2)).toBe(false);
    expect(pushAllowed(nudgeEvent, 5)).toBe(true);
    expect(pushAllowed({ kind: "duel", friday: "2026-11-20", won: true, boss: 1, total: 18, hp: 16 }, 5)).toBe(true);
  });
});

describe("keyOf", () => {
  it("donne une clé stable par événement", () => {
    expect(keyOf(evo)).toBe("evo:b:4");
    expect(keyOf({ kind: "rust", lastDay: "2026-11-12", idle: 3, hero: "chevalier" })).toBe("rust:2026-11-12");
    expect(keyOf({ kind: "news", step: 6, title: "la vue décor" })).toBe("news:6");
  });
});

describe("textOf", () => {
  it("reprend les textes de la maquette, sans nom d'entreprise", () => {
    expect(textOf(evo).headline).toBe("Nicolas est devenu Moine voyageur ⚔️");
    const won = textOf({ kind: "duel", friday: "2026-11-20", won: true, boss: 1, total: 18, hp: 16 });
    expect(won.url).toBe("/duel");
    expect(`${won.headline} ${won.detail}`).toBe("Boss vaincu ! Le Golem ATS est tombé : 18 coups contre 16 PV.");
    expect(textOf({ kind: "remind", friday: "2026-11-20", boss: 1, missing: 1 }).detail).toBe("Il manque 1 coup avant demain 18 h.");
    expect(textOf({ kind: "news", step: 6, title: "la vue décor" }).url).toBe("/intro");
  });
  it("garde le titre et le message de la relance", () => {
    const t = textOf(nudgeEvent);
    expect(t.title).toBe("⚔️ Adrien te motive");
    expect(pushBody(t, nudgeEvent)).not.toContain("Adrien");
  });
});

describe("rustDue", () => {
  it("se déclenche au 3e jour ouvré sans candidature, week-end non compté", () => {
    // Dernière candidature le jeudi 12/11 ; vendredi, lundi : 2 jours ouvrés ; mardi : 3.
    const apps = [app("2026-11-12T10:00:00Z")];
    expect(rustDue("b", apps, "2026-11-16")).toBeNull();
    expect(rustDue("b", apps, "2026-11-17")).toEqual({ lastDay: "2026-11-12", idle: 3 });
  });
  it("ignore les candidatures annulées et celles du binôme", () => {
    const apps = [app("2026-11-02T10:00:00Z"), app("2026-11-13T10:00:00Z", "b", true), app("2026-11-16T10:00:00Z", "a")];
    expect(rustDue("b", apps, "2026-11-17")?.lastDay).toBe("2026-11-02");
  });
  it("ne dit rien à qui n'a jamais candidaté", () => {
    expect(rustDue("b", [], "2026-11-17")).toBeNull();
  });
});

describe("formReached", () => {
  it("repère le passage à une nouvelle forme", () => {
    // 10 XP par candidature ; le niveau 4 (2e forme) demande 22 + 24 + 26 = 72 XP : la 8e candidature.
    const before = Array.from({ length: 7 }, (_, i) => app(`2026-11-0${i + 2}T10:00:00Z`));
    const after = [...before, app("2026-11-16T10:00:00Z")];
    expect(formReached("b", before, after, [])).toBe(2);
    expect(formReached("b", after, after, [])).toBeNull();
  });
  it("ne signale rien sans changement de forme", () => {
    expect(formReached("b", [], [app("2026-11-16T10:00:00Z")], [])).toBeNull();
  });
});

describe("nudgesJustSucceeded", () => {
  it("rend la relance que la nouvelle candidature valide", () => {
    const n = nudge("2026-11-16T09:00:00Z");
    const before = [app("2026-11-16T08:00:00Z")];
    const after = [...before, app("2026-11-16T10:00:00Z")];
    expect(nudgesJustSucceeded("b", [n], before, after)).toEqual([n]);
    expect(nudgesJustSucceeded("b", [n], after, after)).toEqual([]);
  });
});

describe("koCrossed", () => {
  it("ne se déclenche qu'au passage à 0 PV", () => {
    expect(koCrossed(duel("2026-11-20", 15), duel("2026-11-20", 16))).toBe(true);
    expect(koCrossed(duel("2026-11-20", 16), duel("2026-11-20", 17))).toBe(false);
    expect(koCrossed(duel("2026-11-20", 10), duel("2026-11-20", 11))).toBe(false);
    expect(koCrossed(null, null)).toBe(false);
  });
});

describe("challenge notifications", () => {
  const sent = { kind: "challenge", challengeId: "c1", from: "Adrien", target: 5, until: "ce soir minuit" } as const;
  const end = { kind: "challenge-end", challengeId: "c1", won: false, partner: "Nicolas", mine: 3, theirs: 5 } as const;
  it("duel category, never capped, one per challenge", () => {
    expect(ruleOf(sent)).toEqual({ category: "duel", capped: false });
    expect(ruleOf(end)).toEqual({ category: "duel", capped: false });
    expect(keyOf(sent)).toBe("challenge:c1");
    expect(keyOf(end)).toBe("challenge-end:c1");
  });
  it("texts", () => {
    expect(textOf(sent).title).toBe("🏁 Adrien te défie");
    expect(pushBody(textOf(sent), sent)).toBe("5 candidatures avant ce soir minuit. Le premier arrivé gagne la couronne.");
    expect(textOf(end).headline).toBe("Nicolas l'emporte 5 à 3.");
    expect(textOf({ ...end, won: true, mine: 5, theirs: 2 }).url).toBe("/defi");
  });
});

describe("notifications des quêtes", () => {
  const text = "Poste un article sur LinkedIn";
  const launched: NotificationEvent = { kind: "quest", questId: "q1", from: "Adrien", text };
  const done = (round: number): NotificationEvent => ({ kind: "quest-done", questId: "q1", round, from: "Nicolas", text });
  const end = (validated: boolean): NotificationEvent => ({ kind: "quest-end", questId: "q1", round: 7, validated, partner: "Adrien", text });
  const cancel: NotificationEvent = { kind: "quest-cancel", questId: "q1", partner: "Adrien", text };

  it("catégorie Quêtes, jamais plafonnées", () => {
    for (const e of [launched, done(1), end(true), end(false), cancel]) expect(ruleOf(e)).toEqual({ category: "quests", capped: false });
    expect(pushAllowed(launched, 99)).toBe(true);
    expect(isMuted(launched, ["quests"])).toBe(true);
  });

  it("chaque aller-retour « pas encore » repart", () => {
    expect(keyOf(done(1))).not.toBe(keyOf(done(2)));
    expect(keyOf(launched)).toBe("quest:q1");
    expect(keyOf(end(true))).toBe("quest-end:q1:7");
  });

  it("textes de la maquette", () => {
    expect(textOf(launched)).toMatchObject({ headline: "Adrien te lance une quête", url: "/quete/q1" });
    expect(textOf(done(1))).toMatchObject({ headline: "Nicolas a fait sa quête", url: "/quete/q1" });
    expect(textOf(end(true))).toMatchObject({ headline: "Quête validée, un coffre t'attend", url: "/coffre" });
    expect(textOf(end(false))).toMatchObject({ headline: "Pas encore", url: "/quete/q1" });
    expect(textOf(cancel)).toMatchObject({ headline: "Quête annulée", url: "/" });
    expect(textOf({ kind: "quest-end", questId: "q1", round: 7, validated: true, chest: false, partner: "Adrien", text })).toMatchObject({ headline: "Quête validée", url: "/" });
    expect(textOf(launched).detail).toContain(`« ${text} »`);
  });
});

describe("sendsEmail", () => {
  it("garde l'e-mail partout sauf pendant l'Arène", () => {
    expect(sendsEmail({ kind: "arena-turn", arenaId: "a1", turn: 2, partner: "Nicolas", summary: "Nicolas frappe.", hp: 8 })).toBe(false);
    expect(sendsEmail({ kind: "arena", arenaId: "a1", from: "Nicolas" })).toBe(true);
    expect(sendsEmail({ kind: "arena-end", arenaId: "a1", won: true, ko: false, partner: "Nicolas" })).toBe(true);
    expect(sendsEmail(evo)).toBe(true);
    expect(sendsEmail(nudgeEvent)).toBe(true);
  });
});

describe("evo-me (au joueur qui change de forme)", () => {
  const evoMe: NotificationEvent = { kind: "evo-me", form: 3 };
  it("ne nomme jamais la forme et mène à l'accueil, où la scène la dévoile", () => {
    const t = textOf(evoMe);
    expect(t).toMatchObject({ title: "Goal Master", headline: "Ton héros a évolué !", detail: "Viens découvrir sa nouvelle forme.", url: "/" });
    expect(pushBody(t, evoMe)).not.toMatch(/Écuyer|Novice/);
  });
  it("une clé par forme, rangée dans les rappels, jamais plafonnée", () => {
    expect(keyOf(evoMe)).toBe("evo-me:3");
    expect(ruleOf(evoMe)).toEqual({ category: "reminders", capped: false });
    expect(sendsEmail(evoMe)).toBe(true);
  });
});
