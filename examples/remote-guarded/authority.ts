import { createHash, timingSafeEqual } from "node:crypto";
import type { ConnectorGrant } from "../../dist/connector/grants.js";
import type { RemoteGrantAuthority, RemoteIdentity } from "../../dist/connector/remote-grants.js";

/** A single-caller, test-mode fixture. Replace every callback for a real host. */
export function createExampleAuthority(options: {
  bearerToken: string;
  merchantKey: string;
  storeId: number;
  customerId: number;
}) {
  if (!options.bearerToken || !options.merchantKey ||
      !Number.isSafeInteger(options.storeId) || options.storeId <= 0 ||
      !Number.isSafeInteger(options.customerId) || options.customerId <= 0) {
    throw new Error("Missing example authority configuration");
  }

  let activeTokenHash = digest(options.bearerToken);
  let credentialVersion = 1;
  let revoked = false;
  const grant: ConnectorGrant = {
    grantId: "local-demo-grant",
    actorId: "local-demo-caller",
    environment: "test",
    storeId: options.storeId,
    customerScope: { kind: "customer_ids", ids: [options.customerId] },
    toolNames: ["get_billing_summary", "get_subscription_status"],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  const authority: RemoteGrantAuthority = {
    async verifyCredential(request) {
      const match = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "");
      if (!match || !timingSafeEqual(digest(match[1]), activeTokenHash)) return null;
      return { callerId: grant.actorId, credentialId: `local-demo-v${credentialVersion}` };
    },
    async resolveGrant(identity: RemoteIdentity) {
      return identity.callerId === grant.actorId ? grant : null;
    },
    async verifyGrant(candidate: ConnectorGrant, identity: RemoteIdentity) {
      return identity.callerId === grant.actorId &&
        candidate.grantId === grant.grantId &&
        candidate.actorId === grant.actorId &&
        candidate.environment === grant.environment &&
        candidate.storeId === grant.storeId &&
        candidate.expiresAt === grant.expiresAt &&
        JSON.stringify(candidate.customerScope) === JSON.stringify(grant.customerScope) &&
        JSON.stringify(candidate.toolNames) === JSON.stringify(grant.toolNames);
    },
    async isRevoked(grantId: string) {
      return grantId !== grant.grantId || revoked;
    },
    async resolveMerchantKey(environment, storeId) {
      return environment === "test" && storeId === grant.storeId ? options.merchantKey : undefined;
    },
  };

  return {
    authority,
    revoke() { revoked = true; },
    rotateCredential(newToken: string) {
      if (!newToken) throw new Error("Missing replacement credential");
      activeTokenHash = digest(newToken);
      credentialVersion += 1;
    },
  };
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
