import { describe, expect, it, vi } from "vitest";
import { getAuthorizedGuardedToolDefinitions, getGuardedToolDefinitions, handleGuardedToolCall } from "./guarded-tools.js";
import type { TrustedGrantProvider } from "./grants.js";

const { getCustomer, getSubscription } = vi.hoisted(() => ({
  getCustomer: vi.fn(), getSubscription: vi.fn(),
}));
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({ getCustomer, getSubscription }));

const grant = {
    grantId: "grant-1", actorId: "actor-1", environment: "test", storeId: 7,
    customerScope: { kind: "customer_ids", ids: [11] },
    toolNames: ["get_billing_summary", "get_subscription_status"],
    expiresAt: "2999-01-01T00:00:00.000Z",
};
const provider: TrustedGrantProvider = {
  resolveGrant: async () => grant,
  verifyGrant: async () => true,
  isRevoked: async () => false,
};

describe("guarded tool catalog", () => {
  it("advertises only two narrow read tools with strict ID schemas", () => {
    const definitions = getGuardedToolDefinitions();
    expect(definitions.map((tool) => tool.name)).toEqual([
      "get_billing_summary", "get_subscription_status",
    ]);
    expect(definitions[0].inputSchema).toMatchObject({
      type: "object", required: ["customerId"], additionalProperties: false,
    });
    expect(definitions[1].inputSchema).toMatchObject({
      type: "object", required: ["subscriptionId"], additionalProperties: false,
    });
  });

  it("advertises only grant-permitted names and nothing for a missing grant", async () => {
    const limitedProvider = {
      ...provider,
      resolveGrant: async () => ({ ...grant, toolNames: ["get_billing_summary"] }),
    };
    expect((await getAuthorizedGuardedToolDefinitions(limitedProvider, "test")).map((tool) => tool.name))
      .toEqual(["get_billing_summary"]);
    expect(await getAuthorizedGuardedToolDefinitions(undefined, "test")).toEqual([]);
  });

  it.each(["get_customer", "list_customers", "search_orders", "get_financial_metrics", "issue_order_refund", "cancel_subscription", "create_webhook"])(
    "denies a direct hidden legacy call to %s without SDK access", async (name) => {
      getCustomer.mockClear(); getSubscription.mockClear();
      const result = await handleGuardedToolCall(name, {}, provider, "test");
      expect(result).toMatchObject({ isError: true });
      expect(getCustomer).not.toHaveBeenCalled();
      expect(getSubscription).not.toHaveBeenCalled();
    },
  );

  it("rejects unknown or widening arguments before SDK access", async () => {
    getCustomer.mockClear();
    const result = await handleGuardedToolCall(
      "get_billing_summary", { customerId: 11, email: "someone@example.com" }, provider, "test",
    );
    expect(result).toMatchObject({ isError: true });
    expect(getCustomer).not.toHaveBeenCalled();
  });

  it("denies missing grants before SDK access", async () => {
    getCustomer.mockClear();
    const result = await handleGuardedToolCall("get_billing_summary", { customerId: 11 }, undefined, "test");
    expect(result).toMatchObject({ isError: true });
    expect(getCustomer).not.toHaveBeenCalled();
  });
});
