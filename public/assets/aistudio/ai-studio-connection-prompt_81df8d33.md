# KenaX BD — Muse Connection: AI Studio Prompt
Prepared for Sadik, 2026-11-20. Based on Muse's read-only inspection of the live preview on 2026-11-20 (storefront + /admin, signed in by Sadik himself).

## How to use
1. Open the KenaX BD project in Google AI Studio.
2. Paste **PROMPT 1** first, let it finish building, and check the test steps at the end of it.
3. Then paste **PROMPT 2**, then **PROMPT 3**. One at a time — do not paste all three together.
4. After all three: deploy the app, then bring Muse the deployed link and the Integration API Key from Admin > Settings > Integration (see Prompt 1). Give the key to Muse only through the secure entry Muse provides — never in plain chat.

What this achieves: Muse can then (a) alert Sadik on WhatsApp for every new order, (b) confirm an order when Sadik instructs it, (c) alert him about moderator/staff order activity, (d) send low-stock alerts, and (e) send best-selling / sales summary reports — all reading and writing through these new integration endpoints, protected by the API key and the existing RBAC roles.

---

## PROMPT 1 — Integration API + API key (paste this first)

```
You are working on my existing e-commerce app "KenaX BD". Do NOT redesign anything. Keep the existing UI, branding, colours, Bengali + English labels, navigation, and all existing features exactly as they are. First inspect the project structure and use the app's EXISTING backend and data store (whatever this project already uses for orders, products, customers and staff). Do not migrate the database and do not break any existing screen.

Add a secure Integration API so an external assistant can work with my store:

1) API KEY
- Add an "Integration" section inside Admin > Settings, visible ONLY to Super Admin.
- It shows one Integration API Key for this store: a "Generate / Regenerate" button, a masked display, and a copy button. Regenerating must immediately invalidate the old key.
- Store the key hashed or in server-side environment/secret storage — never in frontend code, never visible to Manager or any other role, and never printed in any API response except in that Settings screen for Super Admin.
- Every integration endpoint below must require the header  X-API-Key: <key>  and return HTTP 401 with a simple JSON error when the key is missing or wrong.

2) READ ENDPOINTS (all return JSON, all support a `since` query parameter in ISO date-time so the caller can fetch only what changed after that time, and all return a server `now` timestamp in the response):
- GET /api/integration/health — returns { ok: true, store: "KenaX BD", now }.
- GET /api/integration/orders — each order must include: orderId (e.g. KB-ORD-...), createdAt, status (pending / confirmed / processing / ready_to_ship / in_transit / delivered / cancelled / returned / etc. — use the app's real status values), customer { name, phone, email, address, zone }, items [ { productName, sku, quantity, unitPrice } ], subtotal, deliveryCharge, total, paymentMethod, salesChannel (e.g. Facebook Messenger, Facebook Ads, Website, WhatsApp), courier, and updatedAt.
- GET /api/integration/products — each product: productId, name, sku, category, price, salePrice, stock (real available stock), totalSold.
- GET /api/integration/inventory — each SKU: available, reserved, stockValue, lowStock flag. Low stock means available <= 5 (make this threshold editable in the Integration settings, default 5).
- GET /api/integration/activity — the staff activity events described in step 4 below: who (staff name, email, role), action, orderId or productId affected, fromStatus, toStatus, details, timestamp.
- GET /api/integration/sales-summary — totals computed from the SAME single source of truth as the Overview and Report & Analytics screens: totalOrders, grossSales, netProductSales, deliveryCollected, averageOrderValue, ordersByStatus, salesByPaymentMethod, salesByChannel, and topSellers [ { productName, sku, unitsSold, revenue } ] sorted by units sold, top 10.

3) WRITE ENDPOINT (this is the only write the API allows):
- POST /api/integration/orders/{orderId}/status  with JSON body { "status": "confirmed", "note": "Confirmed via Muse on owner's instruction" }.
- It must accept only valid next statuses according to the app's existing order workflow, change the status exactly the way the admin panel does (including reserved stock and fulfilment updates), record the change in the Activity Log as actor "Muse (on owner's instruction)", and return the updated order in the same shape as the orders endpoint.
- It must NOT allow deleting orders, editing prices, editing customers, or anything else. Any other write attempt returns HTTP 403.

4) KEEP IT SAFE AND COMPATIBLE
- The existing storefront, checkout, and the Staff Portal login (RBAC) must keep working exactly as before.
- Do not expose the integration endpoints in any public page or menu.
- If this project has no server layer and is frontend-only, create the endpoints using the project's existing backend mechanism (for example Firebase/Firestore + Cloud Functions or the app's existing server file) — choose whatever matches the current project, and tell me in your summary which mechanism you used and where the key is stored.

TEST BEFORE YOU FINISH (do these and report the results in your summary):
- Calling GET /api/integration/health without the key returns 401; with the key returns ok:true.
- GET /api/integration/orders returns the store's real current orders with customer phone, total and status filled in — no empty or fake sample orders.
- POST a status change on one test order from pending to confirmed, confirm the order's status actually changed in the Admin Orders screen, then change it back.
- Confirm the Integration section is invisible when logged in as Manager.
```

