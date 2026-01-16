import { listOrders, listSubscriptions } from "@lemonsqueezy/lemonsqueezy.js";
import { config } from "../../config.js";
import { createResponse, createErrorResponse } from "../../utils/response.js";

interface FinancialMetrics {
  revenue: {
    total: number;
    totalFormatted: string;
    byPeriod: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
      last30Days: number;
      last90Days: number;
    };
    growth: {
      weekOverWeek: number;
      monthOverMonth: number;
      yearOverYear: number;
    };
  };
  subscriptions: {
    mrr: number;
    arr: number;
    activeCount: number;
    cancelledCount: number;
    newThisMonth: number;
    churnRate: number;
  };
  orders: {
    total: number;
    averageOrderValue: number;
    averageOrderValueFormatted: string;
    paid: number;
    refunded: number;
    failed: number;
    byPeriod: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      thisYear: number;
    };
  };
  customers: {
    total: number;
    newThisMonth: number;
    withActiveSubscriptions: number;
  };
  period: {
    calculatedAt: string;
    storeId?: string;
  };
}

interface ChurnRiskPrediction {
  subscriptionId: string;
  customerEmail: string;
  customerName: string;
  riskScore: number; // 0-100, higher = more risk
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: string[];
  subscriptionValue: number;
  subscriptionValueFormatted: string;
  daysActive: number;
  lastPaymentDate?: string;
  paymentFailures: number;
  status: string;
}

