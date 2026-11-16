import { expect, test } from "vitest";
import { isAllowedEmail, parseAllowedEmails } from "./allowlist";

test("parses a comma separated list, case insensitive", () => {
  expect(parseAllowedEmails(" A@x.io, b@y.io ,")).toEqual(["a@x.io", "b@y.io"]);
  expect(parseAllowedEmails(undefined)).toEqual([]);
});

test("checks membership", () => {
  const list = ["contact@viloris.io"];
  expect(isAllowedEmail("Contact@Viloris.io ", list)).toBe(true);
  expect(isAllowedEmail("autre@viloris.io", list)).toBe(false);
  expect(isAllowedEmail(undefined, list)).toBe(false);
});
