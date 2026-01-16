import { TOOLS } from "./definitions.js";
import * as lsHandlers from "./handlers/lemonsqueezy.js";
import * as sfHandlers from "./handlers/salesforce.js";
import * as vosHandlers from "./handlers/vos.js";
import * as analyticsHandlers from "./handlers/analytics.js";
import { createErrorResponse } from "../utils/response.js";
import { validateToolArgs } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

export async function handleToolCall(name: string, args: unknown) {
  try {
    // Validate input arguments
    let validatedArgs: unknown;
    try {
      validatedArgs = validateToolArgs(name, args);
    } catch (validationError) {
      logger.warn({ tool: name, args, error: validationError }, "Input validation failed");
      return createErrorResponse(
        new Error(`Invalid arguments for ${name}: ${validationError instanceof Error ? validationError.message : String(validationError)}`)
      );
    }
    // Stores
    if (name === TOOLS.GET_STORE) {
      return await lsHandlers.handleGetStore(validatedArgs as { storeId: number });
    }
    if (name === TOOLS.LIST_STORES) {
      return await lsHandlers.handleListStores(validatedArgs as { page?: number });
    }

    // Customers
    if (name === TOOLS.GET_CUSTOMER) {
      return await lsHandlers.handleGetCustomer(validatedArgs as { customerId: number });
    }
    if (name === TOOLS.LIST_CUSTOMERS) {
      return await lsHandlers.handleListCustomers(validatedArgs as { email?: string; page?: number });
    }
    if (name === TOOLS.CREATE_CUSTOMER) {
      return await lsHandlers.handleCreateCustomer(validatedArgs as {
        storeId: number;
        name: string;
        email: string;
        city?: string;
        country?: string;
        region?: string;
      });
    }
    if (name === TOOLS.UPDATE_CUSTOMER) {
      return await lsHandlers.handleUpdateCustomer(validatedArgs as {
        customerId: number;
        name?: string;
        email?: string;
        city?: string;
        country?: string;
        region?: string;
      });
    }
    if (name === TOOLS.ARCHIVE_CUSTOMER) {
      return await lsHandlers.handleArchiveCustomer(validatedArgs as { customerId: number });
    }

    // Products
    if (name === TOOLS.GET_PRODUCT) {
      return await lsHandlers.handleGetProduct(validatedArgs as { productId: number });
    }
    if (name === TOOLS.LIST_PRODUCTS) {
      return await lsHandlers.handleListProducts(validatedArgs as { storeId?: number; page?: number });
    }

    // Variants
    if (name === TOOLS.GET_VARIANT) {
      return await lsHandlers.handleGetVariant(validatedArgs as { variantId: number });
    }
    if (name === TOOLS.LIST_VARIANTS) {
      return await lsHandlers.handleListVariants(validatedArgs as { productId?: number; page?: number });
    }

    // Orders
    if (name === TOOLS.GET_ORDER) {
      return await lsHandlers.handleGetOrder(validatedArgs as { orderId: number });
    }
    if (name === TOOLS.LIST_ORDERS) {
      return await lsHandlers.handleListOrders(validatedArgs as { page?: number; storeId?: number });
    }
    if (name === TOOLS.SEARCH_ORDERS) {
      return await lsHandlers.handleSearchOrders(validatedArgs as { userEmail: string });
    }
    if (name === TOOLS.GET_ORDER_ITEM) {
      return await lsHandlers.handleGetOrderItem(validatedArgs as { orderItemId: number });
    }
    if (name === TOOLS.LIST_ORDER_ITEMS) {
      return await lsHandlers.handleListOrderItems(validatedArgs as { orderId?: number; page?: number });
    }
    if (name === TOOLS.GENERATE_ORDER_INVOICE) {
      return await lsHandlers.handleGenerateOrderInvoice(validatedArgs as {
        orderId: number;
        name?: string;
        email?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
      });
    }
    if (name === TOOLS.ISSUE_ORDER_REFUND) {
      return await lsHandlers.handleIssueOrderRefund(validatedArgs as { orderId: number; amount: number });
    }

    // Subscriptions
    if (name === TOOLS.GET_SUBSCRIPTION) {
      return await lsHandlers.handleGetSubscription(validatedArgs as { subscriptionId: number });
    }
    if (name === TOOLS.LIST_SUBSCRIPTIONS) {
      return await lsHandlers.handleListSubscriptions(validatedArgs as { storeId?: number; page?: number });
    }
    if (name === TOOLS.UPDATE_SUBSCRIPTION) {
      return await lsHandlers.handleUpdateSubscription(validatedArgs as {
        subscriptionId: number;
        variantId?: number;
        productId?: number;
        billingAnchor?: number;
      });
    }
    if (name === TOOLS.CANCEL_SUBSCRIPTION) {
      return await lsHandlers.handleCancelSubscription(validatedArgs as { subscriptionId: number });
    }

    // Subscription Items
    if (name === TOOLS.GET_SUBSCRIPTION_ITEM) {
      return await lsHandlers.handleGetSubscriptionItem(validatedArgs as { subscriptionItemId: number });
    }
    if (name === TOOLS.LIST_SUBSCRIPTION_ITEMS) {
      return await lsHandlers.handleListSubscriptionItems(validatedArgs as {
        subscriptionId?: number;
        page?: number;
      });
    }
    if (name === TOOLS.GET_SUBSCRIPTION_ITEM_USAGE) {
      return await lsHandlers.handleGetSubscriptionItemUsage(validatedArgs as { subscriptionItemId: number });
    }

    // Subscription Invoices
    if (name === TOOLS.GET_SUBSCRIPTION_INVOICE) {
      return await lsHandlers.handleGetSubscriptionInvoice(validatedArgs as { subscriptionInvoiceId: number });
    }
    if (name === TOOLS.LIST_SUBSCRIPTION_INVOICES) {
      return await lsHandlers.handleListSubscriptionInvoices(validatedArgs as {
        subscriptionId?: number;
        page?: number;
      });
    }
    if (name === TOOLS.GENERATE_SUBSCRIPTION_INVOICE) {
      return await lsHandlers.handleGenerateSubscriptionInvoice(validatedArgs as {
        subscriptionInvoiceId: number;
      });
    }
    if (name === TOOLS.ISSUE_SUBSCRIPTION_INVOICE_REFUND) {
      return await lsHandlers.handleIssueSubscriptionInvoiceRefund(validatedArgs as {
        subscriptionInvoiceId: number;
        amount: number;
      });
    }

    // Discounts
    if (name === TOOLS.GET_DISCOUNT) {
      return await lsHandlers.handleGetDiscount(validatedArgs as { discountId: number });
    }
    if (name === TOOLS.LIST_DISCOUNTS) {
      return await lsHandlers.handleListDiscounts(validatedArgs as { storeId?: number; page?: number });
    }
    if (name === TOOLS.CREATE_DISCOUNT) {
      return await lsHandlers.handleCreateDiscount(validatedArgs as {
        storeId: number;
        name: string;
        code: string;
        amount: number;
        amountType: string;
        duration: string;
        durationInMonths?: number;
      });
    }
    if (name === TOOLS.DELETE_DISCOUNT) {
      return await lsHandlers.handleDeleteDiscount(validatedArgs as { discountId: number });
    }

    // License Keys
    if (name === TOOLS.GET_LICENSE_KEY) {
      return await lsHandlers.handleGetLicenseKey(validatedArgs as { licenseKeyId: number });
    }
    if (name === TOOLS.LIST_LICENSE_KEYS) {
      return await lsHandlers.handleListLicenseKeys(validatedArgs as {
        storeId?: number;
        orderId?: number;
        page?: number;
      });
    }
    if (name === TOOLS.UPDATE_LICENSE_KEY) {
      return await lsHandlers.handleUpdateLicenseKey(validatedArgs as {
        licenseKeyId: number;
        status?: string;
      });
    }

    // Files
    if (name === TOOLS.GET_FILE) {
      return await lsHandlers.handleGetFile(validatedArgs as { fileId: number });
    }
    if (name === TOOLS.LIST_FILES) {
      return await lsHandlers.handleListFiles(validatedArgs as {
        productId?: number;
        variantId?: number;
        page?: number;
      });
    }

    // Usage Records
    if (name === TOOLS.GET_USAGE_RECORD) {
      return await lsHandlers.handleGetUsageRecord(validatedArgs as { usageRecordId: number });
    }
    if (name === TOOLS.LIST_USAGE_RECORDS) {
      return await lsHandlers.handleListUsageRecords(validatedArgs as {
        subscriptionItemId?: number;
        page?: number;
      });
    }
    if (name === TOOLS.CREATE_USAGE_RECORD) {
      return await lsHandlers.handleCreateUsageRecord(validatedArgs as {
        subscriptionItemId: number;
        quantity: number;
        action: string;
      });
    }

    // Checkouts
    if (name === TOOLS.CREATE_CHECKOUT) {
      return await lsHandlers.handleCreateCheckout(validatedArgs as {
        storeId: number;
        variantId: number;
        customPrice?: number;
        productOptions?: any;
        checkoutOptions?: any;
        checkoutData?: any;
        preview?: boolean;
        expiresAt?: string;
      });
    }

    // Webhooks
    if (name === TOOLS.GET_WEBHOOK) {
      return await lsHandlers.handleGetWebhook(validatedArgs as { webhookId: number });
    }
    if (name === TOOLS.LIST_WEBHOOKS) {
      return await lsHandlers.handleListWebhooks(validatedArgs as { storeId?: number; page?: number });
    }
    if (name === TOOLS.CREATE_WEBHOOK) {
      return await lsHandlers.handleCreateWebhook(validatedArgs as {
        storeId: number;
        url: string;
        events: string[];
        secret?: string;
      });
    }
    if (name === TOOLS.UPDATE_WEBHOOK) {
      return await lsHandlers.handleUpdateWebhook(validatedArgs as {
        webhookId: number;
        url?: string;
        events?: string[];
        secret?: string;
      });
    }
    if (name === TOOLS.DELETE_WEBHOOK) {
      return await lsHandlers.handleDeleteWebhook(validatedArgs as { webhookId: number });
    }

    // Salesforce
    if (name === TOOLS.SYNC_CUSTOMER_TO_CRM) {
      return await sfHandlers.handleSyncCustomerToCRM(validatedArgs as {
        email: string;
        name: string;
        revenue?: number;
        company?: string;
        title?: string;
      });
    }

    // VOS Tools
    if (name === TOOLS.SEARCH_TRANSACTIONS_NATURAL) {
      return await vosHandlers.handleSearchTransactionsNatural(validatedArgs as { query: string });
    }
    if (name === TOOLS.ANALYZE_CHURN_RISK) {
      return await vosHandlers.handleAnalyzeChurnRisk(validatedArgs as {});
    }
    if (name === TOOLS.CANONIZE_DECISION) {
      return await vosHandlers.handleCanonizeDecision(validatedArgs as {
        decision: string;
        rationale: string;
        expectedOutcome: string;
        category?: string;
      });
    }

    // Analytics Tools
    if (name === TOOLS.GET_FINANCIAL_METRICS) {
      return await analyticsHandlers.handleGetFinancialMetrics(validatedArgs as {
        storeId?: number;
        startDate?: string;
        endDate?: string;
      });
    }
    if (name === TOOLS.PREDICT_CHURN_RISK) {
      return await analyticsHandlers.handlePredictChurnRisk(validatedArgs as {
        storeId?: number;
        minRiskScore?: number;
        limit?: number;
      });
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return createErrorResponse(error);
  }
}
