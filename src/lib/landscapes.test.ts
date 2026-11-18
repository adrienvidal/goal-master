import { expect, test } from "vitest";
import { heroShift, landscapeGrid, LANDSCAPE_NAMES, momentAt, parisHour } from "./landscapes";

test("draws at the shape of the screen with whole pixels", () => {
  expect(landscapeGrid(390, 844)).toEqual({ w: 130, h: 282, scale: 3 });
  expect(landscapeGrid(820, 1180)).toEqual({ w: 137, h: 197, scale: 6 });
  expect(landscapeGrid(1440, 900)).toEqual({ w: 288, h: 180, scale: 5 });
  expect(landscapeGrid(1920, 1080)).toEqual({ w: 320, h: 180, scale: 6 });
  expect(landscapeGrid(2560, 1080)).toEqual({ w: 427, h: 180, scale: 6 });
});

test("never goes below a pixel of 2 on tiny or odd screens", () => {
  expect(landscapeGrid(200, 300).scale).toBe(2);
  expect(landscapeGrid(0, 0)).toEqual({ w: 1, h: 1, scale: 2 });
});

test("names the moment of the day in Paris, with quarter-hour steps", () => {
  expect(momentAt(3)).toMatchObject({ from: "nuit", to: "nuit", moment: "nuit" });
  expect(momentAt(7)).toMatchObject({ moment: "aube" });
  expect(momentAt(13)).toMatchObject({ moment: "jour" });
  expect(momentAt(19.75)).toMatchObject({ moment: "crep" });
  expect(momentAt(23)).toMatchObject({ moment: "nuit" });
  // de 17 h 30 à 19 h, le jour glisse vers le crépuscule en quatre paliers
  expect(momentAt(17.5).step).toBe(0);
  expect(momentAt(18.25)).toMatchObject({ from: "jour", to: "crep", step: 0.5 });
  expect(momentAt(18.3).step).toBe(0.5);
  expect(momentAt(19).step).toBe(0);
});

test("wraps hours around midnight", () => {
  expect(momentAt(24)).toEqual(momentAt(0));
  expect(momentAt(-1)).toEqual(momentAt(23));
});

test("keeps the main building in place when it fits, recentres it otherwise", () => {
  expect(heroShift([66, 178], 0, 320)).toBe(0);
  // téléphone : la scène visible va de 95 à 225, le château (66-178) est recentré sur 160
  expect(heroShift([66, 178], 95, 225)).toBe(38);
});

test("reads the hour in Paris, whatever the device time zone", () => {
  expect(parisHour(new Date("2026-11-18T17:30:00Z"))).toBe(18.5);
  expect(parisHour(new Date("2026-07-01T22:15:00Z"))).toBe(0.25);
});

test("drops the moment of day from the landscape names", () => {
  expect(LANDSCAPE_NAMES.CASTLE).toBe("Château");
  expect(LANDSCAPE_NAMES.MOUNTAINS).toBe("Montagnes");
});
