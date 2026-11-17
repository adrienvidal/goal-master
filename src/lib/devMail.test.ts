import { describe, expect, it } from "vitest";
import { localRecipient } from "./devMail";

const mail = { to: "nicolas@example.com", subject: "Adrien te défie" };

describe("local mail", () => {
  it("goes to the real address online", () => {
    expect(localRecipient(mail, { NODE_ENV: "production" })).toEqual(mail);
    expect(localRecipient(mail, { NODE_ENV: "development", VERCEL: "1" })).toEqual(mail);
  });
  it("is redirected to DEV_MAIL_TO in local development", () => {
    expect(localRecipient(mail, { NODE_ENV: "development", DEV_MAIL_TO: "me@example.com" })).toEqual({ to: "me@example.com", subject: "[local → nicolas@example.com] Adrien te défie" });
  });
  it("is not sent in local development without DEV_MAIL_TO", () => {
    expect(localRecipient(mail, { NODE_ENV: "development" })).toBeNull();
  });
});

describe("preview mail", () => {
  it("is redirected to DEV_MAIL_TO on a Vercel preview, so one person can play both sides", () => {
    const env = { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview", DEV_MAIL_TO: "me@example.com" };
    expect(localRecipient(mail, env)).toEqual({ to: "me@example.com", subject: "[aperçu → nicolas@example.com] Adrien te défie" });
  });
  it("goes to the real address on a preview without DEV_MAIL_TO, and always in production", () => {
    expect(localRecipient(mail, { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview" })).toEqual(mail);
    expect(localRecipient(mail, { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production", DEV_MAIL_TO: "me@example.com" })).toEqual(mail);
  });
});
