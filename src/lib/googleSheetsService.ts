import { initializeApp, getApps, getApp } from 'firebase/app';
import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { CustomerRecord, Order, Product, StaffUser } from '../types/index.ts';

// Google OAuth Scopes for Google Sheets & Drive File access (disabled)
export const GOOGLE_SHEETS_SCOPES: string[] = [];

// In-memory cache for OAuth access token
let cachedAccessToken: string | null = null;

export const getCachedAccessToken = (): string | null => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('kenax_google_sheets_token');
  } catch {}
};

// Sign in with Google (Google Sheets integration disabled)
export const signInForGoogleSheets = async (): Promise<{ user: User; accessToken: string }> => {
  const provider = new GoogleAuthProvider();
  
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google Sign-In.');
    }

    cachedAccessToken = credential.accessToken;
    // Save token in sessionStorage for convenience during session
    try {
      sessionStorage.setItem('kenax_google_sheets_token', cachedAccessToken);
    } catch {}

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/network-request-failed' || error?.message?.includes('network-request-failed')) {
      console.warn('Network request failed during Google sign-in. Retrying once...');
      // Retry once in case of transient network glitch or COOP iframe block
      try {
        const retryResult = await signInWithPopup(auth, provider);
        const retryCredential = GoogleAuthProvider.credentialFromResult(retryResult);
        if (retryCredential?.accessToken) {
          cachedAccessToken = retryCredential.accessToken;
          try {
            sessionStorage.setItem('kenax_google_sheets_token', cachedAccessToken);
          } catch {}
          return { user: retryResult.user, accessToken: cachedAccessToken };
        }
      } catch (retryErr: any) {
        throw new Error('Network connection error with Google Auth service. Please check your internet connection or disable popup/ad-blockers and try again.');
      }
    }
    throw error;
  }
};

// Try restoring cached token from sessionStorage
export const restoreAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = sessionStorage.getItem('kenax_google_sheets_token');
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch {}
  return null;
};

// Tab Names Definition
export const SHEET_TAB_NAMES = {
  SUMMARY: 'Summary Overview',
  CUSTOMERS: 'Customers',
  ORDERS: 'Orders (All)',
  DELIVERED_ORDERS: 'Delivered Orders & Customers',
  RESELLERS: 'Resellers',
  SELLERS: 'Sellers & Vendors',
  PRODUCTS: 'Products',
  PAYMENTS: 'Payments & Transactions',
};

// Column Headers Definition
export const SHEET_HEADERS = {
  [SHEET_TAB_NAMES.SUMMARY]: ['METRIC NAME', 'VALUE', 'LAST SYNC TIME', 'NOTES'],
  [SHEET_TAB_NAMES.CUSTOMERS]: [
    'User ID',
    'Full Name',
    'Phone Number',
    'Email',
    'Registration Date',
    'Address / District',
    'Total Orders Count',
    'Account Status',
  ],
  [SHEET_TAB_NAMES.ORDERS]: [
    'Order ID',
    'Customer Type',
    'Customer Name',
    'Phone Number',
    'Delivery Address',
    'Product Items',
    'Total Amount (BDT)',
    'Payment Method',
    'Order Status',
    'Order Date & Time',
    'Courier / Tracking',
  ],
  [SHEET_TAB_NAMES.DELIVERED_ORDERS]: [
    'Order ID',
    'Customer Name',
    'Phone Number',
    'Customer Email',
    'Delivery Address',
    'Delivered Items',
    'Delivered Amount (BDT)',
    'Payment Gateway',
    'Order Date',
    'Delivery Date',
    'Courier Tracking Ref',
  ],
  [SHEET_TAB_NAMES.RESELLERS]: [
    'Reseller ID',
    'Full Name',
    'Phone Number',
    'Email',
    'Business / Shop Name',
    'Wallet Balance (BDT)',
    'Total Earnings',
    'Approval Status',
    'Joined Date',
  ],
  [SHEET_TAB_NAMES.SELLERS]: [
    'Seller ID',
    'Shop Name',
    'Owner Name',
    'Phone Number',
    'Email',
    'Total Products Listed',
    'Commission Rate (%)',
    'Status',
  ],
  [SHEET_TAB_NAMES.PRODUCTS]: [
    'Product ID',
    'Title / Name',
    'Category',
    'Price (BDT)',
    'Stock Quantity',
    'Seller / Supplier',
    'Status',
    'Added Date',
  ],
  [SHEET_TAB_NAMES.PAYMENTS]: [
    'Transaction / Ref ID',
    'Order ID',
    'Payer Name',
    'Phone Number',
    'Method (bKash/Nagad/COD)',
    'Amount (BDT)',
    'Payment Status',
    'Date & Time',
  ],
};

