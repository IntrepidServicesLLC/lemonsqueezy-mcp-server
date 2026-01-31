# Quick Reference - Working Configuration

## To sync last payment to Salesforce:
```bash
npx tsx sync-last-purchase.ts
```

## Environment (VERIFIED WORKING):
- AWS Secret: `AtlasEngine/SalesforceCreds` (us-west-2)
- Auth Type: JWT (client_id, username, private_key)
- Lemon Squeezy: API key in .env

## DO NOT:
- Question if AWS is configured (it is)
- Ask for credentials (they're in AWS Secrets Manager)
- Suggest manual setup (everything is ready)

## Just run the command. It works.
