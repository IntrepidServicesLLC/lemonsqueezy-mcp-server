/**
 * A grant is supplied by the trusted host, never by MCP tool arguments.
 * The host owns grant issuance, authenticity checks, and revocation state.
 */
export interface ConnectorGrant {
  grantId: string;
  actorId: string;
  environment: "test" | "live";
  storeId: number;
  customerScope:
    | { kind: "store_wide" }
    | { kind: "customer_ids"; ids: number[] };
  toolNames: string[];
  expiresAt: string;
}

export interface TrustedGrantProvider {
  resolveGrant(): Promise<unknown>;
  verifyGrant(grant: ConnectorGrant): Promise<boolean>;
  isRevoked(grantId: string): Promise<boolean>;
}

export class AuthorizationError extends Error {
  constructor() {
    super("Access denied");
    this.name = "AuthorizationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}

function isPositiveId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function isEnvironment(value: unknown): value is ConnectorGrant["environment"] {
  return value === "test" || value === "live";
}

function parseGrant(value: unknown): ConnectorGrant {
  if (!isRecord(value)) throw new AuthorizationError();
  const fields = ["grantId", "actorId", "environment", "storeId", "customerScope", "toolNames", "expiresAt"];
  if (Object.keys(value).length !== fields.length || fields.some((field) => !Object.hasOwn(value, field))) {
    throw new AuthorizationError();
  }
  const { grantId, actorId, environment, storeId, customerScope, toolNames, expiresAt } = value;
  if (!isNonemptyString(grantId) || !isNonemptyString(actorId) ||
      !isEnvironment(environment) || !isPositiveId(storeId)) {
    throw new AuthorizationError();
  }
  if (!isRecord(customerScope)) throw new AuthorizationError();

  let scope: ConnectorGrant["customerScope"];
  if (customerScope.kind === "store_wide") {
    if (Object.keys(customerScope).length !== 1) throw new AuthorizationError();
    scope = { kind: "store_wide" };
  } else if (customerScope.kind === "customer_ids") {
    if (Object.keys(customerScope).length !== 2 ||
        !Array.isArray(customerScope.ids) || customerScope.ids.length === 0 ||
        !customerScope.ids.every(isPositiveId) ||
        new Set(customerScope.ids).size !== customerScope.ids.length) {
      throw new AuthorizationError();
    }
    scope = { kind: "customer_ids", ids: [...customerScope.ids] };
  } else {
    throw new AuthorizationError();
  }

  if (!Array.isArray(toolNames) || toolNames.length === 0 ||
      !toolNames.every(isNonemptyString) || new Set(toolNames).size !== toolNames.length ||
      toolNames.includes("*")) {
    throw new AuthorizationError();
  }
  if (typeof expiresAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiresAt) ||
      !Number.isFinite(Date.parse(expiresAt)) ||
      new Date(expiresAt).toISOString() !== expiresAt) {
    throw new AuthorizationError();
  }

  return {
    grantId,
    actorId,
    environment,
    storeId,
    customerScope: scope,
    toolNames: [...toolNames],
    expiresAt,
  };
}

/** Call for every guarded invocation before dispatching to an SDK handler. */
export async function authorizeToolCall(
  name: string,
  provider: TrustedGrantProvider | undefined,
  expectedEnvironment: string,
  now: number = Date.now(),
): Promise<ConnectorGrant> {
  if (!provider || !isEnvironment(expectedEnvironment) ||
      !Number.isFinite(now) || !isNonemptyString(name)) {
    throw new AuthorizationError();
  }

  try {
    const grant = parseGrant(await provider.resolveGrant());
    if (grant.environment !== expectedEnvironment ||
        Date.parse(grant.expiresAt) <= now ||
        !grant.toolNames.includes(name) ||
        await provider.verifyGrant(grant) !== true ||
        await provider.isRevoked(grant.grantId) !== false) {
      throw new AuthorizationError();
    }
    return grant;
  } catch {
    // Host errors and malformed grants both fail closed without exposing grant details.
    throw new AuthorizationError();
  }
}
