import type { getCustomer, getSubscription } from "@lemonsqueezy/lemonsqueezy.js";
import type { GuardedBillingReader } from "./guarded-tools.js";

/** A request-scoped reader avoids the Lemon Squeezy SDK's process-global API key. */
export function createMerchantReader(apiKey: string, apiFetch: typeof fetch = fetch): GuardedBillingReader {
  async function read(path: string): Promise<unknown> {
    const response = await apiFetch(`https://api.lemonsqueezy.com/v1/${path}`, {
      method: "GET",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!response.ok) throw new Error("Merchant read failed");
    return { error: null, data: await response.json() };
  }
  return {
    getCustomer: ((id: number) => read(`customers/${id}`)) as typeof getCustomer,
    getSubscription: ((id: number) => read(`subscriptions/${id}`)) as typeof getSubscription,
  };
}
