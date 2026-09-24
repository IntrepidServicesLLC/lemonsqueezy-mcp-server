# Self-hosted remote guarded MCP

The remote entry point is `createRemoteGuardedRequestHandler({ authority, environment, apiFetch? })` in `dist/connector/remote-http.js` after building. It handles authenticated MCP Streamable HTTP requests at `/mcp`. It exposes the two read-only guarded billing tools, and each call obtains a fresh caller identity, grant, revocation result, and merchant key. It does not reuse the local operator's process-global Lemon Squeezy SDK key. The legacy `dist/index.js` stdio server remains a separate, broader trust boundary.

## Run the offline smoke

From a checkout, install and build, then run the ordinary MCP SDK client against a local HTTP server and fake Lemon Squeezy response:

```bash
npm ci
npm run build
npx tsx examples/remote-guarded/smoke.ts
```

The script starts a loopback server with an in-memory test-mode grant, initializes a Streamable HTTP client, lists tools, calls a permitted billing read, denies another customer and an unlisted write tool, rotates the caller credential, and revokes the grant. Its merchant request is intercepted by an in-process fake. It needs no account, secret, external network, or hosted service. It establishes **code-tested** behavior only.

## Try a real Lemon Squeezy test key locally

Set the following environment variables in your local secret injection mechanism. Use a test-mode key and a customer in the named store. Keep the bearer token separate from the Lemon Squeezy key; the client receives only the bearer token.

| Variable | Used by | Meaning |
| --- | --- | --- |
| `LEMONSQUEEZY_TEST_API_KEY` | host | Test-mode merchant key. Never send to the MCP client. |
| `REMOTE_DEMO_BEARER_TOKEN` | host and client | Opaque caller credential. Generate a high-entropy value and store it as a secret. |
| `REMOTE_DEMO_STORE_ID` | host | Positive store ID bound into the grant. |
| `REMOTE_DEMO_CUSTOMER_ID` | host and client | Positive customer ID in that store. |
| `REMOTE_DEMO_PORT` | host | Optional loopback port, default `3000`. |
| `REMOTE_MCP_URL` | client | Optional endpoint, default `http://127.0.0.1:3000/mcp`. |

In separate terminals with the same client-facing token and customer ID:

```bash
npx tsx examples/remote-guarded/serve.ts
npx tsx examples/remote-guarded/client.ts
```

`serve.ts` binds only `127.0.0.1` and requires every value above except the optional port. It never prints the key or bearer token. The client prints only a success marker, not customer data. This is a local integration check when run with a real test key, **not hosted verification**. No real test-mode key was available for this repository's offline checks, so this path has not been claimed as live-verified.

## Host it for delegated callers

The [host example](../examples/remote-guarded/host.ts) exposes `createRemoteHost({ authority, environment, apiFetch? })`. Supply your own `RemoteGrantAuthority` implementation rather than the [single-caller fixture](../examples/remote-guarded/authority.ts). Its hooks are:

- `verifyCredential(request)` authenticates the incoming caller and returns a stable `callerId` plus the accepted credential version ID. Reject missing, expired, or superseded credentials.
- `resolveGrant(identity)` reads the host-issued grant for that caller. The issuer must bind exact tool names, one store, customer scope, environment, and expiry to the authenticated actor.
- `verifyGrant(grant, identity)` confirms the grant is authentic and still belongs to that caller. Do not trust a grant or store ID supplied in MCP arguments.
- `isRevoked(grantId)` reads current revocation state on every call. Make an unavailable revocation store a denial, not an allow.
- `resolveMerchantKey(environment, storeId)` reads the matching merchant key from a secret manager or equivalent protected storage. Keep test and live key namespaces separate; never fall back from test to live.

Create the server with `createRemoteHost`, bind it to a private interface or loopback, and expose `/mcp` through an HTTPS reverse proxy with a valid certificate. The proxy should forward the `Authorization` header and MCP protocol headers intact, set request size and time limits, and restrict access to the intended callers. Keep the HTTP backend private. Do not expose `serve.ts` directly to the Internet: its in-memory issuer and revocation state are a demonstration, with no durable multi-user administration or audit trail. This repository does not provision a cloud host, TLS certificate, identity provider, grant database, or secret manager.

For credential rotation, provision the replacement in the issuer/verifier, switch callers, then reject the old credential. For grant revocation, mark the grant ID revoked in the durable store before considering access removed; do not rely on a client reconnect. For merchant key rotation, update only the secret entry for the exact environment and store, verify a test-mode read, then retire the old key. The remote handler resolves the key per call so the next request uses the updated entry.

## Verification levels and support

| Level | Evidence required |
| --- | --- |
| Code-tested | Offline smoke and repository contract checks pass. |
| Hosted-tested | Deployed HTTPS endpoint is reached by an ordinary remote MCP client; initialize, list, permitted call, denied call, rotation, and revocation are observed against the hosted verifier and grant store. |
| Live-verified | A real Lemon Squeezy test-mode key and owned test records return the expected scoped billing result through that hosted path. Record endpoint identity and time without recording credentials or customer payloads. |

Do not infer hosted or live status from green unit tests, an npm release, or a merged pull request. The sample supports test-mode reads; choose a separate, explicitly authorized deployment and verification plan before enabling live merchant keys. See [guarded connector setup](./GUARDED_CONNECTOR.md), the [tool catalog](./GUARDED_TOOL_CATALOG.md), and [support and security reporting](../SUPPORT.md). Report suspected access-control failures privately and omit tokens, merchant keys, grants, and customer records.
