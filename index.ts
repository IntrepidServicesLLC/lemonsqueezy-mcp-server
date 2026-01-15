#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { watch } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { z } from "zod";
import jsforce, { Connection } from "jsforce";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import {
  lemonSqueezySetup,
  // Stores
  getStore,
  listStores,
  // Customers
  getCustomer,
  listCustomers,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  // Products
  getProduct,
  listProducts,
  // Variants
  getVariant,
  listVariants,
  // Orders
  getOrder,
  listOrders,
  getOrderItem,
  listOrderItems,
  generateOrderInvoice,
  issueOrderRefund,
  // Subscriptions
  getSubscription,
  listSubscriptions,
  updateSubscription,
  cancelSubscription,
  // Subscription Items
  getSubscriptionItem,
  listSubscriptionItems,
  getSubscriptionItemCurrentUsage,
  // Subscription Invoices
  getSubscriptionInvoice,
  listSubscriptionInvoices,
  generateSubscriptionInvoice,
  issueSubscriptionInvoiceRefund,
  // Discounts
  getDiscount,
  listDiscounts,
  createDiscount,
  deleteDiscount,
  // License Keys
  getLicenseKey,
  listLicenseKeys,
  updateLicenseKey,
  // Files
  getFile,
  listFiles,
  // Usage Records
  getUsageRecord,
  listUsageRecords,
  createUsageRecord,
  // Checkouts
  createCheckout,
  // Webhooks
  getWebhook,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "@lemonsqueezy/lemonsqueezy.js";
import * as dotenv from "dotenv";

dotenv.config();

// 1. Initialize the SDK
// Support both production and test API keys
// Priority: LEMONSQUEEZY_API_KEY (production) > LEMONSQUEEZY_TEST_API_KEY (test)
const apiKey = process.env.LEMONSQUEEZY_API_KEY || process.env.LEMONSQUEEZY_TEST_API_KEY;

if (!apiKey) {
  console.error("Error: LEMONSQUEEZY_API_KEY or LEMONSQUEEZY_TEST_API_KEY must be set");
  process.exit(1);
}

lemonSqueezySetup({
  apiKey: apiKey,
  onError: (error) => console.error("Lemon Squeezy Error:", error),
});

// Salesforce Connection (Lazy - only connects when needed)
type SalesforceConnection = Connection;
let salesforceConnection: SalesforceConnection | null = null;
let salesforceConnectionPromise: Promise<SalesforceConnection> | null = null;

// Firebase Connection (Lazy - only connects when needed)
let firebaseApp: admin.app.App | null = null;
let firebaseInitializationPromise: Promise<admin.app.App> | null = null;

// AWS Secrets Manager client (lazy initialization)
let secretsManagerClient: SecretsManagerClient | null = null;

function getSecretsManagerClient(): SecretsManagerClient {
  if (!secretsManagerClient) {
    secretsManagerClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    });
  }
  return secretsManagerClient;
}

type SalesforceCredentials =
  | {
      type: "username_password";
      username: string;
      password: string;
      securityToken: string;
    }
  | {
      type: "jwt";
      clientId: string;
      username: string;
      privateKey: string;
      loginUrl?: string;
    };

