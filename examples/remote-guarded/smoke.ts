import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createExampleHost } from "./host.js";

const merchantKey = "offline-fixture-merchant-key";
const storeId = 42;
const customerId = 7;
const firstToken = randomBytes(32).toString("hex");
const secondToken = randomBytes(32).toString("hex");
let merchantReads = 0;

const apiFetch: typeof fetch = async (input, init) => {
  const url = String(input);
  assert.equal(url, `https://api.lemonsqueezy.com/v1/customers/${customerId}`);
  assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${merchantKey}`);
  merchantReads += 1;
  return new Response(JSON.stringify({
    data: {
      type: "customers",
      id: String(customerId),
      attributes: {
        store_id: storeId,
        test_mode: true,
        total_revenue_currency: 1200,
        mrr: 300,
      },
    },
  }), { status: 200, headers: { "content-type": "application/vnd.api+json" } });
};

const host = createExampleHost({ bearerToken: firstToken, merchantKey, storeId, customerId, apiFetch });
host.server.listen(0, "127.0.0.1");
await once(host.server, "listening");
const address = host.server.address();
assert(address && typeof address !== "string");
const endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);

async function connect(token: string) {
  const client = new Client({ name: "remote-guarded-offline-smoke", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  await client.connect(transport);
  return client;
}

async function expectDenied(action: () => Promise<unknown>) {
  try {
    const result = await action();
    assert.match(JSON.stringify(result), /Access denied|Unauthorized/i);
  } catch (error) {
    // The SDK omits the response body for an HTTP 401 from this transport.
    assert.match(String(error), /Access denied|Unauthorized|401|403|Streamable HTTP error/i);
  }
}

let first: Client | undefined;
let second: Client | undefined;
try {
  first = await connect(firstToken);
  const listed = await first.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ["get_billing_summary", "get_subscription_status"]);
  const allowed = await first.callTool({ name: "get_billing_summary", arguments: { customerId } });
  assert(Array.isArray(allowed.content));
  const payload = allowed.content.find((item) => item.type === "text");
  assert(payload && payload.type === "text");
  assert.equal(JSON.parse(payload.text).customerId, customerId);
  assert.equal(merchantReads, 1);

  await expectDenied(() => first!.callTool({ name: "get_billing_summary", arguments: { customerId: 8 } }));
  await expectDenied(() => first!.callTool({ name: "refund_order", arguments: { orderId: 1 } }));
  assert.equal(merchantReads, 1);

  host.rotateCredential(secondToken);
  await expectDenied(() => first!.callTool({ name: "get_billing_summary", arguments: { customerId } }));
  second = await connect(secondToken);
  await second.callTool({ name: "get_billing_summary", arguments: { customerId } });
  assert.equal(merchantReads, 2);

  host.revoke();
  await expectDenied(() => second!.callTool({ name: "get_billing_summary", arguments: { customerId } }));
  assert.equal(merchantReads, 2);
  process.stdout.write("Offline remote MCP smoke passed: initialize, list, call, deny, rotate, revoke.\n");
} finally {
  await Promise.allSettled([first?.close(), second?.close()]);
  await new Promise<void>((resolve, reject) => host.server.close((error) => error ? reject(error) : resolve()));
}
