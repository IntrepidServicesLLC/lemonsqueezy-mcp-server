import { logger } from "./logger.js";
import { config } from "../config.js";

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// Get retry config from environment with sensible defaults
function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.RETRY_MAX_ATTEMPTS || "3", 10),
    initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY_MS || "1000", 10),
    maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS || "30000", 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || "2"),
  };
}

export async function retry<T>(
  fn: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>,
  context?: { operation: string; [key: string]: unknown }
): Promise<T> {
  const config = { ...getRetryConfig(), ...retryConfig };
  let lastError: Error | unknown;
  const operation = context?.operation || "operation";

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        logger.warn(
          { attempt: attempt + 1, maxRetries: config.maxRetries, error, ...context },
          `Retry failed after ${attempt + 1} attempts: ${operation}`
        );
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );

      logger.debug(
        { attempt: attempt + 1, delay, error, ...context },
        `Retrying ${operation} (attempt ${attempt + 1}/${config.maxRetries})`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
