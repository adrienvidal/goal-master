import { describe, expect, test } from "vitest";
import type { Application } from "@/game/xp";
import { intakeDecision } from "./widgetIntake";

const now = new Date("2026-11-19T15:00:00Z");
const today = new Date("2026-11-19T09:00:00Z");
const yesterday = new Date("2026-11-18T09:00:00Z");

function app(id: string, company: string, extra: Partial<Application> = {}): Application {
  return { id, userId: "adrien", company, createdAt: today, cancelledAt: null, externalRef: null, source: null, ...extra };
}

const decide = (apps: Application[], company = "Doctolib", ref = "318") => intakeDecision({ company, ref, playerId: "adrien", apps, now });

describe("intakeDecision", () => {
  test("même offre déjà reçue : rien à ajouter", () => {
    expect(decide([app("a1", "Doctolib", { externalRef: "318", source: "job-finder" })])).toEqual({ kind: "known", id: "a1" });
  });

  test("même offre reçue puis annulée : elle peut revenir", () => {
    expect(decide([app("a1", "Doctolib", { externalRef: "318", source: "job-finder", cancelledAt: today })])).toEqual({ kind: "known", id: "a1" });
  });

  test("même référence chez l'autre joueur : nouvelle candidature", () => {
    expect(decide([app("n1", "Doctolib", { userId: "nicolas", externalRef: "318", source: "job-finder" })])).toEqual({ kind: "create" });
  });

  test("saisie à la main aujourd'hui : rattachée", () => {
    expect(decide([app("m1", "doctolib")])).toEqual({ kind: "attach", id: "m1" });
  });

  test("saisie à la main hier : nouvelle candidature", () => {
    expect(decide([app("m1", "Doctolib", { createdAt: yesterday })])).toEqual({ kind: "create" });
  });

  test("déjà venue de job-finder aujourd'hui pour une autre offre : nouvelle candidature", () => {
    expect(decide([app("a1", "Doctolib", { externalRef: "290", source: "job-finder" })])).toEqual({ kind: "create" });
  });

  test("doublon seulement possible (intitulé différent) : nouvelle candidature", () => {
    expect(decide([app("m1", "Doctolib - Dev front")])).toEqual({ kind: "create" });
  });

  test("saisie à la main annulée : nouvelle candidature", () => {
    expect(decide([app("m1", "Doctolib", { cancelledAt: today })])).toEqual({ kind: "create" });
  });
});
