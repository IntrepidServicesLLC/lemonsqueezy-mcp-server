export const TOOLS = {
  // Stores
  GET_STORE: "get_store",
  LIST_STORES: "list_stores",
  // Customers
  GET_CUSTOMER: "get_customer",
  LIST_CUSTOMERS: "list_customers",
  CREATE_CUSTOMER: "create_customer",
  UPDATE_CUSTOMER: "update_customer",
  ARCHIVE_CUSTOMER: "archive_customer",
  // Products
  GET_PRODUCT: "get_product",
  LIST_PRODUCTS: "list_products",
  // Variants
  GET_VARIANT: "get_variant",
  LIST_VARIANTS: "list_variants",
  // Orders
  GET_ORDER: "get_order",
  LIST_ORDERS: "list_orders",
  SEARCH_ORDERS: "search_orders",
  GET_ORDER_ITEM: "get_order_item",
  LIST_ORDER_ITEMS: "list_order_items",
  GENERATE_ORDER_INVOICE: "generate_order_invoice",
  ISSUE_ORDER_REFUND: "issue_order_refund",
  // Subscriptions
  GET_SUBSCRIPTION: "get_subscription",
  LIST_SUBSCRIPTIONS: "list_subscriptions",
  UPDATE_SUBSCRIPTION: "update_subscription",
  CANCEL_SUBSCRIPTION: "cancel_subscription",
  // Subscription Items
  GET_SUBSCRIPTION_ITEM: "get_subscription_item",
  LIST_SUBSCRIPTION_ITEMS: "list_subscription_items",
  GET_SUBSCRIPTION_ITEM_USAGE: "get_subscription_item_usage",
  // Subscription Invoices
  GET_SUBSCRIPTION_INVOICE: "get_subscription_invoice",
  LIST_SUBSCRIPTION_INVOICES: "list_subscription_invoices",
  GENERATE_SUBSCRIPTION_INVOICE: "generate_subscription_invoice",
  ISSUE_SUBSCRIPTION_INVOICE_REFUND: "issue_subscription_invoice_refund",
  // Discounts
  GET_DISCOUNT: "get_discount",
  LIST_DISCOUNTS: "list_discounts",
  CREATE_DISCOUNT: "create_discount",
  DELETE_DISCOUNT: "delete_discount",
  // License Keys
  GET_LICENSE_KEY: "get_license_key",
  LIST_LICENSE_KEYS: "list_license_keys",
  UPDATE_LICENSE_KEY: "update_license_key",
  // Files
  GET_FILE: "get_file",
  LIST_FILES: "list_files",
  // Usage Records
  GET_USAGE_RECORD: "get_usage_record",
  LIST_USAGE_RECORDS: "list_usage_records",
  CREATE_USAGE_RECORD: "create_usage_record",
  // Checkouts
  CREATE_CHECKOUT: "create_checkout",
  // Webhooks
  GET_WEBHOOK: "get_webhook",
  LIST_WEBHOOKS: "list_webhooks",
  CREATE_WEBHOOK: "create_webhook",
  UPDATE_WEBHOOK: "update_webhook",
  DELETE_WEBHOOK: "delete_webhook",
  // Salesforce (Bonus)
  SYNC_CUSTOMER_TO_CRM: "sync_customer_to_crm",
  // VOS Tools
  SEARCH_TRANSACTIONS_NATURAL: "search_transactions_natural",
  ANALYZE_CHURN_RISK: "analyze_churn_risk",
  CANONIZE_DECISION: "canonize_decision",
  // Analytics Tools
  GET_FINANCIAL_METRICS: "get_financial_metrics",
  PREDICT_CHURN_RISK: "predict_churn_risk",
} as const;