export interface CreateSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a brand new Google Spreadsheet in Google Drive with all 8 tabs pre-formatted and configured.
 */
export const createMasterGoogleSpreadsheet = async (accessToken: string): Promise<CreateSpreadsheetResult> => {
  const title = `KenaX BD - Ecommerce Database (${new Date().toLocaleDateString('en-GB')})`;

  const sheetsPayload = Object.values(SHEET_TAB_NAMES).map((tabName) => ({
    properties: {
      title: tabName,
      gridProperties: {
        frozenRowCount: 1, // Freeze header row
      },
    },
  }));

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: sheetsPayload,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message || `Failed to create Google Sheet (${res.status})`;
    if (message.includes('insufficient authentication scopes') || res.status === 403) {
      throw new Error('Request had insufficient authentication scopes. Please click "Sign in with Google" again, and make sure to check/enable the permissions checkbox for Google Sheets and Drive in the popup dialog.');
    }
    throw new Error(message);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write Column Headers to all 8 tabs
  await initializeHeaders(accessToken, spreadsheetId);

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Writes standard headers and formulas to the created spreadsheet.
 */
export const initializeHeaders = async (accessToken: string, spreadsheetId: string) => {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

  const dataPayload = [
    {
      range: `'${SHEET_TAB_NAMES.SUMMARY}'!A1:D9`,
      values: [
        SHEET_HEADERS[SHEET_TAB_NAMES.SUMMARY],
        ['Total Registered Customers', `=COUNTA('${SHEET_TAB_NAMES.CUSTOMERS}'!A2:A)`, timestamp, 'Auto-computed count'],
        ['Total Orders Placed', `=COUNTA('${SHEET_TAB_NAMES.ORDERS}'!A2:A)`, timestamp, 'All orders count'],
        ['Total Delivered Orders', `=COUNTA('${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!A2:A)`, timestamp, 'Delivered orders count'],
        ['Total Delivered Revenue (BDT)', `=SUM('${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!G2:G)`, timestamp, 'Sum of delivered orders'],
        ['Total Resellers', `=COUNTA('${SHEET_TAB_NAMES.RESELLERS}'!A2:A)`, timestamp, 'Resellers count'],
        ['Total Sellers / Vendors', `=COUNTA('${SHEET_TAB_NAMES.SELLERS}'!A2:A)`, timestamp, 'Sellers count'],
        ['Total Active Products', `=COUNTA('${SHEET_TAB_NAMES.PRODUCTS}'!A2:A)`, timestamp, 'Products count'],
        ['Total Payment Transactions', `=COUNTA('${SHEET_TAB_NAMES.PAYMENTS}'!A2:A)`, timestamp, 'Transactions count'],
      ],
    },
    {
      range: `'${SHEET_TAB_NAMES.CUSTOMERS}'!A1:H1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.CUSTOMERS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.ORDERS}'!A1:K1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.ORDERS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!A1:K1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.DELIVERED_ORDERS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.RESELLERS}'!A1:I1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.RESELLERS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.SELLERS}'!A1:H1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.SELLERS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.PRODUCTS}'!A1:H1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.PRODUCTS]],
    },
    {
      range: `'${SHEET_TAB_NAMES.PAYMENTS}'!A1:H1`,
      values: [SHEET_HEADERS[SHEET_TAB_NAMES.PAYMENTS]],
    },
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: dataPayload,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to write initial headers to Google Sheet.');
  }
};

export interface FullSyncData {
  customers?: any[];
  orders?: Order[];
  resellers?: any[];
  sellers?: any[];
  products?: Product[];
  payments?: any[];
}

/**
 * Performs a complete sync of all data into the Google Sheet (Overwrites data rows starting at A2).
 */
export const syncAllDataToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  data: FullSyncData
): Promise<{ success: boolean; syncedCounts: Record<string, number> }> => {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

  // 1. Customers Rows
  const customerRows = (data.customers || []).map((c: any) => [
    c.id || c.uid || 'N/A',
    c.fullName || c.name || c.displayName || 'Customer',
    c.phone || c.phoneNumber || 'N/A',
    c.email || 'N/A',
    c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : 'N/A',
    c.address || c.district || 'Bangladesh',
    c.totalOrders || c.ordersCount || 0,
    c.status || 'Active',
  ]);

  // 2. Orders (All) Rows
  const orderRows = (data.orders || []).map((o: Order) => {
    const itemsSummary = o.items
      ?.map((i: any) => `${i.productName || i.name || i.productTitle || i.title || 'Item'} x${i.quantity} (৳${i.price})`)
      .join('; ');
    const addr = typeof o.shippingAddress === 'object'
      ? `${(o.shippingAddress as any).address || ''}, ${(o.shippingAddress as any).district || ''}`
      : String(o.shippingAddress || o.address || 'N/A');
    return [
      o.id || (o as any).orderId || 'N/A',
      o.customerId ? 'Registered User' : 'Guest Customer',
      o.customerName || 'N/A',
      o.customerPhone || 'N/A',
      addr,
      itemsSummary || 'N/A',
      o.totalAmount || (o as any).total || 0,
      o.paymentMethod || 'Cash on Delivery',
      o.orderStatus || (o as any).status || 'pending',
      o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB') : 'N/A',
      (o as any).trackingNumber || o.courierName || 'N/A',
    ];
  });

  // 3. Delivered Orders & Customers Rows (Specifically filtered for delivered orders)
  const deliveredOrders = (data.orders || []).filter(
    (o) => String(o.orderStatus || (o as any).status).toLowerCase() === 'delivered' || String(o.orderStatus || (o as any).status).toLowerCase() === 'completed'
  );
  const deliveredRows = deliveredOrders.map((o: Order) => {
    const itemsSummary = o.items
      ?.map((i: any) => `${i.productName || i.name || i.productTitle || i.title || 'Item'} x${i.quantity} (৳${i.price})`)
      .join('; ');
    const addr = typeof o.shippingAddress === 'object'
      ? `${(o.shippingAddress as any).address || ''}, ${(o.shippingAddress as any).district || ''}`
      : String(o.shippingAddress || o.address || 'N/A');
    return [
      o.id || (o as any).orderId || 'N/A',
      o.customerName || 'N/A',
      o.customerPhone || 'N/A',
      o.customerEmail || 'N/A',
      addr,
      itemsSummary || 'N/A',
      o.totalAmount || (o as any).total || 0,
      o.paymentMethod || 'COD',
      o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : 'N/A',
      o.updatedAt ? new Date(o.updatedAt).toLocaleDateString('en-GB') : timestamp,
      (o as any).trackingNumber || o.courierName || 'N/A',
    ];
  });

  // 4. Resellers Rows
  const resellerRows = (data.resellers || []).map((r: any) => [
    r.id || r.resellerId || 'N/A',
    r.name || r.fullName || 'Reseller',
    r.phone || r.phoneNumber || 'N/A',
    r.email || 'N/A',
    r.shopName || r.businessName || 'N/A',
    r.walletBalance || r.balance || 0,
    r.totalEarnings || 0,
    r.status || 'Active',
    r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB') : 'N/A',
  ]);

  // 5. Sellers Rows
  const sellerRows = (data.sellers || []).map((s: any) => [
    s.id || s.sellerId || 'N/A',
    s.shopName || s.name || 'Seller Shop',
    s.ownerName || s.fullName || 'Owner',
    s.phone || 'N/A',
    s.email || 'N/A',
    s.totalProducts || 0,
    s.commissionRate || 10,
    s.status || 'Active',
  ]);

  // 6. Products Rows
  const productRows = (data.products || []).map((p: Product) => [
    p.id || 'N/A',
    p.title || 'N/A',
    p.category || 'General',
    p.price || 0,
    p.stock || p.stockQuantity || 0,
    p.sellerName || p.supplierName || 'In-House',
    p.inStock !== false ? 'In Stock' : 'Out of Stock',
    p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : 'N/A',
  ]);

  // 7. Payments & Transactions Rows
  const paymentRows = (data.payments || []).map((p: any) => [
    p.id || p.transactionId || 'N/A',
    p.orderId || 'N/A',
    p.customerName || p.payerName || 'N/A',
    p.phone || 'N/A',
    p.method || p.paymentGateway || 'bKash/Nagad',
    p.amount || 0,
    p.status || 'Verified',
    p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB') : 'N/A',
  ]);

  // If payment list is empty, generate from orders with payments
  if (paymentRows.length === 0 && (data.orders || []).length > 0) {
    (data.orders || []).forEach((o: Order) => {
      if (o.transactionId || o.paymentMethod || o.paid) {
        paymentRows.push([
          o.transactionId || `TXN-${o.id}`,
          o.id,
          o.customerName || 'Customer',
          o.customerPhone || 'N/A',
          o.paymentMethod || 'bKash',
          o.totalAmount || 0,
          o.paid ? 'Completed' : 'Pending Verification',
          o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB') : timestamp,
        ]);
      }
    });
  }

  // Construct Batch Update Request
  const batchData = [
    {
      range: `'${SHEET_TAB_NAMES.CUSTOMERS}'!A2:H${Math.max(customerRows.length + 1, 200)}`,
      values: customerRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.ORDERS}'!A2:K${Math.max(orderRows.length + 1, 500)}`,
      values: orderRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!A2:K${Math.max(deliveredRows.length + 1, 500)}`,
      values: deliveredRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.RESELLERS}'!A2:I${Math.max(resellerRows.length + 1, 100)}`,
      values: resellerRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.SELLERS}'!A2:H${Math.max(sellerRows.length + 1, 100)}`,
      values: sellerRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.PRODUCTS}'!A2:H${Math.max(productRows.length + 1, 500)}`,
      values: productRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.PAYMENTS}'!A2:H${Math.max(paymentRows.length + 1, 500)}`,
      values: paymentRows,
    },
    {
      range: `'${SHEET_TAB_NAMES.SUMMARY}'!A1:D9`,
      values: [
        SHEET_HEADERS[SHEET_TAB_NAMES.SUMMARY],
        ['Total Registered Customers', `=COUNTA('${SHEET_TAB_NAMES.CUSTOMERS}'!A2:A)`, timestamp, 'Auto-computed count'],
        ['Total Orders Placed', `=COUNTA('${SHEET_TAB_NAMES.ORDERS}'!A2:A)`, timestamp, 'All orders count'],
        ['Total Delivered Orders', `=COUNTA('${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!A2:A)`, timestamp, 'Delivered orders count'],
        ['Total Delivered Revenue (BDT)', `=SUM('${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!G2:G)`, timestamp, 'Sum of delivered orders'],
        ['Total Resellers', `=COUNTA('${SHEET_TAB_NAMES.RESELLERS}'!A2:A)`, timestamp, 'Resellers count'],
        ['Total Sellers / Vendors', `=COUNTA('${SHEET_TAB_NAMES.SELLERS}'!A2:A)`, timestamp, 'Sellers count'],
        ['Total Active Products', `=COUNTA('${SHEET_TAB_NAMES.PRODUCTS}'!A2:A)`, timestamp, 'Products count'],
        ['Total Payment Transactions', `=COUNTA('${SHEET_TAB_NAMES.PAYMENTS}'!A2:A)`, timestamp, 'Transactions count'],
      ],
    },
  ];

  // Helper function to clear previous data before replacing
  const clearOldValues = async (tabName: string) => {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${tabName}'!A2:Z1000:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch {}
  };

  // Clear data in parallel
  await Promise.all([
    clearOldValues(SHEET_TAB_NAMES.CUSTOMERS),
    clearOldValues(SHEET_TAB_NAMES.ORDERS),
    clearOldValues(SHEET_TAB_NAMES.DELIVERED_ORDERS),
    clearOldValues(SHEET_TAB_NAMES.RESELLERS),
    clearOldValues(SHEET_TAB_NAMES.SELLERS),
    clearOldValues(SHEET_TAB_NAMES.PRODUCTS),
    clearOldValues(SHEET_TAB_NAMES.PAYMENTS),
  ]);

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message || 'Failed to sync data to Google Sheets';
    if (message.includes('insufficient authentication scopes') || message.includes('403')) {
      throw new Error('Request had insufficient authentication scopes. Please click "Sign in with Google", then make sure to check/select all Google Drive and Google Sheets permission checkboxes in the Google consent popup.');
    }
    throw new Error(message);
  }

  return {
    success: true,
    syncedCounts: {
      customers: customerRows.length,
      orders: orderRows.length,
      deliveredOrders: deliveredRows.length,
      resellers: resellerRows.length,
      sellers: sellerRows.length,
      products: productRows.length,
      payments: paymentRows.length,
    },
  };
};

