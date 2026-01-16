import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetConfig } from "./config.js";

describe("Config", () => {
  beforeEach(() => {
    // Reset config state before each test
    resetConfig();
    // Clear environment variables
    delete process.env.LEMONSQUEEZY_API_KEY;
    delete process.env.LEMONSQUEEZY_TEST_API_KEY;
  });

  it("should throw error when API key is missing", () => {
    expect(() => {
      // Access config to trigger initialization
      const { config } = require("./config.js");
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      config.apiKey;
    }).toThrow("LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_TEST_API_KEY must be set");
  });

  it("should use test API key when provided", () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key_123";
    const { config } = require("./config.js");
    expect(config.apiKey).toBe("test_key_123");
  });

  it("should prefer production API key over test key", () => {
    process.env.LEMONSQUEEZY_API_KEY = "prod_key_123";
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key_123";
    const { config } = require("./config.js");
    expect(config.apiKey).toBe("prod_key_123");
  });

  it("should parse webhook port from environment", () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    process.env.WEBHOOK_PORT = "8080";
    const { config } = require("./config.js");
    expect(config.webhookPort).toBe(8080);
  });

  it("should default webhook port to 3000", () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    delete process.env.WEBHOOK_PORT;
    const { config } = require("./config.js");
    expect(config.webhookPort).toBe(3000);
  });

  it("should parse poll interval minutes", () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    process.env.POLL_INTERVAL_MINUTES = "10";
    const { config } = require("./config.js");
    expect(config.pollIntervalMinutes).toBe(10);
  });

  it("should default poll interval to 5 minutes", () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    delete process.env.POLL_INTERVAL_MINUTES;
    const { config } = require("./config.js");
    expect(config.pollIntervalMinutes).toBe(5);
  });
});
