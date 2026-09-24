import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ConnectorGrant } from "./grants.js";
import type { RemoteGrantAuthority } from "./remote-grants.js";
import { createRemoteGuardedRequestHandler } from "./remote-http.js";

const grant: ConnectorGrant = {
  grantId: "g1", actorId: "alice", environment: "test", storeId: 12,
  customerScope: { kind: "customer_ids", ids: [21] },
  toolNames: ["get_billing_summary"], expiresAt: "2099-01-01T00:00:00.000Z",
};

describe("remote guarded Streamable HTTP", () => {
  let server: HttpServer | undefined;
  const clients: Client[] = [];
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
    if (server) { await new Promise<void>((resolve) => server!.close(() => resolve())); server = undefined; }
  });

  it("authenticates each request, lists only granted reads, and denies cross-customer and write calls", async () => {
    let revoked = false;
    const authority: RemoteGrantAuthority = {
      verifyCredential: async (request) => request.headers.get("authorization") === "Bearer alice" ?
        { callerId: "alice", credentialId: "key1" } : null,
      resolveGrant: async () => grant,
      verifyGrant: async () => true,
      isRevoked: async () => revoked,
      resolveMerchantKey: async () => "merchant-test-key",
    };
    const apiFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: "Bearer merchant-test-key" });
      const id = String(_url).split("/").pop();
      return new Response(JSON.stringify({ data: { id, attributes: {
        store_id: 12, test_mode: true, total_revenue_currency: 100, mrr: 20,
      } } }), { status: 200 });
    }) as unknown as typeof fetch;
    server = createServer((req, res) => { void createRemoteGuardedRequestHandler({ authority, environment: "test", apiFetch })(req, res); });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    const url = new URL(`http://127.0.0.1:${address.port}/mcp`);

    const unauthenticated = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect(unauthenticated.status).toBe(401);
    const secondCaller = await fetch(url, { method: "POST", headers: { authorization: "Bearer bob", "content-type": "application/json" }, body: "{}" });
    expect(secondCaller.status).toBe(401);

    const client = new Client({ name: "ordinary-test-client", version: "1.0.0" });
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: "Bearer alice" } } }));
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual(["get_billing_summary"]);
    const allowed = await client.callTool({ name: "get_billing_summary", arguments: { customerId: 21 } });
    expect(allowed.isError).toBeFalsy();
    expect(JSON.stringify(allowed.content)).toContain("totalRevenueCents");
    expect(JSON.stringify(allowed.content)).not.toContain("merchant-test-key");
    await expect(client.listResources()).rejects.toThrow();
    const deniedWrite = await client.callTool({ name: "create_order", arguments: {} });
    expect(deniedWrite.isError).toBe(true);
    const wrongCustomer = await client.callTool({ name: "get_billing_summary", arguments: { customerId: 22 } });
    expect(wrongCustomer.isError).toBe(true);
    revoked = true;
    await expect(client.listTools()).rejects.toThrow();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("isolates two valid callers and their merchant keys in the same listener", async () => {
    let aliceKey = "merchant-12";
    const grants: Record<string, ConnectorGrant> = {
      alice: grant,
      bob: { ...grant, grantId: "g2", actorId: "bob", storeId: 99,
        customerScope: { kind: "customer_ids", ids: [31] } },
    };
    const authority: RemoteGrantAuthority = {
      verifyCredential: async (request) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        return token && grants[token] ? { callerId: token, credentialId: token } : null;
      },
      resolveGrant: async (identity) => grants[identity.callerId],
      verifyGrant: async (candidate, identity) => candidate.actorId === identity.callerId,
      isRevoked: async () => false,
      resolveMerchantKey: async (_environment, storeId) => storeId === 12 ? aliceKey : `merchant-${storeId}`,
    };
    const keys: string[] = [];
    const apiFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const key = (init?.headers as Record<string, string>).Authorization;
      keys.push(key);
      const id = String(_url).split("/").pop();
      return new Response(JSON.stringify({ data: { id, attributes: {
        store_id: key.startsWith("Bearer merchant-12") ? 12 : 99,
        test_mode: true, total_revenue_currency: 100, mrr: 20,
      } } }), { status: 200 });
    }) as unknown as typeof fetch;
    const handler = createRemoteGuardedRequestHandler({ authority, environment: "test", apiFetch });
    server = createServer((req, res) => { void handler(req, res); });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No port");
    const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
    const alice = new Client({ name: "alice-client", version: "1.0.0" });
    const bob = new Client({ name: "bob-client", version: "1.0.0" });
    clients.push(alice, bob);
    await alice.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: "Bearer alice" } } }));
    await bob.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: "Bearer bob" } } }));
    expect((await alice.callTool({ name: "get_billing_summary", arguments: { customerId: 21 } })).isError).toBeFalsy();
    expect((await bob.callTool({ name: "get_billing_summary", arguments: { customerId: 31 } })).isError).toBeFalsy();
    expect((await bob.callTool({ name: "get_billing_summary", arguments: { customerId: 21 } })).isError).toBe(true);
    aliceKey = "merchant-12-rotated";
    expect((await alice.callTool({ name: "get_billing_summary", arguments: { customerId: 21 } })).isError).toBeFalsy();
    expect(keys).toEqual(["Bearer merchant-12", "Bearer merchant-99", "Bearer merchant-12-rotated"]);
  });
});
