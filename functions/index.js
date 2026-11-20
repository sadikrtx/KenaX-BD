"use strict";

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp, getApps, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// ============================================================================
// KenaX BD — Muse AI Integration API (Firebase Cloud Functions 2nd Gen)
// Function ID: museIntegrationApi
// Region: asia-southeast1
// Secret Storage: Firestore document integration_secrets/muse_connector
//                 (blocked from ALL client reads/writes in firestore.rules)
// ============================================================================

const SECRET_COLLECTION = "integration_secrets";
const SECRET_DOC_ID = "muse_connector";
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const BUILTIN_SUPER_ADMIN_EMAILS = new Set([
  "sadikrtx3060@gmail.com",
  "super@kenaxbd.com",
  "super@gmail.com",
]);

function getAdminApp() {
  return getApps().length ? getApp() : initializeApp();
}

function getDb() {
  return getFirestore(getAdminApp());
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey || "").trim(), "utf8").digest("hex");
}

function safeCompareHashHex(expectedHex, candidateHex) {
  try {
    if (!expectedHex || !candidateHex) return false;
    const a = Buffer.from(String(expectedHex), "hex");
    const b = Buffer.from(String(candidateHex), "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ============================================================================
// Canonical Order / Sales / Inventory Logic (mirrors src/utils/salesAnalytics.ts)
// ============================================================================

const MUSE_ALLOWED_STATUSES = {
  pending: "Pending",
  "follow up": "Follow Up",
  followup: "Follow Up",
  follow_up: "Follow Up",
  "payment verification": "Payment Verification",
  payment_verification: "Payment Verification",
  confirmed: "Confirmed",
  processing: "Processing",
  "ready to ship": "Ready to Ship",
  ready_to_ship: "Ready to Ship",
  packed: "Packed",
  "in transit": "In Transit",
  in_transit: "In Transit",
  shipped: "Shipped",
  "out for delivery": "Out for Delivery",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  hold: "Hold",
  "on hold": "Hold",
  on_hold: "Hold",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
  "failed delivery": "Failed Delivery",
  failed_delivery: "Failed Delivery",
  spam: "Spam",
  "fake order": "Fake Order",
};

function normalizeStatusKey(raw) {
  return String(raw || "Pending").trim().toLowerCase();
}

function normalizeOrderStatus(raw) {
  const key = normalizeStatusKey(raw);
  return MUSE_ALLOWED_STATUSES[key] || String(raw || "Pending").trim() || "Pending";
}

function getCanonicalOrderBucket(order) {
  if (!order) return "pending";
  const raw = normalizeStatusKey(order.orderStatus || order.status);
  if (order.isFakeOrder || raw === "spam" || raw === "fake order" || raw === "fake") return "spam";
  if (raw === "pending" || raw === "payment verification" || raw === "unconfirmed" || raw === "incomplete") return "pending";
  if (raw === "follow up" || raw === "followup" || raw === "follow_up") return "follow_up";
  if (raw === "confirmed") return "confirmed";
  if (raw === "processing") return "processing";
  if (raw === "ready to ship" || raw === "ready_to_ship" || raw === "packed" || raw === "picked") return "ready_to_ship";
  if (raw === "in transit" || raw === "in_transit" || raw === "shipped" || raw === "out for delivery" || raw === "out_for_delivery") return "in_transit";
  if (raw === "delivered" || raw === "completed") return "delivered";
  if (raw === "hold" || raw === "on hold" || raw === "on_hold") return "hold";
  if (raw === "cancelled" || raw === "canceled" || raw === "rejected") return "cancelled";
  if (raw === "returned" || raw === "refunded") return "returned";
  if (raw === "failed delivery" || raw === "failed_delivery") return "failed_delivery";
  return "pending";
}

function resolveOrderSalesChannel(order) {
  const explicitSource = String(order?.orderSource || order?.source || "").trim().toLowerCase();
  const attr = order?.attribution || {};
  const ft = attr.firstTouch || {};
  const lt = attr.lastTouch || {};
  const utmSource = String(order?.adNetwork || lt.utm_source || ft.utm_source || "").trim().toLowerCase();
  const utmMedium = String(lt.utm_medium || ft.utm_medium || "").trim().toLowerCase();

  if (explicitSource.includes("whatsapp") || utmSource.includes("whatsapp")) return "WhatsApp";
  if (explicitSource.includes("messenger") || utmSource.includes("messenger")) return "Facebook Messenger";
  if (explicitSource.includes("telegram")) return "Telegram";
  if (explicitSource.includes("chatbot") || order?.isAiBotOrder) return "Website ChatBot";
  if (
    attr.fbclid ||
    lt.fbclid ||
    ft.fbclid ||
    utmSource.includes("facebook") ||
    utmSource.includes("meta") ||
    utmSource.includes("fb") ||
    utmSource.includes("instagram") ||
    (utmMedium.includes("cpc") && utmSource.includes("fb"))
  ) {
    return "Facebook Ads";
  }
  if (attr.ttclid || lt.ttclid || ft.ttclid || utmSource.includes("tiktok")) return "TikTok Ads";
  if (attr.gclid || lt.gclid || ft.gclid || utmSource.includes("google")) return "Google Ads";
  if (explicitSource === "manual" || explicitSource === "admin") return "Phone / Manual";
  return "Website";
}

function getOrderItemsList(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.map((item) => ({
      productId: String(item.productId || item.id || ""),
      productName: String(item.productName || item.name || "Product"),
      sku: String(item.sku || ""),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Number(item.price ?? item.unitPrice ?? 0) || 0,
    }));
  }
  if (order?.productId || order?.productName) {
    return [
      {
        productId: String(order.productId || ""),
        productName: String(order.productName || "Product"),
        sku: String(order.sku || ""),
        quantity: Math.max(1, Number(order.quantity) || 1),
        unitPrice: Number(order.price ?? order.totalAmount ?? 0) || 0,
      },
    ];
  }
  return [];
}

function getOrderSubtotalAmount(order) {
  const items = getOrderItemsList(order);
  if (items.length > 0) {
    const sum = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    if (sum > 0) return sum;
  }
  if (order?.subtotal !== undefined && Number(order.subtotal) > 0) {
    return Number(order.subtotal);
  }
  const total = Number(order?.totalAmount ?? order?.total ?? 0) || 0;
  const delivery = Number(order?.deliveryCharge ?? 0) || 0;
  return Math.max(0, total - delivery);
}

function getOrderPendingCODAmount(order) {
  const bucket = getCanonicalOrderBucket(order);
  if (bucket === "cancelled" || bucket === "spam" || bucket === "returned" || bucket === "failed_delivery") {
    return 0;
  }
  const payStatus = normalizeStatusKey(order?.paymentStatus);
  if (payStatus === "paid") return 0;

  const total = Number(order?.totalAmount ?? order?.total ?? 0) || 0;
  const paid = Number(order?.paidAmount ?? 0) || 0;
  const explicitDue =
    order?.dueAmount !== undefined && order?.dueAmount !== null ? Number(order.dueAmount) : null;

  const payMethod = normalizeStatusKey(order?.paymentMethod);
  const payOption = normalizeStatusKey(order?.paymentOptionType);
  const isCodOrder =
    payMethod.includes("cash") ||
    payMethod.includes("cod") ||
    payOption === "cod" ||
    payOption === "delivery_only";

  if (!isCodOrder) return 0;
  if (explicitDue !== null && Number.isFinite(explicitDue)) {
    return Math.max(0, explicitDue);
  }
  return Math.max(0, total - paid);
}

function computeStoreSalesSummary(orders = [], products = []) {
  const ordersByStatus = {
    all: orders.length,
    pending: 0,
    follow_up: 0,
    confirmed: 0,
    processing: 0,
    ready_to_ship: 0,
    in_transit: 0,
    delivered: 0,
    hold: 0,
    cancelled: 0,
    spam: 0,
    returned: 0,
    failed_delivery: 0,
  };

  let grossSales = 0;
  let netProductSales = 0;
  let deliveryCollected = 0;
  let discountsGiven = 0;
  let totalPaidAmount = 0;
  let pendingCOD = 0;
  let pendingCODOrdersCount = 0;
  let validOrdersCount = 0;

  const salesByPaymentMethod = {};
  const salesByChannel = {};
  const sellerMap = new Map();

  for (const order of orders) {
    const bucket = getCanonicalOrderBucket(order);
    ordersByStatus[bucket] = (ordersByStatus[bucket] || 0) + 1;

    if (bucket === "cancelled" || bucket === "spam") {
      continue;
    }

    validOrdersCount += 1;
    const total = Number(order.totalAmount ?? order.total ?? 0) || 0;
    const delivery = Number(order.deliveryCharge ?? 0) || 0;
    const subtotal = getOrderSubtotalAmount(order);
    const discount = Number(order.discountAmount ?? order.discount ?? 0) || 0;

    grossSales += total;
    netProductSales += subtotal;
    deliveryCollected += delivery;
    discountsGiven += discount;

    const payStatus = normalizeStatusKey(order.paymentStatus);
    if (payStatus === "paid") {
      totalPaidAmount += total;
    } else if (Number(order.paidAmount) > 0) {
      totalPaidAmount += Math.min(total, Number(order.paidAmount));
    }

    const codDue = getOrderPendingCODAmount(order);
    if (codDue > 0) {
      pendingCOD += codDue;
      pendingCODOrdersCount += 1;
    }

    const pmKey = String(order.paymentMethod || "Cash on Delivery").trim() || "Cash on Delivery";
    if (!salesByPaymentMethod[pmKey]) salesByPaymentMethod[pmKey] = { orders: 0, total: 0 };
    salesByPaymentMethod[pmKey].orders += 1;
    salesByPaymentMethod[pmKey].total += total;

    const chKey = resolveOrderSalesChannel(order);
    if (!salesByChannel[chKey]) salesByChannel[chKey] = { orders: 0, total: 0 };
    salesByChannel[chKey].orders += 1;
    salesByChannel[chKey].total += total;

    const items = getOrderItemsList(order);
    for (const item of items) {
      const matchedProduct = products.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
          (item.productName && p.name && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );

      const key = matchedProduct?.id || item.sku || item.productName;
      const existing = sellerMap.get(key) || {
        productId: matchedProduct?.id || item.productId || key,
        productName: matchedProduct?.name || item.productName,
        sku: matchedProduct?.sku || item.sku || "N/A",
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += item.unitPrice * item.quantity;
      sellerMap.set(key, existing);
    }
  }

  const topSellers = Array.from(sellerMap.values())
    .sort((a, b) => (b.unitsSold !== a.unitsSold ? b.unitsSold - a.unitsSold : b.revenue - a.revenue))
    .slice(0, 10);

  const averageOrderValue = validOrdersCount > 0 ? Math.round(grossSales / validOrdersCount) : 0;

  return {
    totalOrders: orders.length,
    validOrdersCount,
    cancelledOrdersCount: ordersByStatus.cancelled,
    spamOrdersCount: ordersByStatus.spam,
    grossSales,
    netProductSales,
    deliveryCollected,
    discountsGiven,
    totalPaidAmount,
    pendingCOD,
    pendingCODOrdersCount,
    averageOrderValue,
    ordersByStatus,
    salesByPaymentMethod,
    salesByChannel,
    topSellers,
  };
}

function computeInventoryMetrics(products = [], orders = [], lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const threshold = Math.max(0, Number.isFinite(lowStockThreshold) ? lowStockThreshold : DEFAULT_LOW_STOCK_THRESHOLD);
  const statsMap = new Map();

  for (const p of products) {
    statsMap.set(p.id, { reserved: 0, delivered: 0, totalSold: 0 });
  }

  for (const order of orders) {
    const bucket = getCanonicalOrderBucket(order);
    const isCancelledOrReturned =
      bucket === "cancelled" || bucket === "spam" || bucket === "returned" || bucket === "failed_delivery";
    const isDelivered = bucket === "delivered";
    const isReserved = !isDelivered && !isCancelledOrReturned;

    const items = getOrderItemsList(order);
    for (const item of items) {
      const matched = products.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
          (item.productName && p.name && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      if (!matched) continue;
      const entry = statsMap.get(matched.id) || { reserved: 0, delivered: 0, totalSold: 0 };
      if (isReserved) {
        entry.reserved += item.quantity;
        entry.totalSold += item.quantity;
      } else if (isDelivered) {
        entry.delivered += item.quantity;
        entry.totalSold += item.quantity;
      }
      statsMap.set(matched.id, entry);
    }
  }

  return products.map((p) => {
    const st = statsMap.get(p.id) || { reserved: 0, delivered: 0, totalSold: 0 };
    const physicalStock = Math.max(0, Number(p.stock) || 0);
    const available = Math.max(0, physicalStock - st.reserved);
    const unitCostOrPrice = Number(p.costPrice && p.costPrice > 0 ? p.costPrice : p.price) || 0;
    return {
      productId: p.id,
      productName: p.name || "",
      sku: p.sku || p.id,
      category: p.category || "General",
      price: Number(p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price) || 0,
      salePrice: Number(p.price) || 0,
      physicalStock,
      reserved: st.reserved,
      available,
      deliveredUnits: st.delivered,
      totalSold: st.totalSold,
      stockValue: available * unitCostOrPrice,
      lowStock: available <= threshold,
      verifyStock: physicalStock === 999,
    };
  });
}

function isResellerOrder(o) {
  if (!o) return true;
  return Boolean(
    o.resellerId ||
      o.resellerStoreName ||
      o.isResellerOrder ||
      (o.notes && String(o.notes).includes("[Dropship:"))
  );
}

function isLegacySampleActivityLog(log) {
  if (!log) return true;
  const id = String(log.id || "").toLowerCase();
  const ts = String(log.timestamp || "");
  if (id === "log-1" || id === "log-2" || id === "log-3" || id.startsWith("demo-log")) {
    return true;
  }
  if (ts.startsWith("2025-02-")) {
    return true;
  }
  return false;
}

function formatOrderForMuse(order) {
  const normalizedStatus = normalizeOrderStatus(order?.orderStatus || order?.status);
  const items = getOrderItemsList(order);
  const subtotal = getOrderSubtotalAmount(order);
  const deliveryCharge = Number(order?.deliveryCharge || 0);
  const total = Number(order?.totalAmount ?? subtotal + deliveryCharge);
  const courierLabel =
    order?.courierName ||
    order?.courier?.name ||
    order?.deliveryPartner ||
    order?.courierTrackingCode ||
    null;

  return {
    orderId: order?.id || "",
    createdAt: order?.createdAt || null,
    status: normalizedStatus,
    customer: {
      name: order?.customerName || order?.customerInfo?.fullName || "",
      phone: order?.customerMobile || order?.deliveryMobile || order?.customerInfo?.mobile || "",
      email: order?.customerEmail || order?.customerInfo?.email || "",
      address: order?.customerAddress || order?.deliveryAddress || order?.customerInfo?.address || "",
      zone: order?.deliveryArea || order?.deliveryZone || order?.customerInfo?.deliveryZone || "",
    },
    items: items.map((it) => ({
      productName: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    subtotal,
    deliveryCharge,
    total,
    paymentMethod: order?.paymentMethod || "Cash on Delivery",
    salesChannel: resolveOrderSalesChannel(order),
    courier: courierLabel,
    updatedAt: order?.updatedAt || order?.createdAt || null,
  };
}

// ============================================================================
// Firestore Data Access Layer (can be injected for unit/integration tests)
// ============================================================================

function createFirestoreDataAdapter(db) {
  return {
    async readSecretConfig() {
      const snap = await db.collection(SECRET_COLLECTION).doc(SECRET_DOC_ID).get();
      if (!snap.exists) return null;
      return snap.data() || null;
    },
    async writeSecretConfig(data) {
      await db.collection(SECRET_COLLECTION).doc(SECRET_DOC_ID).set(data, { merge: false });
    },
    async getAllOrders() {
      const snap = await db.collection("orders").get();
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) list.push({ ...data, id: data.id || docSnap.id });
      });
      list.sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
      return list;
    },
    async getOrderById(orderId) {
      const direct = await db.collection("orders").doc(orderId).get();
      if (direct.exists) {
        const data = direct.data();
        return { docId: direct.id, data: { ...data, id: data.id || direct.id } };
      }
      const q = await db.collection("orders").where("id", "==", orderId).limit(1).get();
      if (!q.empty) {
        const first = q.docs[0];
        const data = first.data();
        return { docId: first.id, data: { ...data, id: data.id || first.id } };
      }
      return null;
    },
    async updateOrder(docId, updates) {
      const ref = db.collection("orders").doc(docId);
      await ref.set(updates, { merge: true });
      const fresh = await ref.get();
      const data = fresh.data() || {};
      return { ...data, id: data.id || fresh.id };
    },
    async getAllProducts() {
      const [prodSnap, delSnap] = await Promise.all([
        db.collection("products").get(),
        db.collection("deletedProducts").get().catch(() => ({ forEach: () => {} })),
      ]);
      const deletedIds = new Set();
      delSnap.forEach((d) => deletedIds.add(d.id));
      const list = [];
      prodSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;
        const pid = data.id || docSnap.id;
        if (deletedIds.has(pid) || deletedIds.has(docSnap.id)) return;
        list.push({ ...data, id: pid });
      });
      return list;
    },
    async updateProductStock(productId, nextStock) {
      await db
        .collection("products")
        .doc(productId)
        .set({ stock: nextStock, updatedAt: new Date().toISOString() }, { merge: true });
    },
    async getAllActivityLogs() {
      const snap = await db.collection("activityLogs").get();
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) list.push({ ...data, id: data.id || docSnap.id });
      });
      list.sort((a, b) => Date.parse(b.timestamp || "") - Date.parse(a.timestamp || ""));
      return list;
    },
    async appendActivityLog(entry) {
      const id = entry.id || `act-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const record = { ...entry, id, timestamp: entry.timestamp || new Date().toISOString() };
      await db.collection("activityLogs").doc(id).set(record, { merge: true });
      return record;
    },
    async getAllStaff() {
      const snap = await db.collection("staff").get();
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data) list.push({ ...data, id: data.id || docSnap.id });
      });
      return list;
    },
    async verifyIdToken(token) {
      try {
        return await getAuth(getAdminApp()).verifyIdToken(token);
      } catch {
        return null;
      }
    },
  };
}

// ============================================================================
// Express App Factory (used by Cloud Function AND automated tests)
// ============================================================================

function buildConfigAdminView(cfg) {
  if (!cfg || !cfg.apiKeyHash) {
    return {
      hasKey: false,
      maskedKey: "",
      lowStockThreshold:
        typeof cfg?.lowStockThreshold === "number" && Number.isFinite(cfg.lowStockThreshold)
          ? Math.max(0, Math.round(cfg.lowStockThreshold))
          : DEFAULT_LOW_STOCK_THRESHOLD,
      createdAt: null,
      rotatedAt: null,
      updatedBy: cfg?.updatedBy || null,
    };
  }
  const prefix = String(cfg.keyPrefix || "knx_muse_");
  const last4 = String(cfg.keyLast4 || "");
  return {
    hasKey: true,
    maskedKey: `${prefix}••••••••••••••••••••••••${last4}`,
    lowStockThreshold:
      typeof cfg.lowStockThreshold === "number" && Number.isFinite(cfg.lowStockThreshold)
        ? Math.max(0, Math.round(cfg.lowStockThreshold))
        : DEFAULT_LOW_STOCK_THRESHOLD,
    createdAt: cfg.createdAt || null,
    rotatedAt: cfg.rotatedAt || null,
    updatedBy: cfg.updatedBy || null,
  };
}

function createIntegrationApp(adapterOverride) {
  const app = express();
  const getAdapter = () => adapterOverride || createFirestoreDataAdapter(getDb());

  app.use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-API-Key",
        "x-api-key",
        "x-staff-role",
        "x-staff-name",
        "x-staff-email",
        "x-staff-id",
        "x-app-env",
        "Accept",
      ],
    })
  );

  // Force JSON Content-Type on EVERY response
  app.use((_req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(express.json({ limit: "2mb" }));

  // Malformed JSON body error handler -> always JSON, never HTML
  app.use((err, _req, res, next) => {
    if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
      return res.status(400).json({
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON.",
        now: new Date().toISOString(),
      });
    }
    return next(err);
  });

  // --------------------------------------------------------------------------
  // Middleware 1: Strict Super Admin Authentication (for /admin/* endpoints)
  // --------------------------------------------------------------------------
  async function requireSuperAdmin(req, res, next) {
    try {
      const adapter = getAdapter();
      const headerRole = String(req.headers["x-staff-role"] || req.body?.actorRole || "").trim().toLowerCase();
      let callerEmail = String(req.headers["x-staff-email"] || req.body?.actorEmail || "").trim().toLowerCase();
      const callerId = String(req.headers["x-staff-id"] || req.body?.actorId || "").trim();

      // If Firebase Auth ID token is supplied, verify it server-side and trust its email
      const authHeader = String(req.headers.authorization || "");
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7).trim();
        if (token) {
          const decoded = await adapter.verifyIdToken(token);
          if (decoded && decoded.email) {
            callerEmail = String(decoded.email).trim().toLowerCase();
          }
        }
      }

      if (headerRole !== "super_admin") {
        return res.status(403).json({
          ok: false,
          error: "forbidden_super_admin_only",
          message: "Integration settings are restricted exclusively to Super Admin.",
          now: new Date().toISOString(),
        });
      }

      if (!callerEmail && !callerId) {
        return res.status(401).json({
          ok: false,
          error: "unauthenticated_admin",
          message: "Missing authenticated Super Admin identity.",
          now: new Date().toISOString(),
        });
      }

      // Server-side verification against Firestore `staff` collection
      const staffList = await adapter.getAllStaff();
      const matched = staffList.find((s) => {
        const sEmail = String(s?.email || "").trim().toLowerCase();
        const sId = String(s?.id || "").trim();
        return (callerEmail && sEmail === callerEmail) || (callerId && sId === callerId);
      });

      if (matched) {
        const isActiveSuperAdmin =
          String(matched.role || "").toLowerCase() === "super_admin" &&
          matched.isActive !== false &&
          matched.status !== "suspended" &&
          !matched.isRemoved;

        if (!isActiveSuperAdmin) {
          return res.status(403).json({
            ok: false,
            error: "forbidden_super_admin_only",
            message: "Account does not have active Super Admin privileges.",
            now: new Date().toISOString(),
          });
        }
      } else if (!BUILTIN_SUPER_ADMIN_EMAILS.has(callerEmail)) {
        return res.status(403).json({
          ok: false,
          error: "forbidden_super_admin_only",
          message: "Unrecognized Super Admin account.",
          now: new Date().toISOString(),
        });
      }

      req.superAdminActor = {
        name: String(req.headers["x-staff-name"] || req.body?.actorName || matched?.name || "Super Admin"),
        email: callerEmail || matched?.email || "",
      };
      return next();
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "admin_auth_error",
        message: err?.message || "Failed to verify Super Admin privileges.",
        now: new Date().toISOString(),
      });
    }
  }

  // --------------------------------------------------------------------------
  // Middleware 2: Strict X-API-Key Authentication (for ALL Muse API endpoints)
  // --------------------------------------------------------------------------
  async function authenticateApiKey(req, res, next) {
    try {
      const providedKey = String(req.headers["x-api-key"] || "").trim();
      if (!providedKey) {
        return res.status(401).json({
          ok: false,
          error: "invalid_api_key",
          message: "Missing X-API-Key header.",
          now: new Date().toISOString(),
        });
      }

      const providedHash = hashApiKey(providedKey);

      // Optional environment variable override (server-only)
      const envKey = String(process.env.MUSE_INTEGRATION_API_KEY || "").trim();
      if (envKey && safeCompareHashHex(hashApiKey(envKey), providedHash)) {
        return next();
      }

      const adapter = getAdapter();
      const secretCfg = await adapter.readSecretConfig();
      if (!secretCfg || !secretCfg.apiKeyHash || !safeCompareHashHex(secretCfg.apiKeyHash, providedHash)) {
        return res.status(401).json({
          ok: false,
          error: "invalid_api_key",
          message: "Invalid X-API-Key header.",
          now: new Date().toISOString(),
        });
      }

      req.secretConfig = secretCfg;
      return next();
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "auth_verification_failed",
        message: err?.message || "Could not verify API key.",
        now: new Date().toISOString(),
      });
    }
  }

  // --------------------------------------------------------------------------
  // Router mounted at BOTH `/api/integration` and `/` (covers Hosting rewrite & direct invoke)
  // --------------------------------------------------------------------------
  const router = express.Router();

  // --- Super Admin ONLY Management Endpoints ---

  router.get("/admin/config", requireSuperAdmin, async (_req, res) => {
    try {
      const adapter = getAdapter();
      const cfg = await adapter.readSecretConfig();
      return res.status(200).json({
        ok: true,
        config: buildConfigAdminView(cfg),
        now: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "config_read_failed",
        message: err?.message || "Failed to load integration config.",
        now: new Date().toISOString(),
      });
    }
  });

  router.post("/admin/generate-key", requireSuperAdmin, async (req, res) => {
    try {
      const adapter = getAdapter();
      const existing = await adapter.readSecretConfig();
      const now = new Date().toISOString();
      const rawSecret = crypto.randomBytes(24).toString("hex");
      const apiKey = `knx_muse_${rawSecret}`;
      const apiKeyHash = hashApiKey(apiKey);
      const actor = req.superAdminActor || { name: "Super Admin", email: "" };

      const nextCfg = {
        apiKeyHash,
        keyPrefix: "knx_muse_",
        keyLast4: rawSecret.slice(-4),
        lowStockThreshold:
          typeof existing?.lowStockThreshold === "number" && Number.isFinite(existing.lowStockThreshold)
            ? existing.lowStockThreshold
            : DEFAULT_LOW_STOCK_THRESHOLD,
        createdAt: existing?.createdAt || now,
        rotatedAt: now,
        updatedBy: actor.name,
      };

      await adapter.writeSecretConfig(nextCfg);
      const view = buildConfigAdminView(nextCfg);

      try {
        await adapter.appendActivityLog({
          staffName: actor.name,
          staffEmail: actor.email || undefined,
          staffRole: "super_admin",
          action: "Integration API Key Regenerated",
          module: "Settings",
          targetId: "muse-integration",
          source: "admin",
          details: `Muse AI Integration API Key generated/regenerated (${view.maskedKey}). Previous key invalidated immediately.`,
          timestamp: now,
        });
      } catch {
        // Non-blocking audit log write
      }

      return res.status(200).json({
        ok: true,
        apiKey,
        config: view,
        now,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "key_generation_failed",
        message: err?.message || "Failed to generate API key.",
        now: new Date().toISOString(),
      });
    }
  });

  router.post("/admin/settings", requireSuperAdmin, async (req, res) => {
    try {
      const adapter = getAdapter();
      const rawThreshold = Number(req.body?.lowStockThreshold);
      if (!Number.isFinite(rawThreshold) || rawThreshold < 0 || rawThreshold > 1000) {
        return res.status(400).json({
          ok: false,
          error: "invalid_threshold",
          message: "lowStockThreshold must be a valid number between 0 and 1000.",
          now: new Date().toISOString(),
        });
      }

      const existing = await adapter.readSecretConfig();
      const prevThreshold =
        typeof existing?.lowStockThreshold === "number" ? existing.lowStockThreshold : DEFAULT_LOW_STOCK_THRESHOLD;
      const now = new Date().toISOString();
      const actor = req.superAdminActor || { name: "Super Admin", email: "" };
      const cleanThreshold = Math.max(0, Math.min(1000, Math.round(rawThreshold)));

      const nextCfg = {
        apiKeyHash: existing?.apiKeyHash || "",
        keyPrefix: existing?.keyPrefix || "knx_muse_",
        keyLast4: existing?.keyLast4 || "",
        lowStockThreshold: cleanThreshold,
        createdAt: existing?.createdAt || now,
        rotatedAt: existing?.rotatedAt || now,
        updatedBy: actor.name,
      };

      await adapter.writeSecretConfig(nextCfg);
      const view = buildConfigAdminView(nextCfg);

      try {
        await adapter.appendActivityLog({
          staffName: actor.name,
          staffEmail: actor.email || undefined,
          staffRole: "super_admin",
          action: "Low Stock Threshold Updated",
          module: "Settings",
          targetId: "muse-integration",
          source: "admin",
          details: `Low Stock Threshold updated: ${prevThreshold} → ${view.lowStockThreshold}`,
          timestamp: now,
        });
      } catch {
        // Non-blocking audit log write
      }

      return res.status(200).json({
        ok: true,
        config: view,
        now,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "settings_update_failed",
        message: err?.message || "Failed to update settings.",
        now: new Date().toISOString(),
      });
    }
  });

  // --- Muse AI Integration Endpoints (ALL require X-API-Key) ---

  // 1. GET /api/integration/health
  router.get("/health", authenticateApiKey, (_req, res) => {
    return res.status(200).json({
      ok: true,
      store: "KenaX BD",
      now: new Date().toISOString(),
    });
  });

  // 2. GET /api/integration/orders (?since=<ISO>)
  router.get("/orders", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const sinceParam = typeof req.query.since === "string" ? req.query.since.trim() : "";
      const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;

      const rawOrders = (await adapter.getAllOrders()).filter((o) => !isResellerOrder(o));
      const filtered = !Number.isNaN(sinceMs)
        ? rawOrders.filter((o) => {
            const uMs = Date.parse(o.updatedAt || o.createdAt || "");
            const cMs = Date.parse(o.createdAt || "");
            return (!Number.isNaN(uMs) && uMs >= sinceMs) || (!Number.isNaN(cMs) && cMs >= sinceMs);
          })
        : rawOrders;

      const orders = filtered.map(formatOrderForMuse);
      return res.status(200).json({
        ok: true,
        now: new Date().toISOString(),
        count: orders.length,
        orders,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "orders_fetch_failed",
        message: err?.message || "Failed to fetch orders.",
        now: new Date().toISOString(),
      });
    }
  });

  // 3. GET /api/integration/products (?since=<ISO>)
  router.get("/products", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const sinceParam = typeof req.query.since === "string" ? req.query.since.trim() : "";
      const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;

      const [allProducts, rawOrders] = await Promise.all([adapter.getAllProducts(), adapter.getAllOrders()]);
      const storeOrders = rawOrders.filter((o) => !isResellerOrder(o));
      const threshold =
        typeof req.secretConfig?.lowStockThreshold === "number"
          ? req.secretConfig.lowStockThreshold
          : DEFAULT_LOW_STOCK_THRESHOLD;

      const invMetrics = computeInventoryMetrics(allProducts, storeOrders, threshold);
      const invById = new Map(invMetrics.map((m) => [m.productId, m]));

      const filtered = !Number.isNaN(sinceMs)
        ? allProducts.filter((p) => {
            const uMs = Date.parse(p.updatedAt || p.createdAt || "");
            return !Number.isNaN(uMs) && uMs >= sinceMs;
          })
        : allProducts;

      const products = filtered.map((p) => {
        const m = invById.get(p.id);
        return {
          productId: p.id,
          name: p.name || "",
          sku: p.sku || `SKU-${p.id}`,
          category: p.category || "Uncategorized",
          price: Number(p.originalPrice || p.regularPrice || p.price || 0),
          salePrice: Number(p.price || 0),
          stock: m ? m.available : Number(p.stock || 0),
          physicalStock: m ? m.physicalStock : Number(p.stock || 0),
          totalSold: m ? m.totalSold : Number(p.soldCount || 0),
          verifyStock: m ? m.verifyStock : Number(p.stock || 0) === 999,
        };
      });

      return res.status(200).json({
        ok: true,
        now: new Date().toISOString(),
        count: products.length,
        products,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "products_fetch_failed",
        message: err?.message || "Failed to fetch products.",
        now: new Date().toISOString(),
      });
    }
  });

  // 4. GET /api/integration/inventory (?since=<ISO>)
  router.get("/inventory", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const sinceParam = typeof req.query.since === "string" ? req.query.since.trim() : "";
      const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;

      const [allProducts, rawOrders] = await Promise.all([adapter.getAllProducts(), adapter.getAllOrders()]);
      const storeOrders = rawOrders.filter((o) => !isResellerOrder(o));
      const lowStockThreshold =
        typeof req.secretConfig?.lowStockThreshold === "number"
          ? req.secretConfig.lowStockThreshold
          : DEFAULT_LOW_STOCK_THRESHOLD;

      const targetProducts = !Number.isNaN(sinceMs)
        ? allProducts.filter((p) => {
            const uMs = Date.parse(p.updatedAt || p.createdAt || "");
            return !Number.isNaN(uMs) && uMs >= sinceMs;
          })
        : allProducts;

      const metrics = computeInventoryMetrics(targetProducts, storeOrders, lowStockThreshold);
      const inventory = metrics.map((m) => ({
        productId: m.productId,
        productName: m.productName,
        sku: m.sku,
        physicalStock: m.physicalStock,
        available: m.available,
        reserved: m.reserved,
        stockValue: m.stockValue,
        lowStock: m.lowStock,
        verifyStock: m.verifyStock,
      }));

      return res.status(200).json({
        ok: true,
        now: new Date().toISOString(),
        lowStockThreshold,
        count: inventory.length,
        inventory,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "inventory_fetch_failed",
        message: err?.message || "Failed to fetch inventory.",
        now: new Date().toISOString(),
      });
    }
  });

  // 5. GET /api/integration/activity (?since=<ISO>)
  router.get("/activity", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const sinceParam = typeof req.query.since === "string" ? req.query.since.trim() : "";
      const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;

      let logs = (await adapter.getAllActivityLogs()).filter((l) => !isLegacySampleActivityLog(l));
      if (!Number.isNaN(sinceMs)) {
        logs = logs.filter((l) => {
          const ts = Date.parse(l.timestamp || "");
          return !Number.isNaN(ts) && ts >= sinceMs;
        });
      }

      const activity = logs.map((l) => ({
        id: l.id,
        who: {
          name: l.staffName || "System",
          email: l.staffEmail || "",
          role: l.staffRole || "system",
        },
        staffName: l.staffName || "System",
        staffEmail: l.staffEmail || "",
        staffRole: l.staffRole || "system",
        action: l.action || "",
        module: l.module || "",
        orderId: l.orderId || (l.module === "Orders" ? l.targetId || null : null),
        productId: l.productId || (l.module === "Products" || l.module === "Inventory" ? l.targetId || null : null),
        fromStatus: l.fromStatus || null,
        toStatus: l.toStatus || null,
        details: l.details || "",
        timestamp: l.timestamp || null,
      }));

      return res.status(200).json({
        ok: true,
        now: new Date().toISOString(),
        count: activity.length,
        activity,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "activity_fetch_failed",
        message: err?.message || "Failed to fetch activity logs.",
        now: new Date().toISOString(),
      });
    }
  });

  // 6. GET /api/integration/sales-summary (?since=<ISO>)
  router.get("/sales-summary", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const sinceParam = typeof req.query.since === "string" ? req.query.since.trim() : "";
      const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;

      const [allProducts, rawOrders] = await Promise.all([adapter.getAllProducts(), adapter.getAllOrders()]);
      const scopedOrders = rawOrders.filter((o) => {
        if (isResellerOrder(o)) return false;
        if (!Number.isNaN(sinceMs)) {
          const cMs = Date.parse(o.createdAt || "");
          return !Number.isNaN(cMs) && cMs >= sinceMs;
        }
        return true;
      });

      const summary = computeStoreSalesSummary(scopedOrders, allProducts);
      return res.status(200).json({
        ok: true,
        now: new Date().toISOString(),
        totalOrders: summary.totalOrders,
        validOrdersCount: summary.validOrdersCount,
        cancelledOrdersCount: summary.cancelledOrdersCount,
        spamOrdersCount: summary.spamOrdersCount,
        grossSales: summary.grossSales,
        netProductSales: summary.netProductSales,
        deliveryCollected: summary.deliveryCollected,
        pendingCOD: summary.pendingCOD,
        averageOrderValue: summary.averageOrderValue,
        ordersByStatus: summary.ordersByStatus,
        salesByPaymentMethod: summary.salesByPaymentMethod,
        salesByChannel: summary.salesByChannel,
        topSellers: summary.topSellers,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "sales_summary_failed",
        message: err?.message || "Failed to compute sales summary.",
        now: new Date().toISOString(),
      });
    }
  });

  // 7. POST /api/integration/orders/:orderId/status (THE ONLY ALLOWED WRITE)
  router.post("/orders/:orderId/status", authenticateApiKey, async (req, res) => {
    try {
      const adapter = getAdapter();
      const orderId = String(req.params.orderId || "").trim();
      const rawStatus = String(req.body?.status || "").trim();
      const noteText = String(req.body?.note || "Updated via Muse on owner's instruction").trim();

      if (!rawStatus) {
        return res.status(400).json({
          ok: false,
          error: "missing_status",
          message: "Missing required field: status",
          now: new Date().toISOString(),
        });
      }

      const targetStatus = MUSE_ALLOWED_STATUSES[rawStatus.toLowerCase()];
      if (!targetStatus) {
        return res.status(400).json({
          ok: false,
          error: "invalid_status",
          message: `Invalid order status "${rawStatus}".`,
          allowedStatuses: Array.from(new Set(Object.values(MUSE_ALLOWED_STATUSES))),
          now: new Date().toISOString(),
        });
      }

      const found = await adapter.getOrderById(orderId);
      if (!found) {
        return res.status(404).json({
          ok: false,
          error: "order_not_found",
          message: `Order "${orderId}" not found.`,
          now: new Date().toISOString(),
        });
      }

      const existing = found.data;
      const previousStatus = normalizeOrderStatus(existing.orderStatus || existing.status);

      // Enforce order workflow transition guard
      if (
        (previousStatus === "Delivered" || previousStatus === "Completed") &&
        (targetStatus === "Cancelled" || targetStatus === "Spam" || targetStatus === "Fake Order")
      ) {
        return res.status(422).json({
          ok: false,
          error: "invalid_workflow_transition",
          message: `Invalid workflow transition: Delivered order cannot be changed to ${targetStatus}.`,
          now: new Date().toISOString(),
        });
      }

      const nowISO = new Date().toISOString();
      const actorLabel = "Muse (on owner's instruction)";
      const nextTimeline = [...(Array.isArray(existing.timeline) ? existing.timeline : [])];
      nextTimeline.push({
        status: targetStatus,
        timestamp: nowISO,
        note: `${noteText} (${previousStatus} → ${targetStatus})`,
        updatedBy: actorLabel,
      });

      const updates = {
        orderStatus: targetStatus,
        status: targetStatus,
        isFakeOrder: targetStatus === "Spam" || targetStatus === "Fake Order",
        timeline: nextTimeline,
        updatedAt: nowISO,
      };

      if (targetStatus === "Delivered" || targetStatus === "Completed") {
        updates.paymentStatus = "Paid";
        updates.paidAmount = Number(existing.totalAmount || 0);
        updates.dueAmount = 0;
        updates.fulfillmentStatus = "Fulfilled";
      } else if (targetStatus === "Returned" || targetStatus === "Refunded") {
        updates.paymentStatus = targetStatus === "Refunded" ? "Refunded" : "Unpaid";
        updates.fulfillmentStatus = "Returned";
      } else if (
        targetStatus === "In Transit" ||
        targetStatus === "Shipped" ||
        targetStatus === "Out for Delivery"
      ) {
        updates.fulfillmentStatus = "Shipped";
      } else if (targetStatus === "Ready to Ship" || targetStatus === "Packed") {
        updates.fulfillmentStatus = "Packed";
      } else if (targetStatus === "Cancelled" || targetStatus === "Spam" || targetStatus === "Fake Order") {
        updates.fulfillmentStatus = "Cancelled";
      }

      const updated = await adapter.updateOrder(found.docId, updates);

      // Sync physical product stock when crossing Delivered/Returned boundaries
      try {
        const wasDelivered = previousStatus === "Delivered" || previousStatus === "Completed";
        const isNowDelivered = targetStatus === "Delivered" || targetStatus === "Completed";
        const isNowReturned = targetStatus === "Returned" || targetStatus === "Refunded";
        if ((!wasDelivered && isNowDelivered) || (wasDelivered && isNowReturned)) {
          const deltaSign = !wasDelivered && isNowDelivered ? -1 : 1;
          const allProducts = await adapter.getAllProducts();
          const orderItems = getOrderItemsList(existing);
          for (const item of orderItems) {
            const prod = allProducts.find(
              (p) =>
                (item.productId && p.id === item.productId) ||
                (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
                (item.productName && p.name && p.name.toLowerCase() === item.productName.toLowerCase())
            );
            if (prod) {
              const prevStock = Number(prod.stock || 0);
              const nextStock = Math.max(0, prevStock + deltaSign * item.quantity);
              await adapter.updateProductStock(prod.id, nextStock);
            }
          }
        }
      } catch {
        // Non-blocking stock sync safeguard
      }

      await adapter.appendActivityLog({
        staffName: actorLabel,
        staffEmail: "muse@kenaxbd.com",
        staffRole: "integration",
        action: "Order Status Updated",
        module: "Orders",
        targetId: existing.id || orderId,
        orderId: existing.id || orderId,
        fromStatus: previousStatus,
        toStatus: targetStatus,
        source: "muse_integration",
        details: `Order #${existing.id || orderId} status changed ${previousStatus} → ${targetStatus}. Note: ${noteText}`,
        timestamp: nowISO,
      });

      return res.status(200).json({
        ok: true,
        now: nowISO,
        order: formatOrderForMuse(updated),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "order_status_update_failed",
        message: err?.message || "Failed to update order status.",
        now: new Date().toISOString(),
      });
    }
  });

  // Catch-all for all other routes under /api/integration/* -> always JSON
  router.all("*", authenticateApiKey, (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
      return res.status(403).json({
        ok: false,
        error: "forbidden_write",
        message: "Forbidden: Only POST /api/integration/orders/:orderId/status is allowed for write operations.",
        now: new Date().toISOString(),
      });
    }
    return res.status(404).json({
      ok: false,
      error: "not_found",
      message: `Unknown integration endpoint: ${req.originalUrl}`,
      now: new Date().toISOString(),
    });
  });

  app.use("/api/integration", router);
  app.use("/", router);

  // Final fallback error handler -> ALWAYS JSON
  app.use((err, _req, res, _next) => {
    return res.status(500).json({
      ok: false,
      error: "internal_server_error",
      message: err?.message || "Unexpected server error.",
      now: new Date().toISOString(),
    });
  });

  return app;
}

const integrationExpressApp = createIntegrationApp();

exports.museIntegrationApi = onRequest(
  {
    region: "asia-southeast1",
    invoker: "public",
    cors: false,
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  integrationExpressApp
);

// Exported for local automated testing without invoking Cloud Functions runtime
exports._createIntegrationApp = createIntegrationApp;
exports._hashApiKey = hashApiKey;
