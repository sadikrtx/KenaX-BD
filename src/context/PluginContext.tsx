import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  FullPluginSystemState,
  PluginRecord,
  PluginInstallationRecord,
  PluginPermissionRecord,
  PluginSettingsRecord,
  PluginExtensionSlot,
  PluginInstallSource,
  PluginManifest,
  PluginPermissionScope,
  PluginStorefrontZone,
  PluginPackageValidationResult,
  PluginApiKeyRecord,
} from '../types/pluginTypes';
import type { UserRole } from '../types';

interface PluginContextValue {
  state: FullPluginSystemState;
  loading: boolean;
  actionLoadingId: string | null;
  refreshState: () => Promise<void>;
  isPluginInstalled: (pluginId: string) => boolean;
  isPluginActive: (pluginId: string) => boolean;
  getInstallation: (pluginId: string) => PluginInstallationRecord | undefined;
  getPluginSettings: (pluginId: string) => PluginSettingsRecord | undefined;
  getPluginPermissions: (pluginId: string) => PluginPermissionRecord | undefined;
  getActivePluginsForSlot: (slot: PluginExtensionSlot, userRole?: UserRole) => PluginRecord[];
  installPlugin: (params: {
    pluginId?: string;
    customManifest?: PluginManifest;
    installSource?: PluginInstallSource;
    autoActivate?: boolean;
    packageFileName?: string;
    externalApiUrl?: string;
    apiSecretKey?: string;
    integrationMode?: 'embedded_app' | 'rest_webhook';
    grantedPermissions?: PluginPermissionScope[];
    storefrontVisible?: boolean;
    storefrontZones?: PluginStorefrontZone[];
    adminTargetSlot?: PluginExtensionSlot;
  }) => Promise<{ success: boolean; message: string }>;
  generateApiKey: (params: {
    pluginId?: string;
    label: string;
    allowedOrigins: string;
  }) => Promise<{ success: boolean; message: string; newKey?: PluginApiKeyRecord }>;
  deleteApiKey: (keyId: string) => Promise<{ success: boolean; message: string }>;
  verifyPluginConnection: (
    pluginId: string,
    providedSdkKey?: string
  ) => Promise<{ success: boolean; message: string; sdkPayload?: Record<string, any> }>;
  activatePlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
  deactivatePlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
  updatePlugin: (pluginId: string) => Promise<{ success: boolean; message: string }>;
  rollbackPlugin: (
    pluginId: string,
    targetVersion?: string
  ) => Promise<{ success: boolean; message: string }>;
  uninstallPlugin: (
    pluginId: string,
    purgeData: boolean
  ) => Promise<{ success: boolean; message: string }>;
  savePluginSettings: (
    pluginId: string,
    configValues: Record<string, any>,
    externalApiUrl?: string,
    apiSecretKey?: string,
    integrationMode?: 'embedded_app' | 'rest_webhook',
    environment?: 'production' | 'sandbox'
  ) => Promise<{ success: boolean; message: string }>;
  savePluginPermissions: (
    pluginId: string,
    grantedPermissions: PluginPermissionScope[],
    allowedRoles: UserRole[],
    requireSuperAdminForSettings: boolean,
    storefrontVisible?: boolean,
    storefrontZones?: PluginStorefrontZone[],
    adminTargetSlot?: PluginExtensionSlot
  ) => Promise<{ success: boolean; message: string }>;
  validatePackage: (
    manifestPayload: any,
    fileName?: string
  ) => Promise<PluginPackageValidationResult | null>;
}

const DEFAULT_EMPTY_STATE: FullPluginSystemState = {
  corePlatformVersion: '3.4.0',
  plugins: [],
  versions: [],
  installations: [],
  permissions: [],
  settings: [],
  apiKeys: [],
  dependencies: [],
  updates: [],
  activityLogs: [],
};

const CACHE_KEY = 'kenax_plugins_v2_cache';

