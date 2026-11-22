import { describe, expect, test } from "vitest";
import { bearerKey, hashWidgetKey, isJobFinderOrigin, newWidgetKey, safeReturnPath, widgetFrameAncestors } from "./widgetLink";

describe("clé de l'encart", () => {
  test("newWidgetKey : préfixe, longueur, hash cohérent", () => {
    const { key, hash } = newWidgetKey();
    expect(key).toMatch(/^gm_[A-Za-z0-9_-]{43}$/);
    expect(hashWidgetKey(key)).toBe(hash);
    expect(newWidgetKey().key).not.toBe(key);
  });

  test("hashWidgetKey refuse un format inattendu", () => {
    for (const k of ["", "gm_", "abc", "gm_" + "a".repeat(42), "xx_" + "a".repeat(43), "gm_" + "a".repeat(42) + "="]) {
      expect(hashWidgetKey(k)).toBeNull();
    }
  });

  test("bearerKey", () => {
    expect(bearerKey("Bearer gm_x")).toBe("gm_x");
    expect(bearerKey("Basic abc")).toBeNull();
    expect(bearerKey("Bearer ")).toBeNull();
    expect(bearerKey(null)).toBeNull();
  });
});

describe("origines et retours", () => {
  test("isJobFinderOrigin", () => {
    for (const o of ["http://localhost:5173", "http://127.0.0.1:4321", "http://localhost"]) expect(isJobFinderOrigin(o)).toBe(true);
    for (const o of ["https://localhost:5173", "http://localhost.evil.example", "https://evil.example", "http://localhost:5173/x", null, ""]) {
      expect(isJobFinderOrigin(o)).toBe(false);
    }
  });

  test("isJobFinderOrigin accepte une machine du réseau Tailscale (100.64.0.0/10)", () => {
    for (const o of ["http://100.64.0.1:5173", "http://100.101.102.103:4321", "http://100.127.255.255"]) expect(isJobFinderOrigin(o)).toBe(true);
    for (const o of ["http://100.63.255.255:5173", "http://100.128.0.1:5173", "https://100.101.102.103:5173", "http://100.101.102.103.evil.example", "http://192.168.1.10:5173"]) {
      expect(isJobFinderOrigin(o)).toBe(false);
    }
  });

  test("isJobFinderOrigin accepte job-finder en ligne, cette adresse exacte seulement", () => {
    expect(isJobFinderOrigin("https://job.viloris.io")).toBe(true);
    for (const o of ["http://job.viloris.io", "https://job.viloris.io:8443", "https://job.viloris.io/", "https://evil.job.viloris.io", "https://job.viloris.io.evil.example", "https://viloris.io"]) {
      expect(isJobFinderOrigin(o)).toBe(false);
    }
  });

  test("widgetFrameAncestors : localhost et job-finder en ligne toujours, plus la page qui affiche l'encart si elle est sur Tailscale", () => {
    const base = "frame-ancestors http://localhost:* http://127.0.0.1:* https://job.viloris.io";
    expect(widgetFrameAncestors(null)).toBe(base);
    expect(widgetFrameAncestors("pas une adresse")).toBe(base);
    expect(widgetFrameAncestors("https://evil.example/page")).toBe(base);
    expect(widgetFrameAncestors("http://localhost:5173/")).toBe(base);
    expect(widgetFrameAncestors("https://job.viloris.io/offres")).toBe(base);
    expect(widgetFrameAncestors("http://100.101.102.103:5173/offres?x=1")).toBe(`${base} http://100.101.102.103:5173`);
  });

  test("safeReturnPath", () => {
    expect(safeReturnPath("/relier?origin=http%3A%2F%2Flocalhost%3A5173")).toBe("/relier?origin=http%3A%2F%2Flocalhost%3A5173");
    for (const r of ["//evil.example", "https://evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "relier", "", null]) expect(safeReturnPath(r)).toBe("/");
  });
});
