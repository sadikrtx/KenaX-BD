/**
 * On-demand loader for the Google API client script (apis.google.com/js/api.js).
 * Loaded ONLY when a user invokes Google Sheets / Google Drive functionality,
 * avoiding render-blocking / wasted network requests on storefront & normal admin loads.
 */

let gapiLoadPromise: Promise<any> | null = null;

export function loadGoogleApiScript(): Promise<any> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  const w = window as any;
  if (w.gapi) {
    return Promise.resolve(w.gapi);
  }

  if (gapiLoadPromise) {
    return gapiLoadPromise;
  }

  gapiLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://apis.google.com/js/api.js"]'
    );
    if (existing) {
      if (w.gapi) {
        resolve(w.gapi);
        return;
      }
      existing.addEventListener('load', () => resolve(w.gapi || null), { once: true });
      existing.addEventListener('error', (err) => reject(err), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(w.gapi || null);
    script.onerror = (err) => {
      gapiLoadPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return gapiLoadPromise;
}
