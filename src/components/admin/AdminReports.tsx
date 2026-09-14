import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Pin,
  Truck,
  Tag,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  FileText,
  PieChart,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Order, Product, UserRole, ExpenseRecord } from '../../types';

interface AdminReportsProps {
  orders: Order[];
  products: Product[];
  currentRole: UserRole;
  expenses?: ExpenseRecord[];
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  orders,
  products,
  expenses = [],
}) => {
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d' | 'month'>('all');
  const [isPinned, setIsPinned] = useState<boolean>(false);

  // Filter orders by date range
  const filteredOrders = orders.filter((o) => {
    if (dateFilter === 'all') return true;
    if (!o.createdAt) return true;
    const orderDate = new Date(o.createdAt);
    const now = new Date();

    if (dateFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    if (dateFilter === '7d') {
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateFilter === '30d') {
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 30;
    }
    if (dateFilter === 'month') {
      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const validOrders = filteredOrders.filter((o) => o.orderStatus !== 'Cancelled');
  const cancelledOrders = filteredOrders.filter((o) => o.orderStatus === 'Cancelled');

  // Key Financial Metrics
  const grossSales = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const netProductSales = validOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const deliveryCharges = validOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
  const discountsGiven = validOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  const averageOrderValue = validOrders.length > 0 ? Math.round(grossSales / validOrders.length) : 0;
  const cancelledRevenueLoss = cancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Paid vs Unpaid Collection
  const paidOrders = validOrders.filter((o) => o.paymentStatus === 'Paid');
  const totalPaidAmount = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const pendingCollectionAmount = grossSales - totalPaidAmount;

  // Regional breakdown (Dhaka vs Outside Dhaka)
  const dhakaOrders = validOrders.filter((o) => (o.customerDivision || 'dhaka').toLowerCase().includes('dhaka'));
  const outsideDhakaOrders = validOrders.filter((o) => !(o.customerDivision || 'dhaka').toLowerCase().includes('dhaka'));
  const dhakaSales = dhakaOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const outsideDhakaSales = outsideDhakaOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const dhakaDelivery = dhakaOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
  const outsideDhakaDelivery = outsideDhakaOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);

  // Top Category performance from valid orders
  const categorySalesMap = new Map<string, { count: number; revenue: number }>();
  validOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      const catName = p?.categoryName || 'General';
      const current = categorySalesMap.get(catName) || { count: 0, revenue: 0 };
      categorySalesMap.set(catName, {
        count: current.count + item.quantity,
        revenue: current.revenue + item.price * item.quantity,
      });
    });
  });
  const topCategories = Array.from(categorySalesMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Draw rounded rectangle helper for canvas report generation
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fillColor: string,
    borderColor?: string
  ) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Helper to get detailed period metadata for report headers
  const getPeriodMeta = (filter: string) => {
    switch (filter) {
      case 'today':
        return { title: "TODAY'S REPORT", code: "TODAY" };
      case '7d':
        return { title: "LAST 7 DAYS REPORT", code: "LAST 7 DAYS" };
      case '30d':
        return { title: "LAST 30 DAYS REPORT", code: "LAST 30 DAYS" };
      case 'month':
        return { title: "THIS MONTH REPORT", code: "THIS MONTH" };
      case 'all':
      default:
        return { title: "ALL TIME REPORT", code: "ALL TIME" };
    }
  };

  const currentPeriodMeta = getPeriodMeta(dateFilter);

  // Draw curved text along circle arc for official seal
  const drawCurvedSealText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    angleStep: number
  ) => {
    ctx.save();
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const angle = startAngle + i * angleStep;
      ctx.save();
      ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // Authentic handwritten cursive signature for "Sadik" inside the seal
  const drawSadikSignature = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    ctx.save();
    ctx.strokeStyle = '#02479e'; // Rich authentic fountain pen blue ink
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Capital 'S' - expressive calligraphic ascender, loop, and flowing body
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(centerX - 48, centerY + 8);
    ctx.bezierCurveTo(centerX - 56, centerY + 4, centerX - 62, centerY - 8, centerX - 56, centerY - 18);
    ctx.bezierCurveTo(centerX - 50, centerY - 28, centerX - 38, centerY - 28, centerX - 36, centerY - 16);
    ctx.bezierCurveTo(centerX - 34, centerY - 6, centerX - 50, centerY + 6, centerX - 40, centerY + 12);
    ctx.bezierCurveTo(centerX - 32, centerY + 15, centerX - 24, centerY + 8, centerX - 26, centerY - 2);
    ctx.stroke();

    // Connecting to 'a'
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(centerX - 26, centerY - 2);
    ctx.bezierCurveTo(centerX - 22, centerY - 8, centerX - 12, centerY - 8, centerX - 12, centerY);
    ctx.bezierCurveTo(centerX - 12, centerY + 8, centerX - 24, centerY + 8, centerX - 18, centerY + 10);
    ctx.bezierCurveTo(centerX - 14, centerY + 12, centerX - 8, centerY + 8, centerX - 6, centerY + 2);
    ctx.stroke();

    // Connecting to 'd' with tall ascender loop
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY + 2);
    ctx.bezierCurveTo(centerX - 4, centerY - 6, centerX + 4, centerY - 6, centerX + 6, centerY);
    ctx.bezierCurveTo(centerX + 8, centerY + 6, centerX - 2, centerY + 8, centerX + 6, centerY + 9);
    ctx.bezierCurveTo(centerX + 8, centerY + 9, centerX + 9, centerY + 2, centerX + 11, centerY - 22);
    ctx.bezierCurveTo(centerX + 12, centerY - 30, centerX + 16, centerY - 28, centerX + 15, centerY - 20);
    ctx.lineTo(centerX + 15, centerY + 9);
    ctx.bezierCurveTo(centerX + 15, centerY + 12, centerX + 20, centerY + 11, centerX + 22, centerY + 5);
    ctx.stroke();

    // Connecting to 'i'
    ctx.beginPath();
    ctx.moveTo(centerX + 22, centerY + 5);
    ctx.bezierCurveTo(centerX + 25, centerY - 3, centerX + 28, centerY - 5, centerX + 30, centerY);
    ctx.lineTo(centerX + 30, centerY + 9);
    ctx.bezierCurveTo(centerX + 30, centerY + 12, centerX + 34, centerY + 12, centerX + 37, centerY + 6);
    ctx.stroke();

    // Dot on 'i'
    ctx.beginPath();
    ctx.fillStyle = '#02479e';
    ctx.arc(centerX + 31, centerY - 13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Connecting to 'k' with signature loop
    ctx.beginPath();
    ctx.moveTo(centerX + 37, centerY + 6);
    ctx.bezierCurveTo(centerX + 40, centerY - 4, centerX + 44, centerY - 20, centerX + 47, centerY - 26);
    ctx.bezierCurveTo(centerX + 49, centerY - 32, centerX + 53, centerY - 30, centerX + 52, centerY - 20);
    ctx.lineTo(centerX + 49, centerY + 9);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 49, centerY);
    ctx.bezierCurveTo(centerX + 54, centerY - 5, centerX + 60, centerY - 2, centerX + 56, centerY + 4);
    ctx.bezierCurveTo(centerX + 54, centerY + 8, centerX + 62, centerY + 11, centerX + 70, centerY + 12);
    ctx.stroke();

    // Dynamic signature underline swoosh sweeping under the name
    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#032b69';
    ctx.moveTo(centerX + 70, centerY + 12);
    ctx.bezierCurveTo(centerX + 84, centerY + 14, centerX + 95, centerY + 6, centerX + 90, centerY - 4);
    ctx.bezierCurveTo(centerX + 84, centerY - 14, centerX + 65, centerY - 2, centerX + 30, centerY + 16);
    ctx.bezierCurveTo(centerX - 2, centerY + 25, centerX - 42, centerY + 24, centerX - 75, centerY + 19);
    ctx.bezierCurveTo(centerX - 82, centerY + 18, centerX - 88, centerY + 15, centerX - 84, centerY + 12);
    ctx.bezierCurveTo(centerX - 80, centerY + 9, centerX - 60, centerY + 13, centerX - 30, centerY + 18);
    ctx.bezierCurveTo(centerX + 15, centerY + 22, centerX + 60, centerY + 19, centerX + 92, centerY + 16);
    ctx.stroke();

    // Signature end dot
    ctx.beginPath();
    ctx.fillStyle = '#032b69';
    ctx.arc(centerX + 99, centerY + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Fallback drawing for Black-background KenaX BD Logo
  const drawBlackKenaXLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save();
    // Black background container
    drawRoundRect(ctx, x, y, w, h, 14, '#000000', '#334155');

    // 1. Store Shopping Cart on Top (Pure White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cartStartX = x + 92;
    const cartStartY = y + 10;
    // Speed lines
    ctx.beginPath();
    ctx.moveTo(cartStartX - 16, cartStartY + 3);
    ctx.lineTo(cartStartX - 4, cartStartY + 3);
    ctx.moveTo(cartStartX - 22, cartStartY + 8);
    ctx.lineTo(cartStartX - 6, cartStartY + 8);
    ctx.moveTo(cartStartX - 17, cartStartY + 13);
    ctx.lineTo(cartStartX - 4, cartStartY + 13);
    ctx.stroke();

    // Basket frame
    ctx.beginPath();
    ctx.moveTo(cartStartX, cartStartY);
    ctx.lineTo(cartStartX + 6, cartStartY);
    ctx.lineTo(cartStartX + 12, cartStartY + 13);
    ctx.lineTo(cartStartX + 34, cartStartY + 13);
    ctx.lineTo(cartStartX + 38, cartStartY + 3);
    ctx.lineTo(cartStartX + 9, cartStartY + 3);
    ctx.stroke();

    // Wheels
    ctx.beginPath();
    ctx.arc(cartStartX + 15, cartStartY + 18, 2.4, 0, Math.PI * 2);
    ctx.arc(cartStartX + 31, cartStartY + 18, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // 2. "Kena" text in pure White
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Kena', x + 24, y + 54);

    // 3. "X" with Blue/Cyan Gradient
    const xPos = x + 118;
    const xGrad = ctx.createLinearGradient(xPos, y + 26, xPos + 24, y + 56);
    xGrad.addColorStop(0, '#0066FF');
    xGrad.addColorStop(0.5, '#00A8FF');
    xGrad.addColorStop(1, '#00E5FF');
    ctx.fillStyle = xGrad;
    ctx.fillText('X', xPos, y + 54);

    // 4. "BD" in pure White as requested: "BD lekha ta sada hobe"
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('BD', x + w / 2, y + 70);

    // Side accent lines for BD
    ctx.strokeStyle = '#00A8FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 40, y + 66);
    ctx.lineTo(x + w / 2 - 16, y + 66);
    ctx.moveTo(x + w / 2 + 16, y + 66);
    ctx.lineTo(x + w / 2 + 40, y + 66);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.restore();
  };

  // Fallback procedural seal drawing with small KenaX BD logo and cursive Sadik signature inside
  const drawProceduralSeal = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.save();
    // Outer concentric rings
    ctx.strokeStyle = '#032b69';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 71, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.stroke();

    // Curved text on top arc: ★ KENAX BD OFFICIAL SEAL ★
    drawCurvedSealText(ctx, '★ KENAX BD OFFICIAL SEAL ★', cx, cy, 62, -Math.PI * 0.85, 0.12);

    // Small KenaX BD Logo inside seal
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#032b69';
    ctx.textAlign = 'center';
    ctx.fillText('KenaX BD', cx, cy - 24);

    ctx.font = '700 8px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText('SMART SHOPPING', cx, cy - 14);

    // Cursive handwritten "Sadik" signature directly inside seal
    drawSadikSignature(ctx, cx, cy + 12);

    // Sub-seal verification text
    ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#032b69';
    ctx.textAlign = 'center';
    ctx.fillText('★ AUTHORIZED & VERIFIED ★', cx, cy + 42);

    ctx.restore();
  };

  // Download Report as HD PNG Image
  const handleDownloadReport = async () => {
    const canvas = document.createElement('canvas');
    const width = 1200;
    const height = 1680;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load official logo and seal images concurrently
    const [logoImg, sealImg] = await Promise.all([
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = '/kenax-logo.svg';
      }),
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = '/kenax-seal.svg';
      }),
    ]);

    const periodMeta = getPeriodMeta(dateFilter);

    // Canvas Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Outer Border Frame
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    // Header Dark Card Gradient
    const grad = ctx.createLinearGradient(40, 40, width - 40, 250);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    drawRoundRect(ctx, 40, 40, width - 80, 210, 24, '#0f172a');

    // Official Logo Container (Black Card with sleek border)
    drawRoundRect(ctx, 65, 48, 224, 76, 14, '#000000', '#334155');

    if (logoImg) {
      try {
        ctx.drawImage(logoImg, 65, 48, 224, 76);
      } catch {
        // Fallback logo drawing (White Kena, vibrant X, White BD, White Cart Store Sign)
        drawBlackKenaXLogo(ctx, 65, 48, 224, 76);
      }
    } else {
      drawBlackKenaXLogo(ctx, 65, 48, 224, 76);
    }

    // Official Badges on Top Right (No Overlap)
    drawRoundRect(ctx, width - 260, 60, 190, 40, 10, '#0284c7');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('OFFICIAL REPORT', width - 232, 85);

    drawRoundRect(ctx, width - 260, 110, 190, 36, 10, '#0369a1');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`PERIOD: ${periodMeta.code}`, width - 245, 133);

    // Header Title & Filter Metadata (Placed Below Logo & Separated from Badges)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('FINANCIAL & SALES ANALYTICS REPORT', 65, 148);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`REPORT PERIOD: ${periodMeta.title}`, 65, 176);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `Generated On: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} | Total Orders Processed: ${filteredOrders.length}`,
      65,
      202
    );

    // 1. Financial Performance Section
    let startY = 280;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('1. FINANCIAL PERFORMANCE OVERVIEW', 40, startY);

    startY += 20;

    // KPI Box 1: Gross Sales
    drawRoundRect(ctx, 40, startY, 540, 130, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('GROSS TOTAL SALES', 65, startY + 40);
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${grossSales.toLocaleString()}`, 65, startY + 92);

    // KPI Box 2: Net Product Sales
    drawRoundRect(ctx, 620, startY, 540, 130, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('NET PRODUCT REVENUE', 645, startY + 40);
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${netProductSales.toLocaleString()}`, 645, startY + 92);

    startY += 150;

    // KPI Box 3: Total Courier Shipping
    drawRoundRect(ctx, 40, startY, 540, 130, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL COURIER SHIPPING COLLECTED', 65, startY + 40);
    ctx.fillStyle = '#0891b2';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${deliveryCharges.toLocaleString()}`, 65, startY + 92);

    // KPI Box 4: Average Order Value
    drawRoundRect(ctx, 620, startY, 540, 130, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText('AVERAGE ORDER VALUE (AOV)', 645, startY + 40);
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${averageOrderValue.toLocaleString()}`, 645, startY + 92);

    // 2. Payment Collections & Regional Breakdown Section
    startY += 180;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('2. PAYMENT COLLECTIONS & REGIONAL BREAKDOWN', 40, startY);

    startY += 20;

    // Payment Box Left
    drawRoundRect(ctx, 40, startY, 540, 220, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('Payment Collections', 65, startY + 40);

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${totalPaidAmount.toLocaleString()}`, 65, startY + 85);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Total Paid Online / bKash (${paidOrders.length} orders)`, 65, startY + 115);

    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${pendingCollectionAmount.toLocaleString()}`, 65, startY + 165);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Pending Cash-on-Delivery (${validOrders.length - paidOrders.length} orders)`, 65, startY + 195);

    // Regional Box Right
    drawRoundRect(ctx, 620, startY, 540, 220, 18, '#ffffff', '#cbd5e1');
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('Regional Sales Breakdown', 645, startY + 40);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${dhakaSales.toLocaleString()}`, 645, startY + 85);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Inside Dhaka (${dhakaOrders.length} orders • Shipping: ৳${dhakaDelivery.toLocaleString()})`, 645, startY + 115);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${outsideDhakaSales.toLocaleString()}`, 645, startY + 165);
    ctx.fillStyle = '#64748b';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Outside Dhaka (${outsideDhakaOrders.length} orders • Shipping: ৳${outsideDhakaDelivery.toLocaleString()})`, 645, startY + 195);

    // 3. Order Fulfillment & Top Categories
    startY += 260;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('3. ORDER FULFILLMENT & TOP CATEGORIES', 40, startY);

    startY += 20;
    drawRoundRect(ctx, 40, startY, 1120, 220, 18, '#ffffff', '#cbd5e1');

    ctx.fillStyle = '#16a34a';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Fulfilled / Active Orders: ${validOrders.length}`, 65, startY + 45);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Cancelled Orders: ${cancelledOrders.length} (Lost Revenue: ৳${cancelledRevenueLoss.toLocaleString()})`, 540, startY + 45);

    // Horizontal Divider line inside Box
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(65, startY + 70);
    ctx.lineTo(1100, startY + 70);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOP SELLING CATEGORIES:', 65, startY + 105);

    topCategories.forEach((cat, idx) => {
      const px = 65 + (idx % 3) * 350;
      const py = startY + 142 + Math.floor(idx / 3) * 36;
      ctx.fillStyle = '#334155';
      ctx.font = '15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${idx + 1}. ${cat.name}: ৳${cat.revenue.toLocaleString()} (${cat.count} items)`, px, py);
    });

    // 4. Official KenaX BD Circular Seal & Signature Verification Section
    startY += 260;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('4. OFFICIAL AUTHORIZATION & CERTIFICATION', 40, startY);

    startY += 20;
    drawRoundRect(ctx, 40, startY, 1120, 260, 20, '#ffffff', '#cbd5e1');

    // Left side verification metadata
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('Official Report Verification', 70, startY + 45);

    ctx.fillStyle = '#475569';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('This document is an officially generated financial statement of KenaX BD E-Commerce Platform.', 70, startY + 78);
    ctx.fillText(`Downloaded Filter Target: ${periodMeta.title}`, 70, startY + 104);

    // Hash box
    drawRoundRect(ctx, 70, startY + 125, 520, 48, 10, '#f1f5f9', '#cbd5e1');
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px monospace';
    const reportHash = `VERIFIED-KENAX-BD-${periodMeta.code.replace(/\s+/g, '_')}-${Date.now().toString(36).toUpperCase()}`;
    ctx.fillText(`HASH: ${reportHash}`, 85, startY + 154);

    // Status badge
    drawRoundRect(ctx, 70, startY + 188, 220, 36, 10, '#dcfce7', '#86efac');
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ VERIFIED & CONFIRMED', 85, startY + 211);

    // Right Side: Official KenaX BD Stamp Seal & Authorized Signature Overlay
    const sealSize = 172;
    const sealX = 860;
    const sealY = startY + 12;
    const sealCenterX = sealX + sealSize / 2;

    if (sealImg) {
      try {
        ctx.save();
        ctx.globalAlpha = 0.98; // Authentic seal stamp ink density
        ctx.drawImage(sealImg, sealX, sealY, sealSize, sealSize);
        ctx.restore();
      } catch {
        // Fallback procedural seal with small logo and cursive Sadik signature
        drawProceduralSeal(ctx, sealCenterX, sealY + sealSize / 2);
      }
    } else {
      // Procedural fallback seal with small logo and cursive Sadik signature
      drawProceduralSeal(ctx, sealCenterX, sealY + sealSize / 2);
    }

    // Signature Underline and Executive Authority Labels (Sadik is converted to signature and placed INSIDE the seal)
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.moveTo(sealCenterX - 85, startY + 204);
    ctx.lineTo(sealCenterX + 85, startY + 204);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Authorized Signature', sealCenterX, startY + 222);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillText('KenaX BD Executive Authority', sealCenterX, startY + 238);

    // Reset textAlign for footer
    ctx.textAlign = 'left';

    // Footer Info Bar
    startY += 290;
    drawRoundRect(ctx, 40, startY, 1120, 60, 14, '#0f172a');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`KENAX BD ADMIN INTELLIGENCE • ${periodMeta.title}`, 65, startY + 35);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('OFFICIAL CONFIDENTIAL REPORT', width - 330, startY + 35);

    // Trigger PNG Download
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURI;
    link.download = `kenax_bd_sales_report_${dateFilter}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Financial & Sales Analytics</h2>
            {isPinned && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Pin className="w-3 h-3 fill-amber-600 text-amber-600" />
                Pinned
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of revenue, courier costs, discounts, and payment gateways</p>
        </div>

        {/* Date Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'month', label: 'This Month' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-[11px] font-bold whitespace-nowrap ${
                  dateFilter === f.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action Buttons: Pin Report & Download Report */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPinned(!isPinned)}
              className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isPinned
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Pin this report to quick view"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-600 text-amber-600' : ''}`} />
              <span className="hidden sm:inline">{isPinned ? 'Pinned' : 'Pin Report'}</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Print Report"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Primary Financial KPIs (Mobile 2x2 Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Gross Total Sales */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-sky-300 transition-colors">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Gross Total Sales</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              ৳
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight truncate">৳{grossSales.toLocaleString()}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
              From {validOrders.length} active orders
            </p>
          </div>
        </div>

        {/* Net Product Value */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Net Product Sales</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-base sm:text-2xl font-black text-emerald-700 tracking-tight truncate">৳{netProductSales.toLocaleString()}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
              Excludes courier shipping
            </p>
          </div>
        </div>

        {/* Total Courier Delivery Collected */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Delivery Cost</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-base sm:text-2xl font-black text-indigo-600 tracking-tight truncate">৳{deliveryCharges.toLocaleString()}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
              Courier fee collected
            </p>
          </div>
        </div>

        {/* Promotional Discounts */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-rose-300 transition-colors">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Discounts</span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h3 className="text-base sm:text-2xl font-black text-rose-600 tracking-tight truncate">৳{discountsGiven.toLocaleString()}</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 truncate">
              Coupons & promo savings
            </p>
          </div>
        </div>
      </div>

      {/* 2. Secondary Metrics (AOV, Paid vs COD, Regional, Cancelled) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Average Order Value */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Avg Order Value</span>
            <p className="text-sm sm:text-base font-black text-slate-900 truncate">৳{averageOrderValue.toLocaleString()}</p>
          </div>
        </div>

        {/* Paid Collection */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Paid Amount</span>
            <p className="text-sm sm:text-base font-black text-emerald-700 truncate">৳{totalPaidAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Pending COD Collection */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-xs">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Pending COD</span>
            <p className="text-sm sm:text-base font-black text-amber-800 truncate">৳{pendingCollectionAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Cancelled Loss */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Cancelled Loss</span>
            <p className="text-sm sm:text-base font-black text-rose-700 truncate">৳{cancelledRevenueLoss.toLocaleString()} ({cancelledOrders.length})</p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Regional & Gateway Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Gateway Distribution */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-sm text-slate-900">Payment Gateway Distribution</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">{filteredOrders.length} total checkouts</span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'bKash', color: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700' },
              { name: 'Nagad', color: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
              { name: 'Cash on Delivery', color: 'bg-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-800' },
            ].map((gateway) => {
              const matchedOrders = filteredOrders.filter((o) =>
                o.paymentMethod.toLowerCase().includes(gateway.name.toLowerCase().split(' ')[0])
              );
              const count = matchedOrders.length;
              const revenue = matchedOrders.filter((o) => o.orderStatus !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
              const percentage = filteredOrders.length > 0 ? Math.round((count / filteredOrders.length) * 100) : 0;

              return (
                <div key={gateway.name} className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span className="text-slate-900">{gateway.name}</span>
                    <span className={gateway.text}>৳{revenue.toLocaleString()} ({count} orders)</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${gateway.color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-[11px] font-extrabold text-slate-600 w-9 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Delivery Breakdown (Dhaka vs Outside Dhaka) */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Regional Delivery Performance</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Inside vs Outside Dhaka</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Inside Dhaka */}
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900">Inside Dhaka</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">
                  {dhakaOrders.length} Orders
                </span>
              </div>
              <p className="text-xl font-black text-sky-950 mt-2">৳{dhakaSales.toLocaleString()}</p>
              <div className="mt-2 text-[11px] text-sky-800 space-y-0.5 border-t border-sky-200/60 pt-2">
                <div className="flex justify-between">
                  <span>Shipping Fee:</span>
                  <span className="font-bold">৳{dhakaDelivery.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per order:</span>
                  <span className="font-bold">৳{dhakaOrders.length > 0 ? Math.round(dhakaSales / dhakaOrders.length) : 0}</span>
                </div>
              </div>
            </div>

            {/* Outside Dhaka */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Outside Dhaka</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                  {outsideDhakaOrders.length} Orders
                </span>
              </div>
              <p className="text-xl font-black text-indigo-950 mt-2">৳{outsideDhakaSales.toLocaleString()}</p>
              <div className="mt-2 text-[11px] text-indigo-800 space-y-0.5 border-t border-indigo-200/60 pt-2">
                <div className="flex justify-between">
                  <span>Shipping Fee:</span>
                  <span className="font-bold">৳{outsideDhakaDelivery.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per order:</span>
                  <span className="font-bold">৳{outsideDhakaOrders.length > 0 ? Math.round(outsideDhakaSales / outsideDhakaOrders.length) : 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Top Category Sales Performance */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900">Top Product Categories Contribution</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Based on sales volume</span>
        </div>

        {topCategories.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">No completed sales recorded for this period.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {topCategories.map((cat, i) => {
              const catPercent = grossSales > 0 ? Math.round((cat.revenue / grossSales) * 100) : 0;
              return (
                <div key={cat.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center justify-center">
                        #{i + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{cat.count} items sold</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">৳{cat.revenue.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-purple-700">{catPercent}% share</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Official Financial Statement & Executive Seal Preview */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Official Statement &amp; Verified Seal Preview
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official report downloads include this verified seal, Sadik's executive signature, and high-resolution branding
            </p>
          </div>

          <button
            onClick={handleDownloadReport}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res Report (PNG)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-50/80 p-4 sm:p-6 rounded-2xl border border-slate-200">
          {/* Left: Top Header Card Preview */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
              1. Header Branding &amp; Layout Preview
            </span>
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 shadow-inner flex items-center justify-center">
                  <img
                    src="/kenax-logo.svg"
                    alt="KenaX BD"
                    className="h-12 w-auto object-contain"
                  />
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-sky-600 text-white text-[11px] font-bold">
                    OFFICIAL REPORT
                  </span>
                  <p className="text-[11px] font-bold text-sky-400 mt-1 uppercase">
                    {currentPeriodMeta.title}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-black tracking-tight text-white">
                  FINANCIAL &amp; SALES ANALYTICS REPORT
                </h4>
                <p className="text-xs text-slate-400">
                  Total Orders Processed: <span className="font-bold text-white">{filteredOrders.length}</span> • Gross Sales: <span className="font-bold text-emerald-400">৳{grossSales.toLocaleString()}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                ✓ VERIFIED &amp; CONFIRMED
              </span>
              <span className="text-[11px] text-slate-500">
                Official E-Commerce Financial Document of KenaX BD Platform
              </span>
            </div>
          </div>

          {/* Right: Official Seal with Small KenaX BD Logo + Cursive Sadik Signature */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs text-center">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              2. Executive Seal &amp; Authorized Signature
            </span>

            {/* Seal Vector Stamp */}
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center p-1 rounded-full transition-transform hover:scale-105 duration-200">
              <img
                src="/kenax-seal.svg"
                alt="KenaX BD Official Seal with Sadik Signature"
                className="w-full h-full object-contain filter drop-shadow-sm select-none"
              />
            </div>

            {/* Signature Underline Baseline & Clean Authority Labels (without plain text Sadik) */}
            <div className="mt-2 text-center w-full max-w-[220px]">
              <div className="h-[1.5px] bg-slate-300 w-full mb-1.5" />
              <p className="text-xs font-black text-slate-900 tracking-tight">
                Authorized Signature
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                KenaX BD Executive Authority
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

