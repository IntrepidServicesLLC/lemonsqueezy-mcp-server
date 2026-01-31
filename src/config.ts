import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { logger } from "./utils/logger.js";

// Load .env relative to script location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(rootDir, ".env") });

export interface Config {
  apiKey: string;
  enableResources: boolean;
  awsRegion: string;
  awsSalesforceSecretName?: string;
  awsFirebaseSecretName?: string;
  salesforceUsername?: string;
  salesforcePassword?: string;
  salesforceToken?: string;
  salesforceClientId?: string;
  salesforcePrivateKey?: string;
  salesforceLoginUrl?: string;
  firebaseServiceAccountKey?: string;
  firebaseProjectId?: string;
  lemonSqueezyStoreId?: string;
  pollFailedPayments: boolean;
  pollIntervalMinutes: number;
  webhookLogPath?: string;
  webhookPort: number;
  webhookSecret?: string;
  enableNgrok: boolean;
}

// Validate and initialize Lemon Squeezy SDK
// Priority: LEMONSQUEEZY_API_KEY (production) > LEMONSQUEEZY_TEST_API_KEY (test)
function getApiKey(): string {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY || 
                 process.env.LEMON_SQUEEZY_API_KEY ||
                 process.env.LEMONSQUEEZY_TEST_API_KEY ||
                 process.env.LEMON_SQUEEZY_TEST_API_KEY;
  if (!apiKey) {
    const error = new Error("LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_TEST_API_KEY must be set");
    logger.fatal({ 
      cwd: process.cwd(), 
      envPath: path.join(rootDir, ".env"),
      envKeys: Object.keys(process.env).filter(k => k.includes("LEMONSQUEEZY"))
    }, "API Key missing");
    throw error;
  }
  return apiKey;
}

function initializeLemonSqueezy(apiKey: string): void {
  lemonSqueezySetup({
    apiKey: apiKey,
    onError: (error) => logger.error({ error }, "Lemon Squeezy Error"),
  });
}

// Lazy initialization - only initialize SDK when config is accessed
let configInstance: Config | null = null;
let sdkInitialized = false;

function createConfig(): Config {
  const apiKey = getApiKey();
  
  // Initialize SDK only once
  if (!sdkInitialized) {
    initializeLemonSqueezy(apiKey);
    sdkInitialized = true;
  }

  return {
    apiKey,
    enableResources: process.env.ENABLE_RESOURCES === "true",
    awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    awsSalesforceSecretName: process.env.AWS_SALESFORCE_SECRET_NAME,
    awsFirebaseSecretName: process.env.AWS_FIREBASE_SECRET_NAME,
    salesforceUsername: process.env.SALESFORCE_USERNAME,
    salesforcePassword: process.env.SALESFORCE_PASSWORD,
    salesforceToken: process.env.SALESFORCE_TOKEN,
    salesforceClientId: process.env.SALESFORCE_CLIENT_ID,
    salesforcePrivateKey: process.env.SALESFORCE_PRIVATE_KEY,
    salesforceLoginUrl: process.env.SALESFORCE_LOGIN_URL,
    firebaseServiceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    lemonSqueezyStoreId: process.env.LEMON_SQUEEZY_STORE_ID,
    pollFailedPayments: process.env.POLL_FAILED_PAYMENTS === "true",
    pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || "5", 10),
    webhookLogPath: process.env.WEBHOOK_LOG_PATH,
    webhookPort: parseInt(process.env.WEBHOOK_PORT || "3000", 10),
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    enableNgrok: process.env.ENABLE_NGROK === "true",
  };
}

// Export config getter - throws error if API key is missing
export const config: Config = (() => {
  if (!configInstance) {
    configInstance = createConfig();
  }
  return configInstance;
})();

// Export function for testing that allows overriding
export function resetConfig(): void {
  configInstance = null;
  sdkInitialized = false;
}
