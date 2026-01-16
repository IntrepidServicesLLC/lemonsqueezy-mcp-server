import {
  getStore,
  listStores,
  getCustomer,
  listCustomers,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  getProduct,
  listProducts,
  getVariant,
  listVariants,
  getOrder,
  listOrders,
  getOrderItem,
  listOrderItems,
  generateOrderInvoice,
  issueOrderRefund,
  getSubscription,
  listSubscriptions,
  updateSubscription,
  cancelSubscription,
  getSubscriptionItem,
  listSubscriptionItems,
  getSubscriptionItemCurrentUsage,
  getSubscriptionInvoice,
  listSubscriptionInvoices,
  generateSubscriptionInvoice,
  issueSubscriptionInvoiceRefund,
  getDiscount,
  listDiscounts,
  createDiscount,
  deleteDiscount,
  getLicenseKey,
  listLicenseKeys,
  updateLicenseKey,
  getFile,
  listFiles,
  getUsageRecord,
  listUsageRecords,
  createUsageRecord,
  createCheckout,
  getWebhook,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "@lemonsqueezy/lemonsqueezy.js";
import { createResponse } from "../../utils/response.js";
import { TOOLS } from "../definitions.js";
import { retry } from "../../utils/retry.js";

export async function handleGetStore(args: { storeId: number }) {
  const { storeId } = args;
  const { data, error } = await retry(
    () => getStore(storeId),
    undefined,
    { operation: "getStore", storeId }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListStores(args: { page?: number }) {
  const { page } = args;
  const options: { page?: { number?: number } } = {};
  if (page) options.page = { number: page };
  const { data, error } = await retry(
    () => listStores(options),
    undefined,
    { operation: "listStores", page }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetCustomer(args: { customerId: number }) {
  const { customerId } = args;
  const { data, error } = await retry(
    () => getCustomer(customerId),
    undefined,
    { operation: "getCustomer", customerId }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListCustomers(args: { email?: string; page?: number }) {
  const { email, page } = args;
  const options: { filter?: { email: string }; page?: { number?: number } } = {};
  if (email) options.filter = { email };
  if (page) options.page = { number: page };
  const { data, error } = await retry(
    () => listCustomers(options),
    undefined,
    { operation: "listCustomers", email, page }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCreateCustomer(args: {
  storeId: number;
  name: string;
  email: string;
  city?: string;
  country?: string;
  region?: string;
}) {
  const { storeId, name: customerName, email, city, country, region } = args;
  const customer: any = { name: customerName, email };
  if (city) customer.city = city;
  if (country) customer.country = country;
  if (region) customer.region = region;
  const { data, error } = await createCustomer(storeId, customer);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleUpdateCustomer(args: {
  customerId: number;
  name?: string;
  email?: string;
  city?: string;
  country?: string;
  region?: string;
}) {
  const { customerId, name, email, city, country, region } = args;
  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (city) updates.city = city;
  if (country) updates.country = country;
  if (region) updates.region = region;
  const { data, error } = await updateCustomer(customerId, updates);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleArchiveCustomer(args: { customerId: number }) {
  const { customerId } = args;
  const { data, error } = await archiveCustomer(customerId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetProduct(args: { productId: number }) {
  const { productId } = args;
  const { data, error } = await getProduct(productId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListProducts(args: { storeId?: number; page?: number }) {
  const { storeId, page } = args;
  const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
  if (storeId) options.filter = { storeId };
  if (page) options.page = { number: page };
  const { data, error } = await listProducts(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetVariant(args: { variantId: number }) {
  const { variantId } = args;
  const { data, error } = await getVariant(variantId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListVariants(args: { productId?: number; page?: number }) {
  const { productId, page } = args;
  const options: { filter?: { productId?: number }; page?: { number?: number } } = {};
  if (productId) options.filter = { productId };
  if (page) options.page = { number: page };
  const { data, error } = await listVariants(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetOrder(args: { orderId: number }) {
  const { orderId } = args;
  const { data, error } = await getOrder(orderId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListOrders(args: { page?: number; storeId?: number }) {
  const { page, storeId } = args;
  const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
  if (storeId) options.filter = { storeId };
  if (page) options.page = { number: page };
  const { data, error } = await retry(
    () => listOrders(options),
    undefined,
    { operation: "listOrders", page, storeId }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleSearchOrders(args: { userEmail: string }) {
  const { userEmail } = args;
  const { data, error } = await listOrders({ filter: { userEmail } });
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetOrderItem(args: { orderItemId: number }) {
  const { orderItemId } = args;
  const { data, error } = await getOrderItem(orderItemId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListOrderItems(args: { orderId?: number; page?: number }) {
  const { orderId, page } = args;
  const options: { filter?: { orderId?: number }; page?: { number?: number } } = {};
  if (orderId) options.filter = { orderId };
  if (page) options.page = { number: page };
  const { data, error } = await listOrderItems(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGenerateOrderInvoice(args: {
  orderId: number;
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}) {
  const { orderId, name, email, address, city, state, zip, country } = args;
  const params: any = {};
  if (name) params.name = name;
  if (email) params.email = email;
  if (address) params.address = address;
  if (city) params.city = city;
  if (state) params.state = state;
  if (zip) params.zip = zip;
  if (country) params.country = country;
  const { data, error } = await generateOrderInvoice(orderId, params);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleIssueOrderRefund(args: { orderId: number; amount: number }) {
  const { orderId, amount } = args;
  const { data, error } = await issueOrderRefund(orderId, amount);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetSubscription(args: { subscriptionId: number }) {
  const { subscriptionId } = args;
  const { data, error } = await getSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListSubscriptions(args: { storeId?: number; page?: number }) {
  const { storeId, page } = args;
  const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
  if (storeId) options.filter = { storeId };
  if (page) options.page = { number: page };
  const { data, error } = await retry(
    () => listSubscriptions(options),
    undefined,
    { operation: "listSubscriptions", page, storeId }
  );
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleUpdateSubscription(args: {
  subscriptionId: number;
  variantId?: number;
  productId?: number;
  billingAnchor?: number;
}) {
  const { subscriptionId, variantId, productId, billingAnchor } = args;
  const updates: any = {};
  if (variantId !== undefined) updates.variantId = variantId;
  if (productId !== undefined) updates.productId = productId;
  if (billingAnchor !== undefined) updates.billingAnchor = billingAnchor;
  const { data, error } = await updateSubscription(subscriptionId, updates);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCancelSubscription(args: { subscriptionId: number }) {
  const { subscriptionId } = args;
  const { data, error } = await cancelSubscription(subscriptionId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetSubscriptionItem(args: { subscriptionItemId: number }) {
  const { subscriptionItemId } = args;
  const { data, error } = await getSubscriptionItem(subscriptionItemId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListSubscriptionItems(args: { subscriptionId?: number; page?: number }) {
  const { subscriptionId, page } = args;
  const options: { filter?: { subscriptionId?: number }; page?: { number?: number } } = {};
  if (subscriptionId) options.filter = { subscriptionId };
  if (page) options.page = { number: page };
  const { data, error } = await listSubscriptionItems(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetSubscriptionItemUsage(args: { subscriptionItemId: number }) {
  const { subscriptionItemId } = args;
  const { data, error } = await getSubscriptionItemCurrentUsage(subscriptionItemId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetSubscriptionInvoice(args: { subscriptionInvoiceId: number }) {
  const { subscriptionInvoiceId } = args;
  const { data, error } = await getSubscriptionInvoice(subscriptionInvoiceId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListSubscriptionInvoices(args: { subscriptionId?: number; page?: number }) {
  const { subscriptionId, page } = args;
  const options: { filter?: { subscriptionId?: number }; page?: { number?: number } } = {};
  if (subscriptionId) options.filter = { subscriptionId };
  if (page) options.page = { number: page };
  const { data, error } = await listSubscriptionInvoices(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGenerateSubscriptionInvoice(args: { subscriptionInvoiceId: number }) {
  const { subscriptionInvoiceId } = args;
  const { data, error } = await generateSubscriptionInvoice(subscriptionInvoiceId, {});
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleIssueSubscriptionInvoiceRefund(args: {
  subscriptionInvoiceId: number;
  amount: number;
}) {
  const { subscriptionInvoiceId, amount } = args;
  const { data, error } = await issueSubscriptionInvoiceRefund(subscriptionInvoiceId, amount);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetDiscount(args: { discountId: number }) {
  const { discountId } = args;
  const { data, error } = await getDiscount(discountId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListDiscounts(args: { storeId?: number; page?: number }) {
  const { storeId, page } = args;
  const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
  if (storeId) options.filter = { storeId };
  if (page) options.page = { number: page };
  const { data, error } = await listDiscounts(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCreateDiscount(args: {
  storeId: number;
  name: string;
  code: string;
  amount: number;
  amountType: string;
  duration: string;
  durationInMonths?: number;
}) {
  const { storeId, name, code, amount, amountType, duration, durationInMonths } = args;
  const discount: any = { name, code, amount, amountType, duration };
  if (durationInMonths) discount.durationInMonths = durationInMonths;
  const { data, error } = await createDiscount(discount);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleDeleteDiscount(args: { discountId: number }) {
  const { discountId } = args;
  const { data, error } = await deleteDiscount(discountId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetLicenseKey(args: { licenseKeyId: number }) {
  const { licenseKeyId } = args;
  const { data, error } = await getLicenseKey(licenseKeyId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListLicenseKeys(args: { storeId?: number; orderId?: number; page?: number }) {
  const { storeId, orderId, page } = args;
  const options: { filter?: { storeId?: number; orderId?: number }; page?: { number?: number } } = {};
  if (storeId || orderId) {
    options.filter = {};
    if (storeId) options.filter.storeId = storeId;
    if (orderId) options.filter.orderId = orderId;
  }
  if (page) options.page = { number: page };
  const { data, error } = await listLicenseKeys(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleUpdateLicenseKey(args: { licenseKeyId: number; status?: string }) {
  const { licenseKeyId, status } = args;
  const updates: any = {};
  if (status) updates.status = status;
  const { data, error } = await updateLicenseKey(licenseKeyId, updates);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetFile(args: { fileId: number }) {
  const { fileId } = args;
  const { data, error } = await getFile(fileId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListFiles(args: { productId?: number; variantId?: number; page?: number }) {
  const { productId, variantId, page } = args;
  const options: { filter?: { productId?: number; variantId?: number }; page?: { number?: number } } = {};
  if (productId || variantId) {
    options.filter = {};
    if (productId) options.filter.productId = productId;
    if (variantId) options.filter.variantId = variantId;
  }
  if (page) options.page = { number: page };
  const { data, error } = await listFiles(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetUsageRecord(args: { usageRecordId: number }) {
  const { usageRecordId } = args;
  const { data, error } = await getUsageRecord(usageRecordId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListUsageRecords(args: { subscriptionItemId?: number; page?: number }) {
  const { subscriptionItemId, page } = args;
  const options: { filter?: { subscriptionItemId?: number }; page?: { number?: number } } = {};
  if (subscriptionItemId) options.filter = { subscriptionItemId };
  if (page) options.page = { number: page };
  const { data, error } = await listUsageRecords(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCreateUsageRecord(args: {
  subscriptionItemId: number;
  quantity: number;
  action: string;
}) {
  const { subscriptionItemId, quantity, action } = args;
  const usageRecord: any = { subscriptionItemId, quantity, action };
  const { data, error } = await createUsageRecord(usageRecord);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCreateCheckout(args: {
  storeId: number;
  variantId: number;
  customPrice?: number;
  productOptions?: any;
  checkoutOptions?: any;
  checkoutData?: any;
  preview?: boolean;
  expiresAt?: string;
}) {
  const { storeId, variantId, customPrice, productOptions, checkoutOptions, checkoutData, preview, expiresAt } =
    args;
  const checkout: any = {};
  if (customPrice) checkout.customPrice = customPrice;
  if (productOptions) checkout.productOptions = productOptions;
  if (checkoutOptions) checkout.checkoutOptions = checkoutOptions;
  if (checkoutData) checkout.checkoutData = checkoutData;
  if (preview !== undefined) checkout.preview = preview;
  if (expiresAt) checkout.expiresAt = expiresAt;
  const { data, error } = await createCheckout(storeId, variantId, checkout);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleGetWebhook(args: { webhookId: number }) {
  const { webhookId } = args;
  const { data, error } = await getWebhook(webhookId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleListWebhooks(args: { storeId?: number; page?: number }) {
  const { storeId, page } = args;
  const options: { filter?: { storeId?: number }; page?: { number?: number } } = {};
  if (storeId) options.filter = { storeId };
  if (page) options.page = { number: page };
  const { data, error } = await listWebhooks(options);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleCreateWebhook(args: {
  storeId: number;
  url: string;
  events: string[];
  secret?: string;
}) {
  const { storeId, url, events, secret } = args;
  const webhook: any = { url, events };
  if (secret) webhook.secret = secret;
  const { data, error } = await createWebhook(storeId, webhook);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleUpdateWebhook(args: {
  webhookId: number;
  url?: string;
  events?: string[];
  secret?: string;
}) {
  const { webhookId, url, events, secret } = args;
  const updates: any = {};
  if (url) updates.url = url;
  if (events) updates.events = events;
  if (secret) updates.secret = secret;
  const { data, error } = await updateWebhook(webhookId, updates);
  if (error) throw new Error(error.message);
  return createResponse(data);
}

export async function handleDeleteWebhook(args: { webhookId: number }) {
  const { webhookId } = args;
  const { data, error } = await deleteWebhook(webhookId);
  if (error) throw new Error(error.message);
  return createResponse(data);
}
