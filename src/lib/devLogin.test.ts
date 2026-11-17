import { describe, expect, it } from "vitest";
import { devLoginEnabled } from "./devLogin";

describe("devLoginEnabled", () => {
  it("est actif en développement local", () => {
    expect(devLoginEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("n'est actif sur un aperçu Vercel qu'avec PREVIEW_DIRECT_LOGIN=1", () => {
    expect(devLoginEnabled({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview", PREVIEW_DIRECT_LOGIN: "1" })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "development", VERCEL: "1", VERCEL_ENV: "development" })).toBe(false);
  });

  it("n'est jamais actif en production, même si la variable y est posée", () => {
    expect(devLoginEnabled({ NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", PREVIEW_DIRECT_LOGIN: "1" })).toBe(false);
  });
});