async function getSalesforceCredentials(): Promise<SalesforceCredentials> {
  // Option 1: Check if AWS Secrets Manager is configured
  const secretName = process.env.AWS_SALESFORCE_SECRET_NAME;
  if (secretName) {
    try {
      const client = getSecretsManagerClient();
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} exists but has no SecretString value`);
      }

      // Parse the secret (can be JSON string or plain text)
      let secretData: any;
      try {
        secretData = JSON.parse(response.SecretString);
      } catch {
        // If not JSON, treat as plain text and try to parse as key=value pairs
        const lines = response.SecretString.split("\n");
        secretData = {};
        for (const line of lines) {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            secretData[key.trim()] = valueParts.join("=").trim();
          }
        }
      }

      // Check for JWT authentication (client_id, username, private_key)
      const clientId =
        secretData.client_id ||
        secretData.CLIENT_ID ||
        secretData.clientId ||
        secretData.CLIENTID;
      const username =
        secretData.username ||
        secretData.USERNAME ||
        secretData.SALESFORCE_USERNAME ||
        secretData.user;
      const privateKey =
        secretData.private_key ||
        secretData.PRIVATE_KEY ||
        secretData.privateKey ||
        secretData.PRIVATEKEY;

      if (clientId && username && privateKey) {
        // JWT authentication
        // Format private key: handle escaped newlines, space-separated format, and ensure proper PEM format
        let formattedPrivateKey = privateKey
          .replace(/\\n/g, "\n") // Replace escaped newlines (from JSON)
          .replace(/\\r/g, "") // Remove escaped carriage returns
          .trim();
        
        // If key is still a single line (no actual newlines), it might be space-separated
        // Format: "-----BEGIN PRIVATE KEY----- <base64> -----END PRIVATE KEY-----"
        if (!formattedPrivateKey.includes("\n")) {
          const match = formattedPrivateKey.match(/^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/);
          if (match) {
            const [, header, body, footer] = match;
            // Split body into 64-character lines (standard PEM format)
            const lines = [];
            for (let i = 0; i < body.length; i += 64) {
              lines.push(body.substring(i, i + 64));
            }
            formattedPrivateKey = `${header}\n${lines.join("\n")}\n${footer}`;
          } else if (!formattedPrivateKey.includes("BEGIN")) {
            // If key doesn't have PEM headers, add them (assuming it's just the key content)
            const keyContent = formattedPrivateKey.replace(/\s/g, "");
            formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
          }
        }
        
        return {
          type: "jwt",
          clientId,
          username,
          privateKey: formattedPrivateKey,
          loginUrl: secretData.loginUrl || secretData.LOGIN_URL || process.env.SALESFORCE_LOGIN_URL,
        };
      }

      // Fallback to username/password authentication
      const password =
        secretData.password ||
        secretData.PASSWORD ||
        secretData.SALESFORCE_PASSWORD ||
        secretData.pass;
      const securityToken =
        secretData.securityToken ||
        secretData.SECURITY_TOKEN ||
        secretData.SALESFORCE_TOKEN ||
        secretData.token ||
        secretData.TOKEN;

      if (!username || !password || !securityToken) {
        throw new Error(
          `Secret ${secretName} must contain either: (1) client_id, username, and private_key for JWT authentication, or (2) username, password, and securityToken for username/password authentication. Found keys: ${Object.keys(secretData).join(", ")}`
        );
      }

      return { type: "username_password", username, password, securityToken };
    } catch (error) {
      throw new Error(
        `Failed to retrieve Salesforce credentials from AWS Secrets Manager (${secretName}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Option 2: Fallback to environment variables
  // Check for JWT authentication first
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const username = process.env.SALESFORCE_USERNAME;
  const privateKey = process.env.SALESFORCE_PRIVATE_KEY;

  if (clientId && username && privateKey) {
    // Format private key: handle escaped newlines, space-separated format, and ensure proper PEM format
    let formattedPrivateKey = privateKey
      .replace(/\\n/g, "\n") // Replace escaped newlines (from JSON)
      .replace(/\\r/g, "") // Remove escaped carriage returns
      .trim();
    
    // If key is still a single line (no actual newlines), it might be space-separated
    // Format: "-----BEGIN PRIVATE KEY----- <base64> -----END PRIVATE KEY-----"
    if (!formattedPrivateKey.includes("\n")) {
      const match = formattedPrivateKey.match(/^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/);
      if (match) {
        const [, header, body, footer] = match;
        // Split body into 64-character lines (standard PEM format)
        const lines = [];
        for (let i = 0; i < body.length; i += 64) {
          lines.push(body.substring(i, i + 64));
        }
        formattedPrivateKey = `${header}\n${lines.join("\n")}\n${footer}`;
      } else if (!formattedPrivateKey.includes("BEGIN")) {
        // If key doesn't have PEM headers, add them (assuming it's just the key content)
        const keyContent = formattedPrivateKey.replace(/\s/g, "");
        formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${keyContent}\n-----END PRIVATE KEY-----`;
      }
    }
    
    return {
      type: "jwt",
      clientId,
      username,
      privateKey: formattedPrivateKey,
      loginUrl: process.env.SALESFORCE_LOGIN_URL,
    };
  }

  // Fallback to username/password
  const password = process.env.SALESFORCE_PASSWORD;
  const securityToken = process.env.SALESFORCE_TOKEN;

  if (!username || !password || !securityToken) {
    throw new Error(
      "Salesforce credentials not configured. Either set AWS_SALESFORCE_SECRET_NAME for AWS Secrets Manager, or set SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and SALESFORCE_TOKEN (or SALESFORCE_CLIENT_ID, SALESFORCE_USERNAME, SALESFORCE_PRIVATE_KEY for JWT) environment variables."
    );
  }

  return { type: "username_password", username, password, securityToken };
}

async function getSalesforceConnection(): Promise<SalesforceConnection> {
  // Return existing connection if available
  if (salesforceConnection && salesforceConnection.accessToken) {
    return salesforceConnection;
  }

  // Return existing promise if connection is in progress
  if (salesforceConnectionPromise) {
    return salesforceConnectionPromise;
  }

  // Get credentials (from AWS Secrets Manager or environment variables)
  const credentials = await getSalesforceCredentials();

  salesforceConnectionPromise = (async () => {
    try {
      if (credentials.type === "jwt") {
        // JWT Bearer Token Flow
        const loginUrl = credentials.loginUrl || "https://login.salesforce.com";
        
        // Create JWT assertion
        const now = Math.floor(Date.now() / 1000);
        const assertion = jwt.sign(
          {
            iss: credentials.clientId,
            sub: credentials.username,
            aud: loginUrl,
            exp: now + 300, // 5 minutes
            iat: now,
          },
          credentials.privateKey,
          { algorithm: "RS256" }
        );

        // Exchange JWT for access token
        const tokenUrl = `${loginUrl}/services/oauth2/token`;
        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: assertion,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`JWT authentication failed: ${response.status} ${errorText}`);
        }

        const tokenData = (await response.json()) as {
          access_token: string;
          instance_url: string;
          token_type: string;
        };
        
        // Create new connection with access token
        const conn = new Connection({
          accessToken: tokenData.access_token,
          instanceUrl: tokenData.instance_url,
        });
        
        salesforceConnection = conn;
        salesforceConnectionPromise = null;
        return conn;
      } else {
        // Username/Password authentication
        const loginUrl = process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";
        const conn = new Connection({
          loginUrl,
        });

        await conn.login(credentials.username, credentials.password + credentials.securityToken);
        
        salesforceConnection = conn;
        salesforceConnectionPromise = null;
        return conn;
      }
    } catch (error) {
      salesforceConnectionPromise = null;
      throw new Error(
        `Failed to connect to Salesforce: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  })();

  return salesforceConnectionPromise;
}

async function getFirebaseCredentials(): Promise<any> {
  const secretName = process.env.AWS_FIREBASE_SECRET_NAME;
  if (secretName) {
    try {
      const client = getSecretsManagerClient();
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} exists but has no SecretString value`);
      }

      return JSON.parse(response.SecretString);
    } catch (error) {
      throw new Error(`Failed to retrieve Firebase credentials from AWS Secrets Manager (${secretName}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      // Check if it's a JSON string
      if (serviceAccountKey.trim().startsWith('{')) {
        return JSON.parse(serviceAccountKey);
      }
      // Otherwise treat as a path (to be handled by process.env.FIREBASE_SERVICE_ACCOUNT_KEY if passed to firebase-admin)
      // But we prefer to load it here to be consistent
      const { readFile } = await import('fs/promises');
      const content = await readFile(serviceAccountKey, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error("Firebase credentials not configured. Set AWS_FIREBASE_SECRET_NAME or FIREBASE_SERVICE_ACCOUNT_KEY.");
}

async function getFirebaseApp(): Promise<admin.app.App> {
  if (firebaseApp) return firebaseApp;
  if (firebaseInitializationPromise) return firebaseInitializationPromise;

  firebaseInitializationPromise = (async () => {
    try {
      const credentials = await getFirebaseCredentials();
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: process.env.FIREBASE_PROJECT_ID || credentials.project_id
      });
      return firebaseApp;
    } catch (error) {
      firebaseInitializationPromise = null;
      throw new Error(`Failed to initialize Firebase: ${error instanceof Error ? error.message : String(error)}`);
    }
  })();

  return firebaseInitializationPromise;
}

// 2. Define the Server
const server = new Server(
  {
    name: "lemonsqueezy-antigravity-bridge",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: process.env.ENABLE_RESOURCES === "true" ? {} : undefined,
    },
  }
);

// 3. Define the Tool Schemas (The "Brain" describing capabilities to the AI)
const TOOLS = {
  // Stores
  GET_STORE: "get_store",
  LIST_STORES: "list_stores",
  // Customers
  GET_CUSTOMER: "get_customer",
  LIST_CUSTOMERS: "list_customers",
  CREATE_CUSTOMER: "create_customer",
  UPDATE_CUSTOMER: "update_customer",
  ARCHIVE_CUSTOMER: "archive_customer",
  // Products
  GET_PRODUCT: "get_product",
  LIST_PRODUCTS: "list_products",
  // Variants
  GET_VARIANT: "get_variant",
  LIST_VARIANTS: "list_variants",
  // Orders
  GET_ORDER: "get_order",
  LIST_ORDERS: "list_orders",
  SEARCH_ORDERS: "search_orders",
  GET_ORDER_ITEM: "get_order_item",
  LIST_ORDER_ITEMS: "list_order_items",
  GENERATE_ORDER_INVOICE: "generate_order_invoice",
  ISSUE_ORDER_REFUND: "issue_order_refund",
  // Subscriptions
  GET_SUBSCRIPTION: "get_subscription",
  LIST_SUBSCRIPTIONS: "list_subscriptions",
  UPDATE_SUBSCRIPTION: "update_subscription",
  CANCEL_SUBSCRIPTION: "cancel_subscription",
  // Subscription Items
  GET_SUBSCRIPTION_ITEM: "get_subscription_item",
  LIST_SUBSCRIPTION_ITEMS: "list_subscription_items",
  GET_SUBSCRIPTION_ITEM_USAGE: "get_subscription_item_usage",
  // Subscription Invoices
  GET_SUBSCRIPTION_INVOICE: "get_subscription_invoice",
  LIST_SUBSCRIPTION_INVOICES: "list_subscription_invoices",
  GENERATE_SUBSCRIPTION_INVOICE: "generate_subscription_invoice",
  ISSUE_SUBSCRIPTION_INVOICE_REFUND: "issue_subscription_invoice_refund",
  // Discounts
  GET_DISCOUNT: "get_discount",
  LIST_DISCOUNTS: "list_discounts",
  CREATE_DISCOUNT: "create_discount",
  DELETE_DISCOUNT: "delete_discount",
  // License Keys
  GET_LICENSE_KEY: "get_license_key",
  LIST_LICENSE_KEYS: "list_license_keys",
  UPDATE_LICENSE_KEY: "update_license_key",
  // Files
  GET_FILE: "get_file",
  LIST_FILES: "list_files",
  // Usage Records
  GET_USAGE_RECORD: "get_usage_record",
  LIST_USAGE_RECORDS: "list_usage_records",
  CREATE_USAGE_RECORD: "create_usage_record",
  // Checkouts
  CREATE_CHECKOUT: "create_checkout",
  // Webhooks
  GET_WEBHOOK: "get_webhook",
  LIST_WEBHOOKS: "list_webhooks",
  CREATE_WEBHOOK: "create_webhook",
  UPDATE_WEBHOOK: "update_webhook",
  DELETE_WEBHOOK: "delete_webhook",
  // Salesforce (Bonus)
  SYNC_CUSTOMER_TO_CRM: "sync_customer_to_crm",
  // VOS Tools
  SEARCH_TRANSACTIONS_NATURAL: "search_transactions_natural",
  ANALYZE_CHURN_RISK: "analyze_churn_risk",
  CANONIZE_DECISION: "canonize_decision",
} as const;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Stores
      {
        name: TOOLS.GET_STORE,
        description: "Get details of a specific store by ID.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "The store ID" },
          },
          required: ["storeId"],
        },
      },
      {
        name: TOOLS.LIST_STORES,
        description: "List all stores in your Lemon Squeezy account.",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      // Customers
      {
        name: TOOLS.GET_CUSTOMER,
        description: "Get details of a specific customer by ID.",
        inputSchema: {
          type: "object",
          properties: {
            customerId: { type: "number", description: "The customer ID" },
          },
          required: ["customerId"],
        },
      },
      {
        name: TOOLS.LIST_CUSTOMERS,
        description: "List customers with optional filtering. Useful for finding customer information, subscription status, and order history.",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "Optional: Filter customers by email address" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.CREATE_CUSTOMER,
        description: "Create a new customer in a store.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "The store ID" },
            name: { type: "string", description: "Customer name" },
            email: { type: "string", description: "Customer email" },
            city: { type: "string", description: "Optional: Customer city" },
            country: { type: "string", description: "Optional: Customer country" },
            region: { type: "string", description: "Optional: Customer region/state" },
          },
          required: ["storeId", "name", "email"],
        },
      },
      {
        name: TOOLS.UPDATE_CUSTOMER,
        description: "Update an existing customer's information.",
        inputSchema: {
          type: "object",
          properties: {
            customerId: { type: "number", description: "The customer ID" },
            name: { type: "string", description: "Optional: Customer name" },
            email: { type: "string", description: "Optional: Customer email" },
            city: { type: "string", description: "Optional: Customer city" },
            country: { type: "string", description: "Optional: Customer country" },
            region: { type: "string", description: "Optional: Customer region/state" },
          },
          required: ["customerId"],
        },
      },
      {
        name: TOOLS.ARCHIVE_CUSTOMER,
        description: "Archive a customer (soft delete).",
        inputSchema: {
          type: "object",
          properties: {
            customerId: { type: "number", description: "The customer ID" },
          },
          required: ["customerId"],
        },
      },
      // Products
      {
        name: TOOLS.GET_PRODUCT,
        description: "Get details of a specific product by ID.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "number", description: "The product ID" },
          },
          required: ["productId"],
        },
      },
      {
        name: TOOLS.LIST_PRODUCTS,
        description: "List all products, optionally filtered by store.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "Optional: Filter by store ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      // Variants
      {
        name: TOOLS.GET_VARIANT,
        description: "Get details of a specific product variant by ID.",
        inputSchema: {
          type: "object",
          properties: {
            variantId: { type: "number", description: "The variant ID" },
          },
          required: ["variantId"],
        },
      },
      {
        name: TOOLS.LIST_VARIANTS,
        description: "List all product variants, optionally filtered by product or store.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "number", description: "Optional: Filter by product ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      // Orders
      {
        name: TOOLS.GET_ORDER,
        description: "Retrieve details of a specific Lemon Squeezy order by ID. Use this to verify payment status, order total, and customer information.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "number", description: "The unique ID of the order" },
          },
          required: ["orderId"],
        },
      },
      {
        name: TOOLS.LIST_ORDERS,
        description: "List all orders with optional filtering. Useful for finding recent payments, the last successful payment, or browsing order history. Returns orders sorted by most recent first.",
        inputSchema: {
          type: "object",
          properties: {
            page: { type: "number", description: "Optional: Page number for pagination" },
            storeId: { type: "number", description: "Optional: Filter orders by store ID" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.SEARCH_ORDERS,
        description: "Search for orders by email or customer email. Useful for finding a payment when you only have a user's email address. Returns all orders matching the email.",
        inputSchema: {
          type: "object",
          properties: {
            userEmail: { type: "string", description: "The email address of the customer" },
          },
          required: ["userEmail"],
        },
      },
      {
        name: TOOLS.GET_ORDER_ITEM,
        description: "Get details of a specific order item by ID.",
        inputSchema: {
          type: "object",
          properties: {
            orderItemId: { type: "number", description: "The order item ID" },
          },
          required: ["orderItemId"],
        },
      },
      {
        name: TOOLS.LIST_ORDER_ITEMS,
        description: "List order items, optionally filtered by order.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "number", description: "Optional: Filter by order ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.GENERATE_ORDER_INVOICE,
        description: "Generate an invoice for an order.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "number", description: "The order ID" },
            name: { type: "string", description: "Optional: Customer name for invoice" },
            email: { type: "string", description: "Optional: Customer email for invoice" },
            address: { type: "string", description: "Optional: Customer address" },
            city: { type: "string", description: "Optional: Customer city" },
            state: { type: "string", description: "Optional: Customer state/region" },
            zip: { type: "string", description: "Optional: Customer zip/postal code" },
            country: { type: "string", description: "Optional: Customer country" },
          },
          required: ["orderId"],
        },
      },
      {
        name: TOOLS.ISSUE_ORDER_REFUND,
        description: "Issue a refund for an order.",
        inputSchema: {
          type: "object",
          properties: {
            orderId: { type: "number", description: "The order ID" },
            amount: { type: "number", description: "The refund amount in cents" },
          },
          required: ["orderId", "amount"],
        },
      },
      // Subscriptions
      {
        name: TOOLS.GET_SUBSCRIPTION,
        description: "Check the status of a subscription. Use this to verify if credits should be active, subscription status, renewal dates, and billing information.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: { type: "number", description: "The ID of the subscription" },
          },
          required: ["subscriptionId"],
        },
      },
      {
        name: TOOLS.LIST_SUBSCRIPTIONS,
        description: "List all subscriptions, optionally filtered by store or customer.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "Optional: Filter by store ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.UPDATE_SUBSCRIPTION,
        description: "Update a subscription (e.g., change plan, update billing details).",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: { type: "number", description: "The subscription ID" },
            variantId: { type: "number", description: "Optional: New variant/plan ID" },
            productId: { type: "number", description: "Optional: New product ID" },
            billingAnchor: { type: "number", description: "Optional: Billing anchor day" },
          },
          required: ["subscriptionId"],
        },
      },
      {
        name: TOOLS.CANCEL_SUBSCRIPTION,
        description: "Cancel a subscription.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: { type: "number", description: "The subscription ID" },
          },
          required: ["subscriptionId"],
        },
      },
      // Subscription Items
      {
        name: TOOLS.GET_SUBSCRIPTION_ITEM,
        description: "Get details of a specific subscription item by ID.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionItemId: { type: "number", description: "The subscription item ID" },
          },
          required: ["subscriptionItemId"],
        },
      },
      {
        name: TOOLS.LIST_SUBSCRIPTION_ITEMS,
        description: "List subscription items, optionally filtered by subscription.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: { type: "number", description: "Optional: Filter by subscription ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.GET_SUBSCRIPTION_ITEM_USAGE,
        description: "Get current usage statistics for a subscription item (useful for usage-based billing).",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionItemId: { type: "number", description: "The subscription item ID" },
          },
          required: ["subscriptionItemId"],
        },
      },
      // Subscription Invoices
      {
        name: TOOLS.GET_SUBSCRIPTION_INVOICE,
        description: "Get details of a specific subscription invoice by ID.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
          },
          required: ["subscriptionInvoiceId"],
        },
      },
      {
        name: TOOLS.LIST_SUBSCRIPTION_INVOICES,
        description: "List subscription invoices, optionally filtered by subscription.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionId: { type: "number", description: "Optional: Filter by subscription ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.GENERATE_SUBSCRIPTION_INVOICE,
        description: "Generate an invoice for a subscription.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
          },
          required: ["subscriptionInvoiceId"],
        },
      },
      {
        name: TOOLS.ISSUE_SUBSCRIPTION_INVOICE_REFUND,
        description: "Issue a refund for a subscription invoice.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
            amount: { type: "number", description: "The refund amount in cents" },
          },
          required: ["subscriptionInvoiceId", "amount"],
        },
      },
      // Discounts
      {
        name: TOOLS.GET_DISCOUNT,
        description: "Get details of a specific discount by ID.",
        inputSchema: {
          type: "object",
          properties: {
            discountId: { type: "number", description: "The discount ID" },
          },
          required: ["discountId"],
        },
      },
      {
        name: TOOLS.LIST_DISCOUNTS,
        description: "List all discounts, optionally filtered by store.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "Optional: Filter by store ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.CREATE_DISCOUNT,
        description: "Create a new discount code.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "The store ID" },
            name: { type: "string", description: "Discount name" },
            code: { type: "string", description: "Discount code" },
            amount: { type: "number", description: "Discount amount" },
            amountType: { type: "string", description: "Discount type: 'percent' or 'fixed'" },
            duration: { type: "string", description: "Duration: 'once', 'forever', or 'repeating'" },
            durationInMonths: { type: "number", description: "Optional: Duration in months if repeating" },
          },
          required: ["storeId", "name", "code", "amount", "amountType", "duration"],
        },
      },
      {
        name: TOOLS.DELETE_DISCOUNT,
        description: "Delete a discount.",
        inputSchema: {
          type: "object",
          properties: {
            discountId: { type: "number", description: "The discount ID" },
          },
          required: ["discountId"],
        },
      },
      // License Keys
      {
        name: TOOLS.GET_LICENSE_KEY,
        description: "Get details of a specific license key by ID.",
        inputSchema: {
          type: "object",
          properties: {
            licenseKeyId: { type: "number", description: "The license key ID" },
          },
          required: ["licenseKeyId"],
        },
      },
      {
        name: TOOLS.LIST_LICENSE_KEYS,
        description: "List license keys, optionally filtered by store or order.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "Optional: Filter by store ID" },
            orderId: { type: "number", description: "Optional: Filter by order ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.UPDATE_LICENSE_KEY,
        description: "Update a license key (e.g., activate, deactivate, update status).",
        inputSchema: {
          type: "object",
          properties: {
            licenseKeyId: { type: "number", description: "The license key ID" },
            status: { type: "string", description: "Optional: Status ('active' or 'inactive')" },
          },
          required: ["licenseKeyId"],
        },
      },
      // Files
      {
        name: TOOLS.GET_FILE,
        description: "Get details of a specific file by ID.",
        inputSchema: {
          type: "object",
          properties: {
            fileId: { type: "number", description: "The file ID" },
          },
          required: ["fileId"],
        },
      },
      {
        name: TOOLS.LIST_FILES,
        description: "List files, optionally filtered by product or variant.",
        inputSchema: {
          type: "object",
          properties: {
            productId: { type: "number", description: "Optional: Filter by product ID" },
            variantId: { type: "number", description: "Optional: Filter by variant ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      // Usage Records
      {
        name: TOOLS.GET_USAGE_RECORD,
        description: "Get details of a specific usage record by ID.",
        inputSchema: {
          type: "object",
          properties: {
            usageRecordId: { type: "number", description: "The usage record ID" },
          },
          required: ["usageRecordId"],
        },
      },
      {
        name: TOOLS.LIST_USAGE_RECORDS,
        description: "List usage records, optionally filtered by subscription item.",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionItemId: { type: "number", description: "Optional: Filter by subscription item ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.CREATE_USAGE_RECORD,
        description: "Create a new usage record for a subscription item (for usage-based billing).",
        inputSchema: {
          type: "object",
          properties: {
            subscriptionItemId: { type: "number", description: "The subscription item ID" },
            quantity: { type: "number", description: "The usage quantity" },
            action: { type: "string", description: "The action (e.g., 'increment', 'set')" },
          },
          required: ["subscriptionItemId", "quantity", "action"],
        },
      },
      // Checkouts
      {
        name: TOOLS.CREATE_CHECKOUT,
        description: "Create a new checkout session for a product variant.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "The store ID" },
            variantId: { type: "number", description: "The variant ID" },
            customPrice: { type: "number", description: "Optional: Custom price in cents" },
            productOptions: { type: "object", description: "Optional: Product options" },
            checkoutOptions: { type: "object", description: "Optional: Checkout options" },
            checkoutData: { type: "object", description: "Optional: Additional checkout data" },
            preview: { type: "boolean", description: "Optional: Preview mode" },
            expiresAt: { type: "string", description: "Optional: Expiration date (ISO 8601)" },
          },
          required: ["storeId", "variantId"],
        },
      },
      // Webhooks
      {
        name: TOOLS.GET_WEBHOOK,
        description: "Get details of a specific webhook by ID.",
        inputSchema: {
          type: "object",
          properties: {
            webhookId: { type: "number", description: "The webhook ID" },
          },
          required: ["webhookId"],
        },
      },
      {
        name: TOOLS.LIST_WEBHOOKS,
        description: "List all webhooks, optionally filtered by store.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "Optional: Filter by store ID" },
            page: { type: "number", description: "Optional: Page number for pagination" },
          },
          required: [],
        },
      },
      {
        name: TOOLS.CREATE_WEBHOOK,
        description: "Create a new webhook.",
        inputSchema: {
          type: "object",
          properties: {
            storeId: { type: "number", description: "The store ID" },
            url: { type: "string", description: "The webhook URL" },
            events: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to" },
            secret: { type: "string", description: "Optional: Webhook secret for verification" },
          },
          required: ["storeId", "url", "events"],
        },
      },
      {
        name: TOOLS.UPDATE_WEBHOOK,
        description: "Update an existing webhook.",
        inputSchema: {
          type: "object",
          properties: {
            webhookId: { type: "number", description: "The webhook ID" },
            url: { type: "string", description: "Optional: New webhook URL" },
            events: { type: "array", items: { type: "string" }, description: "Optional: New event types" },
            secret: { type: "string", description: "Optional: New webhook secret" },
          },
          required: ["webhookId"],
        },
      },
      {
        name: TOOLS.DELETE_WEBHOOK,
        description: "Delete a webhook.",
        inputSchema: {
          type: "object",
          properties: {
            webhookId: { type: "number", description: "The webhook ID" },
          },
          required: ["webhookId"],
        },
      },
      // Salesforce (Bonus Integration)
      {
        name: TOOLS.SYNC_CUSTOMER_TO_CRM,
        description: "Sync a customer to Salesforce CRM. Checks if a Lead with the email exists, and if not, creates a new Lead with source 'AI Agent'. Returns the Lead ID.",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "Customer email address" },
            name: { type: "string", description: "Customer name" },
            revenue: { type: "number", description: "Optional: Customer revenue/lifetime value" },
            company: { type: "string", description: "Optional: Company name (if not provided, uses customer name)" },
            title: { type: "string", description: "Optional: Job title" },
          },
          required: ["email", "name"],
        },
      },
      // VOS Tools
      {
        name: TOOLS.SEARCH_TRANSACTIONS_NATURAL,
        description: "Search transactions using natural language (e.g., 'refunds from yesterday', 'subscriptions this week'). Cross-references Lemon Squeezy and Firestore.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Natural language query" },
          },
          required: ["query"],
        },
      },
      {
        name: TOOLS.ANALYZE_CHURN_RISK,
        description: "Identify users with active subscriptions who haven't logged in recently (>28 days).",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: TOOLS.CANONIZE_DECISION,
        description: "Record a business decision with a snapshot of current active user metrics.",
        inputSchema: {
          type: "object",
          properties: {
            decision: { type: "string", description: "What was decided" },
            rationale: { type: "string", description: "Why" },
            expectedOutcome: { type: "string", description: "What we expect to happen" },
            category: { type: "string", description: "Optional: 'pricing', 'product', 'marketing', etc." },
          },
          required: ["decision", "rationale", "expectedOutcome"],
        },
      },
    ],
  };
});

