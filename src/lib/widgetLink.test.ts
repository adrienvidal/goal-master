import { describe, expect, test } from "vitest";
import { bearerKey, hashWidgetKey, isLocalOrigin, newWidgetKey, safeReturnPath } from "./widgetLink";

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
  test("isLocalOrigin", () => {
    for (const o of ["http://localhost:5173", "http://127.0.0.1:4321", "http://localhost"]) expect(isLocalOrigin(o)).toBe(true);
    for (const o of ["https://localhost:5173", "http://localhost.evil.example", "https://evil.example", "http://localhost:5173/x", null, ""]) {
      expect(isLocalOrigin(o)).toBe(false);
    }
  });

  test("safeReturnPath", () => {
    expect(safeReturnPath("/relier?origin=http%3A%2F%2Flocalhost%3A5173")).toBe("/relier?origin=http%3A%2F%2Flocalhost%3A5173");
    for (const r of ["//evil.example", "https://evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "relier", "", null]) expect(safeReturnPath(r)).toBe("/");
  });
});
