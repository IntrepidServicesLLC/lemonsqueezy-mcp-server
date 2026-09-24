import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createGuardedServer } from "./guarded-server.js";
import type { TrustedGrantProvider } from "./grants.js";

const grant = {
  grantId: "grant-1", actorId: "actor-1", environment: "test", storeId: 7,
  customerScope: { kind: "customer_ids", ids: [11] },
  toolNames: ["get_billing_summary"],
  expiresAt: "2999-01-01T00:00:00.000Z",
};

const provider: TrustedGrantProvider = {
  resolveGrant: async () => grant,
  verifyGrant: async () => true,
  isRevoked: async () => false,
};

async function withClient(
  hostProvider: TrustedGrantProvider | undefined,
  run: (client: Client) => Promise<void>,
) {
  const server = createGuardedServer(hostProvider, "test");
  const client = new Client({ name: "guarded-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

describe("guarded MCP server protocol", () => {
  it("filters tools/list by the trusted grant and denies hidden tools/call", async () => {
    await withClient(provider, async (client) => {
      expect((await client.listTools()).tools.map((tool) => tool.name))
        .toEqual(["get_billing_summary"]);
      const hidden = await client.callTool({ name: "issue_order_refund", arguments: { orderId: 1, amount: 100 } });
      expect(hidden).toMatchObject({ isError: true });
    });
  });

  it("returns no advertised tools for a missing grant", async () => {
    await withClient(undefined, async (client) => {
      expect((await client.listTools()).tools).toEqual([]);
      const result = await client.callTool({ name: "get_billing_summary", arguments: { customerId: 11 } });
      expect(result).toMatchObject({ isError: true });
    });
  });
});
