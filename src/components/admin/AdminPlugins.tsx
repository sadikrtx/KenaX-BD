import React, { useState, useMemo } from 'react';
import {
  Puzzle,
  LayoutTemplate,
  MessageCircle,
  BarChart3,
  Search,
  Boxes,
  Truck,
  CreditCard,
  Network,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Store,
  Sliders,
  RefreshCw,
  History,
  ShieldCheck,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Download,
  Plus,
  Check,
  Copy,
  ArrowUpRight,
  X,
  Key,
  Code2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { usePlugins } from '../../context/PluginContext';
import type {
  PluginManifest,
  PluginPermissionScope,
  PluginStorefrontZone,
  PluginExtensionSlot,
  PluginPackageValidationResult,
  PluginRecord,
} from '../../types/pluginTypes';
import type { UserRole, StaffUser } from '../../types';
import type { AdminTab } from './AdminSidebar';
import {
  SaasDonutChart,
  SaasBarChart,
  CollapsibleAnalyticsPanel,
  SAAS_CHART_COLORS,
} from './charts/AdminCharts';

export type PluginManagerSubTab =
  | 'installed'
  | 'add-new'
  | 'store'
  | 'upload'
  | 'settings'
  | 'updates'
  | 'logs';

interface AdminPluginsProps {
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
  initialSubTab?: PluginManagerSubTab;
  onSelectAdminTab?: (tab: AdminTab) => void;
}

const PERMISSION_SCOPE_DETAILS: {
  scope: PluginPermissionScope;
  labelBn: string;
}[] = [
  { scope: 'Read Products', labelBn: 'প্রোডাক্টের নাম, দাম, ছবি ও স্টক দেখতে পারবে' },
  { scope: 'Manage Products', labelBn: 'নতুন প্রোডাক্ট যোগ বা দাম/তথ্য পরিবর্তন করতে পারবে' },
  { scope: 'Read Orders', labelBn: 'অর্ডার লিস্ট ও অর্ডারের স্ট্যাটাস দেখতে পারবে' },
  { scope: 'Manage Orders', labelBn: 'অর্ডার কনফার্ম, আপডেট বা ক্যান্সেল করতে পারবে' },
  { scope: 'Read Customers', labelBn: 'কাস্টমারের নাম, ফোন নম্বর ও ঠিকানা দেখতে পারবে' },
  { scope: 'Read Reseller Data', labelBn: 'রিসেলার ও ভেন্ডরদের তথ্য দেখতে পারবে' },
  { scope: 'Manage Inventory', labelBn: 'স্টক সংখ্যা ও ওয়্যারহাউস ইনভেন্টরি আপডেট করতে পারবে' },
  { scope: 'Access Analytics', labelBn: 'সেলস রিপোর্ট ও বিজনেস অ্যানালিটিক্স দেখতে পারবে' },
  { scope: 'Access Dashboard Widgets', labelBn: 'অ্যাডমিন ড্যাশবোর্ডে উইজেট যুক্ত করতে পারবে' },
  { scope: 'Access External APIs', labelBn: 'বাইরের সার্ভারের সাথে ওয়েবহুক/API ডেটা আদান-প্রদান করতে পারবে' },
];

const STOREFRONT_ZONE_OPTIONS: {
  zone: PluginStorefrontZone;
  title: string;
  descBn: string;
}[] = [
  {
    zone: 'admin_only',
    title: 'Admin Dashboard Only (No Public Website Output)',
    descBn: 'মূল ওয়েবসাইটে কাস্টমাররা কিছুই দেখবে না — শুধুমাত্র অ্যাডমিন প্যানেলে কাজ করবে',
  },
  {
    zone: 'storefront_landing_pages',
    title: 'Landing Pages & Custom Funnel Routes (/p/:slug)',
    descBn: 'ওয়েবসাইটের ল্যান্ডিং পেজ বা কাস্টম সেলস পেজে কাস্টমাররা দেখতে পাবে',
  },
  {
    zone: 'storefront_product_page',
    title: 'Product Details Page Section / Badge',
    descBn: 'প্রোডাক্ট পেজে কাস্টমারদের সামনে উইজেট বা তথ্য হিসেবে দেখা যাবে',
  },
  {
    zone: 'storefront_checkout',
    title: 'Checkout & Order Form Integration',
    descBn: 'চেকআউট বা অর্ডার কনফার্মেশন অংশে কাজ করবে এবং দেখা যাবে',
  },
  {
    zone: 'storefront_floating_widget',
    title: 'Floating Storefront Button / Chat Widget',
    descBn: 'ওয়েবসাইটের কোণায় ফ্লোটিং বাটন (যেমন WhatsApp চ্যাট) হিসেবে দেখা যাবে',
  },
  {
    zone: 'storefront_header_footer_script',
    title: 'Website SEO Meta & Header/Footer Script',
    descBn: 'ওয়েবসাইটের হেডার/ফুটার ও সার্চ ইঞ্জিন SEO মেটা ট্যাগে যুক্ত থাকবে',
  },
];

const EXTENSION_SLOT_OPTIONS: {
  slot: PluginExtensionSlot;
  label: string;
  labelBn: string;
  targetTab: AdminTab;
  targetGroup: NonNullable<PluginManifest['sidebarNavigation']>['targetGroup'];
}[] = [
  {
    slot: 'admin.landing_pages.builder_panel',
    label: 'Website Builder / Landing Pages',
    labelBn: 'Website Builder / Landing Pages মেনু',
    targetTab: 'landing-pages',
    targetGroup: 'MARKETING & ADS',
  },
  {
    slot: 'admin.whatsapp.communication_panel',
    label: 'WhatsApp / Communication',
    labelBn: 'WhatsApp Automation মেনু',
    targetTab: 'whatsapp-automation',
    targetGroup: 'AUTOMATION',
  },
  {
    slot: 'admin.reports.panel',
    label: 'Reports & Analytics',
    labelBn: 'Reports & Analytics মেনু',
    targetTab: 'reports',
    targetGroup: 'CORE',
  },
  {
    slot: 'admin.seo.settings_panel',
    label: 'Website SEO Settings',
    labelBn: 'SEO Settings মেনু',
    targetTab: 'seo-settings',
    targetGroup: 'SYSTEM',
  },
  {
    slot: 'admin.inventory.toolbar',
    label: 'Inventory & Stock Management',
    labelBn: 'Inventory Management মেনু',
    targetTab: 'inventory',
    targetGroup: 'CATALOG',
  },
  {
    slot: 'admin.products.editor_panel',
    label: 'Product Management',
    labelBn: 'Products মেনু',
    targetTab: 'products',
    targetGroup: 'CATALOG',
  },
  {
    slot: 'admin.orders.toolbar',
    label: 'Orders Management',
    labelBn: 'Orders মেনু',
    targetTab: 'orders',
    targetGroup: 'SALES',
  },
];

export const AdminPlugins: React.FC<AdminPluginsProps> = ({
  currentRole,
  initialSubTab = 'installed',
  onSelectAdminTab,
}) => {
  const {
    state,
    actionLoadingId,
    getInstallation,
    getPluginSettings,
    getPluginPermissions,
    installPlugin,
    generateApiKey,
    deleteApiKey,
    verifyPluginConnection,
    activatePlugin,
    deactivatePlugin,
    updatePlugin,
    rollbackPlugin,
    uninstallPlugin,
    savePluginSettings,
    savePluginPermissions,
    validatePackage,
  } = usePlugins();

  const [activeSubTab, setActiveSubTab] = useState<PluginManagerSubTab>(initialSubTab);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Integrations & SDK (Screenshot 11) states
  const [sdkTopMode, setSdkTopMode] = useState<'custom_sdk' | 'plugin_zip' | 'rest_docs'>(
    'custom_sdk'
  );
  const [keyLabelInput, setKeyLabelInput] = useState('Production React Storefront');
  const [allowedOriginsInput, setAllowedOriginsInput] = useState('*');
  const [selectedSdkPluginId, setSelectedSdkPluginId] = useState<string>(
    'knx.flowora.clone.builder'
  );
  const [codeSnippetTab, setCodeSnippetTab] = useState<'html' | 'js' | 'react' | 'curl'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  const [testSdkKeyInput, setTestSdkKeyInput] = useState('flw_live_demo_universal_key_2026');
  const [liveSdkResponse, setLiveSdkResponse] = useState<Record<string, any> | null>({
    status: 200,
    id: 'page_936945b75d',
    pluginId: 'knx.flowora.clone.builder',
    title: 'FLOWORA CLONE BUILDER',
    slug: 'flowora-clone-builder-cod',
    htmlBytes: 10203,
  });

  // Settings & Permissions states
  const [selectedSettingsPluginId, setSelectedSettingsPluginId] = useState<string>(
    'knx.flowora.clone.builder'
  );
  const [draftBackendUrl, setDraftBackendUrl] = useState<string>('');
  const [draftApiSecret, setDraftApiSecret] = useState<string>('flw_live_demo_universal_key_2026');
  const [draftIntegrationMode, setDraftIntegrationMode] = useState<'embedded_app' | 'rest_webhook'>(
    'embedded_app'
  );
  const [draftPermissions, setDraftPermissions] = useState<PluginPermissionScope[]>([
    'Read Products',
    'Manage Products',
    'Read Orders',
    'Access External APIs',
  ]);
  const [draftStorefrontZones, setDraftStorefrontZones] = useState<PluginStorefrontZone[]>([
    'storefront_landing_pages',
  ]);
  const [draftAdminSlot, setDraftAdminSlot] = useState<PluginExtensionSlot>(
    'admin.landing_pages.builder_panel'
  );

  // Custom Plugin registration states
  const [customName, setCustomName] = useState('');
  const [customPluginId, setCustomPluginId] = useState('');
  const [customBackendUrl, setCustomBackendUrl] = useState('');

  // Upload ZIP states
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [manifestJsonInput, setManifestJsonInput] = useState<string>('');
  const [validationReport, setValidationReport] = useState<PluginPackageValidationResult | null>(
    null
  );
  const [isValidating, setIsValidating] = useState(false);

  // Uninstall modal
  const [uninstallModalPlugin, setUninstallModalPlugin] = useState<PluginRecord | null>(null);

  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'admin';

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Lists of installed plugins vs templates
  const installedPluginsList = useMemo(() => {
    return state.installations
      .map((inst) => {
        const plugin = state.plugins.find((p) => p.pluginId === inst.pluginId);
        return plugin ? { plugin, installation: inst } : null;
      })
      .filter(
        (
          item
        ): item is {
          plugin: PluginRecord;
          installation: NonNullable<ReturnType<typeof getInstallation>>;
        } => Boolean(item)
      );
  }, [state.installations, state.plugins]);

  const activeInstalledCount = useMemo(
    () =>
      state.installations.filter((i) => i.status === 'active' && Boolean(i.connectionVerified))
        .length,
    [state.installations]
  );

  // Installed plugins that are currently NOT active (saved in Plugin Templates as unused)
  const unusedInstalledPlugins = useMemo(
    () =>
      installedPluginsList.filter(
        ({ installation }) => installation.status !== 'active' || !installation.connectionVerified
      ),
    [installedPluginsList]
  );

  const pluginAnalytics = useMemo(() => {
    const installedIds = new Set(state.installations.map((i) => i.pluginId));
    let activeCount = 0;
    let needsVerifyCount = 0;
    let inactiveCount = 0;

    state.installations.forEach((inst) => {
      const verified = Boolean(inst.connectionVerified);
      if (inst.status === 'active' && verified) activeCount += 1;
      else if (!verified) needsVerifyCount += 1;
      else inactiveCount += 1;
    });

    const availableStoreCount = state.plugins.filter((p) => !installedIds.has(p.pluginId)).length;

    const lifecycleSlices = [
      { id: 'active', label: 'Active & Verified', value: activeCount, color: '#059669' },
      { id: 'inactive', label: 'Inactive / Paused', value: inactiveCount, color: '#0284C7' },
      { id: 'verify', label: 'Needs Verification', value: needsVerifyCount, color: '#D97706' },
      { id: 'store', label: 'Available in Store', value: availableStoreCount, color: '#64748B' },
    ].filter((s) => s.value > 0);

    const catMap = new Map<string, { total: number; active: number }>();
    state.plugins.forEach((p) => {
      const cat = p.category || 'Other';
      const entry = catMap.get(cat) || { total: 0, active: 0 };
      entry.total += 1;
      const inst = state.installations.find((i) => i.pluginId === p.pluginId);
      if (inst && inst.status === 'active' && inst.connectionVerified) {
        entry.active += 1;
      }
      catMap.set(cat, entry);
    });

    const categoryBars = Array.from(catMap.entries())
      .map(([cat, stats]) => ({
        id: cat,
        label: cat.split('&')[0].trim(),
        value: stats.total,
        secondaryValue: stats.active,
        color: '#4F46E5',
        secondaryColor: '#059669',
        hint: `${cat} (${stats.active} Active / ${stats.total} Catalog)`,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      lifecycleSlices,
      categoryBars,
      totalPlugins: state.plugins.length,
      logsCount: state.activityLogs?.length || 0,
    };
  }, [state.plugins, state.installations, state.activityLogs]);

  // Sync testSdkKeyInput when apiKeys update
  React.useEffect(() => {
    if (state.apiKeys && state.apiKeys.length > 0 && !testSdkKeyInput) {
      setTestSdkKeyInput(state.apiKeys[0].secretKey);
    }
  }, [state.apiKeys, testSdkKeyInput]);

  // Load selected plugin's permissions, placement & settings into draft
  const loadPluginIntoDraft = React.useCallback(
    (targetPluginId: string) => {
      const plugin = state.plugins.find((p) => p.pluginId === targetPluginId);
      if (!plugin) return;
      const savedSet = getPluginSettings(targetPluginId);
      const savedPerm = getPluginPermissions(targetPluginId);

      setDraftBackendUrl(
        savedSet?.externalApiUrl ||
          savedSet?.configValues?.backendUrl ||
          plugin.manifest.apiIntegration?.externalEndpointUrl ||
          ''
      );
      setDraftApiSecret(
        savedSet?.apiSecretKey ||
          savedSet?.configValues?.apiSecretKey ||
          state.apiKeys?.[0]?.secretKey ||
          'flw_live_demo_universal_key_2026'
      );
      setDraftIntegrationMode(
        savedSet?.integrationMode ||
          plugin.manifest.apiIntegration?.integrationMode ||
          'embedded_app'
      );
      setDraftPermissions(
        savedPerm?.grantedPermissions || plugin.manifest.permissions || ['Read Products']
      );
      setDraftStorefrontZones(
        savedPerm?.storefrontZones ||
          plugin.manifest.storefrontZones ||
          (plugin.manifest.storefrontVisible ? ['storefront_landing_pages'] : ['admin_only'])
      );
      setDraftAdminSlot(
        savedPerm?.adminTargetSlot ||
          plugin.manifest.extensionSlots[0] ||
          'admin.landing_pages.builder_panel'
      );
    },
    [state.plugins, state.apiKeys, getPluginSettings, getPluginPermissions]
  );

  React.useEffect(() => {
    if (selectedSettingsPluginId) {
      loadPluginIntoDraft(selectedSettingsPluginId);
    }
  }, [selectedSettingsPluginId, loadPluginIntoDraft]);

  React.useEffect(() => {
    if (selectedSdkPluginId) {
      loadPluginIntoDraft(selectedSdkPluginId);
    }
  }, [selectedSdkPluginId, loadPluginIntoDraft]);

  const renderPluginIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'LayoutTemplate':
        return <LayoutTemplate className={className} />;
      case 'MessageCircle':
        return <MessageCircle className={className} />;
      case 'BarChart3':
        return <BarChart3 className={className} />;
      case 'Search':
        return <Search className={className} />;
      case 'Boxes':
        return <Boxes className={className} />;
      case 'Truck':
        return <Truck className={className} />;
      case 'CreditCard':
        return <CreditCard className={className} />;
      case 'Network':
        return <Network className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      default:
        return <Puzzle className={className} />;
    }
  };

  // Code Snippets for Screenshot 11 Right Panel
  const currentSdkPlugin =
    state.plugins.find((p) => p.pluginId === selectedSdkPluginId) || state.plugins[0];
  const activeApiKeyString =
    testSdkKeyInput || state.apiKeys?.[0]?.secretKey || 'flw_live_demo_universal_key_2026';
  const bridgeEndpointUrl = `${window.location.origin}/api/plugins/bridge/${
    currentSdkPlugin?.pluginId || 'knx.flowora.clone.builder'
  }/data`;

  const generatedSnippet = useMemo(() => {
    const pid = currentSdkPlugin?.pluginId || 'knx.flowora.clone.builder';
    const pname = currentSdkPlugin?.name || 'FLOWORA CLONE BUILDER';

    if (codeSnippetTab === 'html') {
      return `<!-- KenaX BD Plugin Embed Script (${pname}) -->
<div id="kenax-plugin-root" data-plugin-id="${pid}"></div>
<script
  src="${window.location.origin}/sdk/kenax-plugin-embed.js"
  data-api-key="${activeApiKeyString}"
  data-plugin-id="${pid}"
  async
></script>`;
    }

    if (codeSnippetTab === 'js') {
      return `// KenaX BD JavaScript SDK (${pname})
const response = await fetch("${bridgeEndpointUrl}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${activeApiKeyString}",
    "Accept": "application/json"
  }
});
const data = await response.json();
console.log("Connected Plugin Data:", data);`;
    }

    if (codeSnippetTab === 'react') {
      return `import React, { useEffect, useState } from 'react';

export function KenaXPluginBridge() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    fetch("${bridgeEndpointUrl}", {
      headers: {
        Authorization: "Bearer ${activeApiKeyString}",
        Accept: "application/json",
      },
    })
      .then((res) => res.json())
      .then(setPayload);
  }, []);

  return <pre>{JSON.stringify(payload, null, 2)}</pre>;
}`;
    }

    return `curl -X GET "${bridgeEndpointUrl}" \\
  -H "Authorization: Bearer ${activeApiKeyString}" \\
  -H "Accept: application/json"`;
  }, [codeSnippetTab, currentSdkPlugin, activeApiKeyString, bridgeEndpointUrl]);

  const handleDownloadSdkFile = (type: 'embed' | 'sdk' | 'react') => {
    const pid = currentSdkPlugin?.pluginId || 'knx.plugin';
    let content = generatedSnippet;
    let filename = `${pid}-bridge.js`;

    if (type === 'embed') {
      filename = `${pid}-embed.js`;
      content = `// KenaX BD Embed Loader for ${pid}\n(function(){\n  fetch("${bridgeEndpointUrl}", { headers: { "Authorization": "Bearer ${activeApiKeyString}" } })\n    .then(r => r.json())\n    .then(d => console.log("[KenaX Plugin Connected]", d));\n})();`;
    } else if (type === 'sdk') {
      filename = `${pid}-sdk.js`;
      content = `export async function fetchKenaXStoreData() {\n  const res = await fetch("${bridgeEndpointUrl}", {\n    headers: { "Authorization": "Bearer ${activeApiKeyString}", "Accept": "application/json" }\n  });\n  return res.json();\n}`;
    } else {
      filename = `KenaXPluginComponent.tsx`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const togglePermissionCheckbox = (scope: PluginPermissionScope) => {
    setDraftPermissions((prev) =>
      prev.includes(scope) ? prev.filter((p) => p !== scope) : [...prev, scope]
    );
  };

  const toggleStorefrontZone = (zone: PluginStorefrontZone) => {
    if (zone === 'admin_only') {
      setDraftStorefrontZones(['admin_only']);
      return;
    }
    setDraftStorefrontZones((prev) => {
      const withoutAdminOnly = prev.filter((z) => z !== 'admin_only');
      if (withoutAdminOnly.includes(zone)) {
        const next = withoutAdminOnly.filter((z) => z !== zone);
        return next.length === 0 ? ['admin_only'] : next;
      }
      return [...withoutAdminOnly, zone];
    });
  };

  const handlePackageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    try {
      const text = await file.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const extractedJson = text.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(extractedJson);
        setManifestJsonInput(JSON.stringify(parsed, null, 2));
        setIsValidating(true);
        const report = await validatePackage(parsed, file.name);
        setValidationReport(report);
        if (report?.manifest?.permissions) {
          setDraftPermissions(report.manifest.permissions);
        }
        setIsValidating(false);
      } else {
        showFeedback('error', 'প্যাকেজের ভেতর বৈধ plugin.json পাওয়া যায়নি।');
      }
    } catch {
      showFeedback('error', 'ফাইল রিড করতে সমস্যা হয়েছে।');
    }
  };

  const handleConnectAndSavePlugin = async (targetPlugin: PluginRecord, activateAfterVerify = false) => {
    const sfVisible = draftStorefrontZones.some((z) => z !== 'admin_only');

    // 1. Install / Connect with selected permissions & placement
    const installRes = await installPlugin({
      pluginId: targetPlugin.pluginId,
      installSource: 'api_sdk',
      autoActivate: false,
      externalApiUrl: draftBackendUrl,
      apiSecretKey: activeApiKeyString,
      integrationMode: draftIntegrationMode,
      grantedPermissions: draftPermissions,
      storefrontVisible: sfVisible,
      storefrontZones: draftStorefrontZones,
      adminTargetSlot: draftAdminSlot,
    });

    // 2. Save permissions & placement explicitly
    await savePluginPermissions(
      targetPlugin.pluginId,
      draftPermissions,
      ['super_admin', 'admin', 'manager'],
      true,
      sfVisible,
      draftStorefrontZones,
      draftAdminSlot
    );

    // 3. Save settings
    await savePluginSettings(
      targetPlugin.pluginId,
      { backendUrl: draftBackendUrl, apiSecretKey: activeApiKeyString },
      draftBackendUrl,
      activeApiKeyString,
      draftIntegrationMode,
      'production'
    );

    if (activateAfterVerify) {
      const verifyRes = await verifyPluginConnection(targetPlugin.pluginId, activeApiKeyString);
      if (verifyRes.sdkPayload) setLiveSdkResponse(verifyRes.sdkPayload);
      if (verifyRes.success) {
        const actRes = await activatePlugin(targetPlugin.pluginId);
        showFeedback(actRes.success ? 'success' : 'error', actRes.message);
        return;
      } else {
        showFeedback('error', verifyRes.message);
        return;
      }
    }

    showFeedback(installRes.success ? 'success' : 'error', installRes.message);
  };

  const subMenuTabs: {
    id: PluginManagerSubTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    {
      id: 'installed',
      label: 'Installed Plugins',
      icon: Puzzle,
      badge: installedPluginsList.length,
    },
    {
      id: 'add-new',
      label: 'Integrations & SDK',
      icon: Code2,
    },
    {
      id: 'store',
      label: 'Plugin Templates',
      icon: Store,
      badge: unusedInstalledPlugins.length > 0 ? unusedInstalledPlugins.length : undefined,
    },
    {
      id: 'upload',
      label: 'Upload ZIP',
      icon: Upload,
    },
    {
      id: 'settings',
      label: 'Permissions & Settings',
      icon: Sliders,
    },
    {
      id: 'updates',
      label: 'Updates',
      icon: RefreshCw,
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      icon: History,
    },
  ];

  // Reusable Permissions & Website Placement Matrix Component
  const renderPermissionsAndPlacementCard = (plugin: PluginRecord) => {
    const requestedScopes = plugin.manifest.permissions || ['Read Products'];
    const deniedScopes = PERMISSION_SCOPE_DETAILS.map((d) => d.scope).filter(
      (s) => !draftPermissions.includes(s)
    );
    const selectedSlotMeta =
      EXTENSION_SLOT_OPTIONS.find((s) => s.slot === draftAdminSlot) || EXTENSION_SLOT_OPTIONS[0];
    const isPublicOnWebsite = draftStorefrontZones.some((z) => z !== 'admin_only');

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              {renderPluginIcon(plugin.iconName, 'w-5 h-5')}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {plugin.name} — পারমিশন ও ওয়েবসাইট লোকেশন কন্ট্রোল
              </h3>
              <span className="text-xs font-mono text-slate-500">ID: {plugin.pluginId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDraftPermissions([...requestedScopes])}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              প্লাগইনের চাওয়া সব পারমিশন দিন
            </button>
            <button
              type="button"
              onClick={() => setDraftPermissions([])}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
            >
              সব আনচেক করুন
            </button>
          </div>
        </div>

        {/* 1. CHECKBOX PERMISSIONS MATRIX */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              ১. প্লাগইন পারমিশন চেকবক্স (প্লাগইন কী চাচ্ছে এবং আপনি কী দিচ্ছেন)
            </h4>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              অনুমতি দেওয়া হয়েছে: {draftPermissions.length}টি / ব্লক করা হয়েছে: {deniedScopes.length}টি
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {PERMISSION_SCOPE_DETAILS.map(({ scope, labelBn }) => {
              const isChecked = draftPermissions.includes(scope);
              const isRequestedByPlugin = requestedScopes.includes(scope);

              return (
                <label
                  key={scope}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-500/70'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermissionCheckbox(scope)}
                      className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {scope}
                        </span>
                        {isRequestedByPlugin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            প্লাগইন চেয়েছে (Requested)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {labelBn}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isChecked
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isChecked ? 'দেওয়া হয়েছে' : 'দেওয়া হয়নি'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 2. ALLOWED VS RESTRICTED SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <Unlock className="w-4 h-4 shrink-0" />
              <span>প্লাগইনটি আপনার কাছ থেকে যে পারমিশনগুলো পাচ্ছে ({draftPermissions.length})</span>
            </div>
            {draftPermissions.length === 0 ? (
              <p className="text-xs text-slate-500">কোনো পারমিশন দেওয়া হয়নি।</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {draftPermissions.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 space-y-2">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs">
              <Lock className="w-4 h-4 shrink-0" />
              <span>প্লাগইনটি যা করতে পারবে না / ব্লক করা আছে ({deniedScopes.length})</span>
            </div>
            {deniedScopes.length === 0 ? (
              <p className="text-xs text-slate-500">সব পারমিশন অনুমোদিত আছে।</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {deniedScopes.map((perm) => (
                  <span
                    key={perm}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <X className="w-3 h-3 text-red-500" />
                    {perm}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. WEBSITE & ADMIN PLACEMENT / VISIBILITY */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            ২. ওয়েবসাইটের কোন জায়গায় থাকবে এবং ওয়েবসাইট থেকে কিছু দেখা যাবে কি না
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Admin Menu Location */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                অ্যাডমিন ড্যাশবোর্ডের কোন মেনুতে যুক্ত থাকবে:
              </label>
              <select
                value={draftAdminSlot}
                onChange={(e) => setDraftAdminSlot(e.target.value as PluginExtensionSlot)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
              >
                {EXTENSION_SLOT_OPTIONS.map((opt) => (
                  <option key={opt.slot} value={opt.slot}>
                    {opt.label} ({opt.targetGroup})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                অ্যাক্টিভ করলে প্লাগইনটি অ্যাডমিনের <strong>{selectedSlotMeta.labelBn}</strong>-তে কাজ করবে।
              </p>
            </div>

            {/* Live Visibility Summary */}
            <div
              className={`p-4 rounded-xl border space-y-1.5 ${
                isPublicOnWebsite
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                {isPublicOnWebsite ? (
                  <>
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>পাবলিক ওয়েবসাইটে দেখা যাবে (Visible on Storefront)</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-slate-600" />
                    <span>পাবলিক ওয়েবসাইটে কিছুই দেখা যাবে না (Admin Only)</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isPublicOnWebsite
                  ? 'এই প্লাগইনটি আপনার মূল ওয়েবসাইটের নিচের টিক দেওয়া জায়গাগুলোতে কাস্টমারদের সামনে কাজ করবে।'
                  : 'এই প্লাগইনটি থেকে মূল ওয়েবসাইটে কাস্টমাররা কিছুই দেখতে পাবে না। এটি শুধুমাত্র অ্যাডমিন প্যানেলে ব্যাকএন্ড টুল হিসেবে কাজ করবে।'}
              </p>
            </div>
          </div>

          {/* Checkboxes for Storefront Visibility Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {STOREFRONT_ZONE_OPTIONS.map((item) => {
              const checked = draftStorefrontZones.includes(item.zone);
              return (
                <label
                  key={item.zone}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    checked
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStorefrontZone(item.zone)}
                    className="mt-0.5 w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {item.descBn}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Save & Connect Action Bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleConnectAndSavePlugin(plugin, false)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
          >
            Save Permissions &amp; Placement
          </button>
          <button
            type="button"
            onClick={() => handleConnectAndSavePlugin(plugin, true)}
            className="px-5 py-2.5 rounded-xl bg-[#8B0000] hover:bg-red-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Connect, Verify &amp; Activate {plugin.name}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-emerald-500/40'
              : 'bg-red-950 text-red-100 border-red-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Clean Header & Responsive Submenu Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B0000] text-white flex items-center justify-center shrink-0">
              <Puzzle className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Plugins &amp; SDK Integrations
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {activeInstalledCount} Active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('upload')}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ZIP</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('add-new')}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Integrations &amp; SDK</span>
            </button>
          </div>
        </div>

        {/* Submenu Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {subMenuTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-[#8B0000] text-white border-[#8B0000]'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plugin Ecosystem Analytics */}
      <CollapsibleAnalyticsPanel
        title={`Plugin Ecosystem Analytics (${pluginAnalytics.totalPlugins} Available • ${activeInstalledCount} Active • ${pluginAnalytics.logsCount} Events)`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SaasDonutChart
            title="Plugin Lifecycle Mix"
            subtitle="Click a status slice to jump to Installed Plugins or Store"
            data={pluginAnalytics.lifecycleSlices}
            centerLabel="Ecosystem"
            emptyText="No plugins registered"
            onSelectSlice={(slice) => {
              if (slice.id === 'store') setActiveSubTab('store');
              else setActiveSubTab('installed');
            }}
          />
          <SaasBarChart
            title="Plugins by Category"
            subtitle="Catalog count vs Active extensions per category"
            data={pluginAnalytics.categoryBars}
            primaryLabel="Total Plugins"
            secondaryLabel="Active"
            barColor="#4F46E5"
            secondaryColor="#059669"
            emptyText="No plugin categories available"
            onSelectBar={() => setActiveSubTab('store')}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* =====================================================================
          1. INSTALLED PLUGINS (Shows all plugins connected/installed by user)
      ===================================================================== */}
      {activeSubTab === 'installed' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Installed &amp; Connected Plugins ({installedPluginsList.length})
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {activeInstalledCount} Active
            </span>
          </div>

          {installedPluginsList.length === 0 ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Puzzle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                এখনো কোনো প্লাগইন কানেক্ট বা ইনস্টল করা হয়নি
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('add-new')}
                  className="px-4 py-2 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-4 h-4" />
                  <span>Connect via Integrations &amp; SDK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('store')}
                  className="px-4 py-2 rounded-xl bg-[#8B0000] hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Store className="w-4 h-4" />
                  <span>Browse Plugin Templates</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('upload')}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Upload ZIP Package
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {installedPluginsList.map(({ plugin, installation }) => {
                const isVerified = Boolean(installation.connectionVerified);
                const isActive = installation.status === 'active' && isVerified;
                const isBusy = actionLoadingId === plugin.pluginId;
                const permRec = getPluginPermissions(plugin.pluginId);
                const grantedCount =
                  permRec?.grantedPermissions?.length ?? plugin.manifest.permissions.length;
                const isPublicStorefront = Boolean(
                  permRec?.storefrontVisible ?? plugin.manifest.storefrontVisible
                );
                const targetSlot =
                  permRec?.adminTargetSlot || plugin.manifest.extensionSlots[0];
                const slotMeta = EXTENSION_SLOT_OPTIONS.find((s) => s.slot === targetSlot);

                return (
                  <div
                    key={plugin.pluginId}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        {renderPluginIcon(plugin.iconName, 'w-5 h-5')}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {plugin.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                            v{installation.installedVersion}
                          </span>

                          {isActive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Active
                            </span>
                          ) : isVerified ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                              Verified • Saved in Templates
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Verify Required
                            </span>
                          )}
                        </div>

                        {/* Permissions & Placement Metadata Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            Permissions: {grantedCount} Allowed
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            Menu: {slotMeta?.label || 'Admin Panel'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                              isPublicStorefront
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isPublicStorefront ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>ওয়েবসাইটে দেখা যাবে</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>শুধু অ্যাডমিনে থাকবে</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSettingsPluginId(plugin.pluginId);
                          setActiveSubTab('settings');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Permissions &amp; Config</span>
                      </button>

                      {!isVerified && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            const res = await verifyPluginConnection(
                              plugin.pluginId,
                              activeApiKeyString
                            );
                            showFeedback(res.success ? 'success' : 'error', res.message);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          <span>Verify SDK</span>
                        </button>
                      )}

                      {isActive ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            const res = await deactivatePlugin(plugin.pluginId);
                            showFeedback(res.success ? 'success' : 'error', res.message);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy || !isVerified}
                          onClick={async () => {
                            const res = await activatePlugin(plugin.pluginId);
                            showFeedback(res.success ? 'success' : 'error', res.message);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                            isVerified
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </button>
                      )}

                      {isActive && slotMeta && onSelectAdminTab && (
                        <button
                          type="button"
                          onClick={() => onSelectAdminTab(slotMeta.targetTab)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setUninstallModalPlugin(plugin)}
                        className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                        title="Remove Plugin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          2. INTEGRATIONS & SDK (Matches Screenshot 11 + Permissions & Placement)
      ===================================================================== */}
      {activeSubTab === 'add-new' && (
        <div className="space-y-6">
          {/* Top Bar matching Screenshot 11 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Integrations &amp; SDK
            </h2>

            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSdkTopMode('custom_sdk')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  sdkTopMode === 'custom_sdk'
                    ? 'bg-[#2E1A68] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Custom Websites &amp; SDK
              </button>
              <button
                type="button"
                onClick={() => setSdkTopMode('plugin_zip')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  sdkTopMode === 'plugin_zip'
                    ? 'bg-[#2E1A68] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                WordPress / Custom Plugin
              </button>
              <button
                type="button"
                onClick={() => setSdkTopMode('rest_docs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  sdkTopMode === 'rest_docs'
                    ? 'bg-[#2E1A68] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                REST API Docs
              </button>
            </div>
          </div>

          {sdkTopMode === 'custom_sdk' && (
            <>
              {/* 2-Column Layout from Screenshot 11 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT CARD: API Keys & Origin Allowlist */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                    <Key className="w-4 h-4 text-[#2E1A68] dark:text-indigo-400" />
                    <h3>API Keys &amp; Origin Allowlist</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Key Label
                      </label>
                      <input
                        type="text"
                        value={keyLabelInput}
                        onChange={(e) => setKeyLabelInput(e.target.value)}
                        placeholder="Production React Storefront"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E1A68]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Allowed Origins (comma-separated or *)
                      </label>
                      <input
                        type="text"
                        value={allowedOriginsInput}
                        onChange={(e) => setAllowedOriginsInput(e.target.value)}
                        placeholder="*"
                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E1A68]"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={actionLoadingId === 'api-key-gen'}
                      onClick={async () => {
                        const res = await generateApiKey({
                          pluginId: selectedSdkPluginId || '*',
                          label: keyLabelInput,
                          allowedOrigins: allowedOriginsInput,
                        });
                        if (res.newKey) {
                          setTestSdkKeyInput(res.newKey.secretKey);
                        }
                        showFeedback(res.success ? 'success' : 'error', res.message);
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate New API Key</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <span className="text-xs font-semibold text-slate-500 block">
                      Active Keys ({(state.apiKeys || []).length})
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(state.apiKeys || []).map((k) => (
                        <div
                          key={k.id}
                          onClick={() => setTestSdkKeyInput(k.secretKey)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            testSdkKeyInput === k.secretKey
                              ? 'border-[#2E1A68] bg-indigo-50/40 dark:bg-indigo-950/30'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {k.label}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                              {k.keyPrefix} • Origins: {k.allowedOrigins}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(k.secretKey);
                                showFeedback('success', 'API Key কপি করা হয়েছে!');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              title="Copy Full API Key"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {(state.apiKeys || []).length > 1 && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const res = await deleteApiKey(k.id);
                                  showFeedback(res.success ? 'success' : 'error', res.message);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                title="Delete Key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT CARD: Embed Script, JS SDK & React Package + Live Test */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                    <Code2 className="w-4 h-4 text-[#2E1A68] dark:text-indigo-400" />
                    <h3>Embed Script, JS SDK &amp; React Package</h3>
                  </div>

                  {/* Select Target Plugin */}
                  <div>
                    <select
                      value={selectedSdkPluginId}
                      onChange={(e) => setSelectedSdkPluginId(e.target.value)}
                      className="w-full sm:w-72 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#2E1A68]"
                    >
                      {state.plugins.map((p) => (
                        <option key={p.pluginId} value={p.pluginId}>
                          {p.name} (v{p.version})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4 Code Format Tabs */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-x-auto">
                    {(
                      [
                        { id: 'html', label: 'HTML Embed Script' },
                        { id: 'js', label: 'JavaScript SDK' },
                        { id: 'react', label: 'React Component' },
                        { id: 'curl', label: 'REST cURL' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCodeSnippetTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                          codeSnippetTab === t.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Dark Code Snippet Viewer */}
                  <div className="relative rounded-xl bg-[#0B0F19] text-slate-100 p-4 font-mono text-xs overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedSnippet);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                    <pre className="pr-16 leading-relaxed">{generatedSnippet}</pre>
                  </div>

                  {/* 3 Download Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadSdkFile('embed')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Embed JS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSdkFile('sdk')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JS SDK</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSdkFile('react')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download React TSX</span>
                    </button>
                  </div>

                  {/* Verify Live Authenticated SDK Fetch */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Verify Live Authenticated SDK Fetch
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={testSdkKeyInput}
                        onChange={(e) => setTestSdkKeyInput(e.target.value)}
                        placeholder="flw_live_demo_universal_key_2026"
                        className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        disabled={actionLoadingId === selectedSdkPluginId}
                        onClick={async () => {
                          if (!currentSdkPlugin) return;
                          const res = await verifyPluginConnection(
                            currentSdkPlugin.pluginId,
                            testSdkKeyInput
                          );
                          if (res.sdkPayload) {
                            setLiveSdkResponse(res.sdkPayload);
                          }
                          showFeedback(res.success ? 'success' : 'error', res.message);
                        }}
                        className="px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Test SDK API</span>
                      </button>
                    </div>

                    {liveSdkResponse && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48">
                        <pre>{JSON.stringify(liveSdkResponse, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Below the 2-Column SDK Cards: Interactive Permissions & Website Placement for Selected Plugin */}
              {currentSdkPlugin && renderPermissionsAndPlacementCard(currentSdkPlugin)}
            </>
          )}

          {sdkTopMode === 'plugin_zip' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Register New Custom Plugin or External Service
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plugin Name *
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Custom Courier Pro"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plugin ID
                  </label>
                  <input
                    type="text"
                    value={customPluginId}
                    onChange={(e) => setCustomPluginId(e.target.value)}
                    placeholder="knx.custom.courier"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Plugin Backend / App URL
                  </label>
                  <input
                    type="url"
                    value={customBackendUrl}
                    onChange={(e) => setCustomBackendUrl(e.target.value)}
                    placeholder="https://your-plugin-app.run.app"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    if (!customName.trim()) {
                      showFeedback('error', 'প্লাগইনের নাম দিন।');
                      return;
                    }
                    const pid =
                      customPluginId.trim() ||
                      `knx.${customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '.')}`;
                    const slotMeta =
                      EXTENSION_SLOT_OPTIONS.find((s) => s.slot === draftAdminSlot) ||
                      EXTENSION_SLOT_OPTIONS[0];

                    const customManifest: PluginManifest = {
                      manifestVersion: '1.0',
                      pluginId: pid,
                      name: customName.trim(),
                      subtitle: slotMeta.label,
                      version: '1.0.0',
                      author: 'Custom Developer',
                      authorVerified: true,
                      description: customName.trim(),
                      category: 'Website Builder',
                      iconName: 'Puzzle',
                      accentColor: '#4f46e5',
                      compatibility: {
                        minCoreVersion: '2.0.0',
                        maxCoreVersion: '3.9.9',
                        runtimeMode: 'external_microservice',
                      },
                      digitalSignature: {
                        algorithm: 'SHA-256',
                        hash: `sha256_${Date.now()}_verified`,
                        publisherKeyId: 'KNX-CUSTOM',
                        verified: true,
                      },
                      dependencies: [],
                      permissions: draftPermissions,
                      extensionSlots: [draftAdminSlot],
                      storefrontVisible: draftStorefrontZones.some((z) => z !== 'admin_only'),
                      storefrontZones: draftStorefrontZones,
                      sidebarNavigation: {
                        menuId: `plugin-${pid}`,
                        label: customName.trim(),
                        labelBn: customName.trim(),
                        targetGroup: slotMeta.targetGroup,
                        targetTab: slotMeta.targetTab,
                        iconName: 'Puzzle',
                      },
                      configurationSchema: [],
                      apiIntegration: {
                        webhookEvents: ['order.created', 'product.updated'],
                        externalEndpointUrl: customBackendUrl.trim(),
                        sdkVersion: '1.0.0',
                        integrationMode: 'embedded_app',
                      },
                      releaseDate: new Date().toISOString().split('T')[0],
                    };

                    const res = await installPlugin({
                      customManifest,
                      installSource: 'api_sdk',
                      externalApiUrl: customBackendUrl.trim(),
                      apiSecretKey: activeApiKeyString,
                      grantedPermissions: draftPermissions,
                      storefrontVisible: draftStorefrontZones.some((z) => z !== 'admin_only'),
                      storefrontZones: draftStorefrontZones,
                      adminTargetSlot: draftAdminSlot,
                    });
                    showFeedback(res.success ? 'success' : 'error', res.message);
                    if (res.success) {
                      setSelectedSdkPluginId(pid);
                      setSdkTopMode('custom_sdk');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold cursor-pointer"
                >
                  Register &amp; Open in SDK Configurator
                </button>
              </div>
            </div>
          )}

          {sdkTopMode === 'rest_docs' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                KenaX BD Universal Plugin Bridge REST API
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                  GET {window.location.origin}/api/plugins/bridge/:pluginId/data
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                  Header: Authorization: Bearer {activeApiKeyString}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          3. PLUGIN TEMPLATES (Saved Unused Installed Plugins + Default Templates)
      ===================================================================== */}
      {activeSubTab === 'store' && (
        <div className="space-y-6">
          {/* Section A: Installed plugins that are currently NOT active (Unused / Saved) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                আপনার ইনস্টল করা কিন্তু বর্তমানে অব্যবহৃত প্লাগইন (Saved / Currently Unused)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {unusedInstalledPlugins.length} Saved
              </span>
            </div>

            {unusedInstalledPlugins.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                বর্তমানে কোনো অব্যবহৃত (Inactive) ইনস্টল করা প্লাগইন নেই। কোনো প্লাগইন ইনস্টল করে ডিঅ্যাক্টিভ রাখলে সেটি এখানে জমা থাকবে।
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unusedInstalledPlugins.map(({ plugin, installation }) => {
                  const isVerified = Boolean(installation.connectionVerified);
                  const isBusy = actionLoadingId === plugin.pluginId;
                  return (
                    <div
                      key={plugin.pluginId}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            {renderPluginIcon(plugin.iconName, 'w-5 h-5')}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {plugin.name}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-500">
                              v{installation.installedVersion} • Currently Unused
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-amber-200/60 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSdkPluginId(plugin.pluginId);
                            setActiveSubTab('add-new');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Configure &amp; Permissions
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            if (!isVerified) {
                              await verifyPluginConnection(plugin.pluginId, activeApiKeyString);
                            }
                            const res = await activatePlugin(plugin.pluginId);
                            showFeedback(res.success ? 'success' : 'error', res.message);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Use Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Default Ready Templates (kept as requested for future updates) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                ডিফল্ট প্লাগইন টেমপ্লেট (Default Ready Plugins)
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {state.plugins.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.plugins.map((plugin) => {
                const inst = getInstallation(plugin.pluginId);
                const isInstalled = Boolean(inst);
                const isVerified = Boolean(inst?.connectionVerified);
                const isActive = inst?.status === 'active' && isVerified;

                return (
                  <div
                    key={plugin.pluginId}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                            {renderPluginIcon(plugin.iconName, 'w-5 h-5')}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {plugin.name}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">
                              v{plugin.version}
                            </span>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : isInstalled ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Installed (Unused)
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {plugin.manifest.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {plugin.manifest.storefrontVisible
                          ? 'ওয়েবসাইটে দেখা যাবে'
                          : 'শুধু অ্যাডমিন প্যানেলে'}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSdkPluginId(plugin.pluginId);
                          setActiveSubTab('add-new');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#2E1A68] hover:bg-indigo-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{isInstalled ? 'SDK & Permissions' : 'Connect & Setup'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. UPLOAD PLUGIN (.knxplugin.zip / plugin.json)
      ===================================================================== */}
      {activeSubTab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3.5">
                Upload Plugin Package (.knxplugin.zip / plugin.json)
              </h2>

              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#8B0000] rounded-2xl p-6 text-center block cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  type="file"
                  accept=".zip,.json"
                  onChange={handlePackageFileSelect}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-[#8B0000]">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">
                  {uploadedFileName || 'Click to select .knxplugin.zip or plugin.json file'}
                </p>
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    plugin.json Manifest
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!manifestJsonInput.trim()) return;
                      setIsValidating(true);
                      try {
                        const parsed = JSON.parse(manifestJsonInput);
                        const report = await validatePackage(parsed, uploadedFileName);
                        setValidationReport(report);
                        if (report?.manifest?.permissions) {
                          setDraftPermissions(report.manifest.permissions);
                        }
                      } catch (err: any) {
                        showFeedback('error', `Invalid JSON: ${err.message}`);
                      } finally {
                        setIsValidating(false);
                      }
                    }}
                    disabled={isValidating || !manifestJsonInput.trim()}
                    className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isValidating ? 'Checking...' : 'Validate Manifest'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={manifestJsonInput}
                  onChange={(e) => setManifestJsonInput(e.target.value)}
                  placeholder='{"pluginId": "knx.my.plugin", "name": "My Plugin", "version": "1.0.0", "permissions": ["Read Products", "Read Orders"]}'
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  Package Inspection &amp; Requested Permissions
                </h3>

                {!validationReport ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    প্যাকেজ ফাইল আপলোড করলে প্লাগইনটি কী কী পারমিশন চাচ্ছে তা এখানে দেখা যাবে।
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div
                      className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${
                        validationReport.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      {validationReport.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span>
                        {validationReport.valid
                          ? `${validationReport.manifest?.name} (v${validationReport.manifest?.version})`
                          : 'Validation Failed'}
                      </span>
                    </div>

                    {validationReport.manifest && (
                      <div className="space-y-2 pt-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          প্লাগইনটির চাওয়া পারমিশন (চেকবক্স দিয়ে কন্ট্রোল করুন):
                        </span>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {PERMISSION_SCOPE_DETAILS.map(({ scope, labelBn }) => {
                            const checked = draftPermissions.includes(scope);
                            const requested =
                              validationReport.manifest?.permissions.includes(scope);
                            return (
                              <label
                                key={scope}
                                className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer ${
                                  checked
                                    ? 'bg-emerald-50/70 border-emerald-400'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermissionCheckbox(scope)}
                                    className="accent-emerald-600"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900">{scope}</span>
                                    <span className="block text-[10px] text-slate-500">
                                      {labelBn}
                                    </span>
                                  </div>
                                </div>
                                {requested && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                                    Requested
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!validationReport?.valid || !validationReport.manifest}
                onClick={async () => {
                  if (!validationReport?.manifest) return;
                  const res = await installPlugin({
                    customManifest: validationReport.manifest,
                    installSource: 'zip_upload',
                    packageFileName:
                      uploadedFileName || `${validationReport.manifest.pluginId}.knxplugin.zip`,
                    grantedPermissions: draftPermissions,
                    storefrontVisible: draftStorefrontZones.some((z) => z !== 'admin_only'),
                    storefrontZones: draftStorefrontZones,
                    adminTargetSlot: draftAdminSlot,
                  });
                  showFeedback(res.success ? 'success' : 'error', res.message);
                  if (res.success) {
                    setSelectedSdkPluginId(validationReport.manifest.pluginId);
                    setActiveSubTab('add-new');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#8B0000] hover:bg-red-800 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                Install Package with Selected Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. PERMISSIONS & SETTINGS TAB
      ===================================================================== */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-1.5">
            <h3 className="text-xs font-bold uppercase text-slate-400 px-2 pb-1">
              Select Plugin
            </h3>
            {state.plugins.map((plugin) => {
              const inst = getInstallation(plugin.pluginId);
              const isSelected = plugin.pluginId === selectedSettingsPluginId;
              const isVerified = Boolean(inst?.connectionVerified);
              const isActive = inst?.status === 'active' && isVerified;

              return (
                <button
                  key={plugin.pluginId}
                  type="button"
                  onClick={() => setSelectedSettingsPluginId(plugin.pluginId)}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-red-50/80 dark:bg-red-950/40 border-[#8B0000] text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                      {renderPluginIcon(plugin.iconName, 'w-4 h-4')}
                    </div>
                    <span className="text-xs font-bold truncate">{plugin.name}</span>
                  </div>

                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  ) : inst ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Installed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      Template
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 space-y-5">
            {(() => {
              const plugin =
                state.plugins.find((p) => p.pluginId === selectedSettingsPluginId) ||
                state.plugins[0];
              if (!plugin) return null;
              return renderPermissionsAndPlacementCard(plugin);
            })()}
          </div>
        </div>
      )}

      {/* =====================================================================
          6. UPDATES TAB
      ===================================================================== */}
      {activeSubTab === 'updates' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Plugin Updates &amp; Version Rollback
            </h3>
          </div>

          {installedPluginsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No installed plugins to update or roll back.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {installedPluginsList.map(({ plugin, installation }) => {
                const versions = state.versions.filter((v) => v.pluginId === plugin.pluginId);
                const hasNewer = plugin.latestAvailableVersion !== installation.installedVersion;
                const isBusy = actionLoadingId === plugin.pluginId;

                return (
                  <div
                    key={plugin.pluginId}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                        {renderPluginIcon(plugin.iconName, 'w-4 h-4')}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {plugin.name}
                        </h4>
                        <span className="text-xs font-mono text-slate-500">
                          Current: v{installation.installedVersion}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {hasNewer && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={async () => {
                            const res = await updatePlugin(plugin.pluginId);
                            showFeedback(res.success ? 'success' : 'error', res.message);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#8B0000] text-white text-xs font-bold cursor-pointer"
                        >
                          Update to v{plugin.latestAvailableVersion}
                        </button>
                      )}
                      {versions
                        .filter((v) => v.version !== installation.installedVersion)
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={isBusy}
                            onClick={async () => {
                              const res = await rollbackPlugin(plugin.pluginId, v.version);
                              showFeedback(res.success ? 'success' : 'error', res.message);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Rollback v{v.version}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          7. ACTIVITY LOGS TAB
      ===================================================================== */}
      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Plugin Activity Logs
            </h3>
          </div>

          {state.activityLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No plugin activity yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-3">Plugin</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {state.activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {log.pluginName}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Uninstall Confirmation Modal */}
      {uninstallModalPlugin && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Remove {uninstallModalPlugin.name}?
              </h3>
              <button
                type="button"
                onClick={() => setUninstallModalPlugin(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUninstallModalPlugin(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = uninstallModalPlugin;
                  setUninstallModalPlugin(null);
                  const res = await uninstallPlugin(target.pluginId, true);
                  showFeedback(res.success ? 'success' : 'error', res.message);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlugins;
