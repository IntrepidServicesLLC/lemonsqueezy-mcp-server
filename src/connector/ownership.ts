import { AuthorizationError, type ConnectorGrant } from "./grants.js";

export interface ReturnedResourceOwnership {
  storeId: unknown;
  customerId: unknown;
  testMode: unknown;
}

function parseId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

/** Check returned SDK ownership before projecting any guarded result. */
export function assertGuardedResourceOwnership(
  grant: ConnectorGrant,
  resource: ReturnedResourceOwnership,
): void {
  const storeId = parseId(resource.storeId);
  const customerId = parseId(resource.customerId);
  const scope = grant.customerScope;

  if (storeId === undefined || customerId === undefined ||
      storeId !== grant.storeId ||
      typeof resource.testMode !== "boolean" ||
      (grant.environment !== "test" && grant.environment !== "live") ||
      resource.testMode !== (grant.environment === "test") ||
      (scope.kind === "customer_ids" && !scope.ids.includes(customerId)) ||
      (scope.kind !== "customer_ids" && scope.kind !== "store_wide")) {
    throw new AuthorizationError();
  }
}
