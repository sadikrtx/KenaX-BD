import type { UserRole } from './index.ts';

export type PluginPermissionScope =
  | 'Read Products'
  | 'Manage Products'
  | 'Read Orders'
  | 'Manage Orders'
  | 'Read Customers'
  | 'Read Reseller Data'
  | 'Manage Inventory'
  | 'Access Analytics'
  | 'Access Dashboard Widgets'
  | 'Access External APIs';

export type PluginStorefrontZone =
  | 'admin_only'
  | 'storefront_landing_pages'
  | 'storefront_product_page'
  | 'storefront_checkout'
  | 'storefront_floating_widget'
  | 'storefront_header_footer_script';

export type PluginExtensionSlot =
  | 'admin.sidebar.nav'
  | 'admin.dashboard.widget'
  | 'admin.orders.toolbar'
  | 'admin.orders.row_action'
  | 'admin.products.editor_panel'
  | 'admin.inventory.toolbar'
  | 'admin.reports.panel'
  | 'admin.seo.settings_panel'
  | 'admin.landing_pages.builder_panel'
  | 'admin.whatsapp.communication_panel'
  | 'storefront.product.badge'
  | 'storefront.checkout.widget'
  | 'seller.dashboard.widget'
  | 'reseller.dashboard.widget';

export type PluginInstallSource = 'store' | 'zip_upload' | 'api_sdk';

export type PluginLifecycleStatus =
  | 'not_installed'
  | 'installed'
  | 'active'
  | 'inactive'
  | 'update_available'
  | 'error';

export type PluginTargetSidebarGroup =
  | 'CORE'
  | 'SALES'
  | 'CATALOG'
  | 'MULTI VENDOR PARTNERS'
  | 'MARKETING & ADS'
  | 'SUPPLIERS & DEALERS'
  | 'CUSTOMERS'
  | 'LOGISTICS'
  | 'AUTOMATION'
  | 'STAFF & RBAC'
  | 'SYSTEM'
  | 'PLUGINS';

export interface PluginConfigFieldSchema {
  key: string;
  label: string;
  labelBn?: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'url';
  defaultValue: any;
  required?: boolean;
  secret?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: { label: string; value: string }[];
}

export interface PluginSidebarMenuRegistration {
  menuId: string;
  label: string;
  labelBn: string;
  targetGroup: PluginTargetSidebarGroup;
  targetTab: string;
  badge?: string;
  badgeColor?: string;
  iconName: string;
}

export interface PluginManifest {
  manifestVersion: '1.0';
  pluginId: string;
  name: string;
  nameBn?: string;
  subtitle: string;
  subtitleBn?: string;
  version: string;
  author: string;
  authorVerified?: boolean;
  description: string;
  descriptionBn?: string;
  category:
    | 'Website Builder'
    | 'Communication'
    | 'Analytics & BI'
    | 'SEO & Marketing'
    | 'Inventory & ERP'
    | 'Courier & Logistics'
    | 'Payments & Fintech'
    | 'Reseller & Multi-Vendor';
  iconName:
    | 'LayoutTemplate'
    | 'MessageCircle'
    | 'BarChart3'
    | 'Search'
    | 'Boxes'
    | 'Truck'
    | 'CreditCard'
    | 'Network'
    | 'Sparkles'
    | 'Puzzle';
  accentColor: string;
  compatibility: {
    minCoreVersion: string;
    maxCoreVersion: string;
    runtimeMode: 'sandboxed_sdk' | 'external_microservice';
  };
  digitalSignature: {
    algorithm: 'SHA-256';
    hash: string;
    publisherKeyId: string;
    verified: boolean;
  };
  dependencies: {
    pluginId: string;
    versionRange: string;
    optional?: boolean;
  }[];
  permissions: PluginPermissionScope[];
  extensionSlots: PluginExtensionSlot[];
  storefrontVisible?: boolean;
  storefrontZones?: PluginStorefrontZone[];
  sidebarNavigation?: PluginSidebarMenuRegistration;
  configurationSchema: PluginConfigFieldSchema[];
  apiIntegration?: {
    webhookEvents: string[];
    externalEndpointUrl?: string;
    sdkVersion: string;
    healthCheckPath?: string;
    integrationMode?: 'embedded_app' | 'rest_webhook';
  };
  screenshots?: string[];
  changelog?: string;
  sizeKb?: number;
  releaseDate: string;
}

