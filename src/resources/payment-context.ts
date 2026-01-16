import { watch } from "fs";
import { readFile } from "fs/promises";
import { listOrders } from "@lemonsqueezy/lemonsqueezy.js";
import { config } from "../config.js";
import type { PaymentEvent } from "../types.js";
import { logger } from "../utils/logger.js";

let paymentContext: PaymentEvent[] = [];
const MAX_CONTEXT_EVENTS = 10;

export function addPaymentEvent(event: PaymentEvent) {
  paymentContext.unshift(event);
  if (paymentContext.length > MAX_CONTEXT_EVENTS) {
    paymentContext = paymentContext.slice(0, MAX_CONTEXT_EVENTS);
  }
}

export function setupPaymentContextWatcher() {
  if (!config.enableResources || !config.webhookLogPath) {
    return;
  }

  const logPath = config.webhookLogPath;
  logger.info({ logPath }, "Watching webhook log");

  try {
    watch(logPath, { persistent: true }, async (eventType) => {
      if (eventType === "change") {
        try {
          const content = await readFile(logPath, "utf-8");
          const lines = content.split("\n").filter((l) => l.trim());
          const lastLine = lines[lines.length - 1];

          // Parse webhook event (adjust based on your log format)
          if (
            lastLine.includes("order") ||
            lastLine.includes("subscription") ||
            lastLine.includes("payment")
          ) {
            const event: PaymentEvent = {
              timestamp: new Date().toISOString(),
              type: "webhook",
              message: lastLine,
            };

            // Try to extract order info from log
            const orderMatch = lastLine.match(/order[_\s#]?(\d+)/i);
            if (orderMatch) event.orderId = parseInt(orderMatch[1]);

            const emailMatch = lastLine.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) event.customerEmail = emailMatch[1];

            const statusMatch = lastLine.match(/(paid|refunded|failed|cancelled|active|expired)/i);
            if (statusMatch) event.status = statusMatch[1].toLowerCase();

            paymentContext.unshift(event);
            if (paymentContext.length > MAX_CONTEXT_EVENTS) {
              paymentContext = paymentContext.slice(0, MAX_CONTEXT_EVENTS);
            }
          }
        } catch (err) {
          // Silently handle read errors
        }
      }
    });
  } catch (err) {
    logger.error({ error: err, logPath }, "Error watching log file");
  }
}

export function setupFailedPaymentPolling() {
  if (!config.enableResources || !config.pollFailedPayments) {
    return;
  }

  const pollInterval = config.pollIntervalMinutes * 60 * 1000;

  setInterval(async () => {
    try {
      const { data, error } = await listOrders({ page: { number: 1, size: 5 } });
      if (error || !data?.data) return;

      const failedOrders = data.data.filter((order) => {
        const status = order.attributes?.status;
        return status === "refunded" || status === "failed" || (status as string) === "cancelled";
      });

      for (const order of failedOrders) {
        const existing = paymentContext.find((e) => e.orderId === parseInt(order.id));
        if (!existing) {
          paymentContext.unshift({
            timestamp: order.attributes?.created_at || new Date().toISOString(),
            type: "failed_payment",
            orderId: parseInt(order.id),
            customerEmail: order.attributes?.user_email,
            status: order.attributes?.status,
            amount: order.attributes?.total_formatted,
            message: `Failed payment: Order #${order.id} - ${order.attributes?.status} - ${order.attributes?.total_formatted}`,
          });
        }
      }

      if (paymentContext.length > MAX_CONTEXT_EVENTS) {
        paymentContext = paymentContext.slice(0, MAX_CONTEXT_EVENTS);
      }
    } catch (err) {
      // Silently handle polling errors
    }
  }, pollInterval);

  logger.info({ intervalMinutes: config.pollIntervalMinutes }, "Polling failed payments");
}

export function getPaymentContextResource() {
  return {
    lastUpdated: new Date().toISOString(),
    totalEvents: paymentContext.length,
    events: paymentContext,
    summary: {
      failedPayments: paymentContext.filter(
        (e) => e.status === "failed" || e.status === "refunded"
      ).length,
      recentActivity: paymentContext.slice(0, 5).map((e) => e.message),
    },
  };
}
