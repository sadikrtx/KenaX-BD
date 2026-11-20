/**
 * KenaX BD — Multi-Touch Attribution & Session Tracking System
 * Supports UTM Parameters, fbclid, Referrer, First-Touch and Last-Touch Attribution.
 */

export interface AttributionSnapshot {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  referrer?: string;
  landingUrl?: string;
  landingPage?: string;
  timestamp?: string;
}

export interface AttributionData {
  firstTouch?: AttributionSnapshot;
  lastTouch?: AttributionSnapshot;
  sessionId?: string;
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  fbp?: string;
  fbc?: string;
  capturedAt?: string;
}

const FIRST_TOUCH_KEY = 'kenax_attribution_first_touch';
const LAST_TOUCH_KEY = 'kenax_attribution_last_touch';
const SESSION_ID_KEY = 'kenax_tracking_session_id';
const SESSION_TIMESTAMP_KEY = 'kenax_tracking_session_time';
const TTCLID_KEY = 'kenax_tiktok_ttclid';
const GCLID_KEY = 'kenax_google_gclid';
const GBRAID_KEY = 'kenax_google_gbraid';
const WBRAID_KEY = 'kenax_google_wbraid';

/**
 * Get or store Google Click IDs (gclid, gbraid, wbraid)
 */
export function getGoogleClickIds(
  urlGclid?: string,
  urlGbraid?: string,
  urlWbraid?: string
): { gclid?: string; gbraid?: string; wbraid?: string } {
  if (typeof window === 'undefined') return {};
  try {
    if (urlGclid) {
      localStorage.setItem(GCLID_KEY, urlGclid);
      try {
        document.cookie = `gclid=${urlGclid}; path=/; max-age=7776000; SameSite=Lax`;
      } catch {}
    }
    if (urlGbraid) {
      localStorage.setItem(GBRAID_KEY, urlGbraid);
      try {
        document.cookie = `gbraid=${urlGbraid}; path=/; max-age=7776000; SameSite=Lax`;
      } catch {}
    }
    if (urlWbraid) {
      localStorage.setItem(WBRAID_KEY, urlWbraid);
      try {
        document.cookie = `wbraid=${urlWbraid}; path=/; max-age=7776000; SameSite=Lax`;
      } catch {}
    }

    const gclid = urlGclid || localStorage.getItem(GCLID_KEY) || undefined;
    const gbraid = urlGbraid || localStorage.getItem(GBRAID_KEY) || undefined;
    const wbraid = urlWbraid || localStorage.getItem(WBRAID_KEY) || undefined;
    return { gclid, gbraid, wbraid };
  } catch {
    return { gclid: urlGclid, gbraid: urlGbraid, wbraid: urlWbraid };
  }
}

/**
 * Get or store TikTok ttclid (TikTok Click ID)
 */
export function getTikTokTtclid(ttclidFromUrl?: string): string {
  if (typeof window === 'undefined') return '';
  try {
    if (ttclidFromUrl) {
      localStorage.setItem(TTCLID_KEY, ttclidFromUrl);
      try {
        document.cookie = `ttclid=${ttclidFromUrl}; path=/; max-age=7776000; SameSite=Lax`;
      } catch {}
      return ttclidFromUrl;
    }
    const cookies = (document.cookie || '').split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === 'ttclid' && val) return val;
    }
    return localStorage.getItem(TTCLID_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Generate a unique session ID or retrieve the existing one (30-minute inactivity window)
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    const now = Date.now();
    const storedSession = sessionStorage.getItem(SESSION_ID_KEY) || localStorage.getItem(SESSION_ID_KEY);
    const lastTime = parseInt(sessionStorage.getItem(SESSION_TIMESTAMP_KEY) || '0', 10);

    // If session is older than 30 minutes, generate a new one
    if (storedSession && now - lastTime < 30 * 60 * 1000) {
      sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
      return storedSession;
    }

    const newSessionId = `sess_${now}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    return newSessionId;
  } catch {
    return `sess_${Date.now()}`;
  }
}

/**
 * Get or create Meta _fbp cookie (Browser Identifier)
 * Format: fb.1.{creation_time}.{random_number}
 */
export function getMetaFbp(): string {
  if (typeof document === 'undefined') return '';
  try {
    // Check existing cookie
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === '_fbp' && val) return val;
    }

    // Check localStorage fallback
    const localFbp = localStorage.getItem('kenax_meta_fbp');
    if (localFbp) return localFbp;

    // Generate compliant _fbp
    const newFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 8999999999 + 1000000000)}`;
    localStorage.setItem('kenax_meta_fbp', newFbp);
    try {
      document.cookie = `_fbp=${newFbp}; path=/; max-age=7776000; SameSite=Lax`;
    } catch {}
    return newFbp;
  } catch {
    return '';
  }
}

/**
 * Get or create Meta _fbc cookie (Click Identifier) from fbclid
 * Format: fb.1.{creation_time}.{fbclid}
 */
