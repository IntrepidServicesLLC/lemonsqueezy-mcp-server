import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { config } from "../config.js";

let secretsManagerClient: SecretsManagerClient | null = null;

/**
 * @deprecated Use getSecretsProvider() from ./secrets/provider.js instead
 * This function is kept for backward compatibility
 */
export function getSecretsManagerClient(): SecretsManagerClient {
  if (!secretsManagerClient) {
    secretsManagerClient = new SecretsManagerClient({
      region: config.awsRegion,
    });
  }
  return secretsManagerClient;
}
