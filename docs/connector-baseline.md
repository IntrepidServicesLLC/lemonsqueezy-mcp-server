# Connector baseline for LSMCP-3

This is the source inventory at `5e8b781` before the guarded read-only changes. It is a map for review, not a claim about a deployed connector.

| Boundary | Current behavior | Source |
| --- | --- | --- |
| Transport | MCP server connects through stdio. Tool listing and calls are registered at startup. | `src/index.ts`, `src/server.ts` |
| Tool surface | 53 tools are returned by `getToolDefinitions()` without a read-only filter. Calls route through `handleToolCall()`, then Zod validation and handlers. | `src/tools/definitions.ts`, `src/tools/index.ts`, `src/utils/validation.ts` |
| Lemon Squeezy reads | Store, customer, product, variant, order, order item, subscription, subscription item, subscription invoice, discount, license key, file, usage record, and webhook get/list/search operations; analytics and VOS reads. | `src/tools/definitions.ts`, `src/tools/handlers/` |
| Lemon Squeezy writes or side effects | Customer create/update/archive; order invoice generation/refund; subscription update/cancel; subscription invoice generation/refund; discount create/delete; license key update; usage record and checkout create; webhook create/update/delete. Salesforce sync and VOS decision canonization are also side-effecting tools. | `src/tools/definitions.ts`, `src/tools/index.ts` |
| Webhook listener | `ENABLE_RESOURCES=true` enables the payment-context MCP resource and starts a Fastify listener. `ENABLE_NGROK=true` may expose it. A webhook log watcher and failed-payment polling may also run under resource options. | `src/index.ts`, `src/webhooks/listener.ts`, `src/resources/payment-context.ts` |
| Credentials | Config selects a live Lemon Squeezy key before a test key, with legacy aliases. Importing `src/config.ts` loads local `.env` and initializes the SDK. | `src/config.ts` |
| Optional connections | Salesforce, Firebase, AWS Secrets Manager, and ngrok behavior are configured through environment variables. | `src/config.ts`, `src/connections/`, `src/utils/secrets/` |

## Offline verification

The required commands and order are in `.agent-test-contract.yaml`. On a fresh checkout, run `npm ci` from the repository root, then the focused config tests, build, and full suite. The config tests mock dotenv and the Lemon Squeezy SDK, so no live key, API call, webhook listener, or external service is needed. The build compiles source but does not start the server.
