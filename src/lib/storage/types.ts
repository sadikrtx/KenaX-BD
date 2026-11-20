import type { StorageProvider, StorageSettingsConfig } from '../../types';

export type { StorageProvider, StorageSettingsConfig };

export interface StorageUploadOptions {
  userId: string;
  role: 'seller' | 'reseller' | 'admin' | 'staff';
  planId?: string;
  productId?: string;
  assetId?: string;
  folder?: string;
  filename?: string;
  customPrefix?: string;
}

export interface StorageUploadResult {
  success: boolean;
  url: string;
  storagePath?: string;
  storageProvider: StorageProvider;
  sizeBytes?: number;
  mimeType?: string;
  error?: string;
}

export interface StoragePermissionCheckResult {
  allowed: boolean;
  reason: string;
  effectivePlan: string;
  hasIndividualOverride: boolean;
  overrideValue?: boolean;
}

export interface GoogleDriveParsedInfo {
  isGoogleDrive: boolean;
  fileId: string | null;
  directUrl: string;
  originalUrl: string;
}
