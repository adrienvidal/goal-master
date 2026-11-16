import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotification = vi.fn();
const subs = [{ endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "k", auth: "a", playerId: "p1" }];
const remove = vi.fn().mockResolvedValue(undefined);

vi.mock("web-push", () => ({ setVapidDetails: vi.fn(), sendNotification: (...args: unknown[]) => sendNotification(...args) }));
vi.mock("./db", () => ({
  db: () => ({
    pushSubscription: {
      findMany: async () => subs,
      findFirst: async ({ where }: { where: { endpoint: string; playerId: string } }) => subs.find((s) => s.endpoint === where.endpoint && s.playerId === where.playerId) ?? null,
      delete: remove,
    },
  }),
}));

process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
process.env.VAPID_PRIVATE_KEY = "priv";
const { pushTo, pushToDevice } = await import("./push");

describe("pushTo", () => {
  beforeEach(() => {
    sendNotification.mockReset();
    remove.mockClear();
  });

  it("envoie en priorité haute avec une durée de vie de 24 h (sinon Android retient le push en veille)", async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    await pushTo("p1", { title: "T", body: "B" });
    expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({ endpoint: subs[0].endpoint }), expect.any(String), { urgency: "high", TTL: 86400 });
  });

  it("oublie un abonnement mort (410)", async () => {
    sendNotification.mockRejectedValue({ statusCode: 410 });
    await pushTo("p1", { title: "T", body: "B" });
    expect(remove).toHaveBeenCalledWith({ where: { endpoint: subs[0].endpoint } });
  });
});

describe("pushToDevice", () => {
  it("dit si le service de push a pris l'envoi en charge", async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await pushToDevice("p1", subs[0].endpoint, { title: "T", body: "B" })).toBe("ok");
  });
  it("refuse l'appareil d'un autre joueur", async () => {
    expect(await pushToDevice("p2", subs[0].endpoint, { title: "T", body: "B" })).toBe("gone");
  });
});
