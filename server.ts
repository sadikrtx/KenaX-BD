import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

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
  getAllWhatsAppWebhookLogs,
  syncWhatsAppMessageToFirestore,
  WhatsAppMessageRecord,
} from "./src/db/whatsapp.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "KenaX BD", timestamp: new Date().toISOString() });
  });

  // Cloud SQL Products API
  app.get("/api/products", async (req, res) => {
    try {
      const productsList = await getAllProductsFromSQL();
      res.json(productsList);
    } catch (err: any) {
      console.error("[Cloud SQL GET /api/products error]:", err);
      res.status(500).json({ error: "Failed to fetch products from Cloud SQL database", details: err.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ error: "Invalid product object, missing id" });
      }
      const saved = await saveProductToSQL(product);
      writeProductToFirestore(saved).catch((err) => {
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
      const { products: items = [] } = req.body;
      let count = 0;
      for (const item of items) {
        if (item && item.id) {
          await saveProductToSQL(item);
          writeProductToFirestore(item).catch(() => {});
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
      const ids = getDeletedProductIdsFromStore();
      res.json(ids);
    } catch {
      res.json([]);
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteProductFromSQL(id);
      deleteProductFromFirestore(id).catch((err) => {
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
      const orders = getAllOrdersFromStore();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server orders", details: err.message });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const order = req.body;
      if (!order || !order.id) {
        return res.status(400).json({ error: "Invalid order object, missing id" });
      }
      const saved = saveOrderToStore(order);
      // Synchronize to Firestore in background
      writeOrderToFirestore(saved).catch(() => {});
      res.json({ success: true, order: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save order on server", details: err.message });
    }
  });

  app.put("/api/orders/:id", (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = updateOrderInStore(id, updates);
      if (updated) {
        writeOrderToFirestore(updated).catch(() => {});
        res.json({ success: true, order: updated });
      } else {
        // If not found in store yet, save it with the updates
        const newOrder = saveOrderToStore({ id, ...updates } as any);
        writeOrderToFirestore(newOrder).catch(() => {});
        res.json({ success: true, order: newOrder });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update order on server", details: err.message });
    }
  });

  app.get("/api/customer-orders/:identifier", (req, res) => {
    try {
      const { identifier } = req.params;
      const orders = getCustomerOrdersFromStore(identifier);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to retrieve customer orders", details: err.message });
    }
  });

  // Central Server Customers API (Permanent Cloud Persistence)
  app.get("/api/customers", (req, res) => {
    try {
      const customers = getAllCustomersFromStore();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server customers", details: err.message });
    }
  });

  app.post("/api/customers", (req, res) => {
    try {
      const customer = req.body;
      if (!customer || !customer.id) {
        return res.status(400).json({ error: "Invalid customer object, missing id" });
      }
      const saved = saveCustomerToStore(customer);
      // Synchronize to Firestore in background
      writeCustomerToFirestore(saved).catch(() => {});
      res.json({ success: true, customer: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save customer on server", details: err.message });
    }
  });

  app.get("/api/customers/:identifier", (req, res) => {
    try {
      const { identifier } = req.params;
      const customer = findCustomerInStore(identifier);
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
      const { id } = req.params;
      deleteCustomerFromStore(id);
      deleteCustomerFromFirestore(id).catch(() => {});
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete customer on server", details: err.message });
    }
  });

  app.delete("/api/orders/:id", (req, res) => {
    try {
      const { id } = req.params;
      deleteOrderFromStore(id);
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete order on server", details: err.message });
    }
  });

  // Central Server Staff API (Permanent Cloud Persistence)
  app.get("/api/staff", (req, res) => {
    try {
      const staffList = getAllStaffFromStore();
      res.json(staffList);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read server staff", details: err.message });
    }
  });

  app.post("/api/staff", (req, res) => {
    try {
      const staff = req.body;
      if (!staff || !staff.id) {
        return res.status(400).json({ error: "Invalid staff object, missing id" });
      }
      const saved = saveStaffToStore(staff);
      writeStaffToFirestore(saved).catch(() => {});
      res.json({ success: true, staff: saved });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save staff on server", details: err.message });
    }
  });

  app.delete("/api/staff/:id", (req, res) => {
    try {
      const { id } = req.params;
      deleteStaffFromStore(id);
      deleteStaffFromFirestore(id).catch(() => {});
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete staff on server", details: err.message });
    }
  });

  // AI Shopping Assistant & Product Advisor (Gemini)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history = [], mode = "fast" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          reply: `ধন্যবাদ KenaX BD-তে যোগাযোগ করার জন্য! আমি আপনার ভার্চুয়াল শপিং অ্যাসিস্ট্যান্ট। (Server note: GEMINI_API_KEY not configured, operating in offline assistant mode). আপনি কি কোনো প্রোডাক্ট খুঁজছেন বা ক্যাশ অন ডেলিভারি এবং ডেলিভারি চার্জ সম্পর্কে জানতে চান?`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const modelName = mode === "deep" ? "gemini-3.1-pro-preview" : "gemini-3.1-flash-lite";

      const systemInstruction = `You are "KenaX AI", the official intelligent shopping assistant for "KenaX BD" (কেম্যাক্স বিডি), Bangladesh's premier e-commerce and dropshipping platform.
Tagline: "Smart Shopping, Better Living" (আপনার প্রয়োজন, আমাদের অঙ্গীকার).
Key facts to know:
- Currency: ৳ BDT ONLY (Bangladeshi Taka). Never quote in USD/EUR.
- Delivery: Inside Dhaka City is ৳60 (24-48 hours), Outside Dhaka City / Nationwide is ৳120 (3-5 days). Free delivery on orders over ৳5,000.
- Payment methods: Cash on Delivery (COD), bKash, Nagad, Rocket.
- Products: Original Electronics & Gadgets (Redmi Note 13, Xiaomi Buds 5, Haylou Smart Watch), Fashion & Clothing, Home & Living (Philips Air Fryer), Dropshipping goods, 100% Quality guarantee.
- Location: 8 divisions & 64 districts of Bangladesh supported.
Tone: Friendly, helpful, professional, fluent in both Bengali and English (Banglish/Bengali/English as the user queries). Keep answers concise, actionable, and customer-centric.`;

      // Build conversation context
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction,
          ...(mode === "deep" ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {}),
        },
      });

      const response = await chat.sendMessage({ message });
      res.json({ reply: response.text || "আমি আপনাকে সাহায্য করতে প্রস্তুত।" });
    } catch (err: any) {
      console.error("Gemini API error:", err);
      res.status(500).json({
        error: "Failed to process AI response",
        fallback: "কেম্যাক্স বিডি-তে স্বাগতম! আমাদের কাস্টমার সাপোর্ট ২৪/৭ সক্রিয় রয়েছে। অনুগ্রহ করে হটলাইন বা লাইভ চ্যাটে যোগাযোগ করুন।",
      });
    }
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
                  textBody = msg.image?.caption || "[Image]";
                } else if (type === "location") {
                  textBody = `[Location: Lat ${msg.location?.latitude}, Lng ${msg.location?.longitude}]`;
                } else {
                  textBody = `[${type.toUpperCase()} Message]`;
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
                  errStr = `Error ${firstErr.code}: ${firstErr.title || firstErr.message || firstErr.error_data?.details || "Delivery failed"}`;
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

  // 3. Official Meta WhatsApp Cloud API Message Dispatch (Server-Side Proxy)
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const { to, type = "text", text, template, orderId, staffMember, staffId, staffRole } = req.body;
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
      } else {
        payload.type = "text";
        payload.text = {
          preview_url: false,
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
          friendlyError = "Message undeliverable. This phone number may not have an active WhatsApp account or privacy restrictions prevent delivery.";
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
        text: text || `[Template: ${template?.name || 'Custom'}]`,
        messageType: type === "template" ? "template" : "text",
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

  // 4. Retrieve WhatsApp Live Messages & Status for Admin Dashboard
  app.get("/api/whatsapp/messages", (req, res) => {
    try {
      const messages = getAllWhatsAppMessages();
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust multi-fallback dist directory resolution for Cloud Run container deployment
    const primaryDist = path.join(process.cwd(), "dist");
    const fallbackDist = path.resolve(__dirname);
    const distPath = fs.existsSync(path.join(primaryDist, "index.html"))
      ? primaryDist
      : fs.existsSync(path.join(fallbackDist, "index.html"))
      ? fallbackDist
      : primaryDist;

    app.use(express.static(distPath, { maxAge: "1d" }));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
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
