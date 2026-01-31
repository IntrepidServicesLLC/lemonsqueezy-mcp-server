# Lemon Squeezy MCP Server

![Demo GIF showing the MCP server in action](./demo.gif)

## 📖 About
**Give your AI assistant direct access to your payment and subscription data.**

This server acts as a bridge between your AI assistant (like VS Code, Claude Desktop, or any MCP-compatible client) and your Lemon Squeezy account. Instead of manually logging into dashboards, searching for orders, and copy-pasting details, you can simply ask your AI questions like:
- *"What was the last sale?"*
- *"Is subscription #12345 still active?"*
- *"Find all customers named 'Alice'"*

Your AI will query the data securely and give you an instant answer, right in your code editor.

---

## 🌱 Beginner Level: Getting Started

**Who is this for?** You are new to CLI tools or just want to get this running quickly with minimal fuss.

### 1. Prerequisites
Before you start, make sure you have these two things installed on your computer:
*   **Node.js (Version 18 or higher):** This is the software that runs the server. [Download Node.js here](https://nodejs.org/).
*   **A Lemon Squeezy Account:** You need an account to get the data. [Sign up here](https://lemonsqueezy.com).

### 2. Get Your API Key
Think of this as your password for the server.
1.  Log in to your [Lemon Squeezy Dashboard](https://app.lemonsqueezy.com/settings/api).
2.  Go to **Settings** -> **API**.
3.  Click **Create API Key**.
4.  Copy the key (it starts with `ls_...`). **Keep this safe!**

### 3. Quick Installation
Open your terminal (Command Prompt on Windows, Terminal on Mac) and run these commands one by one:

```bash
# 1. Download the project
git clone https://github.com/IntrepidServicesLLC/lemonsqueezy-mcp-server.git
cd lemonsqueezy-mcp-server

# 2. Install the necessary files
npm install

# 3. Build the server
npm run build
```

### 4. Connect to Your AI Editor
The exact steps depend on which AI editor you're using. Here are the most common:

**One-copy-paste setup (Claude Desktop / Cursor / npx):**  
Add this to your MCP config file (e.g. `claude_desktop_config.json` or Cursor MCP settings). Replace `YOUR_KEY_HERE` with your Lemon Squeezy API key.

```json
"mcpServers": {
  "lemonsqueezy": {
    "command": "npx",
    "args": ["-y", "lemonsqueezy-mcp-server"],
    "env": {
      "LEMONSQUEEZY_API_KEY": "YOUR_KEY_HERE"
    }
  }
}
```

*(Requires the package to be [published on npm](https://www.npmjs.com/package/lemonsqueezy-mcp-server). For local development, use the path-based config below.)*

**For VS Code (local path):**
1.  Open VS Code Settings
2.  Go to Extensions → MCP
3.  Add a new MCP server with:
    *   **Command:** `node`
    *   **Args:** `["/absolute/path/to/lemonsqueezy-mcp-server/dist/index.js"]`
    *   **Env:** `{"LEMONSQUEEZY_API_KEY": "your_api_key_here"}`

**For Claude Desktop (local path):**
1.  Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
2.  Add the same configuration as above (command `node`, args with full path to `dist/index.js`)
3.  Restart Claude Desktop

**For Other MCP Clients:**
Refer to your client's documentation for adding MCP servers. The server runs via `node /path/to/dist/index.js` with the `LEMONSQUEEZY_API_KEY` environment variable set.

After configuring, restart your AI editor and try asking: *"Show me my last 5 orders."*

---

## 🚀 Medium User Level: Basic Usage & Configuration

**Who is this for?** You are comfortable with config files, environment variables, and want to customize how the server works.

### Philosophy: "Sensible Defaults"
This server is designed to work out of the box with just **one** required setting: your `LEMONSQUEEZY_API_KEY`. Everything else is optional and has pre-configured defaults that work for 90% of users.

### Configuration Options
You can configure the server using Environment Variables in your MCP settings or a `.env` file.

| Variable | Description | Default |
|----------|-------------|---------|
| `LEMONSQUEEZY_API_KEY` | **Required.** Your live API key. | - |
| `LEMONSQUEEZY_TEST_API_KEY` | Optional. Use for testing without affecting real data. | - |
| `ENABLE_RESOURCES` | Set to `true` to let the AI see "active context" like failed payments automatically. | `false` |
| `POLL_FAILED_PAYMENTS` | Set to `true` to check for failed payments every few minutes. | `false` |

### Common Tasks

**1. Using Test Mode**
If you want to develop without touching real money, generate a "Test API Key" in Lemon Squeezy and use `LEMONSQUEEZY_TEST_API_KEY`. The server will automatically prioritize the live key if both are present, so remove the live key to force test mode.

**2. Enabling Salesforce Integration (Bonus)**
Want to sync customers to your CRM?
Add these variables:
- `SALESFORCE_USERNAME`
- `SALESFORCE_PASSWORD`
- `SALESFORCE_TOKEN` (Security Token)

The tools for Salesforce (like `sync_customer_to_crm`) will automatically appear in your AI's toolkit.

### Troubleshooting
*   **"Command not found":** Ensure you ran `npm run build` after installing.
*   **"Authentication Error":** Double-check your API key. Did you copy an extra space?
*   **Logs:** The server outputs logs to the "MCP Log" window in your editor. Check there for specific error messages.

---

## 🛠️ Advanced User Level: Technical Documentation

**Who is this for?** Developers, Architects, and DevOps engineers looking for deep technical details, architecture diagrams, security compliance, and deployment strategies.

**Containers:** This repo has both a **Containerfile** and a **Dockerfile** with the same build. The Dockerfile exists so registries (e.g. Smithery) and CI that look for the filename `Dockerfile` can discover and build the image. You can build with Podman or Docker; see **[CONTAINERS.md](./CONTAINERS.md)** for why both exist and how to build.

For a comprehensive breakdown of the system architecture, code modules, security protocols, and enterprise deployment guides, please refer to the:

👉 **[Technical Solution Design Document (TSD)](./TECHNICAL_SOLUTION_DESIGN.md)**

The TSD covers:
*   **System Architecture & Diagrams**
*   **Module Interflows & Data Paths**
*   **Security & Compliance (AWS Secrets Manager, etc.)**
*   **Deployment (Docker/OCI Containers)**
*   **Risk Mitigation Strategies**
