import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = new URL(process.env.REMOTE_MCP_URL ?? "http://127.0.0.1:3000/mcp");
if (endpoint.protocol !== "https:" &&
    !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname))) {
  throw new Error("Use HTTPS outside loopback");
}
const token = process.env.REMOTE_DEMO_BEARER_TOKEN;
const customerId = Number(process.env.REMOTE_DEMO_CUSTOMER_ID);
if (!token || !Number.isSafeInteger(customerId) || customerId <= 0) {
  throw new Error("Set REMOTE_DEMO_BEARER_TOKEN and REMOTE_DEMO_CUSTOMER_ID");
}

const client = new Client({ name: "remote-guarded-test-client", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(endpoint, {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
try {
  await client.connect(transport);
  const names = (await client.listTools()).tools.map((tool) => tool.name);
  if (!names.includes("get_billing_summary") || names.some((name) => name.includes("refund"))) {
    throw new Error("Unexpected tool catalog");
  }
  const result = await client.callTool({ name: "get_billing_summary", arguments: { customerId } });
  if (result.isError) throw new Error("Test-mode billing call was denied");
  process.stdout.write("Remote MCP initialize, list, and test-mode billing call succeeded.\n");
} finally {
  await client.close();
}
