import type { StorageProvider, StorageSettingsConfig } from '../../types';
import { DEFAULT_STORAGE_SETTINGS } from '../../types';
import { GoogleDriveProvider } from './GoogleDriveProvider';
import type { StoragePermissionCheckResult, StorageUploadOptions, StorageUploadResult } from './types';

/**
 * StorageService
 *
 * Central facade for multi-provider file storage in KenaX BD:
 * 1. Google Drive: Independent zero-cost URL reference for Seller & Reseller products
 * 2. Cloud Server Storage: Gated isolated uploads for authorized Sellers and Resellers
 * 3. Firebase: Core primary storage for official KenaX BD website products & assets
 */
export class StorageService {
  /**
   * Resolves any image URL or product reference into a direct displayable image URL.
   * - If Google Drive URL: converts to fast direct preview/CDN link.
   * - If Firebase or standard URL: returns directly.
   */
  static resolveImageUrl(imageOrProduct: any): string {
    if (!imageOrProduct) return '';

    // If a product object is passed
    if (typeof imageOrProduct === 'object') {
      const url =
        imageOrProduct.images?.[0] ||
        imageOrProduct.imageUrl ||
        imageOrProduct.image ||
        '';
      return this.resolveImageUrl(url);
    }

    if (typeof imageOrProduct !== 'string') return '';
    const trimmed = imageOrProduct.trim();
    if (!trimmed) return '';

    // Check Google Drive
    if (GoogleDriveProvider.isGoogleDriveUrl(trimmed)) {
      return GoogleDriveProvider.getDirectImageUrl(trimmed);
    }

    return trimmed;
  }

  /**
   * Identifies the storage provider for a given URL or product
   */
  static detectProvider(item: { storageProvider?: StorageProvider; images?: string[] } | string): StorageProvider {
    if (typeof item === 'object' && item.storageProvider) {
      return item.storageProvider;
    }

    const url = typeof item === 'string' ? item : item?.images?.[0] || '';
    if (GoogleDriveProvider.isGoogleDriveUrl(url)) {
      return 'GOOGLE_DRIVE';
    }
    if (url.includes('firebasestorage.googleapis.com')) {
      return 'FIREBASE';
    }
    return 'EXTERNAL';
  }

  /**
   * Checks whether a user (Seller or Reseller) has permission to upload to Cloud Storage.
   */
  static canUserUpload(
    user: { id: string; role?: string; planId?: string },
    settings?: StorageSettingsConfig
  ): StoragePermissionCheckResult {
    const config = settings || DEFAULT_STORAGE_SETTINGS;
    const isSeller = user.role === 'seller';
    const isReseller = user.role === 'reseller';

    if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'staff') {
      return {
        allowed: true,
        reason: 'Staff & Admins have full access to storage.',
        effectivePlan: 'admin',
        hasIndividualOverride: false,
      };
    }

    const override = isSeller
      ? config.individualSellerOverrides?.[user.id]
      : config.individualResellerOverrides?.[user.id];

    if (typeof override === 'boolean') {
      return {
        allowed: override,
        reason: override
          ? 'Individual override granted by administrator.'
          : 'Individual upload access restricted by administrator.',
        effectivePlan: user.planId || 'standard',
        hasIndividualOverride: true,
        overrideValue: override,
      };
    }

    const featureEnabled = isSeller
      ? Boolean(config.cloudSellerUploadEnabled)
      : isReseller
      ? Boolean(config.cloudResellerUploadEnabled)
      : false;

    if (!featureEnabled) {
      return {
        allowed: false,
        reason: 'Cloud upload is currently disabled by system administrator.',
        effectivePlan: user.planId || 'standard',
        hasIndividualOverride: false,
      };
    }

    const allowedPlans = isSeller ? config.allowedSellerPlans || [] : config.allowedResellerPlans || [];
    const planId = user.planId || 'standard';
    const isPlanAllowed = allowedPlans.includes(planId);

    return {
      allowed: isPlanAllowed,
      reason: isPlanAllowed
        ? `Allowed on '${planId}' plan.`
        : `Upload requires an upgraded plan (${allowedPlans.join(', ')}). Currently on '${planId}'.`,
      effectivePlan: planId,
      hasIndividualOverride: false,
    };
  }

  /**
   * Uploads a seller or reseller file via the backend server proxy
   */
  static async uploadFile(
    file: File | Blob,
    options: StorageUploadOptions,
    authToken?: string
  ): Promise<StorageUploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file, options.filename || 'image.jpg');
      formData.append('userId', options.userId);
      formData.append('role', options.role);
      if (options.planId) formData.append('planId', options.planId);
      if (options.productId) formData.append('productId', options.productId);
      if (options.folder) formData.append('folder', options.folder);

      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Upload failed with status ${res.status}`);
      }

      const data = await res.json();
      return {
        success: true,
        url: data.url,
        storagePath: data.storagePath,
        storageProvider: data.storageProvider || 'EXTERNAL',
        sizeBytes: data.sizeBytes,
        mimeType: data.mimeType,
      };
    } catch (err: any) {
      return {
        success: false,
        url: '',
        storageProvider: 'EXTERNAL',
        error: err.message || 'File upload failed',
      };
    }
  }

  /**
   * Parses and validates a Google Drive link
   */
  static parseGoogleDriveUrl(url: string) {
    return GoogleDriveProvider.parse(url);
  }
}
