import { describe, expect, it } from "vitest";
import { digestOf } from "@/game/digest";
import { digestMail, tallyLine } from "./mail";

const now = new Date("2026-11-20T17:01:30Z");
const digest = digestOf(
  [
    { id: "1", event: { kind: "quest", questId: "q1", from: "Adrien", text: "Relancer <script> & co" }, sentAt: new Date("2026-11-20T09:00:00Z") },
    { id: "2", event: { kind: "duel", friday: "2026-11-20", won: false, boss: 2, total: 9, hp: 15 }, sentAt: new Date("2026-11-20T17:01:00Z") },
    { id: "3", event: { kind: "nudge-ok", nudgeId: "n1", partner: "Adrien" }, sentAt: new Date("2026-11-20T11:00:00Z") },
  ],
  [],
  now,
)!;
const tally = { applications: 1, xp: 15, boss: { name: "La Pile de refus", hits: 9, hp: 15 } };

describe("digestMail", () => {
  const mail = digestMail("nicolas@example.com", digest, tally, now);
  it("uses the digest subject and the recipient", () => {
    expect(mail.to).toBe("nicolas@example.com");
    expect(mail.subject).toBe(digest.subject);
  });
  it("frames the duel result, lists the rest with links only where there is something to do", () => {
    expect(mail.html).toContain("#e88a7a");
    expect(mail.html).toContain("AUSSI AUJOURD'HUI");
    expect(mail.html).toContain("/quete/q1");
    expect(mail.html).toContain("Voir la quête");
    expect(mail.html.match(/Voir le duel/g)).toHaveLength(1);
  });
  it("escapes free text written by players", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt; &amp; co");
  });
  it("carries the tally in the preview and the plain text", () => {
    expect(tallyLine(tally)).toBe("1 candidature, +15 XP, 9 coups sur la Pile de refus.");
    expect(mail.text).toContain("1 candidature, +15 XP, 9 coups sur la Pile de refus.");
    expect(mail.text).toContain("10:00  Adrien te lance une quête");
  });
  it("drops the boss cell without a goal", () => {
    expect(tallyLine({ applications: 0, xp: 0, boss: null })).toBe("0 candidature, +0 XP.");
  });
});
