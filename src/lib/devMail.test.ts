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
