# KenaX BD — Fix Prompt: Integration API returns HTML, API key creation fails
Prepared for Sadik, 2026-11-20. Paste this whole prompt into Google AI Studio for the KenaX BD project, then push to GitHub and deploy (GitHub → Firebase Hosting, project gen-lang-client-0077501500, live site https://gen-lang-client-0077501500.web.app/).

---

```
You are working on my existing e-commerce app "KenaX BD". Do NOT redesign anything. Keep the existing UI, branding, colours, Bengali + English labels, navigation and all existing features exactly as they are.

BUG TO FIX (verified on the live deployed site):
- The site is deployed on Firebase Hosting at https://gen-lang-client-0077501500.web.app/ (Firebase project gen-lang-client-0077501500), deployed from GitHub to Firebase Hosting.
- Right now, opening https://gen-lang-client-0077501500.web.app/api/integration/health in a browser returns HTTP 200 with Content-Type text/html and the storefront's index.html — NOT JSON. The same happens for /api/integration/orders.
- Because of this, when I click "Generate" for the Integration API Key in Admin > Settings > Integration, the app crashes with:  Unexpected token '<', "<!doctype "... is not valid JSON
- Root cause: there is NO real backend serving /api/*. Firebase Hosting's SPA rewrite ("**" -> "/index.html") answers every /api/integration/* request with index.html, and the frontend then fails when it tries to parse that HTML as JSON.

FIX IT PROPERLY:

1) REAL BACKEND WITH CLOUD FUNCTIONS
- Add Firebase Cloud Functions (2nd gen, Node.js, in a `functions/` folder in this same repo) and implement the Integration API there, using the app's EXISTING data store (the same Firestore collections / backend data that the Admin dashboard already reads orders, products, inventory, staff and activity from — do not create a second, separate database and do not migrate data).
- Endpoints to implement (all must ALWAYS return JSON with Content-Type application/json, including every error):
  - GET  /api/integration/health -> { ok: true, store: "KenaX BD", now: <server time> }
  - GET  /api/integration/orders -> real orders with orderId, createdAt, status, customer { name, phone, email, address, zone }, items [ { productName, sku, quantity, unitPrice } ], subtotal, deliveryCharge, total, paymentMethod, salesChannel, courier, updatedAt. Support a `since` ISO date-time query parameter.
  - GET  /api/integration/products -> productId, name, sku, category, price, salePrice, stock, totalSold.
  - GET  /api/integration/inventory -> per SKU: available, reserved, stockValue, lowStock (available <= 5).
  - GET  /api/integration/activity -> staff activity events: staff name, email, role, action, orderId/productId affected, fromStatus, toStatus, details, timestamp.
  - GET  /api/integration/sales-summary -> totalOrders, grossSales, netProductSales, deliveryCollected, averageOrderValue, ordersByStatus, salesByPaymentMethod, salesByChannel, topSellers (top 10 by units sold).
  - POST /api/integration/orders/{orderId}/status with JSON body { "status": "confirmed", "note": "..." } — the ONLY write allowed. It must follow the app's existing order workflow, record the change in the Activity Log as actor "Muse (on owner's instruction)", and return the updated order as JSON. Any other write returns HTTP 403 JSON.

2) API KEY — SERVER SIDE ONLY
- Every /api/integration/* endpoint (except none — health included) must require the header  X-API-Key: <key>. Missing or wrong key -> HTTP 401 with a JSON body like { "error": "invalid_api_key" }. Never HTML.
- The key is generated and stored ONLY on the server: add an authenticated admin-only endpoint (for example POST /api/integration/admin/generate-key) that creates the key, stores only a HASH of it in a server-only Firestore document (readable by no client role, including Manager), and returns the plain key ONCE as JSON { "apiKey": "..." } so the Super Admin can copy it from Admin > Settings > Integration. Regenerating must invalidate the old key immediately.
- The Integration section stays visible ONLY to Super Admin, exactly as now. The key must never appear in frontend code, in the GitHub repo, or in any other API response.

3) FIREBASE HOSTING ROUTING (firebase.json)
- In firebase.json, add rewrites so /api/integration/** goes to the Cloud Function BEFORE the SPA fallback, in this order:
  a. { "source": "/api/integration/**", "function": { "functionId": "<your function name>", "region": "<the region you deploy the function to>" } }
  b. then the existing { "source": "**", "destination": "/index.html" } LAST.
- Normal storefront and admin page routes must keep working exactly as before.

4) GITHUB DEPLOY MUST INCLUDE THE FUNCTIONS
- The site deploys from GitHub to Firebase Hosting. Update the deploy setup (GitHub Action workflow and/or firebase config in the repo) so a push deploys BOTH the functions and the hosting (equivalent of: firebase deploy --only functions,hosting). If the workflow can only deploy hosting, tell me clearly in your summary what extra one-time command or workflow change is needed, and add the functions deploy step to the workflow file if one exists.
- Everything needed must be committed in the repo (functions code, package.json, firebase.json changes) so the GitHub deploy produces a working API with no manual console steps, apart from any one-time Firebase Blaze/Functions enablement — if that is required, say so explicitly in your summary instead of failing silently.

5) FRONTEND ERROR HANDLING
- In the Integration settings screen (and anywhere the app calls /api/*), check the response Content-Type / response.ok before calling response.json(). If the server ever returns non-JSON, show a clear Bengali + English error message like "সার্ভার থেকে সঠিক উত্তর আসেনি (API server error)" instead of crashing with "Unexpected token '<' ... is not valid JSON".

TEST BEFORE YOU FINISH (do these against the deployed build logic and report the results in your summary):
- GET /api/integration/health WITHOUT the key returns HTTP 401 and a JSON body — not HTML.
- GET /api/integration/health WITH a valid key returns HTTP 200, Content-Type application/json, and { ok: true, store: "KenaX BD", ... }.
- In Admin > Settings > Integration, clicking Generate creates a key with NO error, and the key is shown once with a copy button.
- GET /api/integration/orders WITH the key returns the store's real current orders as JSON.
- The storefront home page and /admin still load normally (the SPA rewrite still works for page routes).
- In your summary, tell me: the function name and region you used, where the key hash is stored, and the exact firebase.json rewrites you added.
```

---

## After AI Studio builds it — Sadik's steps
1. Push the code to GitHub as usual; the deploy runs to Firebase Hosting (project gen-lang-client-0077501500).
2. Open https://gen-lang-client-0077501500.web.app/api/integration/health in a browser — it should now show a small JSON error (401), NOT the storefront page. That alone proves the API is alive.
3. In Admin > Settings > Integration, generate a NEW key (the old preview key will not carry over).
4. Give the new key to Muse only through Muse's secure entry — never in chat. Muse will register the gen-lang-client-0077501500.web.app host, re-run health/orders/inventory checks, and then set up the WhatsApp alerts.
