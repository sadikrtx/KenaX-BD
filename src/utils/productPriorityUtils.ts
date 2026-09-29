import { Product, Category } from '../types/index.ts';

export interface PageOption {
  key: string; // e.g. 'home', 'shop', 'category:Smartphones', 'tag:Trending'
  label: string; // Human readable name
  type: 'system' | 'category' | 'tag' | 'custom';
}

/**
 * Gets the numeric priority rank of a product for a specific page.
 * Lower numbers mean higher priority (1 appears top/first).
 * Returns 999999 if no explicit priority is set.
 */
export function getProductPriorityForPage(product: Product, pageKey?: string): number {
  if (pageKey && product.pagePriorities && typeof product.pagePriorities[pageKey] === 'number') {
    const pageVal = Number(product.pagePriorities[pageKey]);
    if (!isNaN(pageVal) && pageVal > 0) {
      return pageVal;
    }
  }
  
  // Fallback to global product priority if present
  if (typeof product.priority === 'number' && !isNaN(product.priority) && product.priority > 0) {
    return product.priority;
  }
  
  return 999999;
}

/**
 * Sorts products for a specific page by priority rank (ascending: 1, 2, 3...).
 * Un-prioritized items appear after prioritized ones, sorted by createdAt date (newest first).
 */
export function sortProductsByPagePriority(products: Product[], pageKey?: string): Product[] {
  return [...products].sort((a, b) => {
    const prioA = getProductPriorityForPage(a, pageKey);
    const prioB = getProductPriorityForPage(b, pageKey);
    
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    
    // Secondary fallback sort by creation time (newest first)
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Generates a comprehensive list of all selectable site pages
 * for the Admin to set priorities on.
 */
export function getAvailablePageOptions(categories: Category[] = [], products: Product[] = []): PageOption[] {
  const options: PageOption[] = [
    { key: 'home', label: 'Home Page (হোম পেজ)', type: 'system' },
    { key: 'shop', label: 'Shop / All Products Page (সব প্রোডাক্ট পেজ)', type: 'system' },
  ];

  // Collect Category Pages
  categories.forEach((cat) => {
    options.push({
      key: `category:${cat.name}`,
      label: `Category: ${cat.name}`,
      type: 'category',
    });
  });

  // Also collect any category names from products that might not be in categories array
  products.forEach((p) => {
    if (p.category) {
      const catKey = `category:${p.category}`;
      if (!options.some((o) => o.key === catKey)) {
        options.push({
          key: catKey,
          label: `Category: ${p.category}`,
          type: 'category',
        });
      }
    }
  });

  // Collect Tag Pages
  const tagSet = new Set<string>(['Trending', 'New Arrivals', 'Deals', 'Best Sellers', 'Hot', 'Featured']);
  products.forEach((p) => {
    if (p.tags && Array.isArray(p.tags)) {
      p.tags.forEach((t) => tagSet.add(t));
    }
    if (p.saleBadge && p.saleBadge !== 'None') {
      tagSet.add(p.saleBadge);
    }
  });

  tagSet.forEach((tag) => {
    options.push({
      key: `tag:${tag}`,
      label: `Tag Page: ${tag}`,
      type: 'tag',
    });
  });

  return options;
}
