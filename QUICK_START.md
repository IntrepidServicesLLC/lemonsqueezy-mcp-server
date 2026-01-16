# Quick Start Guide

## To sync last payment to Salesforce:
```bash
npx tsx sync-last-purchase.ts
```

## Prerequisites:
- AWS Secrets Manager configured with Salesforce credentials
- Secret name set in `AWS_SALESFORCE_SECRET_NAME` environment variable
- Auth Type: JWT (client_id, username, private_key) or Username/Password
- Lemon Squeezy API key configured in environment

## Configuration:
Set the following environment variables:
- `AWS_SALESFORCE_SECRET_NAME` - Your AWS Secrets Manager secret name
- `AWS_REGION` - AWS region (e.g., us-west-2)
- `LEMONSQUEEZY_API_KEY` or `LEMONSQUEEZY_TEST_API_KEY` - Your API key

See [ENV_EXAMPLE.md](./ENV_EXAMPLE.md) for complete configuration options.
