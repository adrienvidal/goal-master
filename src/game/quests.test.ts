import { describe, expect, test } from "vitest";
import {
  checkLink,
  checkQuestText,
  drawOffer,
  openQuest,
  ownedCompanions,
  pendingChest,
  questsGivenValidated,
  questXp,
  type QuestRow,
} from "./quests";

let seq = 0;
function quest(over: Partial<QuestRow>): QuestRow {
  return {
    id: `q${seq++}`,
    giverId: "adrien",
    receiverId: "nicolas",
    text: "Poste un article sur LinkedIn",
    link: null,
    status: "OPEN",
    offer: [],
    companion: null,
    createdAt: new Date("2026-11-16T10:00:00Z"),
    doneAt: null,
    validatedAt: null,
    closedAt: null,
    ...over,
  };
}
const validated = (over: Partial<QuestRow>) => quest({ status: "VALIDATED", doneAt: new Date("2026-11-17T10:00:00Z"), validatedAt: new Date("2026-11-17T12:00:00Z"), ...over });

describe("openQuest", () => {
  test("trouve la quête en cours dans ce sens seulement", () => {
    const open = quest({ status: "DONE" });
    const quests = [validated({}), quest({ status: "CANCELLED" }), quest({ giverId: "nicolas", receiverId: "adrien" }), open];
    expect(openQuest("adrien", "nicolas", quests)?.id).toBe(open.id);
    expect(openQuest("nicolas", "adrien", quests)?.giverId).toBe("nicolas");
    expect(openQuest("adrien", "nicolas", [validated({})])).toBeNull();
  });
});

describe("checkQuestText", () => {
  test("refuse le vide et le trop long, rogne les espaces", () => {
    expect(checkQuestText("   ")).toEqual({ ok: false, error: "Écris la quête avant de la lancer." });
    expect(checkQuestText("a".repeat(121))).toEqual({ ok: false, error: "120 caractères au plus : raccourcis un peu." });
    expect(checkQuestText("  Poste sur LinkedIn ")).toEqual({ ok: true, text: "Poste sur LinkedIn" });
    expect(checkQuestText("a".repeat(120)).ok).toBe(true);
  });
});

describe("checkLink", () => {
  const error = "Ce lien n'est pas une adresse web. Il doit commencer par https://";
  test("n'accepte que http et https, le vide vaut pas de lien", () => {
    expect(checkLink("")).toEqual({ ok: true, link: null });
    expect(checkLink("  ")).toEqual({ ok: true, link: null });
    expect(checkLink("javascript:alert(1)")).toEqual({ ok: false, error });
    expect(checkLink("linkedin.com/posts/x")).toEqual({ ok: false, error });
    expect(checkLink(" https://www.linkedin.com/posts/x ")).toEqual({ ok: true, link: "https://www.linkedin.com/posts/x" });
  });
});

describe("compagnons et coffre", () => {
  test("collection = compagnons adoptés des quêtes validées reçues, dans l'ordre", () => {
    const quests = [
      validated({ companion: "fox", validatedAt: new Date("2026-11-18T10:00:00Z") }),
      validated({ companion: "cat", validatedAt: new Date("2026-11-17T10:00:00Z") }),
      validated({ companion: "owl", giverId: "nicolas", receiverId: "adrien" }),
    ];
    expect(ownedCompanions("nicolas", quests)).toEqual(["cat", "fox"]);
  });

  test("coffre en attente : validé, offre non vide, pas encore adopté", () => {
    const waiting = validated({ offer: ["fox", "owl", "dragon"] });
    expect(pendingChest("nicolas", [waiting])?.id).toBe(waiting.id);
    expect(pendingChest("nicolas", [{ ...waiting, companion: "fox" }])).toBeNull();
    expect(pendingChest("adrien", [waiting])).toBeNull();
    expect(pendingChest("nicolas", [validated({ offer: [] })])).toBeNull();
  });

  test("tirage : 3 distincts, hors possédés, ceux des coffres fermés seulement en complément", () => {
    const quests = [validated({ companion: "cat", offer: ["cat", "dog", "fox"] }), validated({ offer: ["owl", "rabbit", "fox"] })];
    const offer = drawOffer("nicolas", quests, () => 0);
    expect(offer).toEqual(["dog", "dragon", "fox"]);
    const fresh = drawOffer("nicolas", [], () => 0.5);
    expect(fresh).toHaveLength(3);
    expect(new Set(fresh).size).toBe(3);
  });

  test("deux coffres fermés : le troisième se complète avec leurs compagnons au lieu de sortir vide", () => {
    const quests = [validated({ offer: ["cat", "dog", "fox"] }), validated({ offer: ["owl", "rabbit", "dragon"] })];
    const offer = drawOffer("nicolas", quests, () => 0);
    expect(offer).toEqual(["cat", "dog", "fox"]);
  });

  test("un coffre dont tous les compagnons ont été adoptés ailleurs n'est plus en attente", () => {
    const first = validated({ offer: ["cat", "dog"], validatedAt: new Date("2026-11-17T12:00:00Z") });
    const adopted = [validated({ companion: "cat", offer: ["cat"] }), validated({ companion: "dog", offer: ["dog"] })];
    expect(pendingChest("nicolas", [first, ...adopted])).toBeNull();
    expect(pendingChest("nicolas", [first, adopted[0]])?.id).toBe(first.id);
  });

  test("tirage : 2 s'il en reste 2, rien quand la collection est complète", () => {
    const owned = (ids: string[]) => ids.map((c) => validated({ companion: c, offer: [c] }));
    expect(drawOffer("nicolas", owned(["cat", "dog", "fox", "owl"]), Math.random).sort()).toEqual(["dragon", "rabbit"]);
    expect(drawOffer("nicolas", owned(["cat", "dog", "fox", "owl", "rabbit", "dragon"]), Math.random)).toEqual([]);
  });
});

describe("questXp", () => {
  test("20 pour celui qui l'a faite, 5 pour celui qui l'a donnée, à la validation", () => {
    const quests = [validated({}), quest({ status: "DONE" }), quest({ status: "CANCELLED" })];
    expect(questXp("nicolas", quests)).toBe(20);
    expect(questXp("adrien", quests)).toBe(5);
    expect(questXp("nicolas", quests, new Date("2026-11-17T11:59:00Z"))).toBe(0);
    expect(questXp("nicolas", quests, new Date("2026-11-17T12:00:00Z"))).toBe(20);
  });

  test("quêtes données et validées", () => {
    expect(questsGivenValidated("adrien", [validated({}), validated({}), quest({})])).toBe(2);
  });
});
