import { describe, expect, it } from "vitest";
import { assertGuardedResourceOwnership } from "./ownership.js";
import type { ConnectorGrant } from "./grants.js";

const grant: ConnectorGrant = {
  grantId: "grant-1",
  actorId: "actor-1",
  environment: "test",
  storeId: 7,
  customerScope: { kind: "customer_ids", ids: [11] },
  toolNames: ["get_billing_summary"],
  expiresAt: "2999-01-01T00:00:00.000Z",
};

describe("post-retrieval resource ownership", () => {
  it("allows a returned record only when store, customer, and environment match", () => {
    expect(() => assertGuardedResourceOwnership(grant, {
      storeId: 7, customerId: 11, testMode: true,
    })).not.toThrow();
    expect(() => assertGuardedResourceOwnership({
      ...grant, customerScope: { kind: "store_wide" },
    }, { storeId: 7, customerId: 19, testMode: true })).not.toThrow();
  });

  it.each([
    ["cross-store", { storeId: 8, customerId: 11, testMode: true }],
    ["cross-customer", { storeId: 7, customerId: 12, testMode: true }],
    ["live record in test context", { storeId: 7, customerId: 11, testMode: false }],
    ["missing store", { storeId: undefined, customerId: 11, testMode: true }],
    ["missing customer", { storeId: 7, customerId: undefined, testMode: true }],
    ["missing environment", { storeId: 7, customerId: 11, testMode: undefined }],
    ["ambiguous store", { storeId: "7x", customerId: 11, testMode: true }],
    ["ambiguous customer", { storeId: 7, customerId: "011", testMode: true }],
  ])("denies %s with the same public error", (_label, resource) => {
    expect(() => assertGuardedResourceOwnership(grant, resource)).toThrow("Access denied");
  });

  it("does not use email as ownership evidence", () => {
    const resource = {
      storeId: 7, customerId: 12, testMode: true, email: "actor@example.com",
    };
    expect(() => assertGuardedResourceOwnership(grant, resource)).toThrow("Access denied");
  });
});
