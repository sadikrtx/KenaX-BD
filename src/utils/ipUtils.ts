import type { Request } from 'express';

/**
 * Validates if a string is a valid IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const clean = ip.trim();

  // IPv4 regex (0.0.0.0 to 255.255.255.255)
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(clean)) return true;

  // IPv6 regex
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^([0-9a-fA-F]{1,4}:){1,7}:|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(clean)) return true;

  // IPv4-mapped IPv6 (::ffff:192.168.1.1)
  if (clean.startsWith('::ffff:') && ipv4Regex.test(clean.substring(7))) {
    return true;
  }

  return false;
}

/**
 * Sanitizes and normalizes an IP address.
 * Converts IPv4-mapped IPv6 (::ffff:103.x.x.x) into normal IPv4 (103.x.x.x).
 * Converts loopbacks (::1) into standard 127.0.0.1.
 */
export function normalizeIp(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
  let clean = rawIp.trim();

  // If port is attached e.g. 103.20.1.5:45821 or [2001:db8::1]:8080
  if (clean.startsWith('[') && clean.includes(']:')) {
    clean = clean.split(']:')[0].replace('[', '');
  } else if (clean.includes(':') && !clean.includes('::') && clean.split(':').length === 2 && clean.includes('.')) {
    clean = clean.split(':')[0];
  }

  // Handle IPv4-mapped IPv6 prefix
  if (clean.startsWith('::ffff:')) {
    clean = clean.replace('::ffff:', '');
  }

  // Handle loopback
  if (clean === '::1' || clean === 'localhost') {
    return '127.0.0.1';
  }

  return clean;
}

/**
 * Checks if the IP is private/local.
 */
export function isPrivateOrLocalIp(ip: string): boolean {
  const norm = normalizeIp(ip);
  if (norm === '127.0.0.1' || norm === 'localhost' || norm === '::1') return true;
  if (norm.startsWith('10.') || norm.startsWith('192.168.') || norm.startsWith('172.16.') || norm.startsWith('172.31.')) return true;
  return false;
}

/**
 * Robust, server-side Real Client IP Detection.
 * Safely extracts client IP when behind Cloud Run, Reverse Proxy, Cloudflare, CDN, or Load Balancers.
 * Never trusts arbitrary client-submitted override parameters over verified server request headers.
 */
