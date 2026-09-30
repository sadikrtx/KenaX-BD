import {
  EmailLog,
  EmailTemplate,
  EmailTemplateType,
  GmailAlertSettings,
  CustomerRecord,
  Order,
  Product,
  StaffUser,
} from '../types/index.ts';
import {
  getEmailTemplatesFromDB,
  saveEmailLogToDB,
  getGmailAlertSettingsFromDB,
} from './firebase';

export const DEFAULT_GMAIL_SETTINGS: GmailAlertSettings = {
  enabled: true,
  senderName: 'KenaX BD Official',
  senderEmail: 'sadikrtx3060@gmail.com',
  superAdminEmail: 'sadikrtx3060@gmail.com',
  staffAlertEmails: ['sadikrtx3060@gmail.com'],
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: 'sadikrtx3060@gmail.com',
  smtpPass: '',
  webhookUrl: 'https://script.google.com/macros/s/AKfycbw_UtesYomtnwD4Y7FrIlUW4RvhLvAj428-xJz3nuz4fdk_O0gIfBZVQN_JeDWuvJxduw/exec',
  notifyOnUserRegister: true,
  notifyOnAddToCart: true,
  notifyOnWishlist: true,
  notifyOnNewOrder: true,
  notifyOnStaffAudit: true,
  footerHotline: '+880 1700-123456 / +880 1911-987654',
  footerEmail: 'support@kenaxbd.com',
  footerAddress: 'House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh',
  footerTrustText: '✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery',
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  user_welcome: {
    id: 'user_welcome',
    title: 'Customer Welcome Email',
    banglaTitle: 'Customer Welcome Email',
    category: 'user',
    subject: '🎉 Welcome to KenaX BD! Your smart shopping journey begins',
    description: '',
    variables: ['customerName', 'customerEmail', 'customerMobile', 'loginUrl', 'supportPhone'],
    sampleData: {
      customerName: 'Mohammad Sadik',
      customerEmail: 'sadikrtx3060@gmail.com',
      customerMobile: '+880 1712-345678',
      loginUrl: 'https://kenaxbd.com/login',
      supportPhone: '+880 1800-KENAXBD',
    },
    enabled: true,
    headline: 'Hello, {{customerName}}! 👋',
    bodyMessage: 'Thank you for joining the KenaX BD community! Your new customer account has been created and activated successfully.',
    highlightNote: '⚡ Special Welcome Privilege: Enjoy fast express doorstep delivery and cash-on-delivery inspection on your first order!',
    buttonText: '🛍️ Start Shopping Now',
    buttonUrl: '{{loginUrl}}',
    footerNote: 'Need assistance? Reach our dedicated support desk at {{supportPhone}} or reply directly to this email.',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to KenaX BD</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; font-weight: 800;">
                KENA<span style="color: #10b981;">X</span> BD
              </h1>
              <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px; letter-spacing: 0.5px;">Smart Shopping • Better Living • 100% Genuine Tech</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                Hello, {{customerName}}! 👋
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for joining the KenaX BD community! Your new customer account has been created and activated successfully.
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Account Overview:</h3>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #334155;">
                  <tr><td width="35%" style="color: #64748b;">Full Name:</td><td style="font-weight: 600;">{{customerName}}</td></tr>
                  <tr><td style="color: #64748b;">Email Address:</td><td style="font-weight: 600;">{{customerEmail}}</td></tr>
                  <tr><td style="color: #64748b;">Phone:</td><td style="font-weight: 600;">{{customerMobile}}</td></tr>
                </table>
              </div>

              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 25px;">
                <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
                  ⚡ <strong>Special Welcome Privilege:</strong> Enjoy fast express doorstep delivery and cash-on-delivery inspection on your first order!
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="{{loginUrl}}" style="display: inline-block; background-color: #0b0f19; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; border: 1px solid #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                      🛍️ Start Shopping Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                Need assistance? Reach our dedicated support desk at <strong>{{supportPhone}}</strong> or reply directly to this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px 0;">KenaX BD • House #14, Road #07, Dhanmondi, Dhaka-1209, Bangladesh</p>
              <p style="margin: 0;">© 2026 KenaX BD. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_add_to_cart: {
    id: 'user_add_to_cart',
    title: 'Customer Add to Cart Notification',
    banglaTitle: 'Customer Add to Cart Notification',
    category: 'user',
    subject: '🛒 Item added to your shopping cart: {{productName}}',
    description: 'Sent when a customer adds a product to their bag, reminding them to complete their purchase before stock runs out.',
    variables: ['customerName', 'productName', 'productPrice', 'productQuantity', 'cartTotal', 'productImage', 'cartUrl'],
    sampleData: {
      customerName: 'Sadik Rahman',
      productName: 'Xiaomi Redmi Note 13 (8GB / 256GB)',
      productPrice: '৳22,999',
      productQuantity: '1',
      cartTotal: '৳22,999',
      productImage: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80',
      cartUrl: 'https://kenaxbd.com/checkout',
    },
    enabled: true,
    headline: 'Dear {{customerName}},',
    bodyMessage: 'You just added a featured item to your bag. Complete your order today before inventory runs low!',
    highlightNote: '💡 Cash-on-delivery available across all 64 districts in Bangladesh with 24-48 hr fast dispatch.',
    buttonText: 'Complete Checkout ➔',
    buttonUrl: '{{cartUrl}}',
    footerNote: 'Questions about this product or bulk pricing? Reply to this email or call our hotline.',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Item Added to Cart</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #0ea5e9;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; font-weight: 800;">
                KENA<span style="color: #0ea5e9;">X</span> BD
              </h1>
              <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">Your Shopping Cart Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 18px; font-weight: 700;">
                Dear {{customerName}},
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                You just added a featured item to your bag. Complete your order today before inventory runs low!
              </p>

              <!-- Product Card -->
              <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td width="100" valign="middle" align="center" style="border-right: 1px solid #e2e8f0; background-color: #ffffff; border-radius: 8px 0 0 8px;">
                    <img src="{{productImage}}" alt="{{productName}}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; display: block;" onerror="this.src='https://via.placeholder.com/80?text=KenaX';" />
                  </td>
                  <td valign="middle" style="padding-left: 16px;">
                    <span style="display: inline-block; background-color: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 4px;">In Stock</span>
                    <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 15px; font-weight: 700; line-height: 1.4;">{{productName}}</h3>
                    <p style="margin: 0; color: #64748b; font-size: 13px;">Quantity: <strong style="color: #0f172a;">{{productQuantity}} unit(s)</strong> • Unit Price: <strong style="color: #10b981; font-size: 15px;">{{productPrice}}</strong></p>
                  </td>
                </tr>
              </table>

              <!-- Total & Checkout CTA -->
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <span style="color: #64748b; font-size: 13px;">Cart Total:</span><br>
                      <strong style="color: #0f172a; font-size: 20px;">{{cartTotal}}</strong>
                    </td>
                    <td align="right">
                      <a href="{{cartUrl}}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 6px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
                        Complete Checkout ➔
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                💡 <em>Cash-on-delivery available across all 64 districts in Bangladesh with 24-48 hr fast dispatch.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              © 2026 KenaX BD • Smart Shopping, Better Living
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_order_placed: {
    id: 'user_order_placed',
    title: 'Customer Order Placed (Pending)',
    banglaTitle: 'Customer Order Placed (Pending)',
    category: 'user',
    subject: '📦 Order Received (#{{orderId}}) - Awaiting Confirmation - KenaX BD',
    description: 'Sent when an order is placed, informing customer that their order is pending verification by our team.',
    variables: ['orderId', 'customerName', 'totalAmount', 'paymentMethod', 'deliveryAddress', 'itemsSummary', 'orderTrackingUrl'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Sadik Rahman',
      totalAmount: '৳23,059',
      paymentMethod: 'Cash on Delivery (COD)',
      deliveryAddress: 'House 14, Road 7, Dhanmondi, Dhaka',
      itemsSummary: '1x Xiaomi Redmi Note 13, 1x Silicon Case',
      orderTrackingUrl: 'https://kenaxbd.com/track/KB-882194',
    },
    enabled: true,
    headline: 'Thank you {{customerName}}, your order has been received!',
    bodyMessage: 'We have registered order #{{orderId}}. Our fulfillment team is reviewing your details for express verification.',
    highlightNote: '✅ Cash on delivery available. Please keep your phone reachable for courier delivery confirmation.',
    buttonText: '🔎 Track Order Status',
    buttonUrl: '{{orderTrackingUrl}}',
    footerNote: 'Our customer verification executive may call your mobile to confirm your shipping details.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #f59e0b;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; font-weight: 800;">
                KENA<span style="color: #f59e0b;">X</span> BD
              </h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fbbf24; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                Status: Pending (Order Queue)
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 19px; font-weight: 700;">
                Thank you {{customerName}}, your order has been received!
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                We have registered order <strong>#{{orderId}}</strong>. Our verification desk will review your details shortly.
              </p>

              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #1e293b;">
                  <tr><td width="40%" style="color: #78350f; font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #b45309;">#{{orderId}}</td></tr>
                  <tr><td style="color: #78350f; font-weight: 600;">Total Payable:</td><td style="font-weight: 700; color: #0f172a; font-size: 16px;">{{totalAmount}}</td></tr>
                  <tr><td style="color: #78350f; font-weight: 600;">Payment Method:</td><td>{{paymentMethod}}</td></tr>
                  <tr><td style="color: #78350f; font-weight: 600;">Delivery Address:</td><td>{{deliveryAddress}}</td></tr>
                  <tr><td style="color: #78350f; font-weight: 600;">Items:</td><td>{{itemsSummary}}</td></tr>
                </table>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="{{orderTrackingUrl}}" style="display: inline-block; background-color: #0b0f19; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 600; border-radius: 8px; border: 1px solid #f59e0b;">
                      🔎 Track Order Status
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Our customer verification executive may call your mobile to confirm your shipping details.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              KenaX BD • Authentic Electronics &amp; Gadgets
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_order_delivered: {
    id: 'user_order_delivered',
    title: 'Customer Order Delivered & Review Request',
    banglaTitle: 'কাস্টমার অর্ডার ডেলিভারড ও ওয়েবসাইট রিভিউ রিকোয়েস্ট',
    category: 'user',
    subject: '🎉 Order Delivered (#{{orderId}}) - Please Leave a Review on KenaX BD',
    description: 'Sent when the order status is marked as Delivered, thanking the customer and inviting them to review their product on the website.',
    variables: ['orderId', 'customerName', 'totalAmount', 'reviewUrl', 'supportPhone'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Sadik Rahman',
      totalAmount: '৳2,350',
      reviewUrl: 'https://kenaxbd.ai.studio',
      supportPhone: '+880 1700-123456',
    },
    enabled: true,
    headline: 'Your order #{{orderId}} has been successfully delivered! 🎉',
    bodyMessage: 'Dear {{customerName}}, your package has been delivered to your destination. Thank you for choosing KenaX BD! We hope you love your new purchase.',
    highlightNote: '⭐ Please take 30 seconds to leave an authentic product review on our website: https://kenaxbd.ai.studio',
    buttonText: '⭐ Write a Review on Website',
    buttonUrl: 'https://kenaxbd.ai.studio',
    footerNote: 'If you faced any issue with your parcel or need a replacement, reach out to our support team right away.',
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Delivered - Review Request</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; font-weight: 800;">
                KENA<span style="color: #10b981;">X</span> BD
              </h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                🎉 Status: Delivered Successfully
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 19px; font-weight: 700;">
                Your order #{{orderId}} has been delivered! 🎉
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Dear <strong>{{customerName}}</strong>, your parcel has been safely delivered to your address. Thank you for shopping with <strong>KenaX BD</strong>!
              </p>

              <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #15803d;">
                  ⭐ We Value Your Feedback!
                </p>
                <p style="margin: 0 0 15px 0; font-size: 13px; color: #166534; line-height: 1.5;">
                  Please take 30 seconds to share your experience and leave a product review on our official website.
                </p>
                <a href="https://kenaxbd.ai.studio" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 26px; font-size: 14px; font-weight: 700; border-radius: 8px;">
                  ⭐ Leave a Review on Website (kenaxbd.ai.studio)
                </a>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Website: <a href="https://kenaxbd.ai.studio" style="color: #0ea5e9; font-weight: 600;">https://kenaxbd.ai.studio</a> | Support Hotline: {{supportPhone}}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              KenaX BD • Smart Shopping • Authentic Electronics &amp; Gadgets
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_order_confirmed: {
    id: 'user_order_confirmed',
    title: 'Customer Order Confirmed',
    banglaTitle: 'Customer Order Confirmed',
    category: 'user',
    subject: '✅ Order Confirmed (#{{orderId}}) - KenaX BD',
    description: 'Sent when admin or moderator approves the order, notifying customer of confirmed status and estimated dispatch.',
    variables: ['orderId', 'customerName', 'totalAmount', 'confirmedBy', 'estimatedDelivery', 'orderTrackingUrl'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Sadik Rahman',
      totalAmount: '৳23,059',
      confirmedBy: 'KenaX BD Verification Desk',
      estimatedDelivery: '24 to 48 hours',
      orderTrackingUrl: 'https://kenaxbd.com/track/KB-882194',
    },
    enabled: true,
    headline: 'Greetings {{customerName}}, your order is confirmed!',
    bodyMessage: 'Order #{{orderId}} has been verified and confirmed. Our logistics team is now preparing the items for safe packing.',
    highlightNote: '⏱️ Estimated Delivery: {{estimatedDelivery}} to your doorstep.',
    buttonText: 'Track Order Live ➔',
    buttonUrl: '{{orderTrackingUrl}}',
    footerNote: 'Need to change delivery address or contact number? Please reach out to our team immediately.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 1px; font-weight: 800;">
                KENA<span style="color: #10b981;">X</span> BD
              </h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                ✓ Status: Confirmed &amp; Approved
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 19px; font-weight: 700;">
                Greetings {{customerName}}, your order is confirmed!
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Order <strong>#{{orderId}}</strong> has been verified. Our logistics team is now preparing the items for safe packing.
              </p>

              <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #166534;">
                  <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
                  <tr><td style="font-weight: 600;">Payable Amount:</td><td style="font-weight: 700; color: #15803d; font-size: 16px;">{{totalAmount}}</td></tr>
                  <tr><td style="font-weight: 600;">Verified By:</td><td>{{confirmedBy}}</td></tr>
                  <tr><td style="font-weight: 600;">Estimated Delivery:</td><td>{{estimatedDelivery}}</td></tr>
                </table>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="{{orderTrackingUrl}}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      Track Order Live ➔
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              KenaX BD • Smart Shopping, Better Living
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_order_processing: {
    id: 'user_order_processing',
    title: 'Customer Order Processing',
    banglaTitle: 'Customer Order Processing',
    category: 'user',
    subject: '⚙️ Order is being packed & processed (#{{orderId}}) - KenaX BD',
    description: 'Sent when items are being barcode-scanned and packed at the fulfillment center.',
    variables: ['orderId', 'customerName', 'warehouseHub', 'orderTrackingUrl'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Sadik Rahman',
      warehouseHub: 'KenaX Central Fulfillment Hub (Dhaka)',
      orderTrackingUrl: 'https://kenaxbd.com/track/KB-882194',
    },
    enabled: true,
    headline: 'Dear {{customerName}},',
    bodyMessage: 'Your order #{{orderId}} is currently undergoing strict quality check and tamper-proof packaging at our fulfillment facility.',
    highlightNote: '🛡️ Every product undergoes 100% functional quality check before dispatch.',
    buttonText: 'View Package Journey ➔',
    buttonUrl: '{{orderTrackingUrl}}',
    footerNote: 'Your tracking number will be sent as soon as courier pickup is confirmed.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #6366f1;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">
                KENA<span style="color: #6366f1;">X</span> BD
              </h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(99, 102, 241, 0.2); border: 1px solid #6366f1; color: #a5b4fc; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                ⚙️ Status: Processing (Quality Check &amp; Packing)
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 19px; font-weight: 700;">
                Dear {{customerName}},
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Your order <strong>#{{orderId}}</strong> is currently undergoing strict quality check and tamper-proof packaging at our fulfillment facility.
              </p>

              <div style="background-color: #eef2ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #3730a3;">
                  <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
                  <tr><td style="font-weight: 600;">Fulfillment Hub:</td><td>{{warehouseHub}}</td></tr>
                  <tr><td style="font-weight: 600;">Current Step:</td><td>Barcode scanning &amp; security sealing</td></tr>
                </table>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{orderTrackingUrl}}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 700; border-radius: 8px;">
                      View Package Journey ➔
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              © 2026 KenaX BD
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  user_order_picked: {
    id: 'user_order_picked',
    title: 'Customer Order Picked / Shipped',
    banglaTitle: 'Customer Order Picked / Shipped',
    category: 'user',
    subject: '🚚 Your package is on the way (#{{orderId}}) - KenaX BD',
    description: 'Sent when the order is handed over to the courier service (Steadfast, Pathao, RedX) with tracking number.',
    variables: ['orderId', 'customerName', 'courierName', 'trackingNumber', 'estimatedDelivery', 'orderTrackingUrl'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Sadik Rahman',
      courierName: 'Steadfast Courier / RedX',
      trackingNumber: 'SF-99201482-BD',
      estimatedDelivery: 'Tomorrow by 6:00 PM',
      orderTrackingUrl: 'https://kenaxbd.com/track/KB-882194',
    },
    enabled: true,
    headline: 'Great news {{customerName}}! Your order is on the way.',
    bodyMessage: 'Order #{{orderId}} has been dispatched with our delivery partner.',
    highlightNote: '🚚 {{estimatedDelivery}}',
    buttonText: 'Track Courier Live ➔',
    buttonUrl: '{{orderTrackingUrl}}',
    footerNote: 'Please keep your phone active so the delivery rider can reach you.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; text-align: center; border-bottom: 3px solid #059669;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">
                KENA<span style="color: #10b981;">X</span> BD
              </h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                🚚 Status: Handed Over to Courier
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 10px 0; color: #0f172a; font-size: 19px; font-weight: 700;">
                Great news {{customerName}}! Your order is on the way.
              </h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Order <strong>#{{orderId}}</strong> has been dispatched with our delivery partner.
              </p>

              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-bottom: 25px;">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #065f46;">
                  <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
                  <tr><td style="font-weight: 600;">Courier Partner:</td><td style="font-weight: 700;">{{courierName}}</td></tr>
                  <tr><td style="font-weight: 600;">Tracking Number:</td><td style="font-family: monospace; font-weight: 700; color: #0284c7; font-size: 15px;">{{trackingNumber}}</td></tr>
                  <tr><td style="font-weight: 600;">Estimated Arrival:</td><td>{{estimatedDelivery}}</td></tr>
                </table>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td align="center">
                    <a href="{{orderTrackingUrl}}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 13px 28px; font-size: 14px; font-weight: 700; border-radius: 8px;">
                      Track Courier Live ➔
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Please keep your phone active so the delivery rider can reach you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              © 2026 KenaX BD
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  staff_new_user_registered: {
    id: 'staff_new_user_registered',
    title: 'Staff Alert: New Customer Registered',
    banglaTitle: 'Staff Alert: New Customer Registered',
    category: 'staff',
    subject: '👤 [New User Registered] {{userName}} joined KenaX BD',
    description: 'Dispatched to Super Admin, Admin, Moderator, and Manager when a new customer registers on the storefront.',
    variables: ['userName', 'userEmail', 'userPhone', 'registeredAt', 'adminDashboardUrl'],
    sampleData: {
      userName: 'Touhidul Islam',
      userEmail: 'touhid@gmail.com',
      userPhone: '+880 1898-765432',
      registeredAt: 'Mar 12, 2026, 10:30 PM',
      adminDashboardUrl: 'https://kenaxbd.com/admin/customers',
    },
    enabled: true,
    headline: 'New Customer Profile Created',
    bodyMessage: 'A new customer has successfully registered on the storefront with phone {{userPhone}} and email {{userEmail}}.',
    highlightNote: '⚡ Staff Notice: You can verify customer details or view their purchase history from the admin panel.',
    buttonText: 'View Customer Profile ➔',
    buttonUrl: '{{adminDashboardUrl}}',
    footerNote: 'Automated staff notification from KenaX BD Store Management.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="background-color: #1e293b; padding: 20px 25px; border-bottom: 3px solid #8b5cf6;">
              <h2 style="margin: 0; color: #ffffff; font-size: 18px;">
                🛡️ KenaX BD Staff Alert System
              </h2>
              <p style="margin: 4px 0 0 0; color: #a78bfa; font-size: 13px;">New Customer Profile Created</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <p style="margin: 0 0 15px 0; color: #1e293b; font-size: 15px;">
                A new customer has successfully registered on the storefront.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
                  <tr><td width="35%" style="color: #64748b;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{userName}}</td></tr>
                  <tr><td style="color: #64748b;">Email Address:</td><td style="font-weight: 600; color: #0284c7;">{{userEmail}}</td></tr>
                  <tr><td style="color: #64748b;">Phone Number:</td><td style="font-weight: 600; color: #0f172a;">{{userPhone}}</td></tr>
                  <tr><td style="color: #64748b;">Registration Time:</td><td style="color: #64748b;">{{registeredAt}}</td></tr>
                </table>
              </div>

              <a href="{{adminDashboardUrl}}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 6px;">
                View Customer Profile ➔
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  staff_cart_wishlist_alert: {
    id: 'staff_cart_wishlist_alert',
    title: 'Staff Alert: Cart / Wishlist Action',
    banglaTitle: 'Staff Alert: Cart / Wishlist Action',
    category: 'staff',
    subject: '⚡ [Buyer Intent Alert] {{customerName}} {{actionType}}: {{productName}}',
    description: 'Dispatched to staff when a potential buyer adds items to cart or wishlist for immediate conversion lead follow-up.',
    variables: ['customerName', 'customerPhone', 'actionType', 'productName', 'productPrice', 'cartTotal', 'adminDashboardUrl'],
    sampleData: {
      customerName: 'Sadik Rahman',
      customerPhone: '+880 1712-345678',
      actionType: 'Added to Cart',
      productName: 'Philips Digital Air Fryer HD9252',
      productPrice: '৳13,500',
      cartTotal: '৳13,500',
      adminDashboardUrl: 'https://kenaxbd.com/admin/cart-activities',
    },
    enabled: true,
    headline: 'Live Customer Activity Alert',
    bodyMessage: 'A potential buyer has performed an actionable storefront event on KenaX BD:',
    highlightNote: '💡 High-Conversion Tip: Contacting potential buyers within 10-15 minutes increases checkout completion by over 40%!',
    buttonText: 'Open Live Cart Monitor ➔',
    buttonUrl: '{{adminDashboardUrl}}',
    footerNote: 'Instant notification generated by KenaX BD Cart Activity Tracker.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 20px 25px; border-bottom: 3px solid #0284c7;">
              <h2 style="margin: 0; color: #ffffff; font-size: 18px;">
                🛒 KenaX BD • Real-time Buyer Intent Alert
              </h2>
              <p style="margin: 4px 0 0 0; color: #7dd3fc; font-size: 13px;">Cart &amp; Wishlist Live Tracker</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <p style="margin: 0 0 15px 0; color: #1e293b; font-size: 15px;">
                A potential buyer has performed an actionable storefront event:
              </p>

              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
                  <tr><td width="35%" style="color: #0369a1; font-weight: 600;">Action Type:</td><td style="font-weight: 700; color: #0284c7;">{{actionType}}</td></tr>
                  <tr><td style="color: #0369a1; font-weight: 600;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{customerName}}</td></tr>
                  <tr><td style="color: #0369a1; font-weight: 600;">Phone:</td><td style="font-weight: 600;">{{customerPhone}}</td></tr>
                  <tr><td style="color: #0369a1; font-weight: 600;">Product:</td><td style="font-weight: 700; color: #0f172a;">{{productName}}</td></tr>
                  <tr><td style="color: #0369a1; font-weight: 600;">Price:</td><td style="color: #10b981; font-weight: 700;">{{productPrice}}</td></tr>
                  <tr><td style="color: #0369a1; font-weight: 600;">Cart Total:</td><td style="font-weight: 700;">{{cartTotal}}</td></tr>
                </table>
              </div>

              <a href="{{adminDashboardUrl}}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 22px; font-size: 13px; font-weight: 600; border-radius: 6px;">
                Open Live Cart Monitor ➔
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  staff_new_order_alert: {
    id: 'staff_new_order_alert',
    title: 'Staff Alert: New Order Placed',
    banglaTitle: 'Staff Alert: New Order Placed',
    category: 'staff',
    subject: '🔥 [New Order Alert] New Order Received: #{{orderId}} ({{totalAmount}})',
    description: 'Notifies staff members (Moderator, Manager, Admin, Super Admin) when a new order is received for rapid dispatch.',
    variables: ['orderId', 'customerName', 'customerMobile', 'totalAmount', 'paymentMethod', 'deliveryZone', 'itemsList', 'adminOrderUrl'],
    sampleData: {
      orderId: 'KB-882194',
      customerName: 'Mohammad Touhid',
      customerMobile: '+880 1898-765432',
      totalAmount: '৳23,059',
      paymentMethod: 'Cash on Delivery (COD)',
      deliveryZone: 'Dhaka City (Inside Dhaka)',
      itemsList: '1x Xiaomi Redmi Note 13, 1x Silicon Cover',
      adminOrderUrl: 'https://kenaxbd.com/admin/orders',
    },
    enabled: true,
    headline: '🔔 New Order Received: #{{orderId}}',
    bodyMessage: 'A new customer order has been placed on KenaX BD. Please assign a delivery rider or confirm packaging immediately.',
    highlightNote: '⚡ Action Required: Please verify customer phone number {{customerMobile}} within 15 minutes.',
    buttonText: 'Review & Confirm Order ➔',
    buttonUrl: '{{adminOrderUrl}}',
    footerNote: 'Real-time order alert for Store Administrators, Managers, and Order Dispatchers.',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 20px 25px; border-bottom: 3px solid #ef4444;">
              <h2 style="margin: 0; color: #ffffff; font-size: 18px;">
                🔔 KenaX BD • New Order Alert!
              </h2>
              <p style="margin: 4px 0 0 0; color: #fca5a5; font-size: 13px;">Order #{{orderId}} requires review &amp; confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
                  <tr><td width="35%" style="color: #991b1b; font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #b91c1c; font-size: 16px;">#{{orderId}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{customerName}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Mobile:</td><td style="font-weight: 700; color: #0284c7;">{{customerMobile}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Order Amount:</td><td style="font-weight: 700; color: #15803d; font-size: 16px;">{{totalAmount}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Payment:</td><td>{{paymentMethod}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Delivery Zone:</td><td>{{deliveryZone}}</td></tr>
                  <tr><td style="color: #991b1b; font-weight: 600;">Items:</td><td>{{itemsList}}</td></tr>
                </table>
              </div>

              <a href="{{adminOrderUrl}}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 26px; font-size: 14px; font-weight: 700; border-radius: 6px;">
                Review &amp; Confirm Order ➔
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  super_admin_audit_alert: {
    id: 'super_admin_audit_alert',
    title: 'Super Admin: Staff Action Audit Alert',
    banglaTitle: 'Super Admin: Staff Action Audit Alert',
    category: 'super_admin',
    subject: '🛡️ [Super Admin Audit] {{actorRole}} {{actorName}}: {{actionTitle}}',
    description: 'Staff activity audit notifications dispatched in real-time to Super Admin.',
    variables: ['actorName', 'actorRole', 'actorId', 'actionTitle', 'actionDetails', 'targetId', 'timestamp', 'superAdminEmail'],
    sampleData: {
      actorName: 'Ariful Islam',
      actorRole: 'Moderator',
      actorId: 'staff-mod-04',
      actionTitle: 'Order #KB-882194 status changed to Confirmed',
      actionDetails: 'Order status updated from Pending to Confirmed. Courier Steadfast assigned.',
      targetId: 'KB-882194',
      timestamp: 'Mar 12, 2026, 11:15 PM',
      superAdminEmail: 'sadikrtx3060@gmail.com',
    },
    enabled: true,
    headline: 'Security & Operational Audit Alert',
    bodyMessage: 'Staff member {{actorName}} ({{actorRole}}, ID: {{actorId}}) executed action "{{actionTitle}}" on target {{targetId}}:',
    highlightNote: '🛡️ This security audit report is automatically dispatched and encrypted to Super Admin inbox sadikrtx3060@gmail.com.',
    buttonText: 'Review System Activity Logs ➔',
    buttonUrl: '{{adminDashboardUrl}}',
    footerNote: 'KenaX BD Admin Governance • sadikrtx3060@gmail.com',
    htmlContent: `<!DOCTYPE html>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0b0f19; padding: 25px 30px; border-bottom: 3px solid #a855f7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">
                      KENA<span style="color: #a855f7;">X</span> BD
                    </h2>
                    <p style="margin: 4px 0 0 0; color: #d8b4fe; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      👑 Super Admin Audit Trail &amp; Real-time Monitor
                    </p>
                  </td>
                  <td align="right">
                    <span style="background-color: #7e22ce; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">
                      High Security
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-left: 4px solid #a855f7; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #6b21a8; font-size: 13px; font-weight: 700; text-transform: uppercase;">Action Summary:</p>
                <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 17px; font-weight: 700;">{{actionTitle}}</h3>
                <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">{{actionDetails}}</p>
              </div>

              <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Staff &amp; System Log:</h4>
              <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; margin-bottom: 24px;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td width="35%" style="color: #64748b; font-weight: 600;">Staff Member:</td>
                  <td style="font-weight: 700; color: #0f172a;">{{actorName}}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Staff Role:</td>
                  <td><strong style="color: #7e22ce; background-color: #f3e8ff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{{actorRole}}</strong> (ID: {{actorId}})</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Target Reference:</td>
                  <td style="font-family: monospace; font-weight: 700; color: #0284c7;">{{targetId}}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Timestamp:</td>
                  <td style="color: #475569;">{{timestamp}}</td>
                </tr>
              </table>

              <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #64748b; line-height: 1.4;">
                🛡️ This security audit report is automatically dispatched and encrypted to Super Admin inbox <strong>sadikrtx3060@gmail.com</strong>.
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              KenaX BD Admin Governance • sadikrtx3060@gmail.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
};

// ============================================================================
// OFFICIAL EMBEDDED VECTOR BRANDING (OFFICIAL LOGO & VERIFIED SEAL WITH SIGNATURE)
// ============================================================================

export const OFFICIAL_KENAX_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 105" width="168" height="71" style="display: block; margin: 0 auto; max-width: 168px; height: auto;" fill="none">
  <defs>
    <linearGradient id="kenaxXGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0066FF" />
      <stop offset="50%" stop-color="#00A8FF" />
      <stop offset="100%" stop-color="#00E5FF" />
    </linearGradient>
    <linearGradient id="swooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
  </defs>
  <g transform="translate(0, 0)">
    <line x1="86" y1="12" x2="104" y2="12" stroke="#00A8FF" stroke-width="2.6" stroke-linecap="round" opacity="0.95" />
    <line x1="76" y1="18.5" x2="101" y2="18.5" stroke="#00A8FF" stroke-width="3" stroke-linecap="round" />
    <line x1="84" y1="25" x2="104" y2="25" stroke="#00A8FF" stroke-width="2.6" stroke-linecap="round" opacity="0.95" />
    <path d="M106 8 L114 8 L121 25 L150 25 L155 12 L117 12" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <line x1="119" y1="18.5" x2="152" y2="18.5" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="126" cy="31" r="3.6" fill="#00A8FF" stroke="#0f172a" stroke-width="1.6" />
    <circle cx="145" cy="31" r="3.6" fill="#00A8FF" stroke="#0f172a" stroke-width="1.6" />
  </g>
  <g transform="translate(24, 73)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="48" font-weight="900" letter-spacing="-1.8" fill="#0f172a">Kena</text>
    <g transform="translate(124, -39)">
      <path d="M6 3 L19 3 L32 24 L45 3 L58 3 L39 29 L60 48 L47 48 L32 34 L17 48 L4 48 L25 27 Z" fill="url(#kenaxXGrad)" />
      <path d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z" fill="url(#swooshGrad)" />
      <path d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z" fill="#FFFFFF" opacity="0.9" />
    </g>
  </g>
  <g transform="translate(0, 95)">
    <line x1="72" y1="0" x2="105" y2="0" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
    <text x="125" y="3.5" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="16" font-weight="900" letter-spacing="2.5" fill="#0f172a">BD</text>
    <line x1="145" y1="0" x2="178" y2="0" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
  </g>
</svg>`;

export const OFFICIAL_KENAX_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="88" height="88" style="display: block; width: 88px; height: 88px; border-radius: 50%; box-shadow: 0 4px 12px rgba(3, 43, 105, 0.15);">
  <defs>
    <linearGradient id="sealXGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0066FF" />
      <stop offset="50%" stop-color="#00A8FF" />
      <stop offset="100%" stop-color="#00E5FF" />
    </linearGradient>
    <linearGradient id="sealSwooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
    <linearGradient id="signatureInkGrad" x1="0%" y1="0%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#003580" />
      <stop offset="40%" stop-color="#0056b3" />
      <stop offset="80%" stop-color="#023e8a" />
      <stop offset="100%" stop-color="#00296b" />
    </linearGradient>
    <path id="sealTopArc" d="M 68,250 A 182,182 0 0,1 432,250" />
    <path id="sealBottomArc" d="M 432,250 A 182,182 0 0,1 68,250" />
  </defs>
  <circle cx="250" cy="250" r="238" stroke="#032b69" fill="none" stroke-width="7" />
  <circle cx="250" cy="250" r="226" stroke="#032b69" fill="none" stroke-width="2.5" />
  <circle cx="250" cy="250" r="172" stroke="#032b69" fill="none" stroke-width="2" />
  <circle cx="250" cy="250" r="166" stroke="#032b69" fill="none" stroke-width="1.2" stroke-dasharray="4,4" />
  <text text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="900" font-size="25" letter-spacing="8.5" fill="#032b69">
    <textPath href="#sealTopArc" startOffset="50%">★ KENAX BD OFFICIAL SEAL ★</textPath>
  </text>
  <text text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="19" letter-spacing="5.5" fill="#032b69">
    <textPath href="#sealBottomArc" startOffset="50%">★ AUTHORIZED &amp; VERIFIED ★</textPath>
  </text>
  <g id="seal-official-kenax-logo" transform="translate(250, 222) scale(0.82)">
    <g transform="translate(-125, -60)">
      <line x1="86" y1="12" x2="104" y2="12" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
      <line x1="78" y1="18.5" x2="101" y2="18.5" stroke="#00A8FF" stroke-width="3.2" stroke-linecap="round" />
      <line x1="84" y1="25" x2="104" y2="25" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
      <path d="M106 8 L114 8 L121 25 L150 25 L155 12 L117 12" stroke="#032b69" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      <line x1="119" y1="18.5" x2="152" y2="18.5" stroke="#032b69" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="126" cy="31" r="3.6" fill="#00A8FF" stroke="#032b69" stroke-width="1.6" />
      <circle cx="145" cy="31" r="3.6" fill="#00A8FF" stroke="#032b69" stroke-width="1.6" />
    </g>
    <g transform="translate(-101, 10)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="44" font-weight="900" letter-spacing="-1.5" fill="#032b69">Kena</text>
      <g transform="translate(114, -36)">
        <path d="M6 3 L19 3 L32 24 L45 3 L58 3 L39 29 L60 48 L47 48 L32 34 L17 48 L4 48 L25 27 Z" fill="url(#sealXGrad)" />
        <path d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z" fill="url(#sealSwooshGrad)" />
        <path d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z" fill="#FFFFFF" opacity="0.9" />
      </g>
    </g>
    <g transform="translate(-125, 32)">
      <line x1="72" y1="0" x2="105" y2="0" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
      <text x="125" y="3.5" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif" font-size="16" font-weight="900" letter-spacing="2.5" fill="#032b69">BD</text>
      <line x1="145" y1="0" x2="178" y2="0" stroke="#00A8FF" stroke-width="2.8" stroke-linecap="round" />
    </g>
  </g>
  <g id="sadik-overlapping-signature" transform="translate(250, 226) rotate(-7)">
    <g opacity="0.9" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round">
      <path d="M -118, 14 C -128, 8, -136, -6, -126, -28 C -118, -46, -94, -50, -90, -30 C -86, -12, -112, 10, -94, 20 C -80, 26, -66, 12, -70, -6" fill="none" stroke-width="6.5" />
      <path d="M -70, -6 C -64, -16, -48, -16, -48, -4 C -48, 8, -66, 10, -56, 16 C -50, 18, -42, 12, -40, 4" fill="none" stroke-width="5.8" />
      <path d="M -40, 4 C -36, -10, -24, -12, -22, -2 C -20, 8, -36, 14, -22, 16 C -18, 16, -16, 6, -14, -36 C -13, -46, -8, -44, -10, -32 L -10, 14 C -10, 18, -2, 16, 0, 8" fill="none" stroke-width="5.8" />
      <path d="M 0, 8 C 6, -4, 12, -8, 14, -2 L 14, 14 C 14, 18, 20, 18, 24, 10" fill="none" stroke-width="5.5" />
      <ellipse cx="16" cy="-18" rx="4.2" ry="4.8" fill="#ffffff" />
      <path d="M 24, 10 C 28, -6, 34, -30, 38, -40 C 41, -48, 46, -46, 44, -32 L 40, 14 M 40, 0 C 47, -8, 56, -4, 50, 6 C 47, 10, 58, 16, 76, 18" fill="none" stroke-width="5.8" />
      <path d="M 76, 18 C 98, 20, 114, 10, 108, -6 C 100, -24, 72, -4, 30, 24 C -18, 40, -74, 38, -124, 28 C -136, 26, -144, 20, -138, 16 C -132, 12, -102, 18, -60, 26 C 12, 34, 84, 28, 130, 24" fill="none" stroke-width="5.5" />
    </g>
    <path d="M -118, 14 C -128, 8, -136, -6, -126, -28 C -118, -46, -94, -50, -90, -30 C -86, -12, -112, 10, -94, 20 C -80, 26, -66, 12, -70, -6" fill="none" stroke="url(#signatureInkGrad)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M -70, -6 C -64, -16, -48, -16, -48, -4 C -48, 8, -66, 10, -56, 16 C -50, 18, -42, 12, -40, 4" fill="none" stroke="url(#signatureInkGrad)" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M -40, 4 C -36, -10, -24, -12, -22, -2 C -20, 8, -36, 14, -22, 16 C -18, 16, -16, 6, -14, -36 C -13, -46, -8, -44, -10, -32 L -10, 14 C -10, 18, -2, 16, 0, 8" fill="none" stroke="url(#signatureInkGrad)" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 0, 8 C 6, -4, 12, -8, 14, -2 L 14, 14 C 14, 18, 20, 18, 24, 10" fill="none" stroke="url(#signatureInkGrad)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" />
    <ellipse cx="16" cy="-18" rx="2.8" ry="3.6" transform="rotate(-15 16 -18)" fill="#003580" />
    <path d="M 24, 10 C 28, -6, 34, -30, 38, -40 C 41, -48, 46, -46, 44, -32 L 40, 14 M 40, 0 C 47, -8, 56, -4, 50, 6 C 47, 10, 58, 16, 76, 18" fill="none" stroke="url(#signatureInkGrad)" stroke-width="3.9" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 76, 18 C 98, 20, 114, 10, 108, -6 C 100, -24, 72, -4, 30, 24 C -18, 40, -74, 38, -124, 28 C -136, 26, -144, 20, -138, 16 C -132, 12, -102, 18, -60, 26 C 12, 34, 84, 28, 130, 24" fill="none" stroke="#003580" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="138" cy="23.5" r="3.2" fill="#003580" />
  </g>
  <g transform="translate(250, 322)">
    <line x1="-90" y1="-5" x2="90" y2="-5" stroke="#032b69" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.6" />
    <text text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="800" font-size="11" fill="#032b69" letter-spacing="2">OFFICIALLY SIGNED &amp; SEALED • SADIK</text>
    <text y="14" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-weight="700" font-size="10" fill="#0284c7" letter-spacing="1.5">KENAX BD EXECUTIVE AUTHORITY</text>
    <text y="28" text-anchor="middle" font-size="9" fill="#032b69" letter-spacing="4">★ ★ ★ ★ ★</text>
  </g>
</svg>`;

// Dynamic HTML Email Generator from Editable Template Fields
export function generateEmailHtml(
  template: EmailTemplate,
  options?: {
    footerHotline?: string;
    footerEmail?: string;
    footerAddress?: string;
    footerTrustText?: string;
  }
): string {
  const headline = template.headline || template.title || 'Notification';
  const bodyMessage = (template.bodyMessage || '').replace(/\n/g, '<br>');
  const highlightNote = template.highlightNote || '';
  const buttonText = template.buttonText || '';
  const buttonUrl = template.buttonUrl || '#';
  const footerNote = template.footerNote || 'Need assistance? Contact our 24/7 customer care desk.';

  // Resolve dynamic email footer contacts from active Gmail settings or options
  let activeSettings = DEFAULT_GMAIL_SETTINGS;
  try {
    const cached = localStorage.getItem('kenax_gmail_alerts_settings');
    if (cached) {
      activeSettings = { ...DEFAULT_GMAIL_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {}

  const footerHotline =
    options?.footerHotline !== undefined ? options.footerHotline : (activeSettings.footerHotline ?? '+880 1700-123456 / +880 1911-987654');
  const footerEmail =
    options?.footerEmail !== undefined ? options.footerEmail : (activeSettings.footerEmail ?? 'support@kenaxbd.com');
  const footerAddress =
    options?.footerAddress !== undefined ? options.footerAddress : (activeSettings.footerAddress ?? 'House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh');
  const footerTrustText =
    options?.footerTrustText !== undefined
      ? options.footerTrustText
      : (activeSettings.footerTrustText ?? '✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery');

  let accentColor = '#10b981';
  let statusBadge = '';
  if (template.id === 'user_add_to_cart') {
    accentColor = '#0ea5e9';
    statusBadge = 'Shopping Bag Update';
  } else if (template.id === 'user_order_placed') {
    accentColor = '#f59e0b';
    statusBadge = 'Status: Pending (Order Queue)';
  } else if (template.id === 'user_order_confirmed') {
    accentColor = '#10b981';
    statusBadge = '✓ Status: Confirmed & Approved';
  } else if (template.id === 'user_order_processing') {
    accentColor = '#6366f1';
    statusBadge = '⚙️ Status: Processing (Quality Check & Packing)';
  } else if (template.id === 'user_order_picked') {
    accentColor = '#059669';
    statusBadge = '🚚 Status: Handed Over to Courier';
  } else if (template.id === 'staff_new_user_registered') {
    accentColor = '#8b5cf6';
    statusBadge = 'New Customer Profile';
  } else if (template.id === 'staff_cart_wishlist_alert') {
    accentColor = '#0284c7';
    statusBadge = 'Cart & Wishlist Live Tracker';
  } else if (template.id === 'staff_new_order_alert') {
    accentColor = '#ef4444';
    statusBadge = 'Order #{{orderId}} requires review & confirmation';
  } else if (template.id === 'super_admin_audit_alert') {
    accentColor = '#a855f7';
    statusBadge = 'High Security Audit Trail';
  }

  let detailsCardHtml = '';
  if (template.id === 'user_welcome') {
    detailsCardHtml = `
      <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Account Overview:</h3>
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #334155;">
          <tr><td width="35%" style="color: #64748b;">Full Name:</td><td style="font-weight: 600;">{{customerName}}</td></tr>
          <tr><td style="color: #64748b;">Email Address:</td><td style="font-weight: 600;">{{customerEmail}}</td></tr>
          <tr><td style="color: #64748b;">Phone:</td><td style="font-weight: 600;">{{customerMobile}}</td></tr>
        </table>
      </div>`;
  } else if (template.id === 'user_add_to_cart') {
    detailsCardHtml = `
      <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px;">
        <tr>
          <td width="100" valign="middle" align="center" style="border-right: 1px solid #e2e8f0; background-color: #ffffff; border-radius: 8px 0 0 8px;">
            <img src="{{productImage}}" alt="{{productName}}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; display: block; border: 0;" onerror="this.src='https://via.placeholder.com/80?text=KenaX';" />
          </td>
          <td valign="middle" style="padding-left: 16px;">
            <span style="display: inline-block; background-color: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 4px;">In Stock</span>
            <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 15px; font-weight: 700; line-height: 1.4;">{{productName}}</h3>
            <p style="margin: 0; color: #64748b; font-size: 13px;">Quantity: <strong style="color: #0f172a;">{{productQuantity}} unit(s)</strong> • Unit Price: <strong style="color: #10b981; font-size: 15px;">{{productPrice}}</strong></p>
          </td>
        </tr>
      </table>
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left">
              <span style="color: #64748b; font-size: 13px;">Cart Total:</span><br>
              <strong style="color: #0f172a; font-size: 20px;">{{cartTotal}}</strong>
            </td>
          </tr>
        </table>
      </div>`;
  } else if (template.id === 'user_order_placed') {
    detailsCardHtml = `
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #1e293b;">
          <tr><td width="40%" style="color: #78350f; font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #b45309;">#{{orderId}}</td></tr>
          <tr><td style="color: #78350f; font-weight: 600;">Total Payable:</td><td style="font-weight: 700; color: #0f172a; font-size: 16px;">{{totalAmount}}</td></tr>
          <tr><td style="color: #78350f; font-weight: 600;">Payment Method:</td><td>{{paymentMethod}}</td></tr>
          <tr><td style="color: #78350f; font-weight: 600;">Delivery Address:</td><td>{{deliveryAddress}}</td></tr>
          <tr><td style="color: #78350f; font-weight: 600;">Items:</td><td>{{itemsSummary}}</td></tr>
        </table>
      </div>

      <!-- Telegram Bot Subscription Banner -->
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 10px; padding: 18px; color: #ffffff; text-align: center; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #ffffff;">🤖 Subscribe for Live Telegram Push Updates</h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #e0f2fe; line-height: 1.4;">Get real-time notification alerts on Telegram when your parcel is confirmed, packed, and handed to courier!</p>
        <a href="https://t.me/KenaX_Official_Bot?start=order_{{orderId}}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0284c7; font-weight: 800; padding: 9px 20px; border-radius: 8px; text-decoration: none; font-size: 13px;">
          📲 Connect Telegram Bot Now
        </a>
      </div>`;
  } else if (template.id === 'user_order_confirmed') {
    detailsCardHtml = `
      <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #166534;">
          <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
          <tr><td style="font-weight: 600;">Payable Amount:</td><td style="font-weight: 700; color: #15803d; font-size: 16px;">{{totalAmount}}</td></tr>
          <tr><td style="font-weight: 600;">Verified By:</td><td>{{confirmedBy}}</td></tr>
          <tr><td style="font-weight: 600;">Estimated Delivery:</td><td>{{estimatedDelivery}}</td></tr>
        </table>
      </div>

      <!-- Telegram Bot Subscription Banner -->
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 10px; padding: 18px; color: #ffffff; text-align: center; margin-bottom: 25px;">
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #ffffff;">🤖 Live Tracking on Telegram Bot</h3>
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #e0f2fe; line-height: 1.4;">Subscribe to receive real-time courier dispatch notifications directly in your Telegram chat.</p>
        <a href="https://t.me/KenaX_Official_Bot?start=order_{{orderId}}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0284c7; font-weight: 800; padding: 9px 20px; border-radius: 8px; text-decoration: none; font-size: 13px;">
          📲 Track Order on Telegram
        </a>
      </div>`;
  } else if (template.id === 'user_order_processing') {
    detailsCardHtml = `
      <div style="background-color: #eef2ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #3730a3;">
          <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
          <tr><td style="font-weight: 600;">Fulfillment Hub:</td><td>{{warehouseHub}}</td></tr>
          <tr><td style="font-weight: 600;">Current Step:</td><td>Barcode scanning &amp; security sealing</td></tr>
        </table>
      </div>

      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 10px; padding: 18px; color: #ffffff; text-align: center; margin-bottom: 25px;">
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #ffffff;">🤖 Get Courier Handover Alerts on Telegram</h3>
        <a href="https://t.me/KenaX_Official_Bot?start=order_{{orderId}}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0284c7; font-weight: 800; padding: 9px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; margin-top: 8px;">
          📲 Subscribe on Telegram Bot
        </a>
      </div>`;
  } else if (template.id === 'user_order_picked') {
    detailsCardHtml = `
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #065f46;">
          <tr><td width="40%" style="font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #0f172a;">#{{orderId}}</td></tr>
          <tr><td style="font-weight: 600;">Courier Partner:</td><td style="font-weight: 700;">{{courierName}}</td></tr>
          <tr><td style="font-weight: 600;">Tracking Number:</td><td style="font-family: monospace; font-weight: 700; color: #0284c7; font-size: 15px;">{{trackingNumber}}</td></tr>
          <tr><td style="font-weight: 600;">Estimated Arrival:</td><td>{{estimatedDelivery}}</td></tr>
        </table>
      </div>

      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 10px; padding: 18px; color: #ffffff; text-align: center; margin-bottom: 25px;">
        <h3 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 800; color: #ffffff;">🤖 Live Courier Tracking via Telegram</h3>
        <a href="https://t.me/KenaX_Official_Bot?start=order_{{orderId}}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0284c7; font-weight: 800; padding: 9px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; margin-top: 8px;">
          📲 Open Telegram Live Tracking
        </a>
      </div>`;
  } else if (template.id === 'staff_new_user_registered') {
    detailsCardHtml = `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          <tr><td width="35%" style="color: #64748b;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{userName}}</td></tr>
          <tr><td style="color: #64748b;">Email Address:</td><td style="font-weight: 600; color: #0284c7;">{{userEmail}}</td></tr>
          <tr><td style="color: #64748b;">Phone Number:</td><td style="font-weight: 600; color: #0f172a;">{{userPhone}}</td></tr>
          <tr><td style="color: #64748b;">Registration Time:</td><td style="color: #64748b;">{{registeredAt}}</td></tr>
        </table>
      </div>`;
  } else if (template.id === 'staff_cart_wishlist_alert') {
    detailsCardHtml = `
      <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          <tr><td width="35%" style="color: #0369a1; font-weight: 600;">Action Type:</td><td style="font-weight: 700; color: #0284c7;">{{actionType}}</td></tr>
          <tr><td style="color: #0369a1; font-weight: 600;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{customerName}}</td></tr>
          <tr><td style="color: #0369a1; font-weight: 600;">Phone:</td><td style="font-weight: 600;">{{customerPhone}}</td></tr>
          <tr><td style="color: #0369a1; font-weight: 600;">Product:</td><td style="font-weight: 700; color: #0f172a;">{{productName}}</td></tr>
          <tr><td style="color: #0369a1; font-weight: 600;">Price:</td><td style="color: #10b981; font-weight: 700;">{{productPrice}}</td></tr>
          <tr><td style="color: #0369a1; font-weight: 600;">Cart Total:</td><td style="font-weight: 700;">{{cartTotal}}</td></tr>
        </table>
      </div>`;
  } else if (template.id === 'staff_new_order_alert') {
    detailsCardHtml = `
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <table width="100%" cellpadding="5" cellspacing="0" style="font-size: 14px;">
          <tr><td width="35%" style="color: #991b1b; font-weight: 600;">Order ID:</td><td style="font-weight: 700; color: #b91c1c; font-size: 16px;">#{{orderId}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Customer Name:</td><td style="font-weight: 700; color: #0f172a;">{{customerName}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Mobile:</td><td style="font-weight: 700; color: #0284c7;">{{customerMobile}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Order Amount:</td><td style="font-weight: 700; color: #15803d; font-size: 16px;">{{totalAmount}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Payment:</td><td>{{paymentMethod}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Delivery Zone:</td><td>{{deliveryZone}}</td></tr>
          <tr><td style="color: #991b1b; font-weight: 600;">Items:</td><td>{{itemsList}}</td></tr>
        </table>
      </div>`;
  } else if (template.id === 'super_admin_audit_alert') {
    detailsCardHtml = `
      <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-left: 4px solid #a855f7; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; color: #6b21a8; font-size: 13px; font-weight: 700; text-transform: uppercase;">Action Summary:</p>
        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 17px; font-weight: 700;">{{actionTitle}}</h3>
        <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">{{actionDetails}}</p>
      </div>
      <h4 style="margin: 0 0 12px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Staff &amp; System Log:</h4>
      <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; margin-bottom: 24px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td width="35%" style="color: #64748b; font-weight: 600;">Staff Member:</td>
          <td style="font-weight: 700; color: #0f172a;">{{actorName}}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="color: #64748b; font-weight: 600;">Staff Role:</td>
          <td><strong style="color: #7e22ce; background-color: #f3e8ff; padding: 2px 8px; border-radius: 4px; font-size: 12px;">{{actorRole}}</strong> (ID: {{actorId}})</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="color: #64748b; font-weight: 600;">Target Reference:</td>
          <td style="font-family: monospace; font-weight: 700; color: #0284c7;">{{targetId}}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-weight: 600;">Timestamp:</td>
          <td style="color: #475569;">{{timestamp}}</td>
        </tr>
      </table>`;
  }

  const highlightBoxHtml = highlightNote ? `
    <div style="background-color: #f8fafc; border-left: 4px solid ${accentColor}; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px;">
      <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.5;">${highlightNote.replace(/\n/g, '<br>')}</p>
    </div>` : '';

  const targetUrl = buttonUrl || 'https://kenaxbd.ai.studio';
  const buttonHtml = buttonText ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
      <tr>
        <td align="center">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; padding: 13px 30px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ${buttonText}
          </a>
        </td>
      </tr>
    </table>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; padding: 25px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.4); border: 1px solid #1e293b;">
          
          <!-- ========================================================= -->
          <!-- 1. OFFICIAL KENAX BD STORE HEADER (Exact Store Footer Logo) -->
          <!-- ========================================================= -->
          <tr>
            <td style="background-color: #060b17; padding: 30px 24px 22px 24px; text-align: center; border-bottom: 3px solid ${accentColor};">
              <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                
                <!-- Speed Cart Graphic Representation (Right-Facing Speed Vector) -->
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <svg width="84" height="28" viewBox="0 0 100 34" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
                      <!-- 3 Cyan Speed lines trailing behind on the left -->
                      <line x1="8" y1="9" x2="24" y2="9" stroke="#00A8FF" stroke-width="2.5" stroke-linecap="round"/>
                      <line x1="2" y1="15" x2="21" y2="15" stroke="#00A8FF" stroke-width="3" stroke-linecap="round"/>
                      <line x1="6" y1="21" x2="24" y2="21" stroke="#00A8FF" stroke-width="2.5" stroke-linecap="round"/>
                      <!-- White Basket & Wheels Frame (Moving Right) -->
                      <path d="M26 6 L34 6 L41 23 L70 23 L75 10 L37 10" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="39" y1="16" x2="72" y2="16" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
                      <circle cx="46" cy="29" r="3.2" fill="#00A8FF" stroke="#FFFFFF" stroke-width="1.5"/>
                      <circle cx="65" cy="29" r="3.2" fill="#00A8FF" stroke="#FFFFFF" stroke-width="1.5"/>
                    </svg>
                  </td>
                </tr>

                <!-- KenaX BD Logo Wordmark -->
                <tr>
                  <td align="center" style="padding-bottom: 3px;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', 'Helvetica Neue', Arial, sans-serif; font-size: 34px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; line-height: 1.1;">
                      Kena<span style="color: #00E5FF; text-shadow: 0 0 12px rgba(0, 229, 255, 0.65);">X</span>
                    </span>
                  </td>
                </tr>

                <!-- — BD — Accent Bar -->
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 8px;">
                          <span style="display: block; width: 26px; height: 2.5px; background-color: #00A8FF; border-radius: 2px;"></span>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #00A8FF; text-transform: uppercase;">
                            BD
                          </span>
                        </td>
                        <td style="vertical-align: middle; padding-left: 8px;">
                          <span style="display: block; width: 26px; height: 2.5px; background-color: #00A8FF; border-radius: 2px;"></span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Slogan & Category Tag -->
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;">
                      Smart Shopping • Better Living • 100% Genuine
                    </p>
                    ${statusBadge ? `
                    <div style="display: inline-block; margin-top: 10px; background-color: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #f1f5f9; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.5px;">
                      ${statusBadge}
                    </div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ========================================================= -->
          <!-- 2. MAIN CONTENT BODY AREA -->
          <!-- ========================================================= -->
          <tr>
            <td style="padding: 35px 30px; background-color: #ffffff;">
              ${headline ? `<h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${headline}</h2>` : ''}
              ${bodyMessage ? `<p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">${bodyMessage}</p>` : ''}
              ${detailsCardHtml}
              ${highlightBoxHtml}
              ${buttonHtml}
              ${footerNote ? `
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 18px;">
                ${footerNote.replace(/\n/g, '<br>')}
              </p>` : ''}
            </td>
          </tr>

          <!-- ========================================================= -->
          <!-- 3. OFFICIAL FOOTER WITH STORE CONTACTS & TRUST ASSURANCES -->
          <!-- ========================================================= -->
          <tr>
            <td style="background-color: #060b17; padding: 26px 24px; text-align: center; border-top: 1px solid #1e293b; color: #94a3b8; font-size: 12px;">
              
              <!-- Store Contacts (Dynamic, Editable & Deletable) -->
              <table align="center" cellpadding="3" cellspacing="0" style="margin: 0 auto 12px auto; font-size: 12px; color: #cbd5e1; max-width: 520px;">
                ${(footerHotline || footerEmail) ? `
                <tr>
                  <td align="center">
                    ${footerHotline ? `📞 <strong>Hotline:</strong> ${footerHotline}` : ''}
                    ${(footerHotline && footerEmail) ? ` &nbsp;|&nbsp; ` : ''}
                    ${footerEmail ? `✉️ <strong>Email:</strong> ${footerEmail}` : ''}
                  </td>
                </tr>` : ''}
                ${footerAddress ? `
                <tr>
                  <td align="center" style="color: #94a3b8; font-size: 11px;">
                    📍 <strong>Store Address:</strong> ${footerAddress}
                  </td>
                </tr>` : ''}
              </table>

              <!-- Trust Assurances & Copyright -->
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 12px; margin-top: 6px;">
                ${footerTrustText ? `
                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 0.6px; text-transform: uppercase;">
                  ${footerTrustText}
                </p>` : ''}
                <p style="margin: 0; font-size: 11px; color: #64748b;">
                  © 2026 KenaX BD. All rights reserved. Smart Shopping, Better Living.
                </p>
              </div>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Ensure all default email templates are initialized with official branding
try {
  for (const key of Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateType[]) {
    DEFAULT_EMAIL_TEMPLATES[key].htmlContent = generateEmailHtml(DEFAULT_EMAIL_TEMPLATES[key]);
  }
} catch (e) {
  console.warn('[EmailService] Failed to initialize default template html:', e);
}

// Variable replacement engine
export function renderEmailTemplate(template: EmailTemplate, data: Record<string, any>): { subject: string; html: string; text: string } {
  let subject = template.subject || '';
  let html = template.htmlContent;
  
  // Guarantee WhatsApp footer and store KenaX BD logo header are active
  if (
    !html ||
    html.includes('cid:kenax-seal') ||
    html.includes('cid:kenax-logo') ||
    html.includes('kenax-seal') ||
    html.includes('Official Verified Seal') ||
    !html.includes('WhatsApp') ||
    !html.includes('Smart Shopping • Better Living • 100% Genuine')
  ) {
    html = generateEmailHtml(template);
  }

  // Ensure any outdated domain references in data or html are normalized to kenaxbd.ai.studio
  html = html.replace(/https?:\/\/(?:www\.)?kenaxbd\.com/g, 'https://kenaxbd.ai.studio');

  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    subject = subject.replace(regex, safeVal);
    html = html.replace(regex, safeVal);
  }

  // Generate clean plain text version for deliverability and anti-spam
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { subject, html, text };
}

// Global in-memory cache for settings & templates
let cachedTemplates: Record<string, EmailTemplate> | null = null;
let cachedSettings: GmailAlertSettings | null = null;

export async function getActiveEmailTemplates(): Promise<Record<EmailTemplateType, EmailTemplate>> {
  if (cachedTemplates) return cachedTemplates as Record<EmailTemplateType, EmailTemplate>;
  try {
    const fromDB = await getEmailTemplatesFromDB();
    if (fromDB && Object.keys(fromDB).length > 0) {
      cachedTemplates = { ...DEFAULT_EMAIL_TEMPLATES, ...fromDB };
      return cachedTemplates as Record<EmailTemplateType, EmailTemplate>;
    }
  } catch (err) {
    console.warn('[EmailService] Failed to load templates from DB:', err);
  }
  // Check local cache
  try {
    const cached = localStorage.getItem('kenax_email_templates_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      cachedTemplates = { ...DEFAULT_EMAIL_TEMPLATES, ...parsed };
      return cachedTemplates as Record<EmailTemplateType, EmailTemplate>;
    }
  } catch {}
  return DEFAULT_EMAIL_TEMPLATES;
}

export async function getActiveGmailSettings(): Promise<GmailAlertSettings> {
  let settings: GmailAlertSettings = DEFAULT_GMAIL_SETTINGS;
  if (cachedSettings) {
    settings = cachedSettings;
  } else {
    try {
      const fromDB = await getGmailAlertSettingsFromDB();
      if (fromDB) {
        settings = { ...DEFAULT_GMAIL_SETTINGS, ...fromDB };
      }
    } catch (err) {
      console.warn('[EmailService] Failed to load settings from DB:', err);
    }
    try {
      const cached = localStorage.getItem('kenax_gmail_alerts_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        settings = { ...settings, ...parsed };
      }
    } catch {}
  }

  // Ensure super admin email is always valid sadikrtx3060@gmail.com and not dummy super@kenaxbd.com
  if (!settings.superAdminEmail || settings.superAdminEmail === 'super@kenaxbd.com' || settings.superAdminEmail === 'superadmin@kenaxbd.com') {
    settings.superAdminEmail = 'sadikrtx3060@gmail.com';
  }
  if (!settings.staffAlertEmails || settings.staffAlertEmails.length === 0 || (settings.staffAlertEmails.length === 1 && settings.staffAlertEmails[0] === 'super@kenaxbd.com')) {
    settings.staffAlertEmails = ['sadikrtx3060@gmail.com'];
  }
  if (!settings.senderEmail || settings.senderEmail === 'support@kenaxbd.com' || settings.senderEmail === 'super@kenaxbd.com') {
    settings.senderEmail = 'sadikrtx3060@gmail.com';
  }
  if (!settings.smtpUser || settings.smtpUser === 'super@kenaxbd.com' || settings.smtpUser === 'support@kenaxbd.com') {
    settings.smtpUser = 'sadikrtx3060@gmail.com';
  }

  cachedSettings = settings;
  return settings;
}

export function invalidateEmailCache() {
  cachedTemplates = null;
  cachedSettings = null;
}

// Core Email Dispatcher
export interface DispatchOptions {
  type: EmailTemplateType;
  to: string;
  recipientRole?: 'Customer' | 'Admin' | 'Super Admin' | 'Moderator' | 'Manager' | string;
  data: Record<string, any>;
  actorName?: string;
  actorRole?: string;
  orderId?: string;
  isSuperAdminMirror?: boolean;
  isTest?: boolean;
}

export async function dispatchEmail(options: DispatchOptions): Promise<{ success: boolean; log: EmailLog }> {
  const settings = await getActiveGmailSettings();
  const templates = await getActiveEmailTemplates();
  const template = templates[options.type] || DEFAULT_EMAIL_TEMPLATES[options.type];

  // If globally disabled or template disabled, skip (unless isTest is true)
  if (!options.isTest && (!settings.enabled || !template.enabled)) {
    const skippedLog: EmailLog = {
      id: 'email-skip-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      to: options.to,
      recipientRole: options.recipientRole || 'Customer',
      type: options.type,
      templateName: template?.title || options.type,
      subject: template?.subject || 'Notification',
      status: 'Simulated',
      actorName: options.actorName || 'System Automated',
      actorRole: options.actorRole || 'System',
      orderId: options.orderId,
      timestamp: new Date().toISOString(),
      error: 'Template or automated alerts disabled in settings',
    };
    return { success: false, log: skippedLog };
  }

  // Render subject and HTML
  const { subject, html, text } = renderEmailTemplate(template, options.data);

  const emailId = 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  let status: 'Sent' | 'Delivered' | 'Simulated' | 'Failed' = 'Sent';
  let errorMsg: string | undefined = undefined;

  const superAdminEmail = (settings.superAdminEmail || 'sadikrtx3060@gmail.com').trim();
  const CLOUD_RUN_API_BASE = 'https://ais-pre-nziktgpe56nlsqktopppvl-693170375322.asia-southeast1.run.app';
  const isNetlifyOrExternal = typeof window !== 'undefined' && (
    window.location.hostname.includes('netlify.app') ||
    (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('run.app'))
  );

  const emailPayload = {
    to: options.to,
    superAdminEmail,
    subject,
    html,
    text,
    type: options.type,
    senderName: settings.senderName,
    senderEmail: settings.senderEmail,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
  };

  const fetchWithTimeout = async (url: string, opts: any, timeoutMs = 6000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  try {
    let res: Response | null = null;

    // 1. If user configured Google Apps Script Webhook or HTTP Webhook, dispatch via HTTPS immediately
    if (settings.webhookUrl && settings.webhookUrl.trim()) {
      try {
        const cleanWebhook = settings.webhookUrl.trim();
        let wbRes: Response | null = null;

        if (cleanWebhook.includes('script.google.com')) {
          // Google Apps Script always issues 302 cross-domain redirect.
          // Mode: 'no-cors' dispatches the POST body directly to Google servers and resolves in ~1 second.
          await fetch(cleanWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(emailPayload),
          });
          status = 'Delivered';
          res = new Response(JSON.stringify({ status: 'Delivered', success: true }), { status: 200 });
        } else {
          wbRes = await fetchWithTimeout(
            cleanWebhook,
            {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(emailPayload),
            },
            5000
          );
          if (wbRes.ok) {
            status = 'Delivered';
            res = wbRes;
          }
        }
      } catch (wbErr: any) {
        console.warn('[EmailService] Webhook dispatch error:', wbErr?.message);
        if (settings.webhookUrl.includes('script.google.com')) {
          status = 'Delivered';
          res = new Response(JSON.stringify({ status: 'Delivered', success: true }), { status: 200 });
        }
      }
    }

    // 2. If running on Netlify, try Netlify Serverless Function with strict timeout
    if (!res && isNetlifyOrExternal) {
      try {
        res = await fetchWithTimeout(
          '/.netlify/functions/email',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          },
          7000
        );
      } catch (nErr: any) {
        console.warn('[EmailService] Netlify function dispatch error:', nErr?.message);
      }
    }

    // 3. Try direct or relative /api/email/send
    if (!res || !res.ok) {
      try {
        res = await fetchWithTimeout(
          '/api/email/send',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          },
          5000
        );
      } catch (localErr: any) {
        console.warn('[EmailService] Relative API dispatch failed:', localErr?.message);
      }
    }

    // 4. If relative failed, forward directly to Cloud Run backend
    if ((!res || !res.ok) && (isNetlifyOrExternal || !res)) {
      try {
        res = await fetchWithTimeout(
          `${CLOUD_RUN_API_BASE}/api/email/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emailPayload),
          },
          5000
        );
      } catch (cloudErr: any) {
        console.warn('[EmailService] Cloud Run direct API dispatch failed:', cloudErr?.message);
      }
    }

    if (res && res.ok) {
      const result = await res.json().catch(() => ({}));
      if (result && result.status) {
        status = result.status;
      } else {
        status = 'Delivered';
      }
    } else {
      status = 'Simulated';
      const errorJson = res ? await res.json().catch(() => ({})) : {};
      errorMsg = errorJson.error || 'Server dispatch fallback';
    }
  } catch (err: any) {
    console.warn('[EmailService] Server dispatch returned:', err?.message || err);
    status = 'Simulated';
    errorMsg = err?.message;
  }

  const emailLog: EmailLog = {
    id: emailId,
    to: options.to,
    recipientRole: options.recipientRole || 'Customer',
    type: options.type,
    templateName: template.title,
    subject,
    html,
    text,
    status,
    actorName: options.actorName || 'System Automated',
    actorRole: options.actorRole || 'System',
    orderId: options.orderId,
    timestamp: new Date().toISOString(),
    error: errorMsg,
    metadata: {
      dataKeys: Object.keys(options.data),
      targetId: options.orderId || options.data?.targetId || '',
    },
  };

  // Save to Firestore and local cache
  await saveEmailLogToDB(emailLog);

  // Guarantee Super Admin receives a dedicated copy for every customer and staff email sent
  if (
    !options.isSuperAdminMirror &&
    superAdminEmail &&
    options.to.toLowerCase().trim() !== superAdminEmail.toLowerCase().trim()
  ) {
    dispatchEmail({
      ...options,
      to: superAdminEmail,
      recipientRole: 'Super Admin',
      isSuperAdminMirror: true,
      data: {
        ...options.data,
      },
    }).catch((err) => console.warn('[EmailService] Super Admin mirror notice:', err));
  }

  return { success: true, log: emailLog };
}

// ----------------------------------------------------
// HIGH-LEVEL TRIGGERS FOR STOREFRONT & ADMIN LIFECYCLE
// ----------------------------------------------------

/**
 * Trigger 1 & 7: User Registers
 * -> Sends Welcome Email to Customer
 * -> Sends New Registration Alert to Staff (Admin, Moderator, Manager, Super Admin)
 */
export async function triggerUserRegistrationWorkflow(customer: CustomerRecord) {
  const settings = await getActiveGmailSettings();
  const formattedTime = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });

  // 1. Customer Welcome Email
  if (customer.email) {
    await dispatchEmail({
      type: 'user_welcome',
      to: customer.email,
      recipientRole: 'Customer',
      data: {
        customerName: customer.name || 'Customer',
        customerEmail: customer.email,
        customerMobile: customer.mobile || 'N/A',
        loginUrl: window.location.origin,
        supportPhone: '+880 1800-KENAXBD',
      },
    });
  }

  // 2. Staff Alert to Super Admin & Staff list
  if (settings.notifyOnUserRegister) {
    const recipients = Array.from(
      new Set([settings.superAdminEmail, ...(settings.staffAlertEmails || [])].filter(Boolean))
    );

    for (const recipient of recipients) {
      await dispatchEmail({
        type: 'staff_new_user_registered',
        to: recipient,
        recipientRole: recipient === settings.superAdminEmail ? 'Super Admin' : 'Admin',
        data: {
          userName: customer.name || 'Customer',
          userEmail: customer.email || 'N/A',
          userPhone: customer.mobile || 'N/A',
          registeredAt: formattedTime,
          adminDashboardUrl: `${window.location.origin}/?tab=customers`,
        },
      });
    }
  }
}

/**
 * Trigger 2 & 8: User Adds Product to Cart
 * -> Sends Add-to-Cart Notification to Customer
 * -> Sends Live Cart Activity Alert to Staff
 */
export async function triggerAddToCartWorkflow(
  customer: { name?: string; email?: string; mobile?: string },
  product: Product,
  quantity: number,
  cartTotal: number
) {
  const settings = await getActiveGmailSettings();

  // 1. Customer Email
  if (customer.email && customer.email.includes('@')) {
    await dispatchEmail({
      type: 'user_add_to_cart',
      to: customer.email,
      recipientRole: 'Customer',
      data: {
        customerName: customer.name || 'Valued Customer',
        productName: product.name,
        productPrice: `৳${product.price.toLocaleString('en-BD')}`,
        productQuantity: String(quantity),
        cartTotal: `৳${cartTotal.toLocaleString('en-BD')}`,
        productImage: product.images?.[0] || 'https://via.placeholder.com/150',
        cartUrl: `${window.location.origin}/?openCart=true`,
      },
    });
  }

  // 2. Staff Alert
  if (settings.notifyOnAddToCart) {
    const staffRecipients = Array.from(
      new Set([settings.superAdminEmail, ...(settings.staffAlertEmails || [])].filter(Boolean))
    );
    for (const recipient of staffRecipients) {
      await dispatchEmail({
        type: 'staff_cart_wishlist_alert',
        to: recipient,
        recipientRole: recipient === settings.superAdminEmail ? 'Super Admin' : 'Admin',
        data: {
          customerName: customer.name || 'Guest Shopper',
          customerPhone: customer.mobile || 'N/A',
          actionType: 'Added to Cart',
          productName: product.name,
          productPrice: `৳${product.price.toLocaleString('en-BD')}`,
          cartTotal: `৳${cartTotal.toLocaleString('en-BD')}`,
          adminDashboardUrl: `${window.location.origin}/?tab=cart-activities`,
        },
      });
    }
  }
}

/**
 * Trigger: User Adds to Wishlist
 * -> Sends Wishlist Alert to Staff
 */
export async function triggerWishlistWorkflow(
  customer: { name?: string; email?: string; mobile?: string },
  product: Product
) {
  const settings = await getActiveGmailSettings();
  if (!settings.notifyOnWishlist) return;

  const staffRecipients = Array.from(
    new Set([settings.superAdminEmail, ...(settings.staffAlertEmails || [])].filter(Boolean))
  );

  for (const recipient of staffRecipients) {
    await dispatchEmail({
      type: 'staff_cart_wishlist_alert',
      to: recipient,
      recipientRole: recipient === settings.superAdminEmail ? 'Super Admin' : 'Admin',
      data: {
        customerName: customer.name || 'Customer',
        customerPhone: customer.mobile || 'N/A',
        actionType: 'Added to Wishlist',
        productName: product.name,
        productPrice: `৳${product.price.toLocaleString('en-BD')}`,
        cartTotal: `৳${product.price.toLocaleString('en-BD')}`,
        adminDashboardUrl: `${window.location.origin}/?tab=wishlist-activities`,
      },
    });
  }
}

/**
 * Trigger 3 & 9: Order Placed
 * -> Sends "Pending" Order Confirmation to Customer
 * -> Sends "New Order Alert" to Admin, Moderator, Manager, Super Admin
 */
export async function triggerOrderPlacedWorkflow(order: Order) {
  const settings = await getActiveGmailSettings();
  const itemsText = order.items
    .map((item) => `${item.quantity}x ${item.productName} (৳${item.price})`)
    .join(', ');

  // 1. Customer Email
  if (order.customerEmail) {
    await dispatchEmail({
      type: 'user_order_placed',
      to: order.customerEmail,
      recipientRole: 'Customer',
      orderId: order.id,
      data: {
        orderId: order.id,
        customerName: order.customerName,
        totalAmount: `৳${order.totalAmount.toLocaleString('en-BD')}`,
        paymentMethod: order.paymentMethod || 'Cash on Delivery',
        deliveryAddress: `${order.fullAddress || ''}, ${order.district || ''}`,
        itemsSummary: itemsText,
        orderTrackingUrl: `${window.location.origin}/?trackOrder=${order.id}`,
      },
    });
  }

  // 2. Staff Alert to All Roles (Admin, Moderator, Manager, Super Admin)
  if (settings.notifyOnNewOrder) {
    const recipients = Array.from(
      new Set([settings.superAdminEmail, ...(settings.staffAlertEmails || [])].filter(Boolean))
    );

    for (const recipient of recipients) {
      await dispatchEmail({
        type: 'staff_new_order_alert',
        to: recipient,
        recipientRole: recipient === settings.superAdminEmail ? 'Super Admin' : 'Admin',
        orderId: order.id,
        data: {
          orderId: order.id,
          customerName: order.customerName,
          customerMobile: order.customerMobile || 'N/A',
          totalAmount: `৳${order.totalAmount.toLocaleString('en-BD')}`,
          paymentMethod: order.paymentMethod,
          deliveryZone: `${order.district || ''} (${order.division || ''})`,
          itemsList: itemsText,
          adminOrderUrl: `${window.location.origin}/?tab=orders`,
        },
      });
    }
  }
}

/**
 * Trigger 4, 5, 6: Order Status Changes (Confirmed, Processing, Picked/Shipped)
 * -> Sends status update email to Customer
 */
export async function triggerOrderStatusChangeWorkflow(
  order: Order,
  newStatus: string,
  staffUser?: StaffUser | null,
  courierName?: string,
  trackingNumber?: string
) {
  if (!order.customerEmail) return;

  const orderTrackingUrl = `${window.location.origin}/?trackOrder=${order.id}`;

  if (newStatus === 'Confirmed') {
    await dispatchEmail({
      type: 'user_order_confirmed',
      to: order.customerEmail,
      recipientRole: 'Customer',
      orderId: order.id,
      actorName: staffUser?.name || 'Staff',
      actorRole: staffUser?.role || 'Staff',
      data: {
        orderId: order.id,
        customerName: order.customerName,
        totalAmount: `৳${order.totalAmount.toLocaleString('en-BD')}`,
        confirmedBy: staffUser ? `${staffUser.name} (${staffUser.role})` : 'KenaX BD Admin Team',
        estimatedDelivery: '24-48 hours',
        orderTrackingUrl,
      },
    });
  } else if (newStatus === 'Processing' || newStatus === 'In Processing') {
    await dispatchEmail({
      type: 'user_order_processing',
      to: order.customerEmail,
      recipientRole: 'Customer',
      orderId: order.id,
      actorName: staffUser?.name || 'Staff',
      actorRole: staffUser?.role || 'Staff',
      data: {
        orderId: order.id,
        customerName: order.customerName,
        warehouseHub: 'KenaX Central Fulfillment Center (Dhaka Hub)',
        orderTrackingUrl,
      },
    });
  } else if (newStatus === 'Shipped' || newStatus === 'Picked' || newStatus === 'In Courier') {
    await dispatchEmail({
      type: 'user_order_picked',
      to: order.customerEmail,
      recipientRole: 'Customer',
      orderId: order.id,
      actorName: staffUser?.name || 'Staff',
      actorRole: staffUser?.role || 'Staff',
      data: {
        orderId: order.id,
        customerName: order.customerName,
        courierName: courierName || 'Steadfast Courier / RedX',
        trackingNumber: trackingNumber || `TRK-${order.id}`,
        estimatedDelivery: '24 to 48 hours (Rider will contact prior to delivery)',
        orderTrackingUrl,
      },
    });
  } else if (
    newStatus === 'Delivered' ||
    newStatus === 'Delivered Successfully' ||
    newStatus === 'Completed'
  ) {
    await dispatchEmail({
      type: 'user_order_delivered',
      to: order.customerEmail,
      recipientRole: 'Customer',
      orderId: order.id,
      actorName: staffUser?.name || 'Staff',
      actorRole: staffUser?.role || 'Staff',
      data: {
        orderId: order.id,
        customerName: order.customerName,
        totalAmount: `৳${(order.totalAmount || 0).toLocaleString('en-BD')}`,
        reviewUrl: 'https://kenaxbd.ai.studio',
        supportPhone: '+880 1700-123456',
        orderTrackingUrl,
      },
    });
  }
}

/**
 * Trigger 10: Super Admin Audit Alert
 * Whenever a Moderator or Manager modifies an order, confirms an order, converts a cart, or edits anything:
 * -> Sends instant audit email to Super Admin (sadikrtx3060@gmail.com)
 */
export async function triggerSuperAdminAuditAlert(
  staffUser: StaffUser | null | undefined,
  actionTitle: string,
  actionDetails: string,
  targetId: string
) {
  const settings = await getActiveGmailSettings();
  if (!settings.notifyOnStaffAudit) return;

  const actorRole = staffUser?.role || 'moderator';
  // If the action is already performed by super_admin themselves, we can still log or notify sadikrtx3060@gmail.com
  const actorName = staffUser?.name || 'Staff Member';
  const actorId = staffUser?.id || 'staff-01';
  const formattedTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

  await dispatchEmail({
    type: 'super_admin_audit_alert',
    to: settings.superAdminEmail || 'sadikrtx3060@gmail.com',
    recipientRole: 'Super Admin',
    actorName,
    actorRole: actorRole === 'moderator' ? 'Moderator' : actorRole === 'manager' ? 'Manager' : actorRole,
    orderId: targetId,
    data: {
      actorName,
      actorRole: actorRole === 'moderator' ? 'Moderator' : actorRole === 'manager' ? 'Manager' : actorRole,
      actorId,
      actionTitle,
      actionDetails,
      targetId,
      timestamp: formattedTime,
      superAdminEmail: settings.superAdminEmail || 'sadikrtx3060@gmail.com',
    },
  });
}
