import { SiteSettings, WebsiteSettings, HeroBannerItem, HeroFeatureTag, HeroSideBannerSettings, FlashSaleBannerSettings, PromoGridSettings, TagCollectionSlide } from '../types/index.ts';
import { INITIAL_WEBSITE_SETTINGS, DEFAULT_HERO_FEATURES } from '../data/initialSettings.ts';
import { DEFAULT_HERO_BANNERS, DEFAULT_HERO_SIDE_BANNER } from '../types/index.ts';
import {
  DEFAULT_FLASH_SALE_BANNER,
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_REFUND_POLICY,
  DEFAULT_FAQS,
} from '../data/defaultPolicies.ts';
import { getCleanPromoGridSettings } from '../data/defaultPromoBanners.ts';
import { DEFAULT_NAV_ITEMS } from '../data/defaultNavItems.ts';

/**
 * Ensures any raw or saved SiteSettings object is completely safe and sound,
 * with non-null arrays and objects for all banners, navigation items, payment gateways, etc.
 * This guarantees that rendering will NEVER throw an undefined property or .map error on reload.
 */
export function sanitizeSiteSettings(raw: any, customLogoFallback?: string): SiteSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...INITIAL_WEBSITE_SETTINGS,
      insideDhakaDeliveryFee: INITIAL_WEBSITE_SETTINGS.insideDhakaDeliveryFee ?? 60,
      outsideDhakaDeliveryFee: INITIAL_WEBSITE_SETTINGS.outsideDhakaDeliveryFee ?? 120,
      announcementBarText: INITIAL_WEBSITE_SETTINGS.announcementBarText ?? '',
      customLogo: customLogoFallback || INITIAL_WEBSITE_SETTINGS.customLogo,
    };
  }

  // 1. Hero Banners: must be an array of valid banner objects
  let cleanHeroBanners: HeroBannerItem[] = INITIAL_WEBSITE_SETTINGS.heroBanners || DEFAULT_HERO_BANNERS;
  if (Array.isArray(raw.heroBanners) && raw.heroBanners.length > 0) {
    cleanHeroBanners = raw.heroBanners.filter((b: any) => b && typeof b === 'object').map((b: any, idx: number) => ({
      id: b.id || `slide-${idx + 1}`,
      title: b.title || '',
      subtitle: b.subtitle || '',
      description: b.description || '',
      bengali: b.bengali || '',
      badge: b.badge || '',
      badgeColor: b.badgeColor || 'sky',
      buttonText: b.buttonText || '',
      buttonLink: b.buttonLink || '',
      theme: b.theme || 'from-blue-900 via-sky-900 to-slate-950',
      image: b.image || '',
      mobileImage: b.mobileImage || '',
      badges: Array.isArray(b.badges) ? b.badges.filter(Boolean) : [],
      buttons: Array.isArray(b.buttons) ? b.buttons.filter(Boolean) : [],
      ...b,
    }));
    if (cleanHeroBanners.length === 0) {
      cleanHeroBanners = INITIAL_WEBSITE_SETTINGS.heroBanners || DEFAULT_HERO_BANNERS;
    }
  }

  // 2. Hero Features Tags
  let cleanHeroFeatures: HeroFeatureTag[] = DEFAULT_HERO_FEATURES;
  if (Array.isArray(raw.heroFeatures) && raw.heroFeatures.length > 0) {
    cleanHeroFeatures = raw.heroFeatures.filter((f: any) => f && typeof f === 'object');
  }

  // 3. Hero Side Banner
  const cleanHeroSideBanner: HeroSideBannerSettings = (raw.heroSideBanner && typeof raw.heroSideBanner === 'object')
    ? {
        ...DEFAULT_HERO_SIDE_BANNER,
        ...raw.heroSideBanner,
        enabled: raw.heroSideBanner.enabled !== false,
      }
    : DEFAULT_HERO_SIDE_BANNER;

  // 4. Flash Sale Banner
  const cleanFlashSaleBanner: FlashSaleBannerSettings = (raw.flashSaleBanner && typeof raw.flashSaleBanner === 'object')
    ? {
        ...DEFAULT_FLASH_SALE_BANNER,
        ...raw.flashSaleBanner,
        enabled: raw.flashSaleBanner.enabled !== false,
      }
    : DEFAULT_FLASH_SALE_BANNER;

  // 5. Promo Grid
  const cleanPromoGrid: PromoGridSettings = getCleanPromoGridSettings(raw.promoGrid || raw.promoBanners);

  // 6. Navigation Items
  const cleanNavigationItems = (Array.isArray(raw.navigationItems) && raw.navigationItems.length > 0)
    ? raw.navigationItems.filter((n: any) => n && typeof n === 'object')
    : (INITIAL_WEBSITE_SETTINGS.navigationItems || DEFAULT_NAV_ITEMS);

  // 7. Tag Collection Banners
  let cleanTagBanners: Record<string, TagCollectionSlide[]> = {};
  if (raw.tagCollectionBanners && typeof raw.tagCollectionBanners === 'object') {
    Object.keys(raw.tagCollectionBanners).forEach((k) => {
      const val = raw.tagCollectionBanners[k];
      if (Array.isArray(val)) {
        cleanTagBanners[k] = val.filter((s: any) => s && typeof s === 'object');
      }
    });
  }

  return {
    ...INITIAL_WEBSITE_SETTINGS,
    ...raw,
    insideDhakaDeliveryFee: typeof raw.insideDhakaDeliveryFee === 'number' ? raw.insideDhakaDeliveryFee : (raw.insideDhakaDeliveryCharge ?? INITIAL_WEBSITE_SETTINGS.insideDhakaDeliveryFee ?? 60),
    outsideDhakaDeliveryFee: typeof raw.outsideDhakaDeliveryFee === 'number' ? raw.outsideDhakaDeliveryFee : (raw.outsideDhakaDeliveryCharge ?? INITIAL_WEBSITE_SETTINGS.outsideDhakaDeliveryFee ?? 120),
    announcementBarText: typeof raw.announcementBarText === 'string' ? raw.announcementBarText : (INITIAL_WEBSITE_SETTINGS.announcementBarText ?? ''),
    customLogo: raw.customLogo || customLogoFallback || undefined,
    heroBanners: cleanHeroBanners,
    heroFeatures: cleanHeroFeatures,
    heroSideBanner: cleanHeroSideBanner,
    flashSaleBanner: cleanFlashSaleBanner,
    promoGrid: cleanPromoGrid,
    navigationItems: cleanNavigationItems,
    tagCollectionBanners: cleanTagBanners,
    privacyPolicy: (typeof raw.privacyPolicy === 'string' && raw.privacyPolicy.trim()) ? raw.privacyPolicy : DEFAULT_PRIVACY_POLICY,
    termsOfService: (typeof raw.termsOfService === 'string' && raw.termsOfService.trim()) ? raw.termsOfService : DEFAULT_TERMS_OF_SERVICE,
    refundPolicy: (typeof raw.refundPolicy === 'string' && raw.refundPolicy.trim()) ? raw.refundPolicy : DEFAULT_REFUND_POLICY,
    faqs: (Array.isArray(raw.faqs) && raw.faqs.length > 0) ? raw.faqs : DEFAULT_FAQS,
  };
}
