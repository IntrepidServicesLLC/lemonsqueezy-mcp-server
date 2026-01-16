# Quick Setup Checklist

Follow these steps to get your Lemon Squeezy MCP Server running:

## ✅ Pre-Flight Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Lemon Squeezy account created
- [ ] API key obtained from Lemon Squeezy dashboard

## 📦 Installation Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Verify build succeeded:**
   ```bash
   ls dist/index.js
   ```
   (Should show the file exists)

## 🔑 Configuration Steps

1. **Get your API key:**
   - Go to https://app.lemonsqueezy.com/settings/api
   - Create a new API key (start with Test key)
   - Copy it

2. **Configure your AI client:**
   - **VS Code:** Settings → Extensions → MCP
   - **Claude Desktop:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
   - **Other MCP clients:** Refer to your client's documentation for MCP server configuration

3. **Add this configuration:**
   ```json
   {
     "mcpServers": {
       "lemonsqueezy": {
         "command": "node",
         "args": ["/FULL/PATH/TO/THIS/PROJECT/dist/index.js"],
         "env": {
           "LEMONSQUEEZY_TEST_API_KEY": "paste_your_key_here"
         }
       }
     }
   }
   ```

4. **Important:**
   - Replace `/FULL/PATH/TO/THIS/PROJECT` with your actual path
   - Use absolute path (full path from root), not relative
   - Save the file
   - Restart your AI client completely

## 🧪 Testing

After restarting, ask your AI:

> "What was the last successful payment from Lemon Squeezy?"

If it works, you're done! 🎉

## 🆘 Common Issues

**"Tools not showing up"**
- Did you save the config file?
- Did you restart your AI client?
- Check the path is absolute and correct

**"Server not found"**
- Run `npm run build` again
- Verify `dist/index.js` exists
- Check the path in your config

**"API errors"**
- Verify your API key is correct
- Make sure you copied the full key
- Check key hasn't expired in Lemon Squeezy dashboard

## 📍 Finding Your Path

**Mac/Linux:**
```bash
pwd
# Copy the output and use it in your config
```

**Windows:**
```cmd
cd
# Copy the output and use it in your config (use forward slashes or double backslashes)
```

## 🎯 Next Steps

Once it's working:
- Try different queries (see README examples)
- Switch to production API key when ready
- Explore all 45+ available tools

---

## 🔐 Adding Salesforce Integration with AWS Secrets Manager (Optional)

If you want to add Salesforce CRM integration later using AWS Secrets Manager:

### Step 1: Create Secret in AWS Secrets Manager

1. Go to [AWS Secrets Manager Console](https://console.aws.amazon.com/secretsmanager/)
2. Click "Store a new secret"
3. Choose "Other type of secret"
4. Select "Plaintext" or "JSON"
5. **For JSON format**, enter:
   ```json
   {
     "username": "your_salesforce_username@example.com",
     "password": "your_salesforce_password",
     "securityToken": "your_security_token"
   }
   ```
6. **For plain text**, enter:
   ```
   username=your_salesforce_username@example.com
   password=your_salesforce_password
   securityToken=your_security_token
   ```
7. Name your secret (e.g., `your-project/salesforce-credentials` or `prod/salesforce-auth`)
8. Note your AWS region (e.g., `us-west-2`, `us-east-1`)

### Step 2: Update Your MCP Configuration

Add these environment variables to your MCP config file (location depends on your AI client):

```json
{
  "mcpServers": {
    "lemonsqueezy": {
      "command": "node",
      "args": ["/absolute/path/to/TypeScript-MCP-Server/dist/index.js"],
      "env": {
        "LEMONSQUEEZY_TEST_API_KEY": "your_test_api_key_here",
        "AWS_SALESFORCE_SECRET_NAME": "your-project/salesforce-credentials",
        "AWS_REGION": "us-west-2"
      }
    }
  }
}
```

**Do NOT include:**
- ❌ `AWS_ACCESS_KEY_ID`
- ❌ `AWS_SECRET_ACCESS_KEY`

**Important:** 
- Replace `your-project/salesforce-credentials` with **your own secret name** from AWS Secrets Manager
- Replace `us-east-1` with **your AWS region** where the secret is stored
- Use your own naming convention (e.g., `your-project/salesforce-credentials`, `prod/salesforce-auth`)

### Step 3: Configure AWS Credentials (IMPORTANT - Security Best Practice)

**DO NOT store AWS credentials directly in mcp.json.** Instead, use AWS CLI to configure credentials securely.

**Recommended Setup (AWS CLI Method):**

1. **Install AWS CLI** (if not already installed):
   ```bash
   brew install awscli  # macOS
   # or download from https://aws.amazon.com/cli/
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure
   ```
   
   Enter when prompted:
   - **AWS Access Key ID:** `AKIA...` (from AWS IAM Console)
   - **AWS Secret Access Key:** `...` (from AWS IAM Console)
   - **Default region:** `us-west-2` (or your region)
   - **Output format:** `json` (or press Enter)

3. **Validation:**
   
   Test AWS credentials are working:
   ```bash
   aws secretsmanager get-secret-value --secret-id your-project/salesforce-credentials --region us-west-2
   ```
   
   If successful, your MCP server will automatically use these credentials.

**Why this is better:**
- ✅ More secure (credentials not in plain text config files)
- ✅ AWS best practice
- ✅ Credentials stored in `~/.aws/credentials` (encrypted by OS)
- ✅ Works across all AWS tools automatically
- ✅ Easier credential rotation

**Note:** The server uses AWS SDK's default credential chain, which will automatically use credentials from `~/.aws/credentials` configured via `aws configure`.

### Step 4: Set IAM Permissions

Ensure your AWS credentials have permission to read the secret:

```json
{
  "Effect": "Allow",
  "Action": ["secretsmanager:GetSecretValue"],
  "Resource": "arn:aws:secretsmanager:us-east-1:account:secret:your-project/salesforce-credentials-*"
}
```

Replace `us-east-1` with your region, `account` with your AWS account ID, and `your-project/salesforce-credentials` with your secret name.

### Step 5: Restart Your AI Client

Save the MCP config file and restart your AI client completely.

**That's it!** The server will automatically fetch credentials from AWS Secrets Manager when you use Salesforce tools.


