#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import { config } from "./config.js";
import { getToolDefinitions } from "./tools/definitions.js";
import { handleToolCall } from "./tools/index.js";
import {
  setupPaymentContextWatcher,
  setupFailedPaymentPolling,
  getPaymentContextResource,
} from "./resources/payment-context.js";
import { startWebhookServer, getWebhookUrl } from "./webhooks/listener.js";
import { startNgrokTunnel, getNgrokUrl } from "./webhooks/ngrok.js";
import { logger } from "./utils/logger.js";

// Initialize config (triggers SDK setup)
config;

// Create server instance
const server = createServer();

// Register tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getToolDefinitions(),
  };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await handleToolCall(name, args);
});

// Register resource handlers (if enabled)
if (config.enableResources) {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "lemonsqueezy://payment-context",
          name: "Current Payment Context",
          description:
            "Recent payment events, failed payments, and important updates. Automatically updated from webhooks or polling.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri === "lemonsqueezy://payment-context") {
      const context = getPaymentContextResource();

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(context, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  // Setup resource watchers/polling (legacy file watcher - deprecated in favor of webhook server)
  if (config.webhookLogPath) {
    setupPaymentContextWatcher();
  }
  setupFailedPaymentPolling();
}

// Start webhook server if resources are enabled
if (config.enableResources) {
  startWebhookServer()
    .then(async (server) => {
      const webhookUrl = getWebhookUrl();
      logger.info({ webhookUrl }, "Webhook server started");

      // Start ngrok tunnel if enabled
      if (config.enableNgrok) {
        try {
          const tunnel = await startNgrokTunnel(config.webhookPort);
          logger.info(
            { publicUrl: tunnel.publicUrl, localUrl: tunnel.localUrl },
            "Ngrok tunnel established"
          );
          logger.info(
            { webhookUrl: `${tunnel.publicUrl}/webhooks` },
            "Configure this URL in Lemon Squeezy"
          );
        } catch (error) {
          logger.warn({ error }, "Ngrok failed, using local URL only");
        }
      } else {
        logger.info(
          { webhookUrl },
          "To expose publicly, set ENABLE_NGROK=true"
        );
      }
    })
    .catch((error) => {
      logger.error({ error }, "Failed to start webhook server");
    });
}

// Connect transport and start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Lemon Squeezy MCP Server running on stdio");
  if (config.enableResources) {
    logger.info("Proactive context enabled");
  }
}

main().catch((error) => {
  logger.fatal({ error }, "Fatal error");
  process.exit(1);
});
