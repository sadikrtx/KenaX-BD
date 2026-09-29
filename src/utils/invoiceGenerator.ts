import { Order } from '../types/index.ts';

export const generateAndPrintInvoice = (order: Order) => {
  const invoiceWindow = window.open('', '_blank', 'width=900,height=800');
  if (!invoiceWindow) {
    alert('Please allow popups to download or print your money receipt.');
    return;
  }

  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const invoiceTime = new Date(order.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dueAmount =
    order.dueAmount !== undefined
      ? order.dueAmount
      : order.paymentOptionType === 'cod'
      ? order.totalAmount
      : 0;
  const paidAmount =
    order.paidAmount !== undefined
      ? order.paidAmount
      : order.paymentOptionType === 'cod'
      ? 0
      : order.totalAmount;

  const customLogo = typeof window !== 'undefined' ? localStorage.getItem('kenax_custom_logo') : null;

  // Official KenaX BD Vector Logo SVG
  const officialLogoSvg = `
    <svg viewBox="0 0 250 105" width="170" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
      <defs>
        <linearGradient id="kenaxXGrad-invoice" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0066FF" />
          <stop offset="50%" stop-color="#00A8FF" />
          <stop offset="100%" stop-color="#00E5FF" />
        </linearGradient>
        <linearGradient id="swooshGrad-invoice" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00E5FF" />
          <stop offset="60%" stop-color="#38BDF8" />
          <stop offset="100%" stop-color="#FFFFFF" />
        </linearGradient>
        <filter id="subtleGlow-invoice" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#00A8FF" flood-opacity="0.4" />
        </filter>
      </defs>

      <!-- 1. SPEED SHOPPING CART -->
      <g transform="translate(0, 0)">
        <line x1="86" y1="12" x2="104" y2="12" stroke="#00E5FF" stroke-width="2.8" stroke-linecap="round" />
        <line x1="78" y1="18.5" x2="101" y2="18.5" stroke="#00E5FF" stroke-width="3.2" stroke-linecap="round" />
        <line x1="84" y1="25" x2="104" y2="25" stroke="#00E5FF" stroke-width="2.8" stroke-linecap="round" />
        <path d="M106 8 L114 8 L121 25 L150 25 L155 12 L117 12" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="119" y1="18.5" x2="152" y2="18.5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="126" cy="31" r="3.6" fill="#00E5FF" stroke="#FFFFFF" stroke-width="1.6" />
        <circle cx="145" cy="31" r="3.6" fill="#00E5FF" stroke="#FFFFFF" stroke-width="1.6" />
      </g>

      <!-- 2. BRAND WORDMARK: KenaX -->
      <g transform="translate(24, 73)">
        <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="48" font-weight="900" letter-spacing="-1.8" fill="#FFFFFF">
          Kena
        </text>
        <g transform="translate(124, -39)">
          <path d="M6 3 L19 3 L32 24 L45 3 L58 3 L39 29 L60 48 L47 48 L32 34 L17 48 L4 48 L25 27 Z" fill="url(#kenaxXGrad-invoice)" filter="url(#subtleGlow-invoice)" />
          <path d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z" fill="url(#swooshGrad-invoice)" />
          <path d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z" fill="#FFFFFF" opacity="0.85" />
        </g>
      </g>

      <!-- 3. BOTTOM ACCENT: — BD — -->
      <g transform="translate(0, 95)">
        <line x1="72" y1="0" x2="105" y2="0" stroke="#00E5FF" stroke-width="2.8" stroke-linecap="round" />
        <text x="125" y="3.5" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="16" font-weight="900" letter-spacing="2.5" fill="#00E5FF">
          BD
        </text>
        <line x1="145" y1="0" x2="178" y2="0" stroke="#00E5FF" stroke-width="2.8" stroke-linecap="round" />
      </g>
    </svg>
  `;

  const logoMarkup = customLogo
    ? `<img src="${customLogo}" alt="KenaX BD" style="max-height: 60px; max-width: 180px; object-fit: contain; display: block;" />`
    : officialLogoSvg;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt #${order.id} | KenaX BD Official Invoice</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 30px 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    
    .header {
      background: linear-gradient(135deg, #0B192C 0%, #112239 100%);
      color: #ffffff;
      padding: 28px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #00A8FF;
    }
    
    .brand-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .brand-tagline {
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: 0.8px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 4px;
    }
    
    .invoice-title-box {
      text-align: right;
    }
    
    .invoice-badge {
      display: inline-block;
      background: linear-gradient(135deg, #0066FF, #00E5FF);
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
      box-shadow: 0 2px 8px rgba(0, 168, 255, 0.3);
    }
    
    .invoice-id {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    
    .invoice-date {
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 2px;
    }
    
    .notice-bar {
      background: #f0fdf4;
      border-bottom: 1px solid #bbf7d0;
      color: #166534;
      padding: 12px 40px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .body-content {
      padding: 32px 40px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    
    .info-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 20px;
    }
    
    .info-block-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .info-block p {
      font-size: 13px;
      line-height: 1.6;
      color: #1e293b;
    }
    
    .info-block p strong {
      color: #0f172a;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    
    .items-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px 16px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .items-table th.text-right {
      text-align: right;
    }
    
    .items-table td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    
    .items-table td.text-right {
      text-align: right;
      font-weight: 600;
    }
    
    .item-name {
      font-weight: 700;
      color: #0f172a;
    }
    
    .item-variant {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    
    .summary-table {
      width: 330px;
      border-collapse: collapse;
    }
    
    .summary-table td {
      padding: 8px 12px;
      font-size: 13px;
      color: #475569;
    }
    
    .summary-table td.val {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }
    
    .summary-table tr.total-row td {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      padding: 12px;
    }
    
    .summary-table tr.total-row td.val {
      color: #0284c7;
    }
    
    .payment-status-box {
      margin-top: 24px;
      padding: 16px 20px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer {
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    
    .footer-stamp {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 6px 18px;
      border: 1.5px dashed #0284c7;
      color: #0284c7;
      background: #f0f9ff;
      border-radius: 8px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .print-actions {
      text-align: center;
      margin: 20px auto;
      max-width: 800px;
    }
    
    .print-btn {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      border: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.2s ease;
    }
    
    .print-btn:hover {
      background: linear-gradient(135deg, #0369a1, #075985);
      transform: translateY(-1px);
    }
    
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
      }
      .print-actions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">🖨️ Print Money Receipt / Save PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div class="brand-section">
        ${logoMarkup}
        <div class="brand-tagline">Smart Shopping • Verified Bangladesh Store</div>
      </div>
      <div class="invoice-title-box">
        <div class="invoice-badge">Official Money Receipt</div>
        <div class="invoice-id">#${order.id}</div>
        <div class="invoice-date">${invoiceDate} • ${invoiceTime}</div>
      </div>
    </div>

    <div class="notice-bar">
      <span>✓</span>
      <span>আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমাদের টিম ডেলিভারির জন্য আপনার সাথে ফোনে যোগাযোগ করবে।</span>
    </div>

    <div class="body-content">
      <div class="info-grid">
        <div class="info-block">
          <div class="info-block-title">📦 Customer & Delivery Details</div>
          <p><strong>Recipient:</strong> ${order.deliveryName || order.customerName}</p>
          <p><strong>Mobile:</strong> ${order.deliveryMobile || order.customerMobile}</p>
          <p><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
          <p><strong>Address:</strong> ${order.fullAddress}</p>
          <p><strong>Location:</strong> ${order.upazila}, ${order.district}, ${order.division}</p>
          ${order.deliveryInstructions ? `<p><strong>Note:</strong> <em>"${order.deliveryInstructions}"</em></p>` : ''}
        </div>

        <div class="info-block">
          <div class="info-block-title">🚚 Order & Shipment Details</div>
          <p><strong>Order Status:</strong> <span style="color:#0284c7; font-weight:700;">${order.orderStatus}</span></p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery || '24-48 Hours'}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map((item, idx) => `
            <tr>
              <td style="color:#94a3b8; font-weight:600;">${idx + 1}</td>
              <td>
                <div class="item-name">${item.productName}</div>
                ${item.selectedColor || item.selectedSize ? `<div class="item-variant">${item.selectedColor ? 'Color: ' + item.selectedColor : ''} ${item.selectedSize ? ' | Size: ' + item.selectedSize : ''}</div>` : ''}
              </td>
              <td class="text-right">৳${item.price.toLocaleString('en-BD')}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">৳${(item.price * item.quantity).toLocaleString('en-BD')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <table class="summary-table">
          <tr>
            <td>Subtotal:</td>
            <td class="val">৳${order.subtotal.toLocaleString('en-BD')}</td>
          </tr>
          <tr>
            <td>Delivery Charge:</td>
            <td class="val">৳${order.deliveryCharge.toLocaleString('en-BD')}</td>
          </tr>
          ${order.discount > 0 ? `
          <tr>
            <td style="color:#16a34a;">Discount (${order.couponCode || 'Promo'}):</td>
            <td class="val" style="color:#16a34a;">- ৳${order.discount.toLocaleString('en-BD')}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Grand Total:</td>
            <td class="val">৳${order.totalAmount.toLocaleString('en-BD')}</td>
          </tr>
          <tr>
            <td>Paid Advance:</td>
            <td class="val" style="color:#16a34a;">৳${paidAmount.toLocaleString('en-BD')}</td>
          </tr>
          <tr>
            <td>Due on Delivery (COD):</td>
            <td class="val" style="color:#ea580c; font-size:14px;">৳${dueAmount.toLocaleString('en-BD')}</td>
          </tr>
        </table>
      </div>

      <div class="payment-status-box">
        <div>
          <span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Payment Status</span>
          <strong style="font-size:14px; color:#0f172a;">${order.paymentStatus || (order.paymentOptionType === 'cod' ? 'Cash on Delivery' : 'Paid')}</strong>
        </div>
        <div>
          <span style="font-size:11px; color:#64748b; text-transform:uppercase; font-weight:700; display:block;">Support Hotline</span>
          <strong style="font-size:13px; color:#0284c7;">+880 1711-000000</strong>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>KenaX BD</strong>. For any inquiries, please keep your Order ID <strong>#${order.id}</strong> handy.</p>
      <div class="footer-stamp">✓ Verified Purchase • KenaX BD Authorized Store</div>
    </div>
  </div>
</body>
</html>
  `;

  invoiceWindow.document.open();
  invoiceWindow.document.write(htmlContent);
  invoiceWindow.document.close();
};
