import { Product, Order } from '../types/index.ts';
import { safeSetLocalStorage } from '../lib/storage.ts';

export interface ProductInteractionStats {
  favoritesCount: number;
  addToCartCount: number;
  buyNowCount: number;
  popularityScore: number;
}

const STORAGE_KEY = 'kenax_product_popularity_stats';

// Load stored interaction stats from localStorage
export function getStoredPopularityStats(): Record<string, ProductInteractionStats> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse popularity stats from localStorage', err);
  }
  return {};
}

// Save stats
export function savePopularityStats(stats: Record<string, ProductInteractionStats>) {
  try {
    safeSetLocalStorage(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to save popularity stats', err);
  }
}

// Record an interaction action (favorite, cart, buy_now)
export function recordProductAction(
  productId: string,
  action: 'favorite' | 'unfavorite' | 'add_to_cart' | 'buy_now',
  quantity: number = 1
) {
  if (!productId) return;
  const allStats = getStoredPopularityStats();
  const current = allStats[productId] || {
    favoritesCount: 0,
    addToCartCount: 0,
    buyNowCount: 0,
    popularityScore: 0,
  };

  if (action === 'favorite') {
    current.favoritesCount = Math.max(0, current.favoritesCount + 1);
  } else if (action === 'unfavorite') {
    current.favoritesCount = Math.max(0, current.favoritesCount - 1);
  } else if (action === 'add_to_cart') {
    current.addToCartCount += Math.max(1, quantity);
  } else if (action === 'buy_now') {
    current.buyNowCount += Math.max(1, quantity);
  }

  // Weight formula: Buy Now (3x) + Add to Cart (2x) + Favorites (1x)
  current.popularityScore = (current.buyNowCount * 3) + (current.addToCartCount * 2) + (current.favoritesCount * 1);
  allStats[productId] = current;
  savePopularityStats(allStats);
}

// Compute dynamic popularity for all products merging store orders & stored interactions
export function computeProductPopularity(
  products: Product[] = [],
  orders: Order[] = [],
  wishlist: Product[] = [],
  cart: Array<{ productId?: string; id?: string; quantity?: number }> = []
): Map<string, ProductInteractionStats> {
  const localStats = getStoredPopularityStats();
  const map = new Map<string, ProductInteractionStats>();

  // Initialize from products and local storage
  products.forEach((p) => {
    const pId = p.id;
    const lStat = localStats[pId] || {
      favoritesCount: 0,
      addToCartCount: 0,
      buyNowCount: 0,
      popularityScore: 0,
    };

    // Calculate current live wishlist presence
    const isCurrentlyWishlisted = wishlist.some((w) => w.id === pId);
    const favCount = Math.max(lStat.favoritesCount, isCurrentlyWishlisted ? 1 : 0);

    // Calculate current live cart quantity
    const cartQty = cart
      .filter((c) => (c.productId || c.id) === pId)
      .reduce((sum, item) => sum + (item.quantity || 1), 0);
    const cartCount = Math.max(lStat.addToCartCount, cartQty);

    // Calculate orders count from live orders database
    const ordersBuyCount = orders.reduce((sum, ord) => {
      const items = ord.items || [];
      const match = items.filter((item) => (item.productId || (item as any).id) === pId);
      const itemSum = match.reduce((sub, it) => sub + (it.quantity || 1), 0);
      return sum + itemSum;
    }, 0);
    const buyCount = Math.max(lStat.buyNowCount, ordersBuyCount, (p as any).salesCount || (p as any).soldCount || 0);

    const baseSales = (p as any).salesCount || 0;
    const score = (buyCount * 3) + (cartCount * 2) + (favCount * 1) + Math.min(10, baseSales);

    map.set(pId, {
      favoritesCount: favCount,
      addToCartCount: cartCount,
      buyNowCount: buyCount,
      popularityScore: score,
    });
  });

  return map;
}

// Returns products sorted by popularity (most favorited, most added to cart, most bought)
export function getSortedPopularProducts(
  products: Product[] = [],
  orders: Order[] = [],
  wishlist: Product[] = [],
  cart: Array<{ productId?: string; id?: string; quantity?: number }> = [],
  limit?: number
): Product[] {
  const popMap = computeProductPopularity(products, orders, wishlist, cart);

  const sorted = [...products].sort((a, b) => {
    const scoreA = popMap.get(a.id)?.popularityScore || 0;
    const scoreB = popMap.get(b.id)?.popularityScore || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    // Secondary sort: stock availability & rating
    return (b.rating || 0) - (a.rating || 0);
  });

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

// Returns action stats for a single product
export function getProductActionStats(productId: string): ProductInteractionStats {
  if (!productId) {
    return { favoritesCount: 0, addToCartCount: 0, buyNowCount: 0, popularityScore: 0 };
  }
  const allStats = getStoredPopularityStats();
  return (
    allStats[productId] || {
      favoritesCount: 0,
      addToCartCount: 0,
      buyNowCount: 0,
      popularityScore: 0,
    }
  );
}

// Returns aggregated 'add_to_cart' and 'buy_now' count for a product
export function getProductCartAndBuyCount(productId: string): number {
  const stats = getProductActionStats(productId);
  return (stats.addToCartCount || 0) + (stats.buyNowCount || 0);
}

// Checks whether a product meets the popularity threshold (e.g. >= 2 cart or buy interactions)
export function isProductPopular(productId: string, threshold: number = 2): boolean {
  if (!productId) return false;
  const count = getProductCartAndBuyCount(productId);
  if (count >= threshold) return true;
  const stats = getProductActionStats(productId);
  return (stats.popularityScore || 0) >= threshold * 2;
}

// Enriches product objects with live popularity info for ChatBot API
export function enrichProductsWithPopularity(
  products: Product[] = [],
  orders: Order[] = [],
  wishlist: Product[] = [],
  cart: Array<{ productId?: string; id?: string; quantity?: number }> = []
) {
  const popMap = computeProductPopularity(products, orders, wishlist, cart);

  return products.map((p) => {
    const stats = popMap.get(p.id) || {
      favoritesCount: 0,
      addToCartCount: 0,
      buyNowCount: 0,
      popularityScore: 0,
    };

    return {
      id: p.id,
      name: p.name,
      banglaName: p.banglaName,
      category: p.category,
      subcategory: p.subcategory,
      subSubcategory: p.subSubcategory || p.childSubcategory,
      price: p.price,
      originalPrice: p.originalPrice,
      stock: p.stock,
      colors: p.colors,
      sizes: p.sizes,
      variations: p.variations,
      featuredImage: p.featuredImage || p.image || (Array.isArray(p.images) ? p.images[0] : ''),
      description: (p.description || '').slice(0, 300),
      favoritesCount: stats.favoritesCount,
      addToCartCount: stats.addToCartCount,
      buyNowCount: stats.buyNowCount,
      popularityScore: stats.popularityScore,
      isPopular: stats.popularityScore > 0,
    };
  });
}
