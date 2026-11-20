import React, { useState, useMemo } from 'react';
import {
  SaasDonutChart,
  SaasBarChart,
  CollapsibleAnalyticsPanel,
} from './charts/AdminCharts';
import {
  Lock,
  Link as LinkIcon,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Hash,
  User,
  Plus,
  Trash2,
  CheckCircle,
  Save,
  Check,
  Zap,
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { SiteSettings, CourierCredentialsSettings, DeliveryZoneItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminCourierLogisticsSettingsProps {
  settings: SiteSettings;
  onUpdateSettings?: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  canManageSettings?: boolean;
}

const DEFAULT_ZONES: DeliveryZoneItem[] = [
  {
    id: 'zone_inside_dhaka',
    name: 'Inside Dhaka',
    charge: 60,
    deliveryTime: '24-48 Hours',
    isDefault: true,
  },
  {
    id: 'zone_outside_dhaka',
    name: 'Outside Dhaka',
    charge: 120,
    deliveryTime: '2-3 Days',
    isDefault: true,
  },
  {
    id: 'zone_sub_dhaka',
    name: 'Sub-Dhaka / Adjacent Areas',
    charge: 100,
    deliveryTime: '48-72 Hours',
    isDefault: false,
  },
];

export const AdminCourierLogisticsSettings: React.FC<AdminCourierLogisticsSettingsProps> = ({
  settings,
  onUpdateSettings,
  canManageSettings = true,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Extract initial credentials
  const creds = settings?.courierCredentials || {};

  // Form states for SteadFast
  const [steadfastUrl, setSteadfastUrl] = useState(
    creds.steadfastUrl || 'https://portal.packzy.com/api/v1'
  );
  const [steadfastApiKey, setSteadfastApiKey] = useState(
    creds.steadfastApiKey || settings?.steadfastApiKey || ''
  );
  const [steadfastSecretKey, setSteadfastSecretKey] = useState(
    creds.steadfastSecretKey || settings?.steadfastSecretKey || ''
  );
  const [steadfastWebhookToken, setSteadfastWebhookToken] = useState(
    creds.steadfastWebhookToken || settings?.steadfastWebhookSecret || ''
  );

  // Form states for Pathao
  const [pathaoUrl, setPathaoUrl] = useState(
    creds.pathaoUrl || 'https://api-hermes.pathao.com'
  );
  const [pathaoClientId, setPathaoClientId] = useState(
    creds.pathaoClientId || settings?.pathaoApiKey || ''
  );
  const [pathaoClientSecret, setPathaoClientSecret] = useState(
    creds.pathaoClientSecret || settings?.pathaoSecretKey || ''
  );
  const [pathaoUsername, setPathaoUsername] = useState(
    creds.pathaoUsername || ''
  );
  const [pathaoPassword, setPathaoPassword] = useState(
    creds.pathaoPassword || ''
  );
  const [pathaoStoreId, setPathaoStoreId] = useState(
    creds.pathaoStoreId || settings?.pathaoStoreId || ''
  );
  const [pathaoWebhookSecret, setPathaoWebhookSecret] = useState(
    creds.pathaoWebhookSecret || ''
  );
  const [pathaoWebhookCallbackSecret, setPathaoWebhookCallbackSecret] = useState(
    creds.pathaoWebhookCallbackSecret || ''
  );

  // Form states for Redx
  const [redxUrl, setRedxUrl] = useState(
    creds.redxUrl || 'https://openapi.redx.com.bd/v1.0.0-sandbox'
  );
  const [redxAccessToken, setRedxAccessToken] = useState(
    creds.redxAccessToken || ''
  );
  const [redxStoreId, setRedxStoreId] = useState(
    creds.redxStoreId || ''
  );

  // Form states for Carrybee
  const [carrybeeUrl, setCarrybeeUrl] = useState(
    creds.carrybeeUrl || 'https://api.carrybee.com'
  );
  const [carrybeeClientId, setCarrybeeClientId] = useState(
    creds.carrybeeClientId || ''
  );
  const [carrybeeClientSecret, setCarrybeeClientSecret] = useState(
    creds.carrybeeClientSecret || ''
  );
  const [carrybeeClientContext, setCarrybeeClientContext] = useState(
    creds.carrybeeClientContext || ''
  );
  const [carrybeeStoreId, setCarrybeeStoreId] = useState(
    creds.carrybeeStoreId || ''
  );

  // Delivery Zones
  const [zones, setZones] = useState<DeliveryZoneItem[]>(
    settings?.deliveryZones && settings.deliveryZones.length > 0
      ? settings.deliveryZones
      : DEFAULT_ZONES
  );

  // Accordion Expand States (All open by default or collapsible)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    steadfast: true,
    pathao: true,
    redx: true,
    carrybee: true,
  });

  // Visibility toggle for secret fields
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  const toggleVisibility = (fieldKey: string) => {
    setVisibleFields((prev) => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Add Zone Modal / Inline state
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCharge, setNewZoneCharge] = useState<number | ''>(100);
  const [newZoneTime, setNewZoneTime] = useState('2-3 Days');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Testing connection states
  const [testingCourier, setTestingCourier] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ courier: string; success: boolean; message: string } | null>(null);

  const handleAddZone = () => {
    if (!newZoneName.trim()) return;
    const newZone: DeliveryZoneItem = {
      id: `zone_${Date.now()}`,
      name: newZoneName.trim(),
      charge: Number(newZoneCharge) || 0,
      deliveryTime: newZoneTime.trim() || '2-3 Days',
    };
    setZones((prev) => [...prev, newZone]);
    setNewZoneName('');
    setNewZoneCharge(100);
    setNewZoneTime('2-3 Days');
    setShowAddZone(false);
  };

  const handleDeleteZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  const handleUpdateZone = (id: string, updates: Partial<DeliveryZoneItem>) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const handleSaveSettings = async () => {
    if (!onUpdateSettings) return;
    setIsSaving(true);
    try {
      const courierPayload: CourierCredentialsSettings = {
        steadfastUrl: steadfastUrl.trim(),
        steadfastApiKey: steadfastApiKey.trim(),
        steadfastSecretKey: steadfastSecretKey.trim(),
        steadfastWebhookToken: steadfastWebhookToken.trim(),
        steadfastEnabled: Boolean(steadfastApiKey && steadfastSecretKey),

        pathaoUrl: pathaoUrl.trim(),
        pathaoClientId: pathaoClientId.trim(),
        pathaoClientSecret: pathaoClientSecret.trim(),
        pathaoUsername: pathaoUsername.trim(),
        pathaoPassword: pathaoPassword.trim(),
        pathaoStoreId: pathaoStoreId.trim(),
        pathaoWebhookSecret: pathaoWebhookSecret.trim(),
        pathaoWebhookCallbackSecret: pathaoWebhookCallbackSecret.trim(),
        pathaoEnabled: Boolean(pathaoClientId || pathaoUsername),

        redxUrl: redxUrl.trim(),
        redxAccessToken: redxAccessToken.trim(),
        redxStoreId: redxStoreId.trim(),
        redxEnabled: Boolean(redxAccessToken),

        carrybeeUrl: carrybeeUrl.trim(),
        carrybeeClientId: carrybeeClientId.trim(),
        carrybeeClientSecret: carrybeeClientSecret.trim(),
        carrybeeClientContext: carrybeeClientContext.trim(),
        carrybeeStoreId: carrybeeStoreId.trim(),
        carrybeeEnabled: Boolean(carrybeeClientId),
      };

      // Extract deliveryInsideDhaka and deliveryOutsideDhaka from zones if present
      const insideDhakaZone = zones.find((z) => z.name.toLowerCase().includes('inside'));
      const outsideDhakaZone = zones.find((z) => z.name.toLowerCase().includes('outside'));

      await onUpdateSettings({
        courierCredentials: courierPayload,
        deliveryZones: zones,
        steadfastApiKey: steadfastApiKey.trim(),
        steadfastSecretKey: steadfastSecretKey.trim(),
        steadfastWebhookSecret: steadfastWebhookToken.trim(),
        pathaoApiKey: pathaoClientId.trim(),
        pathaoSecretKey: pathaoClientSecret.trim(),
        pathaoStoreId: pathaoStoreId.trim(),
        deliveryInsideDhaka: insideDhakaZone ? insideDhakaZone.charge : settings.deliveryInsideDhaka,
        deliveryOutsideDhaka: outsideDhakaZone ? outsideDhakaZone.charge : settings.deliveryOutsideDhaka,
      });

      setSaveSuccess(true);
      setToastNotice(
        isBn
          ? 'কোরিয়ার এপিআই ক্রেডেনশিয়াল এবং ডেলিভারি জোন সফলভাবে সেভ হয়েছে!'
          : 'Courier API credentials & delivery zones saved successfully!'
      );
      setTimeout(() => {
        setSaveSuccess(false);
        setToastNotice(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to save courier settings:', err);
      setToastNotice(isBn ? 'সেভ করতে সমস্যা হয়েছে।' : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCourier = async (courier: 'steadfast' | 'pathao' | 'redx' | 'carrybee') => {
    setTestingCourier(courier);
    setTestResult(null);
    try {
      let body: any = { courier };
      if (courier === 'steadfast') {
        body.apiKey = steadfastApiKey;
        body.secretKey = steadfastSecretKey;
        body.url = steadfastUrl;
      } else if (courier === 'pathao') {
        body.clientId = pathaoClientId;
        body.clientSecret = pathaoClientSecret;
        body.username = pathaoUsername;
        body.password = pathaoPassword;
        body.url = pathaoUrl;
      } else if (courier === 'redx') {
        body.accessToken = redxAccessToken;
        body.url = redxUrl;
      } else if (courier === 'carrybee') {
        body.clientId = carrybeeClientId;
        body.clientSecret = carrybeeClientSecret;
        body.url = carrybeeUrl;
      }

      const res = await fetch('/api/courier/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setTestResult({
        courier,
        success: Boolean(data?.success),
        message: data?.message || (data?.success ? 'Connection verified!' : 'Connection failed.'),
      });
    } catch (err: any) {
      setTestResult({
        courier,
        success: false,
        message: err?.message || 'Network error during test.',
      });
    } finally {
      setTestingCourier(null);
    }
  };

  const courierAnalytics = useMemo(() => {
    const gateways = [
      { id: 'steadfast', configured: Boolean(steadfastApiKey.trim() && steadfastSecretKey.trim()) },
      { id: 'pathao', configured: Boolean(pathaoClientId.trim() && pathaoClientSecret.trim()) },
      { id: 'redx', configured: Boolean(redxAccessToken.trim()) },
      { id: 'carrybee', configured: Boolean(carrybeeClientId.trim() && carrybeeClientSecret.trim()) },
    ];
    const configuredCount = gateways.filter((g) => g.configured).length;
    const unconfiguredCount = gateways.length - configuredCount;

    const gatewaySlices = [
      { id: 'configured', label: isBn ? 'কনফিগার্ড API' : 'Configured APIs', value: configuredCount, color: '#059669' },
      { id: 'pending', label: isBn ? 'সেটআপ বাকি' : 'Pending Setup', value: unconfiguredCount, color: '#D97706' },
    ];

    const zoneBars = zones.map((z) => ({
      id: z.id,
      label: z.name,
      value: Number(z.charge) || 0,
    }));

    return { gatewaySlices, zoneBars };
  }, [steadfastApiKey, steadfastSecretKey, pathaoClientId, pathaoClientSecret, redxAccessToken, carrybeeClientId, carrybeeClientSecret, zones, isBn]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastNotice && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'bg-rose-600 text-white shadow-rose-600/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Courier & Delivery Zone Analytics */}
      <CollapsibleAnalyticsPanel
        title={isBn ? 'ডেলিভারি জোন রেট ও কুরিয়ার API অবস্থা' : 'Delivery Zone Rates & Courier API Readiness'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SaasDonutChart
            title={isBn ? 'কুরিয়ার গেটওয়ে কনফিগারেশন' : 'Courier API Readiness'}
            subtitle={isBn ? 'SteadFast, Pathao, RedX ও Carrybee' : 'Connected vs pending courier integrations'}
            data={courierAnalytics.gatewaySlices}
            centerLabel={isBn ? 'গেটওয়ে' : 'Gateways'}
          />
          <SaasBarChart
            title={isBn ? 'জোন অনুযায়ী ডেলিভারি চার্জ' : 'Delivery Charge by Zone'}
            subtitle={isBn ? 'প্রচলিত ডেলিভারি রেট (৳)' : 'Active shipping tariff across configured zones'}
            data={courierAnalytics.zoneBars}
            valueFormat="currency"
            primaryLabel={isBn ? 'চার্জ (৳)' : 'Fee (৳)'}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* Top Section: Delivery Zones Header & + Add Zone Button */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isBn ? 'ডেলিভারি জোন ও চার্জ কনফিগারেশন' : 'Delivery Zones & Pricing'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'ঢাকা ও ঢাকার বাইরের এলাকা এবং ডেলিভারি চার্জ নির্ধারণ করুন'
                  : 'Manage shipping rates and estimated delivery windows across Bangladesh'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddZone(!showAddZone)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>+ Add Zone</span>
          </button>
        </div>

        {/* Add Zone Inline Form */}
        {showAddZone && (
          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-3 animate-in fade-in">
            <h4 className="text-xs font-bold text-sky-900 dark:text-sky-200">
              {isBn ? 'নতুন ডেলিভারি জোন যুক্ত করুন' : 'Add New Delivery Zone'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Chittagong City / Express"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Delivery Charge (৳)
                </label>
                <input
                  type="number"
                  value={newZoneCharge}
                  onChange={(e) => setNewZoneCharge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Delivery Time
                </label>
                <input
                  type="text"
                  value={newZoneTime}
                  onChange={(e) => setNewZoneTime(e.target.value)}
                  placeholder="e.g. 24-48 Hours"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddZone(false)}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddZone}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Add Zone
              </button>
            </div>
          </div>
        )}

        {/* Existing Zones List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  <span>{zone.name}</span>
                </span>
                {!zone.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone.id)}
                    className="text-rose-500 hover:text-rose-700 p-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete Zone"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Fee (৳)</span>
                  <input
                    type="number"
                    value={zone.charge}
                    onChange={(e) => handleUpdateZone(zone.id, { charge: Number(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Time</span>
                  <input
                    type="text"
                    value={zone.deliveryTime}
                    onChange={(e) => handleUpdateZone(zone.id, { deliveryTime: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Credentials Section Header */}
      <div className="flex items-center gap-2 pt-2">
        <Lock className="w-5 h-5 text-slate-800 dark:text-slate-200" />
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          API Credentials
        </h2>
      </div>

      {/* Test Connection Status Banner */}
      {testResult && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. SteadFast Courier Accordion Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('steadfast')}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                SteadFast
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {steadfastApiKey ? '✓ Configured & Active' : 'Official Packzy Gateway'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testingCourier === 'steadfast' || !steadfastApiKey}
              onClick={(e) => {
                e.stopPropagation();
                handleTestCourier('steadfast');
              }}
              className="px-3 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              title="Test API Connection"
            >
              <RefreshCw className={`w-3 h-3 ${testingCourier === 'steadfast' ? 'animate-spin' : ''}`} />
              <span>{testingCourier === 'steadfast' ? 'Testing...' : 'Test API'}</span>
            </button>

            <button
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {openSections.steadfast ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Body Form */}
        {openSections.steadfast && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            {/* URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={steadfastUrl}
                  onChange={(e) => setSteadfastUrl(e.target.value)}
                  placeholder="https://portal.packzy.com/api/v1"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.steadfastApiKey ? 'text' : 'password'}
                  value={steadfastApiKey}
                  onChange={(e) => setSteadfastApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('steadfastApiKey')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.steadfastApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Secret Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.steadfastSecretKey ? 'text' : 'password'}
                  value={steadfastSecretKey}
                  onChange={(e) => setSteadfastSecretKey(e.target.value)}
                  placeholder="Enter Secret Key"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('steadfastSecretKey')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.steadfastSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Webhook Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.steadfastWebhookToken ? 'text' : 'password'}
                  value={steadfastWebhookToken}
                  onChange={(e) => setSteadfastWebhookToken(e.target.value)}
                  placeholder="Enter Webhook Token"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('steadfastWebhookToken')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.steadfastWebhookToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Pathao Courier Accordion Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('pathao')}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Pathao
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {pathaoClientId ? '✓ Configured & Active' : 'Pathao Hermes Merchant API'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testingCourier === 'pathao' || (!pathaoClientId && !pathaoUsername)}
              onClick={(e) => {
                e.stopPropagation();
                handleTestCourier('pathao');
              }}
              className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              title="Test API Connection"
            >
              <RefreshCw className={`w-3 h-3 ${testingCourier === 'pathao' ? 'animate-spin' : ''}`} />
              <span>{testingCourier === 'pathao' ? 'Testing...' : 'Test API'}</span>
            </button>

            <button
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {openSections.pathao ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Body Form */}
        {openSections.pathao && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            {/* URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={pathaoUrl}
                  onChange={(e) => setPathaoUrl(e.target.value)}
                  placeholder="https://api-hermes.pathao.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoClientId ? 'text' : 'password'}
                  value={pathaoClientId}
                  onChange={(e) => setPathaoClientId(e.target.value)}
                  placeholder="Enter Client ID"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoClientId')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoClientSecret ? 'text' : 'password'}
                  value={pathaoClientSecret}
                  onChange={(e) => setPathaoClientSecret(e.target.value)}
                  placeholder="Enter Client Secret"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoClientSecret')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoUsername ? 'text' : 'password'}
                  value={pathaoUsername}
                  onChange={(e) => setPathaoUsername(e.target.value)}
                  placeholder="Enter Username"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoUsername')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoUsername ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoPassword ? 'text' : 'password'}
                  value={pathaoPassword}
                  onChange={(e) => setPathaoPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoPassword')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Store ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Store ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={pathaoStoreId}
                  onChange={(e) => setPathaoStoreId(e.target.value)}
                  placeholder="Enter Store ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Webhook Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoWebhookSecret ? 'text' : 'password'}
                  value={pathaoWebhookSecret}
                  onChange={(e) => setPathaoWebhookSecret(e.target.value)}
                  placeholder="Enter Webhook Secret"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoWebhookSecret')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Callback Secret */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Webhook Callback Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.pathaoWebhookCallbackSecret ? 'text' : 'password'}
                  value={pathaoWebhookCallbackSecret}
                  onChange={(e) => setPathaoWebhookCallbackSecret(e.target.value)}
                  placeholder="Enter Webhook Callback Secret"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('pathaoWebhookCallbackSecret')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.pathaoWebhookCallbackSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Redx Courier Accordion Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('redx')}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-600 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Redx
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {redxAccessToken ? '✓ Configured & Active' : 'Redx OpenAPI Logistics'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testingCourier === 'redx' || !redxAccessToken}
              onClick={(e) => {
                e.stopPropagation();
                handleTestCourier('redx');
              }}
              className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              title="Test API Connection"
            >
              <RefreshCw className={`w-3 h-3 ${testingCourier === 'redx' ? 'animate-spin' : ''}`} />
              <span>{testingCourier === 'redx' ? 'Testing...' : 'Test API'}</span>
            </button>

            <button
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {openSections.redx ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Body Form */}
        {openSections.redx && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            {/* URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={redxUrl}
                  onChange={(e) => setRedxUrl(e.target.value)}
                  placeholder="Enter URL"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Access Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.redxAccessToken ? 'text' : 'password'}
                  value={redxAccessToken}
                  onChange={(e) => setRedxAccessToken(e.target.value)}
                  placeholder="Enter Access Token"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('redxAccessToken')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.redxAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Store ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Store ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={redxStoreId}
                  onChange={(e) => setRedxStoreId(e.target.value)}
                  placeholder="Enter Store ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Carrybee Courier Accordion Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all">
        {/* Accordion Header */}
        <div
          onClick={() => toggleSection('carrybee')}
          className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Carrybee
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {carrybeeClientId ? '✓ Configured & Active' : 'Carrybee Courier Partner'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={testingCourier === 'carrybee' || !carrybeeClientId}
              onClick={(e) => {
                e.stopPropagation();
                handleTestCourier('carrybee');
              }}
              className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
              title="Test API Connection"
            >
              <RefreshCw className={`w-3 h-3 ${testingCourier === 'carrybee' ? 'animate-spin' : ''}`} />
              <span>{testingCourier === 'carrybee' ? 'Testing...' : 'Test API'}</span>
            </button>

            <button
              type="button"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {openSections.carrybee ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Accordion Body Form */}
        {openSections.carrybee && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5">
            {/* URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={carrybeeUrl}
                  onChange={(e) => setCarrybeeUrl(e.target.value)}
                  placeholder="Enter URL"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.carrybeeClientId ? 'text' : 'password'}
                  value={carrybeeClientId}
                  onChange={(e) => setCarrybeeClientId(e.target.value)}
                  placeholder="Enter Client ID"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('carrybeeClientId')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.carrybeeClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client Secret
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.carrybeeClientSecret ? 'text' : 'password'}
                  value={carrybeeClientSecret}
                  onChange={(e) => setCarrybeeClientSecret(e.target.value)}
                  placeholder="Enter Client Secret"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('carrybeeClientSecret')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.carrybeeClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Client Context */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Client Context
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={visibleFields.carrybeeClientContext ? 'text' : 'password'}
                  value={carrybeeClientContext}
                  onChange={(e) => setCarrybeeClientContext(e.target.value)}
                  placeholder="Enter Client Context"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility('carrybeeClientContext')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {visibleFields.carrybeeClientContext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Store ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Store ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={carrybeeStoreId}
                  onChange={(e) => setCarrybeeStoreId(e.target.value)}
                  placeholder="Enter Store ID"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Save Action Button (Matches Screenshot: Deep Crimson / Red Button) */}
      <div className="pt-4 flex items-center justify-end">
        <button
          type="button"
          disabled={isSaving || !canManageSettings}
          onClick={handleSaveSettings}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#8B0000] hover:bg-[#700000] text-white font-bold text-sm shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