/**
 * Download all store data as formatted CSV files (Fallback for offline/local export)
 */
export const exportAllDataToCSV = (data: FullSyncData) => {
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. Orders CSV
  const orderHeaders = SHEET_HEADERS[SHEET_TAB_NAMES.ORDERS].join(',');
  const orderRows = (data.orders || []).map((o: any) =>
    [
      `"${o.id || ''}"`,
      `"${o.customerId ? 'Registered' : 'Guest'}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.customerPhone || ''}"`,
      `"${(typeof o.shippingAddress === 'object' ? o.shippingAddress?.address : o.shippingAddress || o.address || '').replace(/"/g, '""')}"`,
      `"${(o.items?.map((i: any) => `${i.productName || i.name || i.productTitle || 'Item'} x${i.quantity}`).join(';') || '').replace(/"/g, '""')}"`,
      o.totalAmount || 0,
      `"${o.paymentMethod || 'COD'}"`,
      `"${o.orderStatus || o.status || 'pending'}"`,
      `"${o.createdAt || ''}"`,
      `"${o.trackingNumber || ''}"`,
    ].join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [orderHeaders, ...orderRows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `kenax_orders_backup_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Appends a new single order row dynamically to Google Sheet
 */
export const appendOrderToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  order: Order
): Promise<void> => {
  const itemsSummary = order.items
    ?.map((i: any) => `${i.productName || i.name || i.productTitle || 'Item'} x${i.quantity} (৳${i.price})`)
    .join('; ');

  const addr = typeof order.shippingAddress === 'object'
    ? `${(order.shippingAddress as any).address || ''}, ${(order.shippingAddress as any).district || ''}`
    : String(order.shippingAddress || order.address || 'N/A');

  const row = [
    order.id || (order as any).orderId || 'N/A',
    order.customerId ? 'Registered User' : 'Guest Customer',
    order.customerName || 'N/A',
    order.customerPhone || 'N/A',
    addr,
    itemsSummary || 'N/A',
    order.totalAmount || (order as any).total || 0,
    order.paymentMethod || 'Cash on Delivery',
    order.orderStatus || (order as any).status || 'pending',
    order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : new Date().toLocaleString('en-GB'),
    (order as any).trackingNumber || order.courierName || 'N/A',
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_TAB_NAMES.ORDERS}'!A:K:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  // If status is delivered, append to Delivered tab as well!
  if (String(order.orderStatus || (order as any).status).toLowerCase() === 'delivered') {
    const deliveredRow = [
      order.id || (order as any).orderId || 'N/A',
      order.customerName || 'N/A',
      order.customerPhone || 'N/A',
      order.customerEmail || 'N/A',
      addr,
      itemsSummary || 'N/A',
      order.totalAmount || (order as any).total || 0,
      order.paymentMethod || 'COD',
      order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      new Date().toLocaleDateString('en-GB'),
      (order as any).trackingNumber || order.courierName || 'N/A',
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_TAB_NAMES.DELIVERED_ORDERS}'!A:K:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [deliveredRow] }),
      }
    );
  }
};
