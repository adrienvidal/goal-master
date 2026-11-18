import { expect, test } from "vitest";
import { ofName } from "./french";

test("élide devant une voyelle", () => {
  expect(ofName("Adrien")).toBe("d'Adrien");
  expect(ofName("Émile")).toBe("d'Émile");
  expect(ofName("Nicolas")).toBe("de Nicolas");
});
