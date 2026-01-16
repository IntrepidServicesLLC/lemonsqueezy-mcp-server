import { Connection } from "jsforce";
import jwt from "jsonwebtoken";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { config } from "../config.js";
import { getSecretsManagerClient } from "../utils/secrets.js";
import { getSecretsProvider } from "../utils/secrets/provider.js";
import type { SalesforceConnection, SalesforceCredentials } from "../types.js";

let salesforceConnection: SalesforceConnection | null = null;
let salesforceConnectionPromise: Promise<SalesforceConnection> | null = null;

async function getSalesforceCredentials(): Promise<SalesforceCredentials> {
  // Option 1: Check if secrets provider is configured (new flexible approach)
  const secretName = config.awsSalesforceSecretName;
  const secretsProviderType = process.env.SECRETS_PROVIDER;
  
  if (secretName && secretsProviderType && secretsProviderType.toLowerCase() !== "env") {
    try {
      // Use the pluggable secrets provider
      const provider = getSecretsProvider();
      const secretString = await provider.getSecret(secretName);

      // Parse the secret (can be JSON string or plain text)
      let secretData: any;
      try {
        secretData = JSON.parse(secretString);
      } catch {
        // If not JSON, treat as plain text and try to parse as key=value pairs
        const lines = secretString.split("\n");
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
          const match = formattedPrivateKey.match(
            /^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/
          );
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
          loginUrl: secretData.loginUrl || secretData.LOGIN_URL || config.salesforceLoginUrl,
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
        `Failed to retrieve Salesforce credentials from secrets provider (${secretName}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Option 2: Legacy AWS Secrets Manager (if AWS_SALESFORCE_SECRET_NAME is set but SECRETS_PROVIDER is not)
  if (secretName && (!secretsProviderType || secretsProviderType.toLowerCase() === "env")) {
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
          const match = formattedPrivateKey.match(
            /^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/
          );
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
          loginUrl: secretData.loginUrl || secretData.LOGIN_URL || config.salesforceLoginUrl,
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

  // Option 3: Fallback to environment variables
  // Check for JWT authentication first
  const clientId = config.salesforceClientId;
  const username = config.salesforceUsername;
  const privateKey = config.salesforcePrivateKey;

  if (clientId && username && privateKey) {
    // Format private key: handle escaped newlines, space-separated format, and ensure proper PEM format
    let formattedPrivateKey = privateKey
      .replace(/\\n/g, "\n") // Replace escaped newlines (from JSON)
      .replace(/\\r/g, "") // Remove escaped carriage returns
      .trim();

    // If key is still a single line (no actual newlines), it might be space-separated
    // Format: "-----BEGIN PRIVATE KEY----- <base64> -----END PRIVATE KEY-----"
    if (!formattedPrivateKey.includes("\n")) {
      const match = formattedPrivateKey.match(
        /^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/
      );
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
      loginUrl: config.salesforceLoginUrl,
    };
  }

  // Fallback to username/password
  const password = config.salesforcePassword;
  const securityToken = config.salesforceToken;

  if (!username || !password || !securityToken) {
    throw new Error(
      "Salesforce credentials not configured. Either set AWS_SALESFORCE_SECRET_NAME for AWS Secrets Manager, or set SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and SALESFORCE_TOKEN (or SALESFORCE_CLIENT_ID, SALESFORCE_USERNAME, SALESFORCE_PRIVATE_KEY for JWT) environment variables."
    );
  }

  return { type: "username_password", username, password, securityToken };
}

export async function getSalesforceConnection(): Promise<SalesforceConnection> {
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
        const loginUrl = config.salesforceLoginUrl || "https://login.salesforce.com";
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
