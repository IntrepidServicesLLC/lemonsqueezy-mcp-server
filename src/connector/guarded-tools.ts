import { getCustomer, getSubscription } from "@lemonsqueezy/lemonsqueezy.js";
import { z } from "zod";
import { authorizeToolCall, AuthorizationError, type TrustedGrantProvider } from "./grants.js";
import { assertGuardedResourceOwnership } from "./ownership.js";
import { createErrorResponse, createResponse } from "../utils/response.js";

const idSchema = z.number().int().positive().safe();
const billingArgs = z.object({ customerId: idSchema }).strict();
const subscriptionArgs = z.object({ subscriptionId: idSchema }).strict();

export interface GuardedBillingReader {
  getCustomer: typeof getCustomer;
  getSubscription: typeof getSubscription;
}

const sdkReader: GuardedBillingReader = { getCustomer, getSubscription };

export const GUARDED_TOOLS = {
  GET_BILLING_SUMMARY: "get_billing_summary",
  GET_SUBSCRIPTION_STATUS: "get_subscription_status",
} as const;

export function getGuardedToolDefinitions() {
  return [
    {
      name: GUARDED_TOOLS.GET_BILLING_SUMMARY,
      description: "Read a customer's total revenue and monthly recurring revenue in USD cents.",
      inputSchema: {
        type: "object" as const,
        properties: { customerId: { type: "integer", minimum: 1 } },
        required: ["customerId"],
        additionalProperties: false,
      },
    },
    {
      name: GUARDED_TOOLS.GET_SUBSCRIPTION_STATUS,
      description: "Read a subscription's billing status and renewal or end date.",
      inputSchema: {
        type: "object" as const,
        properties: { subscriptionId: { type: "integer", minimum: 1 } },
        required: ["subscriptionId"],
        additionalProperties: false,
      },
    },
  ];
}

/** Tool discovery also fails closed when the host grant is absent or invalid. */
export async function getAuthorizedGuardedToolDefinitions(
  provider: TrustedGrantProvider | undefined,
  expectedEnvironment: "test" | "live",
) {
  const permitted = [];
  for (const definition of getGuardedToolDefinitions()) {
    try {
      await authorizeToolCall(definition.name, provider, expectedEnvironment);
      permitted.push(definition);
    } catch {
      // A denied name is not advertised. No SDK access occurs during discovery.
    }
  }
  return permitted;
}

const customerAttributes = z.object({
  store_id: idSchema,
  test_mode: z.boolean(),
  total_revenue_currency: z.number().int().nonnegative().safe(),
  mrr: z.number().int().nonnegative().safe(),
});

const subscriptionAttributes = z.object({
  store_id: idSchema,
  customer_id: idSchema,
  test_mode: z.boolean(),
  status: z.string().min(1),
  renews_at: z.string().nullable(),
  ends_at: z.string().nullable(),
});

function parseReturnedId(value: unknown, requestedId: number): number {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new AuthorizationError();
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id !== requestedId) throw new AuthorizationError();
  return id;
}

/** This dispatcher is reachable only through the guarded server factory. */
export async function handleGuardedToolCall(
  name: string,
  args: unknown,
  provider: TrustedGrantProvider | undefined,
  expectedEnvironment: "test" | "live",
  reader: GuardedBillingReader = sdkReader,
) {
  try {
    // Tool discovery is not an authorization boundary. Deny unlisted names here.
    if (name === GUARDED_TOOLS.GET_BILLING_SUMMARY) {
      const { customerId } = billingArgs.parse(args);
      const grant = await authorizeToolCall(name, provider, expectedEnvironment);
      if (grant.customerScope.kind === "customer_ids" && !grant.customerScope.ids.includes(customerId)) {
        throw new AuthorizationError();
      }
      const result = await reader.getCustomer(customerId);
      if (result.error || !result.data) throw new AuthorizationError();
      const attributes = customerAttributes.parse(result.data.data.attributes);
      const returnedCustomerId = parseReturnedId(result.data.data.id, customerId);
      assertGuardedResourceOwnership(grant, {
        storeId: attributes.store_id,
        customerId: returnedCustomerId,
        testMode: attributes.test_mode,
      });
      return createResponse({
        customerId: returnedCustomerId,
        storeId: attributes.store_id,
        currency: "USD",
        totalRevenueCents: attributes.total_revenue_currency,
        monthlyRecurringRevenueCents: attributes.mrr,
        testMode: attributes.test_mode,
      });
    }

    if (name === GUARDED_TOOLS.GET_SUBSCRIPTION_STATUS) {
      const { subscriptionId } = subscriptionArgs.parse(args);
      const grant = await authorizeToolCall(name, provider, expectedEnvironment);
      const result = await reader.getSubscription(subscriptionId);
      if (result.error || !result.data) throw new AuthorizationError();
      const attributes = subscriptionAttributes.parse(result.data.data.attributes);
      const returnedSubscriptionId = parseReturnedId(result.data.data.id, subscriptionId);
      assertGuardedResourceOwnership(grant, {
        storeId: attributes.store_id,
        customerId: attributes.customer_id,
        testMode: attributes.test_mode,
      });
      return createResponse({
        subscriptionId: returnedSubscriptionId,
        customerId: attributes.customer_id,
        storeId: attributes.store_id,
        status: attributes.status,
        renewsAt: attributes.renews_at,
        endsAt: attributes.ends_at,
        testMode: attributes.test_mode,
      });
    }

    throw new AuthorizationError();
  } catch {
    // Do not expose SDK errors, identifiers, or grant details to an untrusted caller.
    return createErrorResponse(new AuthorizationError());
  }
}
