import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { INTRO_STEP_COUNT, introStart, introStepsSeen } from "./intro";

test("reads how many intro screens this device has seen", () => {
  expect(introStepsSeen(undefined)).toBe(0);
  expect(introStepsSeen("1")).toBe(4);
  expect(introStepsSeen("5")).toBe(5);
  expect(introStart(5)).toBe(5);
  expect(introStepsSeen("abc")).toBe(0);
});

test("starts at the first new screen, or at the beginning", () => {
  expect(introStart(0)).toBe(0);
  expect(introStart(4)).toBe(4);
  expect(introStart(INTRO_STEP_COUNT)).toBe(0);
});

test("the step count matches the intro screens", () => {
  // Intro.tsx est un composant client en JSX : on compte ses écrans dans le source.
  const source = readFileSync(join(__dirname, "../app/intro/Intro.tsx"), "utf8");
  expect(source.match(/^ {4}title: "/gm)).toHaveLength(INTRO_STEP_COUNT);
});
