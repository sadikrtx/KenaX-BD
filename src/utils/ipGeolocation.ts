import type { IpGeoLocation, Order } from '../types/index.ts';
import { getIpVersion, isPrivateOrLocalIp, normalizeIp } from './ipUtils.ts';

// In-memory cache for resolved IP locations (TTL: 24 hours)
interface CachedGeo {
  data: IpGeoLocation;
  cachedAt: number;
}

const geoCache = new Map<string, CachedGeo>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Resolves approximate geolocation for an IP address.
 * Never throws — always returns safe data or fallback with accuracyStatus: 'unavailable'.
 */
export async function resolveIpGeolocation(rawIp: string): Promise<IpGeoLocation> {
  const ip = normalizeIp(rawIp);
  const ipVersion = getIpVersion(ip);

  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // Handle local, loopback, or private network IPs
  if (isPrivateOrLocalIp(ip)) {
    const localResult: IpGeoLocation = {
      ip,
      ipVersion,
      country: 'Private Network',
      countryCode: 'LAN',
      region: 'Local Subnet',
      city: 'Localhost',
      isp: 'Internal Loopback / Local Network',
      connectionType: 'Private LAN / Dev Loopback',
      accuracyStatus: 'unavailable',
      resolvedAt: new Date().toISOString(),
      isDatacenterOrProxy: false,
    };
    geoCache.set(ip, { data: localResult, cachedAt: Date.now() });
    return localResult;
  }

  const nowIso = new Date().toISOString();

  // Try ipwho.is first (fast, HTTPS, generous limits, returns detailed ISP & connection info)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2600);

    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (json && json.success !== false && json.country) {
        const isDatacenterOrProxy = Boolean(
          json.security?.proxy ||
          json.security?.vpn ||
          json.security?.tor ||
          json.security?.hosting ||
          json.connection?.isp?.toLowerCase().includes('hosting') ||
          json.connection?.isp?.toLowerCase().includes('datacenter') ||
          json.connection?.isp?.toLowerCase().includes('cloud')
        );

        let connectionType = 'Broadband / Fixed Line';
        if (isDatacenterOrProxy) {
          connectionType = 'Datacenter / Cloud / Proxy';
        } else if (
          json.connection?.isp?.toLowerCase().includes('mobile') ||
          json.connection?.isp?.toLowerCase().includes('telecom') ||
          json.connection?.isp?.toLowerCase().includes('grameenphone') ||
          json.connection?.isp?.toLowerCase().includes('robi') ||
          json.connection?.isp?.toLowerCase().includes('banglalink') ||
          json.connection?.isp?.toLowerCase().includes('teletalk')
        ) {
          connectionType = 'Cellular / Mobile Network';
        }

        const resolved: IpGeoLocation = {
          ip,
          ipVersion,
          country: json.country || 'Not available',
          countryCode: json.country_code || '',
          region: json.region || 'Not available',
          city: json.city || 'Not available',
          latitude: typeof json.latitude === 'number' ? json.latitude : undefined,
          longitude: typeof json.longitude === 'number' ? json.longitude : undefined,
          isp: json.connection?.isp || json.connection?.org || 'Not available',
          org: json.connection?.org || '',
          as: json.connection?.asn ? `AS${json.connection.asn}` : '',
          connectionType,
          accuracyStatus: 'approximate',
          resolvedAt: nowIso,
          isDatacenterOrProxy,
        };

        geoCache.set(ip, { data: resolved, cachedAt: Date.now() });
        return resolved;
      }
    }
  } catch (err) {
    // Primary lookup timed out or network error; try fallback
  }

  // Fallback to ip-api.com
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const fallbackRes = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org,as,hosting,proxy`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (fallbackRes.ok) {
      const fJson = await fallbackRes.json();
      if (fJson && fJson.status === 'success') {
        const isDatacenterOrProxy = Boolean(fJson.hosting || fJson.proxy);
        const resolved: IpGeoLocation = {
          ip,
          ipVersion,
          country: fJson.country || 'Not available',
          countryCode: fJson.countryCode || '',
          region: fJson.regionName || 'Not available',
          city: fJson.city || 'Not available',
          latitude: typeof fJson.lat === 'number' ? fJson.lat : undefined,
          longitude: typeof fJson.lon === 'number' ? fJson.lon : undefined,
          isp: fJson.isp || fJson.org || 'Not available',
          org: fJson.org || '',
          as: fJson.as || '',
          connectionType: isDatacenterOrProxy ? 'Datacenter / Hosting' : 'Broadband / ISP Network',
          accuracyStatus: 'approximate',
          resolvedAt: nowIso,
          isDatacenterOrProxy,
        };

        geoCache.set(ip, { data: resolved, cachedAt: Date.now() });
        return resolved;
      }
    }
  } catch (fallbackErr) {
    // Graceful fallback
  }

  // If all lookups failed or timed out, return unavailable without inventing data
  const unavailableResult: IpGeoLocation = {
    ip,
    ipVersion,
    country: undefined,
    region: undefined,
    city: undefined,
    latitude: undefined,
    longitude: undefined,
    isp: undefined,
    connectionType: undefined,
    accuracyStatus: 'unavailable',
    resolvedAt: nowIso,
    isDatacenterOrProxy: false,
  };

  geoCache.set(ip, { data: unavailableResult, cachedAt: Date.now() });
  return unavailableResult;
}

/**
 * Normalizes division names for comparison (e.g. 'Dhaka' vs 'ঢাকা' vs 'dhaka division').
 */
export function normalizeRegionString(name?: string): string {
  if (!name) return '';
  const clean = name.toLowerCase().replace(/division|বিভাগ|জেলা|district/g, '').trim();
  const map: Record<string, string> = {
    'dhaka': 'dhaka',
    'ঢাকা': 'dhaka',
    'chittagong': 'chattogram',
    'chattogram': 'chattogram',
    'চট্টগ্রাম': 'chattogram',
    'sylhet': 'sylhet',
    'সিলেট': 'sylhet',
    'rajshahi': 'rajshahi',
    'রাজশাহী': 'rajshahi',
    'khulna': 'khulna',
    'খুলনা': 'khulna',
    'barisal': 'barishal',
    'barishal': 'barishal',
    'বরিশাল': 'barishal',
    'rangpur': 'rangpur',
    'রংপুর': 'rangpur',
    'mymensingh': 'mymensingh',
    'ময়মনসিংহ': 'mymensingh',
  };
  return map[clean] || clean;
}

/**
 * Evaluates suspicious network signals for an order without automatic blocking:
 * 1. Rapid high-frequency orders from the same IP (>= 3 orders in 2 hours).
 * 2. Region mismatch between IP geolocation and delivery address.
 * 3. Datacenter or Proxy range detected.
 */
export interface OrderIpSignals {
  hasMultipleOrdersFromIp: boolean;
  sameIpOrdersCount: number;
  isRapidFrequency: boolean;
  isRegionMismatch: boolean;
  isDatacenterOrProxy: boolean;
  signalsList: string[];
}

export function detectOrderIpSignals(order: Order, allOrders: Order[] = []): OrderIpSignals {
  const ip = (order.customerIp || '').trim();
  const signalsList: string[] = [];

  if (!ip || ip === 'N/A' || isPrivateOrLocalIp(ip)) {
    return {
      hasMultipleOrdersFromIp: false,
      sameIpOrdersCount: 1,
      isRapidFrequency: false,
      isRegionMismatch: false,
      isDatacenterOrProxy: false,
      signalsList: [],
    };
  }

  // Find all orders with this IP
  const sameIpOrders = allOrders.filter((o) => (o.customerIp || '').trim() === ip);
  const count = sameIpOrders.length;
  const hasMultiple = count > 1;

  if (hasMultiple) {
    signalsList.push(`${count} orders placed from this IP`);
  }

  // 1. High frequency check: >= 3 orders from same IP within 2 hours of this order
  let isRapidFrequency = false;
  const orderTime = new Date(order.createdAt || Date.now()).getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  const recentSameIpOrders = sameIpOrders.filter((o) => {
    const t = new Date(o.createdAt || Date.now()).getTime();
    return Math.abs(orderTime - t) <= twoHoursMs;
  });

  if (recentSameIpOrders.length >= 3) {
    isRapidFrequency = true;
    signalsList.push(`High frequency: ${recentSameIpOrders.length} orders within 2 hours`);
  }

  // 2. Region mismatch check
  let isRegionMismatch = false;
  const ipRegion = normalizeRegionString(order.ipRegion || order.ipGeoData?.region);
  const ipCountry = (order.ipCountry || order.ipGeoData?.country || '').toLowerCase();
  const deliveryRegion = normalizeRegionString(order.division || order.district);

  if (ipCountry && !ipCountry.includes('bangladesh') && ipCountry !== 'not available' && ipCountry !== 'private network') {
    isRegionMismatch = true;
    signalsList.push(`International IP detected (${order.ipCountry}) for Bangladesh delivery`);
  } else if (ipRegion && deliveryRegion && ipRegion !== deliveryRegion && ipRegion !== 'not available') {
    isRegionMismatch = true;
    signalsList.push(`Region mismatch: IP in ${order.ipRegion || order.ipGeoData?.region}, delivery in ${order.division || order.district}`);
  }

  // 3. Datacenter or proxy flag
  const isDatacenterOrProxy = Boolean(
    order.ipGeoData?.isDatacenterOrProxy ||
    order.ipConnectionType?.toLowerCase().includes('datacenter') ||
    order.ipConnectionType?.toLowerCase().includes('proxy')
  );

  if (isDatacenterOrProxy) {
    signalsList.push('Datacenter / VPN / Proxy network detected');
  }

  return {
    hasMultipleOrdersFromIp: hasMultiple,
    sameIpOrdersCount: count,
    isRapidFrequency,
    isRegionMismatch,
    isDatacenterOrProxy,
    signalsList,
  };
}
