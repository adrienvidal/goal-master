import { describe, expect, it } from "vitest";
import { deviceLabel, isIos } from "./device";

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";

describe("device", () => {
  it("reconnaît l'iPhone, et l'iPad déguisé en Mac tactile", () => {
    expect(isIos(IPHONE)).toBe(true);
    expect(isIos(ANDROID)).toBe(false);
    expect(isIos(MAC, 0)).toBe(false);
    expect(isIos(MAC, 5)).toBe(true);
  });
  it("nomme le navigateur et le système", () => {
    expect(deviceLabel(ANDROID)).toBe("Chrome sur Android");
    expect(deviceLabel(IPHONE)).toBe("Safari sur iPhone");
    expect(deviceLabel("curl/8")).toBe("Ce navigateur");
  });
});
