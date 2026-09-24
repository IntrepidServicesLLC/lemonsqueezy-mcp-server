import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A local .env may contain a live key. Keep configuration tests entirely offline.
vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({ lemonSqueezySetup: vi.fn() }));

async function loadConfig() {
  return (await import("./config.js")).config;
}

describe("Config", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of [
      "LEMONSQUEEZY_API_KEY",
      "LEMON_SQUEEZY_API_KEY",
      "LEMONSQUEEZY_TEST_API_KEY",
      "LEMON_SQUEEZY_TEST_API_KEY",
      "WEBHOOK_PORT",
      "POLL_INTERVAL_MINUTES",
    ]) {
      vi.stubEnv(key, undefined);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should throw error when API key is missing", async () => {
    await expect(loadConfig()).rejects.toThrow("LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_TEST_API_KEY must be set");
  });

  it("should use test API key when provided", async () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key_123";
    const config = await loadConfig();
    expect(config.apiKey).toBe("test_key_123");
  });

  it("should prefer production API key over test key", async () => {
    process.env.LEMONSQUEEZY_API_KEY = "prod_key_123";
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key_123";
    const config = await loadConfig();
    expect(config.apiKey).toBe("prod_key_123");
  });

  it("should parse webhook port from environment", async () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    process.env.WEBHOOK_PORT = "8080";
    const config = await loadConfig();
    expect(config.webhookPort).toBe(8080);
  });

  it("should default webhook port to 3000", async () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    delete process.env.WEBHOOK_PORT;
    const config = await loadConfig();
    expect(config.webhookPort).toBe(3000);
  });

  it("should parse poll interval minutes", async () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    process.env.POLL_INTERVAL_MINUTES = "10";
    const config = await loadConfig();
    expect(config.pollIntervalMinutes).toBe(10);
  });

  it("should default poll interval to 5 minutes", async () => {
    process.env.LEMONSQUEEZY_TEST_API_KEY = "test_key";
    delete process.env.POLL_INTERVAL_MINUTES;
    const config = await loadConfig();
    expect(config.pollIntervalMinutes).toBe(5);
  });
});
