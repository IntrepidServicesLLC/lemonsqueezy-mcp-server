/**
 * SecretsProvider interface for pluggable secret management
 * Allows users to use AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager, etc.
 */
export interface SecretsProvider {
  getSecret(name: string): Promise<string>;
}

/**
 * Environment variable secrets provider (default)
 * Reads secrets directly from environment variables
 */
export class EnvSecretsProvider implements SecretsProvider {
  async getSecret(name: string): Promise<string> {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Secret ${name} not found in environment variables`);
    }
    return value;
  }
}

/**
 * AWS Secrets Manager provider
 * Retrieves secrets from AWS Secrets Manager
 */
export class AwsSecretsProvider implements SecretsProvider {
  private client: import("@aws-sdk/client-secrets-manager").SecretsManagerClient;
  private region: string;

  constructor(region: string) {
    this.region = region;
    const { SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");
    this.client = new SecretsManagerClient({ region });
  }

  async getSecret(name: string): Promise<string> {
    const { GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
    const command = new GetSecretValueCommand({ SecretId: name });
    const response = await this.client.send(command) as { SecretString?: string };

    if (!response.SecretString) {
      throw new Error(`Secret ${name} exists but has no SecretString value`);
    }

    return response.SecretString;
  }
}

/**
 * Get the configured secrets provider based on environment variables
 * Defaults to EnvSecretsProvider if no provider is specified
 */
export function getSecretsProvider(): SecretsProvider {
  const providerType = process.env.SECRETS_PROVIDER || "env";

  switch (providerType.toLowerCase()) {
    case "aws":
      const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
      return new AwsSecretsProvider(region);
    case "env":
    default:
      return new EnvSecretsProvider();
  }
}
