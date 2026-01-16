import pino from "pino";

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");
const logFormat = process.env.LOG_FORMAT || (process.env.NODE_ENV === "production" ? "json" : "pretty");

const baseLogger = pino({
  level: logLevel,
  ...(logFormat === "pretty"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

export const logger = baseLogger.child({ service: "lemonsqueezy-mcp-server" });
