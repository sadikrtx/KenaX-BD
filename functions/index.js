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
const STAFF_CREDENTIALS_COLLECTION = "staff_credentials";
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const SCRYPT_PREFIX = "scrypt:";
const LEGACY_SHA256_PREFIX = "sha256:";
const LEGACY_SHA256_NAMESPACE = "kenaxbd-staff-v1:";
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
const ALLOWED_STAFF_ROLES = new Set(["super_admin", "admin", "manager", "moderator"]);

function getAdminApp() {
  return getApps().length ? getApp() : initializeApp();
}

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || "ai-studio-kenaxbd-db227bcd-db17-47e7-9023-bbf12ea50418";

function getDb() {
  return getFirestore(getAdminApp(), FIRESTORE_DATABASE_ID);
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

function isScryptHash(value) {
  return Boolean(value && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/i.test(String(value).trim()));
}

function hashPasswordScrypt(plainPassword) {
  const pwd = String(plainPassword ?? "");
  if (!pwd) throw new Error("Password cannot be empty.");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pwd, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString("hex");
  return `${SCRYPT_PREFIX}${salt}:${derived}`;
}

function verifyStaffPasswordServer(plainPassword, storedHash, legacyPlaintext) {
  const candidate = String(plainPassword ?? "");
  if (!candidate) return { valid: false, needsUpgrade: false };
  const trimmed = String(storedHash || "").trim();

  if (isScryptHash(trimmed)) {
    const parts = trimmed.slice(SCRYPT_PREFIX.length).split(":");
    if (parts.length !== 2) return { valid: false, needsUpgrade: false };
    const [saltHex, expectedKeyHex] = parts;
    const derivedHex = crypto.scryptSync(candidate, saltHex, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString("hex");
    return { valid: safeCompareHashHex(expectedKeyHex, derivedHex), needsUpgrade: false };
  }

  if (trimmed.toLowerCase().startsWith(LEGACY_SHA256_PREFIX)) {
    const expectedSha = trimmed.slice(LEGACY_SHA256_PREFIX.length).toLowerCase();
    const candidateSha = crypto
      .createHash("sha256")
      .update(`${LEGACY_SHA256_NAMESPACE}${candidate}`, "utf8")
      .digest("hex");
    const valid = safeCompareHashHex(expectedSha, candidateSha);
    return { valid, needsUpgrade: valid };
  }

  if (typeof legacyPlaintext === "string" && legacyPlaintext.length > 0) {
    const a = Buffer.from(legacyPlaintext, "utf8");
    const b = Buffer.from(candidate, "utf8");
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { valid, needsUpgrade: valid };
  }

  return { valid: false, needsUpgrade: false };
}

function sanitizeStaffDoc(staff) {
  if (!staff) return null;
  const copy = { ...staff };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

function normalizePhoneDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) return digits.slice(2);
  return digits;
}

function isStaffRecordActive(staff) {
  if (!staff) return false;
  if (staff.isRemoved) return false;
  if (staff.isActive === false) return false;
  if (String(staff.status || "").toLowerCase() === "suspended") return false;
  if (!ALLOWED_STAFF_ROLES.has(String(staff.role || "").toLowerCase())) return false;
  return true;
}

function deduplicateOrdersById(orders = []) {
  const map = new Map();
  for (const order of orders) {
    if (!order) continue;
    const id = String(order.id || "").trim();
    if (!id) {
      map.set(`__anon_${map.size}`, order);
      continue;
    }
    const existing = map.get(id);
    if (!existing) {
      map.set(id, order);
    } else {
      const existingTime = Date.parse(existing.updatedAt || existing.createdAt || "") || 0;
      const incomingTime = Date.parse(order.updatedAt || order.createdAt || "") || 0;
      if (incomingTime >= existingTime) {
        map.set(id, order);
      }
    }
  }
  return Array.from(map.values());
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

function computeStoreSalesSummary(rawOrders = [], products = []) {
  const orders = deduplicateOrdersById(rawOrders);
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
  let returnedRevenueLoss = 0;

  const salesByPaymentMethod = {};
  const salesByChannel = {};
  const sellerMap = new Map();

  for (const order of orders) {
    const bucket = getCanonicalOrderBucket(order);
    ordersByStatus[bucket] = (ordersByStatus[bucket] || 0) + 1;

    if (bucket === "cancelled" || bucket === "spam") {
      continue;
    }
    if (bucket === "returned" || bucket === "failed_delivery") {
      returnedRevenueLoss += Number(order.totalAmount ?? order.total ?? 0) || 0;
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
    returnedOrdersCount: ordersByStatus.returned,
    failedDeliveryOrdersCount: ordersByStatus.failed_delivery,
    returnedRevenueLoss,
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

function computeInventoryMetrics(products = [], rawOrders = [], lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  const orders = deduplicateOrdersById(rawOrders);
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
    async getStaffCredential(staffId) {
      const snap = await db.collection(STAFF_CREDENTIALS_COLLECTION).doc(staffId).get();
      return snap.exists ? snap.data() || null : null;
    },
    async saveStaffCredential(staffId, data) {
      await db.collection(STAFF_CREDENTIALS_COLLECTION).doc(staffId).set(data, { merge: true });
    },
    async deleteStaffCredential(staffId) {
      await db.collection(STAFF_CREDENTIALS_COLLECTION).doc(staffId).delete().catch(() => {});
    },
    async saveStaffDoc(staffId, data) {
      const { FieldValue } = require("firebase-admin/firestore");
      const clean = sanitizeStaffDoc(data);
      await db.collection("staff").doc(staffId).set(
        {
          ...clean,
          password: FieldValue.delete(),
          passwordHash: FieldValue.delete(),
        },
        { merge: true }
      );
      await db.collection("deletedStaff").doc(staffId).delete().catch(() => {});
      return clean;
    },
    async deleteStaffDoc(staffId, email) {
      await db.collection("staff").doc(staffId).delete();
      await db.collection(STAFF_CREDENTIALS_COLLECTION).doc(staffId).delete().catch(() => {});
      await db.collection("deletedStaff").doc(staffId).set({
        id: staffId,
        email: String(email || "").trim().toLowerCase(),
        deletedAt: new Date().toISOString(),
      });
    },
    async verifyIdToken(token, checkRevoked = true) {
      try {
        return await getAuth(getAdminApp()).verifyIdToken(token, checkRevoked);
      } catch {
        return null;
      }
    },
    async syncFirebaseStaffUser({ uid, email, displayName, password, disabled, claims }) {
      const adminAuth = getAuth(getAdminApp());
      let userRecord = null;
      if (uid) {
        try {
          userRecord = await adminAuth.getUser(uid);
        } catch {}
      }
      if (!userRecord && email) {
        try {
          userRecord = await adminAuth.getUserByEmail(email);
        } catch {}
      }
      if (!userRecord) {
        userRecord = await adminAuth.createUser({
          email,
          displayName: displayName || "Staff",
          emailVerified: true,
          disabled: Boolean(disabled),
          ...(password && password.length >= 6 ? { password } : {}),
        });
      } else {
        const updatePayload = {};
        if (email && userRecord.email !== email) updatePayload.email = email;
        if (displayName && userRecord.displayName !== displayName) updatePayload.displayName = displayName;
        if (typeof disabled === "boolean") updatePayload.disabled = disabled;
        if (password && password.length >= 6) updatePayload.password = password;
        if (Object.keys(updatePayload).length > 0) {
          userRecord = await adminAuth.updateUser(userRecord.uid, updatePayload);
        }
      }
      if (claims) {
        await adminAuth.setCustomUserClaims(userRecord.uid, claims);
      }
      return userRecord.uid;
    },
    async createCustomToken(uid, claims) {
      return await getAuth(getAdminApp()).createCustomToken(uid, claims);
    },
    async revokeUserRefreshTokens(uid) {
      if (!uid) return;
      try {
        await getAuth(getAdminApp()).revokeRefreshTokens(uid);
      } catch {}
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
  // Middleware 1: Strict Cryptographic Staff Auth & RBAC (ZERO Client Header Trust)
  // --------------------------------------------------------------------------
  async function verifyAuthenticatedStaff(req, res, next) {
    try {
      const adapter = getAdapter();
      const authHeader = String(req.headers.authorization || "").trim();
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          ok: false,
          error: "missing_authorization_token",
          message: "Authentication required: missing Authorization Bearer ID token.",
          now: new Date().toISOString(),
        });
      }

      const rawToken = authHeader.slice(7).trim();
      if (!rawToken || rawToken.length < 20) {
        return res.status(401).json({
          ok: false,
          error: "invalid_authorization_token",
          message: "Authentication failed: invalid Authorization Bearer token.",
          now: new Date().toISOString(),
        });
      }

      const decoded = await adapter.verifyIdToken(rawToken, true);
      if (!decoded || !decoded.uid) {
        return res.status(401).json({
          ok: false,
          error: "invalid_or_revoked_token",
          message: "Authentication failed: Firebase ID token is invalid, expired, or revoked.",
          now: new Date().toISOString(),
        });
      }

      const tokenUid = String(decoded.uid || "").trim();
      const tokenEmail = String(decoded.email || "").trim().toLowerCase();
      const tokenStaffId = String(decoded.staffId || "").trim();

      // Re-verify caller against live Firestore `staff` collection on every request
      const staffList = await adapter.getAllStaff();
      const matched = staffList.find((s) => {
        const sId = String(s?.id || "").trim();
        const sUid = String(s?.firebaseUid || "").trim();
        const sEmail = String(s?.email || "").trim().toLowerCase();
        return (
          (tokenStaffId && sId === tokenStaffId) ||
          (tokenUid && sUid && sUid === tokenUid) ||
          (tokenEmail && sEmail && sEmail === tokenEmail)
        );
      });

      if (!matched) {
        return res.status(403).json({
          ok: false,
          error: "staff_not_found",
          message: "Forbidden: authenticated user is not a registered staff member.",
          now: new Date().toISOString(),
        });
      }

      if (!isStaffRecordActive(matched)) {
        return res.status(403).json({
          ok: false,
          error: "staff_inactive_or_suspended",
          message: "Forbidden: staff account is inactive, suspended, or removed.",
          now: new Date().toISOString(),
        });
      }

      // If Firebase UID is bound on the staff record, require strict UID match
      if (matched.firebaseUid && String(matched.firebaseUid).trim() !== tokenUid) {
        return res.status(403).json({
          ok: false,
          error: "staff_uid_mismatch",
          message: "Forbidden: token identity does not match staff account binding.",
          now: new Date().toISOString(),
        });
      }

      req.verifiedStaff = {
        id: matched.id,
        uid: tokenUid,
        name: matched.name || "Staff",
        email: String(matched.email || "").trim().toLowerCase(),
        role: String(matched.role || "").trim().toLowerCase(),
        permissions: Array.isArray(matched.permissions) ? matched.permissions : [],
      };
      return next();
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "admin_auth_error",
        message: err?.message || "Failed to verify staff authentication.",
        now: new Date().toISOString(),
      });
    }
  }

  async function requireSuperAdmin(req, res, next) {
    return verifyAuthenticatedStaff(req, res, () => {
      if (req.verifiedStaff?.role !== "super_admin") {
        return res.status(403).json({
          ok: false,
          error: "forbidden_super_admin_only",
          message: "Forbidden: this endpoint is restricted exclusively to active Super Admin accounts.",
          now: new Date().toISOString(),
        });
      }
      req.superAdminActor = {
        id: req.verifiedStaff.id,
        name: req.verifiedStaff.name,
        email: req.verifiedStaff.email,
      };
      return next();
    });
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

  // --------------------------------------------------------------------------
  // Staff Authentication & Server-Verified RBAC Router (/api/staff-auth/*)
  // --------------------------------------------------------------------------
  const staffAuthRouter = express.Router();

  // POST /api/staff-auth/login — Server-side salted scrypt verification + Firebase Custom Token with Custom Claims
  staffAuthRouter.post("/login", async (req, res) => {
    try {
      const adapter = getAdapter();
      const rawIdentifier = String(req.body?.identifier || "").trim().toLowerCase();
      const plainPassword = String(req.body?.password || "");

      if (!rawIdentifier || !plainPassword) {
        return res.status(400).json({
          ok: false,
          error: "missing_credentials",
          message: "Please enter both Email/Mobile and Password.",
          now: new Date().toISOString(),
        });
      }

      const cleanDigits = rawIdentifier.replace(/[\s\-\+\(\)]/g, "");
      const normPhone = normalizePhoneDigits(rawIdentifier);
      const staffList = await adapter.getAllStaff();

      const matched = staffList.find((s) => {
        const sEmail = String(s?.email || "").trim().toLowerCase();
        const sPhoneDigits = String(s?.phone || "").replace(/[\s\-\+\(\)]/g, "").toLowerCase();
        const sPhoneNorm = normalizePhoneDigits(s?.phone);
        return (
          (sEmail && sEmail === rawIdentifier) ||
          (cleanDigits.length >= 7 && sPhoneDigits && sPhoneDigits === cleanDigits) ||
          (normPhone.length >= 10 && sPhoneNorm && sPhoneNorm === normPhone)
        );
      });

      if (!matched) {
        return res.status(401).json({
          ok: false,
          error: "invalid_credentials",
          message: "Invalid staff credentials. Access denied.",
          now: new Date().toISOString(),
        });
      }

      if (matched.isRemoved) {
        return res.status(403).json({
          ok: false,
          error: "staff_removed",
          message: "This staff account has been removed. Please contact Super Admin.",
          now: new Date().toISOString(),
        });
      }

      if (!isStaffRecordActive(matched)) {
        return res.status(403).json({
          ok: false,
          error: "staff_suspended",
          message: "Your staff account has been suspended by the Super Admin.",
          now: new Date().toISOString(),
        });
      }

      const credDoc = await adapter.getStaffCredential(matched.id);
      const storedHash = credDoc?.passwordHash || matched.passwordHash || "";
      const { valid, needsUpgrade } = verifyStaffPasswordServer(plainPassword, storedHash, matched.password);

      if (!valid) {
        return res.status(401).json({
          ok: false,
          error: "invalid_credentials",
          message: "Invalid staff credentials. Access denied.",
          now: new Date().toISOString(),
        });
      }

      const nowIso = new Date().toISOString();
      // Always upgrade legacy SHA-256 / plaintext credentials to salted scrypt in server-only `staff_credentials`
      if (needsUpgrade || !credDoc?.passwordHash || !isScryptHash(credDoc.passwordHash)) {
        await adapter.saveStaffCredential(matched.id, {
          staffId: matched.id,
          email: String(matched.email || "").trim().toLowerCase(),
          passwordHash: hashPasswordScrypt(plainPassword),
          updatedAt: nowIso,
        });
      }

      const customClaims = {
        role: String(matched.role || "").trim().toLowerCase(),
        staffId: matched.id,
        staffActive: true,
      };

      const firebaseUid = await adapter.syncFirebaseStaffUser({
        uid: matched.firebaseUid,
        email: String(matched.email || "").trim().toLowerCase(),
        displayName: matched.name || "Staff",
        password: plainPassword.length >= 6 ? plainPassword : undefined,
        disabled: false,
        claims: customClaims,
      });

      const updatedStaff = await adapter.saveStaffDoc(matched.id, {
        ...sanitizeStaffDoc(matched),
        firebaseUid,
        lastLogin: nowIso,
        updatedAt: nowIso,
      });

      const customToken = await adapter.createCustomToken(firebaseUid, customClaims);

      return res.status(200).json({
        ok: true,
        customToken,
        staff: sanitizeStaffDoc(updatedStaff),
        now: nowIso,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "staff_login_failed",
        message: err?.message || "Failed to authenticate staff.",
        now: new Date().toISOString(),
      });
    }
  });

  // GET /api/staff-auth/me — Verify current Bearer ID token against live Firestore staff record
  staffAuthRouter.get("/me", verifyAuthenticatedStaff, async (req, res) => {
    try {
      const adapter = getAdapter();
      const staffList = await adapter.getAllStaff();
      const current = staffList.find((s) => s.id === req.verifiedStaff.id);
      if (!current || !isStaffRecordActive(current)) {
        return res.status(403).json({
          ok: false,
          error: "staff_inactive_or_suspended",
          message: "Staff account is no longer active.",
          now: new Date().toISOString(),
        });
      }
      return res.status(200).json({
        ok: true,
        staff: sanitizeStaffDoc(current),
        now: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "session_check_failed",
        message: err?.message || "Failed to verify staff session.",
        now: new Date().toISOString(),
      });
    }
  });

  // GET /api/staff-auth/staff — Super Admin ONLY (returns sanitized records, NEVER password hashes)
  staffAuthRouter.get("/staff", requireSuperAdmin, async (_req, res) => {
    try {
      const adapter = getAdapter();
      const list = (await adapter.getAllStaff()).map(sanitizeStaffDoc);
      return res.status(200).json({
        ok: true,
        staff: list,
        now: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "staff_list_failed",
        message: err?.message || "Failed to list staff.",
        now: new Date().toISOString(),
      });
    }
  });

  // POST /api/staff-auth/staff — Create Staff (Super Admin ONLY)
  staffAuthRouter.post("/staff", requireSuperAdmin, async (req, res) => {
    try {
      const adapter = getAdapter();
      const payload = req.body || {};
      const email = String(payload.email || "").trim().toLowerCase();
      const name = String(payload.name || "").trim();
      const role = String(payload.role || "moderator").trim().toLowerCase();
      const plainPassword = String(payload.password || "").trim();

      if (!name || !email) {
        return res.status(400).json({
          ok: false,
          error: "invalid_staff_payload",
          message: "Staff name and email are required.",
          now: new Date().toISOString(),
        });
      }
      if (!ALLOWED_STAFF_ROLES.has(role)) {
        return res.status(400).json({
          ok: false,
          error: "invalid_staff_role",
          message: `Invalid staff role "${role}".`,
          now: new Date().toISOString(),
        });
      }
      if (plainPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          error: "weak_password",
          message: "Password must be at least 6 characters.",
          now: new Date().toISOString(),
        });
      }

      const existingStaff = await adapter.getAllStaff();
      if (existingStaff.some((s) => String(s.email || "").trim().toLowerCase() === email && !s.isRemoved)) {
        return res.status(409).json({
          ok: false,
          error: "staff_email_exists",
          message: "A staff account with this email already exists.",
          now: new Date().toISOString(),
        });
      }

      const nowIso = new Date().toISOString();
      const staffId = String(payload.id || `staff-${Date.now()}`).trim();
      const isActive = payload.isActive !== false && payload.status !== "suspended";
      const customClaims = { role, staffId, staffActive: isActive };

      const firebaseUid = await adapter.syncFirebaseStaffUser({
        email,
        displayName: name,
        password: plainPassword,
        disabled: !isActive,
        claims: customClaims,
      });

      await adapter.saveStaffCredential(staffId, {
        staffId,
        email,
        passwordHash: hashPasswordScrypt(plainPassword),
        updatedAt: nowIso,
      });

      const saved = await adapter.saveStaffDoc(staffId, {
        id: staffId,
        firebaseUid,
        name,
        email,
        phone: String(payload.phone || "").trim(),
        role,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        isActive,
        status: isActive ? "active" : "suspended",
        isRemoved: false,
        createdAt: payload.createdAt || nowIso,
        updatedAt: nowIso,
        createdBy: req.superAdminActor?.email || "super_admin",
      });

      return res.status(201).json({
        ok: true,
        staff: sanitizeStaffDoc(saved),
        now: nowIso,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "staff_create_failed",
        message: err?.message || "Failed to create staff account.",
        now: new Date().toISOString(),
      });
    }
  });

  // PATCH /api/staff-auth/staff/:staffId — Update Staff Role/Status/Permissions/Password (Super Admin ONLY)
  staffAuthRouter.patch("/staff/:staffId", requireSuperAdmin, async (req, res) => {
    try {
      const adapter = getAdapter();
      const staffId = String(req.params.staffId || "").trim();
      const payload = req.body || {};
      const staffList = await adapter.getAllStaff();
      const target = staffList.find((s) => s.id === staffId);

      if (!target) {
        return res.status(404).json({
          ok: false,
          error: "staff_not_found",
          message: `Staff account "${staffId}" not found.`,
          now: new Date().toISOString(),
        });
      }

      const nextRole = payload.role ? String(payload.role).trim().toLowerCase() : String(target.role || "").toLowerCase();
      if (!ALLOWED_STAFF_ROLES.has(nextRole)) {
        return res.status(400).json({
          ok: false,
          error: "invalid_staff_role",
          message: `Invalid staff role "${nextRole}".`,
          now: new Date().toISOString(),
        });
      }

      const nextIsActive =
        typeof payload.isActive === "boolean"
          ? payload.isActive
          : payload.status === "suspended"
          ? false
          : payload.status === "active"
          ? true
          : target.isActive !== false;
      const nextIsRemoved = typeof payload.isRemoved === "boolean" ? payload.isRemoved : Boolean(target.isRemoved);

      // Prevent locking out the last active Super Admin
      if (target.role === "super_admin" && (nextRole !== "super_admin" || !nextIsActive || nextIsRemoved)) {
        const otherActiveSuperAdmins = staffList.filter(
          (s) => s.id !== target.id && s.role === "super_admin" && isStaffRecordActive(s)
        );
        if (otherActiveSuperAdmins.length === 0) {
          return res.status(409).json({
            ok: false,
            error: "cannot_demote_last_super_admin",
            message: "Cannot suspend, remove, or demote the last active Super Admin.",
            now: new Date().toISOString(),
          });
        }
      }

      const nowIso = new Date().toISOString();
      const nextEmail = payload.email ? String(payload.email).trim().toLowerCase() : String(target.email || "").trim().toLowerCase();
      const nextName = payload.name ? String(payload.name).trim() : target.name;
      const newPassword = typeof payload.password === "string" && payload.password.trim() ? payload.password.trim() : "";

      if (newPassword && newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          error: "weak_password",
          message: "Password must be at least 6 characters.",
          now: new Date().toISOString(),
        });
      }

      const customClaims = { role: nextRole, staffId, staffActive: nextIsActive && !nextIsRemoved };
      const firebaseUid = await adapter.syncFirebaseStaffUser({
        uid: target.firebaseUid,
        email: nextEmail,
        displayName: nextName,
        password: newPassword || undefined,
        disabled: !nextIsActive || nextIsRemoved,
        claims: customClaims,
      });

      if (newPassword) {
        await adapter.saveStaffCredential(staffId, {
          staffId,
          email: nextEmail,
          passwordHash: hashPasswordScrypt(newPassword),
          updatedAt: nowIso,
        });
      }

      // Immediately revoke tokens if suspended, removed, demoted, or password changed
      if (!nextIsActive || nextIsRemoved || nextRole !== target.role || Boolean(newPassword)) {
        await adapter.revokeUserRefreshTokens(firebaseUid);
      }

      const saved = await adapter.saveStaffDoc(staffId, {
        ...sanitizeStaffDoc(target),
        id: staffId,
        firebaseUid,
        name: nextName,
        email: nextEmail,
        phone: payload.phone !== undefined ? String(payload.phone || "").trim() : target.phone,
        role: nextRole,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : target.permissions || [],
        isActive: nextIsActive,
        status: nextIsActive ? "active" : "suspended",
        isRemoved: nextIsRemoved,
        updatedAt: nowIso,
      });

      return res.status(200).json({
        ok: true,
        staff: sanitizeStaffDoc(saved),
        now: nowIso,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "staff_update_failed",
        message: err?.message || "Failed to update staff account.",
        now: new Date().toISOString(),
      });
    }
  });

  // DELETE /api/staff-auth/staff/:staffId — Delete Staff & Revoke Tokens (Super Admin ONLY)
  staffAuthRouter.delete("/staff/:staffId", requireSuperAdmin, async (req, res) => {
    try {
      const adapter = getAdapter();
      const staffId = String(req.params.staffId || "").trim();
      const staffList = await adapter.getAllStaff();
      const target = staffList.find((s) => s.id === staffId);

      if (!target) {
        return res.status(404).json({
          ok: false,
          error: "staff_not_found",
          message: `Staff account "${staffId}" not found.`,
          now: new Date().toISOString(),
        });
      }

      if (target.role === "super_admin") {
        const otherActiveSuperAdmins = staffList.filter(
          (s) => s.id !== target.id && s.role === "super_admin" && isStaffRecordActive(s)
        );
        if (otherActiveSuperAdmins.length === 0) {
          return res.status(409).json({
            ok: false,
            error: "cannot_delete_last_super_admin",
            message: "Cannot delete the last active Super Admin account.",
            now: new Date().toISOString(),
          });
        }
      }

      if (target.firebaseUid) {
        await adapter.syncFirebaseStaffUser({
          uid: target.firebaseUid,
          email: target.email,
          disabled: true,
          claims: { role: "revoked", staffId, staffActive: false },
        }).catch(() => {});
        await adapter.revokeUserRefreshTokens(target.firebaseUid);
      }

      await adapter.deleteStaffDoc(staffId, target.email);

      return res.status(200).json({
        ok: true,
        deletedId: staffId,
        now: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "staff_delete_failed",
        message: err?.message || "Failed to delete staff account.",
        now: new Date().toISOString(),
      });
    }
  });

  // POST /api/staff-auth/change-password — Authenticated Staff self-change (verifies currentPassword)
  staffAuthRouter.post("/change-password", verifyAuthenticatedStaff, async (req, res) => {
    try {
      const adapter = getAdapter();
      const currentPassword = String(req.body?.currentPassword || "");
      const newPassword = String(req.body?.newPassword || "").trim();

      if (newPassword.length < 6) {
        return res.status(400).json({
          ok: false,
          error: "weak_password",
          message: "New password must be at least 6 characters.",
          now: new Date().toISOString(),
        });
      }

      const staffList = await adapter.getAllStaff();
      const target = staffList.find((s) => s.id === req.verifiedStaff.id);
      if (!target || !isStaffRecordActive(target)) {
        return res.status(403).json({
          ok: false,
          error: "staff_inactive_or_suspended",
          message: "Account is not active.",
          now: new Date().toISOString(),
        });
      }

      const credDoc = await adapter.getStaffCredential(target.id);
      const storedHash = credDoc?.passwordHash || target.passwordHash || "";
      const { valid } = verifyStaffPasswordServer(currentPassword, storedHash, target.password);
      if (!valid) {
        return res.status(401).json({
          ok: false,
          error: "invalid_current_password",
          message: "Current password is incorrect.",
          now: new Date().toISOString(),
        });
      }

      const nowIso = new Date().toISOString();
      await adapter.saveStaffCredential(target.id, {
        staffId: target.id,
        email: target.email,
        passwordHash: hashPasswordScrypt(newPassword),
        updatedAt: nowIso,
      });

      const firebaseUid = await adapter.syncFirebaseStaffUser({
        uid: target.firebaseUid || req.verifiedStaff.uid,
        email: target.email,
        displayName: target.name,
        password: newPassword,
        disabled: false,
        claims: { role: target.role, staffId: target.id, staffActive: true },
      });
      await adapter.revokeUserRefreshTokens(firebaseUid);

      return res.status(200).json({
        ok: true,
        message: "Password updated securely.",
        now: nowIso,
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "password_change_failed",
        message: err?.message || "Failed to change password.",
        now: new Date().toISOString(),
      });
    }
  });

  // POST /api/staff-auth/track-order — Verified guest order lookup (requires BOTH orderId AND matching phone)
  staffAuthRouter.post("/track-order", async (req, res) => {
    try {
      const adapter = getAdapter();
      const rawOrderId = String(req.body?.orderId || "").trim();
      const rawPhone = normalizePhoneDigits(req.body?.phone || "");
      if (!rawOrderId || rawPhone.length < 10) {
        return res.status(400).json({
          ok: false,
          error: "missing_tracking_fields",
          message: "Both Order ID and a valid mobile number are required.",
          now: new Date().toISOString(),
        });
      }

      const found = await adapter.getOrderById(rawOrderId);
      if (!found || !found.data) {
        return res.status(404).json({
          ok: false,
          error: "order_not_found",
          message: "No matching order found for this Tracking ID and mobile number.",
          now: new Date().toISOString(),
        });
      }

      const ord = found.data;
      const phoneCandidates = [
        ord.customerMobile,
        ord.deliveryMobile,
        ord.customerPhone,
        ord.phone,
        ord.mobile,
      ]
        .map((p) => normalizePhoneDigits(p))
        .filter((p) => p.length >= 10);

      const phoneMatched = phoneCandidates.some((p) => p === rawPhone || p.endsWith(rawPhone.slice(-10)));
      if (!phoneMatched) {
        return res.status(404).json({
          ok: false,
          error: "order_not_found",
          message: "No matching order found for this Tracking ID and mobile number.",
          now: new Date().toISOString(),
        });
      }

      // Return strictly sanitized tracking view (no internal notes, IPs, or unrelated PII)
      const sanitizedOrder = {
        id: ord.id || found.docId,
        orderStatus: ord.orderStatus || ord.status || "Pending",
        status: ord.status || ord.orderStatus || "Pending",
        paymentStatus: ord.paymentStatus || "Unpaid",
        paymentMethod: ord.paymentMethod || "COD",
        createdAt: ord.createdAt || null,
        updatedAt: ord.updatedAt || null,
        trackingNumber: ord.trackingNumber || null,
        courierName: ord.courierName || null,
        courierTrackingUrl: ord.courierTrackingUrl || null,
        customerName: ord.customerName || "Customer",
        customerMobile: ord.customerMobile || "",
        deliveryMobile: ord.deliveryMobile || "",
        city: ord.city || "",
        division: ord.division || "",
        subtotal: Number(ord.subtotal || 0),
        deliveryFee: Number(ord.deliveryFee || 0),
        discount: Number(ord.discount || 0),
        totalAmount: Number(ord.totalAmount || 0),
        paidAmount: Number(ord.paidAmount || 0),
        dueAmount: Number(ord.dueAmount || 0),
        items: Array.isArray(ord.items) ? ord.items : [],
        statusHistory: Array.isArray(ord.statusHistory) ? ord.statusHistory : [],
      };

      return res.status(200).json({
        ok: true,
        order: sanitizedOrder,
        now: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "track_order_failed",
        message: err?.message || "Failed to look up order.",
        now: new Date().toISOString(),
      });
    }
  });

  app.use("/api/staff-auth", staffAuthRouter);
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
exports._hashPasswordScrypt = hashPasswordScrypt;
exports._verifyStaffPasswordServer = verifyStaffPasswordServer;
exports._computeStoreSalesSummary = computeStoreSalesSummary;
exports._computeInventoryMetrics = computeInventoryMetrics;
exports._deduplicateOrdersById = deduplicateOrdersById;

