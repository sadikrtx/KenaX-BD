import React, { useState, useRef } from 'react';
import { Printer, X, Download, FileText, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Order, SiteSettings, Product } from '../../types';
import { KenaXLogo } from '../KenaXLogo';
import { KenaXOfficialSeal } from '../KenaXOfficialSeal';
import { CartItemImage } from '../CartItemImage';

interface InvoiceModalProps {
  order: Order | null;
  products?: Product[];
  settings: SiteSettings;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, products = [], settings, onClose }) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 500);
  };

  // Direct 2D Canvas Fallback for 100% Guaranteed Image Generation & Download
  const downloadViaDirectCanvas = async (currentOrder: Order, currentSettings: SiteSettings) => {
    const items = currentOrder.items || [];
    const width = 1200;
    const baseHeight = 1100;
    const dynamicHeight = Math.max(1400, baseHeight + items.length * 60);
    const height = dynamicHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle Outer Frame
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Top Brand Accent Line
    const brandGrad = ctx.createLinearGradient(20, 20, width - 20, 20);
    brandGrad.addColorStop(0, '#0284c7');
    brandGrad.addColorStop(0.5, '#0f172a');
    brandGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = brandGrad;
    ctx.fillRect(20, 20, width - 40, 10);

    // 1. Header (Logo & Store Meta)
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillText('KENAX BD', 70, 95);

    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText('SMART SHOPPING, BETTER LIVING', 70, 122);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${currentSettings.siteName || 'KenaX BD'} • Dhaka, Bangladesh`, 70, 150);
    ctx.fillText(`Support: ${currentSettings.phone || '+880 1700-123456'} | Email: ${currentSettings.email || 'support@kenaxbd.com'}`, 70, 172);

    // 2. Invoice Details Badge on Right
    ctx.fillStyle = '#e0f2fe';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(width - 340, 60, 270, 40, 8);
      ctx.fill();
    } else {
      ctx.fillRect(width - 340, 60, 270, 40);
    }
    ctx.fillStyle = '#0369a1';
    ctx.font = '900 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL INVOICE / BILL', width - 205, 86);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Invoice No:', width - 340, 125);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`INV-${currentOrder.id}`, width - 240, 125);

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Issue Date:', width - 340, 150);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(formattedDate, width - 240, 150);

    // Helper to format payment method and advance details
    const isFullAdv = currentOrder.paymentOptionType === 'full' || (currentOrder.paidAmount !== undefined && currentOrder.paidAmount >= currentOrder.totalAmount && currentOrder.totalAmount > 0);
    const isDelivAdv = currentOrder.paymentOptionType === 'delivery_only' || currentOrder.paymentMethod === 'Delivery Charge Only' || (!isFullAdv && currentOrder.paidAmount !== undefined && currentOrder.paidAmount > 0);
    const isCOD = !isFullAdv && !isDelivAdv;

    const advPaid = currentOrder.paidAmount && currentOrder.paidAmount > 0
      ? currentOrder.paidAmount
      : isDelivAdv
      ? (currentOrder.deliveryCharge || 0)
      : isFullAdv
      ? currentOrder.totalAmount
      : 0;

    const dueAmt = isFullAdv
      ? 0
      : currentOrder.dueAmount !== undefined
      ? currentOrder.dueAmount
      : Math.max(0, currentOrder.totalAmount - advPaid);

    let paymentMethodDisplay = currentOrder.paymentMethod || 'Cash on Delivery';
    if (isFullAdv) {
      paymentMethodDisplay = `Full Advance (${currentOrder.paymentMethod || 'Prepaid'}) - ৳${advPaid.toLocaleString('en-BD')}`;
    } else if (isDelivAdv) {
      paymentMethodDisplay = `Delivery Advance (${currentOrder.paymentMethod || 'Prepaid'}) - ৳${advPaid.toLocaleString('en-BD')}`;
    } else {
      paymentMethodDisplay = `Cash on Delivery (COD)`;
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Payment:', width - 340, 175);
    ctx.fillStyle = isFullAdv ? '#059669' : isDelivAdv ? '#4338ca' : '#d97706';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(paymentMethodDisplay.slice(0, 32), width - 240, 175);

    // Divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 205);
    ctx.lineTo(width - 70, 205);
    ctx.stroke();

    // 3. Customer & Address Details
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('BILLED TO (CUSTOMER):', 70, 235);
    ctx.fillText('DELIVERY ADDRESS:', width / 2 + 30, 235);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(currentOrder.customerName || 'Customer', 70, 260);

    ctx.fillStyle = '#475569';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Mobile: ${currentOrder.customerMobile || currentOrder.deliveryMobile || 'N/A'}`, 70, 285);
    if (currentOrder.customerEmail) {
      ctx.fillText(`Email: ${currentOrder.customerEmail}`, 70, 307);
    }

    const fullAddr = currentOrder.fullAddress || 
      (typeof currentOrder.deliveryAddress === 'object' ? (currentOrder.deliveryAddress as any)?.fullAddress : currentOrder.deliveryAddress) || 
      `${currentOrder.division || currentOrder.customerDivision || 'Dhaka'}, Bangladesh`;
    
    ctx.fillStyle = '#1e293b';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    // Wrap address lines cleanly
    const words = fullAddr.split(' ');
    let line = '';
    let addrY = 260;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 440 && n > 0) {
        ctx.fillText(line, width / 2 + 30, addrY);
        line = words[n] + ' ';
        addrY += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2 + 30, addrY);

    // 4. Order Items Table
    const tableTop = 345;
    ctx.fillStyle = '#0f172a';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(70, tableTop, width - 140, 38, 6);
      ctx.fill();
    } else {
      ctx.fillRect(70, tableTop, width - 140, 38);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('#', 90, tableTop + 24);
    ctx.fillText('PRODUCT DESCRIPTION', 130, tableTop + 24);
    ctx.textAlign = 'right';
    ctx.fillText('UNIT PRICE', width - 360, tableTop + 24);
    ctx.fillText('QTY', width - 240, tableTop + 24);
    ctx.fillText('TOTAL AMOUNT', width - 90, tableTop + 24);
    ctx.textAlign = 'left';

    let itemY = tableTop + 40;
    items.forEach((item: any, idx: number) => {
      // Row zebra background
      if (idx % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(70, itemY, width - 140, 48);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(String(idx + 1), 90, itemY + 30);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      const prodTitle = item.productName || item.name || 'Product Item';
      const truncatedTitle = prodTitle.length > 42 ? prodTitle.slice(0, 40) + '...' : prodTitle;
      ctx.fillText(truncatedTitle, 130, itemY + 28);

      if (item.selectedColor || item.selectedSize || item.variant || item.variantName) {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px system-ui, -apple-system, sans-serif';
        const variantText = [item.selectedColor ? `Color: ${item.selectedColor}` : null, item.selectedSize ? `Size: ${item.selectedSize}` : null, item.variant || item.variantName].filter(Boolean).join(' • ');
        ctx.fillText(variantText, 130, itemY + 44);
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${Number(item.price || 0).toLocaleString('en-BD')}`, width - 360, itemY + 30);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(String(item.quantity || 1), width - 240, itemY + 30);

      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-BD')}`, width - 90, itemY + 30);
      ctx.textAlign = 'left';

      itemY += 50;
    });

    // Divider under table
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, itemY + 10);
    ctx.lineTo(width - 70, itemY + 10);
    ctx.stroke();

    // 5. Bottom Section: Terms & Conditions on Left, Totals & Seal on Right
    const summaryTop = itemY + 30;

    // Terms (Left)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('TERMS & CONDITIONS:', 70, summaryTop);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText('• 7-day hassle-free replacement warranty on eligible defective items.', 70, summaryTop + 24);
    ctx.fillText('• Please inspect parcel thoroughly in front of the delivery rider.', 70, summaryTop + 44);
    ctx.fillText(`• For any assistance, call ${currentSettings.phone || '+880 1700-123456'} or visit kenaxbd.com.`, 70, summaryTop + 64);

    // Totals (Right)
    const totalsLeft = width - 420;
    ctx.fillStyle = '#475569';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('Subtotal:', totalsLeft, summaryTop);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${Number(currentOrder.subtotal || 0).toLocaleString('en-BD')}`, width - 90, summaryTop);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#475569';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('Delivery Charge:', totalsLeft, summaryTop + 26);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${Number(currentOrder.deliveryCharge || 0).toLocaleString('en-BD')}`, width - 90, summaryTop + 26);
    ctx.textAlign = 'left';

    if (currentOrder.discountAmount > 0) {
      ctx.fillStyle = '#059669';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Coupon Discount (${currentOrder.couponCode || 'PROMO'}):`, totalsLeft, summaryTop + 52);
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`-৳${Number(currentOrder.discountAmount).toLocaleString('en-BD')}`, width - 90, summaryTop + 52);
      ctx.textAlign = 'left';
    }

    const grandTotalY = summaryTop + (currentOrder.discountAmount > 0 ? 86 : 64);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(totalsLeft, grandTotalY - 14);
    ctx.lineTo(width - 90, grandTotalY - 14);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('Grand Total:', totalsLeft, grandTotalY + 8);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0284c7';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`৳${Number(currentOrder.totalAmount || 0).toLocaleString('en-BD')}`, width - 90, grandTotalY + 8);
    ctx.textAlign = 'left';

    let extraOffset = 36;
    if (advPaid > 0) {
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(isFullAdv ? 'Full Advance Paid:' : 'Delivery Advance Paid:', totalsLeft, grandTotalY + extraOffset);
      ctx.textAlign = 'right';
      ctx.fillText(`-৳${advPaid.toLocaleString('en-BD')}`, width - 90, grandTotalY + extraOffset);
      ctx.textAlign = 'left';
      extraOffset += 24;

      ctx.fillStyle = '#b45309';
      ctx.font = '900 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('Due to Collect (COD):', totalsLeft, grandTotalY + extraOffset);
      ctx.textAlign = 'right';
      ctx.fillText(`৳${dueAmt.toLocaleString('en-BD')}`, width - 90, grandTotalY + extraOffset);
      ctx.textAlign = 'left';
      extraOffset += 28;
    }

    if (currentOrder.transactionId || currentOrder.senderMobileNumber) {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      const txInfo = `Sender: ${currentOrder.senderMobileNumber || 'N/A'} | TrxID: ${currentOrder.transactionId || 'N/A'}`;
      ctx.fillText(txInfo.slice(0, 48), totalsLeft, grandTotalY + extraOffset);
      extraOffset += 22;
    }

    // Payment Status Pill
    const isPaid = currentOrder.paymentStatus === 'Verified' || currentOrder.paymentStatus === 'Paid' || currentOrder.orderStatus === 'Completed' || (isFullAdv && currentOrder.paymentStatus === 'Verified');
    ctx.fillStyle = isPaid ? '#dcfce7' : '#fef3c7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(totalsLeft, grandTotalY + extraOffset, 180, 28, 6);
      ctx.fill();
    } else {
      ctx.fillRect(totalsLeft, grandTotalY + extraOffset, 180, 28);
    }
    ctx.fillStyle = isPaid ? '#166534' : '#92400e';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Status: ${isPaid ? 'Paid' : (currentOrder.paymentStatus || 'Pending')}`, totalsLeft + 12, grandTotalY + extraOffset + 19);

    // Authorized Stamp (Seal Graphic)
    const sealX = width - 180;
    const sealY = grandTotalY + extraOffset + 80;
    const sealR = 54;

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(sealX, sealY, sealR - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#0369a1';
    ctx.textAlign = 'center';
    ctx.font = '900 10px system-ui, -apple-system, sans-serif';
    ctx.fillText('KENAX BD', sealX, sealY - 14);
    ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
    ctx.fillText('OFFICIAL SEAL', sealX, sealY);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
    ctx.fillText('✓ VERIFIED', sealX, sealY + 14);
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText(`INV-${currentOrder.id}`, sealX, sealY + 26);
    ctx.textAlign = 'left';

    // 6. Footer Thank You
    ctx.strokeStyle = '#e2e8f0';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(70, height - 70);
    ctx.lineTo(width - 70, height - 70);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Thank you for choosing KenaX BD! We value your business & guarantee authentic quality products.', width / 2, height - 42);
    ctx.textAlign = 'left';

    await new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, `KenaX_Invoice_INV-${currentOrder.id}.png`);
        }
        resolve();
      }, 'image/png', 1.0);
    });
  };

  const handleDownloadInvoiceImage = async () => {
    if (!order) return;
    try {
      setIsGeneratingImage(true);
      let downloaded = false;

      // 1. Attempt html2canvas capture first
      if (invoiceRef.current) {
        try {
          const canvas = await html2canvas(invoiceRef.current, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 5000,
            onclone: (clonedDoc) => {
              const imgs = clonedDoc.querySelectorAll('img');
              imgs.forEach((img) => {
                img.crossOrigin = 'anonymous';
              });
            },
          });

          await new Promise<void>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) {
                downloadBlob(blob, `KenaX_Invoice_INV-${order.id}.png`);
                downloaded = true;
                resolve();
              } else {
                reject(new Error('Canvas Blob creation failed'));
              }
            }, 'image/png', 1.0);
          });
        } catch (h2cErr) {
          console.warn('html2canvas capture failed or tainted, triggering high-res 2D Canvas invoice:', h2cErr);
        }
      }

      // 2. Guaranteed Fallback if html2canvas was blocked or tainted
      if (!downloaded) {
        await downloadViaDirectCanvas(order, settings);
      }

      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (error) {
      console.error('Failed to generate invoice image:', error);
      // Last-ditch direct download guarantee
      try {
        await downloadViaDirectCanvas(order, settings);
        setIsDownloaded(true);
        setTimeout(() => setIsDownloaded(false), 3000);
      } catch (lastErr) {
        console.error('Direct canvas fallback also encountered an error:', lastErr);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 md:p-8">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6 sm:my-8 flex flex-col">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="print:hidden bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-sky-400 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base truncate">
              Order Invoice #{order.id}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Invoice as PNG Image Button */}
            <button
              onClick={handleDownloadInvoiceImage}
              disabled={isGeneratingImage}
              title="Download Invoice as Image (PNG)"
              className="px-3.5 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-75 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Image...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Image Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Invoice (Image)</span>
                </>
              )}
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              title="Print Invoice / Save as PDF"
              className="px-3 sm:px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Modal"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Renderable Invoice Container with Generous Top and Bottom Spacing */}
        <div
          ref={invoiceRef}
          id="invoice-print-area"
          className="px-6 sm:px-10 md:px-12 pt-8 sm:pt-10 pb-10 sm:pb-12 text-slate-800 bg-white"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b-2 border-slate-200">
            <div>
              <KenaXLogo className="h-9 mb-2.5" />
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                <strong className="text-slate-700">{settings.siteName || 'KenaX BD'}</strong> - Smart Shopping, Better Living.
                <br />
                Dhaka, Bangladesh • Support: {settings.phone || '+880 1700-123456'}
                <br />
                Email: {settings.email || 'support@kenaxbd.com'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3.5 py-1 bg-sky-100 text-sky-800 text-xs font-extrabold rounded-md uppercase tracking-wider mb-2">
                INVOICE / BILL
              </span>
              <p className="text-xs text-slate-500">
                Invoice No: <span className="font-bold text-slate-800 font-mono">INV-{order.id}</span>
              </p>
              <p className="text-xs text-slate-500">
                Date: <span className="font-semibold text-slate-800">{formattedDate}</span>
              </p>
              {(() => {
                const isFull = order.paymentOptionType === 'full' || (order.paidAmount !== undefined && order.paidAmount >= order.totalAmount && order.totalAmount > 0);
                const isDeliv = order.paymentOptionType === 'delivery_only' || order.paymentMethod === 'Delivery Charge Only' || (!isFull && order.paidAmount !== undefined && order.paidAmount > 0);
                const advanceAmt = order.paidAmount && order.paidAmount > 0 ? order.paidAmount : isDeliv ? order.deliveryCharge : isFull ? order.totalAmount : 0;
                return (
                  <p className="text-xs text-slate-500">
                    Payment: <span className="font-bold text-slate-800">
                      {isFull ? `Full Advance (${order.paymentMethod || 'Prepaid'}) - ৳${advanceAmt.toLocaleString('en-BD')}` : isDeliv ? `Delivery Advance (${order.paymentMethod || 'Prepaid'}) - ৳${advanceAmt.toLocaleString('en-BD')}` : (order.paymentMethod || 'Cash on Delivery')}
                    </span>
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">Billed To:</h4>
              <p className="font-bold text-sm text-slate-900">{order.customerName}</p>
              <p className="text-slate-600 mt-0.5">Phone: <strong className="text-slate-800">{order.customerMobile}</strong></p>
              {order.customerEmail && <p className="text-slate-600">Email: {order.customerEmail}</p>}
            </div>
            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">Delivery Address:</h4>
              <p className="text-slate-800 font-medium">
                {order.fullAddress || (typeof order.deliveryAddress === 'object' ? (order.deliveryAddress as any)?.fullAddress : order.deliveryAddress) || `${order.division || order.customerDivision || 'Dhaka'}, Bangladesh`}
              </p>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Product Description</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <CartItemImage
                          item={item}
                          product={products?.find((p) => p.id === item.productId)}
                          sizeClassName="w-10 h-10 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 leading-snug">{item.productName || item.name || 'Item'}</p>
                          {(item.variant || item.variantName || item.selectedColor || item.selectedSize) && (
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 mt-0.5">
                              {item.selectedColor && (
                                <span>Color: <strong className="text-slate-700">{item.selectedColor}</strong></span>
                              )}
                              {item.selectedColor && item.selectedSize && <span>•</span>}
                              {item.selectedSize && (
                                <span>Size: <strong className="text-slate-700">{item.selectedSize}</strong></span>
                              )}
                              {!item.selectedColor && !item.selectedSize && (item.variant || item.variantName) && (
                                <span>Variant: <strong className="text-slate-700">{item.variant || item.variantName}</strong></span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">৳{item.price.toLocaleString()}</td>
                    <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation & Official KenaX BD Seal */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-5 border-t-2 border-slate-200">
            {/* Left: Terms & Conditions */}
            <div className="text-xs text-slate-500 max-w-xs space-y-1.5">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p>• 7-day hassle-free replacement warranty on eligible defective items.</p>
              <p>• Please check the parcel in front of the delivery rider.</p>
              <p>• For support call {settings.phone || '+880 1700-123456'} or visit kenaxbd.com.</p>
            </div>

            {/* Right: Subtotal, Total & Official Verification Seal */}
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-medium">৳{order.deliveryCharge.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
                  <span>-৳{order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-sky-700">৳{order.totalAmount.toLocaleString()}</span>
              </div>
              {(() => {
                const isFull = order.paymentOptionType === 'full' || (order.paidAmount !== undefined && order.paidAmount >= order.totalAmount && order.totalAmount > 0);
                const isDeliv = order.paymentOptionType === 'delivery_only' || order.paymentMethod === 'Delivery Charge Only' || (!isFull && order.paidAmount !== undefined && order.paidAmount > 0);
                const advanceAmt = order.paidAmount && order.paidAmount > 0 ? order.paidAmount : isDeliv ? order.deliveryCharge : isFull ? order.totalAmount : 0;
                const due = isFull ? 0 : order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - advanceAmt);

                if (advanceAmt > 0) {
                  return (
                    <div className="space-y-1.5 pt-1.5 border-t border-dashed border-slate-200">
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>{isFull ? 'Full Advance Paid:' : 'Delivery Advance Paid:'}</span>
                        <span>-৳{advanceAmt.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-amber-800 font-black text-sm">
                        <span>Due to Collect (COD):</span>
                        <span>৳{due.toLocaleString()}</span>
                      </div>
                      {(order.senderMobileNumber || order.transactionId) && (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-0.5 font-mono text-slate-600">
                          {order.senderMobileNumber && (
                            <div>Sender Mobile: <strong className="text-slate-800">{order.senderMobileNumber}</strong></div>
                          )}
                          {order.transactionId && (
                            <div>TrxID: <strong className="text-slate-800">{order.transactionId}</strong></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
              <div className="pt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Payment Status:</span>
                <span
                  className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                    order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid' || order.orderStatus === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.orderStatus === 'Completed' ? 'Paid' : order.paymentStatus}
                </span>
              </div>

              {/* Official Seal Stamp */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase text-slate-800 tracking-tight">
                    Authorized Seal
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Verified Digital Invoice
                  </p>
                </div>
                <div className="shrink-0">
                  <KenaXOfficialSeal size={95} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer note with extra bottom space */}
          <div className="mt-10 pt-5 border-t border-dashed border-slate-200 text-center text-[11px] text-slate-400">
            Thank you for shopping with KenaX BD! We appreciate your business.
          </div>
        </div>
      </div>
    </div>
  );
};

