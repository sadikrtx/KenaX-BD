/**
 * Types for KenaX BD — Xig Reseller Marketplace Integration
 */

export type XigPricingMode = 'percentage_margin' | 'fixed_discount' | 'source_price';

export interface XigIntegrationConfig {
  enabled: boolean;
  apiKey: string;           // Secret Bearer token for server-to-server requests
  apiSecret: string;        // HMAC secret for webhook signature verification
  webhookUrl?: string;      // Xig endpoint to receive real-time notifications
  webhookSecret?: string;   // Secret for signed outbound webhooks
  webhookEvents: string[];  // ['product.updated', 'product.unauthorized', 'order.status_changed']
  rateLimitPerMinute: number;
  pricingRule: {
    mode: XigPricingMode;
    marginPercent: number; // e.g. 15% discount for reseller or 15% margin
    minResalePriceRule: 'enforce_retail' | 'flexible';
  };
  inventorySync: {
    autoHideOutOfStock: boolean;
    stockBuffer: number; // Keep safety buffer before showing out of stock
    allowBackorders: boolean;
  };
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  lastError?: string;
}

export interface XigProductPermission {
  productId: string;
  sku?: string;
  title?: string;
  category?: string;
  sourcePrice: number;
  approvedResellerPrice: number;
  minResalePrice?: number;
  maxResalePrice?: number;
  isEligible: boolean;
  status: 'authorized' | 'revoked' | 'draft';
  authorizedAt?: string;
  revokedAt?: string;
  notes?: string;
}

export interface XigSyncLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  status: number;
  ip: string;
  responseTimeMs: number;
  details?: string;
  isError: boolean;
}

export interface XigExternalOrderMapping {
  xigOrderId: string;
  kenaxOrderId: string;
  idempotencyKey?: string;
  status: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  courierName?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface XigPublicProductItem {
  id: string;
  sku: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  sourcePrice: number;
  resellerPrice: number;
  minResalePrice: number;
  maxResalePrice?: number;
  inStock: boolean;
  stockQuantity: number;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
    sku?: string;
    stock?: number;
  }>;
  resaleEligible: boolean;
  warranty?: string;
  shippingWeightGrams?: number;
  updatedAt: string;
}
