// Utility for optimizing image delivery, preloading and instant cache retrieval
const loadedImageUrls = new Set<string>();

/**
 * Optimizes an image URL for high performance while preserving 100% crystal-clear quality
 */
export function getOptimizedImageUrl(url?: string, width = 600): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=85';
  }

  // Preserve Base64, Blob, and internal media:// references
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('media://')) {
    return url;
  }

  // Unsplash images: preserve high quality (q=85) while ensuring modern auto=format (WebP/AVIF)
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('q', '85'); // High quality
      if (!parsed.searchParams.has('w')) {
        parsed.searchParams.set('w', String(width));
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/**
 * Preload a single image into the browser's HTTP / disk / memory cache
 */
export function preloadImage(url?: string): Promise<void> {
  if (!url || typeof url !== 'string' || !url.trim() || url.startsWith('media://')) {
    return Promise.resolve();
  }

  const cleanUrl = getOptimizedImageUrl(url);
  if (loadedImageUrls.has(cleanUrl)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = cleanUrl;
    img.onload = () => {
      loadedImageUrls.add(cleanUrl);
      resolve();
    };
    img.onerror = () => {
      resolve();
    };
  });
}

/**
 * Preload a batch of product thumbnail images in the background
 */
export function preloadProductThumbnailBatch(products: Array<{ images?: string[] }>): void {
  if (!Array.isArray(products) || products.length === 0) return;

  // Preload first 24 products immediately
  const firstBatch = products.slice(0, 24);
  firstBatch.forEach((p) => {
    const firstImg = p.images?.[0];
    if (firstImg) preloadImage(firstImg);
  });

  // Preload the rest during idle frames
  if (products.length > 24) {
    const remaining = products.slice(24);
    const scheduleIdle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 120);

    scheduleIdle(() => {
      remaining.forEach((p) => {
        const img = p.images?.[0];
        if (img) preloadImage(img);
      });
    });
  }
}

export function isImagePreloaded(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = getOptimizedImageUrl(url);
  return loadedImageUrls.has(cleanUrl);
}

export function markImageLoaded(url?: string): void {
  if (url) {
    const cleanUrl = getOptimizedImageUrl(url);
    loadedImageUrls.add(cleanUrl);
  }
}
