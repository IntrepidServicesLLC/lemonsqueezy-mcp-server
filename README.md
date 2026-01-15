# Lemon Squeezy MCP Server

**Give your AI assistant direct access to your payment and subscription data.**

![Demo GIF showing the MCP server in action](./demo.gif)

This server lets you ask your AI assistant (in Cursor, VS Code, Claude Desktop, etc.) questions about your Lemon Squeezy payments, subscriptions, and customers—and get instant answers without leaving your editor.

## 🤔 What is This?

### What is Lemon Squeezy?
[Lemon Squeezy](https://lemonsqueezy.com) is a payment platform for selling digital products, subscriptions, and software licenses. If you use Lemon Squeezy to accept payments, this server connects your AI assistant to your payment data.

### What is MCP?
**MCP (Model Context Protocol)** is a way for AI assistants to use tools and access data from external services. Think of it as giving your AI "hands" to interact with your apps and APIs.

### What Does This Do?
This server acts as a bridge between your AI assistant and your Lemon Squeezy account. Instead of manually checking your dashboard, you can ask your AI:

- "What was the last successful payment?"
- "Find all orders for customer@example.com"
- "Is subscription #12345 still active?"
- "Show me all refunded orders from last week"

Your AI will automatically query Lemon Squeezy and give you the answer.

## ✨ Why Would I Use This?

**Before:** Open Lemon Squeezy dashboard → Search for order → Copy info → Switch back to your editor

**After:** Ask your AI → Get instant answer → Keep coding

**Benefits:**
- ⚡ **Instant answers** without leaving your editor
- 🤖 **Natural language queries** - just ask like you're talking to a colleague
- 🔍 **Smart search** - find payments, customers, subscriptions by email, ID, or date
- 📊 **Automatic analysis** - AI can spot patterns, summarize data, and answer complex questions
- 🔒 **Secure** - API keys stay local, never shared

## 🚀 Quick Start (5 Minutes)

> 💡 **New to this?** Check out [SETUP.md](./SETUP.md) for a step-by-step checklist.

### Step 1: Prerequisites

- **Node.js 18+** ([Download here](https://nodejs.org/))
- **A Lemon Squeezy account** with an API key ([Get one here](https://app.lemonsqueezy.com/settings/api))

### Step 2: Install

```bash
# Clone or download this repository
cd path/to/TypeScript-MCP-Server

# Install dependencies (includes jsforce for Salesforce integration)
npm install

# Build the project
npm run build
```

**Note:** After installation, you can also use this package via `npx`:
```bash
npx lemonsqueezy-mcp-server
```

### Step 3: Get Your API Key

1. Go to [Lemon Squeezy Settings → API](https://app.lemonsqueezy.com/settings/api)
2. Click "Create API Key"
3. Copy your **Test API Key** (for testing) or **Live API Key** (for production)

### Step 4: Configure Your AI Client

Choose your AI client and follow the instructions below:

#### For Cursor

1. Open or create `~/.cursor/mcp.json` (on Mac/Linux) or `%APPDATA%\Cursor\mcp.json` (on Windows)
2. Add this configuration (replace the path and API key):

```json
{
  "mcpServers": {
    "lemonsqueezy": {
      "command": "node",
      "args": ["/absolute/path/to/TypeScript-MCP-Server/dist/index.js"],
      "env": {
        "LEMONSQUEEZY_TEST_API_KEY": "your_test_api_key_here"
      }
    }
  }
}
```

**Optional - Add Salesforce Integration with AWS Secrets Manager:**

If you want to enable Salesforce CRM integration using AWS Secrets Manager, add these to the `env` section:

```json
{
  "mcpServers": {
    "lemonsqueezy": {
      "command": "node",
      "args": ["/absolute/path/to/TypeScript-MCP-Server/dist/index.js"],
      "env": {
        "LEMONSQUEEZY_TEST_API_KEY": "your_test_api_key_here",
        "AWS_SALESFORCE_SECRET_NAME": "your-project/salesforce-credentials",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

**Important:** Replace `your-project/salesforce-credentials` with your own secret name and `us-east-1` with your AWS region. See the [Salesforce Integration](#salesforce-integration-optional---bonus-feature) section below for full setup instructions.

**Important:** Replace `/absolute/path/to/TypeScript-MCP-Server` with the actual path to this project on your computer.

**Path Examples:**
- Mac/Linux: `/Users/johndoe/projects/TypeScript-MCP-Server/dist/index.js`
- Windows: `C:\Users\johndoe\projects\TypeScript-MCP-Server\dist\index.js` (or use forward slashes: `C:/Users/johndoe/projects/TypeScript-MCP-Server/dist/index.js`)

**To find your path:** Run `pwd` (Mac/Linux) or `cd` (Windows) in the project directory, then add `/dist/index.js` to the end.

3. **Save the file** and **restart Cursor completely**

#### For VS Code

1. Open VS Code Settings
2. Go to Extensions → MCP
3. Add a new MCP server with:
   - **Command:** `node`
   - **Args:** `["/absolute/path/to/TypeScript-MCP-Server/dist/index.js"]`
   - **Env:** `{"LEMONSQUEEZY_TEST_API_KEY": "your_test_api_key_here"}`

#### For Claude Desktop

1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2. Add the same configuration as Cursor above
3. Restart Claude Desktop

### Step 5: Test It!

After restarting your AI client, try asking:

> "What was the last successful payment from Lemon Squeezy?"

If it works, you're all set! 🎉

## 📋 What Can I Do With This?

This server gives your AI access to **45+ tools** for managing your Lemon Squeezy account, plus **bonus Salesforce CRM integration**:

### 💰 Orders & Payments
- Find orders by ID, email, or date
- Check payment status
- Generate invoices
- Issue refunds
- View order items

### 👥 Customers
- Search customers by email
- View customer details
- Create new customers
- Update customer information
- Archive customers

### 🔄 Subscriptions
- Check subscription status
- List all subscriptions
- Update subscription plans
- Cancel subscriptions
- View subscription invoices
- Check usage statistics

### 🎫 Discounts & Promotions
- List all discount codes
- Create new discounts
- Delete discounts
- View discount usage

### 📦 Products & Variants
- List all products
- View product details
- Check variant pricing
- View product files

### 🔑 License Keys
- View license keys
- Update license status
- Track license usage

### 🔔 Webhooks
- List webhooks
- Create new webhooks
- Update webhook settings
- Delete webhooks

### 🎁 Bonus: Salesforce CRM Integration
- **Sync customers to Salesforce** - Automatically create or find Leads in Salesforce
- **Smart lead management** - Check if Lead exists by email, create new Leads with "AI Agent" source
- **Revenue tracking** - Optionally sync customer revenue/lifetime value

### And More!
- Usage records for usage-based billing
- Checkout session creation
- File management
- Store information

## 💬 Example Queries

Here are some real examples of what you can ask:

> 💡 **For Cursor AI:** See [CURSOR_USAGE_GUIDE.md](./CURSOR_USAGE_GUIDE.md) for detailed tool usage instructions and [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for copy-paste ready examples.

**Payment Questions:**
- "What was the last successful payment?"
- "Find all orders for support@example.com"
- "Show me all refunded orders from December"
- "What's the total revenue this month?"

**Subscription Questions:**
- "Is subscription #12345 still active?"
- "List all active subscriptions"
- "When does subscription #67890 renew?"
- "Cancel subscription #12345"

**Customer Questions:**
- "Find customer with email user@example.com"
- "Show me all customers"
- "What subscriptions does customer #123 have?"

**Analysis Questions:**
- "Why didn't user@example.com get their credits?"
- "Show me all failed payments from last week"
- "What's the average order value?"

**Salesforce Integration:**
- "Sync customer john@example.com to Salesforce"
- "Add customer Jane Doe (jane@example.com) with $5000 revenue to CRM"

Your AI will automatically use the right tools to answer these questions!

## 🎯 Proactive Context (Optional Advanced Feature)

**Make your AI assistant proactive!** Enable this feature to have your AI automatically see recent payment events, failed payments, and important updates *before* you even ask.

### What It Does

When enabled, the server maintains a "Current Payment Context" resource that your AI can see automatically. Your AI might greet you with:

> "I noticed 3 failed payments from User X in the last hour. Would you like me to investigate?"

### How to Enable

Add these environment variables to your MCP config:

```json
{
  "mcpServers": {
    "lemonsqueezy": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LEMONSQUEEZY_TEST_API_KEY": "your_key",
        "ENABLE_RESOURCES": "true",
        "POLL_FAILED_PAYMENTS": "true",
        "POLL_INTERVAL_MINUTES": "5",
        "WEBHOOK_LOG_PATH": "/path/to/webhook.log"
      }
    }
  }
}
```

### Options

- **`ENABLE_RESOURCES`** (required): Set to `"true"` to enable proactive context
- **`POLL_FAILED_PAYMENTS`** (optional): Automatically poll for failed/refunded payments every few minutes
- **`POLL_INTERVAL_MINUTES`** (optional): How often to poll (default: 5 minutes)
- **`WEBHOOK_LOG_PATH`** (optional): Path to a log file that receives webhook events (watches for changes)

### Use Cases

- **Automatic monitoring:** AI alerts you to payment issues without being asked
- **Webhook integration:** Watch a log file that receives Lemon Squeezy webhooks
- **Proactive support:** AI knows about recent events before you ask

**Note:** This feature is optional and disabled by default. The server works perfectly without it!

## 🔑 Configuration

### API Keys

The server supports both **test** and **production** API keys:

- **`LEMONSQUEEZY_TEST_API_KEY`** - Use this for testing (safe, won't affect real payments)
- **`LEMONSQUEEZY_API_KEY`** - Use this for production (access to real payment data)

**Priority:** If both are set, production key is used automatically.

**Where to set it:**
- In your MCP config file (recommended for AI clients)
- In a `.env` file (for manual testing)

> 💡 **See [ENV_EXAMPLE.md](./ENV_EXAMPLE.md) for a complete example of all environment variables.**

### Salesforce Integration (Optional - Bonus Feature)

The server includes **optional Salesforce CRM integration**. To enable it:

#### Option 1: AWS Secrets Manager (Recommended for Production)

Store your Salesforce credentials securely in AWS Secrets Manager:

1. **Create a secret in AWS Secrets Manager:**
   - Secret name: e.g., `salesforce/credentials` or `prod/salesforce-auth`
   - Secret value (JSON format):
     ```json
     {
       "username": "your_username@example.com",
       "password": "your_password",
       "securityToken": "your_security_token"
     }
     ```
   - Or for JWT authentication:
     ```json
     {
       "client_id": "your_connected_app_client_id",
       "username": "your_username@example.com",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
     }
     ```
     
     **Note on Private Key Format:** The server automatically handles multiple private key formats:
     - Standard PEM format with newlines: `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----"`
     - Escaped newlines (JSON): `"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----"`
     - Space-separated (single line): `"-----BEGIN PRIVATE KEY----- MIIE... -----END PRIVATE KEY-----"`
     
     The server will automatically convert any of these formats to proper PEM format.
   - Or plain text format:
     ```
     username=your_username@example.com
     password=your_password
     securityToken=your_security_token
     ```

2. **AWS Credentials Configuration (IMPORTANT - Security Best Practice)**
   
   **DO NOT store AWS credentials directly in mcp.json.** Instead, use AWS CLI to configure credentials securely.
   
   **Recommended Setup (AWS CLI Method):**
   
   a. **Install AWS CLI** (if not already installed):
      ```bash
      brew install awscli  # macOS
      # or download from https://aws.amazon.com/cli/
      ```
   
   b. **Configure AWS credentials:**
      ```bash
      aws configure
      ```
      
      Enter when prompted:
      - **AWS Access Key ID:** `AKIA...` (from AWS IAM Console)
      - **AWS Secret Access Key:** `...` (from AWS IAM Console)
      - **Default region:** `us-west-2` (or your region)
      - **Output format:** `json` (or press Enter)
   
   c. **MCP Configuration - Only include these in mcp.json:**
      ```json
      {
        "mcpServers": {
          "lemonsqueezy": {
            "command": "node",
            "args": ["/absolute/path/to/TypeScript-MCP-Server/dist/index.js"],
            "env": {
              "LEMONSQUEEZY_TEST_API_KEY": "your_key_here",
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
   
   **Why this is better:**
   - ✅ More secure (credentials not in plain text config files)
   - ✅ AWS best practice
   - ✅ Credentials stored in `~/.aws/credentials` (encrypted by OS)
   - ✅ Works across all AWS tools automatically
   - ✅ Easier credential rotation

3. **Validation:**
   
   Test AWS credentials are working:
   ```bash
   aws secretsmanager get-secret-value --secret-id your-project/salesforce-credentials --region us-west-2
   ```
   
   If successful, your MCP server will automatically use these credentials.

4. **AWS IAM Permissions:** Ensure your AWS credentials have permission to read the secret:
   ```json
   {
     "Effect": "Allow",
     "Action": ["secretsmanager:GetSecretValue"],
     "Resource": "arn:aws:secretsmanager:us-west-2:account:secret:your-project/salesforce-credentials-*"
   }
   ```
   
   **Note:** Replace `us-west-2` with your region, `account` with your AWS account ID, and `your-project/salesforce-credentials` with your secret name.

#### Option 2: Environment Variables (For Local Development)

1. **Get your Salesforce credentials:**
   - Username: Your Salesforce username (email)
   - Password: Your Salesforce password
   - Security Token: Get from [Salesforce Security Settings](https://help.salesforce.com/s/articleView?id=sf.user_security_token.htm)

2. **Add to your MCP config:**
   ```json
   {
     "env": {
       "SALESFORCE_USERNAME": "your_username@example.com",
       "SALESFORCE_PASSWORD": "your_password",
       "SALESFORCE_TOKEN": "your_security_token"
     }
   }
   ```

3. **Optional:** Custom login URL (for sandboxes):
   ```json
   {
     "env": {
       "SALESFORCE_LOGIN_URL": "https://test.salesforce.com"
     }
   }
   ```

**Priority:** If `AWS_SALESFORCE_SECRET_NAME` is set, the server will use AWS Secrets Manager. Otherwise, it falls back to environment variables.

**Note:** Salesforce integration is completely optional. The server works perfectly without it. The connection is **lazy** - it only connects when you actually use the Salesforce tools.

## 🏗️ Architecture

```
┌─────────────────┐
│  AI Assistant   │  ← You ask questions here
│  (Cursor/VS Code│
│   /Claude/etc)  │
└────────┬────────┘
         │ MCP Protocol
         │ (automatic)
         ▼
┌─────────────────┐
│  MCP Server     │  ← This project
│  (index.ts)      │
└────────┬────────┘
         │ Lemon Squeezy SDK
         ▼
┌─────────────────┐
│  Lemon Squeezy  │  ← Your payment data
│  API            │
└─────────────────┘
```

## 🛠️ Development

### Project Structure

```
.
├── index.ts              # Main server code
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── dist/                # Compiled JavaScript (after build)
├── README.md            # This file
└── .env.example         # API key template (not included in repo)
```

### Scripts

- `npm install` - Install dependencies
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled server (for testing)
- `npm run dev` - Run in development mode

### Manual Testing

To test the server directly:

```bash
# Set your API key
export LEMONSQUEEZY_TEST_API_KEY="your_key_here"

# Run the server
npm start
```

The server will start and wait for MCP protocol messages (it's meant to be used by AI clients, not directly).

## ❓ Troubleshooting

### "I don't see the tools in my AI assistant"

1. **Did you save the MCP config file?** Make sure there's no "Modified" indicator
2. **Did you restart your AI client?** Cursor/VS Code only load MCP configs on startup
3. **Is the path correct?** Use an absolute path (full path from root), not a relative path
4. **Check the logs:** Look in your AI client's developer console or MCP logs for errors

### "Server won't start"

- **Check Node.js version:** Run `node --version` (should be 18+)
- **Install dependencies:** Run `npm install`
- **Build the project:** Run `npm run build`
- **Check API key:** Make sure it's set in your MCP config

### "API errors"

- **Verify API key:** Make sure it's correct and not expired
- **Check permissions:** Ensure your API key has the right permissions in Lemon Squeezy
- **Test vs Production:** Make sure you're using the right key type

### "Path not found"

- **Use absolute paths:** `/Users/yourname/projects/TypeScript-MCP-Server/dist/index.js` (Mac/Linux)
- **Windows paths:** `C:\Users\yourname\projects\TypeScript-MCP-Server\dist\index.js`
- **Check the file exists:** Run `ls dist/index.js` (Mac/Linux) or `dir dist\index.js` (Windows)

### Still having issues?

1. Check your AI client's MCP logs/console for specific error messages
2. Verify the server file exists: `test -f dist/index.js && echo "OK" || echo "Missing"`
3. Test the API key manually using the Lemon Squeezy dashboard

### "Cursor can't use the MCP tools"

**For Cursor AI specifically:**

1. **Verify MCP server is loaded:**
   - Open Cursor Settings → Features → Enable "Model Context Protocol"
   - Check the Output panel (View → Output) for MCP connection logs
   - Look for "Lemon Squeezy MCP Server running on stdio"

2. **Check tool availability:**
   - The AI should see tools like `list_orders`, `sync_customer_to_crm`, etc.
   - If tools aren't visible, restart Cursor completely (Cmd+Q on Mac, not just close window)

3. **Common tool usage mistakes:**
   - ❌ Wrong: Passing cents to `sync_customer_to_crm` revenue field
   - ✅ Correct: Convert to dollars first: `total / 100`
   - ❌ Wrong: Missing required fields (email, name)
   - ✅ Correct: Always provide email and name for Salesforce sync

4. **See detailed usage guide:**
   - Check [CURSOR_USAGE_GUIDE.md](./CURSOR_USAGE_GUIDE.md) for step-by-step instructions
   - Includes example workflows and common mistakes to avoid

## 🔒 Security Notes

- **Never commit your API keys** - They're in `.gitignore` for a reason
- **Use test keys for development** - Test keys can't affect real payments
- **Rotate keys regularly** - Especially if you share your code
- **Keep your `.env` file private** - It's excluded from git by default

## 🚀 Advanced Features

### Proactive Context (Resources)

Enable the Resources capability to give your AI automatic awareness of payment events. See the [Proactive Context section](#-proactive-context-optional-advanced-feature) above for setup instructions.

**Benefits:**
- AI sees recent events automatically
- Proactive alerts for failed payments
- Webhook integration support
- No need to ask - AI already knows

## 📚 Learn More

- **Lemon Squeezy:** [Documentation](https://docs.lemonsqueezy.com)
- **MCP Protocol:** [Specification](https://modelcontextprotocol.io)
- **Lemon Squeezy SDK:** [@lemonsqueezy/lemonsqueezy.js](https://www.npmjs.com/package/@lemonsqueezy/lemonsqueezy.js)

## 🤝 Contributing

Found a bug? Want to add a feature? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this however you want!

## 🙏 Support

- **Issues with this server:** Open an issue in this repository
- **Lemon Squeezy questions:** Check [Lemon Squeezy docs](https://docs.lemonsqueezy.com)
- **MCP questions:** See [MCP documentation](https://modelcontextprotocol.io)

---

**Made with ❤️ for developers who want their AI to understand their business**
