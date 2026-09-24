import { describe, expect, it, vi } from "vitest";
import { handleGuardedToolCall } from "../connector/guarded-tools.js";
import type { TrustedGrantProvider } from "../connector/grants.js";

// Run with: npm test -- src/examples/guarded-flow.test.ts
// The SDK calls are fixtures. No API key or Lemon Squeezy account is needed.
const { getCustomer, getSubscription } = vi.hoisted(() => ({
  getCustomer: vi.fn(),
  getSubscription: vi.fn(),
}));
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({ getCustomer, getSubscription }));

const provider: TrustedGrantProvider = {
  resolveGrant: async () => ({
    grantId: "example-test-grant",
    actorId: "example-agent",
    environment: "test",
    storeId: 7,
    customerScope: { kind: "customer_ids", ids: [11] },
    toolNames: ["get_billing_summary"],
    expiresAt: "2999-01-01T00:00:00.000Z",
  }),
  verifyGrant: async () => true,
  isRevoked: async () => false,
};

function customerFixture(id: number) {
  return {
    data: { data: {
      id: String(id),
      attributes: {
        store_id: 7,
        test_mode: true,
        total_revenue_currency: 1200,
        mrr: 500,
      },
    } },
    error: null,
  };
}

describe("no-secret guarded test-mode example", () => {
  it("returns the permitted customer's billing summary", async () => {
    getCustomer.mockResolvedValueOnce(customerFixture(11));
    const result = await handleGuardedToolCall(
      "get_billing_summary", { customerId: 11 }, provider, "test",
    );
    expect(result).toMatchObject({
      content: [{ text: expect.stringContaining('"customerId": 11') }],
    });
    expect(result).not.toHaveProperty("isError");
  });

  it("denies a different customer even when the SDK returns that record", async () => {
    getCustomer.mockResolvedValueOnce(customerFixture(12));
    const result = await handleGuardedToolCall(
      "get_billing_summary", { customerId: 12 }, provider, "test",
    );
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "Error: Access denied" }],
    });
  });

  it("denies a hidden write tool before any SDK call", async () => {
    getCustomer.mockClear();
    getSubscription.mockClear();
    const result = await handleGuardedToolCall(
      "issue_order_refund", { orderId: 9, amount: 100 }, provider, "test",
    );
    expect(result).toMatchObject({
      isError: true,
      content: [{ text: "Error: Access denied" }],
    });
    expect(getCustomer).not.toHaveBeenCalled();
    expect(getSubscription).not.toHaveBeenCalled();
  });
});
