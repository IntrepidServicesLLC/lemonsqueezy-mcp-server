# Cursor Usage Guide - Lemon Squeezy MCP Server

## 🎯 How to Use the MCP Server in Cursor

This guide shows Cursor AI how to successfully use the Lemon Squeezy MCP server tools.

---

## ✅ Step-by-Step: Sync Last Transaction to Salesforce

### Step 1: List Recent Orders

**Tool:** `list_orders`  
**Input:**
```json
{
  "page": 1
}
```

**What you get:** List of recent orders with customer details.

**Extract from response:**
- `user_name` - Customer name
- `user_email` - Customer email
- `total` - Amount in cents (divide by 100 for dollars)
- `status` - Order status (look for "paid")

### Step 2: Sync to Salesforce

**Tool:** `sync_customer_to_crm`  
**Input:**
```json
{
  "email": "customer@example.com",
  "name": "Customer Name",
  "revenue": 39.00
}
```

**Important Notes:**
- `revenue` should be in dollars (not cents)
- `name` is the full customer name from the order
- `email` must be exact match from the order

**What you get:** 
- `leadId` - The Salesforce Lead ID
- `action` - Either "created" or "found_existing"

---

## 🔧 Available Tools

### Orders
- `list_orders` - Get recent orders (use `page: 1` for most recent)
- `get_order` - Get specific order by ID
- `search_orders` - Find orders by email

### Salesforce
- `sync_customer_to_crm` - Create or find Lead in Salesforce

---

## 💡 Example Queries You Can Handle

### "Sync the last transaction to Salesforce"
1. Call `list_orders` with `{"page": 1}`
2. Get first order from response
3. Extract: `user_name`, `user_email`, `total`
4. Convert total from cents to dollars: `total / 100`
5. Call `sync_customer_to_crm` with extracted data

### "Find orders for john@example.com"
1. Call `search_orders` with `{"userEmail": "john@example.com"}`
2. Display results

### "What was the last successful payment?"
1. Call `list_orders` with `{"page": 1}`
2. Find first order where `status === "paid"` and `refunded === false`
3. Display order details

---

## ⚠️ Common Mistakes to Avoid

### ❌ Wrong: Using cents for revenue
```json
{
  "revenue": 3900  // This is wrong!
}
```

### ✅ Correct: Using dollars for revenue
```json
{
  "revenue": 39.00  // Convert cents to dollars first
}
```

### ❌ Wrong: Missing required fields
```json
{
  "email": "test@example.com"
  // Missing "name" field!
}
```

### ✅ Correct: All required fields
```json
{
  "email": "test@example.com",
  "name": "John Doe",
  "revenue": 39.00
}
```

---

## 🐛 Troubleshooting

### "Tool not found" error
- Make sure Cursor has been restarted after MCP config changes
- Check that `~/.cursor/mcp.json` is saved correctly
- Verify the server path in mcp.json is correct

### "Salesforce credentials not configured" error
- Ensure `AWS_SALESFORCE_SECRET_NAME` is set in mcp.json
- Ensure `AWS_REGION` is set in mcp.json
- Verify AWS CLI credentials are configured: `aws sts get-caller-identity`

### "API key not set" error
- Ensure `LEMONSQUEEZY_TEST_API_KEY` is set in mcp.json
- Check that the API key is valid in Lemon Squeezy dashboard

---

## 📝 Quick Reference

### Get Last Order
```
Tool: list_orders
Input: {"page": 1}
Output: Array of orders (most recent first)
```

### Sync to Salesforce
```
Tool: sync_customer_to_crm
Input: {
  "email": "customer@example.com",
  "name": "Customer Name",
  "revenue": 39.00
}
Output: {
  "success": true,
  "leadId": "00QKa00000n2oxAMAQ",
  "action": "created"
}
```

---

## 🎓 Best Practices

1. **Always check order status** - Filter for `status === "paid"` and `refunded === false`
2. **Convert cents to dollars** - Divide `total` by 100 before passing to Salesforce
3. **Handle existing leads gracefully** - The tool will return existing Lead ID if email already exists
4. **Use full customer name** - Pass the complete `user_name` from the order
5. **Provide clear feedback** - Tell the user what Lead ID was created/found

---

## 🚀 Example Workflow

```
User: "Sync the last transaction to Salesforce"

Step 1: Call list_orders({"page": 1})
Step 2: Extract first paid order:
  - name: "John McClane"
  - email: "support@intrepid.international"
  - total: 3900 cents → 39.00 dollars

Step 3: Call sync_customer_to_crm({
  "email": "support@intrepid.international",
  "name": "John McClane",
  "revenue": 39.00
})

Step 4: Report result:
  "✅ Successfully synced John McClane to Salesforce!
   Lead ID: 00QKa00000n2oxAMAQ
   Revenue: $39.00"
```

---

## 🔍 Debugging Tips

If a tool call fails:
1. Check the error message carefully
2. Verify all required parameters are provided
3. Ensure data types are correct (numbers vs strings)
4. Check that the MCP server is running (look for errors in Cursor's output panel)
5. Try restarting Cursor completely

---

**Remember:** The MCP server handles all the complex authentication and API calls. You just need to call the right tools with the right parameters!
