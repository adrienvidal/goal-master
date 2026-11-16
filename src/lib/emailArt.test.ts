import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { headerPng, swordBadgePng, parseScene, pngSize, scenePng, sceneToken } from "./emailArt";

describe("parseScene", () => {
  it("lit les jetons valides et les réécrit à l'identique", () => {
    const param = "hero.KNIGHT.BLUE.2.victory,boss.1.down,hero.PANDA.GREEN.4.rest.rust";
    const actors = parseScene(param);
    expect(actors).toHaveLength(3);
    expect(actors!.map(sceneToken).join(",")).toBe(param);
  });
  it("refuse tout le reste", () => {
    for (const bad of [null, "", "hero.DRAGON.BLUE.2.rest", "hero.KNIGHT.BLUE.7.rest", "hero.KNIGHT.BLUE.2.dance", "boss.4", "boss.1.up", "hero.KNIGHT.BLUE.2.rest.rust.x", "boss.0,boss.1,boss.2,boss.3", "<script>"]) {
      expect(parseScene(bad)).toBeNull();
    }
  });
});

describe("images", () => {
  it("produit le bandeau et une scène en PNG", () => {
    const header = headerPng();
    expect(pngSize(header)).toEqual({ width: 768, height: 160 });
    const scene = scenePng(parseScene("hero.KNIGHT.BLUE.2.victory.hurt,boss.1.down")!);
    expect(scene.subarray(1, 4).toString()).toBe("PNG");
    expect(pngSize(scene).height).toBeGreaterThan(20);
  });
});

describe("badge des notifications", () => {
  it("public/badge-96.png est l'épée en silhouette, à jour", () => {
    const badge = swordBadgePng();
    expect(pngSize(badge)).toEqual({ width: 96, height: 96 });
    expect(readFileSync("public/badge-96.png").equals(badge)).toBe(true);
  });
});
