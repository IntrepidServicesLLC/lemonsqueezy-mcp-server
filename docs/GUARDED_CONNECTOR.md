# Guarded connector setup

## Choose the entry point

`src/index.ts` (`dist/index.js` after build) is the trusted local operator server. Its legacy catalog includes write tools and optional resource behavior. Use it only when the merchant controls the local MCP client and accepts that authority.

Delegated access uses the programmatic `createGuardedServer(provider, expectedEnvironment)` factory in `src/connector/guarded-server.ts`. A trusted host must integrate that server with its own transport and supply the grant provider. There is no guarded drop-in command or hosted identity provider in this repository. The guarded server has no resources or legacy write tools.

When using the published npm package, import the factory from `lemonsqueezy-mcp-server/dist/connector/guarded-server.js` and the `TrustedGrantProvider` type from `lemonsqueezy-mcp-server/dist/connector/grants.js`. The host constructs the provider and connects the returned MCP server to its transport; the package does not choose or start a remote transport for you.

## Key custody and environment

The merchant or its trusted host owns the Lemon Squeezy API key. Keep it in the host's secret storage; never pass it in MCP tool arguments, a grant, a browser, or a customer-facing client. The host must initialize the Lemon Squeezy SDK with a key matching `expectedEnvironment`, which is exactly `test` or `live`. Run one key and one environment per process. The local operator config prefers a live key when both live and test variables are set, so setting both does not provide test/live isolation.

## Grant contract

The host injects a `TrustedGrantProvider` outside the MCP request. Its `resolveGrant()` returns a grant, `verifyGrant()` confirms that the host issued and trusts it, and `isRevoked()` checks current revocation state. These are provider-neutral interfaces. The repository does not choose an identity provider, signature format, or grant store.

A grant names `grantId`, `actorId`, `environment`, one positive `storeId`, a nonempty exact `toolNames` list, and a canonical UTC `expiresAt` timestamp. `customerScope` is either `{ kind: "customer_ids", ids: [11] }` with positive customer IDs or the explicit `{ kind: "store_wide" }` marker. Store-wide access is never inferred from a missing or empty customer set. The host must bind grant issuance to an authenticated actor and trusted environment; MCP arguments cannot alter the grant's store, customer, or tool permissions.

The guarded server advertises only grant-permitted tools. It checks the grant again on every call. Missing, malformed, untrusted, expired, revoked, wrong-environment, or wrong-tool grants are denied before any Lemon Squeezy API call. A returned record must match the grant's store, customer scope, and test/live environment before a result is sent to the caller. Hidden tool names, extra arguments, inaccessible records, and malformed SDK responses return `Access denied`. See the [tool catalog](./GUARDED_TOOL_CATALOG.md) for exact arguments and returned fields.

## No-secret test-mode example and verification

From the repository root, run:

```bash
npm ci
npm test -- src/examples/guarded-flow.test.ts
```

The [example fixture](../src/examples/guarded-flow.test.ts) mocks the Lemon Squeezy SDK. It demonstrates an allowed test-mode billing summary, a cross-customer denial, and a hidden refund-tool denial. It needs no account or maintainer key and makes no network request. For repository verification, follow `.agent-test-contract.yaml`: run its focused auth test, build, and full suite in order. These offline checks do not establish behavior against a live merchant account.

For integration questions or a suspected security defect, follow [support and security reporting](../SUPPORT.md). Do not include API keys, grant values, or customer records in a public issue.
