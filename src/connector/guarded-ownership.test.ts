import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleGuardedToolCall } from "./guarded-tools.js";
import type { ConnectorGrant, TrustedGrantProvider } from "./grants.js";

const sdk = vi.hoisted(() => ({ getCustomer: vi.fn(), getSubscription: vi.fn() }));
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => sdk);

const grant: ConnectorGrant = {
  grantId: "grant-1", actorId: "actor-1", environment: "test", storeId: 7,
  customerScope: { kind: "customer_ids", ids: [11] },
  toolNames: ["get_billing_summary", "get_subscription_status"],
  expiresAt: "2999-01-01T00:00:00.000Z",
};

function provider(candidate: ConnectorGrant = grant): TrustedGrantProvider {
  return {
    resolveGrant: async () => candidate,
    verifyGrant: async () => true,
    isRevoked: async () => false,
  };
}

function customer(id = "11", overrides: Record<string, unknown> = {}) {
  return { data: { data: { id, attributes: {
    store_id: 7, test_mode: true, total_revenue_currency: 1200, mrr: 300,
    email: "private@example.com", urls: { customer_portal: "https://secret.example" },
    ...overrides,
  } } } };
}

function subscription(id = "31", overrides: Record<string, unknown> = {}) {
  return { data: { data: { id, attributes: {
    store_id: 7, customer_id: 11, test_mode: true, status: "active",
    renews_at: "2026-10-01T00:00:00.000Z", ends_at: null,
    user_email: "private@example.com", urls: { customer_portal: "https://secret.example" },
    ...overrides,
  } } } };
}

describe("guarded read ownership after SDK retrieval", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only projected billing and subscription fields for owned test records", async () => {
    sdk.getCustomer.mockResolvedValue(customer());
    sdk.getSubscription.mockResolvedValue(subscription());
    const billing = await handleGuardedToolCall("get_billing_summary", { customerId: 11 }, provider(), "test");
    const status = await handleGuardedToolCall("get_subscription_status", { subscriptionId: 31 }, provider(), "test");
    expect(billing).not.toHaveProperty("isError");
    expect(status).not.toHaveProperty("isError");
    expect(billing.content[0].text).toContain('"totalRevenueCents": 1200');
    expect(status.content[0].text).toContain('"status": "active"');
    expect(JSON.stringify([billing, status])).not.toMatch(/private@example.com|secret\.example/);
  });

  it.each([
    ["cross-store customer", "get_billing_summary", { customerId: 11 }, customer("11", { store_id: 8 })],
    ["cross-customer billing", "get_billing_summary", { customerId: 12 }, customer("12")],
    ["live customer", "get_billing_summary", { customerId: 11 }, customer("11", { test_mode: false })],
    ["missing customer store", "get_billing_summary", { customerId: 11 }, customer("11", { store_id: undefined })],
    ["cross-store subscription", "get_subscription_status", { subscriptionId: 31 }, subscription("31", { store_id: 8 })],
    ["cross-customer subscription", "get_subscription_status", { subscriptionId: 31 }, subscription("31", { customer_id: 12 })],
    ["live subscription", "get_subscription_status", { subscriptionId: 31 }, subscription("31", { test_mode: false })],
    ["missing subscription customer", "get_subscription_status", { subscriptionId: 31 }, subscription("31", { customer_id: undefined })],
  ] as const)("uses one public denial for %s", async (_label, tool, args, record) => {
    sdk.getCustomer.mockResolvedValue(record);
    sdk.getSubscription.mockResolvedValue(record);
    const result = await handleGuardedToolCall(tool, args, provider(), "test");
    expect(result).toEqual({ isError: true, content: [{ type: "text", text: "Error: Access denied" }] });
  });

  it("makes guessed IDs and SDK not-found responses indistinguishable from cross-scope records", async () => {
    sdk.getSubscription.mockResolvedValue(subscription("32"));
    const guessed = await handleGuardedToolCall("get_subscription_status", { subscriptionId: 31 }, provider(), "test");
    sdk.getSubscription.mockResolvedValue({ data: null, error: { message: "Not found" } });
    const missing = await handleGuardedToolCall("get_subscription_status", { subscriptionId: 31 }, provider(), "test");
    expect(guessed).toEqual(missing);
    expect(missing.content[0].text).toBe("Error: Access denied");
  });
});
