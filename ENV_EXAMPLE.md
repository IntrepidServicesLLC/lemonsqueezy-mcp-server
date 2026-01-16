# Environment Variables Example

Create a `.env` file in the project root with the following variables:

```bash
# Lemon Squeezy API Keys
# Get your API keys from: https://app.lemonsqueezy.com/settings/api
#
# For testing (recommended to start):
LEMONSQUEEZY_TEST_API_KEY=your_test_api_key_here
#
# For production (use when ready):
# LEMONSQUEEZY_API_KEY=your_production_api_key_here
#
# Note: If both are set, production key takes priority

# Salesforce Integration (Optional - Bonus Feature)
# Get your credentials from: https://help.salesforce.com/s/articleView?id=sf.user_security_token.htm
#
# Option 1: AWS Secrets Manager (Recommended for Production)
# Store your Salesforce credentials in AWS Secrets Manager as a JSON secret:
# {
#   "username": "your_salesforce_username@example.com",
#   "password": "your_salesforce_password",
#   "securityToken": "your_security_token"
# }
# Or for JWT authentication:
# {
#   "client_id": "your_connected_app_client_id",
#   "username": "your_username@example.com",
#   "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# }
# Or as plain text key=value pairs:
# username=your_salesforce_username@example.com
# password=your_salesforce_password
# securityToken=your_security_token
#
# Example configuration:
# AWS_SALESFORCE_SECRET_NAME=your-project/salesforce-credentials
# AWS_REGION=us-west-2  # Your AWS region (us-east-1, us-west-2, eu-west-1, etc.)
#
# SECURITY BEST PRACTICE: Do NOT set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY here.
# Instead, use AWS CLI to configure credentials: `aws configure`
# This stores credentials securely in ~/.aws/credentials (encrypted by OS).
# See README.md for full instructions.
#
# Note: Use your own secret name and region. The secret name should match
# exactly what you created in AWS Secrets Manager.
#
# Option 2: Environment Variables (For Local Development)
# SALESFORCE_USERNAME=your_salesforce_username@example.com
# SALESFORCE_PASSWORD=your_salesforce_password
# SALESFORCE_TOKEN=your_security_token
#
# Optional: Custom login URL (defaults to https://login.salesforce.com)
# SALESFORCE_LOGIN_URL=https://login.salesforce.com
#
# Note: Salesforce integration is optional. The server works perfectly without it.
# If AWS_SALESFORCE_SECRET_NAME is set, it will use AWS Secrets Manager.
# Otherwise, it falls back to environment variables.

# Proactive Context (Optional - Advanced Feature)
# Enable Resources capability for proactive AI context
#
# ENABLE_RESOURCES=true
# POLL_FAILED_PAYMENTS=true
# POLL_INTERVAL_MINUTES=5
# WEBHOOK_LOG_PATH=/path/to/webhook.log

# Webhook Listener (Sprint 2 - Event Engine)
# Real-time webhook processing replaces file watching
#
# WEBHOOK_PORT=3000
# LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_signing_secret_here
# ENABLE_NGROK=true
#
# Note: If ENABLE_NGROK=true, ngrok will create a public tunnel.
# The public URL will be logged on startup - use it to configure your Lemon Squeezy webhook.
```

**Note:** Copy this content to a `.env` file (not `.env.example`) for local development. The `.env` file is already in `.gitignore` and won't be committed.