export function getToolDefinitions() {
  return [
    // Stores
    {
      name: TOOLS.GET_STORE,
      description: "Get details of a specific store by ID.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "The store ID" },
        },
        required: ["storeId"],
      },
    },
    {
      name: TOOLS.LIST_STORES,
      description: "List all stores in your Lemon Squeezy account.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    // Customers
    {
      name: TOOLS.GET_CUSTOMER,
      description: "Get details of a specific customer by ID.",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "number", description: "The customer ID" },
        },
        required: ["customerId"],
      },
    },
    {
      name: TOOLS.LIST_CUSTOMERS,
      description:
        "List customers with optional filtering. Useful for finding customer information, subscription status, and order history.",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "Optional: Filter customers by email address" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.CREATE_CUSTOMER,
      description: "Create a new customer in a store.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "The store ID" },
          name: { type: "string", description: "Customer name" },
          email: { type: "string", description: "Customer email" },
          city: { type: "string", description: "Optional: Customer city" },
          country: { type: "string", description: "Optional: Customer country" },
          region: { type: "string", description: "Optional: Customer region/state" },
        },
        required: ["storeId", "name", "email"],
      },
    },
    {
      name: TOOLS.UPDATE_CUSTOMER,
      description: "Update an existing customer's information.",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "number", description: "The customer ID" },
          name: { type: "string", description: "Optional: Customer name" },
          email: { type: "string", description: "Optional: Customer email" },
          city: { type: "string", description: "Optional: Customer city" },
          country: { type: "string", description: "Optional: Customer country" },
          region: { type: "string", description: "Optional: Customer region/state" },
        },
        required: ["customerId"],
      },
    },
    {
      name: TOOLS.ARCHIVE_CUSTOMER,
      description: "Archive a customer (soft delete).",
      inputSchema: {
        type: "object",
        properties: {
          customerId: { type: "number", description: "The customer ID" },
        },
        required: ["customerId"],
      },
    },
    // Products
    {
      name: TOOLS.GET_PRODUCT,
      description: "Get details of a specific product by ID.",
      inputSchema: {
        type: "object",
        properties: {
          productId: { type: "number", description: "The product ID" },
        },
        required: ["productId"],
      },
    },
    {
      name: TOOLS.LIST_PRODUCTS,
      description: "List all products, optionally filtered by store.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by store ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    // Variants
    {
      name: TOOLS.GET_VARIANT,
      description: "Get details of a specific product variant by ID.",
      inputSchema: {
        type: "object",
        properties: {
          variantId: { type: "number", description: "The variant ID" },
        },
        required: ["variantId"],
      },
    },
    {
      name: TOOLS.LIST_VARIANTS,
      description: "List all product variants, optionally filtered by product or store.",
      inputSchema: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Optional: Filter by product ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    // Orders
    {
      name: TOOLS.GET_ORDER,
      description:
        "Retrieve details of a specific Lemon Squeezy order by ID. Use this to verify payment status, order total, and customer information.",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "number", description: "The unique ID of the order" },
        },
        required: ["orderId"],
      },
    },
    {
      name: TOOLS.LIST_ORDERS,
      description:
        "List all orders with optional filtering. Useful for finding recent payments, the last successful payment, or browsing order history. Returns orders sorted by most recent first.",
      inputSchema: {
        type: "object",
        properties: {
          page: { type: "number", description: "Optional: Page number for pagination" },
          storeId: { type: "number", description: "Optional: Filter orders by store ID" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.SEARCH_ORDERS,
      description:
        "Search for orders by email or customer email. Useful for finding a payment when you only have a user's email address. Returns all orders matching the email.",
      inputSchema: {
        type: "object",
        properties: {
          userEmail: { type: "string", description: "The email address of the customer" },
        },
        required: ["userEmail"],
      },
    },
    {
      name: TOOLS.GET_ORDER_ITEM,
      description: "Get details of a specific order item by ID.",
      inputSchema: {
        type: "object",
        properties: {
          orderItemId: { type: "number", description: "The order item ID" },
        },
        required: ["orderItemId"],
      },
    },
    {
      name: TOOLS.LIST_ORDER_ITEMS,
      description: "List order items, optionally filtered by order.",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "number", description: "Optional: Filter by order ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.GENERATE_ORDER_INVOICE,
      description: "Generate an invoice for an order.",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "number", description: "The order ID" },
          name: { type: "string", description: "Optional: Customer name for invoice" },
          email: { type: "string", description: "Optional: Customer email for invoice" },
          address: { type: "string", description: "Optional: Customer address" },
          city: { type: "string", description: "Optional: Customer city" },
          state: { type: "string", description: "Optional: Customer state/region" },
          zip: { type: "string", description: "Optional: Customer zip/postal code" },
          country: { type: "string", description: "Optional: Customer country" },
        },
        required: ["orderId"],
      },
    },
    {
      name: TOOLS.ISSUE_ORDER_REFUND,
      description: "Issue a refund for an order.",
      inputSchema: {
        type: "object",
        properties: {
          orderId: { type: "number", description: "The order ID" },
          amount: { type: "number", description: "The refund amount in cents" },
        },
        required: ["orderId", "amount"],
      },
    },
    // Subscriptions
    {
      name: TOOLS.GET_SUBSCRIPTION,
      description:
        "Check the status of a subscription. Use this to verify if credits should be active, subscription status, renewal dates, and billing information.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "number", description: "The ID of the subscription" },
        },
        required: ["subscriptionId"],
      },
    },
    {
      name: TOOLS.LIST_SUBSCRIPTIONS,
      description: "List all subscriptions, optionally filtered by store or customer.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by store ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.UPDATE_SUBSCRIPTION,
      description: "Update a subscription (e.g., change plan, update billing details).",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "number", description: "The subscription ID" },
          variantId: { type: "number", description: "Optional: New variant/plan ID" },
          productId: { type: "number", description: "Optional: New product ID" },
          billingAnchor: { type: "number", description: "Optional: Billing anchor day" },
        },
        required: ["subscriptionId"],
      },
    },
    {
      name: TOOLS.CANCEL_SUBSCRIPTION,
      description: "Cancel a subscription.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "number", description: "The subscription ID" },
        },
        required: ["subscriptionId"],
      },
    },
    // Subscription Items
    {
      name: TOOLS.GET_SUBSCRIPTION_ITEM,
      description: "Get details of a specific subscription item by ID.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionItemId: { type: "number", description: "The subscription item ID" },
        },
        required: ["subscriptionItemId"],
      },
    },
    {
      name: TOOLS.LIST_SUBSCRIPTION_ITEMS,
      description: "List subscription items, optionally filtered by subscription.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "number", description: "Optional: Filter by subscription ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.GET_SUBSCRIPTION_ITEM_USAGE,
      description: "Get current usage statistics for a subscription item (useful for usage-based billing).",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionItemId: { type: "number", description: "The subscription item ID" },
        },
        required: ["subscriptionItemId"],
      },
    },
    // Subscription Invoices
    {
      name: TOOLS.GET_SUBSCRIPTION_INVOICE,
      description: "Get details of a specific subscription invoice by ID.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
        },
        required: ["subscriptionInvoiceId"],
      },
    },
    {
      name: TOOLS.LIST_SUBSCRIPTION_INVOICES,
      description: "List subscription invoices, optionally filtered by subscription.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionId: { type: "number", description: "Optional: Filter by subscription ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.GENERATE_SUBSCRIPTION_INVOICE,
      description: "Generate an invoice for a subscription.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
        },
        required: ["subscriptionInvoiceId"],
      },
    },
    {
      name: TOOLS.ISSUE_SUBSCRIPTION_INVOICE_REFUND,
      description: "Issue a refund for a subscription invoice.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionInvoiceId: { type: "number", description: "The subscription invoice ID" },
          amount: { type: "number", description: "The refund amount in cents" },
        },
        required: ["subscriptionInvoiceId", "amount"],
      },
    },
    // Discounts
    {
      name: TOOLS.GET_DISCOUNT,
      description: "Get details of a specific discount by ID.",
      inputSchema: {
        type: "object",
        properties: {
          discountId: { type: "number", description: "The discount ID" },
        },
        required: ["discountId"],
      },
    },
    {
      name: TOOLS.LIST_DISCOUNTS,
      description: "List all discounts, optionally filtered by store.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by store ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.CREATE_DISCOUNT,
      description: "Create a new discount code.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "The store ID" },
          name: { type: "string", description: "Discount name" },
          code: { type: "string", description: "Discount code" },
          amount: { type: "number", description: "Discount amount" },
          amountType: { type: "string", description: "Discount type: 'percent' or 'fixed'" },
          duration: { type: "string", description: "Duration: 'once', 'forever', or 'repeating'" },
          durationInMonths: { type: "number", description: "Optional: Duration in months if repeating" },
        },
        required: ["storeId", "name", "code", "amount", "amountType", "duration"],
      },
    },
    {
      name: TOOLS.DELETE_DISCOUNT,
      description: "Delete a discount.",
      inputSchema: {
        type: "object",
        properties: {
          discountId: { type: "number", description: "The discount ID" },
        },
        required: ["discountId"],
      },
    },
    // License Keys
    {
      name: TOOLS.GET_LICENSE_KEY,
      description: "Get details of a specific license key by ID.",
      inputSchema: {
        type: "object",
        properties: {
          licenseKeyId: { type: "number", description: "The license key ID" },
        },
        required: ["licenseKeyId"],
      },
    },
    {
      name: TOOLS.LIST_LICENSE_KEYS,
      description: "List license keys, optionally filtered by store or order.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by store ID" },
          orderId: { type: "number", description: "Optional: Filter by order ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.UPDATE_LICENSE_KEY,
      description: "Update a license key (e.g., activate, deactivate, update status).",
      inputSchema: {
        type: "object",
        properties: {
          licenseKeyId: { type: "number", description: "The license key ID" },
          status: { type: "string", description: "Optional: Status ('active' or 'inactive')" },
        },
        required: ["licenseKeyId"],
      },
    },
    // Files
    {
      name: TOOLS.GET_FILE,
      description: "Get details of a specific file by ID.",
      inputSchema: {
        type: "object",
        properties: {
          fileId: { type: "number", description: "The file ID" },
        },
        required: ["fileId"],
      },
    },
    {
      name: TOOLS.LIST_FILES,
      description: "List files, optionally filtered by product or variant.",
      inputSchema: {
        type: "object",
        properties: {
          productId: { type: "number", description: "Optional: Filter by product ID" },
          variantId: { type: "number", description: "Optional: Filter by variant ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    // Usage Records
    {
      name: TOOLS.GET_USAGE_RECORD,
      description: "Get details of a specific usage record by ID.",
      inputSchema: {
        type: "object",
        properties: {
          usageRecordId: { type: "number", description: "The usage record ID" },
        },
        required: ["usageRecordId"],
      },
    },
    {
      name: TOOLS.LIST_USAGE_RECORDS,
      description: "List usage records, optionally filtered by subscription item.",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionItemId: { type: "number", description: "Optional: Filter by subscription item ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.CREATE_USAGE_RECORD,
      description: "Create a new usage record for a subscription item (for usage-based billing).",
      inputSchema: {
        type: "object",
        properties: {
          subscriptionItemId: { type: "number", description: "The subscription item ID" },
          quantity: { type: "number", description: "The usage quantity" },
          action: { type: "string", description: "The action (e.g., 'increment', 'set')" },
        },
        required: ["subscriptionItemId", "quantity", "action"],
      },
    },
    // Checkouts
    {
      name: TOOLS.CREATE_CHECKOUT,
      description: "Create a new checkout session for a product variant.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "The store ID" },
          variantId: { type: "number", description: "The variant ID" },
          customPrice: { type: "number", description: "Optional: Custom price in cents" },
          productOptions: { type: "object", description: "Optional: Product options" },
          checkoutOptions: { type: "object", description: "Optional: Checkout options" },
          checkoutData: { type: "object", description: "Optional: Additional checkout data" },
          preview: { type: "boolean", description: "Optional: Preview mode" },
          expiresAt: { type: "string", description: "Optional: Expiration date (ISO 8601)" },
        },
        required: ["storeId", "variantId"],
      },
    },
    // Webhooks
    {
      name: TOOLS.GET_WEBHOOK,
      description: "Get details of a specific webhook by ID.",
      inputSchema: {
        type: "object",
        properties: {
          webhookId: { type: "number", description: "The webhook ID" },
        },
        required: ["webhookId"],
      },
    },
    {
      name: TOOLS.LIST_WEBHOOKS,
      description: "List all webhooks, optionally filtered by store.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by store ID" },
          page: { type: "number", description: "Optional: Page number for pagination" },
        },
        required: [],
      },
    },
    {
      name: TOOLS.CREATE_WEBHOOK,
      description: "Create a new webhook.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "The store ID" },
          url: { type: "string", description: "The webhook URL" },
          events: { type: "array", items: { type: "string" }, description: "Array of event types to subscribe to" },
          secret: { type: "string", description: "Optional: Webhook secret for verification" },
        },
        required: ["storeId", "url", "events"],
      },
    },
    {
      name: TOOLS.UPDATE_WEBHOOK,
      description: "Update an existing webhook.",
      inputSchema: {
        type: "object",
        properties: {
          webhookId: { type: "number", description: "The webhook ID" },
          url: { type: "string", description: "Optional: New webhook URL" },
          events: { type: "array", items: { type: "string" }, description: "Optional: New event types" },
          secret: { type: "string", description: "Optional: New webhook secret" },
        },
        required: ["webhookId"],
      },
    },
    {
      name: TOOLS.DELETE_WEBHOOK,
      description: "Delete a webhook.",
      inputSchema: {
        type: "object",
        properties: {
          webhookId: { type: "number", description: "The webhook ID" },
        },
        required: ["webhookId"],
      },
    },
    // Salesforce (Bonus Integration)
    {
      name: TOOLS.SYNC_CUSTOMER_TO_CRM,
      description:
        "Sync a customer to Salesforce CRM. Checks if a Lead with the email exists, and if not, creates a new Lead with source 'AI Agent'. Returns the Lead ID.",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "Customer email address" },
          name: { type: "string", description: "Customer name" },
          revenue: { type: "number", description: "Optional: Customer revenue/lifetime value" },
          company: { type: "string", description: "Optional: Company name (if not provided, uses customer name)" },
          title: { type: "string", description: "Optional: Job title" },
        },
        required: ["email", "name"],
      },
    },
    // VOS Tools
    {
      name: TOOLS.SEARCH_TRANSACTIONS_NATURAL,
      description:
        "Search transactions using natural language (e.g., 'refunds from yesterday', 'subscriptions this week'). Cross-references Lemon Squeezy and Firestore.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural language query" },
        },
        required: ["query"],
      },
    },
    {
      name: TOOLS.ANALYZE_CHURN_RISK,
      description: "Identify users with active subscriptions who haven't logged in recently (>28 days).",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: TOOLS.CANONIZE_DECISION,
      description: "Record a business decision with a snapshot of current active user metrics.",
      inputSchema: {
        type: "object",
        properties: {
          decision: { type: "string", description: "What was decided" },
          rationale: { type: "string", description: "Why" },
          expectedOutcome: { type: "string", description: "What we expect to happen" },
          category: { type: "string", description: "Optional: 'pricing', 'product', 'marketing', etc." },
        },
        required: ["decision", "rationale", "expectedOutcome"],
      },
    },
    // Analytics Tools
    {
      name: TOOLS.GET_FINANCIAL_METRICS,
      description:
        "Calculate comprehensive financial metrics including revenue (total, by period, growth rates), MRR/ARR, subscription metrics, order statistics, and customer metrics. Supports date range filtering.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by specific store ID" },
          startDate: {
            type: "string",
            description: "Optional: Start date for metrics calculation (ISO 8601 format, e.g., '2024-01-01')",
          },
          endDate: {
            type: "string",
            description: "Optional: End date for metrics calculation (ISO 8601 format, e.g., '2024-12-31')",
          },
        },
        required: [],
      },
    },
    {
      name: TOOLS.PREDICT_CHURN_RISK,
      description:
        "Predict churn risk for active subscriptions by analyzing payment history, subscription age, status, and activity patterns. Returns risk scores (0-100) and risk levels (low/medium/high/critical) with detailed factors.",
      inputSchema: {
        type: "object",
        properties: {
          storeId: { type: "number", description: "Optional: Filter by specific store ID" },
          minRiskScore: {
            type: "number",
            description: "Optional: Minimum risk score to include (0-100, default: 0)",
          },
          limit: { type: "number", description: "Optional: Maximum number of predictions to return (default: 50)" },
        },
        required: [],
      },
    },
  ];
}
