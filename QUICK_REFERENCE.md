# Quick Reference: Sync Last Transaction to Salesforce

## For Cursor AI: Copy-Paste Ready Instructions

### Task: "Sync the last transaction to Salesforce"

**Step 1: Get the last order**
```
Use tool: list_orders
Parameters: {"page": 1}
```

**Step 2: Extract data from response**
```javascript
// From the first order in the response:
const order = response.data.data[0];
const name = order.attributes.user_name;
const email = order.attributes.user_email;
const revenue = order.attributes.total / 100;  // Convert cents to dollars!
```

**Step 3: Sync to Salesforce**
```
Use tool: sync_customer_to_crm
Parameters: {
  "email": email,
  "name": name,
  "revenue": revenue
}
```

**Step 4: Report success**
```
Tell user:
- Customer name
- Email
- Lead ID from response
- Whether it was created or found existing
```

---

## Critical Points

1. **Always divide total by 100** - Lemon Squeezy returns cents, Salesforce expects dollars
2. **Use exact email** - Must match exactly from the order
3. **Include full name** - Use the complete user_name from order
4. **Check for paid status** - Filter for status === "paid" and refunded === false

---

## Example Response Format

```
✅ Successfully synced to Salesforce!

Customer: John McClane
Email: support@intrepid.international
Revenue: $39.00
Lead ID: 00QKa00000n2oxAMAQ
Action: Created new Lead
```

---

## If It Fails

**Error: "Salesforce credentials not configured"**
- AWS_SALESFORCE_SECRET_NAME must be set in mcp.json
- AWS_REGION must be set in mcp.json
- User needs to run: `aws configure`

**Error: "email and name are required"**
- You forgot to pass email or name parameter
- Check that you extracted them from the order correctly

**Error: "LEMONSQUEEZY_API_KEY must be set"**
- LEMONSQUEEZY_TEST_API_KEY must be in mcp.json
- User needs to restart Cursor after adding it

---

## Tool Names (Exact)

- `list_orders` - Get orders
- `sync_customer_to_crm` - Sync to Salesforce
- `search_orders` - Find by email
- `get_order` - Get specific order

**Note:** Tool names use underscores, not hyphens!
