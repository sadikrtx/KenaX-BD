import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  Lock,
  Plug,
  Activity,
} from 'lucide-react';
import { SiteSettings, StaffUser, UserRole } from '../../types';
import { safeFetchJson } from '../../utils/safeFetchJson';
import { auth } from '../../lib/firebase';

interface MuseConfigView {
  hasKey: boolean;
  maskedKey: string;
  lowStockThreshold: number;
  createdAt: string | null;
  rotatedAt: string | null;
  updatedBy: string | null;
}

interface AdminIntegrationSettingsProps {
  settings: SiteSettings;
  onUpdateSettings?: (updated: SiteSettings) => Promise<void> | void;
  currentUserRole?: UserRole;
  currentStaff?: StaffUser | null;
}

export const AdminIntegrationSettings: React.FC<AdminIntegrationSettingsProps> = ({
  settings,
  onUpdateSettings,
  currentUserRole,
  currentStaff,
}) => {
  const isStrictSuperAdmin = currentUserRole === 'super_admin';

  const [config, setConfig] = useState<MuseConfigView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Freshly generated key is only displayed once immediately after Generate / Regenerate
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [lowStockInput, setLowStockInput] = useState<number>(
    typeof settings.lowStockThreshold === 'number' ? settings.lowStockThreshold : 5
  );
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState<string | null>(null);

  const buildAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-staff-role': currentUserRole || '',
    };
    if (currentStaff?.id) headers['x-staff-id'] = currentStaff.id;
    if (currentStaff?.name) headers['x-staff-name'] = currentStaff.name;
    if (currentStaff?.email) headers['x-staff-email'] = currentStaff.email;
    try {
      if (auth?.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
      }
    } catch {
      // Optional Firebase Auth token; staff identity headers still sent
    }
    return headers;
  }, [currentUserRole, currentStaff]);

  const loadConfig = useCallback(async () => {
    if (!isStrictSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const headers = await buildAuthHeaders();
      const result = await safeFetchJson<{ ok: boolean; config?: MuseConfigView; error?: string; message?: string }>(
        '/api/integration/admin/config',
        { headers }
      );
      if (!result.ok || !result.data?.ok || !result.data?.config) {
        throw new Error(
          result.error ||
            result.data?.message ||
            result.data?.error ||
            'সার্ভার থেকে ইন্টিগ্রেশন সেটিংস লোড করা যায়নি (Failed to load integration configuration).'
        );
      }
      setConfig(result.data.config);
      if (typeof result.data.config?.lowStockThreshold === 'number') {
        setLowStockInput(result.data.config.lowStockThreshold);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'সার্ভার থেকে সঠিক উত্তর আসেনি (Could not load Muse Integration settings).'
      );
    } finally {
      setLoading(false);
    }
  }, [isStrictSuperAdmin, buildAuthHeaders]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (!isStrictSuperAdmin) {
    return null;
  }

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    setError(null);
    setConfirmRegenerate(false);
    try {
      const headers = await buildAuthHeaders();
      const result = await safeFetchJson<{
        ok: boolean;
        apiKey?: string;
        config?: MuseConfigView;
        error?: string;
        message?: string;
      }>('/api/integration/admin/generate-key', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          actorId: currentStaff?.id || '',
          actorRole: currentUserRole,
          actorName: currentStaff?.name || 'Super Admin',
          actorEmail: currentStaff?.email || '',
        }),
      });
      if (!result.ok || !result.data?.ok || !result.data?.apiKey) {
        throw new Error(
          result.error ||
            result.data?.message ||
            result.data?.error ||
            'সার্ভার থেকে API Key তৈরি করা যায়নি (Failed to generate API key).'
        );
      }
      setNewlyGeneratedKey(result.data.apiKey);
      setShowNewKey(false);
      if (result.data.config) {
        setConfig(result.data.config);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'সার্ভার থেকে সঠিক উত্তর আসেনি (API server error — Failed to generate API key).'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyKey = async () => {
    if (!newlyGeneratedKey) return;
    try {
      await navigator.clipboard.writeText(newlyGeneratedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      setError('Clipboard access blocked. Please select and copy the key manually.');
    }
  };

  const handleCopyBaseUrl = async () => {
    const baseUrl = `${window.location.origin}/api/integration`;
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  const handleSaveThreshold = async () => {
    const cleanVal = Math.max(0, Math.min(1000, Math.round(Number(lowStockInput) || 0)));
    setLowStockInput(cleanVal);
    setIsSavingThreshold(true);
    setError(null);
    setThresholdSavedMsg(null);
    try {
      const headers = await buildAuthHeaders();
      const result = await safeFetchJson<{
        ok: boolean;
        config?: MuseConfigView;
        error?: string;
        message?: string;
      }>('/api/integration/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lowStockThreshold: cleanVal,
          actorId: currentStaff?.id || '',
          actorRole: currentUserRole,
          actorName: currentStaff?.name || 'Super Admin',
          actorEmail: currentStaff?.email || '',
        }),
      });
      if (!result.ok || !result.data?.ok || !result.data?.config) {
        throw new Error(
          result.error ||
            result.data?.message ||
            result.data?.error ||
            'সার্ভার থেকে সেটিংস সেভ করা যায়নি (Failed to save low stock threshold).'
        );
      }
      setConfig(result.data.config);
      if (onUpdateSettings) {
        await Promise.resolve(
          onUpdateSettings({
            ...settings,
            lowStockThreshold: cleanVal,
          })
        ).catch(() => {});
      }
      setThresholdSavedMsg(`Low Stock Threshold updated to ${cleanVal} units.`);
      setTimeout(() => setThresholdSavedMsg(null), 4000);
    } catch (err: any) {
      setError(
        err?.message ||
          'সার্ভার থেকে সঠিক উত্তর আসেনি (API server error — Failed to save low stock threshold).'
      );
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/integration` : '/api/integration';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Muse AI Store Connector
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3 h-3" /> Super Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Connect KenaX BD securely to Muse AI for live order tracking, sales analytics, inventory checks, and authorized order status updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${
                config?.hasKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {config?.hasKey ? 'Key Active' : 'Not Configured'}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* API Key Section */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Integration API Key (X-API-Key)</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stored securely as a one-way SHA-256 hash on the server. Regenerating immediately invalidates the old key.
              </p>
            </div>

            {!confirmRegenerate ? (
              <button
                type="button"
                disabled={isGenerating || loading}
                onClick={() => {
                  if (config?.hasKey) {
                    setConfirmRegenerate(true);
                  } else {
                    handleGenerateKey();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{config?.hasKey ? 'Regenerate API Key' : 'Generate API Key'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                  Old key stops working immediately. Continue?
                </span>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black cursor-pointer"
                >
                  Yes, Rotate
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegenerate(false)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Newly generated key (one-time copyable banner) */}
          {newlyGeneratedKey && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-700 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  New API Key Generated — Copy and save it now (it will not be shown again in plain text)
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewKey((v) => !v)}
                  className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showNewKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showNewKey ? 'Hide' : 'Reveal'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-slate-900 dark:text-emerald-300 break-all select-all">
                  {showNewKey ? newlyGeneratedKey : `${newlyGeneratedKey.slice(0, 12)}••••••••••••••••••••••••${newlyGeneratedKey.slice(-4)}`}
                </code>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3.5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Masked Current Key Display */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Active Stored Key (Masked)
              </p>
              <code className="block text-sm font-mono font-bold text-slate-800 dark:text-slate-100">
                {loading
                  ? 'Loading...'
                  : config?.hasKey
                  ? config.maskedKey
                  : 'No API key generated yet — click "Generate API Key" above.'}
              </code>
              {config?.rotatedAt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Last rotated: {new Date(config.rotatedAt).toLocaleString()} {config.updatedBy ? `by ${config.updatedBy}` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                Connector Base URL
              </span>
              <div className="flex items-center gap-2">
                <code className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  {baseUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyBaseUrl}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
                  title="Copy Base URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Threshold Setting */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Low Stock Threshold (Inventory & Storefront Alert)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Products with available stock less than or equal to this value are flagged as Low Stock in Inventory, Storefront badges, and Muse AI reports. Default: 5.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              min={0}
              max={1000}
              value={lowStockInput}
              onChange={(e) => setLowStockInput(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-black text-slate-900 dark:text-white text-center"
            />
            <button
              type="button"
              onClick={handleSaveThreshold}
              disabled={isSavingThreshold}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingThreshold ? 'Saving...' : 'Save Threshold'}</span>
            </button>
          </div>
        </div>
        {thresholdSavedMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{thresholdSavedMsg}</span>
          </div>
        )}
      </div>

      {/* Connected Endpoints Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
        <h4 className="text-sm font-black text-slate-900 dark:text-white">
          Protected Integration Endpoints (Requires <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">X-API-Key</code>)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {[
            { method: 'GET', path: '/api/integration/health', desc: 'Store connectivity check & server timestamp' },
            { method: 'GET', path: '/api/integration/orders', desc: 'All orders (supports ?since=<ISO>)' },
            { method: 'GET', path: '/api/integration/products', desc: 'Catalog, pricing, available stock & total sold' },
            { method: 'GET', path: '/api/integration/inventory', desc: 'Physical, reserved, available, lowStock & verifyStock' },
            { method: 'GET', path: '/api/integration/activity', desc: 'Real staff & Muse activity log (newest first)' },
            { method: 'GET', path: '/api/integration/sales-summary', desc: 'Unified Gross Sales, Net Sales, Pending COD & Top Sellers' },
            { method: 'POST', path: '/api/integration/orders/:orderId/status', desc: 'Only allowed write action — validated status transition + audit log' },
          ].map((ep) => (
            <div
              key={ep.path}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5"
            >
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                  ep.method === 'POST'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300'
                }`}
              >
                {ep.method}
              </span>
              <div className="min-w-0">
                <code className="block font-mono text-[11px] font-bold text-slate-900 dark:text-white break-all">
                  {ep.path}
                </code>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{ep.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