const PluginContext = createContext<PluginContextValue>({
  state: DEFAULT_EMPTY_STATE,
  loading: false,
  actionLoadingId: null,
  refreshState: async () => {},
  isPluginInstalled: () => false,
  isPluginActive: () => false,
  getInstallation: () => undefined,
  getPluginSettings: () => undefined,
  getPluginPermissions: () => undefined,
  getActivePluginsForSlot: () => [],
  installPlugin: async () => ({ success: false, message: '' }),
  generateApiKey: async () => ({ success: false, message: '' }),
  deleteApiKey: async () => ({ success: false, message: '' }),
  verifyPluginConnection: async () => ({ success: false, message: '' }),
  activatePlugin: async () => ({ success: false, message: '' }),
  deactivatePlugin: async () => ({ success: false, message: '' }),
  updatePlugin: async () => ({ success: false, message: '' }),
  rollbackPlugin: async () => ({ success: false, message: '' }),
  uninstallPlugin: async () => ({ success: false, message: '' }),
  savePluginSettings: async () => ({ success: false, message: '' }),
  savePluginPermissions: async () => ({ success: false, message: '' }),
  validatePackage: async () => null,
});

interface PluginProviderProps {
  children: React.ReactNode;
  actorName?: string;
  actorRole?: UserRole;
  onAuditLog?: (action: string, module: string, targetId: string, details: string) => void;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({
  children,
  actorName = 'Super Admin',
  actorRole = 'super_admin',
  onAuditLog,
}) => {
  const [state, setState] = useState<FullPluginSystemState>(() => {
    try {
      localStorage.removeItem('kenax_plugins_state_cache');
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.plugins)) return parsed;
      }
    } catch {}
    return DEFAULT_EMPTY_STATE;
  });
  const [loading, setLoading] = useState<boolean>(state.plugins.length === 0);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const persistState = useCallback((nextState: FullPluginSystemState) => {
    setState(nextState);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(nextState));
    } catch {}
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins/state');
      const data = await res.json();
      if (data?.success && data.state) {
        persistState(data.state);
      }
    } catch (err) {
      console.warn('[PluginContext] Failed to fetch plugin state:', err);
    } finally {
      setLoading(false);
    }
  }, [persistState]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const getInstallation = useCallback(
    (pluginId: string) => state.installations.find((i) => i.pluginId === pluginId),
    [state.installations]
  );

  const isPluginInstalled = useCallback(
    (pluginId: string) => state.installations.some((i) => i.pluginId === pluginId),
    [state.installations]
  );

  const isPluginActive = useCallback(
    (pluginId: string) =>
      state.installations.some(
        (i) => i.pluginId === pluginId && i.status === 'active' && Boolean(i.connectionVerified)
      ),
    [state.installations]
  );

  const getPluginSettings = useCallback(
    (pluginId: string) => state.settings.find((s) => s.pluginId === pluginId),
    [state.settings]
  );

  const getPluginPermissions = useCallback(
    (pluginId: string) => state.permissions.find((p) => p.pluginId === pluginId),
    [state.permissions]
  );

  const getActivePluginsForSlot = useCallback(
    (slot: PluginExtensionSlot, userRole: UserRole = actorRole): PluginRecord[] => {
      return state.plugins.filter((plugin) => {
        const inst = state.installations.find((i) => i.pluginId === plugin.pluginId);
        if (!inst || inst.status !== 'active' || !inst.connectionVerified) return false;
        const permRec = state.permissions.find((p) => p.pluginId === plugin.pluginId);
        const effectiveSlots = permRec?.adminTargetSlot
          ? [permRec.adminTargetSlot]
          : plugin.manifest?.extensionSlots || [];
        if (!effectiveSlots.includes(slot)) return false;

        if (userRole === 'super_admin') return true;
        if (permRec && Array.isArray(permRec.allowedRoles)) {
          return permRec.allowedRoles.includes(userRole);
        }
        return true;
      });
    },
    [state.plugins, state.installations, state.permissions, actorRole]
  );

  const installPlugin = async (params: {
    pluginId?: string;
    customManifest?: PluginManifest;
    installSource?: PluginInstallSource;
    autoActivate?: boolean;
    packageFileName?: string;
    externalApiUrl?: string;
    apiSecretKey?: string;
    integrationMode?: 'embedded_app' | 'rest_webhook';
    grantedPermissions?: PluginPermissionScope[];
    storefrontVisible?: boolean;
    storefrontZones?: PluginStorefrontZone[];
    adminTargetSlot?: PluginExtensionSlot;
  }) => {
    const targetId = params.pluginId || params.customManifest?.pluginId || 'install';
    setActionLoadingId(targetId);
    try {
      const res = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          autoActivate: false,
          actorName,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      if (data?.success && onAuditLog) {
        onAuditLog('Plugin Installed', 'plugins', targetId, data.message || `Installed ${targetId}`);
      }
      return { success: Boolean(data?.success), message: data?.message || 'Operation completed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to install plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const generateApiKey = async (params: {
    pluginId?: string;
    label: string;
    allowedOrigins: string;
  }) => {
    setActionLoadingId('api-key-gen');
    try {
      const res = await fetch('/api/plugins/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          actorName,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return {
        success: Boolean(data?.success),
        message: data?.message || 'API Key generated',
        newKey: data?.newKey,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to generate API Key' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    setActionLoadingId(keyId);
    try {
      const res = await fetch(`/api/plugins/api-keys/${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'API Key deleted' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to delete API Key' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const verifyPluginConnection = async (pluginId: string, providedSdkKey?: string) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, actorRole, providedSdkKey }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      if (data?.success && onAuditLog) {
        onAuditLog('Plugin Backend Verified', 'plugins', pluginId, data.message);
      }
      return {
        success: Boolean(data?.success),
        message: data?.message || 'Verification completed',
        sdkPayload: data?.sdkPayload,
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to verify backend connection' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const activatePlugin = async (pluginId: string) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      if (data?.success && onAuditLog) {
        onAuditLog('Plugin Activated', 'plugins', pluginId, data.message);
      }
      return { success: Boolean(data?.success), message: data?.message || 'Activated' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to activate plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const deactivatePlugin = async (pluginId: string) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      if (data?.success && onAuditLog) {
        onAuditLog('Plugin Deactivated', 'plugins', pluginId, data.message);
      }
      return { success: Boolean(data?.success), message: data?.message || 'Deactivated' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to deactivate plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const updatePlugin = async (pluginId: string) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'Updated' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to update plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const rollbackPlugin = async (pluginId: string, targetVersion?: string) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion, actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'Rolled back' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to roll back plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const uninstallPlugin = async (pluginId: string, purgeData: boolean) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/uninstall`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purgeData, actorName, actorRole }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'Uninstalled' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to uninstall plugin' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const savePluginSettings = async (
    pluginId: string,
    configValues: Record<string, any>,
    externalApiUrl?: string,
    apiSecretKey?: string,
    integrationMode?: 'embedded_app' | 'rest_webhook',
    environment: 'production' | 'sandbox' = 'production'
  ) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configValues,
          externalApiUrl,
          apiSecretKey,
          integrationMode,
          environment,
          actorName,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'Settings saved' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to save plugin settings' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const savePluginPermissions = async (
    pluginId: string,
    grantedPermissions: PluginPermissionScope[],
    allowedRoles: UserRole[],
    requireSuperAdminForSettings: boolean,
    storefrontVisible?: boolean,
    storefrontZones?: PluginStorefrontZone[],
    adminTargetSlot?: PluginExtensionSlot
  ) => {
    setActionLoadingId(pluginId);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantedPermissions,
          allowedRoles,
          requireSuperAdminForSettings,
          storefrontVisible,
          storefrontZones,
          adminTargetSlot,
          actorName,
          actorRole,
        }),
      });
      const data = await res.json();
      if (data?.state) persistState(data.state);
      return { success: Boolean(data?.success), message: data?.message || 'Permissions saved' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to save permissions' };
    } finally {
      setActionLoadingId(null);
    }
  };

  const validatePackage = async (
    manifestPayload: any,
    fileName?: string
  ): Promise<PluginPackageValidationResult | null> => {
    try {
      const res = await fetch('/api/plugins/validate-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestPayload, fileName }),
      });
      const data = await res.json();
      return data?.report || null;
    } catch {
      return null;
    }
  };

  return (
    <PluginContext.Provider
      value={{
        state,
        loading,
        actionLoadingId,
        refreshState,
        isPluginInstalled,
        isPluginActive,
        getInstallation,
        getPluginSettings,
        getPluginPermissions,
        getActivePluginsForSlot,
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
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => useContext(PluginContext);
