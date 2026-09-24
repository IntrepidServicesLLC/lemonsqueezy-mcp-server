import { createExampleHost } from "./host.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() !== value) throw new Error(`Set ${name}`);
  return value;
}

function positiveId(name: string): number {
  const raw = required(name);
  if (!/^[1-9]\d*$/.test(raw)) throw new Error(`Set ${name} to a positive integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new Error(`Set ${name} to a safe integer`);
  return value;
}

const portRaw = process.env.REMOTE_DEMO_PORT ?? "3000";
if (!/^\d+$/.test(portRaw) || Number(portRaw) > 65535) throw new Error("Invalid REMOTE_DEMO_PORT");

const host = createExampleHost({
  bearerToken: required("REMOTE_DEMO_BEARER_TOKEN"),
  merchantKey: required("LEMONSQUEEZY_TEST_API_KEY"),
  storeId: positiveId("REMOTE_DEMO_STORE_ID"),
  customerId: positiveId("REMOTE_DEMO_CUSTOMER_ID"),
});

host.server.listen(Number(portRaw), "127.0.0.1", () => {
  const address = host.server.address();
  if (!address || typeof address === "string") throw new Error("Unexpected listen address");
  process.stdout.write(`Test-mode MCP listening at http://127.0.0.1:${address.port}/mcp\n`);
});
