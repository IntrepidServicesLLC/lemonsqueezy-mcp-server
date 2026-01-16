import Fastify, { FastifyInstance } from "fastify";
import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../config.js";
import { addPaymentEvent } from "../resources/payment-context.js";
import { logger } from "../utils/logger.js";

let webhookServer: FastifyInstance | null = null;

export interface WebhookPayload {
  meta: {
    event_name: string;
    custom_data?: Record<string, unknown>;
  };
  data: {
    type: string;
    id: string;
    attributes: Record<string, unknown>;
    relationships?: Record<string, unknown>;
  };
}

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!secret) {
    return false;
  }

  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
  const signatureBuffer = Buffer.from(signature, "hex");
  const hmacBuffer = Buffer.from(hmac, "hex");

  if (signatureBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, hmacBuffer);
}

function parseWebhookEvent(payload: WebhookPayload): {
  eventName: string;
  orderId?: number;
  customerEmail?: string;
  status?: string;
  amount?: string;
  message: string;
} {
  const eventName = payload.meta.event_name;
  const attributes = payload.data.attributes;
  const id = payload.data.id;

  // Extract common fields based on event type
  const orderId = attributes.order_id
    ? parseInt(String(attributes.order_id), 10)
    : attributes.order_number
      ? parseInt(String(attributes.order_number), 10)
      : parseInt(id, 10);

  const customerEmail = (attributes.user_email || attributes.email) as string | undefined;
  const status = (attributes.status || attributes.status_formatted) as string | undefined;
  const amount = (attributes.total_formatted || attributes.total) as string | undefined;

  // Build descriptive message
  const resourceType = payload.data.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  let message = `${eventName}: ${resourceType} #${id}`;
  if (status) message += ` - ${status}`;
  if (amount) message += ` - ${amount}`;
  if (customerEmail) message += ` (${customerEmail})`;

  return {
    eventName,
    orderId: isNaN(orderId) ? undefined : orderId,
    customerEmail,
    status: status?.toLowerCase(),
    amount,
    message,
  };
}

export async function startWebhookServer(): Promise<FastifyInstance> {
  if (webhookServer) {
    return webhookServer;
  }

  const fastify = Fastify({
    logger: false,
    bodyLimit: 1048576, // 1MB
  });

  // Decorate request with rawBody
  fastify.decorateRequest("rawBody", "");

  // Capture raw body before JSON parsing
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: 1048576 },
    (req, body, done) => {
      if (body instanceof Buffer) {
        // Store raw body as string for signature verification
        const rawBodyStr = body.toString("utf-8");
        (req as any).rawBody = rawBodyStr;
        try {
          const json = JSON.parse(rawBodyStr);
          done(null, json);
        } catch (err) {
          done(err as Error, undefined);
        }
      } else {
        done(new Error("Expected Buffer"), undefined);
      }
    }
  );

  // Webhook endpoint
  fastify.post("/webhooks", async (request, reply) => {
    const requestWithRawBody = request as typeof request & { rawBody?: string };
    const rawBody = requestWithRawBody.rawBody || JSON.stringify(request.body);
    const signature = (request.headers["x-signature"] as string) || "";
    const eventName = (request.headers["x-event-name"] as string) || "";

    // Verify signature if secret is configured
    if (config.webhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) {
        reply.code(401).send({ error: "Invalid signature" });
        return;
      }
    }

    // Parse webhook payload
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch (error) {
      reply.code(400).send({ error: "Invalid JSON payload" });
      return;
    }

    // Extract event information
    const event = parseWebhookEvent(payload);

    // Add to payment context
    addPaymentEvent({
      timestamp: new Date().toISOString(),
      type: "webhook",
      orderId: event.orderId,
      customerEmail: event.customerEmail,
      status: event.status,
      amount: event.amount,
      message: event.message,
    });

    logger.info({ eventName, orderId: event.orderId, customerEmail: event.customerEmail }, "Webhook received");

    // Return 200 to acknowledge receipt
    reply.code(200).send({ received: true, event: eventName });
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return { status: "ok", service: "lemonsqueezy-webhook-listener" };
  });

  try {
    await fastify.listen({ port: config.webhookPort, host: "0.0.0.0" });
    logger.info({ port: config.webhookPort }, "Webhook server listening");
    webhookServer = fastify;
    return fastify;
  } catch (error) {
    logger.error({ error, port: config.webhookPort }, "Failed to start webhook server");
    throw error;
  }
}

export async function stopWebhookServer(): Promise<void> {
  if (webhookServer) {
    await webhookServer.close();
    webhookServer = null;
  }
}

export function getWebhookUrl(): string {
  return `http://localhost:${config.webhookPort}/webhooks`;
}
