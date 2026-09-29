import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PlusCircle,
  Users,
  ShoppingBag,
  Package,
  CreditCard,
  Building2,
  Store,
  Sparkles,
  Database,
  Lock,
  Copy,
  Check,
  CheckCheck,
  Truck,
  Layers,
} from 'lucide-react';
import {
  signInForGoogleSheets,
  restoreAccessToken,
  createMasterGoogleSpreadsheet,
  syncAllDataToGoogleSheet,
  SHEET_TAB_NAMES,
  FullSyncData,
} from '../../lib/googleSheetsService';
import { getOrdersFromDB, getCustomersFromDB, getProductsFromDB, saveSettingsToDB } from '../../lib/firebase';
import { getResellers } from '../../lib/resellerStorage';
import { getSellers } from '../../lib/sellerStorage';
import { SiteSettings } from '../../types';

interface AdminGoogleSheetsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
}

export const AdminGoogleSheets: React.FC<AdminGoogleSheetsProps> = ({ settings, onUpdateSettings }) => {
  const [accessToken, setAccessToken] = useState<string | null>(restoreAccessToken());
  const [spreadsheetId, setSpreadsheetId] = useState<string>(settings.googleSpreadsheetId || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(
    settings.googleSpreadsheetUrl || (settings.googleSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${settings.googleSpreadsheetId}/edit` : '')
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(settings.autoSyncGoogleSheets ?? true);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(settings.googleSheetsLastSyncedAt || null);

  const [syncCounts, setSyncCounts] = useState<{
    customers?: number;
    orders?: number;
    deliveredOrders?: number;
    resellers?: number;
    sellers?: number;
    products?: number;
    payments?: number;
  }>({});

  useEffect(() => {
    if (settings.googleSpreadsheetId) {
      setSpreadsheetId(settings.googleSpreadsheetId);
      setSpreadsheetUrl(
        settings.googleSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${settings.googleSpreadsheetId}/edit`
      );
    }
    if (settings.autoSyncGoogleSheets !== undefined) {
      setAutoSyncEnabled(settings.autoSyncGoogleSheets);
    }
    if (settings.googleSheetsLastSyncedAt) {
      setLastSyncedTime(settings.googleSheetsLastSyncedAt);
    }
  }, [settings.googleSpreadsheetId, settings.googleSpreadsheetUrl, settings.autoSyncGoogleSheets, settings.googleSheetsLastSyncedAt]);

  // Handle Google Sign In
  const handleGoogleConnect = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsConnecting(true);

    try {
      const res = await signInForGoogleSheets();
      setAccessToken(res.accessToken);
      setSuccessMsg(`Successfully connected Google Account: ${res.user.email || 'Authorized'}`);
    } catch (err: any) {
      console.error('Google Sheets sign-in error:', err);
      setErrorMsg(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Create brand new Master Spreadsheet
  const handleCreateSpreadsheet = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    let token = accessToken || restoreAccessToken();
    if (!token) {
      try {
        const authRes = await signInForGoogleSheets();
        token = authRes.accessToken;
        setAccessToken(token);
      } catch (err: any) {
        setErrorMsg('Please connect your Google Account first.');
        return;
      }
    }

    setIsCreatingSheet(true);

    try {
      const result = await createMasterGoogleSpreadsheet(token);
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);

      // Save spreadsheet ID to site settings
      const updatedSettings = {
        ...settings,
        googleSpreadsheetId: result.spreadsheetId,
        googleSpreadsheetUrl: result.spreadsheetUrl,
        autoSyncGoogleSheets: true,
      };
      await saveSettingsToDB(updatedSettings);
      if (onUpdateSettings) await onUpdateSettings(updatedSettings);

      setSuccessMsg('Successfully created Master Google Spreadsheet with 8 pre-formatted Tabs!');
    } catch (err: any) {
      console.error('Failed to create Google Sheet:', err);
      // Check if it's a scope error
      if (err.message && (err.message.includes('scope') || err.message.includes('permission') || err.message.includes('403'))) {
        try {
          // Re-authenticate with explicit prompt consent
          const authRes = await signInForGoogleSheets();
          setAccessToken(authRes.accessToken);
          const result = await createMasterGoogleSpreadsheet(authRes.accessToken);
          setSpreadsheetId(result.spreadsheetId);
          setSpreadsheetUrl(result.spreadsheetUrl);

          const updatedSettings = {
            ...settings,
            googleSpreadsheetId: result.spreadsheetId,
            googleSpreadsheetUrl: result.spreadsheetUrl,
            autoSyncGoogleSheets: true,
          };
          await saveSettingsToDB(updatedSettings);
          if (onUpdateSettings) await onUpdateSettings(updatedSettings);

          setSuccessMsg('Successfully created Master Google Spreadsheet with 8 pre-formatted Tabs!');
          return;
        } catch (reAuthErr: any) {
          setErrorMsg('Permission error: Google Sheets & Drive scope required. Please click "Sign in with Google" and check all permission checkboxes in the Google consent popup.');
          return;
        }
      }
      setErrorMsg(err.message || 'Failed to create Google Sheet. Please check permissions.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Sync All Data to Google Sheet
  const handleSyncAllData = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!spreadsheetId) {
      setErrorMsg('Please create or specify a Google Spreadsheet ID first.');
      return;
    }

    let token = accessToken || restoreAccessToken();
    if (!token) {
      try {
        const authRes = await signInForGoogleSheets();
        token = authRes.accessToken;
        setAccessToken(token);
      } catch (err: any) {
        setErrorMsg('Please sign in with Google to perform sync.');
        return;
      }
    }

    setIsSyncing(true);

    try {
      // Fetch latest live data from database
      const [orders, customers, products] = await Promise.all([
        getOrdersFromDB().catch(() => []),
        getCustomersFromDB().catch(() => []),
        getProductsFromDB().catch(() => []),
      ]);

      const resellers = getResellers();
      const sellers = getSellers();

      const syncPayload: FullSyncData = {
        orders,
        customers,
        products,
        resellers,
        sellers,
      };

      const res = await syncAllDataToGoogleSheet(token, spreadsheetId, syncPayload);

      setSyncCounts(res.syncedCounts);

      const timestamp = new Date().toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      setLastSyncedTime(timestamp);

      // Update settings with last synced timestamp
      const updatedSettings = {
        ...settings,
        googleSheetsLastSyncedAt: timestamp,
      };
      await saveSettingsToDB(updatedSettings);
      if (onUpdateSettings) await onUpdateSettings(updatedSettings);

      setSuccessMsg('All ecommerce records successfully synchronized to Google Sheets!');
    } catch (err: any) {
      console.error('Sync failed:', err);
      if (err.message && (err.message.includes('scope') || err.message.includes('permission') || err.message.includes('403'))) {
        try {
          const authRes = await signInForGoogleSheets();
          setAccessToken(authRes.accessToken);

          const [orders, customers, products] = await Promise.all([
            getOrdersFromDB().catch(() => []),
            getCustomersFromDB().catch(() => []),
            getProductsFromDB().catch(() => []),
          ]);
          const resellers = getResellers();
          const sellers = getSellers();

          const syncRes = await syncAllDataToGoogleSheet(authRes.accessToken, spreadsheetId, { orders, customers, products, resellers, sellers });
          setSyncCounts(syncRes.syncedCounts);

          const timestamp = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
          setLastSyncedTime(timestamp);
          const updatedSettings = { ...settings, googleSheetsLastSyncedAt: timestamp };
          await saveSettingsToDB(updatedSettings);
          if (onUpdateSettings) await onUpdateSettings(updatedSettings);

          setSuccessMsg('All ecommerce records successfully synchronized to Google Sheets!');
          return;
        } catch (reAuthErr: any) {
          setErrorMsg('Permission error: Google Sheets scope required. Please click "Sign in with Google" and check all permissions in the consent popup.');
          return;
        }
      }
      setErrorMsg(err.message || 'Failed to sync data to Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Manual Spreadsheet ID/URL
  const handleSaveManualSpreadsheetId = async (customIdOrUrl: string) => {
    let cleanId = customIdOrUrl.trim();
    // Extract ID if full URL was pasted
    if (cleanId.includes('/spreadsheets/d/')) {
      const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-0_-]+)/);
      if (match?.[1]) cleanId = match[1];
    }
    if (!cleanId) return;

    setSpreadsheetId(cleanId);
    const cleanUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
    setSpreadsheetUrl(cleanUrl);

    const updated = {
      ...settings,
      googleSpreadsheetId: cleanId,
      googleSpreadsheetUrl: cleanUrl,
      autoSyncGoogleSheets: true,
    };
    await saveSettingsToDB(updated);
    if (onUpdateSettings) await onUpdateSettings(updated);
    setSuccessMsg('Spreadsheet ID saved successfully!');
  };

  // Toggle Auto-sync setting
  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    const updated = { ...settings, autoSyncGoogleSheets: enabled };
    await saveSettingsToDB(updated);
    if (onUpdateSettings) await onUpdateSettings(updated);
  };

  // Copy Spreadsheet ID to clipboard
  const handleCopyId = () => {
    if (!spreadsheetId) return;
    navigator.clipboard.writeText(spreadsheetId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium mb-2 border border-white/20">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Real-Time Google Sheets Integration</span>
            </div>
            <h2 className="text-2xl font-bold">Google Spreadsheet Synchronization</h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Automatically sync your store's Customers, Orders, Delivered Orders, Resellers, Sellers, Products, and Payment records to Google Sheets in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center gap-2 border border-emerald-100"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Open Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Sync Notice / Error</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Success</p>
            <p className="mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Connection & Setup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Google Account Connection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Connect Google Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Authenticate with Google Sheets API permissions</p>
              </div>
            </div>

            {accessToken ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Check className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Not Connected
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Authorizing allows KenaX BD to create and automatically sync records directly to your Google Drive and Google Sheets.
          </p>

          <button
            onClick={handleGoogleConnect}
            disabled={isConnecting}
            className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 px-4 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all shadow-xs"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isConnecting ? 'Authenticating...' : accessToken ? 'Re-authenticate Google Account' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Step 2: Spreadsheet Setup */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Master Spreadsheet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create new or link existing Google Sheet</p>
              </div>
            </div>

            {spreadsheetId ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                Not Created
              </span>
            )}
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Auto-creates a Google Sheet with 8 tabs, OR paste your own Google Sheet URL/ID below.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCreateSpreadsheet}
              disabled={isCreatingSheet}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isCreatingSheet ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Spreadsheet...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>{spreadsheetId ? 'Re-Create Master Spreadsheet' : 'Auto-Create Google Spreadsheet'}</span>
                </>
              )}
            </button>

            {/* Manual Spreadsheet ID / URL Linker */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Link Existing Google Sheet URL or ID (পাস্‌ট লিংক বা আইডি):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1.../edit"
                  defaultValue={spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : ''}
                  onBlur={(e) => handleSaveManualSpreadsheetId(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    if (input?.value) handleSaveManualSpreadsheetId(input.value);
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                >
                  Save Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Details & Sync Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Spreadsheet Sync Control Center</span>
            </h3>
            {lastSyncedTime && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last full sync completed: <strong className="text-slate-700 dark:text-slate-200">{lastSyncedTime}</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-700/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-xs border-slate-300 focus:ring-emerald-500"
              />
              <span>Auto-Sync on New Activity</span>
            </label>

            <button
              onClick={handleSyncAllData}
              disabled={isSyncing || !spreadsheetId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing All Data...' : 'Sync All Data Now'}</span>
            </button>
          </div>
        </div>

        {/* Spreadsheet ID & Link Info */}
        {spreadsheetId && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Google Spreadsheet ID
              </span>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 select-all">
                  {spreadsheetId}
                </code>
                <button
                  onClick={handleCopyId}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                  title="Copy ID"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-1">
              <span>Spreadsheet Access Link:</span>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
              >
                <span>View in Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Structure Preview Grid */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Configured Spreadsheet Tabs ({Object.keys(SHEET_TAB_NAMES).length} Tabs)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tab 1: Summary */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.SUMMARY}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Live Excel Formulas & Totals</p>
              </div>
            </div>

            {/* Tab 2: Customers */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.CUSTOMERS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.customers !== undefined ? `${syncCounts.customers} Records Synced` : 'Registered accounts & details'}
                </p>
              </div>
            </div>

            {/* Tab 3: Orders (All) */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.ORDERS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.orders !== undefined ? `${syncCounts.orders} Records Synced` : 'Guest & User order entries'}
                </p>
              </div>
            </div>

            {/* Tab 4: Delivered Orders & Customers */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.DELIVERED_ORDERS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.deliveredOrders !== undefined ? `${syncCounts.deliveredOrders} Delivered Records` : 'Completed orders & customers'}
                </p>
              </div>
            </div>

            {/* Tab 5: Resellers */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.RESELLERS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.resellers !== undefined ? `${syncCounts.resellers} Records Synced` : 'Reseller accounts & earnings'}
                </p>
              </div>
            </div>

            {/* Tab 6: Sellers & Vendors */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.SELLERS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.sellers !== undefined ? `${syncCounts.sellers} Records Synced` : 'Vendor shops & commissions'}
                </p>
              </div>
            </div>

            {/* Tab 7: Products */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.PRODUCTS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.products !== undefined ? `${syncCounts.products} Products Synced` : 'Inventory catalog'}
                </p>
              </div>
            </div>

            {/* Tab 8: Payments */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{SHEET_TAB_NAMES.PAYMENTS}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {syncCounts.payments !== undefined ? `${syncCounts.payments} Transactions Synced` : 'bKash/Nagad/COD logs'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
