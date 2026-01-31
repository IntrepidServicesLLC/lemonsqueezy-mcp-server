# Instructions for Cursor - Summary

## 📚 New Documentation Created

I've created comprehensive guides to help Cursor successfully use the MCP server:

### 1. **CURSOR_USAGE_GUIDE.md** - Complete Usage Guide
- Step-by-step instructions for common tasks
- Example workflows with exact tool calls
- Common mistakes to avoid
- Troubleshooting tips
- Best practices

### 2. **QUICK_REFERENCE.md** - Copy-Paste Ready
- Instant reference for syncing transactions
- Exact tool names and parameters
- Critical points checklist
- Error handling guide

### 3. **MCP_TOOL_SCHEMAS.md** - Technical Reference
- Exact tool schemas Cursor should see
- Example requests and responses
- Connection verification steps
- Full tool list

### 4. **Updated README.md**
- Added Cursor-specific troubleshooting section
- References to new usage guides
- Common mistakes highlighted

---

## 🎯 For Cursor: How to Sync Last Transaction

### Quick Steps:

1. **Call `list_orders` tool:**
   ```json
   {"page": 1}
   ```

2. **Extract from first order:**
   - `user_name` → name
   - `user_email` → email
   - `total / 100` → revenue (convert cents to dollars!)

3. **Call `sync_customer_to_crm` tool:**
   ```json
   {
     "email": "extracted_email",
     "name": "extracted_name",
     "revenue": extracted_total_in_dollars
   }
   ```

4. **Report the Lead ID from response**

---

## ⚠️ Critical Points for Cursor

### Must Do:
- ✅ Convert cents to dollars: `total / 100`
- ✅ Use exact tool names: `list_orders` (not `list-orders`)
- ✅ Include both email AND name for Salesforce sync
- ✅ Check order status is "paid" and not refunded

### Must Not Do:
- ❌ Don't pass cents to revenue field (must be dollars)
- ❌ Don't forget required parameters (email, name)
- ❌ Don't use wrong tool names (underscores, not hyphens)

---

## 🔍 Why Cursor Might Fail

### Common Reasons:

1. **Wrong revenue format:**
   - Lemon Squeezy returns cents (3900)
   - Salesforce expects dollars (39.00)
   - **Solution:** Always divide by 100

2. **Missing parameters:**
   - `sync_customer_to_crm` requires email AND name
   - **Solution:** Extract both from order

3. **Tool not found:**
   - MCP server not loaded
   - **Solution:** Restart Cursor completely

4. **Credentials error:**
   - AWS or Lemon Squeezy credentials missing
   - **Solution:** Check mcp.json has all env vars

---

## 🧪 Test It Works

### Ask Cursor:
> "Sync the last transaction from Lemon Squeezy to Salesforce"

### Expected Result:
```
✅ Successfully synced to Salesforce!

Customer: John McClane
Email: support@intrepid.international
Revenue: $39.00
Lead ID: 00QKa00000n2oxAMAQ
Action: Created new Lead
```

### If It Fails:
1. Check which tool call failed
2. Look at the error message
3. Refer to CURSOR_USAGE_GUIDE.md for that specific error
4. Verify mcp.json configuration
5. Restart Cursor completely

---

## 📖 Where to Look

- **General usage:** CURSOR_USAGE_GUIDE.md
- **Quick reference:** QUICK_REFERENCE.md
- **Tool schemas:** MCP_TOOL_SCHEMAS.md
- **Troubleshooting:** README.md (bottom section)

---

## ✅ Verification Checklist

Before asking Cursor to sync:

- [ ] MCP server is running (check Output panel)
- [ ] Tools are visible (ask "what tools are available?")
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] Lemon Squeezy API key in mcp.json
- [ ] Cursor has been restarted after config changes

---

## 🚀 Ready to Use

The MCP server is production-ready and Cursor now has complete documentation to use it successfully. All guides are beginner-friendly and include copy-paste ready examples.

**Next step:** Ask Cursor to sync a transaction and it should work! 🎉
