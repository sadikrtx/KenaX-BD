import { PromoBannerItem, PromoGridPlacementSettings, PromoGridSettings } from '../types';

export const DEFAULT_PROMO_GRID_PLACEMENTS: PromoGridPlacementSettings = {
  // Homepage
  showOnHomepage: true,
  homepagePosition: 'after_category_nav', // 'after_category_nav' | 'after_popular_products' | 'bottom_before_footer'

  // Shop / All Products
  showOnShopPage: false,
  shopPosition: 'between_categories_and_products', // 'top_above_filters' | 'between_categories_and_products' | 'middle_products' | 'bottom_below_products'

  // Category Pages (Electronics, Fashion, etc.)
  showOnCategoryPages: false,
  categoryFilterMode: 'all', // 'all' | 'specific'
  selectedCategoryNames: ['Electronics & Gadgets', 'Fashion & Clothing'],
  categoryPosition: 'top_above_products', // 'top_above_products' | 'middle_products' | 'bottom_below_products'

  // Flash Sale / Deals
  showOnFlashSalePage: false,
  flashSalePosition: 'top_below_countdown', // 'top_below_countdown' | 'middle_deals' | 'bottom_below_deals'

  // Tag Collection Pages
  showOnTagPages: false,
  tagFilterMode: 'all',
  selectedTags: ['Flash Sale', 'Trending', 'New Arrivals'],
  tagPosition: 'top_above_products', // 'top_above_products' | 'middle_products' | 'bottom_below_products'
};

export const DEFAULT_PROMO_BANNERS: PromoBannerItem[] = [
  {
    id: 'promo-banner-1',
    badge: 'Mega Offers',
    badgeIcon: 'zap',
    badgeColor: 'sky',
    title: 'UP TO 70% OFF',
    highlightText: '70% OFF',
    subtitle: 'Top Brands | Best Quality | Limited Time',
    description: 'Massive seasonal price drops across electronics and trending gear.',
    buttonText: 'Shop Now',
    buttonLink: 'category:Electronics & Gadgets',
    buttonVariant: 'primary',
    gradientTheme: 'from-blue-900 to-sky-900',
    overlayOpacity: 20,
    enabled: true,
    showOnDesktop: true,
    showOnMobile: true,
    showBadge: true,
    showButton: true,
    showSubtitle: true,
  },
  {
    id: 'promo-banner-2',
    badge: 'Fashion Collection',
    badgeIcon: 'sparkles',
    badgeColor: 'rose',
    title: 'For Everyone',
    highlightText: '',
    subtitle: 'Trendy Styles | Best Quality Bangladeshi Fits',
    description: 'Curated apparel, stylish streetwear, and premium lifestyle choices.',
    buttonText: 'Explore Fashion',
    buttonLink: 'category:Fashion & Clothing',
    buttonVariant: 'secondary',
    gradientTheme: 'from-slate-900 via-sky-950 to-slate-900',
    overlayOpacity: 20,
    enabled: true,
    showOnDesktop: true,
    showOnMobile: true,
    showBadge: true,
    showButton: true,
    showSubtitle: true,
  },
  {
    id: 'promo-banner-3',
    badge: 'Home Essentials',
    badgeIcon: 'flame',
    badgeColor: 'amber',
    title: 'For Better Living',
    highlightText: '',
    subtitle: 'Modern Kitchen & Living | Great Deals',
    description: 'Smart appliances, kitchen essentials, and comfort furniture upgrades.',
    buttonText: 'Shop Home',
    buttonLink: 'category:Home & Living',
    buttonVariant: 'primary',
    gradientTheme: 'from-amber-700 via-amber-800 to-slate-900',
    overlayOpacity: 20,
    enabled: true,
    showOnDesktop: true,
    showOnMobile: true,
    showBadge: true,
    showButton: true,
    showSubtitle: true,
  },
];

export const DEFAULT_PROMO_GRID_SETTINGS: PromoGridSettings = {
  enabled: true,
  showOnDesktop: true,
  showOnMobile: true,
  sectionTitle: '',
  banners: DEFAULT_PROMO_BANNERS,
  placements: DEFAULT_PROMO_GRID_PLACEMENTS,
};

export function getCleanPromoGridSettings(raw?: Partial<PromoGridSettings> | PromoBannerItem[]): PromoGridSettings {
  if (!raw) return DEFAULT_PROMO_GRID_SETTINGS;

  if (Array.isArray(raw)) {
    return {
      enabled: true,
      showOnDesktop: true,
      showOnMobile: true,
      banners: raw.length > 0 ? raw : DEFAULT_PROMO_BANNERS,
      placements: DEFAULT_PROMO_GRID_PLACEMENTS,
    };
  }

  const banners = raw.banners && Array.isArray(raw.banners) && raw.banners.length > 0
    ? raw.banners
    : DEFAULT_PROMO_BANNERS;

  const placements: PromoGridPlacementSettings = {
    ...DEFAULT_PROMO_GRID_PLACEMENTS,
    ...(raw.placements || {}),
  };

  return {
    enabled: raw.enabled !== undefined ? raw.enabled : true,
    showOnDesktop: raw.showOnDesktop !== undefined ? raw.showOnDesktop : true,
    showOnMobile: raw.showOnMobile !== undefined ? raw.showOnMobile : true,
    sectionTitle: raw.sectionTitle || '',
    banners,
    placements,
  };
}
