# Guarded read tools

The guarded connector is created by a trusted host through `createGuardedServer(provider, expectedEnvironment)` in `src/connector/guarded-server.ts`. The host injects the grant provider and `test` or `live` environment outside MCP tool arguments. This factory exposes no resources. The existing stdio entry in `src/index.ts` is the explicit trusted local operator interface and retains its full legacy catalog.

`tools/list` on a guarded server advertises only the subset of these two tools permitted by a current trusted grant. With a missing, expired, or revoked grant it advertises no tools. The server also checks the same allowlist on every `tools/call`, then validates a trusted grant before any Lemon Squeezy API request. Hidden legacy tool names fail even if requested directly.

| Tool | Exact input | Result fields |
| --- | --- | --- |
| `get_billing_summary` | `{ "customerId": positive integer }` | `customerId`, `storeId`, `currency` (`USD`), `totalRevenueCents`, `monthlyRecurringRevenueCents`, `testMode` |
| `get_subscription_status` | `{ "subscriptionId": positive integer }` | `subscriptionId`, `customerId`, `storeId`, `status`, `renewsAt`, `endsAt`, `testMode` |

Additional input fields are rejected. The returned customer or subscription must match the requested ID, the trusted grant's store and customer scope, and its environment before projection. A missing or invalid grant, inaccessible record, or malformed response returns `Access denied`. The result is built from an explicit field list. Email, card data, credentials, raw record collections, relationships, and signed portal URLs are never returned.
