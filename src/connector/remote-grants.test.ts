import { describe, expect, it, vi } from "vitest";
import { authorizeRemoteCall, type RemoteGrantAuthority } from "./remote-grants.js";
import type { ConnectorGrant } from "./grants.js";

const NOW = Date.parse("2026-09-24T12:00:00.000Z");
const identity = { callerId: "caller-a", credentialId: "credential-a-v2" };
const grant: ConnectorGrant = {
  grantId: "grant-a",
  actorId: "caller-a",
  environment: "test",
  storeId: 42,
  customerScope: { kind: "customer_ids", ids: [7] },
  toolNames: ["get_billing_summary"],
  expiresAt: "2026-09-24T13:00:00.000Z",
};

function authority(): RemoteGrantAuthority {
  return {
    verifyCredential: vi.fn().mockResolvedValue(identity),
    resolveGrant: vi.fn().mockResolvedValue(grant),
    verifyGrant: vi.fn().mockResolvedValue(true),
    isRevoked: vi.fn().mockResolvedValue(false),
    resolveMerchantKey: vi.fn().mockResolvedValue("merchant-key-a"),
  };
}

const request = () => new Request("https://example.test/mcp", {
  method: "POST",
  headers: { authorization: "Bearer credential-a-v2" },
});

describe("remote grant authorization", () => {
  it("binds the verified caller, grant, environment, store, and merchant key", async () => {
    const source = authority();
    const result = await authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW);
    expect(result).toEqual({ identity, grant, merchantKey: "merchant-key-a" });
    expect(source.resolveGrant).toHaveBeenCalledWith(identity);
    expect(source.verifyGrant).toHaveBeenCalledWith(grant, identity);
    expect(source.resolveMerchantKey).toHaveBeenCalledWith("test", 42);
  });

  it("keeps two callers and stores isolated", async () => {
    const source = authority();
    const otherIdentity = { callerId: "caller-b", credentialId: "credential-b" };
    const otherGrant = { ...grant, grantId: "grant-b", actorId: "caller-b", storeId: 99 };
    vi.mocked(source.verifyCredential).mockResolvedValueOnce(identity).mockResolvedValueOnce(otherIdentity);
    vi.mocked(source.resolveGrant).mockResolvedValueOnce(grant).mockResolvedValueOnce(otherGrant);
    vi.mocked(source.resolveMerchantKey).mockImplementation(async (_environment, storeId) => `merchant-key-${storeId}`);
    const first = await authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW);
    const second = await authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW);
    expect(first.grant.storeId).toBe(42);
    expect(first.merchantKey).toBe("merchant-key-42");
    expect(second.grant.storeId).toBe(99);
    expect(second.merchantKey).toBe("merchant-key-99");
  });

  it("rechecks revocation for each call", async () => {
    const source = authority();
    await authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW);
    vi.mocked(source.isRevoked).mockResolvedValue(true);
    await expect(authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW)).rejects.toThrow("Access denied");
    expect(source.isRevoked).toHaveBeenCalledTimes(2);
    expect(source.resolveMerchantKey).toHaveBeenCalledTimes(1);
  });

  it("accepts a rotated credential only when the host verifier accepts it", async () => {
    const source = authority();
    vi.mocked(source.verifyCredential).mockResolvedValueOnce(null).mockResolvedValueOnce(identity);
    await expect(authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW)).rejects.toThrow("Access denied");
    await expect(authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW)).resolves.toMatchObject({ identity });
    expect(source.resolveGrant).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing authority", undefined, "test", grant],
    ["wrong environment", authority(), "live", grant],
    ["wrong caller", authority(), "test", { ...grant, actorId: "caller-b" }],
    ["wrong store", authority(), "test", { ...grant, storeId: 99 }],
    ["expired grant", authority(), "test", { ...grant, expiresAt: "2026-09-24T12:00:00.000Z" }],
  ] as const)("denies %s", async (_label, configured, environment, candidate) => {
    const source = configured;
    if (source) vi.mocked(source.resolveGrant).mockResolvedValue(candidate);
    if (source && _label === "wrong store") vi.mocked(source.verifyGrant).mockResolvedValue(false);
    await expect(authorizeRemoteCall(source, request(), environment, "get_billing_summary", NOW)).rejects.toThrow("Access denied");
    if (source) expect(source.resolveMerchantKey).not.toHaveBeenCalled();
  });

  it("fails closed on missing keys and invalid verifier output without exposing credentials", async () => {
    const source = authority();
    vi.mocked(source.resolveMerchantKey).mockResolvedValue(undefined);
    await expect(authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW)).rejects.toThrow("Access denied");
    vi.mocked(source.verifyCredential).mockResolvedValue({ callerId: "caller-a", credentialId: "" });
    await expect(authorizeRemoteCall(source, request(), "test", "get_billing_summary", NOW)).rejects.toThrow("Access denied");
    expect(source.resolveGrant).toHaveBeenCalledTimes(1);
  });
});
