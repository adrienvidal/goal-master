import { describe, expect, test } from "vitest";
import { between, bubbleAlign, FIRST_MONSTER_S, FIRST_VISIT_S, FRIEND_DELAY_S, FRIEND_FIRST_S, friendBubble, friendHello, heroBubble, pickGesture, MONSTER_DELAY_S, nextMonster, nextVisitor, pickThought, pickVisitor, thoughts, VISIT_DELAY_S, visitDelay } from "./freeScene";

describe("délais de la scène libre", () => {
  test("tirés entre les bornes", () => {
    expect(between(MONSTER_DELAY_S, () => 0)).toBe(120);
    expect(between(MONSTER_DELAY_S, () => 0.999999)).toBeCloseTo(300, 2);
    expect(between(VISIT_DELAY_S, () => 0.5)).toBe(180);
    expect(between(FIRST_VISIT_S, () => 0)).toBe(20);
  });
});

describe("heroBubble", () => {
  const s = { level: 8, formName: "Écuyer", streak: 12, xpInLevel: 40, xpForNext: 100, evolutionPending: false };
  test("niveau, forme, série et XP avant le niveau suivant", () => {
    expect(heroBubble(s)).toEqual({ strong: "NIV. 8 · ÉCUYER", rest: "Série 12 j · 60 XP avant niv. 9" });
  });
  test("sans série, seulement l'XP", () => {
    expect(heroBubble({ ...s, streak: 0 }).rest).toBe("60 XP avant niv. 9");
  });
  test("nouvelle forme en attente : jamais son nom", () => {
    expect(heroBubble({ ...s, evolutionPending: true })).toEqual({ strong: "NOUVELLE FORME !", rest: "Ouvre Goal Master pour la voir" });
  });
});

describe("pickVisitor", () => {
  test("aucun compagnon : personne", () => {
    expect(pickVisitor([], null, () => 0)).toBeNull();
  });
  test("un seul : toujours lui, même s'il vient de passer", () => {
    expect(pickVisitor(["cat"], "cat", () => 0.9)).toBe("cat");
  });
  test("plusieurs : jamais deux fois de suite le même", () => {
    expect(pickVisitor(["cat", "fox"], "cat", () => 0)).toBe("fox");
    expect(pickVisitor(["cat", "fox", "owl"], "fox", () => 0.99)).toBe("owl");
  });
});

describe("nextMonster", () => {
  test("jamais deux fois de suite le même", () => {
    expect(nextMonster("slime", () => 0)).toBe("bat");
    expect(nextMonster(null, () => 0)).toBe("slime");
  });
});

describe("bubbleAlign", () => {
  test("calée vers l'intérieur près des bords", () => {
    expect(bubbleAlign(40, 1200)).toBe("start");
    expect(bubbleAlign(600, 1200)).toBe("center");
    expect(bubbleAlign(1150, 1200)).toBe("end");
  });
});

