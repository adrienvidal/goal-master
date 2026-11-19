import { describe, expect, test } from "vitest";
import { parseWidgetMode } from "./widgetMode";

describe("parseWidgetMode", () => {
  test.each(["normal", "small", "free"] as const)("%s est reconnu", (mode) => expect(parseWidgetMode(mode)).toBe(mode));
  test("absent : normal", () => expect(parseWidgetMode(undefined)).toBe("normal"));
  test("inconnu : normal", () => expect(parseWidgetMode("big")).toBe("normal"));
  test("répété dans l'adresse : normal", () => expect(parseWidgetMode(["small", "free"])).toBe("normal"));
});
