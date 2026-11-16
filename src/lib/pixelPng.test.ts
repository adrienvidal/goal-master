import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { drawText, encodePng, hexToRgba, PixelCanvas } from "./pixelPng";

describe("pixelPng", () => {
  it("lit les couleurs hexadécimales", () => {
    expect(hexToRgba("#f2c14e")).toEqual([242, 193, 78, 255]);
    expect(hexToRgba("#fff")).toEqual([255, 255, 255, 255]);
  });

  it("remplit et recadre sans sortir du canevas", () => {
    const c = new PixelCanvas(4, 3);
    c.fillStyle = "#ff0000";
    c.fillRect(-2, 1, 10, 1);
    expect(c.get(0, 1)).toEqual([255, 0, 0, 255]);
    expect(c.get(3, 1)).toEqual([255, 0, 0, 255]);
    expect(c.get(0, 0)).toEqual([0, 0, 0, 0]);
  });

  it("encode un PNG valide, agrandi en pixels nets", () => {
    const c = new PixelCanvas(2, 1);
    c.fillStyle = "#00ff00";
    c.fillRect(1, 0, 1, 1);
    const png = encodePng(c, 3);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(6); // largeur
    expect(png.readUInt32BE(20)).toBe(3); // hauteur
    const idatLength = png.readUInt32BE(33);
    const raw = inflateSync(png.subarray(41, 41 + idatLength));
    // Première ligne : octet de filtre, puis 3 pixels transparents et 3 verts.
    expect([...raw.subarray(1 + 3 * 4, 1 + 4 * 4)]).toEqual([0, 255, 0, 255]);
  });

  it("écrit GOAL MASTER avec la police bitmap", () => {
    const c = new PixelCanvas(80, 10);
    expect(drawText(c, "GOAL MASTER", 0, 0, "#f2c14e")).toBe(65);
    expect(() => drawText(c, "X", 0, 0, "#fff")).toThrow();
  });
});
