import admin from "firebase-admin";
import { readFile } from "fs/promises";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { config } from "../config.js";
import { getSecretsManagerClient } from "../utils/secrets.js";

let firebaseApp: admin.app.App | null = null;
let firebaseInitializationPromise: Promise<admin.app.App> | null = null;

async function getFirebaseCredentials(): Promise<any> {
  const secretName = config.awsFirebaseSecretName;
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
      throw new Error(
        `Failed to retrieve Firebase credentials from AWS Secrets Manager (${secretName}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  const serviceAccountKey = config.firebaseServiceAccountKey;
  if (serviceAccountKey) {
    try {
      // Check if it's a JSON string
      if (serviceAccountKey.trim().startsWith("{")) {
        return JSON.parse(serviceAccountKey);
      }
      // Otherwise treat as a path
      const content = await readFile(serviceAccountKey, "utf8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new Error(
    "Firebase credentials not configured. Set AWS_FIREBASE_SECRET_NAME or FIREBASE_SERVICE_ACCOUNT_KEY."
  );
}

export async function getFirebaseApp(): Promise<admin.app.App> {
  if (firebaseApp) return firebaseApp;
  if (firebaseInitializationPromise) return firebaseInitializationPromise;

  firebaseInitializationPromise = (async () => {
    try {
      const credentials = await getFirebaseCredentials();
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: config.firebaseProjectId || credentials.project_id,
      });
      return firebaseApp;
    } catch (error) {
      firebaseInitializationPromise = null;
      throw new Error(
        `Failed to initialize Firebase: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  })();

  return firebaseInitializationPromise;
}
