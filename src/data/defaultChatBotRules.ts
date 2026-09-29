import type { ChatBotRule } from '../types/index.ts';

export const DEFAULT_CHATBOT_RULES: ChatBotRule[] = [
  {
    id: 'rule-delivery-charges',
    name: 'Delivery Charge & Shipping Rules',
    nameBn: 'ডেলিভারি চার্জ ও শিপিং নিয়মাবলী',
    description: 'Triggers when customer asks about delivery fees, delivery times or shipping rules across Bangladesh.',
    enabled: true,
    priority: 1,
    matchType: 'contains_any',
    keywords: [
      'delivery charge',
      'shipping fee',
      'shipping charge',
      'delivery fee',
      'ডেলিভারি চার্জ',
      'ডেলিভারি খরচ',
      'শিপিং চার্জ',
      'চার্জ কত',
      'ডেলিভারি কত দিন',
      'কবে পাব',
      'ঢাকায় ডেলিভারি',
      'ঢাকার বাইরে',
    ],
    category: 'Delivery',
    actionType: 'quick_buttons',
    replyMessage: `🚚 **KenaX BD দেশজুড়ে দ্রুততম হোম ডেলিভারি নিয়মাবলী:**

📍 **ঢাকা সিটির ভেতরে:** ডেলিভারি চার্জ মাত্র **৳৬০** (সময়: ২৪-৪৮ ঘণ্টা)
📍 **ঢাকা সিটির বাইরে ও সারাদেশে:** ডেলিভারি চার্জ মাত্র **৳১২০** (সময়: ২-৪ কার্যদিবস)
🎁 **স্পেশাল অফার:** ৳৫,০০০ টাকার অধিক অর্ডারে সারাদেশে **সম্পূর্ণ ফ্রি ডেলিভারি!**

📦 কুরিয়ার পার্টনার: Steadfast, Pathao & Paperfly Courier. পণ্য রিসিভ করার সময় ডেলিভারিম্যানের সামনে চেক করে নেওয়ার সুবিধা রয়েছে।`,
    replyMessageBn: `🚚 **KenaX BD দেশজুড়ে দ্রুততম হোম ডেলিভারি নিয়মাবলী:**

📍 **ঢাকা সিটির ভেতরে:** ডেলিভারি চার্জ মাত্র **৳৬০** (সময়: ২৪-৪৮ ঘণ্টা)
📍 **ঢাকা সিটির বাইরে ও সারাদেশে:** ডেলিভারি চার্জ মাত্র **৳১২০** (সময়: ২-৪ কার্যদিবস)
🎁 **স্পেশাল অফার:** ৳৫,০০০ টাকার অধিক অর্ডারে সারাদেশে **সম্পূর্ণ ফ্রি ডেলিভারি!**

📦 কুরিয়ার পার্টনার: Steadfast, Pathao & Paperfly Courier. পণ্য রিসিভ করার সময় ডেলিভারিম্যানের সামনে চেক করে নেওয়ার সুবিধা রয়েছে।`,
    actionData: {
      quickButtons: [
        { label: '🛍️ পণ্য অর্ডার করতে চাই', action: 'open_order', icon: 'ShoppingBag' },
        { label: '🔥 জনপ্রিয় পণ্যসমূহ দেখুন', action: 'suggest_products', icon: 'Sparkles' },
        { label: '💬 হোয়াটসঅ্যাপে প্রতিনিধি', action: 'connect_whatsapp', icon: 'MessageSquare' },
      ],
    },
  },
  {
    id: 'rule-payment-cod',
    name: 'Cash on Delivery & Payment Options',
    nameBn: 'ক্যাশ অন ডেলিভারি ও পেমেন্ট পদ্ধতি',
    description: 'Triggers on questions about Cash on Delivery (COD), bKash, Nagad, advance payment terms.',
    enabled: true,
    priority: 2,
    matchType: 'contains_any',
    keywords: [
      'cash on delivery',
      'cod',
      'payment method',
      'bkash',
      'nagad',
      'rocket',
      'advance',
      'পেমেন্ট',
      'ক্যাশ অন ডেলিভারি',
      'বিকাশ',
      'নগদ',
      'অগ্রিম',
      'অগ্রিম টাকা',
      'টাকা কিভাবে দেব',
    ],
    category: 'Payment',
    actionType: 'quick_buttons',
    replyMessage: `💳 **KenaX BD পেমেন্ট ও লেনদেন পদ্ধতি:**

✅ **ক্যাশ অন ডেলিভারি (Cash on Delivery):** সারাদেশে পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের ১০০% নিরাপদ সুবিধা।
✅ **বিকাশ / নগদ / রকেট:** মার্চেন্ট ও পার্সোনাল নম্বরে ইনস্ট্যান্ট পেমেন্ট সুবিধা।
🔒 **১০০% নিরাপদ কেনাকাটা:** কোনো গোপন চার্জ বা অতিরিক্ত ফি নেই।`,
    replyMessageBn: `💳 **KenaX BD পেমেন্ট ও লেনদেন পদ্ধতি:**

✅ **ক্যাশ অন ডেলিভারি (Cash on Delivery):** সারাদেশে পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের ১০০% নিরাপদ সুবিধা।
✅ **বিকাশ / নগদ / রকেট:** মার্চেন্ট ও পার্সোনাল নম্বরে ইনস্ট্যান্ট পেমেন্ট সুবিধা।
🔒 **১০০% নিরাপদ কেনাকাটা:** কোনো গোপন চার্জ বা অতিরিক্ত ফি নেই।`,
    actionData: {
      quickButtons: [
        { label: '🛍️ অর্ডার করুন', action: 'open_order', icon: 'ShoppingBag' },
        { label: '📞 হেল্পলাইনে কথা বলুন', action: 'connect_whatsapp', icon: 'Phone' },
      ],
    },
  },
  {
    id: 'rule-order-booking',
    name: 'Order Placement Assistance',
    nameBn: 'অর্ডার প্লেসমেন্ট ও ক্রয় সহায়তা',
    description: 'Helps customers place orders directly and opens the interactive in-chat booking form.',
    enabled: true,
    priority: 3,
    matchType: 'contains_any',
    keywords: [
      'অর্ডার করতে চাই',
      'অর্ডার করব',
      'অর্ডার কিভাবে করব',
      'কিনতে চাই',
      'place order',
      'want to order',
      'how to order',
      'buy now',
      'order booking',
      'অর্ডার ফর্ম',
    ],
    category: 'Orders',
    actionType: 'open_order_form',
    replyMessage: `🛍️ **অর্ডার করার জন্য নিচের সহজ ধাপগুলো অনুসরণ করুন:**

১. পছন্দের প্রোডাক্টটি সিলেক্ট করুন অথবা নিচে পণ্যের নাম লিখুন।
২. আপনার নাম, ১১ ডিজিটের মোবাইল নম্বর এবং ডেলিভারি ঠিকানা প্রদান করুন।
৩. "🛍️ অর্ডার কনফার্ম করুন" বাটনে ক্লিক করলেই আপনার অর্ডারটি কনফার্ম হয়ে যাবে!

আমাদের কাস্টমার সাপোর্ট টিম থেকে দ্রুত কল করে অর্ডারটি ভেরিফাই করা হবে।`,
    replyMessageBn: `🛍️ **অর্ডার করার জন্য নিচের সহজ ধাপগুলো অনুসরণ করুন:**

১. পছন্দের প্রোডাক্টটি সিলেক্ট করুন অথবা নিচে পণ্যের নাম লিখুন।
২. আপনার নাম, ১১ ডিজিটের মোবাইল নম্বর এবং ডেলিভারি ঠিকানা প্রদান করুন।
৩. "🛍️ অর্ডার কনফার্ম করুন" বাটনে ক্লিক করলেই আপনার অর্ডারটি কনফার্ম হয়ে যাবে!

আমাদের কাস্টমার সাপোর্ট টিম থেকে দ্রুত কল করে অর্ডারটি ভেরিফাই করা হবে।`,
    actionData: {
      quickButtons: [
        { label: '🛍️ অর্ডার ফর্ম খুলুন', action: 'open_order', icon: 'ShoppingBag' },
        { label: '🔥 ট্রেন্ডিং পণ্যসমূহ', action: 'suggest_products', icon: 'Sparkles' },
      ],
    },
  },
  {
    id: 'rule-order-tracking',
    name: 'Order Tracking & Status Inquiry',
    nameBn: 'অর্ডার ট্র্যাকিং ও পার্সেল স্ট্যাটাস',
    description: 'Assists customers in checking live order and courier tracking status.',
    enabled: true,
    priority: 4,
    matchType: 'contains_any',
    keywords: [
      'track order',
      'order tracking',
      'order status',
      'parcel status',
      'অর্ডার ট্র্যাক',
      'অর্ডার স্ট্যাটাস',
      'আমার অর্ডার কোথায়',
      'পার্সেল ট্র্যাক',
      'অর্ডার চেক',
      'ট্র্যাকিং কোড',
    ],
    category: 'Orders',
    actionType: 'quick_buttons',
    replyMessage: `📦 **অর্ডার ট্র্যাক করার নিয়ম:**

আপনার অর্ডারের ৫ ডিজিট বা পূর্ণাঙ্গ Order ID (যেমন: #ORD-12345 বা মোবাইল নম্বর) লিখে মেসেজ দিন। আমাদের সিস্টেম তাৎক্ষণিক আপনার অর্ডারের বর্তমান অবস্থা (Pending, Confirmed, Shipped, Out for Delivery) জানিয়ে দেবে!

এছাড়াও টেলিগ্রাম বটে লাইভ আপডেট পেতে আমাদের বটের সাথে যুক্ত থাকুন।`,
    replyMessageBn: `📦 **অর্ডার ট্র্যাক করার নিয়ম:**

আপনার অর্ডারের ৫ ডিজিট বা পূর্ণাঙ্গ Order ID (যেমন: #ORD-12345 বা মোবাইল নম্বর) লিখে মেসেজ দিন। আমাদের সিস্টেম তাৎক্ষণিক আপনার অর্ডারের বর্তমান অবস্থা (Pending, Confirmed, Shipped, Out for Delivery) জানিয়ে দেবে!

এছাড়াও টেলিগ্রাম বটে লাইভ আপডেট পেতে আমাদের বটের সাথে যুক্ত থাকুন।`,
    actionData: {
      quickButtons: [
        { label: '🤖 Telegram Live Tracker', action: 'connect_telegram', icon: 'Bot' },
        { label: '💬 WhatsApp সাপোর্ট এ কথা বলুন', action: 'connect_whatsapp', icon: 'MessageSquare' },
      ],
    },
  },
  {
    id: 'rule-speak-human',
    name: 'Connect to WhatsApp Human Agent',
    nameBn: 'অফিসিয়াল হোয়াটসঅ্যাপ প্রতিনিধির সাথে সংযোগ',
    description: 'Connects the customer directly to the official KenaX WhatsApp helpline/agent.',
    enabled: true,
    priority: 5,
    matchType: 'contains_any',
    keywords: [
      'কথা বলতে চাই',
      'মানুষের সাথে কথা',
      'প্রতিনিধি',
      'এজেন্ট',
      'whatsapp agent',
      'human agent',
      'talk to human',
      'customer care',
      'helpline',
      'হোয়াটসঅ্যাপ নম্বর',
      'ফোন নম্বর',
      'সাপোর্ট দরকার',
      'help desk',
    ],
    category: 'Support',
    actionType: 'connect_whatsapp',
    replyMessage: `📞 **KenaX BD অফিসিয়াল কাস্টমার কেয়ার ও সাপোর্ট:**

আমাদের অফিসিয়াল কাস্টমার সাপোর্ট টিম সার্বক্ষণিক আপনাদের সেবায় নিয়োজিত। সরাসরি হোয়াটসঅ্যাপে আমাদের অফিসিয়াল প্রতিনিধির সাথে চ্যাট করতে নিচের বাটনে চাপুন:

📱 **অফিসিয়াল হোয়াটসঅ্যাপ:** +880 1719-143897
🕒 **সাপোর্ট সময়:** প্রতিদিন সকাল ৯:০০ টা থেকে রাত ১১:০০ টা পর্যন্ত`,
    replyMessageBn: `📞 **KenaX BD অফিসিয়াল কাস্টমার কেয়ার ও সাপোর্ট:**

আমাদের অফিসিয়াল কাস্টমার সাপোর্ট টিম সার্বক্ষণিক আপনাদের সেবায় নিয়োজিত। সরাসরি হোয়াটসঅ্যাপে আমাদের অফিসিয়াল প্রতিনিধির সাথে চ্যাট করতে নিচের বাটনে চাপুন:

📱 **অফিসিয়াল হোয়াটসঅ্যাপ:** +880 1719-143897
🕒 **সাপোর্ট সময়:** প্রতিদিন সকাল ৯:০০ টা থেকে রাত ১১:০০ টা পর্যন্ত`,
    actionData: {
      agentPhone: '01719143897',
      quickButtons: [
        { label: '💬 WhatsApp-এ সরাসরি চ্যাট করুন', action: 'connect_whatsapp', icon: 'MessageSquare' },
        { label: '🛍️ সরাসরি পণ্য অর্ডার করুন', action: 'open_order', icon: 'ShoppingBag' },
      ],
    },
  },
  {
    id: 'rule-popular-products',
    name: 'Popular & Trending Products Showcase',
    nameBn: 'জনপ্রিয় ও সেরা বিক্রিত পণ্যসমূহ',
    description: 'Shows popular and trending products determined by customer favorites, cart additions, and buy now orders.',
    enabled: true,
    priority: 6,
    matchType: 'contains_any',
    keywords: [
      'popular products',
      'trending products',
      'best seller',
      'hot deals',
      'সেরা পণ্য',
      'জনপ্রিয় পণ্য',
      'জনপ্রিয় পণ্য',
      'জনপ্রিয় প্রোডাক্ট',
      'জনপ্রিয় প্রোডাক্ট',
      'কোনটা বেশি চলে',
      'কোন প্রোডাক্ট বেশি চলে',
      'সবচেয়ে বেশি পছন্দ',
      'ফেভারিট প্রোডাক্ট',
      'পপুলার প্রোডাক্ট',
      'নতুন প্রোডাক্ট',
      'কী কী প্রোডাক্ট আছে',
      'প্রোডাক্ট লিস্ট',
    ],
    category: 'General',
    actionType: 'suggest_products',
    replyMessage: `🔥 **KenaX BD এর বর্তমান সেরা ও শীর্ষ জনপ্রিয় পণ্য কালেকশন:**

সম্মানিত স্যার, আমাদের সম্মানিত কাস্টমারদের সবচেয়ে বেশি ফেভারিট করা, কার্টে যুক্ত করা ও বাই নাও (অর্ডার) করা শীর্ষ জনপ্রিয় পণ্যসমূহ নিচে তুলে ধরা হলো।

যেকোনো পণ্যের বিস্তারিত জানতে বা সরাসরি অর্ডার করতে নিচে প্রোডাক্ট কার্ডের বাটন ব্যবহার করুন!`,
    replyMessageBn: `🔥 **KenaX BD এর বর্তমান সেরা ও শীর্ষ জনপ্রিয় পণ্য কালেকশন:**

সম্মানিত স্যার, আমাদের সম্মানিত কাস্টমারদের সবচেয়ে বেশি ফেভারিট করা, কার্টে যুক্ত করা ও বাই নাও (অর্ডার) করা শীর্ষ জনপ্রিয় পণ্যসমূহ নিচে তুলে ধরা হলো।

যেকোনো পণ্যের বিস্তারিত জানতে বা সরাসরি অর্ডার করতে নিচে প্রোডাক্ট কার্ডের বাটন ব্যবহার করুন!`,
    actionData: {
      quickButtons: [
        { label: '🛍️ অর্ডার ফর্ম খুলুন', action: 'open_order', icon: 'ShoppingBag' },
        { label: '🚚 ডেলিভারি নিয়মাবলী', action: 'view_policy', icon: 'Truck' },
      ],
    },
  },
  {
    id: 'rule-return-warranty',
    name: 'Return & Replacement Warranty Policy',
    nameBn: 'রিটার্ন ও রিপ্লেসমেন্ট ওয়ারেন্টি পলিসি',
    description: 'Provides information regarding replacement, defective product policy, and official guarantee.',
    enabled: true,
    priority: 7,
    matchType: 'contains_any',
    keywords: [
      'return policy',
      'replacement',
      'warranty',
      'গ্যারান্টি',
      'ওয়ারেন্টি',
      'রিটার্ন',
      'পণ্য নষ্ট হলে',
      'সমস্যা হলে কি করব',
      'ভাঙ্গা পেলে',
      'চেঞ্জ করার নিয়ম',
    ],
    category: 'Support',
    actionType: 'quick_buttons',
    replyMessage: `🛡️ **KenaX BD ১০০% নিরাপদ কেনাকাটা ও রিটার্ন গ্যারান্টি:**

✅ **৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি:** পণ্য হাতে পাওয়ার পর কোনো কারিগরি ত্রুটি থাকলে ৭ দিনের মধ্যে ফ্রিতে রিপ্লেসমেন্ট দেওয়া হয়।
✅ **চেক অ্যান্ড রিসিভ:** পার্সেল ডেলিভারি নেওয়ার সময় ডেলিভারিম্যানের সামনে প্যাকেট আনবক্স করে প্রোডাক্ট চেক করে নেওয়ার সুযোগ রয়েছে।
✅ **সহজ রিটার্ন প্রসেস:** ত্রুটিপূর্ণ পণ্যের ক্ষেত্রে আমাদের হোয়াটসঅ্যাপ সাপোর্টে ছবি/ভিডিও পাঠালে দ্রুত সমাধান করা হয়।`,
    replyMessageBn: `🛡️ **KenaX BD ১০০% নিরাপদ কেনাকাটা ও রিটার্ন গ্যারান্টি:**

✅ **৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি:** পণ্য হাতে পাওয়ার পর কোনো কারিগরি ত্রুটি থাকলে ৭ দিনের মধ্যে ফ্রিতে রিপ্লেসমেন্ট দেওয়া হয়।
✅ **চেক অ্যান্ড রিসিভ:** পার্সেল ডেলিভারি নেওয়ার সময় ডেলিভারিম্যানের সামনে প্যাকেট আনবক্স করে প্রোডাক্ট চেক করে নেওয়ার সুযোগ রয়েছে।
✅ **সহজ রিটার্ন প্রসেস:** ত্রুটিপূর্ণ পণ্যের ক্ষেত্রে আমাদের হোয়াটসঅ্যাপ সাপোর্টে ছবি/ভিডিও পাঠালে দ্রুত সমাধান করা হয়।`,
    actionData: {
      quickButtons: [
        { label: '💬 কাস্টমার সাপোর্টে কথা বলুন', action: 'connect_whatsapp', icon: 'Phone' },
        { label: '🛍️ নিশ্চিন্তে অর্ডার করুন', action: 'open_order', icon: 'ShoppingBag' },
      ],
    },
  },
  {
    id: 'rule-experience-center',
    name: 'Store Address & Experience Center',
    nameBn: 'দোকান ও এক্সপেরিয়েন্স সেন্টারের ঠিকানা',
    description: 'Provides store location, office address, and working hours.',
    enabled: true,
    priority: 8,
    matchType: 'contains_any',
    keywords: [
      'office address',
      'store location',
      'shop address',
      'দোকান কোথায়',
      'শোরুম কোথায়',
      'অফিস কোথায়',
      'ঠিকানা',
      'এক্সপেরিয়েন্স সেন্টার',
      'লোকেশন',
    ],
    category: 'General',
    actionType: 'quick_buttons',
    replyMessage: `🏢 **KenaX BD অফিস ও এক্সপেরিয়েন্স সেন্টার:**

📍 **ঠিকানা:** ধানমন্ডি, ঢাকা - ১২০৯, বাংলাদেশ
📞 **হেল্পলাইন:** +880 1719-143897 / +880 1887-713212
🌐 **অফিসিয়াল ওয়েবসাইট:** https://kenaxbd.com
🕒 **খোলা থাকে:** প্রতিদিন সকাল ৯:০০ টা থেকে রাত ৯:০০ টা পর্যন্ত (অনলাইন অর্ডার ২৪/৭ চালু)`,
    replyMessageBn: `🏢 **KenaX BD অফিস ও এক্সপেরিয়েন্স সেন্টার:**

📍 **ঠিকানা:** ধানমন্ডি, ঢাকা - ১২০৯, বাংলাদেশ
📞 **হেল্পলাইন:** +880 1719-143897 / +880 1887-713212
🌐 **অফিসিয়াল ওয়েবসাইট:** https://kenaxbd.com
🕒 **খোলা থাকে:** প্রতিদিন সকাল ৯:০০ টা থেকে রাত ৯:০০ টা পর্যন্ত (অনলাইন অর্ডার ২৪/৭ চালু)`,
    actionData: {
      quickButtons: [
        { label: '💬 WhatsApp-এ লোকেশন নিন', action: 'connect_whatsapp', icon: 'MessageSquare' },
        { label: '🛍️ অনলাইনে অর্ডার করুন', action: 'open_order', icon: 'ShoppingBag' },
      ],
    },
  },
];
