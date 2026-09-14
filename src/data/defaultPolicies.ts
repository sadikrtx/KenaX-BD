import { FAQItem, FlashSaleBannerSettings } from '../types';

export const DEFAULT_FLASH_SALE_BANNER: FlashSaleBannerSettings = {
  badge: 'MEGA GADGET FEST',
  discount: 'UP TO 40% OFF',
  title: 'Mega Gadget Fest: Up to 40% Off on Premium Gadgets!',
  subtitle: 'Grab authentic smartwatches, wireless earbuds, smart accessories, and lifestyle essentials with verified Cash on Delivery nationwide.',
  buttonText: 'Shop Flash Sale Now',
  image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&auto=format&fit=crop&q=85',
  enabled: true,
};

export const DEFAULT_PRIVACY_POLICY = `## 1. Information We Collect
At KenaX BD, we value your trust and privacy. When you visit our website, place an order, or register an account, we collect necessary personal information to process and fulfill your orders smoothly:
- **Contact & Identification Data**: Your full name, delivery address, phone number, and email address.
- **Order & Transaction Data**: Purchased items, delivery location snapshots, order value, payment method (Cash on Delivery, bKash, Nagad, Rocket), and transaction reference numbers.
- **Technical & Device Information**: Device type, IP address, and browser cookies used strictly to maintain your active cart, session preferences, and fast page loading.

## 2. How We Use Your Information
We use your data solely for legitimate business operations:
- To verify, process, package, and deliver your orders accurately to your doorstep.
- To send instant SMS and email notifications regarding order confirmation, dispatch, courier tracking IDs, and delivery updates.
- To prevent fraudulent transactions, duplicate orders, and ensure safety on Cash on Delivery parcels.
- To provide prompt customer support, handle warranty claims, and process approved returns or refunds.

## 3. Data Protection & Sharing
- We **NEVER** sell, rent, or trade your personal information to any third-party marketing companies.
- Your delivery information (name, address, phone number) is securely shared strictly with our authorized delivery logistics partners (such as Steadfast Courier, Pathao, RedX, and Sundarban Courier) for courier dispatch.
- Mobile financial transactions (bKash, Nagad, Rocket) are processed directly through authorized gateways; we never store your private PINs or bank passwords.

## 4. Security & Storage
We implement industry-standard encryption, SSL/TLS protocols, and role-based access control (RBAC) to ensure your personal details are safely stored.

## 5. Contact Us Regarding Your Privacy
If you have any questions or wish to request data updates or deletion, contact our privacy team at:
- **Email**: privacy@kenaxbd.com
- **Phone / WhatsApp**: +880 1700-123456
- **Address**: Level 4, House 12, Road 27, Dhanmondi, Dhaka 1209, Bangladesh.`;

export const DEFAULT_TERMS_OF_SERVICE = `## 1. Agreement to Terms
By browsing, accessing, or placing an order on KenaX BD (kenaxbd.com), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our website.

## 2. Product Authenticity & Pricing
- All products listed on KenaX BD are 100% genuine, authentic, and sourced directly from verified manufacturers and authorized regional distributors.
- All prices are listed in Bangladeshi Taka (৳ BDT) and include applicable taxes unless specifically stated otherwise.
- We strive for accuracy in product descriptions, images, and prices. In the rare event of a pricing or typographical error, KenaX BD reserves the right to cancel or adjust the order after contacting the customer.

## 3. Ordering & Verification
- When you place an order, you will receive an automated order confirmation via SMS and email.
- For high-value orders or first-time Cash on Delivery deliveries, our customer verification team may place a short confirmation phone call before dispatch.
- Providing false contact details, unreachable phone numbers, or repeated refused deliveries without valid cause may lead to account suspension.

## 4. Shipping & Delivery
- **Inside Dhaka City**: Standard delivery within 24 to 48 hours (Delivery Fee: ৳60).
- **Outside Dhaka / All 64 Districts**: Standard delivery within 3 to 5 business days (Delivery Fee: ৳120).
- Orders exceeding our promotional threshold qualify for Free Shipping.
- Delivery timelines may be slightly extended during national holidays, adverse weather conditions, or political strikes.

## 5. Cash on Delivery (COD) Policy
- We offer Cash on Delivery across all 64 districts in Bangladesh.
- Customers have the right to inspect the external packaging and product condition in front of the courier delivery rider before completing payment.
- If a parcel appears opened, broken, or tampered with prior to delivery, customers are encouraged to reject the parcel immediately and notify KenaX BD support.

## 6. Intellectual Property
All logos, trademarks, website design, product photography, icons, and software code on KenaX BD are the proprietary property of KenaX BD and protected under applicable copyright and intellectual property laws.`;