export function getRealClientIp(req: Request | any): string {
  if (!req) return '127.0.0.1';

  try {
    const headers = req.headers || {};

    // 1. Cloudflare Connecting IP (Highly reliable when behind Cloudflare proxy)
    const cfConnectingIp = headers['cf-connecting-ip'];
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      const parsed = normalizeIp(cfConnectingIp);
      if (isValidIp(parsed)) return parsed;
    }

    // 2. True-Client-IP (Used by Akamai, Cloudflare Enterprise)
    const trueClientIp = headers['true-client-ip'];
    if (trueClientIp && typeof trueClientIp === 'string') {
      const parsed = normalizeIp(trueClientIp);
      if (isValidIp(parsed)) return parsed;
    }

    // 3. Fastly-Client-IP
    const fastlyClientIp = headers['fastly-client-ip'];
    if (fastlyClientIp && typeof fastlyClientIp === 'string') {
      const parsed = normalizeIp(fastlyClientIp);
      if (isValidIp(parsed)) return parsed;
    }

    // 4. X-Real-IP (Standard reverse proxy header e.g. Nginx, Google Cloud Load Balancer)
    const xRealIp = headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string') {
      const parsed = normalizeIp(xRealIp);
      if (isValidIp(parsed)) return parsed;
    }

    // 5. X-Forwarded-For (Standard multi-proxy forwarding header)
    // Format: client, proxy1, proxy2... -> Leftmost IP is the originating client IP.
    const xForwardedFor = headers['x-forwarded-for'];
    if (xForwardedFor) {
      const list = (typeof xForwardedFor === 'string' ? xForwardedFor : xForwardedFor[0] || '').split(',');
      for (const raw of list) {
        const candidate = normalizeIp(raw);
        if (isValidIp(candidate)) {
          return candidate;
        }
      }
    }

    // 6. X-Client-IP
    const xClientIp = headers['x-client-ip'];
    if (xClientIp && typeof xClientIp === 'string') {
      const parsed = normalizeIp(xClientIp);
      if (isValidIp(parsed)) return parsed;
    }

    // 7. Express / Node.js socket remote address fallback
    const remoteAddress =
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      req.info?.remoteAddress ||
      req.ip;

    if (remoteAddress && typeof remoteAddress === 'string') {
      const parsed = normalizeIp(remoteAddress);
      if (isValidIp(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[IP Detection] Error extracting client IP:', err);
  }

  return '127.0.0.1';
}

/**
 * Format IP for display with masking if needed.
 */
export function formatIpForDisplay(ip?: string, mask: boolean = false): string {
  if (!ip) return 'N/A';
  const clean = normalizeIp(ip);
  if (!mask) return clean;

  const parts = clean.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return clean;
}

/**
 * Returns whether an IP address is IPv4 or IPv6.
 */
export function getIpVersion(ip?: string): 'IPv4' | 'IPv6' | 'Unknown' {
  if (!ip || typeof ip !== 'string') return 'Unknown';
  const clean = normalizeIp(ip);
  if (clean.includes('.')) return 'IPv4';
  if (clean.includes(':')) return 'IPv6';
  return 'Unknown';
}

/**
 * Full details of the client connection and IP detection source.
 */
export interface ClientIpConnectionInfo {
  ip: string;
  ipVersion: 'IPv4' | 'IPv6' | 'Unknown';
  detectionSource: 'cf-connecting-ip' | 'true-client-ip' | 'fastly-client-ip' | 'x-real-ip' | 'x-forwarded-for' | 'x-client-ip' | 'remote-address' | 'fallback';
  isTrustedProxy: boolean;
  proxyType: 'Cloudflare' | 'Google Cloud Load Balancer / Cloud Run' | 'Fastly / Akamai' | 'Reverse Proxy / Nginx' | 'Direct Socket' | 'Unknown';
  isPrivate: boolean;
}

/**
 * Comprehensive detection of connection headers and proxy chain on Node.js/Express.
 */
export function detectIpConnectionDetails(req: Request | any): ClientIpConnectionInfo {
  if (!req) {
    return {
      ip: '127.0.0.1',
      ipVersion: 'IPv4',
      detectionSource: 'fallback',
      isTrustedProxy: false,
      proxyType: 'Direct Socket',
      isPrivate: true,
    };
  }

  const headers = req.headers || {};
  let detectedIp = '127.0.0.1';
  let detectionSource: ClientIpConnectionInfo['detectionSource'] = 'remote-address';
  let isTrustedProxy = false;
  let proxyType: ClientIpConnectionInfo['proxyType'] = 'Direct Socket';

  // 1. Cloudflare
  if (headers['cf-connecting-ip'] && typeof headers['cf-connecting-ip'] === 'string') {
    const parsed = normalizeIp(headers['cf-connecting-ip']);
    if (isValidIp(parsed)) {
      detectedIp = parsed;
      detectionSource = 'cf-connecting-ip';
      isTrustedProxy = true;
      proxyType = 'Cloudflare';
    }
  }
  // 2. True-Client-IP
  else if (headers['true-client-ip'] && typeof headers['true-client-ip'] === 'string') {
    const parsed = normalizeIp(headers['true-client-ip']);
    if (isValidIp(parsed)) {
      detectedIp = parsed;
      detectionSource = 'true-client-ip';
      isTrustedProxy = true;
      proxyType = 'Fastly / Akamai';
    }
  }
  // 3. Fastly
  else if (headers['fastly-client-ip'] && typeof headers['fastly-client-ip'] === 'string') {
    const parsed = normalizeIp(headers['fastly-client-ip']);
    if (isValidIp(parsed)) {
      detectedIp = parsed;
      detectionSource = 'fastly-client-ip';
      isTrustedProxy = true;
      proxyType = 'Fastly / Akamai';
    }
  }
  // 4. X-Real-IP
  else if (headers['x-real-ip'] && typeof headers['x-real-ip'] === 'string') {
    const parsed = normalizeIp(headers['x-real-ip']);
    if (isValidIp(parsed)) {
      detectedIp = parsed;
      detectionSource = 'x-real-ip';
      isTrustedProxy = true;
      proxyType = 'Google Cloud Load Balancer / Cloud Run';
    }
  }
  // 5. X-Forwarded-For
  else if (headers['x-forwarded-for']) {
    const raw = typeof headers['x-forwarded-for'] === 'string' ? headers['x-forwarded-for'] : headers['x-forwarded-for'][0] || '';
    const list = raw.split(',');
    for (const item of list) {
      const candidate = normalizeIp(item);
      if (isValidIp(candidate)) {
        detectedIp = candidate;
        detectionSource = 'x-forwarded-for';
        isTrustedProxy = true;
        proxyType = 'Google Cloud Load Balancer / Cloud Run';
        break;
      }
    }
  }
  // 6. Direct Socket Remote Address
  else {
    const remoteAddress =
      req.socket?.remoteAddress ||
      req.connection?.remoteAddress ||
      req.info?.remoteAddress ||
      req.ip;
    if (remoteAddress && typeof remoteAddress === 'string') {
      const parsed = normalizeIp(remoteAddress);
      if (isValidIp(parsed)) {
        detectedIp = parsed;
        detectionSource = 'remote-address';
        isTrustedProxy = false;
        proxyType = 'Direct Socket';
      }
    }
  }

  const isPrivate = isPrivateOrLocalIp(detectedIp);
  const version = getIpVersion(detectedIp);

  return {
    ip: detectedIp,
    ipVersion: version,
    detectionSource,
    isTrustedProxy,
    proxyType,
    isPrivate,
  };
}