---

## PROMPT 2 — Real staff activity logging (paste after Prompt 1 works)

```
You are working on my existing e-commerce app "KenaX BD". Do NOT redesign anything and do not change the Integration API from the previous step.

Right now the Activity Logs page only shows a few old sample events (from February 2025, about phones that are not even in my catalogue). Fix this properly:

1) REAL LOGGING — From now on, automatically write an Activity Log event for every real action in the admin panel, including:
- Order status changes (record fromStatus and toStatus, e.g. pending -> confirmed, confirmed -> processing)
- Order created, order note added, courier assigned or changed
- Product created / edited, price changed, stock changed (record old and new values)
- Staff added, role changed, staff suspended/removed
- Coupon created / changed, return/refund processed
Each event must store: timestamp (real current time), staff name, staff email, staff role, action type, the orderId / productId / staffId affected, a short human-readable details line in the same Bengali + English style as the rest of the admin, and IP address if already available.

2) REMOVE THE SAMPLE DATA — Delete the old fake February 2025 sample events (Redmi Note 13 Pro, iPhone 15 Pro Max, Samsung Galaxy S24 Ultra) from the Activity Logs so the page shows only real events. Do not delete any real order, product, customer or staff data.

3) ORDERS MUST SHOW WHO TOUCHED THEM — In the order detail view, add a small "Activity" timeline for that order listing its real events (who changed its status, when, from what to what), using the same log data. Also make sure order status changes made through the Integration API appear here with actor "Muse (on owner's instruction)".

4) Keep the existing Activity Logs filters (action type, user role, search) working with the real data, newest first.

TEST BEFORE YOU FINISH:
- As Super Admin, change one real order's status, then open Activity Logs and confirm the event appears immediately with your name, the order number, and from -> to status.
- Open that order's detail and confirm the same event appears in its Activity timeline.
- Confirm no February 2025 sample events remain.
```

---

## PROMPT 3 — One source of truth for numbers + real stock (paste after Prompt 2 works)

```
You are working on my existing e-commerce app "KenaX BD". Do NOT redesign anything and do not change the Integration API or the Activity Logs.

Two data-quality fixes:

1) ONE SOURCE OF TRUTH FOR MONEY AND COUNTS
The Overview screen and the Report & Analytics screen currently show different totals for the same store (for example gross sales and cash-on-delivery counts do not match between the two screens). Refactor so BOTH screens — and the Integration sales-summary endpoint — calculate every figure from one shared function/service over the same orders data, with these definitions used everywhere:
- grossSales = sum of order totals for all non-cancelled, non-spam orders
- netProductSales = sum of item subtotals (without delivery charges) for those orders
- pendingCOD = sum of totals of delivered-or-not-yet-paid COD orders not yet marked paid — define it once and use it everywhere (adjust this wording to the app's existing payment fields, but keep ONE definition)
- ordersByStatus counts must equal the counts shown in the Orders screen status tabs.
Show a small "Last updated" time on both screens. Do not change how orders are created or stored.

2) REAL STOCK NUMBERS
Most fashion products currently show 999 units in Inventory, which is a placeholder, not my real stock. Do NOT invent or change my stock numbers yourself. Instead:
- In Admin > Inventory, make stock editable inline per SKU (with the change written to the Activity Log with old and new values).
- In Admin > Products and Inventory, highlight any product whose stock is exactly 999 with a small "Verify stock" badge, so I can find and correct them one by one.
- Make the storefront "Low Stock" badge and the Integration inventory lowStock flag use real available stock and the low-stock threshold from Integration settings (default 5).

TEST BEFORE YOU FINISH:
- Open Overview and Report & Analytics side by side and confirm gross sales, total orders, and COD figures are now identical on both.
- Confirm the Integration sales-summary endpoint returns those same figures.
- Edit one product's stock in Inventory, confirm the storefront and the Integration inventory endpoint both show the new number, and confirm the change appears in Activity Logs.
```

---

## After building — Sadik's checklist
1. Log in as Manager once and confirm: no Integration section in Settings.
2. In the storefront, place one test order, then check Admin > Orders shows it.
3. Deploy the app from AI Studio.
4. Send Muse: the deployed link. The API key goes only through Muse's secure entry — Muse will ask for it that way when setting up the connector.
5. Muse then sets up: scheduled checks for new orders / low stock / staff activity, WhatsApp alerts to Sadik, order-confirm on Sadik's instruction, and a best-sellers summary. Nothing goes live until the deployed link + key are in.