export const DEFAULT_REFUND_POLICY = `## 1. 7-Day Replacement & Return Guarantee
At KenaX BD, customer satisfaction is our top priority. We offer a hassle-free **7-Day Return and Replacement Policy** for all eligible products.

## 2. Conditions for Returns
You are eligible for a replacement or full refund if:
- You received a physically damaged, broken, or defective item upon delivery.
- The item delivered does not match the product specifications, model, color, or size ordered.
- The product has an internal manufacturing defect within 7 days of delivery.
- The package is missing advertised accessories or parts.

## 3. Non-Returnable Items
For hygiene and safety reasons, the following items are non-returnable unless received in a damaged or non-functional state:
- Personal care, beauty, skincare, and grooming items once opened or seal is broken.
- Undergarments, innerwear, and intimate apparel.
- Consumables and digital download codes.

## 4. Return Process
1. Contact KenaX BD Customer Support via WhatsApp or phone at **+880 1700-123456** or email **support@kenaxbd.com** within 7 days of parcel delivery.
2. Provide your **Order Number (#KB-XXXXX)** and clear photos or a short video showing the issue/defect.
3. Once verified by our support team, our courier partner will pick up the parcel from your address, or you may return it via your nearest courier hub.
4. Keep the original product packaging, manuals, warranty card, and all accessories intact.

## 5. Refund Method & Timelines
- Once the returned parcel arrives at our inspection warehouse and passes physical verification, your refund will be initiated within **24 to 48 hours**.
- **bKash / Nagad / Rocket Refunds**: Received within 24–48 hours after approval.
- **Bank / Card Refunds**: May take 3–7 working days depending on your bank's processing cycle.
- In case of defective or wrongly sent items, KenaX BD bears all return courier delivery charges.`;

export const DEFAULT_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Ordering',
    question: 'How do I place an order on KenaX BD?',
    answer:
      'Browse our catalog, select your desired items, and click "Add to Cart" or "Buy Now". When ready, proceed to checkout, enter your delivery address, choose your payment method (Cash on Delivery, bKash, Nagad, or Rocket), and click "Confirm Order". You will immediately receive an SMS confirmation with your Order ID.',
  },
  {
    id: 'faq-2',
    category: 'Delivery',
    question: 'What are your delivery charges and delivery times across Bangladesh?',
    answer:
      'We deliver to all 64 districts in Bangladesh. Delivery inside Dhaka Metro is ৳60 (delivered within 24 to 48 hours). Delivery outside Dhaka / nationwide is ৳120 (delivered within 3 to 5 business days). Orders above ৳5,000 qualify for Free Delivery!',
  },
  {
    id: 'faq-3',
    category: 'Payment',
    question: 'How does Cash on Delivery (COD) work?',
    answer:
      'With Cash on Delivery, you do not need to pay anything in advance. When our delivery partner brings your parcel to your address, you can inspect the package condition and hand over the exact cash amount to the delivery rider.',
  },
  {
    id: 'faq-4',
    category: 'Inspection',
    question: 'Can I check and inspect my parcel before paying the courier agent?',
    answer:
      'Yes! We encourage open-box inspection in front of the courier delivery rider. Check that the parcel is intact, genuine, and contains the correct model and accessories before paying the rider.',
  },
  {
    id: 'faq-5',
    category: 'Warranty & Returns',
    question: 'What is your return and warranty replacement policy?',
    answer:
      'We provide a 7-Day Replacement Guarantee on manufacturing defects and damages. If you receive an issue with your product, simply contact our WhatsApp support (+880 1700-123456) with a short video or photo, and we will arrange a free exchange or full refund.',
  },
  {
    id: 'faq-6',
    category: 'Authenticity',
    question: 'Are the gadgets and products 100% authentic?',
    answer:
      'Yes, absolutely. Every product listed on KenaX BD is 100% genuine and sourced directly from official brand importers and authorized distributors. Products come with official warranty where applicable.',
  },
  {
    id: 'faq-7',
    category: 'Tracking',
    question: 'How can I track my order in real-time?',
    answer:
      'Click on "Track Order" in the top navigation or footer, enter your Order ID (e.g. KB-89241) or phone number, and you will see live status updates including packing, dispatch, courier consignment ID, and current location.',
  },
];
