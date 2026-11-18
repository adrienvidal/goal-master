import { describe, expect, it } from "vitest";
import { decayTrauma, impactOf, shakeOffset, SHAKE_DECAY } from "./arenaImpact";

describe("impactOf", () => {
  it("donne plus de gel et de tremblement au coup le plus fort (maquette arene-impact, barème)", () => {
    const attack = impactOf("ATTACK", { parried: false, ko: false })!;
    const thrust = impactOf("THRUST", { parried: false, ko: false })!;
    const ko = impactOf("THRUST", { parried: false, ko: true })!;
    const parried = impactOf("ATTACK", { parried: true, ko: false })!;
    expect(attack.stop).toBe(60);
    expect(thrust.stop).toBe(120);
    expect(ko.stop).toBe(250);
    expect(parried.stop).toBeLessThan(attack.stop);
    expect(parried.trauma).toBeLessThan(attack.trauma);
    expect(attack.trauma).toBeLessThan(thrust.trauma);
    expect(thrust.trauma).toBeLessThan(ko.trauma);
    expect(parried.flash).toBe(false);
    expect(thrust.sparks).toBeGreaterThan(attack.sparks);
  });

  it("ne fige ni ne secoue pour une Potion, et rien pour une Parade posée", () => {
    expect(impactOf("POTION", { parried: false, ko: false })).toMatchObject({ stop: 0, trauma: 0, flash: false });
    expect(impactOf("PARRY", { parried: false, ko: false })).toBeNull();
    expect(impactOf("END", { parried: false, ko: false })).toBeNull();
  });

  it("tient chaque coup dans la durée d'un pas de rejeu (1,5 s), réaction de la cible comprise", () => {
    for (const kind of ["ATTACK", "THRUST", "WHIRL", "POTION"] as const)
      for (const ko of [false, true]) {
        const i = impactOf(kind, { parried: false, ko })!;
        expect(i.at + i.stop + 500, `${kind} ${ko}`).toBeLessThanOrEqual(1500);
        expect(i.stop).toBeLessThanOrEqual(250);
      }
  });
});

describe("tremblement", () => {
  it("revient à zéro en 1/decay seconde, sans jamais passer sous zéro", () => {
    let t = 1;
    for (let i = 0; i < 60; i++) t = decayTrauma(t, 1 / SHAKE_DECAY / 60);
    expect(t).toBe(0);
    expect(decayTrauma(0.1, 5)).toBe(0);
  });

  it("ne décale rien sans trauma, et croît comme son carré", () => {
    expect(shakeOffset(0, 3)).toEqual({ x: 0, y: 0, rotate: 0 });
    const t = 0.37;
    const half = shakeOffset(0.5, t);
    const full = shakeOffset(1, t);
    expect(full.x).toBeCloseTo(half.x * 4, 5);
    expect(Math.abs(full.x)).toBeLessThanOrEqual(10);
    expect(Math.abs(full.y)).toBeLessThanOrEqual(7);
  });
});
