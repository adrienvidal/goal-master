import { describe, expect, it } from "vitest";
import { devLoginEnabled } from "./devLogin";

describe("devLoginEnabled", () => {
  it("n'est actif qu'en développement local", () => {
    expect(devLoginEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devLoginEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "development", VERCEL: "1" })).toBe(false);
    expect(devLoginEnabled({ NODE_ENV: "test" })).toBe(false);
  });
});
