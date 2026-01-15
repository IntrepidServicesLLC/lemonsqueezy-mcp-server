#!/usr/bin/env node
import { lemonSqueezySetup, listOrders } from "@lemonsqueezy/lemonsqueezy.js";
import jsforce from "jsforce";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.LEMONSQUEEZY_API_KEY || process.env.LEMONSQUEEZY_TEST_API_KEY;
if (!apiKey) throw new Error("API key required");

lemonSqueezySetup({ apiKey });

async function getSalesforceConnection() {
  const secretName = process.env.AWS_SALESFORCE_SECRET_NAME;
  
  if (secretName) {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-east-1"
    });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
    const secret = JSON.parse(response.SecretString!);
    
    // Check for JWT authentication
    if (secret.client_id && secret.username && secret.private_key) {
      const loginUrl = secret.loginUrl || "https://login.salesforce.com";
      
      // Format private key - handle multiple formats
      let privateKey = secret.private_key
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .trim();
      
      // If key is single line (space-separated), convert to proper PEM format
      if (!privateKey.includes("\n")) {
        const match = privateKey.match(/^(-----BEGIN PRIVATE KEY-----) (.+) (-----END PRIVATE KEY-----)$/);
        if (match) {
          const [, header, body, footer] = match;
          const lines = [];
          for (let i = 0; i < body.length; i += 64) {
            lines.push(body.substring(i, i + 64));
          }
          privateKey = `${header}\n${lines.join("\n")}\n${footer}`;
        }
      }
      
      // Create JWT assertion
      const now = Math.floor(Date.now() / 1000);
      const assertion = jwt.sign(
        {
          iss: secret.client_id,
          sub: secret.username,
          aud: loginUrl,
          exp: now + 300,
          iat: now,
        },
        privateKey,
        { algorithm: "RS256" }
      );
      
      // Exchange JWT for access token
      const tokenUrl = `${loginUrl}/services/oauth2/token`;
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: assertion,
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`JWT auth failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
      }
      
      const tokenData = await tokenResponse.json() as { access_token: string; instance_url: string };
      return new jsforce.Connection({
        accessToken: tokenData.access_token,
        instanceUrl: tokenData.instance_url,
      });
    }
    
    // Fallback to username/password
    const conn = new jsforce.Connection({
      loginUrl: secret.loginUrl || "https://login.salesforce.com"
    });
    await conn.login(secret.username, secret.password + secret.securityToken);
    return conn;
  }
  
  // Environment variables fallback
  const conn = new jsforce.Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com"
  });
  await conn.login(
    process.env.SALESFORCE_USERNAME!,
    process.env.SALESFORCE_PASSWORD! + process.env.SALESFORCE_TOKEN!
  );
  return conn;
}

async function syncLastPurchase() {
  const { data, error } = await listOrders({ page: { number: 1, size: 1 } });
  if (error || !data?.data?.[0]) throw new Error("No orders found");

  const order = data.data[0];
  const attrs = order.attributes;
  const email = attrs?.user_email;
  const name = attrs?.user_name;
  
  if (!email || !name) throw new Error("Missing customer details");

  const conn = await getSalesforceConnection();
  
  // Check existing lead
  const existing = await conn.query<{ Id: string }>(
    `SELECT Id FROM Lead WHERE Email = '${email.replace(/'/g, "''")}' LIMIT 1`
  );

  if (existing.records?.length) {
    console.log(`Lead exists: ${existing.records[0].Id}`);
    return;
  }

  // Create lead with company and title
  const result = await conn.sobject("Lead").create({
    LastName: name,
    Email: email,
    Company: name,
    Title: "Customer",
    LeadSource: "AI Agent",
    AnnualRevenue: attrs?.total ? attrs.total / 100 : undefined
  });

  if (!result.success) throw new Error("Failed to create lead");
  console.log(`Created lead: ${result.id}`);
}

syncLastPurchase().catch(console.error);
