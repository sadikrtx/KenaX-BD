import { Order, StaffUser } from '../types/index.ts';
import { triggerWhatsAppEvent } from './whatsappService.ts';
import { triggerTelegramFakeOrderAlert } from './telegramBotService.ts';

export interface FakeOrderAlertParams {
  order: Order;
  staff?: StaffUser | { id?: string; name?: string; role?: string; email?: string } | null;
  note?: string;
}

/**
 * Dispatches automated Fake Order notifications across all 3 channels:
 * 1. WhatsApp (Pinned Admin WhatsApp alert with full staff & order payload)
 * 2. Telegram (Super Admin & Admin bot broadcast with staff info)
 * 3. Email (Super Admin transactional alert via Gmail SMTP)
 */
export async function dispatchFakeOrderAlerts(params: FakeOrderAlertParams): Promise<void> {
  const { order, staff, note } = params;

  const staffName = staff?.name || (order as any).handledByStaffName || 'Staff Member';
  const staffRole = (staff?.role || (order as any).handledByStaffRole || 'Staff').toUpperCase();
  const staffId = staff?.id || (order as any).handledByStaffId || 'N/A';
  const staffEmail = (staff as any)?.email || 'N/A';
  const staffNote = note || order.adminNotes || 'Marked as Fake Order by Staff';

  // 1. WhatsApp Alert Dispatch
  try {
    await triggerWhatsAppEvent({
      event: 'admin_pinned_fake_order_alert' as any,
      order,
      customerPhone: order.customerMobile || order.deliveryMobile,
      user: {
        name: order.customerName || order.deliveryName || 'Customer',
        email: order.customerEmail || '',
        phone: order.customerMobile || order.deliveryMobile || '',
        id: order.customerId || '',
      },
      statusChange: {
        oldStatus: order.orderStatus || 'Pending',
        newStatus: 'Fake Order',
      },
      staff: {
        name: staffName,
        role: staffRole,
        id: staffId,
      },
      customVariables: {
        '{{staffName}}': staffName,
        '{{staffRole}}': staffRole,
        '{{staffId}}': staffId,
        '{{staffEmail}}': staffEmail,
        '{{note}}': staffNote,
        '{{adminNotes}}': staffNote,
      },
    });
  } catch (waErr) {
    console.warn('[WhatsApp Fake Order Alert Warning]:', waErr);
  }

  // 2. Telegram Bot Alert Dispatch
  try {
    await triggerTelegramFakeOrderAlert({
      order,
      staffName,
      staffRole,
      staffId,
      staffEmail,
      note: staffNote,
    });
  } catch (tgErr) {
    console.warn('[Telegram Fake Order Alert Warning]:', tgErr);
  }

  // 3. Email Alert Dispatch (Super Admin Notification via /api/email/send)
  try {
    const itemsListHtml = (order.items || [])
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 12px; font-size: 13px; color: #334155;">${idx + 1}. <strong>${it.productName || it.name || 'Product'}</strong></td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; text-align: center;">x${it.quantity}</td>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; text-align: right; font-weight: bold;">৳${((it.price || 0) * (it.quantity || 1)).toLocaleString()}</td>
        </tr>`
      )
      .join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #dc2626 100%); padding: 24px; color: #ffffff; text-align: left;">
          <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            ⚠️ Fake Order Security Alert
          </div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 800;">স্টাফ কর্তৃক একটি অর্ডারকে 'ফেক অর্ডার' চিহ্নিত করা হয়েছে</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">অর্ডার আইডি: #${order.id} | সময়: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>

        <div style="padding: 24px;">
          <!-- Staff Banner -->
          <div style="background: #fdf4ff; border: 1px solid #f5d0fe; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #86198f; text-transform: uppercase; letter-spacing: 0.05em;">
              👤 অ্যাকশন গ্রহণকারী স্টাফের বিবরণ:
            </p>
            <p style="margin: 0; font-size: 14px; color: #701a75;">
              <strong>নাম:</strong> ${staffName} &nbsp;|&nbsp; <strong>পদবী:</strong> <span style="background: #fae8ff; padding: 2px 8px; border-radius: 6px; font-weight: bold;">${staffRole}</span>
              ${staffId ? `&nbsp;|&nbsp; <strong>স্টাফ আইডি:</strong> ${staffId}` : ''}
            </p>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #86198f;">
              <strong>নোট/কারণ:</strong> <em>${staffNote}</em>
            </p>
          </div>

          <!-- Customer & Order Information -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; background: #f8fafc; border-radius: 8px; vertical-align: top; width: 50%;">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">কাস্টমার তথ্য</div>
                <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 4px;">${order.customerName || 'Customer'}</div>
                <div style="font-size: 13px; color: #334155; margin-top: 2px;">📞 ${order.customerMobile || order.deliveryMobile || 'N/A'}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">🏠 ${order.fullAddress || 'N/A'}, ${order.district || ''}</div>
              </td>
              <td style="width: 10px;"></td>
              <td style="padding: 10px; background: #f8fafc; border-radius: 8px; vertical-align: top; width: 50%;">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">অর্ডার তথ্য</div>
                <div style="font-size: 14px; font-weight: bold; color: #7c3aed; margin-top: 4px;">৳${(order.totalAmount || 0).toLocaleString()}</div>
                <div style="font-size: 13px; color: #334155; margin-top: 2px;">পেমেন্ট মেথড: ${order.paymentMethod || 'Cash on Delivery'}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">অর্ডার স্ট্যাটাস: <strong style="color: #9333ea;">Fake Order</strong></div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 8px;">
            🛒 অর্ডারের আইটেমসমূহ:
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left;">
                <th style="padding: 8px 12px; font-size: 12px; color: #475569;">প্রোডাক্ট</th>
                <th style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: center;">পরিমাণ</th>
                <th style="padding: 8px 12px; font-size: 12px; color: #475569; text-align: right;">মোট টাকা</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #94a3b8;">আইটেমের বিবরণ পাওয়া যায়নি</td></tr>'}
            </tbody>
          </table>

          <!-- Super Admin Authority Box -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; text-align: center;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #166534;">
              🔒 নিরাপত্তা নোট: শুধুমাত্র সুপার অ্যাডমিন এই অর্ডারটি আনফেক (Unfake / রিয়েল অর্ডার) করতে পারবেন।
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #15803d;">
              ম্যানেজার বা মডারেটরদের ফেক অর্ডার আনফেক করার কোনো অনুমতি নেই।
            </p>
          </div>
        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          KenaX BD Admin Intelligence Engine & Security Audit Trail
        </div>
      </div>
    `;

    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'sadikrtx3060@gmail.com',
        subject: `🚨 [FAKE ORDER ALERT] স্টাফ ${staffName} একটি অর্ডারকে ফেক অর্ডার চিহ্নিত করেছেন (#${order.id})`,
        html: emailHtml,
        type: 'fake_order_alert',
      }),
    });
  } catch (emailErr) {
    console.warn('[Email Fake Order Alert Warning]:', emailErr);
  }
}
