import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { TrustedGrantProvider } from "./grants.js";
import { getAuthorizedGuardedToolDefinitions, handleGuardedToolCall } from "./guarded-tools.js";

/** The trusted host supplies the grant provider and environment outside MCP arguments. */
export function createGuardedServer(
  provider: TrustedGrantProvider | undefined,
  expectedEnvironment: "test" | "live",
) {
  const server = new Server(
    { name: "lemonsqueezy-guarded-connector", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: await getAuthorizedGuardedToolDefinitions(provider, expectedEnvironment),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleGuardedToolCall(name, args, provider, expectedEnvironment);
  });
  return server;
}
