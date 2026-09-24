import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({ webhookPort: 0, webhookSecret: "test-signing-secret" as string | undefined }));
const addPaymentEvent = vi.hoisted(() => vi.fn());

vi.mock("../config.js", () => ({ config }));
vi.mock("../resources/payment-context.js", () => ({ addPaymentEvent }));
vi.mock("../utils/logger.js", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));

import { createWebhookServer, startWebhookServer } from "./listener.js";

const payload = {
  meta: { event_name: "order_created" },
  data: { type: "orders", id: "42", attributes: { status: "paid" } },
};

function sign(rawBody: Buffer): string {
  return createHmac("sha256", config.webhookSecret!).update(rawBody).digest("hex");
}

describe("webhook listener", () => {
  beforeEach(() => {
    config.webhookSecret = "test-signing-secret";
    addPaymentEvent.mockReset();
  });

  it("refuses to start without a signing secret", async () => {
    config.webhookSecret = undefined;
    await expect(startWebhookServer()).rejects.toThrow(/signing secret/i);
    expect(() => createWebhookServer()).toThrow(/signing secret/i);
  });

  it("rejects absent, malformed, and incorrect signatures without exposing events", async () => {
    const server = createWebhookServer();
    const rawBody = Buffer.from(JSON.stringify(payload));
    try {
      for (const signature of [undefined, "bad", "0".repeat(64)]) {
        const response = await server.inject({
          method: "POST", url: "/webhooks", payload: rawBody,
          headers: { "content-type": "application/json", ...(signature ? { "x-signature": signature } : {}) },
        });
        expect(response.statusCode).toBe(401);
      }
      expect(addPaymentEvent).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("validates exact raw bytes and accepts a valid event only once", async () => {
    const server = createWebhookServer();
    const rawBody = Buffer.from(JSON.stringify(payload, null, 2));
    try {
      const request = { method: "POST" as const, url: "/webhooks", payload: rawBody,
        headers: { "content-type": "application/json", "x-signature": sign(rawBody) } };
      expect((await server.inject(request)).statusCode).toBe(200);
      expect((await server.inject(request)).statusCode).toBe(200);
      expect(addPaymentEvent).toHaveBeenCalledTimes(1);

      const alteredBody = Buffer.from(JSON.stringify(payload));
      expect((await server.inject({ ...request, payload: alteredBody })).statusCode).toBe(401);
      expect(addPaymentEvent).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });

  it("rejects a signed payload without the event fields it needs", async () => {
    const server = createWebhookServer();
    const rawBody = Buffer.from(JSON.stringify({ meta: {}, data: {} }));
    try {
      const response = await server.inject({ method: "POST", url: "/webhooks", payload: rawBody,
        headers: { "content-type": "application/json", "x-signature": sign(rawBody) } });
      expect(response.statusCode).toBe(400);
      expect(addPaymentEvent).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("expires duplicate records after ten minutes", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0);
    const server = createWebhookServer();
    const rawBody = Buffer.from(JSON.stringify(payload));
    const request = { method: "POST" as const, url: "/webhooks", payload: rawBody,
      headers: { "content-type": "application/json", "x-signature": sign(rawBody) } };
    try {
      expect((await server.inject(request)).statusCode).toBe(200);
      now.mockReturnValue(10 * 60 * 1000 + 1);
      expect((await server.inject(request)).statusCode).toBe(200);
      expect(addPaymentEvent).toHaveBeenCalledTimes(2);
    } finally {
      now.mockRestore();
      await server.close();
    }
  });

  it("evicts the oldest delivery when its bounded duplicate set fills", async () => {
    const server = createWebhookServer();
    const deliver = async (id: number) => {
      const rawBody = Buffer.from(JSON.stringify({ ...payload, data: { ...payload.data, id: String(id) } }));
      return server.inject({ method: "POST", url: "/webhooks", payload: rawBody,
        headers: { "content-type": "application/json", "x-signature": sign(rawBody) } });
    };
    try {
      for (let id = 0; id <= 1024; id++) {
        expect((await deliver(id)).statusCode).toBe(200);
      }
      expect((await deliver(0)).statusCode).toBe(200);
      expect(addPaymentEvent).toHaveBeenCalledTimes(1026);
    } finally {
      await server.close();
    }
  });
});
