import { z } from "zod";
import { TOOLS } from "../tools/definitions.js";

// Base schemas
const StoreIdSchema = z.number().int().positive();
const CustomerIdSchema = z.number().int().positive();
const ProductIdSchema = z.number().int().positive();
const VariantIdSchema = z.number().int().positive();
const OrderIdSchema = z.number().int().positive();
const SubscriptionIdSchema = z.number().int().positive();
const PageSchema = z.number().int().positive().optional();
const EmailSchema = z.string().email();
const NonEmptyStringSchema = z.string().min(1);

// Tool-specific schemas
export const ToolSchemas = {
  [TOOLS.GET_STORE]: z.object({
    storeId: StoreIdSchema,
  }),

  [TOOLS.LIST_STORES]: z.object({
    page: PageSchema,
  }),

  [TOOLS.GET_CUSTOMER]: z.object({
    customerId: CustomerIdSchema,
  }),

  [TOOLS.LIST_CUSTOMERS]: z.object({
    email: z.string().email().optional(),
    page: PageSchema,
  }),

  [TOOLS.CREATE_CUSTOMER]: z.object({
    storeId: StoreIdSchema,
    name: NonEmptyStringSchema,
    email: EmailSchema,
    city: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
  }),

  [TOOLS.UPDATE_CUSTOMER]: z.object({
    customerId: CustomerIdSchema,
    name: z.string().optional(),
    email: z.string().email().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
  }),

  [TOOLS.ARCHIVE_CUSTOMER]: z.object({
    customerId: CustomerIdSchema,
  }),

  [TOOLS.GET_PRODUCT]: z.object({
    productId: ProductIdSchema,
  }),

  [TOOLS.LIST_PRODUCTS]: z.object({
    storeId: StoreIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GET_VARIANT]: z.object({
    variantId: VariantIdSchema,
  }),

  [TOOLS.LIST_VARIANTS]: z.object({
    productId: ProductIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GET_ORDER]: z.object({
    orderId: OrderIdSchema,
  }),

  [TOOLS.LIST_ORDERS]: z.object({
    page: PageSchema,
    storeId: StoreIdSchema.optional(),
  }),

  [TOOLS.SEARCH_ORDERS]: z.object({
    userEmail: EmailSchema,
  }),

  [TOOLS.GET_ORDER_ITEM]: z.object({
    orderItemId: z.number().int().positive(),
  }),

  [TOOLS.LIST_ORDER_ITEMS]: z.object({
    orderId: OrderIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GENERATE_ORDER_INVOICE]: z.object({
    orderId: OrderIdSchema,
    name: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),

  [TOOLS.ISSUE_ORDER_REFUND]: z.object({
    orderId: OrderIdSchema,
    amount: z.number().int().nonnegative(),
  }),

  [TOOLS.GET_SUBSCRIPTION]: z.object({
    subscriptionId: SubscriptionIdSchema,
  }),

  [TOOLS.LIST_SUBSCRIPTIONS]: z.object({
    storeId: StoreIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.UPDATE_SUBSCRIPTION]: z.object({
    subscriptionId: SubscriptionIdSchema,
    variantId: VariantIdSchema.optional(),
    productId: ProductIdSchema.optional(),
    billingAnchor: z.number().int().positive().optional(),
  }),

  [TOOLS.CANCEL_SUBSCRIPTION]: z.object({
    subscriptionId: SubscriptionIdSchema,
  }),

  [TOOLS.GET_SUBSCRIPTION_ITEM]: z.object({
    subscriptionItemId: z.number().int().positive(),
  }),

  [TOOLS.LIST_SUBSCRIPTION_ITEMS]: z.object({
    subscriptionId: SubscriptionIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GET_SUBSCRIPTION_ITEM_USAGE]: z.object({
    subscriptionItemId: z.number().int().positive(),
  }),

  [TOOLS.GET_SUBSCRIPTION_INVOICE]: z.object({
    subscriptionInvoiceId: z.number().int().positive(),
  }),

  [TOOLS.LIST_SUBSCRIPTION_INVOICES]: z.object({
    subscriptionId: SubscriptionIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GENERATE_SUBSCRIPTION_INVOICE]: z.object({
    subscriptionInvoiceId: z.number().int().positive(),
  }),

  [TOOLS.ISSUE_SUBSCRIPTION_INVOICE_REFUND]: z.object({
    subscriptionInvoiceId: z.number().int().positive(),
    amount: z.number().int().nonnegative(),
  }),

  [TOOLS.GET_DISCOUNT]: z.object({
    discountId: z.number().int().positive(),
  }),

  [TOOLS.LIST_DISCOUNTS]: z.object({
    storeId: StoreIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.CREATE_DISCOUNT]: z.object({
    storeId: StoreIdSchema,
    name: NonEmptyStringSchema,
    code: NonEmptyStringSchema,
    amount: z.number().nonnegative(),
    amountType: z.enum(["percent", "fixed"]),
    duration: z.enum(["once", "forever", "repeating"]),
    durationInMonths: z.number().int().positive().optional(),
  }),

  [TOOLS.DELETE_DISCOUNT]: z.object({
    discountId: z.number().int().positive(),
  }),

  [TOOLS.GET_LICENSE_KEY]: z.object({
    licenseKeyId: z.number().int().positive(),
  }),

  [TOOLS.LIST_LICENSE_KEYS]: z.object({
    storeId: StoreIdSchema.optional(),
    orderId: OrderIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.UPDATE_LICENSE_KEY]: z.object({
    licenseKeyId: z.number().int().positive(),
    status: z.enum(["active", "inactive"]).optional(),
  }),

  [TOOLS.GET_FILE]: z.object({
    fileId: z.number().int().positive(),
  }),

  [TOOLS.LIST_FILES]: z.object({
    productId: ProductIdSchema.optional(),
    variantId: VariantIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.GET_USAGE_RECORD]: z.object({
    usageRecordId: z.number().int().positive(),
  }),

  [TOOLS.LIST_USAGE_RECORDS]: z.object({
    subscriptionItemId: z.number().int().positive().optional(),
    page: PageSchema,
  }),

  [TOOLS.CREATE_USAGE_RECORD]: z.object({
    subscriptionItemId: z.number().int().positive(),
    quantity: z.number().int().nonnegative(),
    action: z.string().min(1),
  }),

  [TOOLS.CREATE_CHECKOUT]: z.object({
    storeId: StoreIdSchema,
    variantId: VariantIdSchema,
    customPrice: z.number().int().nonnegative().optional(),
    productOptions: z.record(z.unknown()).optional(),
    checkoutOptions: z.record(z.unknown()).optional(),
    checkoutData: z.record(z.unknown()).optional(),
    preview: z.boolean().optional(),
    expiresAt: z.string().datetime().optional(),
  }),

  [TOOLS.GET_WEBHOOK]: z.object({
    webhookId: z.number().int().positive(),
  }),

  [TOOLS.LIST_WEBHOOKS]: z.object({
    storeId: StoreIdSchema.optional(),
    page: PageSchema,
  }),

  [TOOLS.CREATE_WEBHOOK]: z.object({
    storeId: StoreIdSchema,
    url: z.string().url(),
    events: z.array(z.string().min(1)).min(1),
    secret: z.string().min(6).max(40).optional(),
  }),

  [TOOLS.UPDATE_WEBHOOK]: z.object({
    webhookId: z.number().int().positive(),
    url: z.string().url().optional(),
    events: z.array(z.string().min(1)).optional(),
    secret: z.string().min(6).max(40).optional(),
  }),

  [TOOLS.DELETE_WEBHOOK]: z.object({
    webhookId: z.number().int().positive(),
  }),

  [TOOLS.SYNC_CUSTOMER_TO_CRM]: z.object({
    email: EmailSchema,
    name: NonEmptyStringSchema,
    revenue: z.number().nonnegative().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
  }),

  [TOOLS.SEARCH_TRANSACTIONS_NATURAL]: z.object({
    query: NonEmptyStringSchema,
  }),

  [TOOLS.ANALYZE_CHURN_RISK]: z.object({}),

  [TOOLS.CANONIZE_DECISION]: z.object({
    decision: NonEmptyStringSchema,
    rationale: NonEmptyStringSchema,
    expectedOutcome: NonEmptyStringSchema,
    category: z.string().optional(),
  }),

  [TOOLS.GET_FINANCIAL_METRICS]: z.object({
    storeId: StoreIdSchema.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  [TOOLS.PREDICT_CHURN_RISK]: z.object({
    storeId: StoreIdSchema.optional(),
    minRiskScore: z.number().int().min(0).max(100).optional(),
    limit: z.number().int().positive().optional(),
  }),
} as const;

export function validateToolArgs(toolName: string, args: unknown): unknown {
  const schema = ToolSchemas[toolName as keyof typeof ToolSchemas];
  if (!schema) {
    throw new Error(`No validation schema found for tool: ${toolName}`);
  }
  return schema.parse(args);
}
