import { TagCollectionSlide, WebsiteSettings } from '../types/index.ts';

/**
 * Returns default banner slides for a specific tag or collection if custom ones are not yet saved.
 */
export function getDefaultTagSlides(tag: string, itemCount: number = 0): TagCollectionSlide[] {
  const cleanTag = (tag || '').trim();
  const lowerTag = cleanTag.toLowerCase();

  // 1. Flash Sale Default Slide
  if (lowerTag.includes('flash') || lowerTag.includes('hot')) {
    return [
      {
        id: 'flash-default-1',
        badge: 'FLASH SALE',
        title: 'Flash Sale Collection',
        subtitle: 'Limited Time Discounts & Huge Savings',
        description: 'Explore authentic items tagged under Flash Sale with guaranteed quality, fast nationwide delivery, and Cash on Delivery across Bangladesh.',
        bengaliText: 'Enjoy limited-time special flash sale offers with Cash on Delivery nationwide.',
        itemCountText: `${itemCount > 0 ? itemCount : 14} Items Available`,
        stockStatusText: '100% Verified Stock',
        gradientTheme: 'from-rose-600 via-red-600 to-amber-600',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Order Now', link: 'shop', variant: 'primary' },
          { id: 'btn-2', text: 'WhatsApp Order', link: 'whatsapp', variant: 'whatsapp' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 2. New Arrivals Default Slide
  if (lowerTag.includes('new') || lowerTag.includes('arrival')) {
    return [
      {
        id: 'new-default-1',
        badge: 'NEW ARRIVALS',
        title: 'New Arrivals Collection',
        subtitle: 'Latest Gadgets & Modern Products',
        description: 'Explore authentic newly arrived products with guaranteed quality, fast nationwide delivery, and Cash on Delivery across Bangladesh.',
        bengaliText: 'Check out trending and latest product collections first.',
        itemCountText: `${itemCount > 0 ? itemCount : 10} New Items`,
        stockStatusText: '100% Fresh Stock',
        gradientTheme: 'from-sky-600 via-indigo-600 to-blue-700',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Explore New Products', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 3. Deals Default Slide
  if (lowerTag.includes('deal') || lowerTag.includes('offer')) {
    return [
      {
        id: 'deal-default-1',
        badge: 'SPECIAL DEALS',
        title: 'Deals & Discount Offers',
        subtitle: 'Unbeatable Prices Guaranteed',
        description: 'Explore authentic items tagged under Deals with guaranteed quality, fast nationwide delivery, and Cash on Delivery across Bangladesh.',
        bengaliText: 'Buy essential gadgets and accessories with special discounts.',
        itemCountText: `${itemCount > 0 ? itemCount : 12} Deals Available`,
        stockStatusText: '100% Verified Offers',
        gradientTheme: 'from-amber-600 via-amber-700 to-orange-700',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Claim Offer', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 4. Trending Default Slide
  if (lowerTag.includes('trend')) {
    return [
      {
        id: 'trending-default-1',
        badge: 'TRENDING NOW',
        title: 'Trending Gadgets & Deals',
        subtitle: 'Most Popular Items Loved by Shoppers',
        description: 'Discover viral, trending, and top-selling electronics, smart accessories, and gadgets with authentic warranty and fast delivery across Bangladesh.',
        bengaliText: 'Check out the most trending and viral gadget deals.',
        itemCountText: `${itemCount > 0 ? itemCount : 15} Trending Items`,
        stockStatusText: '100% In Stock & Verified',
        gradientTheme: 'from-amber-500 via-orange-600 to-red-600',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Shop Trending Deals', link: 'shop', variant: 'primary' },
          { id: 'btn-2', text: 'WhatsApp Order', link: 'whatsapp', variant: 'whatsapp' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 5. Best Sellers Default Slide
  if (lowerTag.includes('bestseller') || lowerTag.includes('best seller') || lowerTag.includes('best')) {
    return [
      {
        id: 'bestseller-default-1',
        badge: 'BEST SELLERS',
        title: 'Best Selling Collection',
        subtitle: 'Top Rated & Highest Selling Products',
        description: 'Our all-time best sellers rated 5 stars by satisfied customers across Bangladesh. Enjoy authentic quality and fast Cash on Delivery.',
        bengaliText: 'Explore Bangladesh\'s top-rated bestselling products.',
        itemCountText: `${itemCount > 0 ? itemCount : 12} Best Sellers`,
        stockStatusText: '100% Customer Favorite',
        gradientTheme: 'from-emerald-600 via-teal-700 to-slate-900',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Explore Best Sellers', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 6. Smartphones & Mobile Preset
  if (lowerTag.includes('smart') || lowerTag.includes('phone') || lowerTag.includes('mobile')) {
    return [
      {
        id: 'phone-default-1',
        badge: 'SMARTPHONES',
        title: 'Smartphones & Mobile Devices',
        subtitle: 'Official Warranty & Flagship Performance',
        description: 'Discover brand new smartphones with official warranty, incredible high-resolution cameras, and all-day battery life with fast nationwide delivery.',
        bengaliText: 'Buy genuine smartphones with official warranty and fast Cash on Delivery.',
        itemCountText: `${itemCount > 0 ? itemCount : 10} Phones`,
        stockStatusText: '100% Genuine & Official',
        gradientTheme: 'from-blue-600 via-indigo-700 to-slate-900',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'View Smartphones', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 7. Gadgets Preset
  if (lowerTag.includes('gadget')) {
    return [
      {
        id: 'gadgets-default-1',
        badge: 'SMART GADGETS',
        title: 'Next-Gen Gadgets & Lifestyle',
        subtitle: 'Smart Watches, Audio & Tech Accessories',
        description: 'High performance smart gadgets, bluetooth earbuds, charging solutions, and smart life accessories with fast delivery across Bangladesh.',
        bengaliText: 'Explore latest smart gadgets and premium tech accessories.',
        itemCountText: `${itemCount > 0 ? itemCount : 18} Gadgets`,
        stockStatusText: '100% Verified Stock',
        gradientTheme: 'from-purple-600 via-indigo-600 to-slate-900',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Shop Gadgets', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 8. Xiaomi Brand Slide Preset
  if (lowerTag.includes('xiaomi')) {
    return [
      {
        id: 'xiaomi-default-1',
        badge: 'XIAOMI OFFICIAL',
        title: 'Xiaomi Smart Collection',
        subtitle: 'Innovation For Everyone',
        description: 'Discover authentic Xiaomi smartphones, smartwatches, earbuds, and ecosystem products with official warranty and fast delivery across Bangladesh.',
        bengaliText: 'Buy original Xiaomi gadgets and smartphones at best prices.',
        itemCountText: `${itemCount > 0 ? itemCount : 8} Xiaomi Items`,
        stockStatusText: '100% Original Xiaomi',
        gradientTheme: 'from-orange-600 via-amber-600 to-red-600',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'View Xiaomi Products', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 9. Redmi Brand Slide Preset
  if (lowerTag.includes('redmi')) {
    return [
      {
        id: 'redmi-default-1',
        badge: 'REDMI SERIES',
        title: 'Redmi Smartphones & Gadgets',
        subtitle: 'Performance Beyond Bounds',
        description: 'Authentic Redmi devices with official warranty, high resolution cameras, long lasting battery life, and Cash on Delivery in BD.',
        bengaliText: 'Attractive offers on Redmi smartphones and gadgets.',
        itemCountText: `${itemCount > 0 ? itemCount : 6} Redmi Items`,
        stockStatusText: '100% Genuine Redmi',
        gradientTheme: 'from-red-600 via-rose-700 to-red-800',
        overlayOpacity: 30,
        horizontalAlign: 'left',
        verticalAlign: 'center',
        offsetX: 0,
        offsetY: 0,
        textColor: 'white',
        buttons: [
          { id: 'btn-1', text: 'Explore Redmi', link: 'shop', variant: 'primary' },
        ],
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showDescription: true,
        showBengaliText: false,
        showStats: true,
      },
    ];
  }

  // 10. Generic Tag / Category Fallback Slide
  return [
    {
      id: `tag-default-${Date.now()}`,
      badge: cleanTag.toUpperCase(),
      title: `${cleanTag} Collection`,
      subtitle: `Best Selection of ${cleanTag}`,
      description: `Explore authentic items tagged under ${cleanTag} with guaranteed quality, fast nationwide delivery, and Cash on Delivery across Bangladesh.`,
      bengaliText: `Enjoy special offers on ${cleanTag} with fast delivery nationwide.`,
      itemCountText: `${itemCount > 0 ? itemCount : 8} Items Available`,
      stockStatusText: '100% Verified Stock',
      gradientTheme: 'from-purple-600 via-indigo-600 to-slate-900',
      overlayOpacity: 30,
      horizontalAlign: 'left',
      verticalAlign: 'center',
      offsetX: 0,
      offsetY: 0,
      textColor: 'white',
      buttons: [
        { id: 'btn-1', text: 'Shop Collection', link: 'shop', variant: 'primary' },
      ],
      showBadge: true,
      showTitle: true,
      showSubtitle: true,
      showDescription: true,
      showBengaliText: false,
      showStats: true,
    },
  ];
}

/**
 * Gets configured banner slides for a tag from site settings or falls back to defaults.
 */
export function getTagSlides(
  tag: string,
  tagCollectionBanners?: Record<string, TagCollectionSlide[]>,
  itemCount: number = 0
): TagCollectionSlide[] {
  const cleanKey = (tag || '').trim().toLowerCase();
  const rawTag = (tag || '').trim();
  if (tagCollectionBanners) {
    if (Object.prototype.hasOwnProperty.call(tagCollectionBanners, cleanKey) && Array.isArray(tagCollectionBanners[cleanKey])) {
      return tagCollectionBanners[cleanKey];
    }
    if (Object.prototype.hasOwnProperty.call(tagCollectionBanners, rawTag) && Array.isArray(tagCollectionBanners[rawTag])) {
      return tagCollectionBanners[rawTag];
    }
    const matchKey = Object.keys(tagCollectionBanners).find(
      (k) => k.trim().toLowerCase() === cleanKey
    );
    if (matchKey && Array.isArray(tagCollectionBanners[matchKey])) {
      return tagCollectionBanners[matchKey];
    }
  }
  return getDefaultTagSlides(tag, itemCount);
}
