import { describe, expect, it } from "vitest";
import { botteCut } from "./arenaBotte";

describe("botteCut", () => {
  it("ne met en scène que les Bottes", () => {
    for (const kind of ["ATTACK", "PARRY", "POTION", "END"] as const) expect(botteCut(kind, 4, { replay: false, reduced: false })).toBeNull();
    expect(botteCut("THRUST", 4, { replay: false, reduced: false })).not.toBeNull();
    expect(botteCut("WHIRL", 4, { replay: false, reduced: false })).not.toBeNull();
  });

  it("suit le palier des règles, deux évolutions par palier", () => {
    expect([1, 2, 3, 4, 5, 6].map((f) => botteCut("THRUST", f, { replay: false, reduced: false })!.tier)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("dure 1 s, 1,3 s et 1,6 s pour mon coup, 0,6 s, 0,8 s et 1 s au rejeu, 0,7 s en animations réduites", () => {
    const ms = (form: number, replay: boolean, reduced = false) => botteCut("WHIRL", form, { replay, reduced })!.ms;
    expect([ms(1, false), ms(3, false), ms(5, false)]).toEqual([1000, 1300, 1600]);
    expect([ms(1, true), ms(3, true), ms(5, true)]).toEqual([600, 800, 1000]);
    expect([ms(1, false, true), ms(6, true, true)]).toEqual([700, 700]);
  });

  it("monte en puissance avec le palier (maquette arene-botte)", () => {
    const cut = (kind: "THRUST" | "WHIRL", form: number) => botteCut(kind, form, { replay: false, reduced: false })!;
    expect([1, 3, 5].map((f) => cut("THRUST", f).ghosts)).toEqual([2, 3, 4]);
    expect([1, 3, 5].map((f) => cut("THRUST", f).slashes)).toEqual([1, 2, 2]);
    expect([1, 3, 5].map((f) => cut("THRUST", f).cracks)).toEqual([false, false, true]);
    expect(cut("THRUST", 5).traverse).toBe(true);
    expect([1, 3, 5].map((f) => cut("WHIRL", f).leaves)).toEqual([8, 16, 36]);
    expect([1, 3, 5].map((f) => cut("WHIRL", f).turns)).toEqual([1, 2, 3]);
    expect(cut("WHIRL", 5).float).toBe(true);
    expect(cut("WHIRL", 3).speedLines).toBe(true);
    expect(cut("WHIRL", 1).speedLines).toBe(false);
  });

  it("nomme le coup", () => {
    expect(botteCut("THRUST", 1, { replay: false, reduced: false })!.title).toBe("COUP D'ESTOC");
    expect(botteCut("WHIRL", 1, { replay: false, reduced: false })!.title).toBe("BAMBOU TOURBILLON");
  });
});
