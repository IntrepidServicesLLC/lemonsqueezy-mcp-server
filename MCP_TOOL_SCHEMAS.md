# MCP Tool Schemas - For Debugging

## Tools Cursor Should See

When the MCP server is properly connected, Cursor should have access to these tools:

### list_orders
```json
{
  "name": "list_orders",
  "description": "List all orders with optional filtering. Useful for finding recent payments, the last successful payment, or browsing order history. Returns orders sorted by most recent first.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "description": "Optional: Page number for pagination"
      },
      "storeId": {
        "type": "number",
        "description": "Optional: Filter orders by store ID"
      }
    },
    "required": []
  }
}
```

**Example call:**
```json
{
  "page": 1
}
```

**Example response:**
```json
{
  "data": {
    "data": [
      {
        "id": "24782314",
        "attributes": {
          "user_name": "John McClane",
          "user_email": "support@intrepid.international",
          "total": 3900,
          "status": "paid",
          "refunded": false,
          "order_number": 24782314
        }
      }
    ]
  }
}
```

---

### sync_customer_to_crm
```json
{
  "name": "sync_customer_to_crm",
  "description": "Sync a customer to Salesforce CRM. Checks if a Lead with the email exists, and if not, creates a new Lead with source 'AI Agent'. Returns the Lead ID.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "email": {
        "type": "string",
        "description": "Customer email address"
      },
      "name": {
        "type": "string",
        "description": "Customer name"
      },
      "revenue": {
        "type": "number",
        "description": "Optional: Customer revenue/lifetime value"
      }
    },
    "required": ["email", "name"]
  }
}
```

**Example call:**
```json
{
  "email": "support@intrepid.international",
  "name": "John McClane",
  "revenue": 39.00
}
```

**Example response:**
```json
{
  "success": true,
  "action": "created",
  "leadId": "00QKa00000n2oxAMAQ",
  "message": "New Lead created in Salesforce with ID: 00QKa00000n2oxAMAQ"
}
```

---

### search_orders
```json
{
  "name": "search_orders",
  "description": "Search for orders by email or customer email. Useful for finding a payment when you only have a user's email address. Returns all orders matching the email.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "userEmail": {
        "type": "string",
        "description": "The email address of the customer"
      }
    },
    "required": ["userEmail"]
  }
}
```

**Example call:**
```json
{
  "userEmail": "support@intrepid.international"
}
```

---

## How to Verify Tools Are Loaded

### In Cursor:

1. **Check MCP Status:**
   - Open Command Palette (Cmd+Shift+P)
   - Type "MCP" to see MCP-related commands
   - Look for "MCP: Show Available Tools" or similar

2. **Check Output Panel:**
   - View → Output
   - Select "MCP" from dropdown
   - Should see: "Lemon Squeezy MCP Server running on stdio"

3. **Test a Simple Query:**
   - Ask: "List the available MCP tools"
   - Cursor should list all 45+ tools including the ones above

---

## Common Issues

### "Tool not found" or "Unknown tool"
**Cause:** MCP server not loaded or wrong tool name  
**Fix:** 
- Restart Cursor completely (Cmd+Q, not just close window)
- Check `~/.cursor/mcp.json` is saved correctly
- Verify tool name is exact (e.g., `list_orders` not `list-orders`)

### "Salesforce credentials not configured"
**Cause:** AWS Secrets Manager not configured  
**Fix:**
- Add `AWS_SALESFORCE_SECRET_NAME` to mcp.json env
- Add `AWS_REGION` to mcp.json env
- Run `aws configure` to set up AWS CLI credentials

### "LEMONSQUEEZY_API_KEY must be set"
**Cause:** API key missing from config  
**Fix:**
- Add `LEMONSQUEEZY_TEST_API_KEY` to mcp.json env
- Restart Cursor after adding

---

## Testing the Connection

### Quick Test:
Ask Cursor: "What was the last successful payment from Lemon Squeezy?"

**Expected behavior:**
1. Cursor calls `list_orders` with `{"page": 1}`
2. Cursor filters for paid, non-refunded orders
3. Cursor displays customer name, email, and amount

**If this works, the MCP server is properly connected!**

---

## Full Tool List

The server provides 45+ tools. Key ones:

**Orders:** list_orders, get_order, search_orders, generate_order_invoice, issue_order_refund  
**Customers:** list_customers, get_customer, create_customer, update_customer  
**Subscriptions:** list_subscriptions, get_subscription, update_subscription, cancel_subscription  
**Salesforce:** sync_customer_to_crm  

See the full list by asking: "What tools are available from the Lemon Squeezy MCP server?"
