import { Product, Category } from '../types';

const RECENT_SEARCHES_KEY = 'kenax_recent_searches_v1';
const RECENT_PRODUCTS_KEY = 'kenax_recent_search_products_v1';
const MAX_RECENT_SEARCHES = 8;
const MAX_RECENT_PRODUCTS = 6;

export interface SmartSearchOptions {
  categoryFilter?: string;
  sortBy?: 'relevance' | 'price-asc' | 'price-desc' | 'rating';
  limit?: number;
}

export interface SmartSearchResult {
  products: Product[];
  totalMatches: number;
  matchedCategories: Category[];
  matchedBrands: string[];
  detectedMaxPrice: number | null;
  cleanedKeyword: string;
}

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): string[] {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 2 || trimmed.startsWith('/')) {
    return getRecentSearches();
  }
  try {
    const current = getRecentSearches();
    const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('kenax-recent-search-updated'));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentSearch(query: string): string[] {
  try {
    const current = getRecentSearches();
    const updated = current.filter((item) => item.toLowerCase() !== query.trim().toLowerCase());
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('kenax-recent-search-updated'));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearches(): string[] {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    window.dispatchEvent(new CustomEvent('kenax-recent-search-updated'));
  } catch {}
  return [];
}

export function getRecentSearchProductIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function addRecentSearchProductId(productId: string): string[] {
  if (!productId) return getRecentSearchProductIds();
  try {
    const current = getRecentSearchProductIds();
    const filtered = current.filter((id) => id !== productId);
    const updated = [productId, ...filtered].slice(0, MAX_RECENT_PRODUCTS);
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('kenax-recent-search-updated'));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentSearchProducts(): void {
  try {
    localStorage.removeItem(RECENT_PRODUCTS_KEY);
    window.dispatchEvent(new CustomEvent('kenax-recent-search-updated'));
  } catch {}
}

/**
 * Extracts optional price filter expressions like:
 * "watch under 2000", "earbuds below 1500", "< 1000", "under 500 tk"
 */
function parsePriceConstraint(rawQuery: string): {
  cleanedKeyword: string;
  maxPrice: number | null;
} {
  let text = rawQuery.trim();
  let maxPrice: number | null = null;

  const underRegex = /\b(?:under|below|less than|max|নিচে|মধ্যে)\s*(?:tk|bdt|৳)?\s*(\d{2,6})\s*(?:tk|bdt|টাকা|৳)?\b/i;
  const symbolRegex = /(?:<=|<)\s*(?:tk|bdt|৳)?\s*(\d{2,6})\s*(?:tk|bdt|টাকা|৳)?/i;

  const underMatch = text.match(underRegex);
  if (underMatch && underMatch[1]) {
    const parsed = parseInt(underMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      maxPrice = parsed;
      text = text.replace(underMatch[0], ' ').trim();
    }
  } else {
    const symMatch = text.match(symbolRegex);
    if (symMatch && symMatch[1]) {
      const parsed = parseInt(symMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        maxPrice = parsed;
        text = text.replace(symMatch[0], ' ').trim();
      }
    }
  }

  return {
    cleanedKeyword: text.replace(/\s+/g, ' ').trim(),
    maxPrice,
  };
}

/**
 * Lightweight edit-distance / typo tolerance check for tokens >= 4 chars
 */
function isFuzzyTokenMatch(token: string, targetWord: string): boolean {
  if (!token || !targetWord) return false;
  if (targetWord.includes(token)) return true;
  if (token.length < 4 || targetWord.length < 4) return false;

  // Check if token is within 1 character edit of targetWord prefix or full word
  const compared = targetWord.slice(0, Math.min(targetWord.length, token.length + 1));
  if (Math.abs(token.length - compared.length) > 1) return false;

  let mismatches = 0;
  let i = 0;
  let j = 0;
  while (i < token.length && j < compared.length) {
    if (token[i] === compared[j]) {
      i++;
      j++;
    } else {
      mismatches++;
      if (mismatches > 1) return false;
      if (token.length > compared.length) i++;
      else if (compared.length > token.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return mismatches + (token.length - i) + (compared.length - j) <= 1;
}

export function searchProductsSmart(
  rawQuery: string,
  products: Product[],
  categories: Category[] = [],
  options: SmartSearchOptions = {}
): SmartSearchResult {
  const { categoryFilter = 'All', sortBy = 'relevance', limit = 12 } = options;
  const trimmed = (rawQuery || '').trim();

  if (!trimmed) {
    return {
      products: [],
      totalMatches: 0,
      matchedCategories: [],
      matchedBrands: [],
      detectedMaxPrice: null,
      cleanedKeyword: '',
    };
  }

  const { cleanedKeyword, maxPrice } = parsePriceConstraint(trimmed);
  const queryLower = (cleanedKeyword || trimmed).toLowerCase();
  const tokens = queryLower.split(/\s+/).filter(Boolean);

  // Match categories
  const matchedCategories = categories
    .filter((cat) => {
      if (!cleanedKeyword && maxPrice !== null) return false;
      const nameLower = cat.name.toLowerCase();
      const banglaLower = (cat.banglaName || '').toLowerCase();
      return (
        nameLower.includes(queryLower) ||
        banglaLower.includes(queryLower) ||
        tokens.some((tk) => tk.length >= 2 && (nameLower.includes(tk) || banglaLower.includes(tk)))
      );
    })
    .slice(0, 4);

  const brandSet = new Set<string>();
  const scored: { product: Product; score: number }[] = [];

  for (const product of products) {
    if (!product || !product.id) continue;

    // Optional price filter from natural language query
    if (maxPrice !== null && product.price > maxPrice) {
      continue;
    }

    // Optional category pill filter inside search dropdown
    if (
      categoryFilter &&
      categoryFilter !== 'All' &&
      product.category.toLowerCase() !== categoryFilter.toLowerCase()
    ) {
      continue;
    }

    // If user only typed "under 1000" with no keyword, match all products under that price
    if (!cleanedKeyword && maxPrice !== null) {
      scored.push({ product, score: 50 + (maxPrice - product.price) / Math.max(1, maxPrice) });
      continue;
    }

    const nameLower = (product.name || '').toLowerCase();
    const banglaLower = (product.banglaName || '').toLowerCase();
    const skuLower = (product.sku || '').toLowerCase();
    const brandLower = (product.brand || '').toLowerCase();
    const catLower = (product.category || '').toLowerCase();
    const subCatLower = (product.subcategory || '').toLowerCase();
    const subSubLower = (product.subSubcategory || product.childSubcategory || '').toLowerCase();
    const tagsLower = Array.isArray(product.tags)
      ? product.tags.map((t) => (t || '').toLowerCase())
      : [];
    const descLower = (product.description || '').toLowerCase();

    let score = 0;

    // 1. Exact or prefix match on SKU
    if (skuLower && skuLower === queryLower) {
      score += 200;
    } else if (skuLower && skuLower.includes(queryLower)) {
      score += 120;
    }

    // 2. Full phrase match on Product Name / Bangla Name
    if (nameLower === queryLower || banglaLower === queryLower) {
      score += 180;
    } else if (nameLower.startsWith(queryLower) || banglaLower.startsWith(queryLower)) {
      score += 130;
    } else if (nameLower.includes(queryLower) || banglaLower.includes(queryLower)) {
      score += 95;
    }

    // 3. Brand / Category / Subcategory / Tags full match
    if (brandLower && brandLower.includes(queryLower)) {
      score += 75;
      if (product.brand) brandSet.add(product.brand);
    }
    if (catLower.includes(queryLower) || subCatLower.includes(queryLower) || subSubLower.includes(queryLower)) {
      score += 60;
    }
    if (tagsLower.some((t) => t.includes(queryLower))) {
      score += 55;
    }

    // 4. Token-by-token evaluation for multi-word queries & fuzzy tolerance
    if (tokens.length > 0) {
      let matchedTokenCount = 0;
      const nameWords = nameLower.split(/[\s\-/,()]+/).filter(Boolean);

      for (const tk of tokens) {
        let tokenMatched = false;
        if (nameLower.includes(tk) || banglaLower.includes(tk)) {
          score += nameLower.startsWith(tk) ? 35 : 25;
          tokenMatched = true;
        } else if (skuLower.includes(tk)) {
          score += 30;
          tokenMatched = true;
        } else if (brandLower.includes(tk)) {
          score += 20;
          if (product.brand) brandSet.add(product.brand);
          tokenMatched = true;
        } else if (catLower.includes(tk) || subCatLower.includes(tk) || subSubLower.includes(tk)) {
          score += 18;
          tokenMatched = true;
        } else if (tagsLower.some((t) => t.includes(tk))) {
          score += 15;
          tokenMatched = true;
        } else if (tk.length >= 3 && descLower.includes(tk)) {
          score += 8;
          tokenMatched = true;
        } else if (tk.length >= 4 && nameWords.some((w) => isFuzzyTokenMatch(tk, w))) {
          score += 14;
          tokenMatched = true;
        }

        if (tokenMatched) {
          matchedTokenCount++;
        }
      }

      // Bonus if ALL tokens matched across the product fields
      if (tokens.length > 1 && matchedTokenCount === tokens.length) {
        score += 45;
      } else if (tokens.length > 1 && matchedTokenCount === 0) {
        score = 0;
      }
    }

    // Slight boost for in-stock and high-rated products on ties
    if (score > 0) {
      if (product.stock > 0) score += 3;
      if (product.rating >= 4.5) score += 2;
      scored.push({ product, score });
    }
  }

  // Sort results
  if (sortBy === 'price-asc') {
    scored.sort((a, b) => a.product.price - b.product.price);
  } else if (sortBy === 'price-desc') {
    scored.sort((a, b) => b.product.price - a.product.price);
  } else if (sortBy === 'rating') {
    scored.sort((a, b) => (b.product.rating || 0) - (a.product.rating || 0));
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  return {
    products: scored.slice(0, limit).map((item) => item.product),
    totalMatches: scored.length,
    matchedCategories,
    matchedBrands: Array.from(brandSet).slice(0, 4),
    detectedMaxPrice: maxPrice,
    cleanedKeyword,
  };
}
