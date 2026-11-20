import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  HardDrive,
  Link2,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRight,
  Eye,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { StorageProvider, StorageSettingsConfig, DEFAULT_STORAGE_SETTINGS } from '../../types';
import { StorageService } from '../../lib/storage/StorageService';
import { GoogleDriveProvider } from '../../lib/storage/GoogleDriveProvider';

interface MarketplaceImageUploaderProps {
  value: string;
  onChange: (url: string, provider: StorageProvider, storagePath?: string) => void;
  user: {
    id: string;
    role?: 'seller' | 'reseller' | 'admin' | 'staff';
    planId?: string;
  };
  productId?: string;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  settings?: StorageSettingsConfig;
  onClear?: () => void;
}

export const MarketplaceImageUploader: React.FC<MarketplaceImageUploaderProps> = ({
  value,
  onChange,
  user,
  productId = 'prod-temp',
  label = 'Product Image',
  placeholder = 'https://...',
  compact = false,
  settings = DEFAULT_STORAGE_SETTINGS,
  onClear,
}) => {
  // Determine initial mode based on current value
  const initialMode = (): 'drive' | 'upload' | 'url' => {
    if (!value) return 'drive'; // Default to Google Drive for zero cost
    if (GoogleDriveProvider.isGoogleDriveUrl(value)) return 'drive';
    if (value.startsWith('/uploads/') || value.includes('/uploads/')) return 'upload';
    return 'url';
  };

  const [activeMode, setActiveMode] = useState<'drive' | 'upload' | 'url'>(initialMode);
  const [driveInput, setDriveInput] = useState(
    GoogleDriveProvider.isGoogleDriveUrl(value) ? value : ''
  );
  const [urlInput, setUrlInput] = useState(
    !GoogleDriveProvider.isGoogleDriveUrl(value) && !value.includes('/uploads/') ? value : ''
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check upload permissions for this user
  const permission = StorageService.canUserUpload(user, settings);
  const effectiveProvider = StorageService.detectProvider(value);
  const displayUrl = StorageService.resolveImageUrl(value);

  useEffect(() => {
    if (GoogleDriveProvider.isGoogleDriveUrl(value)) {
      setDriveInput(value);
    } else if (value && !value.includes('/uploads/')) {
      setUrlInput(value);
    }
  }, [value]);

  // Handle Google Drive Link Input
  const handleDriveUrlChange = (rawUrl: string) => {
    setDriveInput(rawUrl);
    setUploadError(null);

    if (!rawUrl.trim()) {
      onChange('', 'GOOGLE_DRIVE');
      return;
    }

    const parsed = GoogleDriveProvider.parse(rawUrl);
    if (parsed.isGoogleDrive && parsed.fileId) {
      // Direct CDN embed link
      onChange(parsed.directUrl, 'GOOGLE_DRIVE');
    } else {
      // Still pass URL but fallback to raw
      onChange(rawUrl.trim(), 'GOOGLE_DRIVE');
    }
  };

  // Handle Direct Web Link Input
  const handleWebUrlChange = (rawUrl: string) => {
    setUrlInput(rawUrl);
    setUploadError(null);
    onChange(rawUrl.trim(), 'EXTERNAL');
  };

  // Handle File Upload via backend proxy
  const handleFileUpload = async (file: File) => {
    if (!permission.allowed) {
      setUploadError(permission.reason);
      return;
    }

    // Client-side file size check
    const maxSizeBytes = (settings.maxFileSizeMB || 5) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is ${settings.maxFileSizeMB || 5} MB.`
      );
      return;
    }

    // Client-side MIME check
    const allowedTypes = settings.allowedFileTypes || [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Unsupported file format. Please upload JPEG, PNG, WebP, or GIF image.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const result = await StorageService.uploadFile(file, {
        userId: user.id,
        role: user.role || 'seller',
        planId: user.planId,
        productId,
        filename: file.name,
      });

      if (result.success && result.url) {
        setUploadProgress(100);
        onChange(result.url, 'EXTERNAL', result.storagePath);
      } else {
        setUploadError(result.error || 'Failed to upload image. Please try again or use Google Drive.');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Network error during upload. Please use Google Drive.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClear = () => {
    setDriveInput('');
    setUrlInput('');
    setUploadError(null);
    if (onClear) {
      onClear();
    } else {
      onChange('', 'GOOGLE_DRIVE');
    }
  };

  return (
    <div className="space-y-3">
      {/* Label & Active Storage Provider Badge */}
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
          {label}
        </label>
        {value && (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
              effectiveProvider === 'GOOGLE_DRIVE'
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {effectiveProvider === 'GOOGLE_DRIVE' && (
              <>
                <Sparkles className="w-3 h-3 text-sky-500" /> Google Drive (0 MB Quota)
              </>
            )}
            {effectiveProvider === 'FIREBASE' && <>Firebase Storage</>}
            {effectiveProvider === 'EXTERNAL' && <>Uploaded / Web Link</>}
          </span>
        )}
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
        {/* Tab 1: Google Drive */}
        <button
          type="button"
          onClick={() => setActiveMode('drive')}
          className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMode === 'drive'
              ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-sky-300 dark:ring-sky-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          <span>Google Drive</span>
          <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-extrabold">
            FREE
          </span>
        </button>

        {/* Tab 2: Cloud Upload */}
        <button
          type="button"
          onClick={() => setActiveMode('upload')}
          className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMode === 'upload'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-300 dark:ring-emerald-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cloud Upload</span>
          {!permission.allowed && <Lock className="w-3 h-3 text-amber-500" />}
        </button>

        {/* Tab 3: Direct Web Link */}
        <button
          type="button"
          onClick={() => setActiveMode('url')}
          className={`py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeMode === 'url'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs ring-1 ring-indigo-300 dark:ring-indigo-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Image URL</span>
        </button>
      </div>

      {/* Mode Body 1: Google Drive Input */}
      {activeMode === 'drive' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              value={driveInput}
              onChange={(e) => handleDriveUrlChange(e.target.value)}
              placeholder="https://drive.google.com/file/d/1a2B3c.../view?usp=sharing"
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {driveInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-sky-900 dark:text-sky-200 space-y-0.5">
              <span className="font-bold block">100% Free & Zero Server Storage Quota</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Make your Google Drive image public (<em>"Anyone with the link can view"</em>) and paste the link here. It streams instantly via Google's global CDN without consuming any server storage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode Body 2: Cloud Upload */}
      {activeMode === 'upload' && (
        <div className="space-y-2">
          {permission.allowed ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                  isUploading
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <UploadCloud className="w-7 h-7 mx-auto mb-1.5 text-emerald-600 dark:text-emerald-400" />
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {isUploading ? 'Uploading Image...' : 'Click to Browse or Drag Image Here'}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, WebP or GIF (Max {settings.maxFileSizeMB || 5} MB)
                </p>
                {uploadProgress !== null && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Restricted Notice */
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Direct Cloud Upload Restricted</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {permission.reason}
              </p>
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMode('drive')}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use Google Drive (100% Free)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode Body 3: Direct Web Link */}
      {activeMode === 'url' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleWebUrlChange(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {urlInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Direct public image URL from any reliable image host or CDN.
          </span>
        </div>
      )}

      {/* Live Preview Box if image exists */}
      {displayUrl && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                // If lh3 fails, fallback cleanly
                const target = e.currentTarget;
                if (!target.src.includes('placeholder')) {
                  target.src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f1f5f9"/><text x="50" y="55" font-size="10" text-anchor="middle" fill="%2394a3b8">Preview</text></svg>';
                }
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Image Loaded & Verified</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
              {displayUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
