// Utility for optimizing image delivery, preloading and instant cache retrieval
const loadedImageUrls = new Set<string>();
const pendingPreloads = new Map<string, Promise<void>>();

export const NEUTRAL_PRODUCT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='100%25' height='100%25' fill='%23f1f5f9'/%3E%3Cg fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' transform='translate(170, 160)'%3E%3Crect width='60' height='60' rx='8'/%3E%3Ccircle cx='20' cy='20' r='6'/%3E%3Cpath d='M60 42l-18-18-24 24'/%3E%3C/g%3E%3Ctext x='200' y='245' text-anchor='middle' font-family='system-ui, -apple-system, sans-serif' font-size='13' font-weight='600' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

export function extractGoogleDriveFileId(url?: string): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  const match =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/open\?id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

/**
 * Fallback error handler for img tags to gracefully retry alternative Google Drive CDN endpoints or neutral placeholder
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string
) {
  const target = e.currentTarget;
  if (!target) return;
  const currentSrc = target.src || '';

  const fileId = extractGoogleDriveFileId(originalUrl || currentSrc);
  if (fileId) {
    if (!currentSrc.includes(`lh3.googleusercontent.com/d/${fileId}`)) {
      target.src = `https://lh3.googleusercontent.com/d/${fileId}`;
      return;
    }
    if (!currentSrc.includes(`drive.google.com/thumbnail?id=${fileId}`)) {
      target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
      return;
    }
    if (!currentSrc.includes(`drive.google.com/uc?export=view`)) {
      target.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
      return;
    }
  }

  if (target.src !== NEUTRAL_PRODUCT_PLACEHOLDER) {
    target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
  }
}

/**
 * Optimizes an image URL for lightning-fast delivery while preserving crystal-clear sharpness
 */
export function getOptimizedImageUrl(url?: string, width = 400): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return NEUTRAL_PRODUCT_PLACEHOLDER;
  }

  const trimmed = url.trim();

  // Preserve Base64, Blob, and internal media:// references
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('media://')) {
    return trimmed;
  }

  // Convert Google Drive sharing links to fast direct-CDN thumbnail streaming URLs
  if (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com') ||
    trimmed.includes('googleusercontent.com')
  ) {
    const fileId = extractGoogleDriveFileId(trimmed);
    if (fileId) {
      const targetWidth = Math.max(width, 800);
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${targetWidth}`;
    }
  }

  // Convert Dropbox share links to raw direct file streams
  if (url.includes('dropbox.com')) {
    return url.replace('dl=0', 'raw=1').replace('?dl=1', '?raw=1');
  }

  // Unsplash images: deliver next-gen WebP/AVIF format with 75% quality and exact screen-responsive width
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('q', '75'); // High-efficiency visual quality
      parsed.searchParams.set('w', String(width));
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/**
 * Preload a single image into the browser's HTTP / memory cache
 */
export function preloadImage(url?: string, width = 400): Promise<void> {
  if (!url || typeof url !== 'string' || !url.trim() || url.startsWith('media://')) {
    return Promise.resolve();
  }

  const cleanUrl = getOptimizedImageUrl(url, width);
  if (loadedImageUrls.has(cleanUrl)) {
    return Promise.resolve();
  }

  if (pendingPreloads.has(cleanUrl)) {
    return pendingPreloads.get(cleanUrl)!;
  }

  const promise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = cleanUrl;
    img.onload = () => {
      loadedImageUrls.add(cleanUrl);
      pendingPreloads.delete(cleanUrl);
      resolve();
    };
    img.onerror = () => {
      pendingPreloads.delete(cleanUrl);
      resolve();
    };
  });

  pendingPreloads.set(cleanUrl, promise);
  return promise;
}

/**
 * Preload a batch of product thumbnail images in the background for zero-latency page transitions
 */
export function preloadProductThumbnailBatch(products: Array<{ images?: string[]; colors?: Array<{ imageUrl?: string }> }>): void {
  if (!Array.isArray(products) || products.length === 0) return;

  // Preload first 30 products immediately
  const firstBatch = products.slice(0, 30);
  firstBatch.forEach((p) => {
    const firstImg = p.images?.[0];
    if (firstImg) preloadImage(firstImg, 400);
  });

  // Preload secondary images & remaining products during idle frames
  const scheduleIdle =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 100);

  scheduleIdle(() => {
    products.forEach((p) => {
      // Preload extra gallery images
      if (Array.isArray(p.images) && p.images.length > 1) {
        p.images.slice(1, 4).forEach((img) => {
          if (img) preloadImage(img, 400);
        });
      }
      // Preload color variation images
      if (Array.isArray(p.colors)) {
        p.colors.forEach((c) => {
          if (c.imageUrl) preloadImage(c.imageUrl, 400);
        });
      }
    });
  });
}

export function isImagePreloaded(url?: string, width = 400): boolean {
  if (!url) return false;
  const cleanUrl = getOptimizedImageUrl(url, width);
  return loadedImageUrls.has(cleanUrl);
}

export function markImageLoaded(url?: string, width = 400): void {
  if (url) {
    const cleanUrl = getOptimizedImageUrl(url, width);
    loadedImageUrls.add(cleanUrl);
  }
}
