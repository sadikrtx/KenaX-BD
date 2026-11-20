/**
 * Safe JSON fetch utility for KenaX BD frontend API calls.
 * Checks response Content-Type before calling response.json() so HTML fallbacks
 * (e.g. SPA index.html or gateway error pages) NEVER crash the UI with:
 *   "Unexpected token '<', "<!doctype "... is not valid JSON"
 */

export interface SafeJsonResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  isNonJson?: boolean;
}

export const NON_JSON_ERROR_MESSAGE =
  'সার্ভার থেকে সঠিক উত্তর আসেনি (API server error — JSON এর বদলে HTML/Text পাওয়া গেছে। অনুগ্রহ করে Cloud Functions ডিপ্লয় আছে কি না যাচাই করুন)।';

export async function safeParseJsonResponse<T = any>(
  res: Response
): Promise<SafeJsonResult<T>> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: 'সার্ভার রেসপন্স পড়া যায়নি (Failed to read API response).',
      isNonJson: true,
    };
  }

  const trimmed = rawText.trim();
  const looksLikeHtml =
    trimmed.startsWith('<!') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML') ||
    contentType.includes('text/html');

  const isJsonContentType =
    contentType.includes('application/json') ||
    contentType.includes('+json');

  if (looksLikeHtml || (!isJsonContentType && !(trimmed.startsWith('{') || trimmed.startsWith('[')))) {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: NON_JSON_ERROR_MESSAGE,
      isNonJson: true,
    };
  }

  try {
    const parsed = JSON.parse(rawText) as T;
    if (!res.ok) {
      const serverMsg =
        (parsed as any)?.message ||
        (parsed as any)?.error ||
        `API request failed (HTTP ${res.status})`;
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: String(serverMsg),
      };
    }
    return {
      ok: true,
      status: res.status,
      data: parsed,
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: NON_JSON_ERROR_MESSAGE,
      isNonJson: true,
    };
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeJsonResult<T>> {
  try {
    const res = await fetch(input, init);
    return await safeParseJsonResponse<T>(res);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        err?.message ||
        'সার্ভারের সাথে সংযোগ করা যায়নি (Network error contacting API server).',
    };
  }
}