describe("pensées du héros", () => {
  const now = Date.parse("2026-11-19T15:00:00Z");
  const friend = { pseudo: "Nicolas", character: "PANDA", color: "GREEN", displayedForm: 3, formName: "Novice", mood: "normal", level: 6, today: 3, streak: 4, idleWorkdays: 0, last: { company: "Qonto", at: "2026-11-19T14:55:00Z" } } as const;
  const s = { level: 8, xpInLevel: 40, xpForNext: 100, today: 2, capReached: false, streak: 12, friend: null, boss: null, canNudge: false };
  const texts = (x: Parameters<typeof thoughts>[0], said = new Set<string>()) => thoughts(x, now, said).map((t) => t.text);

  test("seulement ce qui est vrai : série et XP", () => {
    expect(texts(s)).toEqual(["Série de 12 jours. On lâche rien", "Plus que 60 XP avant le niveau 9"]);
  });
  test("rien aujourd'hui : garder la série ; une série d'un jour au singulier", () => {
    expect(texts({ ...s, today: 0, streak: 1 })).toContain("Encore 1 pour garder la série de 1 jour");
  });
  test("plafond atteint : plus de compte d'XP", () => {
    expect(texts({ ...s, today: 15, capReached: true })).toEqual(["Série de 12 jours. On lâche rien", "15 aujourd'hui ! Le reste compte, sans XP"]);
  });
  test("boss en cours, boss battu", () => {
    expect(texts({ ...s, boss: { left: 6, won: false } })).toContain("Boss vendredi 18 h : encore 6 coups");
    expect(texts({ ...s, boss: { left: 1, won: false } })).toContain("Boss vendredi 18 h : encore 1 coup");
    expect(texts({ ...s, boss: { left: 0, won: true } })).toContain("Boss à terre ! On a gagné cette semaine");
  });
  test("relance possible", () => {
    expect(texts({ ...s, friend: { ...friend, today: 0, last: null }, canNudge: true })).toContain("Tu peux relancer Nicolas aujourd'hui");
  });
  test("candidature de l'ami : urgente dans les 10 minutes, une seule fois", () => {
    const list = thoughts({ ...s, friend }, now, new Set());
    expect(list[0]).toMatchObject({ text: "Nicolas vient de candidater chez Qonto !", urgent: true });
    expect(texts({ ...s, friend }, new Set([list[0].key]))).not.toContain("Nicolas vient de candidater chez Qonto !");
    expect(thoughts({ ...s, friend }, now + 11 * 60_000, new Set())[0].urgent).toBeFalsy();
  });
  test("pickThought : l'urgente d'abord, sinon pas la dernière", () => {
    const a = { key: "a", text: "A" }, b = { key: "b", text: "B" }, u = { key: "u", text: "U", urgent: true };
    expect(pickThought([a, b, u], null, () => 0)).toBe(u);
    expect(pickThought([a, b], "a", () => 0)).toBe(b);
    expect(pickThought([a], "a", () => 0)).toBe(a);
    expect(pickThought([], null, () => 0)).toBeNull();
  });
});

describe("héros de l'ami", () => {
  const f = { pseudo: "Nicolas", character: "PANDA", color: "GREEN", displayedForm: 3, formName: "Novice", mood: "normal", level: 6, today: 3, streak: 4, idleWorkdays: 0, last: null } as const;
  test("bulle d'arrivée : sa journée", () => {
    expect(friendHello(f)).toEqual({ strong: "NICOLAS · NIV. 6", rest: "3 candidatures aujourd'hui" });
    expect(friendHello({ ...f, today: 1 }).rest).toBe("1 candidature aujourd'hui");
    expect(friendHello({ ...f, today: 0 }).rest).toBe("Pas encore candidaté aujourd'hui");
    expect(friendHello({ ...f, today: 0, idleWorkdays: 3 }).rest).toBe("Rien depuis 3 jours ouvrés…");
  });
  test("bulle au clic", () => {
    expect(friendBubble(f)).toEqual({ strong: "NICOLAS · NIV. 6 · NOVICE", rest: "3 aujourd'hui · série 4 j" });
    expect(friendBubble({ ...f, streak: 0 }).rest).toBe("3 aujourd'hui");
  });
  test("visiteurs à tour de rôle", () => {
    expect(nextVisitor([], true, null, null, () => 0)).toBe("friend");
    expect(nextVisitor(["cat"], true, null, null, () => 0)).toBe("cat");
    expect(nextVisitor(["cat"], true, "cat", "cat", () => 0)).toBe("friend");
    expect(nextVisitor(["cat", "fox"], true, "friend", "cat", () => 0)).toBe("fox");
    expect(nextVisitor(["cat"], false, "cat", "cat", () => 0)).toBe("cat");
    expect(nextVisitor([], false, null, null, () => 0)).toBeNull();
  });
  test("délais : le monstre plus tôt, l'ami seul plus espacé", () => {
    expect(between(FIRST_MONSTER_S, () => 0)).toBe(30);
    expect(visitDelay(0, true)).toBe(FRIEND_FIRST_S);
    expect(visitDelay(0, false)).toBe(FRIEND_DELAY_S);
    expect(visitDelay(2, true)).toBe(FIRST_VISIT_S);
    expect(visitDelay(2, false)).toBe(VISIT_DELAY_S);
  });
});

test("pickGesture : la sieste reste rare", () => {
  expect(pickGesture(() => 0)).toBe("sit");
  expect(pickGesture(() => 0.6)).toBe("whistle");
  expect(pickGesture(() => 0.95)).toBe("nap");
});
