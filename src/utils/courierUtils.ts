export interface CourierPartnerInfo {
  name: string;
  shortName: string;
  portalUrl: string;
  trackingPrefix: string;
}

export const SUPPORTED_COURIERS: CourierPartnerInfo[] = [
  {
    name: 'Steadfast Courier',
    shortName: 'Steadfast',
    portalUrl: 'https://steadfast.com.bd/merchant',
    trackingPrefix: 'STF',
  },
  {
    name: 'Pathao Courier',
    shortName: 'Pathao',
    portalUrl: 'https://merchant.pathao.com/',
    trackingPrefix: 'PTH',
  },
  {
    name: 'RedX',
    shortName: 'RedX',
    portalUrl: 'https://redx.com.bd/',
    trackingPrefix: 'REDX',
  },
  {
    name: 'Paperfly',
    shortName: 'Paperfly',
    portalUrl: 'https://paperfly.com.bd/',
    trackingPrefix: 'PFLY',
  },
  {
    name: 'eCourier',
    shortName: 'eCourier',
    portalUrl: 'https://ecourier.com.bd/',
    trackingPrefix: 'ECO',
  },
];

export const resolveCourierTrackingUrl = (courier?: string, trackingId?: string): string => {
  if (!trackingId || !trackingId.trim()) return '';
  const cleanId = trackingId.trim();
  const c = (courier || '').toLowerCase();

  if (c.includes('pathao')) {
    return `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(cleanId)}`;
  }
  if (c.includes('redx')) {
    return `https://redx.com.bd/track-order?trackingId=${encodeURIComponent(cleanId)}`;
  }
  if (c.includes('paperfly')) {
    return `https://paperfly.com.bd/tracking?id=${encodeURIComponent(cleanId)}`;
  }
  if (c.includes('ecourier')) {
    return `https://ecourier.com.bd/tracking?ref=${encodeURIComponent(cleanId)}`;
  }
  return `https://steadfast.com.bd/t/${encodeURIComponent(cleanId)}`;
};

export const getCourierPortalUrl = (courier?: string): string => {
  const c = (courier || '').toLowerCase();
  if (c.includes('pathao')) return 'https://merchant.pathao.com/';
  if (c.includes('redx')) return 'https://redx.com.bd/';
  if (c.includes('paperfly')) return 'https://paperfly.com.bd/';
  if (c.includes('ecourier')) return 'https://ecourier.com.bd/';
  return 'https://steadfast.com.bd/merchant';
};
