/**
 * Environment isolation helper for KenaX BD.
 * Differentiates between AI Studio Preview Sandbox (ais-dev-...) and Live Published Website (kenaxbd.ai.studio / ais-pre-...).
 */

export function isPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  const host = window.location.hostname || '';
  // Check if running in AI Studio Dev Preview container, localhost, or dev URL:
  if (
    host.includes('ais-dev-') ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    (host.includes('.run.app') && host.includes('dev'))
  ) {
    return true;
  }
  return false;
}

/**
 * Get dynamic collection name based on current environment.
 * E.g. 'products' -> 'preview_products' in dev preview, 'products' in live production site.
 */
export function getEnvCollectionName(baseName: string): string {
  if (isPreviewEnvironment()) {
    return `preview_${baseName}`;
  }
  return baseName;
}

/**
 * Get dynamic LocalStorage key based on current environment.
 * E.g. 'kenax_products_cache' -> 'preview_kenax_products_cache' in dev preview, 'kenax_products_cache' in live production site.
 */
export function getEnvStorageKey(baseKey: string): string {
  if (isPreviewEnvironment()) {
    return `preview_${baseKey}`;
  }
  return baseKey;
}

/**
 * Get default headers for API fetch requests to pass environment context to server.
 */
export function getEnvApiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-App-Env': isPreviewEnvironment() ? 'preview' : 'production',
  };
}