// Helper function to create response
const createResponse = (data: any) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

// Helper function to create error response
const createErrorResponse = (error: unknown) => ({
  content: [{ 
    type: "text", 
    text: `Error: ${error instanceof Error ? error.message : String(error)}` 
  }],
  isError: true,
});

// 4. Handle Tool Execution (The "Hands" performing the work)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Stores
    if (name === TOOLS.GET_STORE) {
      const { storeId } = args as { storeId: number };
      const { data, error } = await getStore(storeId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_STORES) {
      const { page } = args as { page?: number };
      const options: { page?: { number?: number } } = {};
      if (page) options.page = { number: page };
      const { data, error } = await listStores(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Customers
    if (name === TOOLS.GET_CUSTOMER) {
      const { customerId } = args as { customerId: number };
      const { data, error } = await getCustomer(customerId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_CUSTOMERS) {
      const { email, page } = args as { email?: string; page?: number };
      const options: { filter?: { email: string }; page?: { number?: number } } = {};
      if (email) options.filter = { email };
      if (page) options.page = { number: page };
      const { data, error } = await listCustomers(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.CREATE_CUSTOMER) {
      const { storeId, name: customerName, email, city, country, region } = args as {
        storeId: number; name: string; email: string; city?: string; country?: string; region?: string;
      };
      const customer: any = { name: customerName, email };
      if (city) customer.city = city;
      if (country) customer.country = country;
      if (region) customer.region = region;
      const { data, error } = await createCustomer(storeId, customer);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.UPDATE_CUSTOMER) {
      const { customerId, name, email, city, country, region } = args as {
        customerId: number; name?: string; email?: string; city?: string; country?: string; region?: string;
      };
      const updates: any = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (city) updates.city = city;
      if (country) updates.country = country;
      if (region) updates.region = region;
      const { data, error } = await updateCustomer(customerId, updates);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.ARCHIVE_CUSTOMER) {
      const { customerId } = args as { customerId: number };
      const { data, error } = await archiveCustomer(customerId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Products
    if (name === TOOLS.GET_PRODUCT) {
      const { productId } = args as { productId: number };
      const { data, error } = await getProduct(productId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_PRODUCTS) {
      const { storeId, page } = args as { storeId?: number; page?: number };
      const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
      if (storeId) options.filter = { storeId };
      if (page) options.page = { number: page };
      const { data, error } = await listProducts(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Variants
    if (name === TOOLS.GET_VARIANT) {
      const { variantId } = args as { variantId: number };
      const { data, error } = await getVariant(variantId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_VARIANTS) {
      const { productId, page } = args as { productId?: number; page?: number };
      const options: { filter?: { productId?: number }; page?: { number?: number } } = {};
      if (productId) options.filter = { productId };
      if (page) options.page = { number: page };
      const { data, error } = await listVariants(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Orders
    if (name === TOOLS.GET_ORDER) {
      const { orderId } = args as { orderId: number };
      const { data, error } = await getOrder(orderId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_ORDERS) {
      const { page, storeId } = args as { page?: number; storeId?: number };
      const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
      if (storeId) options.filter = { storeId };
      if (page) options.page = { number: page };
      const { data, error } = await listOrders(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.SEARCH_ORDERS) {
      const { userEmail } = args as { userEmail: string };
      const { data, error } = await listOrders({ filter: { userEmail } });
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.GET_ORDER_ITEM) {
      const { orderItemId } = args as { orderItemId: number };
      const { data, error } = await getOrderItem(orderItemId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_ORDER_ITEMS) {
      const { orderId, page } = args as { orderId?: number; page?: number };
      const options: { filter?: { orderId?: number }; page?: { number?: number } } = {};
      if (orderId) options.filter = { orderId };
      if (page) options.page = { number: page };
      const { data, error } = await listOrderItems(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.GENERATE_ORDER_INVOICE) {
      const { orderId, name, email, address, city, state, zip, country } = args as {
        orderId: number; name?: string; email?: string; address?: string; city?: string; state?: string; zip?: string; country?: string;
      };
      const params: any = {};
      if (name) params.name = name;
      if (email) params.email = email;
      if (address) params.address = address;
      if (city) params.city = city;
      if (state) params.state = state;
      if (zip) params.zip = zip;
      if (country) params.country = country;
      const { data, error } = await generateOrderInvoice(orderId, params);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.ISSUE_ORDER_REFUND) {
      const { orderId, amount } = args as { orderId: number; amount: number };
      const { data, error } = await issueOrderRefund(orderId, amount);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Subscriptions
    if (name === TOOLS.GET_SUBSCRIPTION) {
      const { subscriptionId } = args as { subscriptionId: number };
      const { data, error } = await getSubscription(subscriptionId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_SUBSCRIPTIONS) {
      const { storeId, page } = args as { storeId?: number; page?: number };
      const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
      if (storeId) options.filter = { storeId };
      if (page) options.page = { number: page };
      const { data, error } = await listSubscriptions(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.UPDATE_SUBSCRIPTION) {
      const { subscriptionId, variantId, productId, billingAnchor } = args as {
        subscriptionId: number; variantId?: number; productId?: number; billingAnchor?: number;
      };
      const updates: any = {};
      if (variantId !== undefined) updates.variantId = variantId;
      if (productId !== undefined) updates.productId = productId;
      if (billingAnchor !== undefined) updates.billingAnchor = billingAnchor;
      const { data, error } = await updateSubscription(subscriptionId, updates);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.CANCEL_SUBSCRIPTION) {
      const { subscriptionId } = args as { subscriptionId: number };
      const { data, error } = await cancelSubscription(subscriptionId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Subscription Items
    if (name === TOOLS.GET_SUBSCRIPTION_ITEM) {
      const { subscriptionItemId } = args as { subscriptionItemId: number };
      const { data, error } = await getSubscriptionItem(subscriptionItemId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_SUBSCRIPTION_ITEMS) {
      const { subscriptionId, page } = args as { subscriptionId?: number; page?: number };
      const options: { filter?: { subscriptionId?: number }; page?: { number?: number } } = {};
      if (subscriptionId) options.filter = { subscriptionId };
      if (page) options.page = { number: page };
      const { data, error } = await listSubscriptionItems(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.GET_SUBSCRIPTION_ITEM_USAGE) {
      const { subscriptionItemId } = args as { subscriptionItemId: number };
      const { data, error } = await getSubscriptionItemCurrentUsage(subscriptionItemId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Subscription Invoices
    if (name === TOOLS.GET_SUBSCRIPTION_INVOICE) {
      const { subscriptionInvoiceId } = args as { subscriptionInvoiceId: number };
      const { data, error } = await getSubscriptionInvoice(subscriptionInvoiceId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_SUBSCRIPTION_INVOICES) {
      const { subscriptionId, page } = args as { subscriptionId?: number; page?: number };
      const options: { filter?: { subscriptionId?: number }; page?: { number?: number } } = {};
      if (subscriptionId) options.filter = { subscriptionId };
      if (page) options.page = { number: page };
      const { data, error } = await listSubscriptionInvoices(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.GENERATE_SUBSCRIPTION_INVOICE) {
      const { subscriptionInvoiceId } = args as { subscriptionInvoiceId: number };
      const { data, error } = await generateSubscriptionInvoice(subscriptionInvoiceId, {});
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.ISSUE_SUBSCRIPTION_INVOICE_REFUND) {
      const { subscriptionInvoiceId, amount } = args as { subscriptionInvoiceId: number; amount: number };
      const { data, error } = await issueSubscriptionInvoiceRefund(subscriptionInvoiceId, amount);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Discounts
    if (name === TOOLS.GET_DISCOUNT) {
      const { discountId } = args as { discountId: number };
      const { data, error } = await getDiscount(discountId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_DISCOUNTS) {
      const { storeId, page } = args as { storeId?: number; page?: number };
      const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
      if (storeId) options.filter = { storeId };
      if (page) options.page = { number: page };
      const { data, error } = await listDiscounts(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.CREATE_DISCOUNT) {
      const { storeId, name, code, amount, amountType, duration, durationInMonths } = args as {
        storeId: number; name: string; code: string; amount: number; amountType: string; duration: string; durationInMonths?: number;
      };
      const discount: any = { name, code, amount, amountType, duration };
      if (durationInMonths) discount.durationInMonths = durationInMonths;
      const { data, error } = await createDiscount(discount);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.DELETE_DISCOUNT) {
      const { discountId } = args as { discountId: number };
      const { data, error } = await deleteDiscount(discountId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // License Keys
    if (name === TOOLS.GET_LICENSE_KEY) {
      const { licenseKeyId } = args as { licenseKeyId: number };
      const { data, error } = await getLicenseKey(licenseKeyId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_LICENSE_KEYS) {
      const { storeId, orderId, page } = args as { storeId?: number; orderId?: number; page?: number };
      const options: { filter?: { storeId?: number; orderId?: number }; page?: { number?: number } } = {};
      if (storeId || orderId) {
        options.filter = {};
        if (storeId) options.filter.storeId = storeId;
        if (orderId) options.filter.orderId = orderId;
      }
      if (page) options.page = { number: page };
      const { data, error } = await listLicenseKeys(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.UPDATE_LICENSE_KEY) {
      const { licenseKeyId, status } = args as { licenseKeyId: number; status?: string };
      const updates: any = {};
      if (status) updates.status = status;
      const { data, error } = await updateLicenseKey(licenseKeyId, updates);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Files
    if (name === TOOLS.GET_FILE) {
      const { fileId } = args as { fileId: number };
      const { data, error } = await getFile(fileId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_FILES) {
      const { productId, variantId, page } = args as { productId?: number; variantId?: number; page?: number };
      const options: { filter?: { productId?: number; variantId?: number }; page?: { number?: number } } = {};
      if (productId || variantId) {
        options.filter = {};
        if (productId) options.filter.productId = productId;
        if (variantId) options.filter.variantId = variantId;
      }
      if (page) options.page = { number: page };
      const { data, error } = await listFiles(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Usage Records
    if (name === TOOLS.GET_USAGE_RECORD) {
      const { usageRecordId } = args as { usageRecordId: number };
      const { data, error } = await getUsageRecord(usageRecordId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_USAGE_RECORDS) {
      const { subscriptionItemId, page } = args as { subscriptionItemId?: number; page?: number };
      const options: { filter?: { subscriptionItemId?: number }; page?: { number?: number } } = {};
      if (subscriptionItemId) options.filter = { subscriptionItemId };
      if (page) options.page = { number: page };
      const { data, error } = await listUsageRecords(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.CREATE_USAGE_RECORD) {
      const { subscriptionItemId, quantity, action } = args as {
        subscriptionItemId: number; quantity: number; action: string;
      };
      const usageRecord: any = { subscriptionItemId, quantity, action };
      const { data, error } = await createUsageRecord(usageRecord);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Checkouts
    if (name === TOOLS.CREATE_CHECKOUT) {
      const { storeId, variantId, customPrice, productOptions, checkoutOptions, checkoutData, preview, expiresAt } = args as {
        storeId: number; variantId: number; customPrice?: number; productOptions?: any; checkoutOptions?: any;
        checkoutData?: any; preview?: boolean; expiresAt?: string;
      };
      const checkout: any = {};
      if (customPrice) checkout.customPrice = customPrice;
      if (productOptions) checkout.productOptions = productOptions;
      if (checkoutOptions) checkout.checkoutOptions = checkoutOptions;
      if (checkoutData) checkout.checkoutData = checkoutData;
      if (preview !== undefined) checkout.preview = preview;
      if (expiresAt) checkout.expiresAt = expiresAt;
      const { data, error } = await createCheckout(storeId, variantId, checkout);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Webhooks
    if (name === TOOLS.GET_WEBHOOK) {
      const { webhookId } = args as { webhookId: number };
      const { data, error } = await getWebhook(webhookId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.LIST_WEBHOOKS) {
      const { storeId, page } = args as { storeId?: number; page?: number };
      const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
      if (storeId) options.filter = { storeId };
      if (page) options.page = { number: page };
      const { data, error } = await listWebhooks(options);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.CREATE_WEBHOOK) {
      const { storeId, url, events, secret } = args as {
        storeId: number; url: string; events: string[]; secret?: string;
      };
      const webhook: any = { url, events };
      if (secret) webhook.secret = secret;
      const { data, error } = await createWebhook(storeId, webhook);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.UPDATE_WEBHOOK) {
      const { webhookId, url, events, secret } = args as {
        webhookId: number; url?: string; events?: string[]; secret?: string;
      };
      const updates: any = {};
      if (url) updates.url = url;
      if (events) updates.events = events;
      if (secret) updates.secret = secret;
      const { data, error } = await updateWebhook(webhookId, updates);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    if (name === TOOLS.DELETE_WEBHOOK) {
      const { webhookId } = args as { webhookId: number };
      const { data, error } = await deleteWebhook(webhookId);
      if (error) throw new Error(error.message);
      return createResponse(data);
    }

    // Salesforce (Bonus Integration)
    if (name === TOOLS.SYNC_CUSTOMER_TO_CRM) {
      const { email, name: customerName, revenue, company, title } = args as {
        email: string;
        name: string;
        revenue?: number;
        company?: string;
        title?: string;
      };

      if (!email || !customerName) {
        throw new Error("email and name are required");
      }

      try {
        const conn = await getSalesforceConnection();

        // Check if Lead with this email already exists
        // Using SOQL with proper escaping to prevent injection
        const escapedEmail = email.replace(/'/g, "''").replace(/\\/g, "\\\\");
        const soqlQuery = `SELECT Id FROM Lead WHERE Email = '${escapedEmail}' LIMIT 1`;
        const existingLeads = await conn.query<{ Id: string }>(soqlQuery);

        if (existingLeads.records && existingLeads.records.length > 0) {
          const leadId = existingLeads.records[0].Id;
          return createResponse({
            success: true,
            action: "found_existing",
            leadId: leadId,
            message: `Lead with email ${email} already exists in Salesforce`,
          });
        }

        // Parse name into FirstName and LastName
        // Split on spaces, use first part as FirstName, rest as LastName
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts.length > 1 ? nameParts[0] : "";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : customerName;

        // Create new Lead
        // Salesforce requires Company field
        const leadData: {
          FirstName?: string;
          LastName: string;
          Email: string;
          Company: string;
          LeadSource: string;
          Title?: string;
          AnnualRevenue?: number;
        } = {
          LastName: lastName,
          Email: email,
          Company: company || customerName,
          LeadSource: "AI Agent",
          Title: title,
          AnnualRevenue: revenue,
        };

        const result = await conn.sobject("Lead").create(leadData);

        if (!result.success) {
          throw new Error(`Salesforce Lead creation failed: ${JSON.stringify(result.errors)}`);
        }

        return createResponse({
          success: true,
          action: "created_new",
          leadId: result.id,
          message: `Created new Lead in Salesforce for ${email}`,
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    }

    // VOS Tools
    if (name === TOOLS.SEARCH_TRANSACTIONS_NATURAL) {
      const { query } = args as { query: string };
      try {
        const app = await getFirebaseApp();
        const db = app.firestore();
        
        // 1. Parse query for date range and intent
        const now = new Date();
        let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
        const q = query.toLowerCase();
        
        if (q.includes("yesterday")) {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        } else if (q.includes("today")) {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (q.includes("week")) {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (q.includes("month")) {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Keywords
        const isRefund = q.includes("refund");
        const isSub = q.includes("subscription");
        const isPack = q.includes("pack");
        const isOrder = q.includes("order") || (!isRefund && !isSub && !isPack);

        // 2. Query Lemon Squeezy
        const lsTransactions: any[] = [];
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        
        if (isOrder || isRefund) {
          const { data } = await listOrders({ filter: { storeId: storeId ? parseInt(storeId) : undefined } });
          if (data?.data) {
            lsTransactions.push(...data.data.filter((o: any) => {
              const created = new Date(o.attributes.created_at);
              if (created < startDate) return false;
              if (isRefund && o.attributes.status !== 'refunded') return false;
              return true;
            }));
          }
        }
        
        if (isSub) {
          const { data } = await listSubscriptions({ filter: { storeId: storeId ? parseInt(storeId) : undefined } });
          if (data?.data) {
            lsTransactions.push(...data.data.filter((s: any) => {
              const created = new Date(s.attributes.created_at);
              return created >= startDate;
            }));
          }
        }

        // 3. Query Firestore
        let firestoreQuery: admin.firestore.Query = db.collection('revenue_ledger').where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate));
        if (isSub) firestoreQuery = firestoreQuery.where('type', '==', 'subscription');
        if (isPack) firestoreQuery = firestoreQuery.where('type', '==', 'pack');
        
        const snapshot = await firestoreQuery.get();
        const firestoreEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 4. Discrepancies
        const discrepancies: any[] = [];
        firestoreEntries.forEach((entry: any) => {
          const lsMatch = lsTransactions.find(t => t.id === entry.transactionId || t.attributes.identifier === entry.transactionId);
          if (lsMatch) {
            const lsAmount = (lsMatch.attributes.total || lsMatch.attributes.amount) / 100;
            if (lsAmount !== entry.amountPaid) {
              discrepancies.push({
                transactionId: entry.transactionId,
                lsAmount,
                firestoreAmount: entry.amountPaid,
                delta: lsAmount - entry.amountPaid
              });
            }
          }
        });

        return createResponse({
          lemonSqueezy: {
            count: lsTransactions.length,
            totalAmount: lsTransactions.reduce((acc, t) => acc + (t.attributes.total || t.attributes.amount || 0) / 100, 0),
            transactions: lsTransactions.map(t => ({ id: t.id, status: t.attributes.status, amount: (t.attributes.total || t.attributes.amount) / 100 }))
          },
          firestore: {
            count: firestoreEntries.length,
            totalAmount: firestoreEntries.reduce((acc, e: any) => acc + (e.amountPaid || 0), 0),
            entries: firestoreEntries
          },
          discrepancies
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    }

    if (name === TOOLS.ANALYZE_CHURN_RISK) {
      try {
        const app = await getFirebaseApp();
        const db = app.firestore();
        
        // 1. Fetch active subscriptions from LS
        const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
        const { data } = await listSubscriptions({ filter: { storeId: storeId ? parseInt(storeId) : undefined, status: 'active' } });
        
        if (!data?.data) return createResponse({ totalActiveSubscriptions: 0, atRiskUsers: [], atRiskMRR: 0 });
        
        const activeSubs = data.data;
        const atRiskUsers: any[] = [];
        let atRiskMRR = 0;
        const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

        // 2. Cross-reference with Firestore users
        for (const sub of activeSubs) {
          const email = sub.attributes.user_email;
          const attrs = sub.attributes as any;
          const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
          
          if (userSnapshot.empty) {
            // No user found in Firestore but active subscription exists? Flag it.
            atRiskUsers.push({
              email,
              name: attrs.user_name || "Unknown",
              subscriptionId: sub.id,
              daysSinceLastLogin: -1, // Never logged in
              monthlyValue: attrs.variant_amount / 100 || 0
            });
            atRiskMRR += attrs.variant_amount / 100 || 0;
            continue;
          }

          const userData = userSnapshot.docs[0].data();
          const lastLogin = userData.lastLoginAt ? userData.lastLoginAt.toDate() : null;
          
          if (!lastLogin || lastLogin < twentyEightDaysAgo) {
            const daysSince = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            atRiskUsers.push({
              email: userData.email || email,
              name: userData.name || attrs.user_name,
              subscriptionId: sub.id,
              daysSinceLastLogin: daysSince,
              monthlyValue: attrs.variant_amount / 100 || 0
            });
            atRiskMRR += attrs.variant_amount / 100 || 0;
          }
        }

        return createResponse({
          totalActiveSubscriptions: activeSubs.length,
          atRiskUsers,
          atRiskMRR
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    }

    if (name === TOOLS.CANONIZE_DECISION) {
      const { decision, rationale, expectedOutcome, category } = args as {
        decision: string; rationale: string; expectedOutcome: string; category?: string;
      };
      try {
        const app = await getFirebaseApp();
        const db = app.firestore();
        
        // 1. Calculate Snapshot Metrics
        const activeSubscribersSnapshot = await db.collection('users').where('subscriptionStatus', '==', 'active').get();
        const usersWithCreditsSnapshot = await db.collection('users').where('creditBalance', '>', 0).get();
        
        // Use a Set to get unique active users
        const activeUserIds = new Set();
        activeSubscribersSnapshot.docs.forEach(doc => activeUserIds.add(doc.id));
        usersWithCreditsSnapshot.docs.forEach(doc => activeUserIds.add(doc.id));

        const snapshot = {
          activeUserCount: activeUserIds.size,
          activeSubscriberCount: activeSubscribersSnapshot.size,
          timestamp: new Date().toISOString()
        };

        // 2. Create Decision Document
        const decisionData = {
          decision,
          rationale,
          expectedOutcome,
          category: category || 'general',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          snapshot
        };

        const docRef = await db.collection('business_decisions').add(decisionData);

        return createResponse({
          success: true,
          id: docRef.id,
          snapshot
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return createErrorResponse(error);
  }
});

// Payment Context Resource (Proactive Context Feature)
interface PaymentEvent {
  timestamp: string;
  type: string;
  orderId?: number;
  customerEmail?: string;
  status?: string;
  amount?: string;
  message: string;
}

let paymentContext: PaymentEvent[] = [];
const MAX_CONTEXT_EVENTS = 10;

// Watch webhook log file if enabled
if (process.env.ENABLE_RESOURCES === "true" && process.env.WEBHOOK_LOG_PATH) {
  const logPath = process.env.WEBHOOK_LOG_PATH;
  console.error(`[Resources] Watching webhook log: ${logPath}`);
  
  try {
    watch(logPath, { persistent: true }, async (eventType) => {
      if (eventType === "change") {
        try {
          const content = await readFile(logPath, "utf-8");
          const lines = content.split("\n").filter(l => l.trim());
          const lastLine = lines[lines.length - 1];
          
          // Parse webhook event (adjust based on your log format)
          if (lastLine.includes("order") || lastLine.includes("subscription") || lastLine.includes("payment")) {
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
    console.error(`[Resources] Error watching log file: ${err}`);
  }
}

// Poll recent orders for failed payments if enabled
if (process.env.ENABLE_RESOURCES === "true" && process.env.POLL_FAILED_PAYMENTS === "true") {
  const pollInterval = parseInt(process.env.POLL_INTERVAL_MINUTES || "5") * 60 * 1000;
  
  setInterval(async () => {
    try {
      const { data, error } = await listOrders({ page: { number: 1, size: 5 } });
      if (error || !data?.data) return;
      
      const failedOrders = data.data.filter(order => {
        const status = order.attributes?.status;
        return status === "refunded" || status === "failed" || (status as string) === "cancelled";
      });
      
      for (const order of failedOrders) {
        const existing = paymentContext.find(e => e.orderId === parseInt(order.id));
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
  
  console.error(`[Resources] Polling failed payments every ${pollInterval / 60000} minutes`);
}

// Resource Handlers (Proactive Context)
if (process.env.ENABLE_RESOURCES === "true") {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "lemonsqueezy://payment-context",
          name: "Current Payment Context",
          description: "Recent payment events, failed payments, and important updates. Automatically updated from webhooks or polling.",
          mimeType: "application/json",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    if (uri === "lemonsqueezy://payment-context") {
      const context = {
        lastUpdated: new Date().toISOString(),
        totalEvents: paymentContext.length,
        events: paymentContext,
        summary: {
          failedPayments: paymentContext.filter(e => e.status === "failed" || e.status === "refunded").length,
          recentActivity: paymentContext.slice(0, 5).map(e => e.message),
        },
      };
      
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
}

// 5. Connect Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Lemon Squeezy MCP Server running on stdio");
  if (process.env.ENABLE_RESOURCES === "true") {
    console.error("[Resources] Proactive context enabled");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

