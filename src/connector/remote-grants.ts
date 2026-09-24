import {
  authorizeToolCall,
  AuthorizationError,
  type ConnectorGrant,
  type TrustedGrantProvider,
} from "./grants.js";

/** A credential identity supplied by the trusted host verifier, never by MCP arguments. */
export interface RemoteIdentity {
  callerId: string;
  credentialId: string;
}

/**
 * The host owns credential verification, grant issuance and revocation, and
 * merchant key lookup. Every method is invoked for the current HTTP request.
 * Credential rotation is implemented by the verifier; no bearer secret is
 * stored in a grant or echoed to an MCP response.
 */
export interface RemoteGrantAuthority {
  verifyCredential(request: Request): Promise<unknown>;
  resolveGrant(identity: RemoteIdentity): Promise<unknown>;
  verifyGrant(grant: ConnectorGrant, identity: RemoteIdentity): Promise<boolean>;
  isRevoked(grantId: string): Promise<boolean>;
  resolveMerchantKey(environment: "test" | "live", storeId: number): Promise<string | undefined>;
}

export interface AuthorizedRemoteCall {
  identity: RemoteIdentity;
  grant: ConnectorGrant;
  /** Keep inside the host's request-scoped SDK client; never return through MCP. */
  merchantKey: string;
}

function parseIdentity(value: unknown): RemoteIdentity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AuthorizationError();
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 ||
      typeof record.callerId !== "string" || !record.callerId.trim() || record.callerId.trim() !== record.callerId ||
      typeof record.credentialId !== "string" || !record.credentialId.trim() || record.credentialId.trim() !== record.credentialId) {
    throw new AuthorizationError();
  }
  return { callerId: record.callerId, credentialId: record.credentialId };
}

/** Resolve fresh host authority before each remote tool invocation. */
export async function authorizeRemoteCall(
  authority: RemoteGrantAuthority | undefined,
  request: Request,
  expectedEnvironment: string,
  toolName: string,
  now: number = Date.now(),
): Promise<AuthorizedRemoteCall> {
  if (!authority || !(request instanceof Request) ||
      (expectedEnvironment !== "test" && expectedEnvironment !== "live")) {
    throw new AuthorizationError();
  }

  try {
    const identity = parseIdentity(await authority.verifyCredential(request));
    const provider: TrustedGrantProvider = {
      resolveGrant: () => authority.resolveGrant(identity),
      verifyGrant: (grant) => authority.verifyGrant(grant, identity),
      isRevoked: (grantId) => authority.isRevoked(grantId),
    };
    const grant = await authorizeToolCall(toolName, provider, expectedEnvironment, now);
    if (grant.actorId !== identity.callerId) throw new AuthorizationError();

    const merchantKey = await authority.resolveMerchantKey(grant.environment, grant.storeId);
    if (typeof merchantKey !== "string" || !merchantKey.trim() || merchantKey.trim() !== merchantKey) {
      throw new AuthorizationError();
    }
    return { identity, grant, merchantKey };
  } catch {
    // Host failures, malformed identities, and missing tenant config deny uniformly.
    throw new AuthorizationError();
  }
}
