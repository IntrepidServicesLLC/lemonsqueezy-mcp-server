import admin from "firebase-admin";
import { listOrders, listSubscriptions } from "@lemonsqueezy/lemonsqueezy.js";
import { getFirebaseApp } from "../../connections/firebase.js";
import { config } from "../../config.js";
import { createResponse, createErrorResponse } from "../../utils/response.js";

export async function handleSearchTransactionsNatural(args: { query: string }) {
  const { query } = args;
  try {
    const app = await getFirebaseApp();
    const db = app.firestore();

    // 1. Parse query for date range and intent
    const now = new Date();
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const q = query.toLowerCase();

    if (q.includes("yesterday")) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (q.includes("today")) {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (q.includes("week")) {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (q.includes("month")) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Keywords
    const isRefund = q.includes("refund");
    const isSub = q.includes("subscription");
    const isPack = q.includes("pack");
    const isOrder = q.includes("order") || (!isRefund && !isSub && !isPack);

    // 2. Query Lemon Squeezy
    const lsTransactions: any[] = [];
    const storeId = config.lemonSqueezyStoreId;

    if (isOrder || isRefund) {
      const { data } = await listOrders({
        filter: { storeId: storeId ? parseInt(storeId) : undefined },
      });
      if (data?.data) {
        lsTransactions.push(
          ...data.data.filter((o: any) => {
            const created = new Date(o.attributes.created_at);
            if (created < startDate) return false;
            if (isRefund && o.attributes.status !== "refunded") return false;
            return true;
          })
        );
      }
    }

    if (isSub) {
      const { data } = await listSubscriptions({
        filter: { storeId: storeId ? parseInt(storeId) : undefined },
      });
      if (data?.data) {
        lsTransactions.push(
          ...data.data.filter((s: any) => {
            const created = new Date(s.attributes.created_at);
            return created >= startDate;
          })
        );
      }
    }

    // 3. Query Firestore
    let firestoreQuery: admin.firestore.Query = db
      .collection("revenue_ledger")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startDate));
    if (isSub) firestoreQuery = firestoreQuery.where("type", "==", "subscription");
    if (isPack) firestoreQuery = firestoreQuery.where("type", "==", "pack");

    const snapshot = await firestoreQuery.get();
    const firestoreEntries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // 4. Discrepancies
    const discrepancies: any[] = [];
    firestoreEntries.forEach((entry: any) => {
      const lsMatch = lsTransactions.find(
        (t) => t.id === entry.transactionId || t.attributes.identifier === entry.transactionId
      );
      if (lsMatch) {
        const lsAmount = (lsMatch.attributes.total || lsMatch.attributes.amount) / 100;
        if (lsAmount !== entry.amountPaid) {
          discrepancies.push({
            transactionId: entry.transactionId,
            lsAmount,
            firestoreAmount: entry.amountPaid,
            delta: lsAmount - entry.amountPaid,
          });
        }
      }
    });

    return createResponse({
      lemonSqueezy: {
        count: lsTransactions.length,
        totalAmount: lsTransactions.reduce(
          (acc, t) => acc + (t.attributes.total || t.attributes.amount || 0) / 100,
          0
        ),
        transactions: lsTransactions.map((t) => ({
          id: t.id,
          status: t.attributes.status,
          amount: (t.attributes.total || t.attributes.amount) / 100,
        })),
      },
      firestore: {
        count: firestoreEntries.length,
        totalAmount: firestoreEntries.reduce((acc, e: any) => acc + (e.amountPaid || 0), 0),
        entries: firestoreEntries,
      },
      discrepancies,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function handleAnalyzeChurnRisk(args: {}) {
  try {
    const app = await getFirebaseApp();
    const db = app.firestore();

    // 1. Fetch active subscriptions from LS
    const storeId = config.lemonSqueezyStoreId;
    const { data } = await listSubscriptions({
      filter: { storeId: storeId ? parseInt(storeId) : undefined, status: "active" },
    });

    if (!data?.data) return createResponse({ totalActiveSubscriptions: 0, atRiskUsers: [], atRiskMRR: 0 });

    const activeSubs = data.data;
    const atRiskUsers: any[] = [];
    let atRiskMRR = 0;
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

    // 2. Cross-reference with Firestore users
    for (const sub of activeSubs) {
      const email = sub.attributes.user_email;
      const attrs = sub.attributes as any;
      const userSnapshot = await db.collection("users").where("email", "==", email).limit(1).get();

      if (userSnapshot.empty) {
        // No user found in Firestore but active subscription exists? Flag it.
        atRiskUsers.push({
          email,
          name: attrs.user_name || "Unknown",
          subscriptionId: sub.id,
          daysSinceLastLogin: -1, // Never logged in
          monthlyValue: attrs.variant_amount / 100 || 0,
        });
        atRiskMRR += attrs.variant_amount / 100 || 0;
        continue;
      }

      const userData = userSnapshot.docs[0].data();
      const lastLogin = userData.lastLoginAt ? userData.lastLoginAt.toDate() : null;

      if (!lastLogin || lastLogin < twentyEightDaysAgo) {
        const daysSince = lastLogin
          ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        atRiskUsers.push({
          email: userData.email || email,
          name: userData.name || attrs.user_name,
          subscriptionId: sub.id,
          daysSinceLastLogin: daysSince,
          monthlyValue: attrs.variant_amount / 100 || 0,
        });
        atRiskMRR += attrs.variant_amount / 100 || 0;
      }
    }

    return createResponse({
      totalActiveSubscriptions: activeSubs.length,
      atRiskUsers,
      atRiskMRR,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function handleCanonizeDecision(args: {
  decision: string;
  rationale: string;
  expectedOutcome: string;
  category?: string;
}) {
  const { decision, rationale, expectedOutcome, category } = args;
  try {
    const app = await getFirebaseApp();
    const db = app.firestore();

    // 1. Calculate Snapshot Metrics
    const activeSubscribersSnapshot = await db
      .collection("users")
      .where("subscriptionStatus", "==", "active")
      .get();
    const usersWithCreditsSnapshot = await db.collection("users").where("creditBalance", ">", 0).get();

    // Use a Set to get unique active users
    const activeUserIds = new Set();
    activeSubscribersSnapshot.docs.forEach((doc) => activeUserIds.add(doc.id));
    usersWithCreditsSnapshot.docs.forEach((doc) => activeUserIds.add(doc.id));

    const snapshot = {
      activeUserCount: activeUserIds.size,
      activeSubscriberCount: activeSubscribersSnapshot.size,
      timestamp: new Date().toISOString(),
    };

    // 2. Create Decision Document
    const decisionData = {
      decision,
      rationale,
      expectedOutcome,
      category: category || "general",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      snapshot,
    };

    const docRef = await db.collection("business_decisions").add(decisionData);

    return createResponse({
      success: true,
      id: docRef.id,
      snapshot,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
