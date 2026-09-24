import Fastify, { FastifyInstance } from "fastify";
import { createHash, createHmac, timingSafeEqual } from "crypto";
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

function verifyWebhookSignature(rawBody: Buffer, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const hmac = createHmac("sha256", secret).update(rawBody).digest();
  const signatureBuffer = Buffer.from(signature, "hex");
  return timingSafeEqual(signatureBuffer, hmac);
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

const DUPLICATE_TTL_MS = 10 * 60 * 1000;
const MAX_RECENT_DELIVERIES = 1024;

export function createWebhookServer(): FastifyInstance {
  const secret = config.webhookSecret;
  if (!secret?.trim()) {
    throw new Error("Webhook signing secret is required before starting the listener");
  }

  const fastify = Fastify({
    logger: false,
    bodyLimit: 1048576, // 1MB
  });

  // Decorate request with rawBody
  fastify.decorateRequest("rawBody", null);
  const recentDeliveries = new Map<string, number>();

  // Capture raw body before JSON parsing
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: 1048576 },
    (req, body, done) => {
      if (body instanceof Buffer) {
        // Keep the exact bytes received; JSON reserialization changes the HMAC input.
        (req as typeof req & { rawBody: Buffer }).rawBody = body;
        try {
          const json = JSON.parse(body.toString("utf-8"));
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
    const rawBody = (request as typeof request & { rawBody: Buffer | null }).rawBody;
    const signature = request.headers["x-signature"];
    const eventName = request.headers["x-event-name"];

    if (!rawBody || !verifyWebhookSignature(rawBody, signature, secret)) {
      reply.code(401).send({ error: "Invalid signature" });
      return;
    }

    const payload = request.body as WebhookPayload;
    if (!payload || typeof payload.meta?.event_name !== "string" ||
        typeof payload.data?.type !== "string" || typeof payload.data?.id !== "string" ||
        !payload.data.attributes || typeof payload.data.attributes !== "object" ||
        Array.isArray(payload.data.attributes)) {
      reply.code(400).send({ error: "Invalid webhook payload" });
      return;
    }

    // Lemon Squeezy may retry a delivery. Keep only a bounded, short-lived digest set.
    const now = Date.now();
    for (const [digest, expiresAt] of recentDeliveries) {
      if (expiresAt <= now) recentDeliveries.delete(digest);
    }
    const digest = createHash("sha256").update(rawBody).digest("hex");
    if (recentDeliveries.has(digest)) {
      reply.code(200).send({ received: true, duplicate: true });
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
    if (recentDeliveries.size >= MAX_RECENT_DELIVERIES) {
      recentDeliveries.delete(recentDeliveries.keys().next().value!);
    }
    recentDeliveries.set(digest, now + DUPLICATE_TTL_MS);

    logger.info({ eventName, orderId: event.orderId }, "Webhook received");

    // Return 200 to acknowledge receipt
    reply.code(200).send({ received: true, event: typeof eventName === "string" ? eventName : event.eventName });
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return { status: "ok", service: "lemonsqueezy-webhook-listener" };
  });

  return fastify;
}

export async function startWebhookServer(): Promise<FastifyInstance> {
  if (webhookServer) {
    return webhookServer;
  }

  const fastify = createWebhookServer();

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
