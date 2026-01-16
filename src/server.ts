import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { config } from "./config.js";

export function createServer() {
  return new Server(
    {
      name: "lemonsqueezy-antigravity-bridge",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: config.enableResources ? {} : undefined,
      },
    }
  );
}