export interface PluginRecord {
  id: string;
  pluginId: string;
  name: string;
  nameBn?: string;
  subtitle: string;
  subtitleBn?: string;
  version: string;
  latestAvailableVersion: string;
  author: string;
  authorVerified: boolean;
  description: string;
  descriptionBn?: string;
  category: PluginManifest['category'];
  iconName: PluginManifest['iconName'];
  accentColor: string;
  manifest: PluginManifest;
  isOfficialStorePlugin: boolean;
  rating: number;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PluginVersionRecord {
  id: string;
  pluginId: string;
  version: string;
  manifestSnapshot: PluginManifest;
  changelog: string;
  signatureHash: string;
  releasedAt: string;
  isStable: boolean;
}

export interface PluginInstallationRecord {
  id: string;
  pluginId: string;
  installedVersion: string;
  previousVersion?: string;
  status: 'active' | 'inactive';
  installSource: PluginInstallSource;
  installedBy: string;
  installedByRole: UserRole;
  installedAt: string;
  activatedAt?: string;
  deactivatedAt?: string;
  updatedAt: string;
  packageFileName?: string;
  signatureVerified: boolean;
  sandboxStatus: 'isolated_ready' | 'microservice_connected' | 'suspended' | 'unconfigured';
  connectionVerified?: boolean;
  lastVerifiedAt?: string;
  verificationStatusText?: string;
}

export interface PluginPermissionRecord {
  id: string;
  pluginId: string;
  requestedPermissions?: PluginPermissionScope[];
  grantedPermissions: PluginPermissionScope[];
  allowedRoles: UserRole[];
  requireSuperAdminForSettings: boolean;
  storefrontVisible?: boolean;
  storefrontZones?: PluginStorefrontZone[];
  adminTargetSlot?: PluginExtensionSlot;
  updatedBy: string;
  updatedAt: string;
}

export interface PluginApiKeyRecord {
  id: string;
  pluginId: string;
  label: string;
  keyPrefix: string;
  secretKey: string;
  allowedOrigins: string;
  createdAt: string;
  createdBy: string;
}

export interface PluginSettingsRecord {
  id: string;
  pluginId: string;
  configValues: Record<string, any>;
  externalApiUrl?: string;
  apiSecretKey?: string;
  integrationMode?: 'embedded_app' | 'rest_webhook';
  webhookSecretMasked?: string;
  hasSecretKeyConfigured?: boolean;
  environment: 'production' | 'sandbox';
  updatedBy: string;
  updatedAt: string;
}

export interface PluginDependencyRecord {
  id: string;
  pluginId: string;
  dependsOnPluginId: string;
  requiredVersionRange: string;
  isOptional: boolean;
  satisfied: boolean;
}

export interface PluginUpdateRecord {
  id: string;
  pluginId: string;
  currentVersion: string;
  newVersion: string;
  changelog: string;
  compatibilityVerified: boolean;
  signatureHash: string;
  publishedAt: string;
  status: 'available' | 'applied' | 'rolled_back';
}

export interface PluginActivityLogRecord {
  id: string;
  pluginId: string;
  pluginName: string;
  action:
    | 'INSTALLED'
    | 'ACTIVATED'
    | 'DEACTIVATED'
    | 'UPDATED'
    | 'ROLLED_BACK'
    | 'UNINSTALLED'
    | 'SETTINGS_UPDATED'
    | 'PERMISSIONS_UPDATED'
    | 'PACKAGE_VALIDATED'
    | 'API_CONNECTED'
    | 'BACKEND_VERIFIED'
    | 'BACKEND_FAILED'
    | 'API_KEY_CREATED'
    | 'API_KEY_DELETED';
  version: string;
  actorName: string;
  actorRole: UserRole;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface PluginPackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifest?: PluginManifest;
  signatureCheck: {
    verified: boolean;
    computedHash: string;
    publisher: string;
  };
  compatibilityCheck: {
    compatible: boolean;
    coreVersion: string;
    requiredRange: string;
  };
  dependencyCheck: {
    satisfied: boolean;
    missingDependencies: string[];
  };
  securityAudit: {
    noExecutableServerScripts: boolean;
    sandboxCompliant: boolean;
    requestedPermissions: PluginPermissionScope[];
  };
}

export interface FullPluginSystemState {
  corePlatformVersion: string;
  plugins: PluginRecord[];
  versions: PluginVersionRecord[];
  installations: PluginInstallationRecord[];
  permissions: PluginPermissionRecord[];
  settings: PluginSettingsRecord[];
  apiKeys?: PluginApiKeyRecord[];
  dependencies: PluginDependencyRecord[];
  updates: PluginUpdateRecord[];
  activityLogs: PluginActivityLogRecord[];
}