export async function handleGetFinancialMetrics(args: {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const { storeId, startDate, endDate } = args;
    const storeIdFilter = storeId || (config.lemonSqueezyStoreId ? parseInt(config.lemonSqueezyStoreId) : undefined);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYear = new Date(now.getFullYear() - 1, 0, 1);

    // Fetch all orders
    const allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await listOrders({
        filter: storeIdFilter ? { storeId: storeIdFilter } : undefined,
        page: { number: page, size: 100 },
      });

      if (error) throw new Error(error.message);
      if (!data?.data) break;

      allOrders.push(...data.data);

      // Check if there are more pages
      if (data.meta?.page?.lastPage && page >= data.meta.page.lastPage) {
        hasMore = false;
      } else {
        page++;
        if (page > 100) break; // Safety limit
      }
    }

    // Fetch all subscriptions
    const allSubscriptions: any[] = [];
    page = 1;
    hasMore = true;

    while (hasMore) {
      const { data, error } = await listSubscriptions({
        filter: storeIdFilter ? { storeId: storeIdFilter } : undefined,
        page: { number: page, size: 100 },
      });

      if (error) throw new Error(error.message);
      if (!data?.data) break;

      allSubscriptions.push(...data.data);

      if (data.meta?.page?.lastPage && page >= data.meta.page.lastPage) {
        hasMore = false;
      } else {
        page++;
        if (page > 100) break;
      }
    }

    // Helper to parse amount (handles both cents and formatted strings)
    const parseAmount = (amount: any): number => {
      if (typeof amount === "number") return amount / 100; // Assume cents
      if (typeof amount === "string") {
        const cleaned = amount.replace(/[^0-9.-]/g, "");
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    // Filter orders by date if provided
    const filterDate = (order: any): boolean => {
      if (!startDate && !endDate) return true;
      const orderDate = new Date(order.attributes.created_at);
      if (startDate && orderDate < new Date(startDate)) return false;
      if (endDate && orderDate > new Date(endDate)) return false;
      return true;
    };

    const filteredOrders = allOrders.filter(filterDate);

    // Calculate revenue metrics
    const calculateRevenue = (orders: any[], start: Date, end: Date): number => {
      return orders
        .filter((o) => {
          const orderDate = new Date(o.attributes.created_at);
          return orderDate >= start && orderDate <= end && o.attributes.status === "paid";
        })
        .reduce((sum, o) => sum + parseAmount(o.attributes.total), 0);
    };

    const revenueToday = calculateRevenue(filteredOrders, today, now);
    const revenueThisWeek = calculateRevenue(filteredOrders, thisWeek, now);
    const revenueThisMonth = calculateRevenue(filteredOrders, thisMonth, now);
    const revenueThisYear = calculateRevenue(filteredOrders, thisYear, now);
    const revenueLast30Days = calculateRevenue(filteredOrders, last30Days, now);
    const revenueLast90Days = calculateRevenue(filteredOrders, last90Days, now);
    const revenueLastWeek = calculateRevenue(filteredOrders, lastWeek, thisWeek);
    const revenueLastMonth = calculateRevenue(filteredOrders, lastMonth, thisMonth);
    const revenueLastYear = calculateRevenue(filteredOrders, lastYear, thisYear);

    const totalRevenue = filteredOrders
      .filter((o) => o.attributes.status === "paid")
      .reduce((sum, o) => sum + parseAmount(o.attributes.total), 0);

    // Calculate growth rates
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Calculate MRR and ARR from active subscriptions
    const activeSubs = allSubscriptions.filter((s) => s.attributes.status === "active");
    const mrr = activeSubs.reduce((sum: number, s: any) => {
      const amount = parseAmount(s.attributes.variant_amount || s.attributes.recurring_amount);
      // Normalize to monthly (assume amounts are already monthly, adjust if needed)
      return sum + amount;
    }, 0);
    const arr = mrr * 12;

    // Calculate subscription metrics
    const cancelledSubs = allSubscriptions.filter((s) => s.attributes.status === "cancelled");
    const newSubsThisMonth = allSubscriptions.filter((s) => {
      const created = new Date(s.attributes.created_at);
      return created >= thisMonth && created <= now;
    });

    const churnRate = activeSubs.length + cancelledSubs.length > 0
      ? (cancelledSubs.length / (activeSubs.length + cancelledSubs.length)) * 100
      : 0;

    // Calculate order metrics
    const paidOrders = filteredOrders.filter((o) => o.attributes.status === "paid");
    const refundedOrders = filteredOrders.filter((o) => o.attributes.status === "refunded");
    const failedOrders = filteredOrders.filter((o) => o.attributes.status === "failed");

    const averageOrderValue = paidOrders.length > 0
      ? totalRevenue / paidOrders.length
      : 0;

    const ordersToday = filteredOrders.filter((o) => {
      const orderDate = new Date(o.attributes.created_at);
      return orderDate >= today && orderDate <= now;
    }).length;

    const ordersThisWeek = filteredOrders.filter((o) => {
      const orderDate = new Date(o.attributes.created_at);
      return orderDate >= thisWeek && orderDate <= now;
    }).length;

    const ordersThisMonth = filteredOrders.filter((o) => {
      const orderDate = new Date(o.attributes.created_at);
      return orderDate >= thisMonth && orderDate <= now;
    }).length;

    const ordersThisYear = filteredOrders.filter((o) => {
      const orderDate = new Date(o.attributes.created_at);
      return orderDate >= thisYear && orderDate <= now;
    }).length;

    // Calculate customer metrics
    const uniqueCustomers = new Set<string>();
    filteredOrders.forEach((o) => {
      if (o.attributes.user_email) uniqueCustomers.add(o.attributes.user_email);
    });

    const newCustomersThisMonth = new Set<string>();
    filteredOrders
      .filter((o) => {
        const orderDate = new Date(o.attributes.created_at);
        return orderDate >= thisMonth && orderDate <= now;
      })
      .forEach((o) => {
        if (o.attributes.user_email) newCustomersThisMonth.add(o.attributes.user_email);
      });

    const customersWithActiveSubs = new Set<string>();
    activeSubs.forEach((s) => {
      if (s.attributes.user_email) customersWithActiveSubs.add(s.attributes.user_email);
    });

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount);
    };

    const metrics: FinancialMetrics = {
      revenue: {
        total: totalRevenue,
        totalFormatted: formatCurrency(totalRevenue),
        byPeriod: {
          today: revenueToday,
          thisWeek: revenueThisWeek,
          thisMonth: revenueThisMonth,
          thisYear: revenueThisYear,
          last30Days: revenueLast30Days,
          last90Days: revenueLast90Days,
        },
        growth: {
          weekOverWeek: calculateGrowth(revenueThisWeek, revenueLastWeek),
          monthOverMonth: calculateGrowth(revenueThisMonth, revenueLastMonth),
          yearOverYear: calculateGrowth(revenueThisYear, revenueLastYear),
        },
      },
      subscriptions: {
        mrr,
        arr,
        activeCount: activeSubs.length,
        cancelledCount: cancelledSubs.length,
        newThisMonth: newSubsThisMonth.length,
        churnRate: parseFloat(churnRate.toFixed(2)),
      },
      orders: {
        total: filteredOrders.length,
        averageOrderValue,
        averageOrderValueFormatted: formatCurrency(averageOrderValue),
        paid: paidOrders.length,
        refunded: refundedOrders.length,
        failed: failedOrders.length,
        byPeriod: {
          today: ordersToday,
          thisWeek: ordersThisWeek,
          thisMonth: ordersThisMonth,
          thisYear: ordersThisYear,
        },
      },
      customers: {
        total: uniqueCustomers.size,
        newThisMonth: newCustomersThisMonth.size,
        withActiveSubscriptions: customersWithActiveSubs.size,
      },
      period: {
        calculatedAt: new Date().toISOString(),
        storeId: storeIdFilter?.toString() || config.lemonSqueezyStoreId,
      },
    };

    return createResponse(metrics);
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function handlePredictChurnRisk(args: {
  storeId?: number;
  minRiskScore?: number;
  limit?: number;
}) {
  try {
    const { storeId, minRiskScore = 0, limit = 50 } = args;
    const storeIdFilter = storeId || (config.lemonSqueezyStoreId ? parseInt(config.lemonSqueezyStoreId) : undefined);

    // Fetch all subscriptions
    const allSubscriptions: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await listSubscriptions({
        filter: storeIdFilter ? { storeId: storeIdFilter } : undefined,
        page: { number: page, size: 100 },
      });

      if (error) throw new Error(error.message);
      if (!data?.data) break;

      allSubscriptions.push(...data.data);

      if (data.meta?.page?.lastPage && page >= data.meta.page.lastPage) {
        hasMore = false;
      } else {
        page++;
        if (page > 100) break;
      }
    }

    // Fetch recent orders to check payment history
    const { data: ordersData } = await listOrders({
      filter: storeIdFilter ? { storeId: storeIdFilter } : undefined,
      page: { number: 1, size: 100 },
    });

    const orders = ordersData?.data || [];

    // Helper to parse amount
    const parseAmount = (amount: any): number => {
      if (typeof amount === "number") return amount / 100;
      if (typeof amount === "string") {
        const cleaned = amount.replace(/[^0-9.-]/g, "");
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const now = new Date();
    const predictions: ChurnRiskPrediction[] = [];

    for (const sub of allSubscriptions) {
      const attrs = sub.attributes as any;
      const status = attrs.status || "";

      // Skip already cancelled/expired subscriptions
      if (["cancelled", "expired", "past_due"].includes(status.toLowerCase())) {
        continue;
      }

      // Calculate risk factors
      const factors: string[] = [];
      let riskScore = 0;

      // Factor 1: Subscription age (newer = higher risk)
      const createdAt = new Date(attrs.created_at);
      const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysActive < 30) {
        riskScore += 20;
        factors.push(`New subscription (${daysActive} days old)`);
      } else if (daysActive < 90) {
        riskScore += 10;
        factors.push(`Recent subscription (${daysActive} days old)`);
      }

      // Factor 2: Payment failures
      const customerEmail = attrs.user_email || "";
      const customerOrders = orders.filter(
        (o: any) => o.attributes.user_email === customerEmail && o.attributes.status === "failed"
      );
      const paymentFailures = customerOrders.length;
      if (paymentFailures > 0) {
        riskScore += Math.min(paymentFailures * 15, 40);
        factors.push(`${paymentFailures} failed payment(s)`);
      }

      // Factor 3: Subscription status
      if (status.toLowerCase() === "on_grace_period") {
        riskScore += 30;
        factors.push("On grace period");
      } else if (status.toLowerCase() === "paused") {
        riskScore += 25;
        factors.push("Subscription paused");
      }

      // Factor 4: Low value subscription (might be less engaged)
      const subscriptionValue = parseAmount(attrs.variant_amount || attrs.recurring_amount || 0);
      if (subscriptionValue < 10) {
        riskScore += 5;
        factors.push("Low subscription value");
      }

      // Factor 5: No recent activity (check last payment)
      const lastPaymentDate = attrs.renews_at || attrs.updated_at;
      if (lastPaymentDate) {
        const lastPayment = new Date(lastPaymentDate);
        const daysSincePayment = Math.floor((now.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSincePayment > 60) {
          riskScore += 15;
          factors.push(`No payment activity in ${daysSincePayment} days`);
        }
      }

      // Factor 6: Cancellation date set (if applicable)
      if (attrs.ends_at) {
        riskScore += 35;
        factors.push("Cancellation scheduled");
      }

      // Determine risk level
      let riskLevel: "low" | "medium" | "high" | "critical";
      if (riskScore >= 70) {
        riskLevel = "critical";
      } else if (riskScore >= 50) {
        riskLevel = "high";
      } else if (riskScore >= 30) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }

      // Only include if meets minimum risk score
      if (riskScore >= minRiskScore) {
        predictions.push({
          subscriptionId: sub.id,
          customerEmail,
          customerName: attrs.user_name || "Unknown",
          riskScore: Math.min(riskScore, 100), // Cap at 100
          riskLevel,
          factors,
          subscriptionValue,
          subscriptionValueFormatted: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
          }).format(subscriptionValue),
          daysActive,
          lastPaymentDate: lastPaymentDate || undefined,
          paymentFailures,
          status,
        });
      }
    }

    // Sort by risk score (highest first) and limit
    predictions.sort((a, b) => b.riskScore - a.riskScore);
    const limited = predictions.slice(0, limit);

    return createResponse({
      totalAnalyzed: allSubscriptions.length,
      atRiskCount: predictions.length,
      predictions: limited,
      summary: {
        critical: limited.filter((p) => p.riskLevel === "critical").length,
        high: limited.filter((p) => p.riskLevel === "high").length,
        medium: limited.filter((p) => p.riskLevel === "medium").length,
        low: limited.filter((p) => p.riskLevel === "low").length,
        totalAtRiskValue: limited.reduce((sum, p) => sum + p.subscriptionValue, 0),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
