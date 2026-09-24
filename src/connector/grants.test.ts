import { describe, expect, it, vi } from "vitest";
import {
  authorizeToolCall,
  type ConnectorGrant,
  type TrustedGrantProvider,
} from "./grants.js";

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const grant: ConnectorGrant = {
  grantId: "grant-1",
  actorId: "agent-1",
  environment: "test",
  storeId: 42,
  customerScope: { kind: "customer_ids", ids: [7] },
  toolNames: ["get_customer"],
  expiresAt: "2026-09-24T13:00:00.000Z",
};

function provider(candidate?: unknown): TrustedGrantProvider {
  const resolved = arguments.length === 0 ? grant : candidate;
  return {
    resolveGrant: vi.fn().mockResolvedValue(resolved),
    verifyGrant: vi.fn().mockResolvedValue(true),
    isRevoked: vi.fn().mockResolvedValue(false),
  };
}

describe("guarded grant authorization", () => {
  it("allows an authentic, current, scoped grant", async () => {
    await expect(authorizeToolCall("get_customer", provider(), "test", NOW)).resolves.toEqual(grant);
  });

  it("requires an explicit store-wide marker", async () => {
    const wide = { ...grant, customerScope: { kind: "store_wide" } };
    await expect(authorizeToolCall("get_customer", provider(wide), "test", NOW)).resolves.toEqual(wide);
    await expect(authorizeToolCall("get_customer", provider({ ...grant, customerScope: undefined }), "test", NOW)).rejects.toThrow("Access denied");
  });

  it.each([
    ["absent", undefined],
    ["malformed actor", { ...grant, actorId: "" }],
    ["malformed store", { ...grant, storeId: 0 }],
    ["malformed customer set", { ...grant, customerScope: { kind: "customer_ids", ids: [] } }],
    ["malformed expiry", { ...grant, expiresAt: "tomorrow" }],
    ["expired", { ...grant, expiresAt: "2026-09-24T12:00:00.000Z" }],
    ["wrong environment", { ...grant, environment: "production" }],
    ["unknown environment", { ...grant, environment: "staging" }],
    ["extra authority field", { ...grant, storeIds: [42, 99] }],
    ["extra customer scope field", { ...grant, customerScope: { kind: "customer_ids", ids: [7], storeWide: true } }],
    ["wrong tool", { ...grant, toolNames: ["list_customers"] }],
  ])("denies %s before calling the Lemon Squeezy API", async (_label, candidate) => {
    const lemonSqueezyCall = vi.fn();
    const call = async () => {
      await authorizeToolCall("get_customer", provider(candidate), "test", NOW);
      lemonSqueezyCall();
    };
    await expect(call()).rejects.toThrow("Access denied");
    expect(lemonSqueezyCall).not.toHaveBeenCalled();
  });

  it("denies missing or untrusted providers", async () => {
    await expect(authorizeToolCall("get_customer", undefined, "test", NOW)).rejects.toThrow("Access denied");
    const untrusted = provider();
    vi.mocked(untrusted.verifyGrant).mockResolvedValue(false);
    await expect(authorizeToolCall("get_customer", untrusted, "test", NOW)).rejects.toThrow("Access denied");
  });

  it("denies an unknown expected environment", async () => {
    await expect(authorizeToolCall("get_customer", provider(), "staging", NOW)).rejects.toThrow("Access denied");
  });

  it("denies revoked grants and checks revocation on every call", async () => {
    const source = provider();
    await authorizeToolCall("get_customer", source, "test", NOW);
    vi.mocked(source.isRevoked).mockResolvedValue(true);
    await expect(authorizeToolCall("get_customer", source, "test", NOW)).rejects.toThrow("Access denied");
    expect(source.isRevoked).toHaveBeenCalledTimes(2);
  });

  it("does not widen scope from caller-controlled arguments", async () => {
    const callerArgs = {
      storeId: 99,
      customerId: 99,
      toolNames: ["list_customers"],
      grant,
    };
    const authorized = await authorizeToolCall("get_customer", provider(), "test", NOW);
    expect(authorized.storeId).toBe(42);
    expect(authorized.customerScope).toEqual({ kind: "customer_ids", ids: [7] });
    expect(authorized.toolNames).toEqual(["get_customer"]);
    expect(callerArgs.storeId).not.toBe(authorized.storeId);
  });
});
