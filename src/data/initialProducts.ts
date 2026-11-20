import type { Product } from '../types/index.ts';

export const DEMO_PRODUCT_IDS: string[] = [
  "prod-redmi-note-13",
  "prod-xiaomi-buds-5",
  "prod-haylou-smartwatch",
  "prod-nike-casual-shoes",
  "prod-arctic-hunter-backpack",
  "prod-philips-air-fryer",
  "prod-festive-panjabi",
  "prod-designer-kurti-saree",
  "prod-baby-cotton-set",
  "prod-cotton-polo-shirt",
  "prod-lenovo-lp40-pro",
  "prod-smart-gps-tracker",
  "prod-cerave-cleanser",
  "prod-realme-65w-charger",
  "demo-waterproof-bedsheet",
  "demo-solid-cotton-katua",
  "demo-printed-three-pieces",
  "demo-kids-night-lamp",
  "demo-kids-educational-toy",
  "demo-baby-cotton-set",
  "demo-boys-joggers",
  "demo-baby-borka",
];

export function isDemoProductId(id: string): boolean {
  if (!id) return false;
  if (id.startsWith('demo-') || id.includes('demo-')) return true;
  return DEMO_PRODUCT_IDS.includes(id);
}

export const INITIAL_PRODUCTS: Product[] = [
  {
    "sku": "KB-2614",
    "name": "Digital Printed Three Pieces",
    "discountValue": 20,
    "subcategory": "Women's Collection",
    "discountType": "percentage",
    "pagePriorities": {
      "tag:New": 5,
      "home": 7,
      "shop": 9,
      "category:Fashion & Clothing": 12
    },
    "updatedAt": "2026-09-17T04:07:11.192Z",
    "discountPercent": 20,
    "saleBadge": "New",
    "images": [
      "https://lh3.googleusercontent.com/d/1jqpOLOcf_ie4rnptDVx7CgrlSibsSvaP",
      "https://lh3.googleusercontent.com/d/1yihn0oBpYGwsCZXBQTt47LTiNe3flcc8",
      "https://lh3.googleusercontent.com/d/1459to1B_bHHAp8thLSkva1BVEgn8x8X2"
    ],
    "price": 1200,
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals"
    ],
    "stock": 999,
    "description": "Digital Printed Three Pieces\n\nপ্রিমিয়াম ডিজিটাল প্রিন্টেড ৩ পিস—সুন্দর ফুলের ডিজাইন ও লেস ওয়ার্কের সাথে তৈরি এই ড্রেসটি আপনাকে দেবে মার্জিত ও স্টাইলিশ লুক। 🌸\nকামিজ, প্যান্ট ও গর্জেট ওড়নার কম্বিনেশনটি পার্টি, দাওয়াত কিংবা যেকোনো অনুষ্ঠানের জন্য দারুণ মানানসই। ❤️\n\n📌 Product Details\n• প্রোডাক্ট: ডিজিটাল প্রিন্টেড ৩ পিস।\n• ডিজাইন: প্রিমিয়াম ডিজিটাল প্রিন্ট ও লেস ওয়ার্ক।\n• ফেব্রিক্স: China Microstich।\n• কামিজ: Smooth Fabric, লেস ওয়ার্কসহ।\n• কামিজ লং: 28–29\"\n• প্যান্ট: Smooth Fabric, লং 39\"।\n• ওড়না: Gorget, লং 90\"।\n\n📏 Size Measurement\nL = 36/38\nXL = 40/42\nXXL = 44/46",
    "isHot": false,
    "isBestSeller": false,
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "brand": "KenaX Verified",
    "subSubcategory": "Readymate Theere pices",
    "rating": 4.9,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32515",
    "sizes": [
      "L",
      "XL",
      "XXL"
    ],
    "costPrice": 770,
    "supplierId": "supplier-shopbase",
    "keyHighlights": [
      {
        "icon": "clock",
        "id": "hl-1789617464331-0",
        "active": true,
        "text": "Original product specifications & brand warranty",
        "iconColor": "emerald"
      },
      {
        "iconColor": "emerald",
        "text": "Cash on Delivery home delivery available across Bangladesh",
        "active": true,
        "id": "hl-1789617464331-1",
        "icon": "check-circle"
      },
      {
        "id": "hl-1789617464331-2",
        "icon": "check-circle",
        "active": true,
        "iconColor": "emerald",
        "text": "Secure protective packaging for safe transit"
      },
      {
        "text": "Direct support & assistance from KenaX BD team",
        "icon": "check-circle",
        "iconColor": "emerald",
        "active": true,
        "id": "hl-1789617464331-3"
      }
    ],
    "originalPrice": 1500,
    "stockStatus": "in_stock",
    "isTrending": false,
    "childSubcategory": "Readymate Theere pices",
    "productType": "dropshipping",
    "id": "prod-1789618031192",
    "category": "Fashion & Clothing",
    "isFeatured": true,
    "createdAt": "2026-09-17T04:07:11.192Z",
    "isNew": true
  },
  {
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "costPrice": 399,
    "isBestSeller": false,
    "sizes": [
      "M",
      "L",
      "XL"
    ],
    "subSubcategory": "Half Sleeve Set",
    "discountPercent": 20,
    "subcategory": "Boys & Men's Fashion",
    "sku": "KB-7575",
    "brand": "KenaX Verified",
    "createdAt": "2026-09-16T04:46:28.899Z",
    "discountType": "percentage",
    "description": "**👕 Mash T-Shirt & Full Pant Set**\n\nProduct Type: T-Shirt & Pant Set\nCountry of Origin: Bangladesh\nMain Material: Mass Fabric\nColor: Same as Picture\n\n\n**T-Shirt**\n** Size      Chest    Long **\n      M          38        28 \n       L           40        29  \n      XL          42        30  \n\n**Pant**\n** Size      Waist      Long **\n      M          30          38 \n       L           32          40\n      XL          34          42",
    "originalPrice": 1000,
    "rating": 4.9,
    "isNew": true,
    "category": "Fashion & Clothing",
    "colors": [
      {
        "hexCode": "#0f100f",
        "name": "1",
        "imageUrl": "https://drive.google.com/thumbnail?id=1ta6l6Oisvzds2MdE1S7t3QRV_E1TazCn&sz=w800"
      },
      {
        "hexCode": "#0f100f",
        "name": "2",
        "imageUrl": "https://drive.google.com/thumbnail?id=1pB5baAdWM8wsdi7e_x0LBiae9NKxxSqm&sz=w800"
      },
      {
        "imageUrl": "https://drive.google.com/thumbnail?id=1-XK9ZJmGuTupWztTzV5FY3-kY7aIaWoU&sz=w800",
        "name": "3",
        "hexCode": "#0f100f"
      },
      {
        "hexCode": "#0f100f",
        "imageUrl": "https://drive.google.com/thumbnail?id=1ZpGPmBqmrzaLbxpm7wupvMprEc0haIle&sz=w800",
        "name": "4"
      }
    ],
    "stockStatus": "in_stock",
    "id": "prod-1789533988899",
    "name": "Mash T-Shirt & Full pant set",
    "updatedAt": "2026-09-16T04:49:00.729Z",
    "saleBadge": "New",
    "pagePriorities": {
      "home": 6
    },
    "supplierUrl": "https://shopbasebd.com/store/products/details/32523",
    "isTrending": false,
    "isHot": false,
    "childSubcategory": "Half Sleeve Set",
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Featured"
    ],
    "productType": "dropshipping",
    "discountValue": 20,
    "images": [
      "https://drive.google.com/thumbnail?id=1ta6l6Oisvzds2MdE1S7t3QRV_E1TazCn&sz=w800",
      "https://drive.google.com/thumbnail?id=1pB5baAdWM8wsdi7e_x0LBiae9NKxxSqm&sz=w800",
      "https://drive.google.com/thumbnail?id=1-XK9ZJmGuTupWztTzV5FY3-kY7aIaWoU&sz=w800",
      "https://drive.google.com/thumbnail?id=1ZpGPmBqmrzaLbxpm7wupvMprEc0haIle&sz=w800"
    ],
    "price": 800,
    "isFeatured": true,
    "stock": 999
  },
  {
    "colors": [
      {
        "imageUrl": "https://drive.google.com/thumbnail?id=1ZdixQj_xHiC4vr-7cfzJd5xIXQNbL-it&sz=w800",
        "name": "Black",
        "hexCode": "#111312"
      },
      {
        "hexCode": "#5c8ae6",
        "imageUrl": "https://drive.google.com/thumbnail?id=1WQze0yQCC4XfAj_u-2cyquVpD9a2eCcy&sz=w800",
        "name": "Blue"
      },
      {
        "imageUrl": "https://drive.google.com/thumbnail?id=1Onn0CcGLfUYswAPzNCdLCG_rhNAxiOVW&sz=w800",
        "name": "Misthy",
        "hexCode": "#2da9d2"
      }
    ],
    "discountPercent": 23,
    "stockStatus": "in_stock",
    "brand": "KenaX Verified",
    "rating": 4.9,
    "createdAt": "2026-09-15T16:29:15.795Z",
    "id": "prod-1789489755795",
    "isTrending": false,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32535",
    "discountValue": 23,
    "category": "Fashion & Clothing",
    "isFeatured": true,
    "isNew": true,
    "productType": "dropshipping",
    "costPrice": 620,
    "childSubcategory": "Two Piece",
    "isBestSeller": false,
    "images": [
      "https://drive.google.com/thumbnail?id=1ZdixQj_xHiC4vr-7cfzJd5xIXQNbL-it&sz=w800",
      "https://drive.google.com/thumbnail?id=1WQze0yQCC4XfAj_u-2cyquVpD9a2eCcy&sz=w800",
      "https://drive.google.com/thumbnail?id=1Onn0CcGLfUYswAPzNCdLCG_rhNAxiOVW&sz=w800"
    ],
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "subcategory": "Women's Collection",
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Hot Deals",
      "Featured"
    ],
    "description": "Georgette Two Piece Gown Set\n\nআকর্ষণীয় ডিজাইনের স্মকি গাউন।\nফেব্রিক্সঃ গার্মেন্টস জর্জেট।\nশার্টের লং ২৪ ইঞ্চি।\nরম্পার লং ৪৮'', ঘের ৯০''।\nশার্ট এন্ড রম্পার বডি সাইজ ফ্রী।\nবডি সাইজ ৪২ পর্যন্ত পরা যাবে।",
    "stock": 999,
    "subSubcategory": "Two Piece",
    "discountType": "percentage",
    "price": 999,
    "saleBadge": "New",
    "updatedAt": "2026-09-15T16:30:11.529Z",
    "isHot": false,
    "sku": "KB-2695",
    "originalPrice": 1300,
    "name": "Georgette Two Piece Gown Set"
  },
  {
    "discountPercent": 23,
    "stockStatus": "in_stock",
    "brand": "KenaX Verified",
    "rating": 4.9,
    "createdAt": "2026-09-15T16:22:28.425Z",
    "id": "prod-1789489348425",
    "isTrending": true,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32552",
    "discountValue": 23,
    "category": "Fashion & Clothing",
    "isFeatured": true,
    "isNew": false,
    "productType": "dropshipping",
    "costPrice": 760,
    "childSubcategory": "Three Piece & Kurti",
    "images": [
      "https://drive.google.com/thumbnail?id=1Z3boSZ7pvINgz6ZPEsBNL1TutHFvp-GT&sz=w800",
      "https://drive.google.com/thumbnail?id=1uozGIvWGD6m4BM9owbTGclIz9VGJCnY1&sz=w800"
    ],
    "isBestSeller": false,
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "subcategory": "Women's Collection",
    "tags": [
      "Shop",
      "Trending",
      "Featured"
    ],
    "description": "***Dragon Three Piece***\n\nপ্রিমিয়াম কটনের উপর সুন্দর আফসান প্রিন্ট, কুচি কুচি ডিজাইন, টারসেল ও লেস ওয়ার্কের চমৎকার কম্বিনেশন—যা আপনাকে দেবে স্টাইলিশ ও আকর্ষণীয় লুক। ✨\nএমব্রয়ডারি করা সালোয়ার ও টু-শেড শিফন জর্জেট ওড়না পুরো সেটটিকে আরও সুন্দর করে তুলেছে। 🌸\n\n📌 Product Details\n• ডিজাইন: Premium Afsan Print & Embroidery Work।\n• ফেব্রিক্স: Premium Pure Cotton।\n• কুর্তি: Golden Afsan Print।\n• কুর্তি ডিজাইন: কুচি কুচি ডিজাইন, টারসেল ও লেস ওয়ার্ক।\n• সালোয়ার: Pure Cotton, পুরো সালোয়ারে Embroidery Work।\n• ওড়না: Two Shade Chiffon Georgette।\n• সালোয়ার সাইজ: Free Size (38/40)।\n\n📏 Size Measurement\nL = 36/38\nXL = 40/42\nXXL = 44/46",
    "stock": 999,
    "discountType": "percentage",
    "subSubcategory": "Three Piece & Kurti",
    "price": 999,
    "saleBadge": "Trending",
    "updatedAt": "2026-09-15T16:30:22.081Z",
    "isHot": false,
    "originalPrice": 1300,
    "sku": "KB-3335",
    "name": "Dragon Three Piece"
  },
  {
    "name": "Baby Borka 2-8 Years",
    "sku": "KB-3128",
    "isNew": false,
    "costPrice": 770,
    "subSubcategory": "Baby Borka",
    "category": "Fashion & Clothing",
    "productType": "dropshipping",
    "childSubcategory": "Baby Borka",
    "images": [
      "https://lh3.googleusercontent.com/d/1xGL_YtbhSPJYJu1-RkUwnnviW3Yv8Rgd",
      "https://lh3.googleusercontent.com/d/1OcrOS4XmTyuCimaw6fwJ_-5qvyAqk_w1",
      "https://lh3.googleusercontent.com/d/19VWzYOi4jgZ0-6pvHhL_VqIXKe5LQBpe"
    ],
    "tags": [
      "Shop",
      "Trending",
      "Featured"
    ],
    "stockStatus": "in_stock",
    "brand": "KenaX Verified",
    "originalPrice": 1200,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32604",
    "createdAt": "2026-09-15T16:14:36.672Z",
    "keyHighlights": [
      {
        "iconColor": "emerald",
        "text": "Original product specifications & brand warranty",
        "id": "hl-1789648723427-0",
        "icon": "check-circle",
        "active": true
      },
      {
        "iconColor": "emerald",
        "id": "hl-1789648723427-1",
        "text": "Cash on Delivery home delivery available across Bangladesh",
        "active": true,
        "icon": "check-circle"
      },
      {
        "active": true,
        "iconColor": "emerald",
        "id": "hl-1789648723427-2",
        "icon": "check-circle",
        "text": "Secure protective packaging for safe transit"
      },
      {
        "icon": "check-circle",
        "active": true,
        "iconColor": "emerald",
        "id": "hl-1789648723427-3",
        "text": "Direct support & assistance from KenaX BD team"
      }
    ],
    "description": "Baby Borka 2-8 Years\n\n২ বছর থেকে ১৫ বছর বেবিদের দুবাই চেরি ফেব্রিক্সের ডাবল লেয়ার হিজাব সহ সুন্দর ডিজাইনের বোরকা সেট।\n\nবেবি বোতাম বোরকা\nডাবল লেয়ার হিজাব\nডুবাই চেরি কাপড়\nহিজাবসহ ফুলসেট\n২-১৫ বছর বাচ্চার জন্য\n\nসাইজ চার্টঃ\nBaby Borka 2-8 Years\n26 = 2 Years\n28 = 3 Years\n30 = 4 Years\n32 = 5 Years\n34 = 6 Years\n36 = 7 Years\n38 = 8 Years\n\nBaby Borka 9-15 Years\n40 = 9 Years\n42 = 10 Years\n44 = 11 Years\n46 = 12 Years\n48 = 13 Years\n50 = 14-15 Years",
    "isHot": false,
    "isTrending": true,
    "price": 1050,
    "saleBadge": "Trending",
    "isBestSeller": false,
    "stock": 999,
    "supplierId": "supplier-shopbase",
    "supplierName": "Shopbase Reseller",
    "updatedAt": "2026-09-17T12:38:57.797Z",
    "reviewsCount": 1,
    "id": "prod-1789488876672",
    "discountValue": 13,
    "discountPercent": 13,
    "discountType": "percentage",
    "isFeatured": true,
    "rating": 4.9,
    "subcategory": "Baby & Kids Collection"
  },
  {
    "stock": 999,
    "images": [
      "https://drive.google.com/thumbnail?id=1oMKSBjuZJUvkHtTZEhsH7Q4uRK2JXtYz&sz=w800",
      "https://drive.google.com/thumbnail?id=15vA8f7I9LyLEgWuPW5msk2s6-BBNpuV8&sz=w800",
      "https://drive.google.com/thumbnail?id=10S4yNbGiRNmlY_U5ynT8Yyz8Ij3Pvkvk&sz=w800"
    ],
    "description": "Boys Denim Baggy Joggers Pant 2-12Y\n\n২ বছর থেকে ১২ বছরের ছেলে বেবিদের সিক্স পকেটের প্রিমিয়াম ডেনিম ব্যাগি জগারস প্যান্ট।\n\nপ্যান্ট ডিটেইলসঃ\n✅ ১০০% কোয়ালিটিফুল প্রোডাক্ট, রং কশ গ্যারান্টি।\n✅ সফট কটন ডেনিম ফেব্রিক্সে তৈরি পরে আরাম।\n⛔ কোমর রাবার+ফিতা সিস্টেম, হুক এন্ড চেইন থাকবে না।\n✅ সামনে পিসনে মিলে সর্বমোট ৬ টি পকেট থাকবে।\n✅ সাইজঃ 2Y, 4Y, 6Y, 8Y, 10Y, 12Y।",
    "price": 600,
    "isHot": false,
    "discountValue": 20,
    "category": "Fashion & Clothing",
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Featured"
    ],
    "saleBadge": "New",
    "updatedAt": "2026-09-15T16:30:47.145Z",
    "subcategory": "Baby & Kids Collection",
    "name": "Boys Denim Baggy Joggers Pant 2-12Y",
    "originalPrice": 750,
    "colors": [
      {
        "imageUrl": "https://drive.google.com/thumbnail?id=1oMKSBjuZJUvkHtTZEhsH7Q4uRK2JXtYz&sz=w800",
        "hexCode": "#111312",
        "name": "Black"
      },
      {
        "hexCode": "#1b5cb1",
        "name": "Lite perple",
        "imageUrl": "https://drive.google.com/thumbnail?id=15vA8f7I9LyLEgWuPW5msk2s6-BBNpuV8&sz=w800"
      },
      {
        "imageUrl": "https://drive.google.com/thumbnail?id=10S4yNbGiRNmlY_U5ynT8Yyz8Ij3Pvkvk&sz=w800",
        "hexCode": "#9daee1",
        "name": "lite wash"
      }
    ],
    "createdAt": "2026-09-15T16:09:22.719Z",
    "supplierName": "shopbase Reseller",
    "rating": 4.9,
    "reviewsCount": 1,
    "isNew": true,
    "productType": "dropshipping",
    "isBestSeller": false,
    "isFeatured": true,
    "childSubcategory": "Boys Clothing",
    "stockStatus": "in_stock",
    "costPrice": 350,
    "id": "prod-1789488562719",
    "brand": "KenaX Verified",
    "supplierUrl": "https://shopbasebd.com/store/products/details/32959",
    "isTrending": false,
    "sku": "KB-1192",
    "discountPercent": 20,
    "discountType": "percentage",
    "subSubcategory": "Boys Clothing"
  },
  {
    "subcategory": "Bedding & Bath",
    "isNew": false,
    "sku": "KB-9623",
    "discountValue": 21,
    "isFeatured": true,
    "id": "prod-1789487667668",
    "discountType": "percentage",
    "saleBadge": "Featured",
    "category": "Home & Living",
    "updatedAt": "2026-09-15T15:58:44.926Z",
    "discountPercent": 21,
    "isTrending": false,
    "subSubcategory": "Bedsheets & Pillow Covers",
    "reviewsCount": 1,
    "brand": "KenaX Verified",
    "description": "**Official genuinWater Proof Bedsheet Set**\n\nওয়াটার প্রুফ থ্রিডি কুচি ডিজাইনের বিছানার কাভার সেট।\n✅ সাইজ : ৭/৮ ফিট ,চাদরের ৩ সাইডে কুচি থাকবে।\n✅খাট এর সাইজ ৬/৭ ফিট হলে কুচি গুলো সুন্দরভাবে দেখা যাবে।\n✅ বড় খাটের জন্য প্রযোজ্য।\n✅ সাথে ২ টি মাথার বালিশের কভার থাকবে।\n✅ ১ কোল বালিশের কভার থাকবে।\n✅ফেব্রিকস : চিলিকট\n\n🔕বিছানার চাদর ওয়াটার প্রুফ, কিন্তু বালিশের কাভার ও কোলবালিশ এর কাভার ওয়াটার প্রুফ না।\n🔕এগুলো তে জোড়া আছে।\n🔕এগুলো সুতি কাপড় না।e product with warranty and fast delivery across Bangladesh.",
    "rating": 4.9,
    "supplierName": "Shopbase Reseller",
    "isBestSeller": false,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32819",
    "isHot": false,
    "stock": 20,
    "tags": [
      "Shop",
      "Featured"
    ],
    "costPrice": 1580,
    "price": 1900,
    "originalPrice": 2400,
    "productType": "dropshipping",
    "images": [
      "https://drive.google.com/thumbnail?id=1Xz-XuSEq7B64mHPnKoGYVwZ1oYGY4bRd&sz=w800",
      "https://drive.google.com/thumbnail?id=1UGs8UB1pE_7WVzeVki_Oygrz-PVNLb8s&sz=w800",
      "https://drive.google.com/thumbnail?id=1MpQhMPTxiiyRO6GbIVRumkMKb45lhxvb&sz=w800"
    ],
    "name": "Water Proof Bedsheet Set",
    "childSubcategory": "Bedsheets & Pillow Covers",
    "createdAt": "2026-09-15T15:54:27.668Z"
  },
  {
    "brand": "KenaX Verified",
    "description": "**3D Print Dining Cover Set**\n\n✳️ আমাদের ডাইনিং কাভার গুলোতে ব্যবহার করা হয়েছে বেস্ট কোয়ালিটির কোরিয়ান সফট ভেলভেট কাপরের উপর 3D প্রিন্ট।\n✳️ ১০০% কালার গ্যারান্টি।\n🔵আমাদের প্যাকেজটিতে থাকছেঃ-\n✳️১ টি টেবিল ক্লথঃ সাইজ 5'/7' ফুট বা 60\"/86\" ইঞ্চি।\n✳️৬ টি চেয়ার কভার\n✳️বেস্ট কোয়ালিটির কোরিয়ান সফট ভেলভেট কাপর উপর 3D প্রিন্ট করা।\n✳️১০০% কালার গ্যারান্টি এবং ওয়াসএবেল।",
    "images": [
      "/images/products/dining-cover-3d-1.jpg",
      "/images/products/dining-cover-3d-2.jpg",
      "/images/products/dining-cover-3d-3.jpg",
      "/images/products/dining-cover-3d-4.jpg"
    ],
    "discountPercent": 25,
    "discountValue": 25,
    "isTrending": false,
    "sku": "KB-1249",
    "subcategory": "Kitchenware & Dining",
    "category": "Home & Living",
    "isNew": false,
    "isFeatured": true,
    "saleBadge": "None",
    "subSubcategory": "Dining Cover Set",
    "colors": [
      {
        "imageUrl": "",
        "name": "Cream Gold Floral",
        "hexCode": "#D4AF37"
      },
      {
        "imageUrl": "",
        "hexCode": "#2B7DA7",
        "name": "Sky Blue Floral"
      },
      {
        "hexCode": "#1E2229",
        "name": "Black Pink Floral",
        "imageUrl": ""
      },
      {
        "name": "Multi Vintage Floral",
        "imageUrl": "",
        "hexCode": "#D97D43"
      }
    ],
    "tags": [
      "Shop"
    ],
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "isBestSeller": false,
    "originalPrice": 1200,
    "id": "prod-1789446161398",
    "productType": "dropshipping",
    "rating": 4.9,
    "createdAt": "2026-09-15T04:22:41.398Z",
    "childSubcategory": "Dining Cover Set",
    "discountType": "percentage",
    "price": 900,
    "name": "3D Print Dining Cover Set",
    "stock": 25,
    "costPrice": 720,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32718",
    "isHot": false
  },
  {
    "isHot": false,
    "productType": "own",
    "price": 1200,
    "discountType": "percentage",
    "stock": 100,
    "createdAt": "2026-09-15T03:41:56.091Z",
    "sku": "KB-F003",
    "supplierUrl": "https://shopbasebd.com/store/products/details/32871",
    "discountValue": 20,
    "images": [
      "media://productImageMedia/img_prod-1789443716091_0_d5sy1",
      "media://productImageMedia/img_prod-1789443716091_1_k9o3j",
      "media://productImageMedia/img_prod-1789443716091_2_knyul",
      "media://productImageMedia/img_prod-1789443716091_3_pm01j",
      "media://productImageMedia/img_prod-1789443716091_4_ktnce",
      "media://productImageMedia/img_prod-1789443716091_5_jysbd",
      "media://productImageMedia/img_prod-1789443716091_6_tqgi5"
    ],
    "costPrice": 900,
    "isBestSeller": false,
    "id": "prod-1789443716091",
    "stockStatus": "in_stock",
    "supplierName": "Shopbase Reseller",
    "reviewsCount": 1,
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Hot Deals",
      "Featured"
    ],
    "isTrending": false,
    "isNew": true,
    "sourcingMemo": "Memo #4829 - Direct Cash",
    "description": "✨ **Exclusive Embroidery Three Piece Collection**\n\nঅভিজাত ডিজাইন ও আরামদায়ক কাপড়ের সুন্দর কম্বিনেশনে তৈরি **Embroidery Three Piece**। দৈনন্দিন ব্যবহার থেকে শুরু করে যেকোনো বিশেষ অনুষ্ঠানে এই ড্রেসটি আপনাকে দেবে আকর্ষণীয় ও স্টাইলিশ লুক। সফট কটন কাপড়ের এমব্রয়ডারি কাজ ও জর্জেট ওড়নার সুন্দর কম্বিনেশন পুরো সেটটিকে করেছে আরও এলিগ্যান্ট ও ট্রেন্ডি।\n\n📌 **পণ্যের বিস্তারিত**\n• **কাপড়:** Soft Cotton\n• **কামিজ:** Embroidery কাজ করা\n• **ওড়না:** Georgette\n• **সালোয়ার:** Cotton, Embroidery কাজ করা\n• আরামদায়ক ও পরতে স্বাচ্ছন্দ্যপূর্ণ\n• আকর্ষণীয় ও ট্রেন্ডি ডিজাইন\n• দৈনন্দিন ব্যবহার ও বিশেষ অনুষ্ঠানের জন্য উপযোগী\n\n📏 **Size Details**\n• **S:** 34/36\n• **M:** 38/40\n• **L:** 42\n• **XL:** 44\n• **XXL:** 46\n\n🛍️ **স্টাইল ও আরামের এই সুন্দর কম্বিনেশনটি আপনার কালেকশনে যোগ করতে আজই অর্ডার করুন।**",
    "category": "Fashion & Clothing",
    "sourcingAddress": "Islampur Cloth Wholesale Market, Shop #28, Dhaka",
    "subSubcategory": "Embroidery Three Piece",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "sourcingVendorName": "Haji Fabrics & Embroidery",
    "childSubcategory": "Embroidery Three Piece",
    "keyHighlights": [
      {
        "id": "hl-1789546237827-0",
        "active": true,
        "icon": "check-circle",
        "iconColor": "emerald",
        "text": "Original product specifications & brand warranty"
      },
      {
        "iconColor": "emerald",
        "id": "hl-1789546237827-1",
        "icon": "check-circle",
        "active": true,
        "text": "Cash on Delivery home delivery available across Bangladesh"
      },
      {
        "id": "hl-1789546237827-2",
        "iconColor": "emerald",
        "active": true,
        "icon": "check-circle",
        "text": "Secure protective packaging for safe transit"
      },
      {
        "text": "Direct support & assistance from KenaX BD team",
        "iconColor": "emerald",
        "icon": "check-circle",
        "active": true,
        "id": "hl-1789546237827-3"
      }
    ],
    "name": "Exclusive Embroidery Three Piece Collection",
    "subcategory": "Women's Collection",
    "originalPrice": 1500,
    "isFeatured": true,
    "rating": 4.9,
    "brand": "KenaX Verified",
    "discountPercent": 20,
    "colors": [
      {
        "name": "Black",
        "hexCode": "#1A1A1A",
        "imageUrl": "media://productImageMedia/img_prod-1789443716091_color_0_dr9lu"
      },
      {
        "imageUrl": "media://productImageMedia/img_prod-1789443716091_color_1_bo7q7",
        "hexCode": "#531D38",
        "name": "Wine"
      },
      {
        "hexCode": "#0B5351",
        "name": "Teal",
        "imageUrl": "media://productImageMedia/img_prod-1789443716091_color_2_768o9"
      }
    ],
    "saleBadge": "New",
    "sourcingPhone": "01712-894521",
    "updatedAt": "2026-09-15T04:09:58.388Z"
  },
  {
    "supplierName": "Shopbase Reseller",
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Featured"
    ],
    "sku": "KB-Th02",
    "reviewsCount": 1,
    "isFeatured": true,
    "description": "✨**Embroidery Three Piece**\n\nআপনার লুককে আরও **এলিগ্যান্ট ও আকর্ষণীয়** করতে বেছে নিন আমাদের **Embroidery Three Piece**। সফট কটনের আরাম, সুন্দর এমব্রয়ডারি ও জর্জেট ওড়নার লেস ওয়ার্ক—সব মিলিয়ে এক সেটেই পাবেন **স্টাইল ও কমফোর্টের পারফেক্ট কম্বিনেশন।**\n\n💖 **Product Details:**\n• **Fabric:** Soft Cotton\n• **Kameez:** Beautiful Embroidery Work\n• **Orna:** Georgette with Embroidery & Lace Work\n• **Salwar:** Cotton\n• **Size:** S, M, L, XL, XXL\n\n🌸 **Perfect for:** Daily Wear, Dawat, Party & Special Occasions.\n\n🛍️ **পছন্দের সাইজটি বেছে নিয়ে আজই অর্ডার করুন!**\n\n\n📏 **Size Details**\nS = 34/36\nM = 38/40\nL = 42\nXL = 44\nXXL = 46",
    "isBestSeller": false,
    "images": [
      "media://productImageMedia/img_prod-1789442885318_0_xxl6c",
      "media://productImageMedia/img_prod-1789442885318_1_yyqp7",
      "media://productImageMedia/img_prod-1789442885318_2_sv8n8"
    ],
    "subSubcategory": "Embroidery Three Piece",
    "originalPrice": 1500,
    "subcategory": "Women's Collection",
    "updatedAt": "2026-09-15T03:42:49.032Z",
    "isHot": false,
    "keyHighlights": [
      {
        "active": true,
        "iconColor": "emerald",
        "text": "Original product specifications & brand warranty",
        "id": "hl-1789546618301-0",
        "icon": "check-circle"
      },
      {
        "text": "Cash on Delivery home delivery available across Bangladesh",
        "id": "hl-1789546618301-1",
        "iconColor": "emerald",
        "active": true,
        "icon": "check-circle"
      },
      {
        "id": "hl-1789546618301-2",
        "icon": "check-circle",
        "active": true,
        "iconColor": "emerald",
        "text": "Secure protective packaging for safe transit"
      },
      {
        "id": "hl-1789546618301-3",
        "icon": "check-circle",
        "active": true,
        "iconColor": "emerald",
        "text": "Direct support & assistance from KenaX BD team"
      }
    ],
    "saleBadge": "Featured",
    "discountType": "percentage",
    "isTrending": false,
    "stock": 100,
    "price": 1200,
    "name": "Embroidery Three Piece",
    "productType": "dropshipping",
    "discountPercent": 20,
    "createdAt": "2026-09-15T03:28:05.318Z",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "id": "prod-1789442885318",
    "specifications": {
      "Orna": "Georgette with Embroidery & Lace Work",
      "Fabric": "Soft Cotton",
      "Kameez": "Beautiful Embroidery Work",
      "Salwar": "Cotton"
    },
    "brand": "KenaX Verified",
    "supplierUrl": "https://shopbasebd.com/store/products/details/32877",
    "costPrice": 950,
    "isNew": false,
    "colors": [
      {
        "name": "Black",
        "hexCode": "#111111",
        "imageUrl": "media://productImageMedia/img_prod-1789442885318_color_0_t7oj4"
      },
      {
        "name": "Deep Maroon",
        "imageUrl": "media://productImageMedia/img_prod-1789442885318_color_1_rt5ua",
        "hexCode": "#4A1525"
      },
      {
        "hexCode": "#0F4D4A",
        "name": "Bottle Green",
        "imageUrl": "media://productImageMedia/img_prod-1789442885318_color_2_8tmxa"
      }
    ],
    "stockStatus": "in_stock",
    "category": "Fashion & Clothing",
    "rating": 4.9,
    "childSubcategory": "Embroidery Three Piece",
    "discountValue": 20
  },
  {
    "updatedAt": "2026-09-14T02:42:01.225Z",
    "isHot": false,
    "saleBadge": "Trending",
    "colors": [
      {
        "name": "Maroon",
        "hexCode": "#800000",
        "imageUrl": "media://productImageMedia/img_prod-1789353178884_color_0_moc4j"
      },
      {
        "imageUrl": "media://productImageMedia/img_prod-1789353178884_color_1_ghy93",
        "name": "Black",
        "hexCode": "#000000"
      },
      {
        "name": "Sea Green",
        "imageUrl": "media://productImageMedia/img_prod-1789353178884_color_2_h9vx9",
        "hexCode": "#2E8B57"
      }
    ],
    "discountType": "percentage",
    "stockStatus": "in_stock",
    "originalPrice": 1500,
    "name": "Golap Gown Three Piece",
    "stock": 100,
    "discountPercent": 20,
    "price": 1200,
    "keyHighlights": [
      {
        "id": "hl-1789546754005-0",
        "text": "Original product specifications & brand warranty",
        "icon": "check-circle",
        "active": true,
        "iconColor": "emerald"
      },
      {
        "icon": "check-circle",
        "text": "Cash on Delivery home delivery available across Bangladesh",
        "active": true,
        "iconColor": "emerald",
        "id": "hl-1789546754005-1"
      },
      {
        "iconColor": "emerald",
        "id": "hl-1789546754005-2",
        "icon": "check-circle",
        "active": true,
        "text": "Secure protective packaging for safe transit"
      },
      {
        "id": "hl-1789546754005-3",
        "iconColor": "emerald",
        "active": true,
        "text": "Direct support & assistance from KenaX BD team",
        "icon": "check-circle"
      }
    ],
    "rating": 4.9,
    "supplierUrl": "https://shopbasebd.com/store/products/details/30488",
    "isBestSeller": false,
    "slug": "golap-gown-three-piece",
    "reviewsCount": 1,
    "sku": "KB-F001",
    "supplierName": "Shopbase Reseller",
    "category": "Fashion & Clothing",
    "tags": [
      "Shop",
      "Trending",
      "New Arrivals",
      "Hot Deals",
      "Featured"
    ],
    "productType": "dropshipping",
    "shortDescription": "dfgghfgghhgjhj\nfgghhjkkjlkug",
    "pagePriorities": {
      "home": 3,
      "category:Fashion & Clothing": 1,
      "tag:Trending": 4,
      "shop": 2
    },
    "costPrice": 750,
    "images": [
      "media://productImageMedia/img_prod-1789353178884_0_frpnh",
      "media://productImageMedia/img_prod-1789353178884_1_pomap",
      "media://productImageMedia/img_prod-1789353178884_2_gf36t"
    ],
    "supplierId": "supplier-shopbase",
    "isNew": false,
    "id": "prod-1789353178884",
    "discountValue": 20,
    "isTrending": true,
    "subcategory": "Women's Collection",
    "subSubcategory": "Readymade Three Piece",
    "description": "🌹 **Golap Gown Three Piece**\n\nস্টাইলিশ লুক ও আরামের সুন্দর সমন্বয়ে তৈরি **Golap Gown Three Piece**। প্রিমিয়াম সফট কটন ফেব্রিকের আকর্ষণীয় ফ্লোরাল প্রিন্ট ও সুন্দর লেস ওয়ার্ক এটিকে দিয়েছে একটি মার্জিত ও গর্জিয়াস লুক।\n\n✨ **Details:**\n• **Fabric:** Premium Soft Cotton\n• **Kameez:** Floral Printed with Sequence & Pearl Lace Work\n• **Salwar:** Matching Floral Printed\n• **Orna:** Printed Cotton with Lace Border\n• **Kameez Length:** 44–46\"\n• **Size:** S, M, L, XL, XXL\n• **Colors:** Maroon, Black & Sea Green\n• **Set:** Kameez + Salwar + Orna\n\n🌸 **Perfect for:** Party, Festival, Dawat & Casual Outing.",
    "isFeatured": true,
    "childSubcategory": "Readymade Three Piece",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "createdAt": "2026-09-14T02:32:58.884Z",
    "brand": "KenaX Verified"
  },
  {
    "costPrice": 410,
    "productType": "dropshipping",
    "isNew": false,
    "isTrending": false,
    "discountPercent": 22,
    "name": "Premium Solid Cotton Katua",
    "images": [
      "media://productImageMedia/img_prod-1789229254779_0_przqu",
      "media://productImageMedia/img_prod-1789229254779_1_p8al7",
      "media://productImageMedia/img_prod-1789229254779_2_4avcv",
      "media://productImageMedia/img_prod-1789229254779_3_kthas",
      "media://productImageMedia/img_prod-1789229254779_4_s2gjm",
      "media://productImageMedia/img_prod-1789229254779_5_vp6og",
      "media://productImageMedia/img_prod-1789229254779_6_3wuqb",
      "media://productImageMedia/img_prod-1789229254779_7_icq22",
      "media://productImageMedia/img_prod-1789229254779_8_aj761"
    ],
    "supplierUrl": "https://shopbasebd.com/store/products/details/32653",
    "discountValue": 22,
    "createdAt": "2026-09-12T16:07:34.779Z",
    "isFeatured": false,
    "sizes": [
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "category": "Fashion & Clothing",
    "brand": "KenaX Verified",
    "id": "prod-1789229254779",
    "updatedAt": "2026-09-12T16:10:09.645Z",
    "isHot": false,
    "supplierName": "Shopbase Reseller",
    "reviewsCount": 1,
    "saleBadge": "None",
    "isBestSeller": false,
    "stock": 40,
    "sku": "KB-0002",
    "price": 700,
    "description": "Premium Solid Cotton Katua\n\n👕 Product Details:\n✅ Premium Quality\n✅ Soft & Pure Cotton Fabric\n✅ Comfortable & Stylish Fit\n✅ Perfect for Everyday Wear\n\n📏 Available Sizes: M | L | XL | XXL\n\n📐 Size Measurement:\n🔹 M — Length 27\" | Chest 40\"\n🔹 L — Length 28\" | Chest 42\"\n🔹 XL — Length 29\" | Chest 44\"\n🔹 XXL — Length 30\" | Chest 46\"",
    "discountType": "percentage",
    "subcategory": "Boys & Men's Fashion",
    "rating": 4.9,
    "originalPrice": 898
  },
  {
    "name": "Premium Quality Katua",
    "discountValue": 33,
    "isNew": true,
    "sku": "KB-0001",
    "isTrending": false,
    "images": [
      "media://productImageMedia/img_prod-1789228715098_0_ancpw",
      "media://productImageMedia/img_prod-1789228715098_1_s4v10",
      "media://productImageMedia/img_prod-1789228715098_2_80hgw",
      "media://productImageMedia/img_prod-1789228715098_3_340qe",
      "media://productImageMedia/img_prod-1789228715098_4_hqiyy",
      "media://productImageMedia/img_prod-1789228715098_5_5sd3l"
    ],
    "description": "Premium Quality Katua\n\nFabrics : Oxford Cotton\nQuality: Export quality\nFashionable & Slim Fit\nColor: As given picture\n\nSize: M, L, XL, XXL\nM- long: 28\", body: 40\"\nL- long: 29\", body: 42\"\nXL- long: 30\", body: 44\"\nXXL-long:31\",body: 46\"",
    "subcategory": "Boys & Men's Fashion",
    "sizes": [
      "M",
      "L",
      "XL",
      "XXL"
    ],
    "isFeatured": false,
    "brand": "KenaX Verified",
    "updatedAt": "2026-09-12T21:53:16.277Z",
    "saleBadge": "None",
    "productType": "dropshipping",
    "discountType": "percentage",
    "isHot": false,
    "rating": 4.9,
    "category": "Fashion & Clothing",
    "price": 804,
    "discountPercent": 33,
    "createdAt": "2026-09-12T15:58:35.098Z",
    "stock": 40,
    "originalPrice": 1200,
    "supplierUrl": "https://shopbasebd.com/store/products/details/32841",
    "reviewsCount": 1,
    "supplierName": "Shopbase Reseller",
    "isBestSeller": false,
    "costPrice": 500,
    "id": "prod-1789228715098"
  }
];

export const PRODUCTION_PRODUCTS: Product[] = INITIAL_PRODUCTS;

export function getBaselineProducts(_isEnvPreview?: boolean): Product[] {
  return INITIAL_PRODUCTS;
}

