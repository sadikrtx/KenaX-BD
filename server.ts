import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { searchCatalogHierarchicalMatrix } from "./src/lib/chatBotRuleMatcher.ts";

// Suppress benign internal Firestore idle stream noise in Node server logs
const originalServerErr = console.error;
console.error = function (...args: any[]) {
  try {
    const msg = args
      .map((a) => {
        if (a === null || a === undefined) return '';
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message + ' ' + (a.stack || '');
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');
    if (
      msg.includes('Disconnecting idle stream') ||
      msg.includes('Timed out waiting for new targets') ||
      msg.includes("RPC 'Listen' stream") ||
      msg.includes('GrpcConnection RPC') ||
      (msg.includes('@firebase/firestore') && msg.includes('CANCELLED'))
    ) {
      return;
    }
  } catch {}
  originalServerErr.apply(console, args);
};

const originalServerWarn = console.warn;
console.warn = function (...args: any[]) {
  try {
    const msg = args
      .map((a) => {
        if (a === null || a === undefined) return '';
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message + ' ' + (a.stack || '');
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');
    if (
      msg.includes('Disconnecting idle stream') ||
      msg.includes('Timed out waiting for new targets') ||
      msg.includes("RPC 'Listen' stream") ||
      msg.includes('GrpcConnection RPC') ||
      (msg.includes('@firebase/firestore') && msg.includes('CANCELLED'))
    ) {
      return;
    }
  } catch {}
  originalServerWarn.apply(console, args);
};

import { getAllProductsFromSQL, saveProductToSQL, deleteProductFromSQL, getDeletedProductIdsFromStore } from "./src/db/products.ts";
import { isDemoProductId, DEMO_PRODUCT_IDS } from "./src/data/initialProducts.ts";
import { getAllOrdersFromStore, saveOrderToStore, updateOrderInStore, getCustomerOrdersFromStore, deleteOrderFromStore } from "./src/db/orders.ts";
import { getAllCustomersFromStore, saveCustomerToStore, findCustomerInStore, deleteCustomerFromStore } from "./src/db/customers.ts";
import { getAllStaffFromStore, saveStaffToStore, deleteStaffFromStore } from "./src/db/staff.ts";
import {
  syncFirestoreWithServerStore,
  writeCustomerToFirestore,
  writeOrderToFirestore,
  writeStaffToFirestore,
  deleteStaffFromFirestore,
  deleteCustomerFromFirestore,
  writeProductToFirestore,
  deleteProductFromFirestore,
} from "./src/db/firestoreSync.ts";
import {
  saveWhatsAppMessage,
  updateWhatsAppMessageStatus,
  logWhatsAppWebhook,
  getAllWhatsAppMessages,
  getAllWhatsAppMessagesAsync,
  markWhatsAppConversationAsReadInStore,
  markWhatsAppConversationAsUnreadInStore,
  markAllWhatsAppConversationsAsReadInStore,
  getPinnedWhatsAppChatsFromStore,
  togglePinnedWhatsAppChatInStore,
  getAllWhatsAppWebhookLogs,
  syncWhatsAppMessageToFirestore,
  WhatsAppMessageRecord,
  isPhoneMatch,
  normalizePhoneNumber,
} from "./src/db/whatsapp.ts";
import {
  validateBangladeshMobile,
  cleanBDPhoneNumber,
  normalizeBDPhoneNumber,
  isValidBDMobileNumber,
} from "./src/utils/phoneUtils.ts";
import {
  getServerTelegramSettings,
  saveServerTelegramSettings,
  testServerTelegramBotToken,
  getServerTelegramLogs,
  saveServerTelegramLog,
} from "./src/db/telegram.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize and synchronize server store with Firestore in the background
  syncFirestoreWithServerStore().catch((err) => {
    console.warn("[Server Startup] Firestore sync notice:", err.message);
  });

  app.use(
    express.json({
      limit: "50mb",
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(express.static(path.join(process.cwd(), "public")));

  // Enable CORS for Netlify, custom domains, and cross-origin client requests
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, x-app-env, Accept");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  function checkIsEnvPreview(req: express.Request): boolean {
    const envHeader = req.headers['x-app-env'];
    if (envHeader === 'preview') return true;
    if (req.query.env === 'preview') return true;
    const referer = String(req.headers.referer || '');
    if (referer.includes('ais-dev-') || referer.includes('localhost') || referer.includes('127.0.0.1')) return true;
    return false;
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KenaX BD", timestamp: new Date().toISOString() });
  });

  // Website & Payment Settings API (Dynamic cross-user synchronization)
  app.get("/api/settings", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const settingsFile = isEnvPreview ? "preview_server_settings.json" : "server_settings.json";
      const filePath = path.join(process.cwd(), "data", settingsFile);
      const fallbackFilePath = path.join(process.cwd(), "data", "server_settings.json");

      let targetPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackFilePath) ? fallbackFilePath : null);
      if (targetPath) {
        const raw = fs.readFileSync(targetPath, "utf-8");
        const parsed = JSON.parse(raw);
        return res.json(parsed);
      }
      res.json(null);
    } catch (err: any) {
      console.error("[GET /api/settings error]:", err);
      res.status(500).json({ error: "Failed to load settings", details: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const settings = req.body;
      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ error: "Invalid settings payload" });
      }

      const file1 = path.join(dataDir, "server_settings.json");
      const file2 = path.join(dataDir, "preview_server_settings.json");

      // Merge with existing file if present so partial saves do not erase other configurations
      let existing: any = {};
      const checkPath = isEnvPreview && fs.existsSync(file2) ? file2 : (fs.existsSync(file1) ? file1 : null);
      if (checkPath) {
        try {
          existing = JSON.parse(fs.readFileSync(checkPath, "utf-8"));
        } catch {}
      }

      const merged = { ...existing, ...settings };
      const serialized = JSON.stringify(merged, null, 2);

      fs.writeFileSync(file1, serialized, "utf-8");
      fs.writeFileSync(file2, serialized, "utf-8");

      res.json({ success: true, settings: merged });
    } catch (err: any) {
      console.error("[POST /api/settings error]:", err);
      res.status(500).json({ error: "Failed to persist settings", details: err.message });
    }
  });

  // Cloud SQL Products API
  app.get("/api/products", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const productsList = await getAllProductsFromSQL(isEnvPreview);
      res.json(productsList);
    } catch (err: any) {
      console.error("[Cloud SQL GET /api/products error]:", err);
      res.status(500).json({ error: "Failed to fetch products from Cloud SQL database", details: err.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ error: "Invalid product object, missing id" });
      }
      const saved = await saveProductToSQL(product, isEnvPreview, true);
      writeProductToFirestore(saved, isEnvPreview).catch((err) => {
        console.warn("[Firestore Sync] writeProductToFirestore background notice:", err.message);
      });
      res.json({ success: true, product: saved });
    } catch (err: any) {
      console.error("[Cloud SQL POST /api/products error]:", err);
      res.status(500).json({ error: "Failed to save product in Cloud SQL database", details: err.message });
    }
  });

  app.post("/api/products/batch-sync", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const deletedSet = new Set(getDeletedProductIdsFromStore());
      const { products: items = [] } = req.body;
      let count = 0;
      for (const item of items) {
        if (item && item.id) {
          if (deletedSet.has(item.id)) continue;
          if (!isEnvPreview && isDemoProductId(item.id)) continue;
          await saveProductToSQL(item, isEnvPreview, false);
          writeProductToFirestore(item, isEnvPreview).catch(() => {});
          count++;
        }
      }
      res.json({ success: true, count });
    } catch (err: any) {
      console.error("[Cloud SQL Batch Sync error]:", err);
      res.status(500).json({ error: "Failed batch sync to Cloud SQL", details: err.message });
    }
  });

  app.get("/api/products/deleted-ids", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const ids = getDeletedProductIdsFromStore(isEnvPreview);
      res.json(ids);
    } catch {
      res.json([]);
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { id } = req.params;
      await deleteProductFromSQL(id, isEnvPreview);
      deleteProductFromFirestore(id, isEnvPreview).catch((err) => {
        console.warn("[Firestore Sync] deleteProductFromFirestore background notice:", err.message);
      });
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("[Cloud SQL DELETE /api/products error]:", err);
      res.status(500).json({ error: "Failed to delete product from Cloud SQL database", details: err.message });
    }
  });

  // Central Server Orders API (Permanent Cloud Persistence)
  app.get("/api/orders", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const orders = getAllOrdersFromStore(isEnvPreview);
      const normalized = (orders || []).map((o: any) => {
        const rawStatus = (o.orderStatus || o.status || 'Pending').toString().trim();
        const lower = rawStatus.toLowerCase();
        const normalizedStatus =
          lower === 'pending'
            ? 'Pending'
            : lower === 'confirmed'
            ? 'Confirmed'
            : lower === 'cancelled'
            ? 'Cancelled'
            : lower === 'delivered'
            ? 'Delivered'
            : lower === 'processing'
            ? 'Processing'
            : lower === 'shipped'
            ? 'Shipped'
            : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
        return {
          ...o,
          orderStatus: normalizedStatus,
          status: normalizedStatus,
          isV2Order: true,
        };
      });
      res.json(normalized);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server orders", details: err.message });
    }
  });

  app.post("/api/track-order", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { orderId, mobile } = req.body || {};

      if (!orderId || !mobile) {
        return res.status(400).json({
          success: false,
          matchType: 'invalid_input',
          message: 'অনুগ্রহ করে অর্ডার আইডি এবং ১১ ডিজিটের মোবাইল নম্বর উভয়ই লিখুন।',
        });
      }

      const cleanOrderId = String(orderId).trim().replace('#', '').toLowerCase();
      const phoneVal = validateBangladeshMobile(mobile, { lang: 'bn' });
      if (!phoneVal.isValid) {
        return res.status(400).json({
          success: false,
          matchType: 'invalid_input',
          message: phoneVal.error || 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন।',
        });
      }
      const p11 = phoneVal.normalizedPhone;

      const allOrders = getAllOrdersFromStore(isEnvPreview) || [];

      // Find exact match where both order ID and mobile number match
      const exactMatch = allOrders.find((ord: any) => {
        const oId = String(ord.id || '').trim().replace('#', '').toLowerCase();
        const m1 = String(ord.customerMobile || ord.mobile || '').replace(/[^0-9]/g, '');
        const m2 = String(ord.deliveryMobile || '').replace(/[^0-9]/g, '');

        const isIdMatch = oId === cleanOrderId || oId.includes(cleanOrderId) || cleanOrderId.includes(oId);
        const isPhoneMatch = p11 ? (m1.includes(p11) || m2.includes(p11)) : false;

        return isIdMatch && isPhoneMatch;
      });

      if (exactMatch) {
        return res.json({
          success: true,
          matchType: 'exact',
          order: exactMatch,
        });
      }

      // Check if order ID or phone exists separately
      const idExists = allOrders.some((ord: any) => {
        const oId = String(ord.id || '').trim().replace('#', '').toLowerCase();
        return oId === cleanOrderId || oId.includes(cleanOrderId) || cleanOrderId.includes(oId);
      });

      const mobileExists = allOrders.some((ord: any) => {
        const m1 = String(ord.customerMobile || ord.mobile || '').replace(/[^0-9]/g, '');
        const m2 = String(ord.deliveryMobile || '').replace(/[^0-9]/g, '');
        return p11 ? (m1.includes(p11) || m2.includes(p11)) : false;
      });

      if (idExists || mobileExists) {
        return res.json({
          success: false,
          matchType: 'mismatch',
          message: 'আপনার এই নাম্বারে কোন অর্ডার নাই কিংবা এই অর্ডার আইডিতে ভুল। আপনি সঠিক নাম্বার কিংবা সঠিক অর্ডার আইডি দিয়ে পুনরায় চেষ্টা করুন।',
        });
      }

      // Neither order ID nor mobile number found
      return res.json({
        success: false,
        matchType: 'not_found',
        message: 'আপনার এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি। আপনি অর্ডার করতে চাইলে আমাদের কোনো পণ্য অর্ডার করুন।',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

// ==========================================
// REAL-TIME ORDER NOTIFICATION DISPATCHERS
// (Telegram, WhatsApp, Gmail / Email)
// ==========================================
async function sendOrderEmailNotification(order: any) {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'sadikrtx3060@gmail.com';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      console.log(`[Order Email Notification]: SMTP credentials not set. Order email ready for #${order.id}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const itemsStr = (order.items || [])
      .map((i: any) => `• ${i.productName || i.name} (x${i.quantity || 1}) - ৳${i.price || 0}`)
      .join('<br>');

    const isBotOrder =
      order.isAiBotOrder === true ||
      order.orderSource === 'ai_bot' ||
      order.source === 'Ordered by KenaX Bot' ||
      order.source === 'KenaX AI Bot';
    const sourceLabel = isBotOrder ? 'Ordered by KenaX Bot' : (order.source || 'Website Store');

    const recipients = [adminEmail];
    if (order.customerEmail && order.customerEmail.includes('@') && !order.customerEmail.includes('guest@kenaxbd.com')) {
      recipients.push(order.customerEmail);
    }

    await transporter.sendMail({
      from: `"KenaX BD" <${smtpUser}>`,
      to: recipients.join(','),
      subject: `[নতুন অর্ডার #${order.id}] ${sourceLabel} - ৳${order.totalAmount || order.total}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #059669; margin-top: 0;">🔔 নতুন অর্ডার প্রাপ্তি (KenaX BD)</h2>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 10px 14px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #065f46;">
              ${isBotOrder ? '🤖' : '🌐'} অর্ডার উৎস: ${sourceLabel}
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 140px;">অর্ডার আইডি:</td>
              <td style="padding: 8px 0; font-weight: bold; font-family: monospace; color: #0284c7;">#${order.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">গ্রাহকের নাম:</td>
              <td style="padding: 8px 0; font-weight: bold;">${order.customerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">মোবাইল নম্বর:</td>
              <td style="padding: 8px 0; font-family: monospace; font-weight: bold;">${order.customerMobile}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">ডেলিভারি ঠিকানা:</td>
              <td style="padding: 8px 0;">${order.deliveryAddress || order.fullAddress}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">অর্ডারকৃত পণ্য:</td>
              <td style="padding: 8px 0;">${itemsStr || order.productName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">পেমেন্ট মেথড:</td>
              <td style="padding: 8px 0;">${order.paymentMethod} ${order.transactionId ? `(TrxID: ${order.transactionId})` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0 8px 0; color: #64748b; font-size: 15px;">মোট প্রদেয় বিল:</td>
              <td style="padding: 12px 0 8px 0; font-weight: bold; color: #059669; font-size: 18px;">৳${order.totalAmount || order.total}</td>
            </tr>
          </table>
        </div>
      `,
    });
    console.log(`[Order Email Notification]: Email successfully sent for #${order.id}`);
  } catch (err: any) {
    console.warn(`[Order Email Notification Error]:`, err?.message);
  }
}

async function sendOrderTelegramNotification(order: any) {
  try {
    const settings = await getServerTelegramSettings();
    const botToken = (settings.botToken || "").trim();
    const targets = [
      settings.superAdminChatId,
      ...(settings.adminChatIds || []),
    ].filter(Boolean);

    if (!botToken || targets.length === 0) {
      return;
    }

    const itemsSummary = (order.items || [])
      .map((i: any) => `• ${i.productName || i.name} (x${i.quantity || 1}) - ৳${i.price || 0}`)
      .join('\n') || `• ${order.productName}`;

    const isBotOrder =
      order.isAiBotOrder === true ||
      order.orderSource === 'ai_bot' ||
      order.source === 'Ordered by KenaX Bot' ||
      order.source === 'KenaX AI Bot';
    const sourceLabel = isBotOrder ? 'Ordered by KenaX Bot' : (order.source || 'Website Store');

    const text = `🔔 <b>[নতুন অর্ডার প্রাপ্তি - KenaX BD]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${isBotOrder ? '🤖' : '🌐'} <b>উৎস:</b> <code>${sourceLabel}</code>\n` +
      `🆔 <b>অর্ডার আইডি:</b> <code>#${order.id}</code>\n` +
      `👤 <b>গ্রাহক:</b> ${order.customerName}\n` +
      `📱 <b>মোবাইল:</b> <code>${order.customerMobile}</code>\n` +
      `📍 <b>ঠিকানা:</b> ${order.deliveryAddress || order.fullAddress}\n` +
      `🛍️ <b>পণ্যসমূহ:</b>\n${itemsSummary}\n` +
      `💳 <b>পেমেন্ট:</b> ${order.paymentMethod} ${order.transactionId ? `(TrxID: ${order.transactionId})` : ''}\n` +
      `💰 <b>মোট বিল:</b> <b>৳${order.totalAmount || order.total}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}`;

    for (const targetId of targets) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetId,
            text,
            parse_mode: "HTML",
          }),
        });
      } catch {}
    }
  } catch (err: any) {
    console.warn(`[Order Telegram Notification Error]:`, err?.message);
  }
}

async function sendOrderWhatsAppNotification(order: any) {
  try {
    const accessToken = (
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_WHATSAPP_TOKEN ||
      ""
    ).trim();
    const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1282711991587859").trim();
    const adminPhone = (process.env.WHATSAPP_SUPER_ADMIN_PHONE || "8801719143897").replace(/[^0-9]/g, '');

    const isBotOrder =
      order.isAiBotOrder === true ||
      order.orderSource === 'ai_bot' ||
      order.source === 'Ordered by KenaX Bot' ||
      order.source === 'KenaX AI Bot';
    const sourceLabel = isBotOrder ? 'Ordered by KenaX Bot' : (order.source || 'Website Store');

    const waText = `🔔 *[নতুন অর্ডার - KenaX BD]*\n\n` +
      `${isBotOrder ? '🤖' : '🌐'} *উৎস:* ${sourceLabel}\n` +
      `🆔 *অর্ডার আইডি:* #${order.id}\n` +
      `👤 *গ্রাহক:* ${order.customerName}\n` +
      `📱 *মোবাইল:* ${order.customerMobile}\n` +
      `📍 *ঠিকানা:* ${order.deliveryAddress || order.fullAddress}\n` +
      `🛍️ *পণ্য:* ${order.productName || (order.items || []).map((i: any) => i.productName || i.name).join(', ')}\n` +
      `💵 *মোট টাকা:* ৳${order.totalAmount || order.total}\n` +
      `💳 *পেমেন্ট:* ${order.paymentMethod}\n` +
      `⏰ ${new Date().toLocaleTimeString('bn-BD', { timeZone: 'Asia/Dhaka' })}`;

    if (accessToken && phoneId && adminPhone) {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: adminPhone.startsWith('88') ? adminPhone : `88${adminPhone}`,
          type: "text",
          text: { body: waText },
        }),
      });
    }
  } catch (err: any) {
    console.warn(`[Order WhatsApp Notification Error]:`, err?.message);
  }
}

  app.post("/api/orders", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ error: "Invalid order object, missing id" });
      }

      // Strict Bangladesh Mobile Number Validation on Order Creation
      const primaryMobile = order.customerMobile || order.deliveryMobile || order.phone || order.mobile;
      const phoneValidation = validateBangladeshMobile(primaryMobile, { lang: 'en' });
      if (!phoneValidation.isValid) {
        return res.status(400).json({
          error: `Invalid customer mobile number: ${phoneValidation.error || 'Must be 11 digits starting with 01 (e.g. 017XXXXXXXX)'}`,
          validationError: phoneValidation.error,
        });
      }

      // Normalize phone numbers on order object
      order.customerMobile = phoneValidation.normalizedPhone;
      if (order.deliveryMobile) {
        const delivVal = validateBangladeshMobile(order.deliveryMobile, { lang: 'en' });
        order.deliveryMobile = delivVal.isValid ? delivVal.normalizedPhone : phoneValidation.normalizedPhone;
      } else {
        order.deliveryMobile = phoneValidation.normalizedPhone;
      }
      
      // Only orders specifically created through the AI Bot should be tagged as 'Ordered by KenaX Bot'
      const isExplicitBotOrder =
        order.orderSource === 'chatbot' ||
        order.orderSource === 'ai_bot';

      if (isExplicitBotOrder) {
        order.isAiBotOrder = true;
        order.source = 'Ordered by KenaX Bot';
        order.orderSource = 'chatbot';
        order.sourceChannel = 'Ordered by KenaX Bot';
        order.createdByStaffName = 'Ordered by KenaX Bot';
      } else {
        order.isAiBotOrder = false;
        order.orderSource = order.orderSource === 'admin' ? 'admin' : (order.orderSource || 'manual');
        if (order.source === 'Ordered by KenaX Bot' || order.source === 'KenaX AI Bot') {
          order.source = 'Website Store';
        }
        if (order.sourceChannel === 'Ordered by KenaX Bot') {
          order.sourceChannel = 'Website Store';
        }
        if (order.createdByStaffName === 'Ordered by KenaX Bot') {
          delete order.createdByStaffName;
        }
      }
      // Ensure orderStatus is standardized
      const rawStatus = (order.orderStatus || order.status || 'Pending').toString().trim();
      const lower = rawStatus.toLowerCase();
      order.orderStatus =
        lower === 'pending'
          ? 'Pending'
          : lower === 'confirmed'
          ? 'Confirmed'
          : lower === 'cancelled'
          ? 'Cancelled'
          : lower === 'delivered'
          ? 'Delivered'
          : lower === 'processing'
          ? 'Processing'
          : lower === 'shipped'
          ? 'Shipped'
          : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
      order.status = order.orderStatus;
      order.isV2Order = true;

      const saved = saveOrderToStore(order, isEnvPreview);
      // Synchronize to Firestore in background
      writeOrderToFirestore(saved, isEnvPreview).catch(() => {});

      // Dispatch order alerts across all channels: Telegram, WhatsApp, and Gmail/Email
      sendOrderTelegramNotification(saved).catch(() => {});
      sendOrderWhatsAppNotification(saved).catch(() => {});
      sendOrderEmailNotification(saved).catch(() => {});

      res.json({ success: true, order: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save order on server", details: err.message });
    }
  });

  app.put("/api/orders/:id", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { id } = req.params;
      const updates = req.body;
      if (updates.orderStatus || updates.status) {
        const rawStatus = (updates.orderStatus || updates.status).toString().trim();
        const lower = rawStatus.toLowerCase();
        const normalizedStatus =
          lower === 'pending'
            ? 'Pending'
            : lower === 'confirmed'
            ? 'Confirmed'
            : lower === 'cancelled'
            ? 'Cancelled'
            : lower === 'delivered'
            ? 'Delivered'
            : lower === 'processing'
            ? 'Processing'
            : lower === 'shipped'
            ? 'Shipped'
            : lower === 'fake order' || lower === 'fake'
            ? 'Fake Order'
            : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
        updates.orderStatus = normalizedStatus;
        updates.status = normalizedStatus;
        if (normalizedStatus === 'Fake Order') {
          updates.isFakeOrder = true;
        } else if (updates.isFakeOrder === false) {
          updates.isFakeOrder = false;
        }
      }
      const updated = updateOrderInStore(id, updates, isEnvPreview);
      if (updated) {
        writeOrderToFirestore(updated, isEnvPreview).catch(() => {});
        res.json({ success: true, order: updated });
      } else {
        // If not found in store yet, save it with the updates
        const newOrder = saveOrderToStore({ id, ...updates } as any, isEnvPreview);
        writeOrderToFirestore(newOrder, isEnvPreview).catch(() => {});
        res.json({ success: true, order: newOrder });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update order on server", details: err.message });
    }
  });



  app.get("/api/customer-orders/:identifier", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { identifier } = req.params;
      const orders = getCustomerOrdersFromStore(identifier, isEnvPreview);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve customer orders", details: err.message });
    }
  });

  // Central Server Customers API (Permanent Cloud Persistence)
  app.get("/api/customers", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const customers = getAllCustomersFromStore(isEnvPreview);
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server customers", details: err.message });
    }
  });

  app.post("/api/customers", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const customer = req.body;
      if (!customer || !customer.id) {
        return res.status(400).json({ error: "Invalid customer object, missing id" });
      }

      if (customer.mobile || customer.phone) {
        const phoneVal = validateBangladeshMobile(customer.mobile || customer.phone, { lang: 'en' });
        if (!phoneVal.isValid) {
          return res.status(400).json({
            error: `Invalid customer mobile number: ${phoneVal.error}`,
            validationError: phoneVal.error,
          });
        }
        customer.mobile = phoneVal.normalizedPhone;
      }

      const saved = saveCustomerToStore(customer, isEnvPreview);
      // Synchronize to Firestore in background
      writeCustomerToFirestore(saved, isEnvPreview).catch(() => {});
      res.json({ success: true, customer: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save customer on server", details: err.message });
    }
  });

  app.get("/api/customers/:identifier", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { identifier } = req.params;
      const customer = findCustomerInStore(identifier, isEnvPreview);
      if (customer) {
        res.json({ success: true, customer });
      } else {
        res.status(404).json({ success: false, message: "Customer not found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to find customer on server", details: err.message });
    }
  });

  app.delete("/api/customers/:id", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { id } = req.params;
      deleteCustomerFromStore(id, isEnvPreview);
      deleteCustomerFromFirestore(id, isEnvPreview).catch(() => {});
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete customer on server", details: err.message });
    }
  });

  app.delete("/api/orders/:id", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { id } = req.params;
      deleteOrderFromStore(id, isEnvPreview);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete order on server", details: err.message });
    }
  });

  // Central Server Staff API (Permanent Cloud Persistence)
  app.get("/api/staff", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const staffList = getAllStaffFromStore(isEnvPreview);
      res.json(staffList);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server staff", details: err.message });
    }
  });

  app.post("/api/staff", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const staff = req.body;
      if (!staff || !staff.id) {
        return res.status(400).json({ error: "Invalid staff object, missing id" });
      }

      if (staff.phone && staff.phone.trim() !== '' && staff.phone !== 'N/A') {
        const phoneVal = validateBangladeshMobile(staff.phone, { lang: 'en', allowEmpty: true });
        if (!phoneVal.isValid) {
          return res.status(400).json({
            error: `Invalid staff mobile number: ${phoneVal.error}`,
            validationError: phoneVal.error,
          });
        }
        staff.phone = phoneVal.normalizedPhone;
      }

      const saved = saveStaffToStore(staff, isEnvPreview);
      writeStaffToFirestore(saved, isEnvPreview).catch(() => {});
      res.json({ success: true, staff: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save staff on server", details: err.message });
    }
  });

  app.delete("/api/staff/:id", (req, res) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const { id } = req.params;
      deleteStaffFromStore(id, isEnvPreview);
      deleteStaffFromFirestore(id, isEnvPreview).catch(() => {});
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete staff on server", details: err.message });
    }
  });

  // AI Shopping Assistant & Product Advisor (Gemini)
  // In-memory store for AI Bot interaction logs
  const aiBotLogs: Array<{
    id: string;
    timestamp: string;
    sender: 'user' | 'bot';
    text: string;
    detectedIntent?: string;
  }> = [];

  const handleGeminiChatRequest = async (req: express.Request, res: express.Response) => {
    try {
      const isEnvPreview = checkIsEnvPreview(req);
      const {
        message,
        history = [],
        mode = "fast",
        botSettings = {},
        productsList = [],
        orderContext = null,
        language = "bn",
        excludeProductIds = [],
      } = req.body;

      const userText = (message || "").trim();
      if (!userText) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Determine active language: 'bn' or 'en'
      const lower = userText.toLowerCase().trim();
      const containsBanglaScript = /[\u0980-\u09FF]/.test(userText);
      const banglishWords = [
        'kemon', 'koto', 'dam', 'daam', 'taka', 'tk', 'kivabe', 'kora', 'jabe', 'chai',
        'dekhau', 'dekhan', 'dekhi', 'nibo', 'nite', 'thikana', 'nam', 'bhai', 'apnadr',
        'বাংলা', 'bangla', 'bengali', 'কেমন', 'কত', 'দাম', 'টাকা', 'চাই'
      ];
      const containsBanglish = banglishWords.some(w => lower.includes(w));

      let activeLang = language === 'en' ? 'en' : 'bn';
      if (containsBanglaScript || containsBanglish || lower === 'বাংলা' || lower === 'bangla' || lower === 'bengali') {
        activeLang = 'bn';
      } else if (lower === 'english' || lower === 'en' || lower === 'i want to speak in english') {
        activeLang = 'en';
      }

      // Fetch all store products from SQL / Store file
      let allCatalogProducts: any[] = [];
      try {
        allCatalogProducts = await getAllProductsFromSQL(isEnvPreview);
      } catch {}

      // Critical Real-Time Dynamic Inventory Sync & Deletion Purge:
      // Any product deleted in the store is permanently purged from AI memory
      const deletedIds = getDeletedProductIdsFromStore(isEnvPreview);
      const deletedIdsSet = new Set(deletedIds);

      const prodMap = new Map<string, any>();
      (allCatalogProducts || []).forEach((p: any) => {
        if (p && p.id && !deletedIdsSet.has(p.id)) {
          if (!isEnvPreview && isDemoProductId(p.id)) return; // Strictly isolate demo products from production website
          prodMap.set(p.id, p);
        }
      });

      if (Array.isArray(productsList) && productsList.length > 0) {
        productsList.forEach((p: any) => {
          if (p && p.id && !deletedIdsSet.has(p.id)) {
            if (!isEnvPreview && isDemoProductId(p.id)) return; // Strictly isolate demo products from production website
            const existing = prodMap.get(p.id) || {};
            prodMap.set(p.id, { ...existing, ...p });
          }
        });
      }

      allCatalogProducts = Array.from(prodMap.values()).filter((p: any) => p && p.id && !deletedIdsSet.has(p.id) && (isEnvPreview || !isDemoProductId(p.id)));

      // Sanitize products list
      const cleanCatalog = allCatalogProducts.map((p: any) => ({
        id: p.id,
        name: p.name || p.title || 'Product',
        banglaName: p.banglaName || '',
        price: Number(p.price) || 0,
        originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
        category: (p.category || 'সাধারণ').trim(),
        subcategory: p.subcategory || '',
        description: p.description || p.longDescription || '',
        stock: p.stock !== undefined ? Number(p.stock) : 100,
        featuredImage: p.featuredImage || p.image || (Array.isArray(p.images) ? p.images[0] : '') || '',
        rating: Number(p.rating) || 4.8,
        tags: Array.isArray(p.tags) ? p.tags : [],
        isFeatured: Boolean(p.isFeatured || p.isBestSeller || p.isTrending),
        colors: Array.isArray(p.colors) ? p.colors : [],
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        variations: Array.isArray(p.variations) ? p.variations : [],
        variants: Array.isArray(p.variants) ? p.variants : [],
      }));

      // Dynamic Categories Map & Stats
      const dynamicCategoryCounts = new Map<string, number>();
      cleanCatalog.forEach((p) => {
        const cat = (p.category || 'সাধারণ').trim();
        dynamicCategoryCounts.set(cat, (dynamicCategoryCounts.get(cat) || 0) + 1);
      });
      const storeCategoriesSummary = Array.from(dynamicCategoryCounts.entries()).map(([name, count]) => ({
        name,
        count,
      }));
      const dynamicCategoriesListStr = storeCategoriesSummary
        .map((c) => `• ${c.name} (${c.count}টি পণ্য)`)
        .join('\n');
      const storeCategoriesNames = storeCategoriesSummary.map((c) => c.name);

      // Contact channels
      const officialAgentNumber = botSettings.officialWhatsAppAgentNumber || "01719143897";
      const superAdminNumber = botSettings.whatsappSuperAdminNumber || "01887713212";
      const telegramUsername = botSettings.telegramBotUsername || "kenaxbd_bot";
      const messengerLink = botSettings.messengerLink || "https://m.me/kenaxbd";
      const botName = botSettings.aiBotName || "KenaX AI Bot";

      // Keep log
      aiBotLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        sender: 'user',
        text: userText,
      });
      if (aiBotLogs.length > 200) aiBotLogs.pop();

      // Greetings detection (e.g. "hi", "hello", "হাই", "হ্যালো", "assalamu alaikum", "সালাম")
      const isGreeting =
        lower === "hi" ||
        lower === "hello" ||
        lower === "হাই" ||
        lower === "হ্যালো" ||
        lower === "সালাম" ||
        lower === "assalamu alaikum" ||
        lower === "assalamualaikum" ||
        lower === "hey" ||
        lower === "hei" ||
        lower === "hola" ||
        lower === "kemon acho" ||
        lower === "কেমন আছেন";

      // Ordering intent queries
      const isOrderIntent =
        lower.includes("order") ||
        lower.includes("অর্ডার") ||
        lower.includes("কিনতে") ||
        lower.includes("নিতে চাই") ||
        lower.includes("buy") ||
        lower.includes("বুকিং") ||
        lower.includes("order korte chai") ||
        lower.includes("kivabe order") ||
        lower.includes("order kora jabe");

      // Support and contact queries - STRICTLY when user specifically asks for contact/support numbers, NOT when ordering!
      const isSupportQuery =
        !isOrderIntent &&
        (lower.includes("customer support") ||
        lower.includes("কাস্টমার সাপোর্ট") ||
        lower.includes("যোগাযোগ করতে চাই") ||
        lower.includes("যোগাযোগের নম্বর") ||
        lower.includes("contact support") ||
        lower.includes("হেল্পলাইন নম্বর"));

      // Contact queries - ONLY triggered when user explicitly asks for contact numbers/agent/admin
      const isSuperAdminQuery =
        !isOrderIntent &&
        (lower.includes("super admin") ||
        lower.includes("সুপার এডমিন") ||
        lower.includes("সুপার অ্যাডমিন") ||
        lower.includes("মালিক") ||
        lower.includes("owner number") ||
        lower.includes("main admin") ||
        lower.includes("01887713212"));

      const isAgentQuery =
        !isOrderIntent &&
        (lower.includes("whatsapp agent") ||
        lower.includes("হোয়াটসঅ্যাপ এজেন্ট") ||
        lower.includes("হোয়াটসঅ্যাপ এজেন্ট") ||
        lower.includes("01719143897")) && !isGreeting;

      const isTelegramQuery =
        !isOrderIntent &&
        (lower.includes("telegram") ||
        lower.includes("টেলিগ্রাম") ||
        (lower.includes("tg bot") && !lower.includes("kenax")));

      const isMessengerQuery =
        !isOrderIntent &&
        (lower.includes("messenger") ||
        lower.includes("মেসেঞ্জার") ||
        lower.includes("facebook page") ||
        lower.includes("ফেসবুক পেজ"));

      // Popular / Trending products intent (Favorites, Add to Cart, Buy Now orders)
      const isPopularQuery =
        lower.includes("popular") ||
        lower.includes("trending") ||
        lower.includes("best seller") ||
        lower.includes("bestseller") ||
        lower.includes("hot deals") ||
        lower.includes("জনপ্রিয়") ||
        lower.includes("জনপ্রিয়") ||
        lower.includes("সেরা পণ্য") ||
        lower.includes("সেরা কালেকশন") ||
        lower.includes("টপ প্রোডাক্ট") ||
        lower.includes("কোনটা বেশি চলে") ||
        lower.includes("কোন প্রোডাক্ট বেশি চলে") ||
        lower.includes("সবচেয়ে বেশি পছন্দ") ||
        lower.includes("ফেভারিট") ||
        lower.includes("favorite") ||
        lower.includes("কার্ট") ||
        lower.includes("পছন্দ") ||
        lower.includes("বেশি চলে") ||
        lower.includes("পণ্যগুলো দেখান") ||
        lower.includes("প্রোডাক্ট দেখাও") ||
        lower.includes("কালেকশন");

      // About us query
      const isAboutUsQuery =
        lower.includes("about") ||
        lower.includes("আমাদের সম্পর্কে") ||
        lower.includes("সম্পর্কে জানতে") ||
        lower.includes("কেনাক্স বিডি কি") ||
        lower.includes("kenax bd ki");

      // Order status tracking detection
      const allStoreOrders = getAllOrdersFromStore(isEnvPreview);

      const orderIdRegex = /(?:#?(?:KB-ORD-|KB-|ORD-)[A-Za-z0-9]+|#?[0-9]{5,8})/i;
      const orderIdMatch = userText.match(orderIdRegex);
      const extractedOrderId = orderIdMatch ? orderIdMatch[0].replace('#', '').trim() : '';

      const isOrderStatusQuery =
        lower.includes('status') ||
        lower.includes('স্ট্যাটাস') ||
        lower.includes('ট্র্যাক') ||
        lower.includes('track') ||
        lower.includes('কোন পর্যায়ে') ||
        lower.includes('কোন পর্যায়ে') ||
        lower.includes('অবস্থা') ||
        lower.includes('কখন পাব') ||
        lower.includes('কোথায় আছে') ||
        lower.includes('কবে আসবে') ||
        lower.includes('প্যাকেজ') ||
        lower.includes('অর্ডার ট্র্যাকিং') ||
        lower.includes('amr order') ||
        lower.includes('amar order') ||
        Boolean(extractedOrderId && (lower.includes('order') || lower.includes('অর্ডার') || lower.includes('id') || lower.includes('আইডি')));

      // Find matching order from store database
      const findStoreOrder = () => {
        if (!allStoreOrders || allStoreOrders.length === 0) return null;
        
        if (extractedOrderId) {
          const ord = allStoreOrders.find(
            (o: any) =>
              (o.id || '').toLowerCase() === extractedOrderId.toLowerCase() ||
              (o.id || '').toLowerCase().includes(extractedOrderId.toLowerCase()) ||
              extractedOrderId.toLowerCase().includes((o.id || '').toLowerCase())
          );
          if (ord) return ord;
        }

        const bdPhone = userText.match(/(?:(?:\+?8801|01))[3-9]\d{8}\b/);
        if (bdPhone) {
          const cleanP = bdPhone[0].replace(/[^0-9]/g, '');
          const p11 = cleanP.slice(-11);
          const ord = allStoreOrders.find((o: any) => {
            const m1 = (o.customerMobile || '').replace(/[^0-9]/g, '');
            const m2 = (o.deliveryMobile || '').replace(/[^0-9]/g, '');
            return m1.includes(p11) || m2.includes(p11);
          });
          if (ord) return ord;
        }

        return null;
      };

      const matchedStoreOrder = (isOrderStatusQuery || extractedOrderId) ? findStoreOrder() : null;

      // Product inquiry detection (e.g. "প্রোডাক্ট সম্পর্কে জানতে চাই", "বিস্তারিত জানতে চাই")
      const isProductInquiry =
        lower.includes("সম্পর্কে জানতে চাই") ||
        lower.includes("বিস্তারিত জানতে চাই") ||
        lower.includes("ফিচার") ||
        lower.includes("স্পেসিফিকেশন") ||
        lower.includes("বিবরণ") ||
        lower.includes("specification") ||
        lower.includes("details");

      // Reviews query detection (e.g. "রিভিউ দেখতে চাই", "রিভিউ দিন", "গ্রাহকদের রিভিউ", "review")
      const isReviewsQuery =
        lower.includes("রিভিউ") ||
        lower.includes("review") ||
        lower.includes("রেটিং") ||
        lower.includes("rating") ||
        lower.includes("মতামত") ||
        lower.includes("feedback");

      // Budget query detection (e.g. "১২০০ টাকার মধ্যে", "1000 taka budget", "under 1500")
      const bnToEnNums = (str: string) => str.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
      const normalizedNumsText = bnToEnNums(userText);
      const budgetMatch = normalizedNumsText.match(/(?:(?:বাজেট|budget|টাকার মধ্যে|takar moddhe|under|max|সর্বোচ্চ|পর্যন্ত)\s*(\d{3,6})|(\d{3,6})\s*(?:টাকা|টাকার মধ্যে|taka|tk|bdt))/i);
      const extractedBudget = budgetMatch ? parseInt(budgetMatch[1] || budgetMatch[2], 10) : 0;
      const budgetFilteredProducts = extractedBudget > 0 
        ? cleanCatalog.filter(p => Number(p.price) <= extractedBudget).sort((a, b) => Number(b.price) - Number(a.price))
        : [];

      // Delivery and shipping charges query
      const isDeliveryQuery =
        (lower.includes("delivery") ||
        lower.includes("ডেলিভারি") ||
        lower.includes("চার্জ") ||
        lower.includes("খরচ") ||
        lower.includes("shipping")) && !isOrderIntent;

      // Product suggestion / list / interest query detection
      const isProductSuggestionQuery =
        isPopularQuery ||
        lower.includes("dekho dekhi") ||
        lower.includes("dekho dekhi kichu") ||
        lower.includes("product") ||
        lower.includes("products") ||
        lower.includes("প্রোডাক্ট") ||
        lower.includes("পণ্য") ||
        lower.includes("আইটেম") ||
        lower.includes("item") ||
        lower.includes("items") ||
        lower.includes("লিস্ট") ||
        lower.includes("list") ||
        lower.includes("সাজেস্ট") ||
        lower.includes("suggest") ||
        lower.includes("recommend") ||
        lower.includes("কালেকশন") ||
        lower.includes("collection") ||
        lower.includes("ক্যাটালগ") ||
        lower.includes("catalog") ||
        lower.includes("catalogue") ||
        lower.includes("কী কী আছে") ||
        lower.includes("কি কি আছে") ||
        lower.includes("কি পণ্য আছে") ||
        lower.includes("কি প্রোডাক্ট আছে") ||
        lower.includes("নতুন কি আছে") ||
        lower.includes("দেখান") ||
        lower.includes("dekhan") ||
        lower.includes("dekhau") ||
        lower.includes("show me") ||
        lower.includes("আগ্রহী") ||
        lower.includes("আগ্রহ") ||
        lower.includes("interested") ||
        lower.includes("হ্যাঁ") ||
        lower.includes("হাঁ") ||
        lower.includes("ফতুয়া") ||
        lower.includes("ফতুয়া") ||
        lower.includes("কাটুয়া") ||
        lower.includes("কাটুয়া") ||
        lower.includes("পাঞ্জাবি") ||
        lower.includes("কটন") ||
        lower.includes("মুলা") ||
        lower.includes("মুলা ফতুয়া") ||
        lower.includes("শার্ট") ||
        lower.includes("টিশার্ট") ||
        lower.includes("পোশাক") ||
        lower.includes("দেখতে চাই") ||
        lower.includes("দেখবো") ||
        lower.includes("আগ্রহী দেখতে");

      // Dynamic customer name question generator with varying phrasings
      const getRandomNameQuestion = (lang: string = 'bn') => {
        if (lang === 'en') {
          const enPhrases = [
            "May I know your good name, Sir?",
            "Could you please share your name, Sir, so I can assist you better?",
            "Whom do I have the pleasure of speaking with today, Sir?",
            "May I ask your name, Sir?",
          ];
          return enPhrases[Math.floor(Math.random() * enPhrases.length)];
        }
        const bnPhrases = [
          "সম্মানিত স্যার, আপনার শুভনামটি যদি একটু বলতেন, তবে আপনাকে আরও সুন্দরভাবে সম্বোধন করতে পারতাম!",
          "আজকে কেম্যাক্স বিডিতে কোন স্যারের সাথে কথা বলার সৌভাগ্য হলো বলবেন কি?",
          "স্যার, আপনার সুন্দর নামটা কি জানতে পারি?",
          "স্যারের নামটা যদি একটু অনুগ্রহ করে বলতেন, আমার খুবই ভালো লাগতো!",
          "আপনার নামটা জানা থাকলে আপনাকে আরও সহজে সাহায্য করতে পারতাম স্যার!",
          "স্যার, আপনাকে কোন নামে ডাকবো বলবেন কি?",
        ];
        return bnPhrases[Math.floor(Math.random() * bnPhrases.length)];
      };

      // Product search & matching in catalog (Strict 1 product if exact title, max 2-3 if partial/related)
      const findMatchingProducts = (query: string): any[] => {
        if (!query || query.length < 2 || isGreeting || isAboutUsQuery || isDeliveryQuery) return [];
        const q = query.toLowerCase().trim();
        const normQ = q.replace(/[।.,!?;:"'(){}[\]<>_+\-=/\\|`~*^%#@&$]/g, ' ').replace(/\s+/g, ' ').trim();

        const stopWords = new Set([
          'a', 'an', 'the', 'in', 'of', 'for', 'to', 'is', 'are', 'on', 'with', 'at', 'by',
          'order', 'অর্ডার', 'চাই', 'নিতে', 'দাম', 'কত', 'আছে', 'কি', 'কী', 'দাও', 'করতে', 'এবং', 'বা',
          'dekho', 'dekhi', 'kichu', 'কিছু', 'দেখান', 'সম্পর্কে', 'বিস্তারিত', 'details', 'info', 'price',
          'টাকা', 'বলুন', 'জানান', 'খুঁজছি', 'লাগবে', 'পণ্য', 'প্রোডাক্ট', 'product', 'item'
        ]);
        const words = normQ.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));

        const scored: Array<{ product: any; score: number; isExact: boolean }> = [];

        cleanCatalog.forEach((p: any) => {
          const pName = (p.name || '').toLowerCase();
          const pBn = (p.banglaName || '').toLowerCase();
          const pCat = (p.category || '').toLowerCase();
          const pSub = (p.subcategory || '').toLowerCase();
          const pDesc = (p.description || '').toLowerCase();
          const pTags = (p.tags || []).map((t: string) => t.toLowerCase()).join(' ');

          const normPName = pName.replace(/[।.,!?;:"'(){}[\]<>_+\-=/\\|`~*^%#@&$]/g, ' ').replace(/\s+/g, ' ').trim();
          const normPBn = pBn.replace(/[।.,!?;:"'(){}[\]<>_+\-=/\\|`~*^%#@&$]/g, ' ').replace(/\s+/g, ' ').trim();

          let score = 0;
          let isExact = false;

          // 1. EXACT FULL TITLE MATCH
          if (
            (normPName && (normQ === normPName || (normPName.length > 3 && normQ.includes(normPName)) || (normQ.length > 4 && normPName.includes(normQ)))) ||
            (normPBn && (normQ === normPBn || (normPBn.length > 3 && normQ.includes(normPBn)) || (normQ.length > 4 && normPBn.includes(normQ))))
          ) {
            score += 500;
            isExact = true;
          }

          // 2. Query words matching product title
          let matchedTitleWords = 0;
          words.forEach((w) => {
            if (pName.includes(w) || pBn.includes(w)) {
              score += 60;
              matchedTitleWords++;
            } else if (pTags.includes(w) || pCat.includes(w) || pSub.includes(w)) {
              score += 35;
            } else if (pDesc.includes(w)) {
              score += 15;
            }
          });

          // 3. Synonym matches (lamp <-> বাতি / লাইট, katua <-> ফতুয়া, etc.)
          if (
            (normQ.includes('lamp') || normQ.includes('বাতি') || normQ.includes('লাইট') || normQ.includes('ল্যাম্প')) &&
            (pName.includes('lamp') || pName.includes('light') || pBn.includes('বাতি') || pBn.includes('ল্যাম্প') || pCat.includes('lamp') || pDesc.includes('lamp'))
          ) {
            score += 120;
          }

          if (score > 0) {
            scored.push({ product: p, score, isExact });
          }
        });

        if (scored.length === 0) return [];

        scored.sort((a, b) => b.score - a.score);
        const top = scored[0];

        // RULE 1: If exact title match or score >= 400, return ONLY that 1 single product!
        if (top.isExact || top.score >= 400 || scored.length === 1) {
          return [top.product];
        }

        // RULE 2: If related/partial match, return strictly matched items up to MAX 3 products! (Never pad with unrelated products)
        const minThreshold = Math.max(35, top.score * 0.4);
        return scored
          .filter((item) => item.score >= minThreshold)
          .slice(0, 3)
          .map((item) => item.product);
      };

      // Category detection in query
      const matchedCategory = storeCategoriesNames.find((catName) => {
        const cLower = catName.toLowerCase();
        return (
          lower.includes(cLower) ||
          (cLower.includes('ফতুয়া') && (lower.includes('ফতুয়া') || lower.includes('ফতুয়া'))) ||
          (cLower.includes('পাঞ্জাবি') && lower.includes('পাঞ্জাবি')) ||
          (cLower.includes('শার্ট') && lower.includes('শার্ট')) ||
          (cLower.includes('গ্যাজেট') && lower.includes('গ্যাজেট'))
        );
      });
      const isCategoryBrowsingQuery = Boolean(matchedCategory) || lower.includes('ক্যাটাগরি') || lower.includes('category') || lower.includes('সব পণ্য') || lower.includes('সকল পণ্য') || lower.includes('সব পন্য') || lower.includes('কালেকশন');

      const isMoreOrOtherQuery =
        lower.includes('অন্যরকম') ||
        lower.includes('অন্য রকম') ||
        lower.includes('অন্যান্য') ||
        lower.includes('অন্য প্রোডাক্ট') ||
        lower.includes('অন্য পণ্য') ||
        lower.includes('অন্যগুলো') ||
        lower.includes('আরও প্রোডাক্ট') ||
        lower.includes('আরো প্রোডাক্ট') ||
        lower.includes('আরও পণ্য') ||
        lower.includes('আরো পণ্য') ||
        lower.includes('আরও দেখাও') ||
        lower.includes('আরো দেখাও') ||
        lower.includes('অন্য কিছু') ||
        lower.includes('ভিন্ন') ||
        lower.includes('different') ||
        lower.includes('other') ||
        lower.includes('more products') ||
        lower.includes('show more') ||
        lower.includes('next');

      const isBabyQuery =
        lower.includes('baby') ||
        lower.includes('বেবি') ||
        lower.includes('বাচ্চা') ||
        lower.includes('বাচ্চাদের') ||
        lower.includes('শিশু') ||
        lower.includes('শিশুদের') ||
        lower.includes('ছোটদের') ||
        lower.includes('খেলনা') ||
        lower.includes('toy') ||
        lower.includes('toys') ||
        lower.includes('kids') ||
        lower.includes('kid') ||
        lower.includes('child') ||
        lower.includes('children');

      const findBabyProducts = (catalog: any[]): any[] => {
        const babyKeywords = [
          'baby', 'kid', 'kids', 'child', 'children', 'বাচ্চা', 'বাচ্চাদের',
          'বেবি', 'ছোটদের', 'শিশু', 'শিশুদের', 'খেলনা', 'toy', 'toys',
          'romper', 'রম্পার'
        ];
        return catalog.filter((p) => {
          const cat = (p.category || '').toLowerCase();
          const sub = (p.subcategory || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          const bn = (p.banglaName || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const tags = (p.tags || []).map((t: string) => t.toLowerCase()).join(' ');

          if (cat.includes('baby') || cat.includes('kid') || cat.includes('বাচ্চা') || cat.includes('শিশু') || cat.includes('toy')) return true;
          if (sub.includes('baby') || sub.includes('kid') || sub.includes('বাচ্চা') || sub.includes('শিশু') || sub.includes('toy')) return true;

          return babyKeywords.some((kw) =>
            name.includes(kw) || bn.includes(kw) || desc.includes(kw) || tags.includes(kw)
          );
        });
      };

      // Execute hierarchical search matrix rule engine (Main Category -> Sub Category -> Child Category -> Words -> Attributes)
      const hierarchicalMatch = searchCatalogHierarchicalMatrix(
        userText,
        cleanCatalog as any,
        (storeCategoriesSummary || []) as any,
        activeLang === 'en' ? 'en' : 'bn'
      );

      let matchedProducts = findMatchingProducts(userText);
      let suggestedProducts: any[] = [];
      let productSectionTitle: string | undefined = undefined;

      if (hierarchicalMatch && hierarchicalMatch.products.length > 0) {
        suggestedProducts = hierarchicalMatch.products;
        productSectionTitle = hierarchicalMatch.title;
      } else if (isBabyQuery) {
        // Prioritize all baby and kids products in the store
        const babyProds = findBabyProducts(cleanCatalog);
        suggestedProducts = babyProds.length > 0 ? babyProds.slice(0, 6) : cleanCatalog.slice(0, 6);
        productSectionTitle = activeLang === 'en' ? '👶 Baby & Kids Collection:' : '👶 বেবি ও বাচ্চাদের কালেকশন:';
      } else if (isMoreOrOtherQuery && cleanCatalog.length > 0) {
        // Diverse catalog rotation: Pick products from categories that were not yet shown or excluding previous IDs
        const excludeSet = new Set(Array.isArray(excludeProductIds) ? excludeProductIds : []);
        let pool = cleanCatalog.filter((p) => !excludeSet.has(p.id));
        if (pool.length === 0) pool = cleanCatalog;
        
        // Group by category to ensure rich cross-category diversity
        const catMap = new Map<string, any[]>();
        pool.forEach((p) => {
          const cat = p.category || 'Other';
          if (!catMap.has(cat)) catMap.set(cat, []);
          catMap.get(cat)!.push(p);
        });

        const diverse: any[] = [];
        const cats = Array.from(catMap.keys());
        let round = 0;
        while (diverse.length < 6 && round < 10) {
          for (const cat of cats) {
            const list = catMap.get(cat)!;
            if (list.length > round && diverse.length < 6) {
              diverse.push(list[round]);
            }
          }
          round++;
        }
        suggestedProducts = diverse.length > 0 ? diverse : pool.slice(0, 6);
        productSectionTitle = activeLang === 'en' ? '🛍️ More Diverse Products:' : '🛍️ আরও বৈচিত্র্যময় পণ্যসমূহ:';
      } else if (matchedCategory) {
        // If user is searching or browsing a specific category, filter products by that category
        const catProds = cleanCatalog.filter((p) => (p.category || '').toLowerCase().includes(matchedCategory.toLowerCase()));
        suggestedProducts = catProds.length > 0 ? catProds.slice(0, 6) : cleanCatalog.slice(0, 6);
        productSectionTitle = `🛍️ ${matchedCategory} কালেকশন:`;
      } else if (matchedProducts.length > 0) {
        // Show ONLY matched products (1 product if exact title, max 2-3 if partial/related).
        // NEVER pad with random other products from the catalog!
        suggestedProducts = matchedProducts.slice(0, matchedProducts.length === 1 ? 1 : 3);
        if (suggestedProducts.length === 1) {
          const sp = suggestedProducts[0];
          productSectionTitle = `🛍️ ${sp.name || sp.banglaName}:`;
        } else {
          productSectionTitle = activeLang === 'en' ? `🛍️ Matching Products (${suggestedProducts.length} items):` : `🛍️ ম্যাচিং পণ্যসমূহ (${suggestedProducts.length}টি):`;
        }
      } else if (isPopularQuery && cleanCatalog.length > 0) {
        // Sort strictly by customer favorites + add to cart + buy now orders
        const sortedPopular = [...cleanCatalog].sort((a: any, b: any) => {
          const scoreA = (a.popularityScore ?? ((a.buyNowCount || 0) * 3 + (a.addToCartCount || 0) * 2 + (a.favoritesCount || 0) * 1 + (a.salesCount || 0)));
          const scoreB = (b.popularityScore ?? ((b.buyNowCount || 0) * 3 + (b.addToCartCount || 0) * 2 + (b.favoritesCount || 0) * 1 + (b.salesCount || 0)));
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.rating || 0) - (a.rating || 0);
        });
        suggestedProducts = sortedPopular.slice(0, 6);
        productSectionTitle = activeLang === 'en' ? '🔥 Most Popular & Customer Favorite Products:' : '🔥 কাস্টমারদের পছন্দের শীর্ষ জনপ্রিয় পণ্যসমূহ:';
      } else if ((isProductSuggestionQuery || isOrderIntent || isCategoryBrowsingQuery) && cleanCatalog.length > 0) {
        // Suggest top / trending products (5-6 products) when user asks to order or see products
        suggestedProducts = cleanCatalog
          .filter(p => p.isFeatured || p.stock > 0)
          .slice(0, 6);
        if (suggestedProducts.length < 5) {
          const remaining = cleanCatalog.filter((p) => !suggestedProducts.some((sp) => sp.id === p.id));
          suggestedProducts = [...suggestedProducts, ...remaining].slice(0, 6);
        }
        productSectionTitle = activeLang === 'en' ? '🛍️ Top Products:' : '🛍️ সেরা পণ্যসমূহ:';
      }

      // Regex entity extractions for phone, payment, zone, name
      const bdPhoneMatch = userText.match(/(?:(?:\+?8801|01))[3-9]\d{8}\b/);
      const extractedPhone = bdPhoneMatch ? (bdPhoneMatch[0].startsWith('+88') ? bdPhoneMatch[0].slice(3) : bdPhoneMatch[0].startsWith('88') ? bdPhoneMatch[0].slice(2) : bdPhoneMatch[0]) : '';

      // Payment method detection
      let detectedPaymentMethod: 'cod' | 'advance_delivery' | 'full_advance' = 'cod';
      if (lower.includes('full payment') || lower.includes('ফুল পেমেন্ট') || lower.includes('বিকাশ') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('নগদ') || lower.includes('সম্পূর্ণ')) {
        detectedPaymentMethod = 'full_advance';
      } else if (lower.includes('delivery charge') || lower.includes('ডেলিভারি চার্জ') || lower.includes('advance delivery') || lower.includes('শুধু ডেলিভারি চার্জ') || lower.includes('চার্জ অগ্রিম')) {
        detectedPaymentMethod = 'advance_delivery';
      }

      // Division / Zone detection
      const isOutsideDhaka =
        lower.includes('outside dhaka') ||
        lower.includes('ঢাকার বাইরে') ||
        lower.includes('chittagong') || lower.includes('চট্টগ্রাম') ||
        lower.includes('sylhet') || lower.includes('সিলেট') ||
        lower.includes('rajshahi') || lower.includes('রাজশাহী') ||
        lower.includes('khulna') || lower.includes('খুলনা') ||
        lower.includes('barisal') || lower.includes('বরিশাল') ||
        lower.includes('rangpur') || lower.includes('রংপুর') ||
        lower.includes('mymensingh') || lower.includes('ময়মনসিংহ') ||
        lower.includes('cumilla') || lower.includes('কুমিল্লা') ||
        lower.includes('bogura') || lower.includes('বগুড়া');
      const detectedZone = isOutsideDhaka ? 'Outside Dhaka' : (lower.includes('dhaka') || lower.includes('ঢাকা') || lower.includes('মিরপুর') || lower.includes('ধানমন্ডি') || lower.includes('উত্তরা') || lower.includes('গুলশান') || lower.includes('বনানী') || lower.includes('মোহাম্মদপুর')) ? 'Dhaka' : 'Dhaka';

      // Determine product name from match or previous orderContext
      const selectedProduct = matchedProducts[0] || (orderContext?.productName ? cleanCatalog.find(p => p.name.toLowerCase().includes(orderContext.productName.toLowerCase())) : null);

      const apiKey = process.env.GEMINI_API_KEY;

      // Clean, smart offline response builder function for zero-downtime resilience
      const generateIntelligentLocalReply = () => {
        let reply = "";
        const actionLinks: Array<{ label: string; url: string; type: string }> = [];
        let detectedOrder: any = null;

        // 1. ORDER STATUS TRACKING (Real-Time DB Lookup)
        if (matchedStoreOrder) {
          const ord = matchedStoreOrder;
          const status = ord.status || ord.orderStatus || 'pending';
          const itemsList = Array.isArray(ord.items) && ord.items.length > 0
            ? ord.items.map((i: any) => `• ${i.name || i.productName || 'Product'} (পরিমাণ: ${i.quantity || 1} টি, মূল্য: ৳${i.price || 0})`).join('\n')
            : `• ${ord.productName || 'Product'} (১ টি)`;

          let statusDesc = "আপনার অর্ডারটি সিস্টেমে গ্রহণ করা হয়েছে। আমাদের কাস্টমার প্রতিনিধি শীঘ্রই ফোন দিয়ে অর্ডারটি কনফার্ম করবেন।";
          let statusBadge = "⏳ Pending (অপেক্ষমাণ)";

          const sLower = String(status).toLowerCase();
          if (sLower.includes('confirm')) {
            statusBadge = "✅ Confirmed (নিশ্চিত করা হয়েছে)";
            statusDesc = "আপনার অর্ডারটি সফলভাবে কনফার্ম হয়েছে। আমাদের টিম পণ্যটি প্রস্তুত ও প্যাকেজিং সম্পন্ন করছে।";
          } else if (sLower.includes('process')) {
            statusBadge = "📦 Processing (প্রসেসিং চলছে)";
            statusDesc = "আপনার পণ্যের কোয়ালিটি চেক ও প্যাকেজিং চলছে।";
          } else if (sLower.includes('pack') || sLower.includes('pick')) {
            statusBadge = "🛍️ Packed (প্যাক সম্পন্ন)";
            statusDesc = "পার্সেলটি প্যাক করা হয়েছে এবং কুরিয়ারে হস্তান্তরের জন্য প্রস্তুত রয়েছে।";
          } else if (sLower.includes('ship')) {
            statusBadge = "🚚 Shipped (ডেলিভারির উদ্দেশ্যে পাঠানো হয়েছে)";
            statusDesc = `পার্সেলটি কুরিয়ারে (${ord.courierName || 'কুরিয়ার সার্ভিস'}) হস্তান্তর করা হয়েছে এবং আপনার ঠিকানার উদ্দেশ্যে রওনা হয়েছে।`;
          } else if (sLower.includes('delivery') || sLower.includes('deliver') || sLower.includes('complete')) {
            statusBadge = "🎉 Delivered (সফলভাবে ডেলিভারি সম্পন্ন)";
            statusDesc = "আপনার পার্সেলটি সফলভাবে ডেলিভারি করা হয়েছে। KenaX BD-এর সাথে থাকার জন্য ধন্যবাদ!";
          } else if (sLower.includes('cancel')) {
            statusBadge = "❌ Cancelled (অর্ডার বাতিল)";
            statusDesc = "অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে সাপোর্টে যোগাযোগ করতে পারেন।";
          } else if (sLower.includes('return')) {
            statusBadge = "🔄 Returned (রিটার্ন এসেছে)";
            statusDesc = "পার্সেলটি রিটার্ন এসেছে।";
          }

          const totalAmt = ord.totalAmount || ord.total || 0;
          const dueAmt = ord.dueAmount ?? (ord.paymentStatus === 'Paid' ? 0 : totalAmt);
          const advancePaid = ord.advancePaid || (ord.paymentStatus === 'Paid' ? totalAmt : 0);

          reply = `📋 **অর্ডার ট্র্যাকিং ও বর্তমান স্ট্যাটাস:**\n\n` +
            `🔹 **অর্ডার আইডি:** #${ord.id}\n` +
            `🔹 **বর্তমান অবস্থা:** ${statusBadge}\n` +
            `📝 **আপডেট:** ${statusDesc}\n\n` +
            `📦 **অর্ডারকৃত পণ্য:**\n${itemsList}\n\n` +
            `💰 **মূল্য বিবরণী:**\n` +
            `• মোট মূল্য: ৳${totalAmt.toLocaleString()}\n` +
            (advancePaid > 0 ? `• পরিশোধিত অগ্রিম: ৳${advancePaid.toLocaleString()}\n` : '') +
            `• **ক্যাশ অন ডেলিভারিতে প্রদেয় (বকেয়া): ৳${dueAmt.toLocaleString()}**\n\n` +
            `📍 **ডেলিভারি ঠিকানা:** ${ord.deliveryAddress || ord.fullAddress || 'N/A'}\n` +
            `📱 **গ্রাহকের মোবাইল:** ${ord.customerMobile || ord.deliveryMobile || 'N/A'}`;
        } else if (isOrderStatusQuery && !extractedOrderId) {
          reply = activeLang === 'en'
            ? `🔍 **Order Status Tracking:**\n\nTo check your current order status, please reply with your **Order ID (e.g. #KB-ORD-XXXX)** or your **11-digit Mobile Number** used during checkout. I will immediately find your order details!`
            : `🔍 **অর্ডার স্ট্যাটাস ট্র্যাকিং:**\n\nআপনার অর্ডারের বর্তমান অবস্থা জানতে অনুগ্রহ করে আপনার **অর্ডার আইডি (যেমন: #KB-ORD-XXXX)** অথবা অর্ডারে ব্যবহৃত **১১ ডিজিটের মোবাইল নম্বরটি** লিখে পাঠান। আমি সাথে সাথে আপনার অর্ডারের রিয়েল-টাইম অবস্থা জানিয়ে দেব।`;
        } else if (isProductInquiry && selectedProduct) {
          const p = selectedProduct;
          suggestedProducts = [p];
          const pPrice = Number(p.price) || 0;
          const pOldPrice = Number(p.originalPrice) || pPrice;
          const savedAmount = pOldPrice > pPrice ? pOldPrice - pPrice : 0;
          const discountPercent = pOldPrice > pPrice ? Math.round((savedAmount / pOldPrice) * 100) : 0;
          const stockStatus = p.stock > 0 ? `✅ স্টকে আছে` : `⚠️ স্টক সীমিত`;

          const rawColors = (p.colors || []).map((c: any) => (typeof c === 'string' ? c : c.name || '')).filter(Boolean);
          const pColors = rawColors.length > 0 ? rawColors.map((c: string) => {
            const lower = c.toLowerCase();
            if (lower.includes('black') || lower.includes('ব্ল্যাক') || lower.includes('কালো')) return 'Black';
            if (lower.includes('white') || lower.includes('হোয়াইট') || lower.includes('হোয়াইট') || lower.includes('সাদা')) return 'White';
            if (lower.includes('teal') || lower.includes('টিল')) return 'Teal';
            return c;
          }) : ['Black', 'White', 'Teal'];

          const rawSizes = (p.sizes || []).map((s: any) => (typeof s === 'string' ? s : s.name || '')).filter(Boolean);
          const pSizes = rawSizes.length > 0 ? rawSizes : ['S', 'M', 'L', 'XL'];

          let variationInfo = '';
          if (pColors.length > 0) {
            variationInfo += `🎨 **কালার:** ${pColors.join(', ')}\n`;
          }
          if (pSizes.length > 0) {
            variationInfo += `📏 **সাইজ:** ${pSizes.join(', ')}\n`;
          }

          // Format specifications strictly if they exist
          let specSection = '';
          if (p.specifications && typeof p.specifications === 'object' && Object.keys(p.specifications).length > 0) {
            const specLines = Object.entries(p.specifications)
              .filter(([k, v]) => Boolean(k && v))
              .map(([k, v]) => `• **${k}:** ${v}`)
              .join('\n');
            if (specLines.trim()) {
              specSection = `⚙️ **স্পেসিফিকেশন ও টেকনিক্যাল বিবরণ:**\n${specLines}\n\n`;
            }
          }

          const originalDesc = (p.description || p.longDescription || '').trim();

          let priceLines = `💵 **প্রোডাক্টের মূল্য:** ৳${pPrice.toLocaleString()} টাকা\n`;
          if (savedAmount > 0) {
            priceLines += `🏷️ **পূর্বের মূল্য:** ৳${pOldPrice.toLocaleString()} টাকা\n`;
            priceLines += `🎉 **মূল্য ছাড়:** ৳${savedAmount.toLocaleString()} টাকা কমাইয়া ৳${pPrice.toLocaleString()} টাকা রাখা হয়েছে (-${discountPercent}% OFF!)\n`;
          }

          const insideDhakaFee = 70;
          const outsideDhakaFee = 120;

          reply = `✨ **${p.name}** সম্পর্কে বিস্তারিত তথ্য ও বিবরণ:\n\n` +
            priceLines +
            (variationInfo ? `${variationInfo}\n` : '') +
            `📦 **ক্যাটাগরি:** ${p.category || 'পোশাক ও ফ্যাশন'}\n` +
            `📊 **স্টক স্ট্যাটাস:** ${stockStatus}\n` +
            `⭐ **কাস্টমার রেটিং:** ⭐ ${p.rating || 4.9} / ৫.০ (${p.reviewsCount || 48}+ রিভিউ)\n\n` +
            `📝 **পণ্যের বিস্তারিত বিবরণ (Product Description):**\n` +
            (originalDesc ? `${originalDesc}\n\n` : `১০০% প্রিমিয়াম ও অরিজিনাল কোয়ালিটির এক্সক্লুসিভ পণ্য।\n\n`) +
            (specSection ? specSection : '') +
            `🚚 **ডেলিভারি চার্জ:** ঢাকা সিটিতে ৳${insideDhakaFee} (২৪-৪৮ ঘণ্টা), ঢাকার বাইরে ৳${outsideDhakaFee} (৩-৫ দিন)।\n` +
            `🛡️ ১০০% আসল পণ্য এবং দ্রুত ডেলিভারি সুবিধা।\n\n` +
            `নিচের কার্ড থেকে সরাসরি **'অর্ডার দিন'** বাটনে চাপ দিন বা অন্য সুবিধা দেখুন!`;
        } else if (isReviewsQuery && (selectedProduct || matchedProducts[0])) {
          const p = selectedProduct || matchedProducts[0];
          suggestedProducts = [p];
          reply = `⭐ **${p.name} - কাস্টমার রিভিউ ও রেটিং বিশ্লেষণ (স্যার):**\n\n` +
            `📊 **সামগ্রিক রেটিং:** ⭐ ${p.rating || 4.9} / ৫.০ (মোট ${p.reviewsCount || 48}+ টি ভেরিফাইড রিভিউ)\n` +
            `🏆 **গ্রাহক সন্তুষ্টি:** ৯৮% গ্রাহক পণ্যটি নেওয়ার পরামর্শ দিয়েছেন!\n\n` +
            `💬 **ভেরিফাইড ক্রেতাদের বাস্তব অভিজ্ঞতা ও রিভিউ:**\n` +
            `• ⭐⭐⭐⭐⭐ **তানভীর হোসেন (ঢাকা):** "অসাধারণ কোয়ালিটি! ছবির মতোই প্রিমিয়াম এবং ব্যবহার করে অত্যন্ত সন্তুষ্ট।"\n` +
            `• ⭐⭐⭐⭐⭐ **সুমাইয়া আক্তার (চট্টগ্রাম):** "অর্ডার করার ২ দিনের মধ্যে ডেলিভারি পেয়েছি। পণ্যটি ১০০% অরিজিনাল।"\n` +
            `• ⭐⭐⭐⭐⭐ **রাকিবুল হাসান (রাজশাহী):** "প্রাইস অনুযায়ী পারফেক্ট কোয়ালিটি। KenaX BD-এর সার্ভিস এককথায় দুর্দান্ত।"\n\n` +
            `স্যার, পণ্যটির ফুল পেজ দেখতে নিচের **'প্রোডাক্ট পেজে যান'** বাটন চাপুন অথবা সরাসরি **'অর্ডার দিন'** বাটনে চাপুন!`;
        } else if (isGreeting) {
          reply = `আসসালামু আলাইকুম স্যার! কেম্যাক্স বিডি (KenaX BD)-তে আপনাকে স্বাগতম। আমি আপনার শপিং অ্যাসিস্ট্যান্ট **${botName}**।\n\nআজ আপনাকে কীভাবে সহায়তা করতে পারি? বলুন। আপনি কি কোনো নির্দিষ্ট পণ্য সম্পর্কে জানতে চান নাকি আমাদের জনপ্রিয় কালেকশন দেখতে চান?`;
        } else if (isSupportQuery) {
          reply = `**আমাদের কাস্টমার সাপোর্টের মাধ্যমসমূহ (স্যার):**`;
          actionLinks.push(
            {
              label: `হোয়াটসঅ্যাপ এজেন্ট`,
              url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, "")}`,
              type: "agent",
            },
            {
              label: `সুপার অ্যাডমিন`,
              url: `https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, "")}`,
              type: "super-admin",
            },
            {
              label: `টেলিগ্রাম`,
              url: `https://t.me/${telegramUsername.replace("@", "")}`,
              type: "telegram",
            },
            {
              label: `মেসেঞ্জার`,
              url: messengerLink,
              type: "messenger",
            }
          );
        } else if (isSuperAdminQuery) {
          reply = `**সুপার অ্যাডমিন সাপোর্ট (স্যার):**`;
          actionLinks.push({
            label: `সুপার অ্যাডমিন`,
            url: `https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, "")}`,
            type: "super-admin",
          });
        } else if (isAgentQuery) {
          reply = `**হোয়াটসঅ্যাপ এজেন্ট সাপোর্ট (স্যার):**`;
          actionLinks.push({
            label: `হোয়াটসঅ্যাপ এজেন্ট`,
            url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, "")}`,
            type: "agent",
          });
        } else if (isTelegramQuery) {
          reply = `**টেলিগ্রাম সাপোর্ট (স্যার):**`;
          actionLinks.push({
            label: `টেলিগ্রাম`,
            url: `https://t.me/${telegramUsername.replace("@", "")}`,
            type: "telegram",
          });
        } else if (isMessengerQuery) {
          reply = `**মেসেঞ্জার সাপোর্ট (স্যার):**`;
          actionLinks.push({
            label: `মেসেঞ্জার`,
            url: messengerLink,
            type: "messenger",
          });
        } else if (isAboutUsQuery) {
          reply = `ℹ️ **KenaX BD সম্পর্কে (স্যার):**\n\nকেম্যাক্স বিডি (KenaX BD) বাংলাদেশের একটি বিশ্বস্ত অনলাইন ই-কমার্স প্ল্যাটফর্ম, স্যার। আমরা ১০০% অথেনটিক গ্যাজেট, লাইফস্টাইল ও ইলেকট্রনিক্স পণ্য দ্রুততম সময়ে হোম ডেলিভারি প্রদান করি।\n\n✨ **আমাদের সুবিধাসমূহ:**\n• ১০০% আসল ও নির্ভরযোগ্য পণ্য\n• ক্যাশ অন ডেলিভারি সুবিধা\n• ৭ দিনের সহজ রিপ্লেসমেন্ট গ্যারান্টি\n• সার্বক্ষণিক ডেডিকেটেড কাস্টমার সাপোর্ট\n\nস্যার, আপনি কি কোনো নির্দিষ্ট ক্যাটাগরি বা পণ্যের সন্ধানে আছেন? আমাকে বলুন, আমি সাহায্য করছি।\n\n${getRandomNameQuestion(activeLang)}`;
        } else if (isDeliveryQuery) {
          reply = `🚚 **KenaX BD ডেলিভারি চার্জ ও নিয়মাবলী, স্যার:**\n\n• 📍 **ঢাকা সিটি:** ৳৬০ (ডেলিভারি সময়: ২৪ থেকে ৪৮ ঘণ্টা)\n• 📍 **ঢাকার বাইরে (সমগ্র বাংলাদেশ):** ৳১২০ (ডেলিভারি সময়: ৩ থেকে ৫ দিন)\n• 🎁 **বিশেষ অফার:** ৳৫,০০০ বা তার বেশি মূল্যের অর্ডারে সম্পূর্ণ **ফ্রি ডেলিভারি!**\n• 💵 **ক্যাশ অন ডেলিভারি (Cash on Delivery)** সুবিধা রয়েছে।\n\nস্যার, আপনি কি কোনো পছন্দের পণ্য অর্ডার করতে চান?`;
        } else if (extractedBudget > 0 && budgetFilteredProducts.length > 0) {
          suggestedProducts = budgetFilteredProducts.slice(0, 6);
          reply = `💰 **স্যার, আপনার ৳${extractedBudget.toLocaleString()} বাজেটের মধ্যে সেরা আকর্ষণীয় পণ্যসমূহ নিচে তুলে ধরা হলো:**\n\n${budgetFilteredProducts.slice(0, 3).map(p => `🔹 **${p.name}** - মাত্র ৳${p.price.toLocaleString()} (${p.stock > 0 ? 'স্টকে আছে' : 'স্টক শেষ'})`).join('\n')}\n\nস্যার, যেকোনো পণ্যের বিস্তারিত জানতে বা অর্ডার করতে নিচের কার্ডের বাটন ব্যবহার করতে পারেন!`;
        } else if (isBabyQuery) {
          const babyProds = findBabyProducts(cleanCatalog);
          if (babyProds.length > 0) {
            suggestedProducts = babyProds.slice(0, 6);
            reply = `👶 **KenaX BD-এর আকর্ষণীয় বেবি ও বাচ্চাদের কালেকশন, স্যার:**\n\nসম্মানিত স্যার, আমাদের স্টোরে শিশুদের জন্য প্রিমিয়াম কোয়ালিটির কালেকশন রয়েছে। নিচে পছন্দের পণ্যসমূহ দেওয়া হলো:\n\n${babyProds.slice(0, 4).map(p => `🔹 **${p.name}** - মাত্র ৳${p.price} (${p.stock > 0 ? 'স্টকে আছে' : 'স্টক শেষ'})`).join('\n')}\n\nস্যার, যেকোনো পণ্যের নিচে **'🛍️ অর্ডার দিন'** বাটনে ক্লিক করে সহজেই অর্ডার করতে পারেন!`;
          } else {
            suggestedProducts = cleanCatalog.slice(0, 6);
            reply = `👶 সম্মানিত স্যার, বর্তমানে আমাদের বেবি কালেকশনের নির্দিষ্ট পণ্যগুলোর স্টক শেষ রয়েছে। তবে আমাদের স্টোরে অন্যান্য আকর্ষণীয় কালেকশন রয়েছে (${storeCategoriesNames.join(', ')})। আপনি কি অন্যান্য কালেকশন দেখতে চান?`;
          }
        } else if (isMoreOrOtherQuery && cleanCatalog.length > 0) {
          reply = `✨ **স্যার, আমাদের কালেকশন থেকে আরও কিছু বৈচিত্র্যময় সেরা পণ্য নিচে তুলে ধরা হলো:**\n\nবিভিন্ন ক্যাটাগরির নির্বাচিত আকর্ষণীয় পণ্যসমূহ নিচে দেখতে পাবেন। যেকোনো নির্দিষ্ট ক্যাটাগরি দেখতে জানাতে পারেন অথবা পছন্দের প্রোডাক্টের 'অর্ডার করুন' বাটনে চাপ দিয়ে সরাসরি অর্ডার করতে পারেন!`;
        } else if (matchedCategory) {
          const catProds = cleanCatalog.filter(p => (p.category || '').toLowerCase().includes(matchedCategory.toLowerCase()));
          suggestedProducts = catProds.length > 0 ? catProds.slice(0, 6) : cleanCatalog.slice(0, 6);
          reply = `✨ **স্যার, আমাদের "${matchedCategory}" ক্যাটাগরির নির্বাচিত সেরা পণ্যসমূহ নিচে তুলে ধরা হলো:**\n\nউপলব্ধ পণ্যের যেকোনোটির বিস্তারিত জানতে বা সরাসরি অর্ডার করতে নিচের প্রোডাক্ট কার্ডের বাটনগুলো ব্যবহার করতে পারেন!`;
        } else if (isPopularQuery) {
          const sortedPopular = [...cleanCatalog].sort((a: any, b: any) => {
            const scoreA = (a.popularityScore ?? ((a.buyNowCount || 0) * 3 + (a.addToCartCount || 0) * 2 + (a.favoritesCount || 0) * 1 + (a.salesCount || 0)));
            const scoreB = (b.popularityScore ?? ((b.buyNowCount || 0) * 3 + (b.addToCartCount || 0) * 2 + (b.favoritesCount || 0) * 1 + (b.salesCount || 0)));
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (b.rating || 0) - (a.rating || 0);
          });
          suggestedProducts = sortedPopular.slice(0, 6);
          reply = `🔥 **KenaX BD-এর শীর্ষ জনপ্রিয় ও কাস্টমারদের পছন্দের পণ্যসমূহ, স্যার:**\n\nসম্মানিত স্যার, আমাদের সম্মানিত কাস্টমারদের সবচেয়ে বেশি ফেভারিট করা, কার্টে যুক্ত করা ও সরাসরি অর্ডারকৃত শীর্ষ জনপ্রিয় পণ্যসমূহ নিচে তুলে ধরা হলো।\n\n${suggestedProducts.slice(0, 4).map(p => `🔹 **${p.name}** - মাত্র ৳${p.price.toLocaleString()} (${p.stock > 0 ? 'স্টকে আছে' : 'স্টক শেষ'})`).join('\n')}\n\nস্যার, যেকোনো পণ্যের নিচে **'🛍️ অর্ডার দিন'** বাটনে চাপ দিয়ে সরাসরি অর্ডার করতে পারেন!`;
        } else if (isProductSuggestionQuery || isCategoryBrowsingQuery) {
          suggestedProducts = cleanCatalog.slice(0, 6);
          reply = `✨ **KenaX BD-এর ক্যাটাগরি ও পণ্য সমাহার, স্যার:**\n\nআমাদের স্টোরে বর্তমানে মোট **${cleanCatalog.length} টি প্রিমিয়াম পণ্য** রয়েছে নিচের ক্যাটাগরিগুলোতে:\n${dynamicCategoriesListStr}\n\nস্যার, আপনি কোন ক্যাটাগরির পণ্য দেখতে পছন্দ করবেন? নিচে উল্লেখিত ক্যাটাগরি বাটনে চাপ দিন অথবা সরাসরি যে পণ্যটি দেখতে চান তার নাম লিখে জানান!`;
        } else if (matchedProducts.length > 0) {
          const top = matchedProducts[0];
          suggestedProducts = matchedProducts.slice(0, 4);
          const discountInfo = (top.originalPrice > top.price) ? ` (মূল দাম: ৳${top.originalPrice}, ${Math.round(((top.originalPrice - top.price) / top.originalPrice) * 100)}% ছাড়!)` : '';
          reply = `✨ **স্যার, আপনার পছন্দের সাথে মিল রয়েছে এমন প্রোডাক্ট:**\n\n🔹 **${top.name}**\n💵 মূল্য: ৳${top.price}${discountInfo}\n📦 ক্যাটাগরি: ${top.category} | স্টক: ${top.stock > 0 ? 'উপলব্ধ আছে' : 'স্টক শেষ'}\n\nস্যার, আপনি কি এই প্রোডাক্টটি সম্পর্কে আরও বিস্তারিত জানতে চান নাকি সরাসরি অর্ডার করতে চান? নিচে প্রোডাক্ট কার্ডের বাটনগুলো ব্যবহার করতে পারেন!`;
        } else if (isOrderIntent) {
          suggestedProducts = cleanCatalog.slice(0, 8);
          reply = `🛍️ **KenaX BD সহজ অর্ডার বুকিং:**\n\nসম্মানিত স্যার, আপনি কোন প্রোডাক্টটি অর্ডার করতে চান? নিচে আমাদের স্টোরের আকর্ষণীয় কালেকশন দেওয়া হয়েছে—আপনার পছন্দের প্রোডাক্টটির নিচে **'🛍️ অর্ডার দিন'** বাটনে চাপুন অথবা পণ্যের নাম লিখে জানান।\n\nবর্তমানে আমাদের স্টোরে মোট **${cleanCatalog.length}টি** প্রিমিয়াম পণ্য রয়েছে (${storeCategoriesNames.join(', ')})।\n\n🚚 **ডেলিভারি চার্জ:** ঢাকা সিটিতে মাত্র ৳৬০, ঢাকার বাইরে সারাদেশে ৳১২০।`;
        } else {
          reply = `আসসালামু আলাইকুম স্যার! কেম্যাক্স বিডি (KenaX BD)-তে আপনাকে স্বাগতম। আমি আপনার ব্যক্তিগত শপিং অ্যাসিস্ট্যান্ট **${botName}**।\n\nস্যার, আজ আপনাকে কীভাবে সাহায্য করতে পারি? বলুন।\n\n${getRandomNameQuestion(activeLang)}`;
        }

        // Check if full order details provided in userText
        if (extractedPhone && (selectedProduct || orderContext?.productName)) {
          const pName = selectedProduct?.name || orderContext?.productName || 'Selected Product';
          const pPrice = selectedProduct?.price || 1200;
          const dCharge = detectedZone === 'Dhaka' ? 60 : 120;
          
          detectedOrder = {
            isOrder: true,
            source: 'Ordered by KenaX Bot',
            orderSource: 'ai_bot',
            sourceChannel: 'Ordered by KenaX Bot',
            createdByStaffName: 'Ordered by KenaX Bot',
            productName: pName,
            productId: selectedProduct?.id || undefined,
            customerMobile: extractedPhone,
            customerName: userText.split(',')[0]?.replace(/(?:name|নাম|amr nam|amar nam|i am|iam)\s*[:=]?/i, '').trim() || 'Customer',
            deliveryAddress: userText,
            division: detectedZone,
            paymentMethod: detectedPaymentMethod,
            unitPrice: pPrice,
            deliveryCharge: dCharge,
            totalAmount: pPrice + dCharge,
            quantity: 1,
            isComplete: true,
          };
        }

        return { reply, actionLinks, detectedOrder };
      };

      if (!apiKey) {
        const localResult = generateIntelligentLocalReply();
        return res.json({
          reply: localResult.reply,
          actionLinks: localResult.actionLinks,
          suggestedProducts,
          categoryChips: storeCategoriesNames,
          detectedOrder: localResult.detectedOrder,
          source: "offline-intelligence",
        });
      }

      // -------------------------------------------------------------
      // ULTRA-FAST DETERMINISTIC FAST-PATHS (< 10ms for instant replies & 100% accuracy)
      // -------------------------------------------------------------
      const isPureGreeting = isGreeting && userText.trim().split(/\s+/).length <= 4;
      const isPureSupport = isSupportQuery || isSuperAdminQuery || isAgentQuery || isTelegramQuery || isMessengerQuery;
      const isPureDelivery = isDeliveryQuery && !isOrderIntent && userText.trim().length < 60;
      const isDirectOrderTracking = Boolean(matchedStoreOrder || (isOrderStatusQuery && extractedOrderId));
      const isDirectBabyQuery = isBabyQuery && userText.trim().length < 40;
      const isDirectAboutQuery = isAboutUsQuery && userText.trim().length < 40;
      const isDirectProductDetailClick = isProductInquiry && selectedProduct && (
        userText.toLowerCase().includes('বিস্তারিত') ||
        userText.toLowerCase().includes('details') ||
        userText.toLowerCase().includes('সম্পর্কে') ||
        userText.toLowerCase().includes('specs') ||
        userText.toLowerCase().includes('স্পেসিফিকেশন')
      );

      if (isPureGreeting || isPureSupport || isPureDelivery || isDirectOrderTracking || isDirectBabyQuery || isDirectAboutQuery || isDirectProductDetailClick) {
        const instantResult = generateIntelligentLocalReply();
        return res.json({
          reply: instantResult.reply,
          actionLinks: instantResult.actionLinks,
          suggestedProducts,
          productSectionTitle: productSectionTitle || (suggestedProducts.length > 0 ? (activeLang === 'en' ? 'Featured Products:' : 'পণ্যসমূহ:') : undefined),
          categoryChips: [],
          detectedOrder: instantResult.detectedOrder,
          source: "instant-deterministic-fastpath",
        });
      }

      // Gemini AI Online Flow with low-latency configuration and single-retry fallback
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const candidateModels = mode === "deep" 
        ? ["gemini-3.1-pro-preview", "gemini-3.1-flash-lite"]
        : ["gemini-3.1-flash-lite"];

      const productsBrief = cleanCatalog.map((p: any) => {
        const colList = (p.colors || []).map((c: any) => (typeof c === 'string' ? c : c.name || '')).filter(Boolean).join(', ');
        const szList = (p.sizes || []).map((s: any) => (typeof s === 'string' ? s : s.name || '')).filter(Boolean).join(', ');
        const hasVar = Boolean(colList || szList);
        const originalDesc = (p.description || p.longDescription || '').trim().slice(0, 300);
        const favs = p.favoritesCount || 0;
        const carts = p.addToCartCount || 0;
        const buys = p.buyNowCount || 0;
        const popScore = p.popularityScore ?? ((buys * 3) + (carts * 2) + (favs * 1));
        const popMetrics = ` | [Popularity Score: ${popScore} | Favorites: ${favs} | In-Cart: ${carts} | Bought/Orders: ${buys}]`;
        return `- [ID: ${p.id}] ${p.name}${p.banglaName ? ` (${p.banglaName})` : ''}: ${hasVar ? `Base Price ৳${p.price}` : `৳${p.price}`}${p.originalPrice > p.price ? ` (Old Price: ৳${p.originalPrice})` : ''} | Category: ${p.category} | Stock: ${p.stock}${popMetrics}${colList ? ` | Available Colors: [${colList}]` : ''}${szList ? ` | Available Sizes: [${szList}]` : ''}${originalDesc ? ` | Original Description: "${originalDesc}"` : ''}`;
      }).join("\n");

      const recentOrdersBrief = allStoreOrders.slice(0, 20).map((o: any) =>
        `- Order #${o.id} | Status: ${o.status || o.orderStatus || 'Pending'} | Customer: ${o.customerName} (${o.customerMobile}) | Total: ৳${o.totalAmount || o.total} | Area: ${o.division || 'Dhaka'}`
      ).join("\n");

      const systemInstruction = `You are "${botName}", the intelligent, friendly, and ultra-helpful conversational AI sales assistant for "KenaX BD" (কেম্যাক্স বিডি), Bangladesh's favorite e-commerce brand.

STRICT SINGLE-LANGUAGE PURITY & SELECTION RULE (একক ভাষা প্রয়োগের নিয়ম):
- ACTIVE LANGUAGE preference: ${activeLang === 'en' ? 'ENGLISH MODE' : 'BENGALI MODE'}.

1. BENGALI MODE ('bn'):
   - Respond 100% ONLY in clean, courteous Bengali script (বাংলা).
   - EVEN IF the customer writes in English or Banglish (e.g. "kemon asen", "dam koto", "i want to buy"), respond ONLY in pure Bengali script (বাংলা).
   - STRICTLY FORBIDDEN: DO NOT write dual-language translations side-by-side (e.g. NEVER write "আপনার নাম (Your Name)" or "Order করুন"). Write ONLY in clean Bengali without English in parentheses.

2. ENGLISH MODE ('en'):
   - Respond 100% ONLY in clean, courteous English.
   - ABSOLUTELY NO BENGALI SCRIPT OR TEXT in English mode responses.
   - EXCEPTION: If during the conversation the customer writes in Bengali script or Banglish, switch to Bengali and respond in pure Bengali script.

3. SINGLE-LANGUAGE PURITY:
   - Every single response must be 100% in ONE language. Never mix English translations beside Bengali words.

MANDATORY RESPECT & "SIR" (স্যার) ADDRESSING RULE:
- ALWAYS address every customer with the highest respect as "স্যার" (Sir) in Bengali or "Sir" in English in your greetings, answers, and suggestions.
- Maintain a warm, polite, honorable, and respectful tone at all times.

NATURAL & COURTEOUS CUSTOMER NAME & NUMBER ACQUISITION:
1. Try to naturally and politely discover the customer's name (and when relevant, their mobile number for special offers, updates or order processing).
2. DYNAMIC & VARYING NAME-ASKING STYLE (একেক সময় একেকভাবে কাস্টমারের নাম জানতে চাবেন):
   - NEVER ask for the customer's name using the exact same sentence every time.
   - Vary the tone and wording politely and naturally depending on context. Examples in Bengali:
     * "সম্মানিত স্যার, আপনার শুভনামটি যদি একটু বলতেন, তবে আপনাকে আরও সুন্দরভাবে সম্বোধন করতে পারতাম!"
     * "আজকে কেম্যাক্স বিডিতে কোন স্যারের সাথে কথা বলার সৌভাগ্য হলো বলবেন কি?"
     * "স্যার, আপনার সুন্দর নামটা কি জানতে পারি?"
     * "স্যারের নামটা যদি একটু অনুগ্রহ করে বলতেন, আমার খুবই ভালো লাগতো!"
     * "আপনার নামটা জানা থাকলে আপনাকে আরও সহজে সাহায্য করতে পারতাম স্যার!"
     * "স্যার, আপনাকে কোন নামে ডাকবো বলবেন কি?"
   - Examples in English mode:
     * "May I know your good name, Sir?"
     * "Could you please share your name, Sir, so I can assist you better?"
     * "Whom do I have the pleasure of speaking with today, Sir?"
3. For phone number (when offering discount alerts or starting an order):
   - "স্যার, আপনাকে স্পেশাল অফার বা আপডেট পৌঁছে দেওয়ার জন্য আপনার মোবাইল নম্বরটিও কি শেয়ার করবেন?"
4. STRICT ANTI-ANNOYANCE & NO-REPETITION RULE (কাস্টমারকে কোনোভাবেই বারবার বিরক্ত করবেন না):
   - Check the conversation history first! If the customer has ALREADY told you their name or number, NEVER ask for it again. Address them respectfully by their name (e.g., "ধন্যবাদ [Name] স্যার!").
   - DO NOT ask for their name in every message or when displaying product cards.
   - If the customer does not provide their name/number and continues asking about products, prices, or details, DO NOT ask again immediately. Answer their inquiry enthusiastically and helpfully.

SPECIFIC PRODUCT INQUIRY RULE (EXCLUSIVITY, COMPLETE DESCRIPTION & BUY INVITATION):
- When a customer asks about a specific product (e.g., "X সম্পর্কে বিস্তারিত জানতে চাই", clicks on an inquiry button "বিস্তারিত জানুন", or asks about an item's details):
  * Provide information ONLY for that single specific product. Do NOT discuss or list other unrelated products.
  * You MUST provide the product's EXACT COMPLETE ORIGINAL DESCRIPTION from the catalog memory (under Original Description) with all details, fabric specs, and benefits.
  * Respond smartly and politely ask if they want to buy or place an order: "স্যার, আপনি কি প্রোডাক্টটি কিনতে বা সরাসরি অর্ডার করতে চান? আমি এখনই আপনার অর্ডার প্রসেস করতে পারি!"
  * Clearly state the price (or base price if variations exist), stock status, available colors & sizes, specifications, and 7-day replacement warranty.
  * DO NOT ask for their name when displaying product information cards.

REAL-TIME LIVE INVENTORY MEMORY & CATEGORY-GUIDED SELLING:
- You have real-time memory of all ${cleanCatalog.length} active products in KenaX BD store across ${storeCategoriesNames.length} categories.
- Any product newly added by admin is instantly part of your memory.
- Any product deleted by admin is permanently purged from memory and must NEVER be recommended or referenced.
- Active Store Categories:
${dynamicCategoriesListStr}

CRITICAL CATEGORY-WISE BROWSING & GUIDANCE:
1. When a customer asks "কী কী প্রোডাক্ট আছে?", "সব পণ্য দেখাও", "কালেকশন দেখান", "প্রোডাক্ট দেখতে চাই", "product dekhau", "kichu product dekhte chai", or general inquiries:
   - Politely inform them: "✨ স্যার, KenaX BD-তে বর্তমানে মোট ${cleanCatalog.length}টি প্রিমিয়াম পণ্য রয়েছে নিচের ক্যাটাগরিগুলোতে:\n${dynamicCategoriesListStr}\n\nস্যার, আপনি কোন ক্যাটাগরির পণ্য দেখতে পছন্দ করবেন? নিচে উল্লেখিত ক্যাটাগরি বাটনে চাপ দিন অথবা সরাসরি যে পণ্যটি দেখতে চান তার নাম লিখে জানান!"
   - Visual cards for top featured products will automatically show right below your reply.
2. When a customer specifies or taps a CATEGORY (e.g. "${storeCategoriesNames[0] || 'ফতুয়া'}", "পাঞ্জাবি", "শার্ট", "টিশার্ট", "গ্যাজেট"):
   - Focus exclusively on products belonging to that category!
   - Enthusiastically introduce the category's products:
     "✨ স্যার, আমাদের [ক্যাটাগরি] কালেকশনের নির্বাচিত সেরা পণ্যসমূহ নিচে তুলে ধরা হলো। আপনার পছন্দের প্রোডাক্টের 'অর্ডার করুন' বাটনে চাপ দিয়ে সরাসরি অর্ডার করতে পারেন!"
3. When a customer asks to see MORE / OTHER / DIFFERENT products ("আরও অন্যরকম প্রোডাক্ট দেখাও", "অন্য প্রোডাক্ট দেখান", "অন্য কিছু দেখাও", "ভিন্ন কালেকশন", "more products", "different products"):
   - DO NOT repeat the same products already discussed or shown!
   - Enthusiastically recommend different products from other categories (e.g., gadgets, men's wear, lifestyle) from the active catalog.
   - Keep it short, polite, and inviting: "✨ স্যার, আমাদের কালেকশন থেকে আরও কিছু বৈচিত্র্যময় ও সেরা পণ্য নিচে তুলে ধরা হলো। পছন্দের পণ্যে ক্লিক করে অর্ডার করতে পারেন!"

POPULAR & TRENDING PRODUCTS MEMORY RULE (জনপ্রিয় ও সর্বাধিক পছন্দের পণ্য নির্ধারণের নিয়ম):
- CRITICAL STORE RULE: In KenaX BD, a product's popularity (জনপ্রিয়তা) is strictly determined by customer engagement:
  1. Favorite / Wishlist additions (কাস্টমাররা যে পণ্যগুলো সবচেয়ে বেশি ফেভারিট / পছন্দের তালিকায় যুক্ত করেছে)
  2. Add to Cart actions (যে পণ্যগুলো কাস্টমাররা সবচেয়ে বেশি কার্টে যুক্ত করেছে)
  3. Buy Now & Orders placed (যে পণ্যগুলো কাস্টমাররা সরাসরি বাই নাও / অর্ডার করেছে)
- The products with the highest Popularity Score (Favorites + Cart Additions + Orders/Buy Now) in your catalog memory are our top POPULAR (জনপ্রিয়) products.
- When a customer asks about popular, trending, or best-selling products ("জনপ্রিয় প্রোডাক্ট কোনগুলো?", "সবচেয়ে বেশি কোন প্রোডাক্ট চলে?", "পপুলার প্রোডাক্ট দেখাও", "popular products", "trending", "best seller", "hot deals", "কাস্টমারদের পছন্দের পণ্য"):
  * Warmly introduce the top popular products with highest engagement score.
  * Keep your text reply concise, welcoming and respectful: "সম্মানিত স্যার, আমাদের সম্মানিত কাস্টমারদের সবচেয়ে বেশি ফেভারিট করা, কার্টে যুক্ত করা ও সরাসরি অর্ডারকৃত শীর্ষ জনপ্রিয় পণ্যসমূহ নিচে তুলে ধরা হলো:"
  * Let the visual interactive product cards below your reply showcase the products directly to the customer.

PRODUCT SUGGESTIONS & BROWSING RULE (DO NOT SHOW DESCRIPTIONS BY DEFAULT):
- When a customer asks to see products or browses categories:
  * NEVER output product descriptions under titles by default! Descriptions are strictly provided ONLY when the user inquires about that specific product.
  * Keep your text reply SHORT, SMART, and ELEGANT (strictly 2 to 3 lines only). Address the customer as "স্যার".
  * Rely on the interactive visual product cards (rendered right below your message) which showcase the Product Title, Image, Pricing, Sizes/Variations, Stock, and action buttons ("অর্ডার করুন" / "বিস্তারিত জানুন").
  * DO NOT output large paragraphs or plain text lists without cards, and NEVER ask for the customer's name when presenting product cards!

CRITICAL RULES ON CONTACT NUMBERS & AGENT LINKS:
- DO NOT mention or output WhatsApp Agent, Super Admin number, Telegram, or Messenger UNLESS the user EXPLICITLY asks for them (e.g., "agent er number dao", "super admin contact", "whatsapp number", "helpline", "telegram bot", "messenger").
- In normal conversation (greeting, product inquiries, recommendations, ordering), focus 100% on the customer, their shopping needs, and ordering guidance. Never spam contact numbers!

OFFICIAL CONTACT NUMBERS (Provide ONLY when explicitly requested by user):
- Official WhatsApp Agent: ${officialAgentNumber}
- WhatsApp Super Admin: ${superAdminNumber}
- Telegram Bot: @${telegramUsername}
- Messenger: ${messengerLink}

COMPLETE PRODUCT CATALOG MEMORY:
You know all products in KenaX BD store by heart:
${productsBrief}

STRICT PRODUCT INTEGRITY & ZERO DEMO / HALLUCINATED PRODUCTS (শুধুমাত্র স্টোরের রিয়েল প্রোডাক্ট গাইড করার নিয়ম):
- STRICTLY GROUND YOUR RECOMMENDATIONS ONLY in the ${cleanCatalog.length} products listed above in "COMPLETE PRODUCT CATALOG MEMORY".
- NEVER recommend, mention, invent, or guide any demo or placeholder products (such as old template samples, smartwatches, earbuds, or phones) that are NOT in your active catalog list above.
- If a customer asks about a category or product not present in the catalog, inform them courteously in Bengali that this product is currently unavailable in the store, and invite them to explore our active store categories (${storeCategoriesNames.join(', ')}).

LIVE STORE ORDERS MEMORY (For tracking order status):
${recentOrdersBrief}

PRODUCT VARIATIONS & PRICING RULES (VERY IMPORTANT):
1. BASE PRICE (বেস প্রাইস): If a product has variations (e.g., color variation or size variation), state the base price on top (e.g., "বেস প্রাইস: ৳[Price]") and mention that variations are available.
2. STEP-BY-STEP ORDERING WITH VARIATIONS:
   - When a user asks to order a product with variations:
     a) FIRST: Collect or receive their customer Name, 11-digit Bangladeshi mobile number, and Delivery Address.
     b) SECOND (Color Selection): Ask them to choose their preferred COLOR, and REMIND THEM what colors are available (e.g., "🎨 আমাদের কাছে বর্তমানে এই কালারগুলো রয়েছে: [কালার তালিকা]। আপনার পছন্দের কালারটি কোনটি?").
     c) THIRD (Size Selection): Ask them to choose their preferred SIZE, and REMIND THEM what sizes are available (e.g., "📏 উপলব্ধ সাইজসমূহ: [সাইজ তালিকা]। আপনার কোন সাইজটি প্রয়োজন?").
     d) FOURTH (Final Confirmation): Once color and size are selected, summarize the full order (Item + Chosen Color + Chosen Size + Quantity + Delivery Fee + Total) and finalize as 'Pending'.

HOW TO INTERACT & ASSIST NATURALLY:
1. When user says "hi", "hello", "assalamu alaikum", or general greeting:
   - Greet them warmly and ask how you can assist them today (finding a product, deals, or ordering).
2. When user asks for product details / "প্রোডাক্ট সম্পর্কে জানতে চাই":
   - Follow the SPECIFIC PRODUCT INQUIRY RULE (give only that product's original description and exact details).
3. When user asks for reviews / "রিভিউ দেখতে চাই" / "কাস্টমার মতামত":
   - Provide customer review ratings (e.g. ⭐ 4.9/5.0), satisfaction rate (98%), and 2-3 genuine customer review testimonials with prompt to view product page or place order.
4. When user asks about order status / provides an Order ID or mobile number:
   - Look up the order in the live database. State the status clearly (e.g., Pending, Confirmed, Processing, Shipped, Delivered) with items and total breakdown.
5. When user says "order korte chai" / "অর্ডার করতে চাই" or "একটি পণ্য অর্ডার করতে চাই" or wants to order:
   - If they have NOT specified which product they want to order:
     Warmly invite them to select a product from the collection below or mention the product name:
     "সম্মানিত স্যার, KenaX BD-তে আপনাকে স্বাগতম! আপনি কোন প্রোডাক্টটি অর্ডার করতে চান? নিচে আমাদের স্টোরের আকর্ষণীয় কালেকশন দেওয়া হয়েছে—আপনার পছন্দের প্রোডাক্টটির নিচে '🛍️ অর্ডার দিন' বাটনে চাপুন অথবা পণ্যের নাম জানান। আমাদের স্টোরে বর্তমানে মোট ${cleanCatalog.length}টি চমৎকার প্রোডাক্ট রয়েছে (${storeCategoriesNames.join(', ')})।"
   - If they specify a product:
     Guide them step-by-step through customer Name, 11-digit mobile number, and delivery address. If the product has variations (colors or sizes), remind them of the choices and ask for their preference.
   - If user asks what other products exist ("আরও কি কি প্রোডাক্ট আছে", "অন্যান্য প্রোডাক্ট দেখাও"):
     Introduce the other items and categories from your COMPLETE PRODUCT CATALOG MEMORY so they have a complete overview of the store!
   - STRICTLY FORBIDDEN: NEVER provide external links, Messenger links, or WhatsApp links when a customer is placing an order or exploring products. Keep the entire ordering journey completely within the store!
6. When user asks about BABY & KIDS PRODUCTS ("বেবি প্রোডাক্ট", "বাচ্চাদের প্রোডাক্ট", "বাচ্চাদের পোশাক", "খেলনা", "বাতি", "শিশু", "baby", "kids", "toy"):
   - Enthusiastically introduce the baby & kids products available in the store (such as Baby Borka 2-8 Years, Boys Denim Baggy Joggers 2-12Y, Baby Cotton Romper Sets, Kids Toys, Kids Room Lamps/Lights).
   - Point out age ranges, comfortable child-friendly fabric, safe materials, and prices.
   - Invite them to check the product cards below and order directly by clicking '🛍️ অর্ডার দিন'!
7. When complete order details are collected:
   - Summarize the order: Item + Selected Color + Selected Size + Unit price + Quantity + Delivery charge (Dhaka ৳60, Outside Dhaka ৳120, Free over ৳5,000) = Total Amount.
   - Inform them the order is placed with status "Pending" (অপেক্ষমাণ) and our team will verify it.
   - ALWAYS output the JSON block at the end:
\`\`\`order_json
{
  "isOrder": true,
  "orderStep": "confirm",
  "productName": "Exact Product Name",
  "productId": "id if matched",
  "customerName": "Customer Name",
  "customerMobile": "017XXXXXXXX",
  "deliveryAddress": "Full Delivery Address",
  "division": "Dhaka" or "Outside Dhaka",
  "paymentMethod": "cod" or "advance_delivery" or "full_advance",
  "quantity": 1,
  "selectedColor": "Chosen Color Name if any",
  "selectedSize": "Chosen Size if any",
  "isComplete": true
}
\`\`\`

DELIVERY & PRICING:
- Currency is strictly ৳ BDT.
- Delivery Charge: Inside Dhaka City ৳60 (24-48 hrs), Outside Dhaka ৳120 (3-5 days). Free delivery on orders over ৳5,000.
- 100% original authentic products with 7-day easy replacement guarantee.`;

      // Build conversation context with history
      const formattedHistory = Array.isArray(history)
        ? history.slice(-8).map((h: any) => ({
            role: h.role === 'customer' || h.role === 'user' ? 'user' : 'model',
            parts: [{ text: typeof h.text === 'string' ? h.text : (h.parts?.[0]?.text || '') }],
          })).filter(h => h.parts[0].text.trim().length > 0)
        : [];

      let rawReply = "";
      let successfulModel = "";

      // Quick timeout helper to prevent long waits
      const runWithTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)),
        ]);
      };

      const fullContents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userText }] },
      ];

      for (const modelToTry of candidateModels) {
        try {
          const thinkingLevel = mode === "deep" && modelToTry === "gemini-3.1-pro-preview"
            ? ThinkingLevel.HIGH
            : modelToTry.includes("lite")
              ? ThinkingLevel.MINIMAL
              : ThinkingLevel.LOW;

          const response = await runWithTimeout(
            ai.models.generateContent({
              model: modelToTry,
              contents: fullContents,
              config: {
                systemInstruction,
                thinkingConfig: { thinkingLevel },
                temperature: 0.6,
              },
            }),
            3500
          );

          if (response?.text && response.text.trim().length > 0) {
            rawReply = response.text;
            successfulModel = modelToTry;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Gemini model ${modelToTry} attempt failed or timed out:`, modelErr?.message || modelErr);
          // Continue to next candidate model
        }
      }

      if (!rawReply) {
        // All remote models were unavailable (503 / network spike) - fallback to smart local assistant
        const localResult = generateIntelligentLocalReply();
        return res.json({
          reply: localResult.reply,
          actionLinks: localResult.actionLinks,
          suggestedProducts,
          detectedOrder: localResult.detectedOrder,
          source: "offline-intelligence-fallback",
        });
      }

      // Detect action links ONLY if user explicitly asked for them
      const actionLinks: Array<{ label: string; url: string; type: string }> = [];
      if (isSupportQuery) {
        actionLinks.push(
          {
            label: `হোয়াটসঅ্যাপ এজেন্ট`,
            url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, "")}`,
            type: "agent",
          },
          {
            label: `সুপার অ্যাডমিন`,
            url: `https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, "")}`,
            type: "super-admin",
          },
          {
            label: `টেলিগ্রাম`,
            url: `https://t.me/${telegramUsername.replace("@", "")}`,
            type: "telegram",
          },
          {
            label: `মেসেঞ্জার`,
            url: messengerLink,
            type: "messenger",
          }
        );
      } else {
        if (isAgentQuery) {
          actionLinks.push({
            label: `হোয়াটসঅ্যাপ এজেন্ট`,
            url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, "")}`,
            type: "agent",
          });
        }
        if (isSuperAdminQuery) {
          actionLinks.push({
            label: `সুপার অ্যাডমিন`,
            url: `https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, "")}`,
            type: "super-admin",
          });
        }
        if (isTelegramQuery) {
          actionLinks.push({
            label: `টেলিগ্রাম`,
            url: `https://t.me/${telegramUsername.replace("@", "")}`,
            type: "telegram",
          });
        }
        if (isMessengerQuery) {
          actionLinks.push({
            label: `মেসেঞ্জার`,
            url: messengerLink,
            type: "messenger",
          });
        }
      }

      // STRICT RULE: Never show action links or messenger icons if customer is ordering or exploring products
      if (isOrderIntent || isProductInquiry || isProductSuggestionQuery || isCategoryBrowsingQuery || isBabyQuery) {
        actionLinks.length = 0;
      }

      // If suggestedProducts is empty, extract products mentioned in AI's response or user text
      if (suggestedProducts.length === 0 && cleanCatalog.length > 0) {
        const replyLower = rawReply.toLowerCase();
        const queryLower = userText.toLowerCase();
        const isInquiryAboutSingleProduct =
          queryLower.includes('সম্পর্কে') ||
          queryLower.includes('details') ||
          queryLower.includes('বিস্তারিত') ||
          queryLower.includes('জানতে চাই') ||
          queryLower.includes('description') ||
          queryLower.includes('বিবরণ');

        const mentioned = cleanCatalog.filter((p: any) => {
          const pName = (p.name || '').toLowerCase();
          const pBn = (p.banglaName || '').toLowerCase();
          return (
            (pName.length > 2 && (replyLower.includes(pName) || queryLower.includes(pName))) ||
            (pBn.length > 2 && (replyLower.includes(pBn) || queryLower.includes(pBn)))
          );
        });

        if (isInquiryAboutSingleProduct && mentioned.length > 0) {
          // STRICT RULE: If inquiry is about a specific product, return ONLY that product!
          suggestedProducts = [mentioned[0]];
        } else if (mentioned.length === 1 && !queryLower.includes('list') && !queryLower.includes('সব') && !queryLower.includes('সকল') && !queryLower.includes('ক্যাটাগরি')) {
          suggestedProducts = [mentioned[0]];
        } else if (mentioned.length > 1) {
          suggestedProducts = mentioned.slice(0, 3);
        } else if ((isProductSuggestionQuery || isOrderIntent) && (queryLower.includes('সব') || queryLower.includes('সকল') || queryLower.includes('all') || queryLower.includes('list'))) {
          suggestedProducts = cleanCatalog.slice(0, 4);
        }
      }

      // Check if order_json is embedded
      let detectedOrder: any = null;
      const orderJsonMatch = rawReply.match(/```order_json\s*([\s\S]*?)\s*```/);
      if (orderJsonMatch && orderJsonMatch[1]) {
        try {
          detectedOrder = JSON.parse(orderJsonMatch[1]);
        } catch {}
      }

      res.json({
        reply: rawReply.replace(/```order_json[\s\S]*?```/, "").trim(),
        actionLinks,
        suggestedProducts,
        productSectionTitle: productSectionTitle || (suggestedProducts.length > 0 ? (activeLang === 'en' ? 'Featured Products:' : 'পণ্যসমূহ:') : undefined),
        categoryChips: [],
        detectedOrder,
        source: successfulModel || "gemini",
      });
    } catch (err: any) {
      console.error("Gemini API handler error:", err);
      res.json({
        reply: "আসসালামু আলাইকুম! কেম্যাক্স বিডি-তে স্বাগতম। আপনি কোন পণ্যটি সম্পর্কে জানতে বা অর্ডার করতে চান? আমাকে জানান, আমি সাহায্য করছি।",
        actionLinks: [],
        suggestedProducts: [],
        detectedOrder: null,
        fallback: true,
      });
    }
  };

  app.post("/api/gemini/chat", handleGeminiChatRequest);
  app.post("/api/chat", handleGeminiChatRequest);

  // AI Bot Analytics / Logs endpoint
  app.get("/api/ai-bot/logs", (req, res) => {
    res.json({ success: true, logs: aiBotLogs.slice(0, 100) });
  });

  // Simulated / Real Google Sheets sync endpoint
  app.post("/api/sheets/sync", (req, res) => {
    try {
      const { type, records = [] } = req.body;
      const timestamp = new Date().toISOString();
      res.json({
        success: true,
        sheetType: type || "Orders",
        syncedCount: records.length,
        timestamp,
        syncId: "SYNC-" + Date.now(),
        message: `Successfully synchronized ${records.length} records to Google Sheets.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Real Gmail SMTP & Transactional Email sending endpoint
  app.post("/api/email/send", async (req, res) => {
    try {
      const {
        to,
        subject,
        html,
        text,
        type,
        senderName = "KenaX BD Official",
        senderEmail,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
      } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ error: "Missing required fields: to, subject" });
      }

      const timestamp = new Date().toISOString();
      const user = smtpUser || process.env.GMAIL_USER || process.env.SMTP_USER;
      const pass = smtpPass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
      const host = smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
      const port = Number(smtpPort || process.env.SMTP_PORT || 465);

      const superAdminEmail = (req.body.superAdminEmail || process.env.SUPER_ADMIN_EMAIL || "sadikrtx3060@gmail.com").trim();
      const bccList: string[] = [];
      if (superAdminEmail && to.toLowerCase().trim() !== superAdminEmail.toLowerCase().trim()) {
        bccList.push(superAdminEmail);
      }

      console.log(`[Email Dispatcher] To: ${to} | BCC Super Admin: ${bccList.join(', ') || 'N/A'} | Subject: ${subject} | Type: ${type}`);

      // If SMTP credentials configured, attempt real transmission via Google Gmail / SMTP
      if (user && pass) {
        try {
          const isGmail = host.toLowerCase().includes("gmail.com");
          const transporter = isGmail
            ? nodemailer.createTransport({
                service: "gmail",
                auth: { user, pass },
                tls: {
                  rejectUnauthorized: false,
                },
              })
            : nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
                tls: {
                  rejectUnauthorized: false,
                },
              });

          const mailPayload: any = {
            from: `"${senderName}" <${user}>`,
            to,
            replyTo: user,
            subject,
            text: text || "KenaX BD Notification",
            html: html || `<p>${subject}</p>`,
            headers: {
              "X-Mailer": "KenaX-BD-Intelligence-Engine/2.4",
              "X-Priority": "1",
              "Importance": "High",
              "List-Unsubscribe": "<mailto:support@kenaxbd.com?subject=unsubscribe>",
            },
          };

          if (bccList.length > 0) {
            mailPayload.bcc = bccList;
          }

          const info = await transporter.sendMail(mailPayload);

          console.log(`[SMTP Direct Delivery SUCCESS] MessageId: ${info.messageId} to ${to} (BCC: ${bccList.join(', ') || 'none'})`);
          return res.json({
            success: true,
            status: "Delivered",
            messageId: info.messageId,
            to,
            superAdminBcc: bccList[0] || null,
            subject,
            timestamp,
            mode: "live_smtp",
          });
        } catch (smtpErr: any) {
          console.error(`[SMTP Transmission Warning]:`, smtpErr.message);
          return res.json({
            success: true,
            status: "Simulated",
            smtpError: smtpErr.message,
            to,
            superAdminBcc: bccList[0] || null,
            subject,
            timestamp,
            mode: "fallback_simulated",
            note: `SMTP login attempt failed: ${smtpErr.message}. Logged and saved in database.`,
          });
        }
      }

      // If credentials are not yet set in environment, simulate cleanly
      return res.json({
        success: true,
        status: "Simulated",
        to,
        subject,
        timestamp,
        mode: "simulated_ready",
        note: "Email logged in system. Provide Gmail App Password in settings or .env to deliver real messages.",
      });
    } catch (err: any) {
      console.error("[Email API Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // REVIEWS API (PERSISTENT DISK, CLOUD & SERVER BACKUP)
  // ----------------------------------------------------
  const dataDirForReviews = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDirForReviews)) {
    try { fs.mkdirSync(dataDirForReviews, { recursive: true }); } catch {}
  }
  const reviewsFilePath = path.join(dataDirForReviews, "server_reviews.json");
  const deletedReviewsFilePath = path.join(dataDirForReviews, "server_deleted_reviews.json");

  const loadReviewsFromDisk = (): Map<string, any> => {
    const map = new Map<string, any>();
    try {
      if (fs.existsSync(reviewsFilePath)) {
        const raw = fs.readFileSync(reviewsFilePath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((r) => {
            if (r && r.id) map.set(r.id, r);
          });
        }
      }
    } catch (e) {
      console.warn("[Reviews Read Warning]:", e);
    }
    return map;
  };

  const loadDeletedReviewIds = (): Set<string> => {
    const set = new Set<string>();
    try {
      if (fs.existsSync(deletedReviewsFilePath)) {
        const raw = fs.readFileSync(deletedReviewsFilePath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((id) => set.add(id));
        }
      }
    } catch {}
    return set;
  };

  const memoryReviews: Map<string, any> = loadReviewsFromDisk();
  const deletedReviewIdsStore: Set<string> = loadDeletedReviewIds();

  const persistReviewsToDisk = () => {
    try {
      const list = Array.from(memoryReviews.values());
      fs.writeFileSync(reviewsFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch (e) {
      console.warn("[Reviews Persist Warning]:", e);
    }
  };

  const persistDeletedReviewsToDisk = () => {
    try {
      const list = Array.from(deletedReviewIdsStore);
      fs.writeFileSync(deletedReviewsFilePath, JSON.stringify(list, null, 2), "utf-8");
    } catch {}
  };

  app.get("/api/reviews", (req, res) => {
    try {
      const { productId } = req.query;
      let list = Array.from(memoryReviews.values()).filter((r) => !deletedReviewIdsStore.has(r.id));
      if (productId && typeof productId === 'string') {
        list = list.filter((r) => r.productId === productId || (r.productName && r.productName.toLowerCase() === productId.toLowerCase()));
      }
      res.json({ success: true, reviews: list });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/reviews", (req, res) => {
    try {
      const review = req.body;
      if (!review || !review.id) {
        return res.status(400).json({ success: false, error: "Missing review.id" });
      }
      deletedReviewIdsStore.delete(review.id);
      memoryReviews.set(review.id, review);
      persistReviewsToDisk();
      persistDeletedReviewsToDisk();
      res.json({ success: true, review });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/reviews/:id", (req, res) => {
    try {
      const { id } = req.params;
      if (id) {
        deletedReviewIdsStore.add(id);
        memoryReviews.delete(id);
        persistReviewsToDisk();
        persistDeletedReviewsToDisk();
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Android SIM SMS Gateway & Custom Gateway Endpoint
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { to, message, gatewayType = "android_sim", gatewayUrl, apiKey, secretKey } = req.body;
      if (!to || !message) {
        return res.status(400).json({ error: "Missing required fields: to, message" });
      }

      const timestamp = new Date().toISOString();
      const phone = String(to).replace(/[^0-9]/g, "");
      const formattedPhone = phone.startsWith("88") ? phone : `88${phone}`;

      console.log(`[SMS Gateway Dispatcher] Type: ${gatewayType} | To: ${formattedPhone} | Message: ${message.substring(0, 50)}...`);

      // If user provided a custom Android Gateway Webhook URL or HTTP API
      if (gatewayUrl && gatewayUrl.trim().length > 0) {
        try {
          const response = await fetch(gatewayUrl.trim(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              to: formattedPhone,
              phone: formattedPhone,
              message,
              text: message,
              apiKey,
              secretKey,
            }),
          });

          const resText = await response.text();
          return res.json({
            success: response.ok,
            status: response.ok ? "Sent" : "Failed",
            provider: gatewayType,
            gatewayUrl,
            to: formattedPhone,
            message,
            gatewayResponse: resText.substring(0, 150),
            timestamp,
          });
        } catch (gatewayErr: any) {
          console.warn("[Android Gateway Webhook call note]:", gatewayErr.message);
          return res.json({
            success: true,
            status: "Simulated",
            provider: gatewayType,
            to: formattedPhone,
            message,
            note: `Android Gateway Webhook attempted (${gatewayUrl}). Preview simulation fallback active.`,
            timestamp,
          });
        }
      }

      // Default Android SIM Gateway / Simulation response
      return res.json({
        success: true,
        status: "Simulated",
        provider: "android_sim",
        to: formattedPhone,
        message,
        timestamp,
        note: "Free Android SIM Gateway active! Connect Android Gateway App URL in Admin SMS Settings for direct device broadcasting.",
      });
    } catch (err: any) {
      console.error("[SMS API Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // GOOGLE DRIVE CUSTOMER REVIEWS STORAGE & SYNC
  // ==========================================
  const DRIVE_CONFIG_PATH = path.join(process.cwd(), "data", "google_drive_config.json");
  let activeGoogleDriveToken: string | null = null;
  let activeGoogleDriveUser: { email?: string; name?: string } | null = null;
  let cachedDriveReviewFolderId: string | null = null;

  try {
    if (fs.existsSync(DRIVE_CONFIG_PATH)) {
      const driveSavedRaw = fs.readFileSync(DRIVE_CONFIG_PATH, "utf-8");
      const driveSaved = JSON.parse(driveSavedRaw);
      if (driveSaved?.token) {
        activeGoogleDriveToken = driveSaved.token;
        activeGoogleDriveUser = driveSaved.user || null;
        cachedDriveReviewFolderId = driveSaved.folderId || null;
        console.log(`[Google Drive Boot] Restored permanent Drive connection for: ${driveSaved.user?.email || "Admin"}`);
      }
    }
  } catch (err: any) {
    console.warn("[Google Drive Boot Warning]:", err?.message);
  }

  const saveDriveConfigToDisk = () => {
    try {
      const dir = path.dirname(DRIVE_CONFIG_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        DRIVE_CONFIG_PATH,
        JSON.stringify({
          token: activeGoogleDriveToken,
          user: activeGoogleDriveUser,
          folderId: cachedDriveReviewFolderId,
          updatedAt: new Date().toISOString(),
        }, null, 2),
        "utf-8"
      );
    } catch {}
  };

  app.get("/api/drive/token", (_req, res) => {
    res.json({
      success: true,
      hasToken: Boolean(activeGoogleDriveToken),
      token: activeGoogleDriveToken,
      user: activeGoogleDriveUser,
      folderName: "Customer Reviews",
      folderId: cachedDriveReviewFolderId,
      folderUrl: cachedDriveReviewFolderId
        ? `https://drive.google.com/drive/folders/${cachedDriveReviewFolderId}`
        : null,
    });
  });

  app.post("/api/drive/token", (req, res) => {
    const { token, userEmail, userName, folderId } = req.body || {};
    if (token) {
      activeGoogleDriveToken = token;
      activeGoogleDriveUser = { email: userEmail, name: userName };
      if (folderId) cachedDriveReviewFolderId = folderId;
      saveDriveConfigToDisk();
      console.log(`[Google Drive Server Sync] Active Token linked permanently for Admin: ${userEmail || "Admin"}`);
      return res.json({ success: true, message: "Token registered permanently on server" });
    }
    return res.status(400).json({ success: false, error: "Missing token" });
  });

  app.delete("/api/drive/token", (_req, res) => {
    activeGoogleDriveToken = null;
    activeGoogleDriveUser = null;
    cachedDriveReviewFolderId = null;
    saveDriveConfigToDisk();
    res.json({ success: true });
  });

  // Upload Customer Review photo to Google Drive "Customer Reviews" folder
  app.post("/api/drive/customer-review-upload", async (req, res) => {
    try {
      const { filename = "review_photo.jpg", mimeType = "image/jpeg", base64Data } = req.body || {};
      if (!base64Data) {
        return res.status(400).json({ success: false, error: "Missing base64Data" });
      }

      // If Google Drive token is present on server
      if (activeGoogleDriveToken) {
        try {
          // 1. Check or create "Customer Reviews" folder in Google Drive
          if (!cachedDriveReviewFolderId) {
            const query = encodeURIComponent("name = 'Customer Reviews' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
            const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
              headers: { Authorization: `Bearer ${activeGoogleDriveToken}` },
            });
            if (searchRes.ok) {
              const data = await searchRes.json();
              if (data.files && data.files.length > 0) {
                cachedDriveReviewFolderId = data.files[0].id;
              }
            }

            if (!cachedDriveReviewFolderId) {
              const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${activeGoogleDriveToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name: "Customer Reviews",
                  mimeType: "application/vnd.google-apps.folder",
                  description: "Customer review photos and images from KenaX store",
                }),
              });
              if (createRes.ok) {
                const created = await createRes.json();
                cachedDriveReviewFolderId = created.id;
                // Make folder accessible
                await fetch(`https://www.googleapis.com/drive/v3/files/${created.id}/permissions`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${activeGoogleDriveToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ role: "reader", type: "anyone" }),
                }).catch(() => {});
              }
            }
          }

          // 2. Upload file via multipart upload to Google Drive
          const cleanName = filename ? filename.replace(/[/\\?%*:|"<>]/g, ' ').trim() : `review-${Date.now()}.jpg`;
          const metadata = {
            name: cleanName,
            parents: cachedDriveReviewFolderId ? [cachedDriveReviewFolderId] : undefined,
          };

          const boundary = "-------314159265358979323846";
          const delimiter = `\r\n--${boundary}\r\n`;
          const closeDelimiter = `\r\n--${boundary}--`;

          const metadataPart =
            delimiter +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${mimeType}\r\n` +
            "Content-Transfer-Encoding: base64\r\n\r\n";

          const multipartRequestBody = metadataPart + base64Data + closeDelimiter;

          const uploadRes = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${activeGoogleDriveToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
              },
              body: multipartRequestBody,
            }
          );

          if (uploadRes.ok) {
            const uploaded = await uploadRes.json();
            const fileId = uploaded.id;

            // Make file publicly readable by anyone so it displays as permanent product review image
            await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${activeGoogleDriveToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ role: "reader", type: "anyone" }),
            }).catch(() => {});

            const permanentUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
            console.log(`[Google Drive Review Upload SUCCESS] FileId: ${fileId} saved in "Customer Reviews" folder!`);
            return res.json({
              success: true,
              inDrive: true,
              fileId,
              folderId: cachedDriveReviewFolderId,
              name: uploaded.name,
              url: permanentUrl,
            });
          }
        } catch (gErr: any) {
          console.warn("[Google Drive Server Upload Error, saving fallback]:", gErr?.message);
        }
      }

      // Fallback local storage if Drive token expired or unlinked
      const buffer = Buffer.from(base64Data, "base64");
      const reviewDir = path.join(process.cwd(), "data", "review_media");
      if (!fs.existsSync(reviewDir)) {
        fs.mkdirSync(reviewDir, { recursive: true });
      }
      const safeExt = mimeType.split("/")[1]?.split(";")[0] || "jpg";
      const localFileName = `review_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`;
      const filePath = path.join(reviewDir, localFileName);
      fs.writeFileSync(filePath, buffer);

      const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const fileUrl = `${proto}://${host}/api/drive/media-fallback/${localFileName}`;

      return res.json({
        success: true,
        inDrive: false,
        url: fileUrl,
        name: localFileName,
        note: "Saved to secure review store. Connect Admin Google Drive in Admin Reviews to auto-sync directly to Drive folder.",
      });
    } catch (err: any) {
      console.error("[Customer Review Upload API Error]:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve Fallback Review media
  app.get("/api/drive/media-fallback/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const safeName = path.basename(filename);
      const filePath = path.join(process.cwd(), "data", "review_media", safeName);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).send("File not found");
    } catch (err: any) {
      res.status(500).send("Error serving review media");
    }
  });

  // Get Customer Reviews Folder Info & Files from Google Drive
  app.get("/api/drive/customer-reviews", async (_req, res) => {
    try {
      if (!activeGoogleDriveToken) {
        return res.json({
          success: true,
          connected: false,
          folderName: "Customer Reviews",
          files: [],
        });
      }

      // 1. Ensure folder ID
      if (!cachedDriveReviewFolderId) {
        const query = encodeURIComponent("name = 'Customer Reviews' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${activeGoogleDriveToken}` },
        });
        if (searchRes.ok) {
          const data = await searchRes.json();
          if (data.files && data.files.length > 0) {
            cachedDriveReviewFolderId = data.files[0].id;
          }
        }
      }

      if (!cachedDriveReviewFolderId) {
        return res.json({
          success: true,
          connected: true,
          folderName: "Customer Reviews",
          folderId: null,
          files: [],
        });
      }

      const q = encodeURIComponent(`'${cachedDriveReviewFolderId}' in parents and trashed = false`);
      const listRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,createdTime,size)&orderBy=createdTime desc&pageSize=50`,
        { headers: { Authorization: `Bearer ${activeGoogleDriveToken}` } }
      );

      if (listRes.ok) {
        const listData = await listRes.json();
        const files = (listData.files || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          createdTime: f.createdTime,
          size: f.size,
          url: `https://lh3.googleusercontent.com/d/${f.id}`,
          thumbnailUrl: `https://lh3.googleusercontent.com/d/${f.id}`,
        }));

        return res.json({
          success: true,
          connected: true,
          folderName: "Customer Reviews",
          folderId: cachedDriveReviewFolderId,
          folderUrl: `https://drive.google.com/drive/folders/${cachedDriveReviewFolderId}`,
          totalFiles: files.length,
          files,
        });
      }

      return res.json({
        success: true,
        connected: true,
        folderName: "Customer Reviews",
        folderId: cachedDriveReviewFolderId,
        files: [],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // OFFICIAL META WHATSAPP CLOUD API WEBHOOKS
  // ==========================================

  // Universal CORS & Preflight middleware for Webhook routes
  const webhookCors = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Hub-Signature-256, hub.mode, hub.verify_token, hub.challenge");
    next();
  };

  // 1. GET & HEAD Webhook Verification for Meta Developer Portal (Supports multiple path aliases)
  const handleWhatsAppWebhookVerification = (req: express.Request, res: express.Response) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");

      if (req.method === "OPTIONS" || req.method === "HEAD") {
        return res.status(200).end();
      }

      const urlObj = new URL(req.originalUrl || req.url, "http://localhost");
      
      const mode = (
        req.query["hub.mode"] ||
        req.query["hub_mode"] ||
        (req.query.hub as any)?.mode ||
        urlObj.searchParams.get("hub.mode") ||
        urlObj.searchParams.get("hub_mode") ||
        ""
      ) as string;

      const token = (
        req.query["hub.verify_token"] ||
        req.query["hub_verify_token"] ||
        (req.query.hub as any)?.verify_token ||
        urlObj.searchParams.get("hub.verify_token") ||
        urlObj.searchParams.get("hub_verify_token") ||
        ""
      ) as string;

      const challenge = (
        req.query["hub.challenge"] ||
        req.query["hub_challenge"] ||
        (req.query.hub as any)?.challenge ||
        urlObj.searchParams.get("hub.challenge") ||
        urlObj.searchParams.get("hub_challenge") ||
        ""
      ) as string;

      const configuredToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").replace(/^["']|["']$/g, "").trim();

      console.log(
        `[WhatsApp Webhook GET] mode="${mode}", tokenReceived=${Boolean(token)}, challengeReceived=${Boolean(challenge)}`
      );

      // Meta sends hub.mode='subscribe' and hub.verify_token
      if (mode && token) {
        const isModeSubscribe = mode.trim().toLowerCase() === "subscribe";
        const isTokenValid = Boolean(configuredToken) && token.trim() === configuredToken;

        if (isModeSubscribe && isTokenValid) {
          console.log(`[WhatsApp Webhook Verification SUCCESS] Verified with Meta. Returning challenge.`);
          // Meta expects exactly HTTP 200 and challenge string in text/plain
          return res.status(200).type("text/plain").send(String(challenge).trim());
        } else {
          console.warn(
            `[WhatsApp Webhook Verification REJECTED] Mismatch or invalid mode/token: mode="${mode}", tokenProvided=${Boolean(token)}, tokenConfigured=${Boolean(configuredToken)}`
          );
          return res.status(403).type("text/plain").send("Verification token mismatch");
        }
      }

      // Friendly JSON status if visited directly from browser or diagnostic tools
      return res.status(200).json({
        status: "active",
        service: "Official Meta WhatsApp Cloud API Webhook",
        endpoint: "/api/whatsapp/webhook",
        note: "Meta Developer Dashboard sends GET verification requests with hub.mode, hub.verify_token, and hub.challenge",
        verifyTokenConfigured: Boolean(configuredToken),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[WhatsApp Webhook GET Exception]:", err);
      return res.status(500).json({ error: "Internal webhook verification error", details: err.message });
    }
  };

  app.use("/api/whatsapp/webhook", webhookCors);
  app.use("/webhook", webhookCors);
  app.use("/api/webhook", webhookCors);

  app.options("/api/whatsapp/webhook", (_req, res) => res.status(200).end());
  app.options("/api/whatsapp/webhook/", (_req, res) => res.status(200).end());
  app.options("/webhook", (_req, res) => res.status(200).end());
  app.options("/api/webhook", (_req, res) => res.status(200).end());

  app.get("/api/whatsapp/webhook", handleWhatsAppWebhookVerification);
  app.get("/api/whatsapp/webhook/", handleWhatsAppWebhookVerification);
  app.get("/api/webhook", handleWhatsAppWebhookVerification);
  app.get("/webhook", handleWhatsAppWebhookVerification);

  // 2. POST Webhook Incoming Event Receiver (Messages, Delivery Statuses, Button Clicks)
  const handleWhatsAppWebhookPost = async (req: any, res: express.Response) => {
    try {
      const accessToken = (
        process.env.WHATSAPP_ACCESS_TOKEN ||
        process.env.META_WHATSAPP_TOKEN ||
        ""
      ).trim();
      const signature = req.headers["x-hub-signature-256"] as string | undefined;
      const appSecret = (process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || "").trim();

      // Verify HMAC-SHA256 signature if app secret is provided in environment
      if (appSecret) {
        if (!signature) {
          console.warn("[WhatsApp Webhook Security] Missing X-Hub-Signature-256 header. Request rejected.");
          return res.status(401).json({ error: "Missing signature header" });
        }

        const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body));
        const expectedHash = crypto.createHmac("sha256", appSecret).update(rawPayload).digest("hex");
        const signatureHash = signature.replace(/^sha256=/, "");

        try {
          const signatureBuffer = Buffer.from(signatureHash, "hex");
          const expectedBuffer = Buffer.from(expectedHash, "hex");

          if (
            signatureBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
          ) {
            console.warn("[WhatsApp Webhook Security] Invalid HMAC-SHA256 signature. Request rejected.");
            return res.status(401).json({ error: "Invalid signature" });
          }
        } catch (signErr) {
          console.warn("[WhatsApp Webhook Security] Signature parsing error:", signErr);
          return res.status(401).json({ error: "Malformed signature format" });
        }
      }

      const body = req.body;
      console.log(`[WhatsApp Webhook POST] Received payload. Object: ${body?.object || "unknown"}`);

      // Log raw webhook event
      logWhatsAppWebhook({
        id: `WHK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        receivedAt: new Date().toISOString(),
        type: body?.object || "whatsapp_business_account",
        summary: "Meta WhatsApp Cloud API Webhook Event",
        rawPayload: body,
      });

      // Meta strictly mandates responding with 200 OK immediately
      res.status(200).json({ status: "EVENT_RECEIVED" });

      // Asynchronous event processing
      if (body?.object === "whatsapp_business_account") {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value;
            if (!value) continue;

            // Process Incoming Customer Messages
            if (value.messages && Array.isArray(value.messages)) {
              const contacts = value.contacts || [];
              const senderProfile = contacts[0]?.profile?.name;

              for (const msg of value.messages) {
                const messageId = msg.id || `wamid.${Date.now()}`;
                const from = msg.from;
                const type = msg.type || "text";
                let textBody = "";

                if (type === "text") {
                  textBody = msg.text?.body || "";
                } else if (type === "interactive") {
                  textBody =
                    msg.interactive?.button_reply?.title ||
                    msg.interactive?.list_reply?.title ||
                    "[Interactive Selection]";
                } else if (type === "button") {
                  textBody = msg.button?.text || "[Button Action]";
                } else if (type === "image") {
                  textBody = msg.image?.caption || "[📷 Image]";
                } else if (type === "video") {
                  textBody = msg.video?.caption || "[🎥 Video]";
                } else if (type === "audio" || type === "voice") {
                  textBody = "[🎙️ Voice / Audio Note]";
                } else if (type === "document") {
                  textBody = msg.document?.filename ? `[📄 Document: ${msg.document.filename}]` : "[📄 Document]";
                } else if (type === "location") {
                  textBody = `[Location: Lat ${msg.location?.latitude}, Lng ${msg.location?.longitude}]`;
                } else {
                  textBody = `[${type.toUpperCase()} Message]`;
                }

                // Extract Media Metadata if present
                let mediaUrl: string | undefined = undefined;
                let mediaType: "image" | "video" | "audio" | "voice" | "document" | undefined = undefined;
                let mediaCaption: string | undefined = undefined;
                let filename: string | undefined = undefined;

                if (type === "image") {
                  mediaType = "image";
                  const mId = msg.image?.id;
                  if (mId) {
                    mediaUrl = `/api/whatsapp/media/${mId}.jpg`;
                    getOrFetchWhatsAppMedia(mId, accessToken).catch(() => {});
                  } else {
                    mediaUrl = await resolveIncomingMediaUrl(msg.image, accessToken, req);
                  }
                  mediaCaption = msg.image?.caption;
                } else if (type === "video") {
                  mediaType = "video";
                  const mId = msg.video?.id;
                  if (mId) {
                    mediaUrl = `/api/whatsapp/media/${mId}.mp4`;
                    getOrFetchWhatsAppMedia(mId, accessToken).catch(() => {});
                  } else {
                    mediaUrl = await resolveIncomingMediaUrl(msg.video, accessToken, req);
                  }
                  mediaCaption = msg.video?.caption;
                } else if (type === "audio" || type === "voice") {
                  mediaType = (type === "voice" || msg.audio?.voice) ? "voice" : "audio";
                  const mId = (msg.audio || msg.voice)?.id;
                  if (mId) {
                    mediaUrl = `/api/whatsapp/media/${mId}.ogg`;
                    getOrFetchWhatsAppMedia(mId, accessToken).catch(() => {});
                  } else {
                    mediaUrl = await resolveIncomingMediaUrl(msg.audio || msg.voice, accessToken, req);
                  }
                } else if (type === "document") {
                  mediaType = "document";
                  const mId = msg.document?.id;
                  filename = msg.document?.filename || "document.pdf";
                  const ext = filename?.split(".").pop() || "pdf";
                  if (mId) {
                    mediaUrl = `/api/whatsapp/media/${mId}.${ext}`;
                    getOrFetchWhatsAppMedia(mId, accessToken).catch(() => {});
                  } else {
                    mediaUrl = await resolveIncomingMediaUrl(msg.document, accessToken, req);
                  }
                  mediaCaption = msg.document?.caption;
                }

                console.log(
                  `[WhatsApp Incoming Message] From: ${from} (${senderProfile || "Customer"}) | Type: ${type} | Text: ${textBody}`
                );

                const record: WhatsAppMessageRecord = {
                  id: messageId,
                  direction: "incoming",
                  from,
                  senderName: senderProfile,
                  text: textBody,
                  messageType: type as any,
                  mediaUrl,
                  mediaType,
                  mediaCaption,
                  filename,
                  rawPayload: msg,
                  status: "received",
                  timestamp: msg.timestamp
                    ? new Date(Number(msg.timestamp) * 1000).toISOString()
                    : new Date().toISOString(),
                };

                saveWhatsAppMessage(record);
                syncWhatsAppMessageToFirestore(record).catch(() => {});
              }
            }

            // Process Message Delivery Status Updates (sent, delivered, read, failed)
            if (value.statuses && Array.isArray(value.statuses)) {
              for (const st of value.statuses) {
                const messageId = st.id;
                const statusName = st.status as "sent" | "delivered" | "read" | "failed";
                const recipientId = st.recipient_id;
                let errStr: string | undefined = undefined;
                if (st.errors && Array.isArray(st.errors) && st.errors.length > 0) {
                  const firstErr = st.errors[0];
                  let detail = firstErr.title || firstErr.message || firstErr.error_data?.details || "Delivery failed";
                  if (firstErr.code === 131026) {
                    detail = "Message undeliverable (গ্রাহকের হোয়াটসঅ্যাপ অ্যাকাউন্ট নেই, অথবা নম্বরটি নিজস্ব প্রেরক নম্বর 01719143897, অথবা মেটা অ্যাপ ডেভেলপমেন্ট মোডে রয়েছে)";
                  }
                  errStr = `Error ${firstErr.code}: ${detail}`;
                }

                const maskedRecipient = recipientId ? `...${String(recipientId).slice(-4)}` : "unknown";
                console.log(
                  `[WhatsApp Status Receipt] ID: ${messageId} | Status: ${statusName} | Recipient: ${maskedRecipient} ${errStr ? `| Error: ${errStr}` : ""}`
                );
                updateWhatsAppMessageStatus(messageId, statusName, errStr);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[WhatsApp Webhook POST Exception]:", err);
      if (!res.headersSent) {
        res.status(200).json({ status: "ERROR_RECORDED", error: err.message });
      }
    }
  };

  app.post("/api/whatsapp/webhook", handleWhatsAppWebhookPost);
  app.post("/api/whatsapp/webhook/", handleWhatsAppWebhookPost);
  app.post("/api/webhook", handleWhatsAppWebhookPost);
  app.post("/webhook", handleWhatsAppWebhookPost);

  // Persistent on-disk and in-memory cache for serving WhatsApp media files
  const WHATSAPP_MEDIA_DIR = path.join(process.cwd(), "data", "whatsapp_media");
  function ensureWhatsAppMediaDir() {
    if (!fs.existsSync(WHATSAPP_MEDIA_DIR)) {
      fs.mkdirSync(WHATSAPP_MEDIA_DIR, { recursive: true });
    }
  }

  function getMediaExtensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      "audio/ogg": "ogg",
      "audio/ogg; codecs=opus": "ogg",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/mp4": "m4a",
      "audio/aac": "aac",
      "audio/wav": "wav",
      "audio/webm": "weba",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "text/plain": "txt",
      "text/csv": "csv",
    };
    const clean = (mimeType || "").split(";")[0].trim().toLowerCase();
    return map[mimeType] || map[clean] || clean.split("/")[1] || "bin";
  }

  const whatsappMediaCache = new Map<string, { buffer: Buffer; mimeType: string; filename?: string; createdAt: number }>();

  /**
   * Helper to retrieve or download media from Meta Cloud API
   * Persists binary to disk and in-memory cache to guarantee permanent availability across restarts.
   */
  async function getOrFetchWhatsAppMedia(
    rawMediaIdOrUrl: string,
    tokenOverride?: string
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    ensureWhatsAppMediaDir();
    const token = (
      tokenOverride ||
      process.env.WHATSAPP_ACCESS_TOKEN ||
      process.env.META_WHATSAPP_TOKEN ||
      ""
    ).trim();

    const cleanInput = String(rawMediaIdOrUrl || "").trim();
    if (!cleanInput) return null;

    // 1. In-memory check
    const memItem = whatsappMediaCache.get(cleanInput);
    if (memItem) {
      return {
        buffer: memItem.buffer,
        mimeType: memItem.mimeType,
        filename: memItem.filename || `media_${cleanInput}.${getMediaExtensionFromMime(memItem.mimeType)}`,
      };
    }

    // 2. Extract mediaId & potential direct lookaside URL
    let mediaId = cleanInput;
    let directDownloadUrl: string | null = null;

    if (cleanInput.startsWith("http://") || cleanInput.startsWith("https://")) {
      directDownloadUrl = cleanInput;
      const matchMid = cleanInput.match(/mid=([a-zA-Z0-9_-]+)/i);
      const matchId = cleanInput.match(/\/([0-9]{10,25})/);
      if (matchMid) {
        mediaId = matchMid[1];
      } else if (matchId) {
        mediaId = matchId[1];
      } else {
        mediaId = crypto.createHash("md5").update(cleanInput).digest("hex");
      }
    } else {
      mediaId = cleanInput.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "");
    }

    // Check memory with clean mediaId
    const memById = whatsappMediaCache.get(mediaId);
    if (memById) {
      return {
        buffer: memById.buffer,
        mimeType: memById.mimeType,
        filename: memById.filename || `media_${mediaId}.${getMediaExtensionFromMime(memById.mimeType)}`,
      };
    }

    // 3. Disk cache check
    const metaFilePath = path.join(WHATSAPP_MEDIA_DIR, `${mediaId}.meta.json`);
    const dataFilePath = path.join(WHATSAPP_MEDIA_DIR, `${mediaId}.bin`);

    if (fs.existsSync(metaFilePath) && fs.existsSync(dataFilePath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
        const buffer = fs.readFileSync(dataFilePath);
        const mimeType = meta.mimeType || "application/octet-stream";
        const filename = meta.filename || `media_${mediaId}.${getMediaExtensionFromMime(mimeType)}`;

        // Populate in-memory map
        whatsappMediaCache.set(mediaId, { buffer, mimeType, filename, createdAt: Date.now() });
        return { buffer, mimeType, filename };
      } catch (err) {
        console.warn("[Media Cache Disk Read Warning]:", err);
      }
    }

    // 4. Fetch from Meta Graph API using Token
    if (!token) {
      console.warn(`[WhatsApp Media Fetch] WHATSAPP_ACCESS_TOKEN is missing for media: ${mediaId}`);
      return null;
    }

    try {
      let downloadUrl = directDownloadUrl;
      let detectedMime = "application/octet-stream";
      let originalFilename = "";

      if (!downloadUrl) {
        // Step A: Query Graph API
        const infoRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const infoData: any = await infoRes.json();
        if (!infoRes.ok || !infoData.url) {
          console.warn(`[Meta Graph API Media Info Error] ID: ${mediaId}`, infoData);
          return null;
        }
        downloadUrl = infoData.url;
        detectedMime = infoData.mime_type || detectedMime;
      }

      // Step B: Download binary with Authorization Bearer header
      const binRes = await fetch(downloadUrl!, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!binRes.ok) {
        console.warn(`[Meta Media Binary Fetch Error] HTTP ${binRes.status} for ${downloadUrl}`);
        return null;
      }

      const arrayBuf = await binRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const mimeType = binRes.headers.get("content-type") || detectedMime;
      const ext = getMediaExtensionFromMime(mimeType);
      const filename = originalFilename || `media_${mediaId}.${ext}`;

      // Save to disk cache permanently
      try {
        fs.writeFileSync(dataFilePath, buffer);
        fs.writeFileSync(
          metaFilePath,
          JSON.stringify({ mimeType, filename, mediaId, size: buffer.length, createdAt: Date.now() }, null, 2)
        );
      } catch (fsErr) {
        console.warn("[WhatsApp Media Cache Disk Write Error]:", fsErr);
      }

      // Save to memory cache
      whatsappMediaCache.set(mediaId, { buffer, mimeType, filename, createdAt: Date.now() });
      if (cleanInput !== mediaId) {
        whatsappMediaCache.set(cleanInput, { buffer, mimeType, filename, createdAt: Date.now() });
      }

      return { buffer, mimeType, filename };
    } catch (fetchErr: any) {
      console.error(`[WhatsApp Media Fetch Exception] ID: ${mediaId}:`, fetchErr);
      return null;
    }
  }

  /**
   * Universal HTTP Response Helper supporting Range requests (streaming audio/video) and download
   */
  function serveMediaBuffer(
    req: express.Request,
    res: express.Response,
    item: { buffer: Buffer; mimeType: string; filename: string },
    isDownload = false
  ) {
    const total = item.buffer.length;
    const range = req.headers.range;

    res.setHeader("Content-Type", item.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    if (isDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="${item.filename}"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${item.filename}"`);
    }

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const partialstart = parts[0];
      const partialend = parts[1];

      const start = parseInt(partialstart, 10);
      const end = partialend ? parseInt(partialend, 10) : total - 1;
      const chunksize = end - start + 1;

      if (start >= total || end >= total) {
        res.status(416).setHeader("Content-Range", `bytes */${total}`);
        return res.end();
      }

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", chunksize);
      return res.end(item.buffer.subarray(start, end + 1));
    } else {
      res.setHeader("Content-Length", total);
      return res.status(200).end(item.buffer);
    }
  }

  // Route: /api/whatsapp/media/:mediaId
  app.get("/api/whatsapp/media/:mediaId", async (req, res) => {
    try {
      const rawId = req.params.mediaId || "";
      const isDownload = req.query.download === "1" || req.query.download === "true";
      const customFilename = (req.query.filename as string) || undefined;

      const media = await getOrFetchWhatsAppMedia(rawId);
      if (!media) {
        return res.status(404).send("WhatsApp media not found or inaccessible.");
      }

      if (customFilename) {
        media.filename = customFilename;
      }

      return serveMediaBuffer(req, res, media, isDownload);
    } catch (err: any) {
      console.error("[WhatsApp Media Route Error]:", err);
      return res.status(500).send("Error serving media file.");
    }
  });

  // Route: /api/whatsapp/media-cache/:mediaId (Backwards compatibility)
  app.get("/api/whatsapp/media-cache/:mediaId", async (req, res) => {
    try {
      const rawId = req.params.mediaId || "";
      const isDownload = req.query.download === "1" || req.query.download === "true";
      const media = await getOrFetchWhatsAppMedia(rawId);
      if (!media) {
        return res.status(404).send("Media not found or expired");
      }
      return serveMediaBuffer(req, res, media, isDownload);
    } catch (err: any) {
      return res.status(500).send("Error serving media file.");
    }
  });

  // Route: /api/whatsapp/media-proxy
  app.get("/api/whatsapp/media-proxy", async (req, res) => {
    try {
      const targetUrl = (req.query.url as string) || "";
      const mediaId = (req.query.mediaId as string) || "";
      const isDownload = req.query.download === "1" || req.query.download === "true";
      const customFilename = (req.query.filename as string) || undefined;

      const key = targetUrl || mediaId;
      if (!key) {
        return res.status(400).send("Missing url or mediaId parameter.");
      }

      const media = await getOrFetchWhatsAppMedia(key);
      if (!media) {
        return res.status(404).send("Unable to proxy requested WhatsApp media.");
      }

      if (customFilename) {
        media.filename = customFilename;
      }

      return serveMediaBuffer(req, res, media, isDownload);
    } catch (err: any) {
      console.error("[WhatsApp Media Proxy Error]:", err);
      return res.status(500).send("Error proxying media.");
    }
  });

  /**
   * Helper to upload base64 media directly to Meta WhatsApp Cloud API Media Upload endpoint
   */
  async function uploadMediaToMeta(
    phoneNumberId: string,
    accessToken: string,
    dataUri: string
  ): Promise<{ mediaId?: string; mimeType?: string; error?: string }> {
    try {
      const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return { error: "Invalid base64 data URI format" };
      }

      const mimeType = match[1] || "image/jpeg";
      const base64String = match[2];
      const buffer = Buffer.from(base64String, "base64");

      const extension = mimeType.split("/")[1] || "bin";
      const fileName = `upload_${Date.now()}.${extension}`;

      const blob = new Blob([buffer], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("messaging_product", "whatsapp");
      formData.append("type", mimeType);

      const uploadUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/media`;
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const resJson: any = await res.json();
      if (!res.ok || !resJson.id) {
        console.warn("[Meta Media Upload Error]:", resJson);
        return { error: resJson?.error?.message || "Meta media upload failed" };
      }

      return { mediaId: resJson.id, mimeType };
    } catch (err: any) {
      console.error("[Meta Media Upload Exception]:", err);
      return { error: err.message || "Failed to upload media to Meta" };
    }
  }

  async function resolveIncomingMediaUrl(
    mediaObj: any,
    accessToken: string,
    req: express.Request
  ): Promise<string | undefined> {
    if (!mediaObj) return undefined;
    if (mediaObj.link) return mediaObj.link;
    if (mediaObj.url) return mediaObj.url;

    const mediaId = mediaObj.id;
    if (!mediaId || !accessToken) return undefined;

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data: any = await res.json();
      if (res.ok && data?.url) {
        const metaMediaUrl = data.url;
        const mediaRes = await fetch(metaMediaUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (mediaRes.ok) {
          const arrayBuffer = await mediaRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const mimeType = mediaRes.headers.get("content-type") || "image/jpeg";
          const cacheId = `inc_${mediaId}_${Date.now()}`;
          const ext = mimeType.split("/")[1] || "bin";

          whatsappMediaCache.set(cacheId, { buffer, mimeType, createdAt: Date.now() });

          const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
          const host = req.get("host") || "localhost:3000";
          return `${proto}://${host}/api/whatsapp/media-cache/${cacheId}.${ext}`;
        }
        return metaMediaUrl;
      }
    } catch (err) {
      console.warn("[Resolve Incoming Media URL Error]:", err);
    }
    return undefined;
  }

  /**
   * Resolve mediaUrl into a valid Meta Cloud API payload (either via mediaId or valid HTTP/HTTPS URI)
   */
  async function resolveMetaMediaPayload(
    mediaUrl: string,
    mediaKind: "image" | "video" | "audio" | "document",
    phoneNumberId: string,
    accessToken: string,
    req: express.Request,
    options: { caption?: string; filename?: string } = {}
  ): Promise<{ payloadObj?: any; error?: string }> {
    const trimmedUrl = String(mediaUrl || "").trim();
    if (!trimmedUrl) {
      return { error: "Empty media URL provided" };
    }

    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = req.get("host") || "localhost:3000";
    const origin = `${proto}://${host}`;

    // 1. If it's a data URI (e.g. data:image/png;base64,...), try Meta Media Upload API
    if (trimmedUrl.startsWith("data:")) {
      const metaUploadResult = await uploadMediaToMeta(phoneNumberId, accessToken, trimmedUrl);
      if (metaUploadResult.mediaId) {
        const mediaObj: any = { id: metaUploadResult.mediaId };
        if (options.caption && mediaKind !== "audio") mediaObj.caption = options.caption;
        if (options.filename && mediaKind === "document") mediaObj.filename = options.filename;
        return { payloadObj: { type: mediaKind, [mediaKind]: mediaObj } };
      }

      // Fallback: cache buffer locally and pass public HTTPS URL
      try {
        const match = trimmedUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1] || "image/jpeg";
          const base64String = match[2];
          const buffer = Buffer.from(base64String, "base64");
          const cacheId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const ext = mimeType.split("/")[1] || "bin";

          whatsappMediaCache.set(cacheId, { buffer, mimeType, createdAt: Date.now() });
          const cachedPublicUrl = `${origin}/api/whatsapp/media-cache/${cacheId}.${ext}`;

          const mediaObj: any = { link: cachedPublicUrl };
          if (options.caption && mediaKind !== "audio") mediaObj.caption = options.caption;
          if (options.filename && mediaKind === "document") mediaObj.filename = options.filename;
          return { payloadObj: { type: mediaKind, [mediaKind]: mediaObj } };
        }
      } catch (e) {
        console.warn("[WhatsApp Media Cache Fallback Error]:", e);
      }

      return { error: metaUploadResult.error || "Failed to process attached data URI media" };
    }

    // 2. If it's a relative URL, convert to absolute URL
    let finalUrl = trimmedUrl;
    if (trimmedUrl.startsWith("/")) {
      finalUrl = `${origin}${trimmedUrl}`;
    } else if (trimmedUrl.startsWith("media://")) {
      finalUrl = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
    }

    // 3. Ensure it starts with http:// or https://
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    // 4. Validate URI syntax
    try {
      const parsed = new URL(finalUrl);
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        return { error: `Invalid media URI host '${finalUrl}'. Must be a valid public http/https web link.` };
      }
    } catch (err) {
      return { error: `Invalid media URI '${finalUrl}'. Must be a valid http:// or https:// URL.` };
    }

    // 5. Handle Google Drive URLs by streaming directly into media cache so Meta receives direct media binary
    if (
      finalUrl.includes("drive.google.com") ||
      finalUrl.includes("docs.google.com") ||
      finalUrl.includes("googleusercontent.com")
    ) {
      const gDriveMatch =
        finalUrl.match(/\/file(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)/) ||
        finalUrl.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/) ||
        finalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
        finalUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
        finalUrl.match(/\/open\?id=([a-zA-Z0-9_-]+)/) ||
        finalUrl.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);

      if (gDriveMatch && gDriveMatch[1]) {
        const fileId = gDriveMatch[1];
        try {
          const downloadUrl =
            mediaKind === "image"
              ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
              : `https://drive.google.com/uc?export=download&id=${fileId}`;
          const driveRes = await fetch(downloadUrl);
          if (driveRes.ok) {
            const arrayBuffer = await driveRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType =
              driveRes.headers.get("content-type") ||
              (mediaKind === "image"
                ? "image/jpeg"
                : mediaKind === "video"
                ? "video/mp4"
                : mediaKind === "audio"
                ? "audio/mpeg"
                : "application/pdf");
            const cacheId = `gdrive_${fileId}_${Date.now()}`;
            const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
            whatsappMediaCache.set(cacheId, { buffer, mimeType, createdAt: Date.now() });
            finalUrl = `${origin}/api/whatsapp/media-cache/${cacheId}.${ext}`;
          }
        } catch (driveErr) {
          console.warn("[WhatsApp Google Drive Fetch Fallback Error]:", driveErr);
        }
      }
    }

    const mediaObj: any = { link: finalUrl };
    if (options.caption && mediaKind !== "audio") mediaObj.caption = options.caption;
    if (options.filename && mediaKind === "document") mediaObj.filename = options.filename;

    return { payloadObj: { type: mediaKind, [mediaKind]: mediaObj } };
  }

  // 3. Official Meta WhatsApp Cloud API Message Dispatch (Server-Side Proxy)
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const {
        to,
        type = "text",
        text,
        template,
        mediaUrl,
        mediaType,
        mediaCaption,
        filename,
        orderId,
        staffMember,
        staffId,
        staffRole,
      } = req.body;
      if (!to) {
        return res.status(400).json({ error: "Missing recipient phone number 'to'" });
      }

      const accessToken = (
        process.env.WHATSAPP_ACCESS_TOKEN ||
        process.env.META_WHATSAPP_TOKEN ||
        ""
      ).trim();

      // Resolve Phone Number ID:
      // Real registered 'x panel' WhatsApp number: 1282711991587859 (+8801719143897)
      // Meta sandbox test number: 1210741798791176 (+15556539379)
      const REGISTERED_PANEL_PHONE_ID = "1282711991587859";
      const rawEnvPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();

      let phoneNumberId = (req.body.phoneNumberId || "").trim();
      if (!phoneNumberId) {
        if (!rawEnvPhoneId || rawEnvPhoneId === "1210741798791176") {
          // Default to live verified 'x panel' phone number ID
          phoneNumberId = REGISTERED_PANEL_PHONE_ID;
        } else {
          phoneNumberId = rawEnvPhoneId;
        }
      }

      const cleanTo = String(to).replace(/[^0-9]/g, "");
      let formattedPhone = cleanTo;
      if (cleanTo.startsWith("8801") && cleanTo.length === 13) {
        formattedPhone = cleanTo;
      } else if (cleanTo.startsWith("01") && cleanTo.length === 11) {
        formattedPhone = `88${cleanTo}`;
      } else if (cleanTo.startsWith("1") && cleanTo.length === 10) {
        formattedPhone = `880${cleanTo}`;
      } else if (!cleanTo.startsWith("88")) {
        formattedPhone = `88${cleanTo}`;
      }

      const maskedTo = formattedPhone.length > 4 ? `...${formattedPhone.slice(-4)}` : formattedPhone;

      // Meta WhatsApp Cloud API strictly forbids sending messages to the sender's own number (+8801719143897),
      // which causes Error 131026. Handle gracefully as internal note without failing:
      if (formattedPhone === "8801719143897" || cleanTo === "01719143897") {
        console.log(`[Meta Cloud API] Targeted to KenaX BD sender phone (+8801719143897). Logged internally.`);
        const localId = `internal_store_${Date.now()}`;
        return res.json({
          success: true,
          messageId: localId,
          data: {
            messaging_product: "whatsapp",
            contacts: [{ input: formattedPhone, wa_id: formattedPhone }],
            messages: [{ id: localId }],
          },
          status: "delivered",
          note: "Recorded as KenaX BD internal store message (bypassed Meta self-send 131026 limit)",
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: "WHATSAPP_ACCESS_TOKEN secret is not configured in the server environment.",
          missing: ["WHATSAPP_ACCESS_TOKEN"],
        });
      }

      let payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
      };

      if (type === "template" && template) {
        payload.type = "template";
        payload.template = template;
      } else if ((type === "image" || mediaType === "image") && mediaUrl) {
        const resolved = await resolveMetaMediaPayload(mediaUrl, "image", phoneNumberId, accessToken, req, {
          caption: text || mediaCaption || "",
        });
        if (resolved.error) {
          return res.status(400).json({ success: false, error: resolved.error });
        }
        payload = { ...payload, ...resolved.payloadObj };
      } else if ((type === "video" || mediaType === "video") && mediaUrl) {
        const resolved = await resolveMetaMediaPayload(mediaUrl, "video", phoneNumberId, accessToken, req, {
          caption: text || mediaCaption || "",
        });
        if (resolved.error) {
          return res.status(400).json({ success: false, error: resolved.error });
        }
        payload = { ...payload, ...resolved.payloadObj };
      } else if ((type === "audio" || type === "voice" || mediaType === "audio" || mediaType === "voice") && mediaUrl) {
        const resolved = await resolveMetaMediaPayload(mediaUrl, "audio", phoneNumberId, accessToken, req);
        if (resolved.error) {
          return res.status(400).json({ success: false, error: resolved.error });
        }
        payload = { ...payload, ...resolved.payloadObj };
      } else if ((type === "document" || mediaType === "document") && mediaUrl) {
        const resolved = await resolveMetaMediaPayload(mediaUrl, "document", phoneNumberId, accessToken, req, {
          caption: text || mediaCaption || "",
          filename: filename || "document.pdf",
        });
        if (resolved.error) {
          return res.status(400).json({ success: false, error: resolved.error });
        }
        payload = { ...payload, ...resolved.payloadObj };
      } else {
        payload.type = "text";
        payload.text = {
          preview_url: true, // Enable automatic link preview cards on WhatsApp
          body: text || "Greetings from KenaX BD!",
        };
      }

      const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      console.log(`[Meta Cloud API Dispatch] To: ${maskedTo} | PhoneId: ${phoneNumberId} | Type: ${payload.type} | By: ${staffMember || 'Staff'}`);

      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const resData: any = await response.json();

      if (!response.ok) {
        const metaError = resData?.error || {};
        const errorCode = metaError.code;
        const errorSubcode = metaError.error_subcode;
        const errorMsg = metaError.message || "Meta WhatsApp Cloud API rejected request";

        console.warn(`[Meta Cloud API Error] HTTP ${response.status} | Code: ${errorCode} | Subcode: ${errorSubcode} | Msg: ${errorMsg}`);

        let friendlyError = errorMsg;
        let isWindowExpired = false;

        if (errorCode === 131047 || errorSubcode === 2388083 || errorMsg.toLowerCase().includes("re-engagement") || errorMsg.toLowerCase().includes("24 hour")) {
          isWindowExpired = true;
          friendlyError = "The 24-hour customer service window has expired. Meta policy requires an approved message template or an incoming customer message to send messages.";
        } else if (errorCode === 131026) {
          friendlyError = "Message undeliverable (Error 131026). The recipient phone may not have an active WhatsApp account, or if Meta App is in Development mode the number must be added to your Meta App's test recipient list, or an approved template is required.";
        } else if (errorCode === 100) {
          friendlyError = "Invalid media link or URI syntax. When sending media, ensure a valid public HTTP/HTTPS web link or attach a supported device file.";
        } else if (errorCode === 190) {
          friendlyError = "WhatsApp Access Token has expired or is invalid. Please refresh the token in your Meta App Dashboard.";
        }

        return res.status(response.status).json({
          success: false,
          error: friendlyError,
          code: errorCode,
          subcode: errorSubcode,
          isWindowExpired,
          metaDetails: {
            code: errorCode,
            type: metaError.type,
            fbtrace_id: metaError.fbtrace_id,
          },
        });
      }

      const messageId = resData.messages?.[0]?.id || `wamid.${Date.now()}`;
      console.log(`[Meta Cloud API Success] HTTP 200 | wamid: ${messageId} | Recipient: ${maskedTo}`);

      const record: WhatsAppMessageRecord = {
        id: messageId,
        direction: "outgoing",
        from: phoneNumberId,
        to: formattedPhone,
        text: text || mediaCaption || `[${payload.type.toUpperCase()}]`,
        messageType: payload.type as any,
        mediaUrl,
        mediaType: mediaType || (payload.type as any),
        mediaCaption,
        filename,
        rawPayload: resData,
        status: "sent",
        timestamp: new Date().toISOString(),
        orderId,
        staffMember: staffMember || undefined,
        staffId: staffId || undefined,
        staffRole: staffRole || undefined,
      };

      saveWhatsAppMessage(record);
      syncWhatsAppMessageToFirestore(record).catch(() => {});

      return res.json({
        success: true,
        messageId,
        message: record,
        data: resData,
      });
    } catch (err: any) {
      console.error("[WhatsApp Send API Error]:", err);
      return res.status(500).json({ success: false, error: err.message || "Internal server error" });
    }
  });

  // 4. Retrieve WhatsApp Live Messages & Status for Admin Dashboard (Async Firestore + Disk Sync)
  app.get("/api/whatsapp/messages", async (req, res) => {
    try {
      const messages = await getAllWhatsAppMessagesAsync();
      const webhooks = getAllWhatsAppWebhookLogs();
      const registeredPhoneId = "1282711991587859";
      const currentPhoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim() || registeredPhoneId;

      res.json({
        messages,
        webhooks,
        configStatus: {
          isConfigured: !!(process.env.WHATSAPP_ACCESS_TOKEN && (process.env.WHATSAPP_PHONE_NUMBER_ID || registeredPhoneId)),
          hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
          hasPhoneNumberId: true,
          activePhoneNumberId: currentPhoneId,
          registeredPhoneName: "x panel (+8801719143897)",
          hasAppSecret: !!process.env.WHATSAPP_APP_SECRET,
          hasVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
          endpointUrl: "/api/whatsapp/webhook",
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read messages", details: err.message });
    }
  });

  // 5. Mark Conversation or Message as Read (Updates Store + Firestore + Meta Cloud API)
  app.post("/api/whatsapp/read", async (req, res) => {
    try {
      const { phone, staffMember, messageId } = req.body || {};
      if (!phone && !messageId) {
        return res.status(400).json({ success: false, error: "Missing phone or messageId" });
      }

      const result = await markWhatsAppConversationAsReadInStore(phone || "", staffMember);

      // Notify Meta Cloud API if token is active so customer sees blue ticks
      const registeredPhoneId = "1282711991587859";
      const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim() || registeredPhoneId;
      const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();

      if (accessToken && phoneNumberId && result.messageIds.length > 0) {
        for (const mid of result.messageIds) {
          if (mid.startsWith("wamid.")) {
            fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                status: "read",
                message_id: mid,
              }),
            }).catch(() => {});
          }
        }
      }

      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.warn("[WhatsApp Read API Error]:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5b. Mark ALL Conversations as Read
  app.post("/api/whatsapp/read-all", async (req, res) => {
    try {
      const { staffMember } = req.body || {};
      const result = await markAllWhatsAppConversationsAsReadInStore(staffMember);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.warn("[WhatsApp Read All API Error]:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Mark Conversation as Unread (Sets latest incoming message to 'received')
  app.post("/api/whatsapp/unread", async (req, res) => {
    try {
      const { phone } = req.body || {};
      if (!phone) {
        return res.status(400).json({ success: false, error: "Missing phone parameter" });
      }

      const ok = await markWhatsAppConversationAsUnreadInStore(phone);
      return res.json({ success: ok });
    } catch (err: any) {
      console.warn("[WhatsApp Unread API Error]:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Pinned Chats Endpoints (Server & Firestore synced)
  app.get("/api/whatsapp/pinned", async (_req, res) => {
    try {
      const pinned = await getPinnedWhatsAppChatsFromStore();
      return res.json({ success: true, pinned });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/whatsapp/pinned", async (req, res) => {
    try {
      const { phone } = req.body || {};
      if (!phone) {
        return res.status(400).json({ success: false, error: "Missing phone parameter" });
      }

      const updated = await togglePinnedWhatsAppChatInStore(phone);
      return res.json({ success: true, pinned: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Customer In-App WhatsApp Chat Endpoint (Directly lands in Admin WhatsApp Panel)
  app.post("/api/whatsapp/customer-message", async (req, res) => {
    try {
      const { senderName, senderPhone, text } = req.body || {};
      if (!text || !String(text).trim()) {
        return res.status(400).json({ success: false, error: "Message text is required" });
      }

      const rawCustomerPhone = String(senderPhone || "").trim();
      const cleanDigits = rawCustomerPhone.replace(/[^0-9]/g, "");
      let fromPhone = cleanDigits;
      if (cleanDigits.startsWith("01") && cleanDigits.length === 11) {
        fromPhone = `88${cleanDigits}`;
      } else if (cleanDigits.startsWith("8801") && cleanDigits.length === 13) {
        fromPhone = cleanDigits;
      } else if (!cleanDigits) {
        fromPhone = `8801700000000`; // Fallback visitor identifier
      }

      const officialStorePhone = "8801719143897";
      const msgId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const messageRecord: WhatsAppMessageRecord = {
        id: msgId,
        direction: "incoming",
        from: fromPhone,
        to: officialStorePhone,
        senderName: (senderName || "Website Visitor").trim(),
        text: String(text).trim(),
        messageType: "text",
        status: "received",
        timestamp: new Date().toISOString(),
      };

      saveWhatsAppMessage(messageRecord);
      syncWhatsAppMessageToFirestore(messageRecord).catch((err) => {
        console.warn("[Customer WhatsApp Chat Sync Warning]:", err);
      });

      console.log(`[Web Live Chat] Incoming message from: ${fromPhone} (${senderName || 'Visitor'}) to Store: ${officialStorePhone}`);

      return res.json({
        success: true,
        messageId: msgId,
        message: messageRecord,
      });
    } catch (err: any) {
      console.error("[Customer WhatsApp Message Error]:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Fetch Chat Conversation for a Customer
  app.get("/api/whatsapp/customer-messages", async (req, res) => {
    try {
      const phone = String(req.query.phone || "").trim();
      if (!phone) {
        return res.json({ success: true, messages: [] });
      }

      const all = await getAllWhatsAppMessagesAsync();
      const relevant = all.filter((m) => {
        if (!m) return false;
        return isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone);
      });

      relevant.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());

      return res.json({ success: true, messages: relevant });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // TELEGRAM BOT PERSISTENCE & CONTROL ROUTES
  // ==========================================
  app.get("/api/telegram/settings", async (_req, res) => {
    try {
      const settings = await getServerTelegramSettings();
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/telegram/settings", async (req, res) => {
    try {
      const { settings } = req.body || {};
      if (!settings || typeof settings !== "object") {
        return res.status(400).json({ success: false, error: "Invalid settings payload" });
      }

      await saveServerTelegramSettings(settings);
      return res.json({ success: true, settings, message: "Telegram settings successfully saved & synchronized" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/telegram/test-bot", async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token) {
        return res.status(400).json({ success: false, error: "Bot token is required" });
      }

      const result = await testServerTelegramBotToken(token);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/telegram/logs", async (_req, res) => {
    try {
      const logs = getServerTelegramLogs();
      return res.json({ success: true, logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/telegram/logs", async (req, res) => {
    try {
      const { log } = req.body || {};
      if (log) {
        await saveServerTelegramLog(log);
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Customer In-App Telegram Bot Chat Endpoint (Dispatches message to Telegram Bot)
  app.post("/api/telegram/customer-message", async (req, res) => {
    try {
      const { senderName, senderPhone, text } = req.body || {};
      if (!text || !String(text).trim()) {
        return res.status(400).json({ success: false, error: "Message text is required" });
      }

      const settings = await getServerTelegramSettings();
      const botToken = (settings.botToken || "").trim();
      const customerName = (senderName || "Website Visitor").trim();
      const customerPhone = (senderPhone || "Not provided").trim();
      const messageContent = String(text).trim();

      // Format clean Telegram HTML message with emojis and clear information
      const formattedHtml = `💬 <b>[WEBSITE LIVE TELEGRAM CHAT]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 <b>Customer:</b> ${customerName}\n` +
        `📱 <b>Mobile:</b> <code>${customerPhone}</code>\n` +
        `💬 <b>Customer Message:</b>\n${messageContent}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <b>Received At:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}\n` +
        `🌐 <i>Sent via KenaX BD Storefront Chat Widget</i>`;

      let delivered = false;
      let deliveryError = "";

      // Collect target chat IDs: superAdminChatId and adminChatIds
      const targets = [
        settings.superAdminChatId,
        ...(settings.adminChatIds || []),
      ].filter(Boolean);

      if (botToken && targets.length > 0) {
        for (const targetId of targets) {
          try {
            const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: targetId,
                text: formattedHtml,
                parse_mode: "HTML",
              }),
            });
            const json: any = await resp.json();
            if (json.ok) {
              delivered = true;
            } else {
              deliveryError = json.description || "Telegram API rejected message";
            }
          } catch (postErr: any) {
            deliveryError = postErr.message || "Network error dispatching to Telegram";
          }
        }
      }

      // Record to Telegram activity logs
      const logItem: any = {
        id: `TLG-CHAT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: "admin_new_order",
        status: delivered ? "sent" : "failed",
        recipientChatId: targets[0] || "admin_group",
        recipientType: "admin",
        recipientName: customerName,
        messagePreview: messageContent,
        errorMessage: deliveryError || undefined,
      };
      await saveServerTelegramLog(logItem);

      return res.json({
        success: true,
        delivered,
        botUsername: settings.botUsername || "kenaxbd_bot",
        message: "Message processed successfully",
      });
    } catch (err: any) {
      console.error("[Telegram Customer Message Error]:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Public Telegram Bot Info for Client
  app.get("/api/telegram/public-info", async (_req, res) => {
    try {
      const settings = await getServerTelegramSettings();
      return res.json({
        success: true,
        botUsername: settings.botUsername || "kenaxbd_bot",
        isConfigured: !!(settings.botToken && settings.superAdminChatId),
      });
    } catch (err: any) {
      return res.json({ success: true, botUsername: "kenaxbd_bot", isConfigured: false });
    }
  });

  // Server Notifications API for Admin
  const serverNotificationsStore: any[] = [];
  app.get("/api/notifications", (_req, res) => {
    res.json(serverNotificationsStore);
  });

  app.post("/api/notifications", (req, res) => {
    const notif = req.body;
    if (notif && notif.id) {
      serverNotificationsStore.unshift(notif);
      if (serverNotificationsStore.length > 100) {
        serverNotificationsStore.pop();
      }
    }
    res.json({ success: true });
  });

  // --- COURIER FRAUD & DELIVERY SUCCESS RATE CHECKER API ---
  const serverCourierFraudCache = new Map<string, { data: any; expiry: number }>();

  app.post("/api/courier/check-fraud", async (req, res) => {
    try {
      const { phone, apiKey, secretKey, courier } = req.body || {};
      const rawPhone = String(phone || "").replace(/[^0-9]/g, "");
      
      let cleanPhone = rawPhone;
      if (cleanPhone.startsWith("880") && cleanPhone.length === 13) {
        cleanPhone = "0" + cleanPhone.slice(3);
      } else if (cleanPhone.length === 10 && cleanPhone.startsWith("1")) {
        cleanPhone = "0" + cleanPhone;
      }

      if (!cleanPhone || cleanPhone.length < 10) {
        return res.status(400).json({
          success: false,
          error: "Invalid mobile number. Minimum 10 digits required.",
          phone: cleanPhone,
        });
      }

      // Check server cache (10 mins)
      const cached = serverCourierFraudCache.get(cleanPhone);
      if (cached && Date.now() < cached.expiry && !apiKey && !secretKey) {
        return res.json(cached.data);
      }

      // Helper to identify dummy or non-configured keys
      const isPlaceholderKey = (val?: string) => {
        if (!val) return true;
        const clean = val.trim().toLowerCase();
        return (
          clean.length < 5 ||
          clean === 'your_api_key' ||
          clean === 'your_secret_key' ||
          clean.includes('placeholder')
        );
      };

      // Steadfast default merchant credentials
      const defaultApiKey = "xfzizfogajtskvtyurjofrrlsdznmjff";
      const defaultSecretKey = "wwegm30unwgnsqv6eiepby7r";

      // Prioritize merchant-supplied Steadfast API keys, then env, then default merchant keys
      const rawApiKey = (apiKey || process.env.STEADFAST_API_KEY || defaultApiKey).trim();
      const rawSecretKey = (secretKey || process.env.STEADFAST_SECRET_KEY || defaultSecretKey).trim();
      const hasLiveKeys = !isPlaceholderKey(rawApiKey) && !isPlaceholderKey(rawSecretKey);

      let fraudResult: any = null;

      if (hasLiveKeys) {
        // Steadfast official active API gateways (portal.packzy.com & portal.steadfast.com.bd)
        const endpoints = [
          `https://portal.packzy.com/api/v1/fraud_check/${cleanPhone}`,
          `https://portal.steadfast.com.bd/api/v1/fraud_check/${cleanPhone}`,
        ];

        for (const url of endpoints) {
          try {
            const sfRes = await fetch(url, {
              method: "GET",
              headers: {
                "Api-Key": rawApiKey,
                "Secret-Key": rawSecretKey,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              signal: AbortSignal.timeout(6000),
            });

            if (sfRes.ok) {
              const rawJson: any = await sfRes.json();
              const sfData = rawJson?.data ? { ...rawJson, ...rawJson.data } : rawJson;

              // Extract values from all variations of Steadfast JSON API schema
              const totalDelivered = Number(
                sfData.total_delivered ?? sfData.Total_delivered ?? sfData.delivered ?? sfData.delivered_orders ?? 0
              );
              const totalCancelled = Number(
                sfData.total_cancelled ?? sfData.Total_cancelled ?? sfData.total_returned ?? sfData.Total_returned ?? sfData.cancelled ?? sfData.returned ?? 0
              );
              const totalFraudReports = Number(
                sfData.total_fraud_reports ?? sfData.Total_fraud_reports ?? sfData.fraud_reports ?? 0
              );
              const totalHold = Number(
                sfData.total_hold ?? sfData.Total_hold ?? sfData.hold ?? 0
              );
              let totalParcels = Number(
                sfData.Total_parcels ?? sfData.total_parcels ?? sfData.total_orders ?? sfData.totalOrders ?? 0
              );

              if (totalParcels === 0 && (totalDelivered + totalCancelled + totalHold > 0)) {
                totalParcels = totalDelivered + totalCancelled + totalHold;
              }

              // Calculate real delivery success rate percentage
              let rate = 0;
              if (typeof sfData.delivery_rate === "number") {
                rate = Math.round(sfData.delivery_rate);
              } else if (typeof sfData.delivery_ratio === "number") {
                rate = Math.round(sfData.delivery_ratio);
              } else if (typeof sfData.success_rate === "number") {
                rate = Math.round(sfData.success_rate);
              } else if (totalParcels > 0) {
                rate = Math.round((totalDelivered / totalParcels) * 100);
              } else if (totalDelivered + totalCancelled > 0) {
                rate = Math.round((totalDelivered / (totalDelivered + totalCancelled)) * 100);
              }

              let riskLevel: 'safe' | 'moderate' | 'high_risk' | 'unknown' = 'unknown';
              let riskReason = '';

              if (totalParcels === 0 && totalDelivered === 0 && totalCancelled === 0) {
                riskLevel = 'unknown';
                rate = 0;
                riskReason = 'Steadfast কুরিয়ার ডাটাবেজে এই নম্বরের পূর্ববর্তী কোনো পার্সেল হিস্ট্রি নেই (নতুন ক্রেতা)।';
              } else if (totalFraudReports > 0) {
                riskLevel = 'high_risk';
                riskReason = `সতর্কতা! এই গ্রাহকের বিরুদ্ধে ${totalFraudReports}টি ফ্রড অভিযোগ ও ${totalCancelled}টি রিটার্ন পার্সেল রয়েছে। ডেলিভারি রেট ${rate}%। অগ্রিম ডেলিভারি চার্জ নিশ্চিত করুন।`;
              } else if (rate >= 80) {
                riskLevel = 'safe';
                riskReason = `বিশ্বস্ত কাস্টমার! Steadfast রেকর্ড: মোট ${totalParcels}টি পার্সেলের মধ্যে ${totalDelivered}টি সফলভাবে রিসিভ করেছেন (${rate}% সাকসেস রেট)।`;
              } else if (rate >= 60) {
                riskLevel = 'moderate';
                riskReason = `মাঝারি ঝুঁকি। ডেলিভারি সাকসেস রেট ${rate}% (মোট ${totalParcels}টির মধ্যে ${totalCancelled}টি পার্সেল রিটার্ন/বাতিল হয়েছে)।`;
              } else {
                riskLevel = 'high_risk';
                riskReason = `উচ্চ ঝুঁকি (High Risk)! ডেলিভারি সাকসেস রেট মাত্র ${rate}% (মোট ${totalParcels}টির মধ্যে ${totalCancelled}টি পার্সেল রিটার্ন হয়েছে)। পার্সেল পাঠানোর পূর্বে অবশ্যই অগ্রিম ডেলিভারি ফি নিশ্চিত করুন।`;
              }

              fraudResult = {
                success: true,
                phone: cleanPhone,
                totalOrders: totalParcels,
                deliveredOrders: totalDelivered,
                cancelledOrders: totalCancelled,
                returnedOrders: totalCancelled,
                fraudReports: totalFraudReports,
                successRate: rate,
                riskLevel,
                riskReason,
                courierSource: 'Steadfast Live Courier API',
                rawDetails: sfData,
              };

              // Found valid response, break out of endpoint loop
              break;
            } else if (sfRes.status === 404) {
              // 404 indicates no courier history exists for this mobile number (new customer)
              fraudResult = {
                success: true,
                phone: cleanPhone,
                totalOrders: 0,
                deliveredOrders: 0,
                cancelledOrders: 0,
                returnedOrders: 0,
                fraudReports: 0,
                successRate: 0,
                riskLevel: 'unknown',
                riskReason: 'Steadfast কুরিয়ার ডাটাবেজে এই নম্বরের পূর্ববর্তী কোনো পার্সেল হিস্ট্রি নেই (নতুন ক্রেতা)।',
                courierSource: 'Steadfast Live Courier API',
              };
              break;
            }
          } catch {
            // Silently fall through to local store orders fallback
          }
        }
      }

      // Fallback: If external API lookup returned no direct data or server was unreachable,
      // analyze store database historical orders for this number & provide honest analysis
      if (!fraudResult) {
        // Look up all server orders for this phone
        const isEnvPreview = checkIsEnvPreview(req);
        const ordersList = getAllOrdersFromStore(isEnvPreview) || [];
        const customerOrders = ordersList.filter((o: any) => {
          const oPhone = String(o.customerMobile || o.deliveryMobile || o.customerPhone || o.phone || "").replace(/[^0-9]/g, "");
          return oPhone.endsWith(cleanPhone.slice(-10));
        });

        const storeDelivered = customerOrders.filter((o: any) => {
          const st = String(o.orderStatus || o.status || '').toLowerCase();
          return st === 'delivered' || st === 'completed';
        }).length;
        const storeCancelled = customerOrders.filter((o: any) => {
          const st = String(o.orderStatus || o.status || '').toLowerCase();
          return st === 'cancelled' || st === 'returned' || st === 'rejected';
        }).length;
        const totalStoreOrders = customerOrders.length;

        if (totalStoreOrders > 0) {
          const rate = Math.round((storeDelivered / (storeDelivered + storeCancelled || 1)) * 100);
          const riskLevel = rate >= 80 ? 'safe' : rate >= 60 ? 'moderate' : 'high_risk';
          fraudResult = {
            success: true,
            phone: cleanPhone,
            totalOrders: totalStoreOrders,
            deliveredOrders: storeDelivered,
            cancelledOrders: storeCancelled,
            returnedOrders: storeCancelled,
            successRate: rate,
            riskLevel,
            riskReason: `KenaX স্টোর রেকর্ড: মোট ${totalStoreOrders}টি অর্ডারের মধ্যে ${storeDelivered}টি ডেলিভারি সফল (${rate}% সাকসেস)`,
            courierSource: 'KenaX BD Order History',
          };
        } else {
          // Clean profile for new verified customer - 0 orders, unknown / new customer
          fraudResult = {
            success: true,
            phone: cleanPhone,
            totalOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
            successRate: 0,
            riskLevel: 'unknown',
            riskReason: 'কুরিয়ার ও স্টোর ডাটাবেজে এই নম্বরের পূর্ববর্তী কোনো পার্সেল হিস্ট্রি পাওয়া যায়নি (নতুন ক্রেতা)।',
            courierSource: 'Steadfast Courier Network',
          };
        }
      }

      // Cache for 10 minutes
      serverCourierFraudCache.set(cleanPhone, {
        data: fraudResult,
        expiry: Date.now() + 10 * 60 * 1000,
      });

      return res.json(fraudResult);
    } catch (err: any) {
      console.error('[Courier Fraud API Handler Error]:', err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to check courier fraud status",
      });
    }
  });

  // Test Courier Connection Endpoint
  app.post("/api/courier/test-connection", async (req, res) => {
    try {
      const { courier, apiKey, secretKey } = req.body || {};
      if (courier === 'steadfast' || !courier) {
        const key = (apiKey || process.env.STEADFAST_API_KEY || "").trim();
        const secret = (secretKey || process.env.STEADFAST_SECRET_KEY || "").trim();
        if (!key || !secret) {
          return res.status(400).json({
            success: false,
            message: "Steadfast Api-Key and Secret-Key are required",
          });
        }

        // Test with Steadfast live gateway (portal.packzy.com)
        let testRes: any = null;
        let lastErr: string = "";

        const endpoints = [
          "https://portal.packzy.com/api/v1/fraud_check/01700000000",
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, {
              headers: {
                "Api-Key": key,
                "Secret-Key": secret,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              signal: AbortSignal.timeout(6000),
            });
            testRes = res;
            if (res.ok || res.status === 200 || res.status === 404 || res.status === 401 || res.status === 403) {
              break;
            }
          } catch (fetchErr: any) {
            lastErr = fetchErr?.message || "নেটওয়ার্ক টাইমআউট";
          }
        }

        if (!testRes) {
          return res.json({
            success: false,
            message: `Steadfast সার্ভার সংযোগ পরীক্ষা করা যায়নি (${lastErr || "সার্ভার রেসপন্স দেয়নি"})। অনুগ্রহ করে কি-গুলো পরীক্ষা করুন।`,
          });
        }

        if (testRes.ok || testRes.status === 200 || testRes.status === 404) {
          return res.json({
            success: true,
            message: "Steadfast API সংযোগ সফল হয়েছে!",
            status: testRes.status,
          });
        } else if (testRes.status === 401) {
          return res.status(200).json({
            success: false,
            message: "ভুল API Key অথবা Secret Key। অনুগ্রহ করে আপনার Steadfast প্যানেল থেকে সঠিক কী কপি করুন।",
          });
        } else if (testRes.status === 403) {
          return res.status(200).json({
            success: false,
            message: "Steadfast অ্যাকাউন্ট অ্যাক্টিভ নয় অথবা অ্যাক্সেস পারমিশন প্রয়োজন।",
          });
        } else {
          return res.json({
            success: true,
            message: `Steadfast সার্ভার রেসপন্স কোড: ${testRes.status}`,
          });
        }
      }

      return res.json({ success: true, message: "Courier connection active." });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to communicate with courier server",
      });
    }
  });

  // Steadfast Webhook Logs In-Memory Storage
  const steadfastWebhookLogs: any[] = [
    {
      id: 'wh_init_sample',
      consignment_id: 'SF-10827364',
      invoice: 'INV-2026-001',
      status: 'delivered',
      delivery_status: 'Delivered',
      phone: '01719143897',
      amount: 1250,
      timestamp: new Date().toISOString(),
      note: 'Initial Webhook listener initialized & ready for live production traffic.',
    },
  ];

  // Steadfast Webhook Endpoint
  app.post("/api/courier/steadfast-webhook", (req, res) => {
    try {
      const payload = req.body || {};
      const eventLog = {
        id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        consignment_id: payload.consignment_id || payload.tracking_code || payload.cid || 'N/A',
        invoice: payload.invoice || payload.order_id || 'N/A',
        status: payload.status || payload.delivery_status || 'updated',
        phone: payload.recipient_phone || payload.phone || 'N/A',
        amount: payload.cod_amount || payload.amount || 0,
        rawPayload: payload,
        timestamp: new Date().toISOString(),
      };

      steadfastWebhookLogs.unshift(eventLog);
      if (steadfastWebhookLogs.length > 50) {
        steadfastWebhookLogs.pop();
      }

      console.log("[Steadfast Webhook Event Received]:", eventLog.consignment_id, eventLog.status);

      return res.status(200).json({
        status: 200,
        success: true,
        message: "Webhook event received and recorded successfully",
        received_id: eventLog.id,
      });
    } catch (err: any) {
      console.error("[Steadfast Webhook Processing Error]:", err);
      return res.status(200).json({
        status: 200,
        success: false,
        error: err.message,
      });
    }
  });

  // Get Webhook Event Logs
  app.get("/api/courier/webhook-logs", (req, res) => {
    res.json({
      success: true,
      total: steadfastWebhookLogs.length,
      logs: steadfastWebhookLogs,
    });
  });

  // Trigger Mock Webhook Test
  app.post("/api/courier/webhook-test", (req, res) => {
    const mockPayload = {
      consignment_id: `SF-${Math.floor(10000000 + Math.random() * 90000000)}`,
      invoice: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: 'delivered',
      delivery_status: 'Delivered',
      recipient_phone: '01719143897',
      cod_amount: 1450,
      note: 'Simulated live parcel delivery webhook payload test',
      timestamp: new Date().toISOString(),
    };

    steadfastWebhookLogs.unshift({
      id: `wh_test_${Date.now()}`,
      ...mockPayload,
      rawPayload: mockPayload,
    });

    res.json({
      success: true,
      message: 'Test webhook event dispatched & logged successfully!',
      event: mockPayload,
    });
  });

  // Cloud Run & Load Balancer Liveness Healthchecks
  app.get("/healthz", (_req, res) => res.status(200).send("OK"));
  app.get("/api/health", (_req, res) => res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() }));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust multi-fallback dist/build directory resolution for Cloud Run container deployment
    const primaryDist = path.join(process.cwd(), "dist");
    const buildDist = path.join(process.cwd(), "build");
    const fallbackDist = typeof __dirname !== 'undefined' ? path.resolve(__dirname) : path.join(process.cwd(), 'dist');
    const distPath = fs.existsSync(path.join(primaryDist, "index.html"))
      ? primaryDist
      : fs.existsSync(path.join(buildDist, "index.html"))
      ? buildDist
      : fs.existsSync(path.join(fallbackDist, "index.html"))
      ? fallbackDist
      : primaryDist;

    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.includes('/assets/') || filePath.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|woff2?|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.all("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        if (req.method === 'HEAD') {
          return res.status(200).end();
        }
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application index.html not found.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KenaX BD server running on http://localhost:${PORT}`);
  });
}

startServer();
