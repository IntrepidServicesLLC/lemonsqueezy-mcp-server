import type { IncomingMessage, ServerResponse } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { authorizeRemoteCall, type RemoteGrantAuthority } from "./remote-grants.js";
import { getGuardedToolDefinitions, handleGuardedToolCall } from "./guarded-tools.js";
import { createMerchantReader } from "./merchant-reader.js";
import { AuthorizationError, type ConnectorGrant, type TrustedGrantProvider } from "./grants.js";

export interface RemoteGuardedOptions {
  authority: RemoteGrantAuthority;
  environment: "test" | "live";
  /** Exact browser origins, when browser clients are intended. Omit for non-browser clients. */
  trustedOrigins?: string[];
  /** Test seam for the merchant HTTP API. Production uses the built-in fetch. */
  apiFetch?: typeof fetch;
}

function credentialRequest(req: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  return new Request("http://localhost/mcp", { headers });
}

function grantedProvider(grant: ConnectorGrant): TrustedGrantProvider {
  return {
    resolveGrant: async () => grant,
    verifyGrant: async () => true,
    isRevoked: async () => false,
  };
}

/**
 * Attach this handler to a merchant-owned Node HTTP server behind TLS.
 * Every HTTP request gets its own stateless MCP server, credential check, grant
 * check, and merchant reader. No principal or key is retained in a session.
 */
export function createRemoteGuardedRequestHandler(options: RemoteGuardedOptions) {
  if (!options.authority || (options.environment !== "test" && options.environment !== "live")) {
    throw new Error("Remote guarded host requires an authority and environment");
  }
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (req.url?.split("?", 1)[0] !== "/mcp") {
      res.writeHead(404).end();
      return;
    }
    const origin = req.headers.origin;
    if (origin && !options.trustedOrigins?.includes(origin)) {
      res.writeHead(403).end();
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" }).end();
      return;
    }

    const credential = credentialRequest(req);
    try {
      const permitted: ReturnType<typeof getGuardedToolDefinitions> = [];
      for (const definition of getGuardedToolDefinitions()) {
        try {
          await authorizeRemoteCall(options.authority, credential, options.environment, definition.name);
          permitted.push(definition);
        } catch {
          // A denied tool is invisible during discovery.
        }
      }
      if (permitted.length === 0) throw new AuthorizationError();

      const server = new Server(
        { name: "lemonsqueezy-remote-guarded", version: "1.0.4" },
        { capabilities: { tools: {} } },
      );
      server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: permitted }));
      server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        try {
          const authorized = await authorizeRemoteCall(options.authority, credential, options.environment, name);
          return handleGuardedToolCall(
            name,
            request.params.arguments,
            grantedProvider(authorized.grant),
            options.environment,
            createMerchantReader(authorized.merchantKey, options.apiFetch),
          );
        } catch {
          return { content: [{ type: "text", text: "Error: Access denied" }], isError: true };
        }
      });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      try {
        await transport.handleRequest(req, res);
      } finally {
        await server.close();
      }
    } catch {
      if (!res.headersSent) res.writeHead(401).end();
      else if (!res.writableEnded) res.end();
    }
  };
}