export function getMetaFbc(fbclidFromUrl?: string): string {
  if (typeof document === 'undefined') return '';
  try {
    // 1. Check existing cookie
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === '_fbc' && val) return val;
    }

    // 2. Check localStorage
    const localFbc = localStorage.getItem('kenax_meta_fbc');
    if (!fbclidFromUrl && localFbc) return localFbc;

    // 3. If new fbclid provided, create new _fbc
    if (fbclidFromUrl) {
      const newFbc = `fb.1.${Date.now()}.${fbclidFromUrl}`;
      localStorage.setItem('kenax_meta_fbc', newFbc);
      try {
        document.cookie = `_fbc=${newFbc}; path=/; max-age=7776000; SameSite=Lax`;
      } catch {}
      return newFbc;
    }

    return localFbc || '';
  } catch {
    return '';
  }
}

/**
 * Capture URL parameters (UTM & fbclid) and store multi-touch attribution
 */
export function captureUrlAttribution(): AttributionData {
  if (typeof window === 'undefined') {
    return { sessionId: 'server_session' };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get('utm_source') || undefined;
    const utm_medium = params.get('utm_medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || undefined;
    const utm_content = params.get('utm_content') || undefined;
    const utm_term = params.get('utm_term') || undefined;
    const fbclid = params.get('fbclid') || undefined;
    const ttclid = params.get('ttclid') || undefined;
    const gclid = params.get('gclid') || undefined;
    const gbraid = params.get('gbraid') || undefined;
    const wbraid = params.get('wbraid') || undefined;
    const referrer = document.referrer ? new URL(document.referrer, window.location.origin).hostname : undefined;
    const landingUrl = window.location.href;
    const landingPage = window.location.pathname;

    const hasAttributionParams = Boolean(
      utm_source || utm_medium || utm_campaign || utm_content || utm_term || fbclid || ttclid || gclid || gbraid || wbraid
    );

    const sessionId = getOrCreateSessionId();
    const fbp = getMetaFbp();
    const fbc = getMetaFbc(fbclid);
    const currentTtclid = getTikTokTtclid(ttclid);
    const googleClickIds = getGoogleClickIds(gclid, gbraid, wbraid);

    // Build current snapshot if attribution params or referrer exist
    const currentSnapshot: AttributionSnapshot = {
      utm_source: utm_source || (referrer ? `ref_${referrer}` : 'direct'),
      utm_medium: utm_medium || (referrer ? 'referral' : 'none'),
      utm_campaign: utm_campaign || 'none',
      utm_content,
      utm_term,
      fbclid,
      ttclid: currentTtclid || ttclid,
      gclid: googleClickIds.gclid || gclid,
      gbraid: googleClickIds.gbraid || gbraid,
      wbraid: googleClickIds.wbraid || wbraid,
      referrer: document.referrer || undefined,
      landingUrl,
      landingPage,
      timestamp: new Date().toISOString(),
    };

    // 1. FIRST TOUCH (Set once and never overwrite)
    let firstTouch: AttributionSnapshot | undefined;
    const storedFirst = localStorage.getItem(FIRST_TOUCH_KEY);
    if (storedFirst) {
      try {
        firstTouch = JSON.parse(storedFirst);
      } catch {}
    }

    if (!firstTouch) {
      firstTouch = currentSnapshot;
      try {
        localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
      } catch {}
    }

    // 2. LAST TOUCH (Update whenever there is a specific marketing parameter or on new sessions)
    let lastTouch: AttributionSnapshot = currentSnapshot;
    if (hasAttributionParams) {
      try {
        localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(currentSnapshot));
      } catch {}
    } else {
      const storedLast = localStorage.getItem(LAST_TOUCH_KEY);
      if (storedLast) {
        try {
          lastTouch = JSON.parse(storedLast);
        } catch {}
      } else {
        lastTouch = firstTouch || currentSnapshot;
        try {
          localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(lastTouch));
        } catch {}
      }
    }

    return {
      firstTouch,
      lastTouch,
      sessionId,
      fbclid: fbclid || lastTouch.fbclid || firstTouch?.fbclid,
      ttclid: currentTtclid || ttclid || lastTouch.ttclid || firstTouch?.ttclid,
      gclid: googleClickIds.gclid || gclid || lastTouch.gclid || firstTouch?.gclid,
      gbraid: googleClickIds.gbraid || gbraid || lastTouch.gbraid || firstTouch?.gbraid,
      wbraid: googleClickIds.wbraid || wbraid || lastTouch.wbraid || firstTouch?.wbraid,
      fbp,
      fbc,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Attribution Capture Warning]', err);
    return {
      sessionId: getOrCreateSessionId(),
      fbp: getMetaFbp(),
      fbc: getMetaFbc(),
    };
  }
}

/**
 * Get current attribution state to attach to checkout or order submission
 */
export function getAttributionForOrder(): AttributionData {
  return captureUrlAttribution();
}
