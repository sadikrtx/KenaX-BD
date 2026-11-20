import React, { useState } from 'react';
import {
  Puzzle,
  CheckCircle2,
  Sliders,
  Maximize2,
  Minimize2,
  RefreshCw,
  Globe,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import { usePlugins } from '../../context/PluginContext';
import type { PluginExtensionSlot } from '../../types/pluginTypes';
import type { Product, Order, UserRole } from '../../types';

interface PluginSlotRendererProps {
  slot: PluginExtensionSlot;
  userRole?: UserRole;
  products?: Product[];
  orders?: Order[];
  onNavigateToPlugins?: (subTab?: string, pluginId?: string) => void;
}

export const PluginSlotRenderer: React.FC<PluginSlotRendererProps> = ({
  slot,
  userRole = 'super_admin',
  onNavigateToPlugins,
}) => {
  const {
    getActivePluginsForSlot,
    getPluginSettings,
    getPluginPermissions,
    verifyPluginConnection,
    actionLoadingId,
  } = usePlugins();
  const activePlugins = getActivePluginsForSlot(slot, userRole);

  const [expandedPluginId, setExpandedPluginId] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(1);

  if (activePlugins.length === 0) return null;

  return (
    <div className="space-y-4 my-4">
      {activePlugins.map((plugin) => {
        const setting = getPluginSettings(plugin.pluginId);
        const perm = getPluginPermissions(plugin.pluginId);
        const backendUrl = String(
          setting?.externalApiUrl || setting?.configValues?.backendUrl || ''
        ).trim();
        const mode =
          setting?.integrationMode ||
          plugin.manifest.apiIntegration?.integrationMode ||
          'embedded_app';
        const grantedPermissions =
          perm?.grantedPermissions || plugin.manifest.permissions || [];
        const isPublicOnWebsite = Boolean(
          perm?.storefrontVisible ?? plugin.manifest.storefrontVisible
        );

        const isExpanded = expandedPluginId === plugin.pluginId;
        const isVerifying = actionLoadingId === plugin.pluginId;

        return (
          <div
            key={plugin.pluginId}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
          >
            {/* Clean Connected Plugin Header Bar */}
            <div className="px-4 py-3 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <Puzzle className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-bold text-white truncate">{plugin.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    SDK Connected &amp; Active
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 flex items-center gap-1">
                    {isPublicOnWebsite ? (
                      <>
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>Storefront Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 text-slate-400" />
                        <span>Admin Only</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => {
                    verifyPluginConnection(plugin.pluginId);
                    setIframeKey((k) => k + 1);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                  title="Reload & Verify Connection"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                </button>

                {mode === 'embedded_app' && backendUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPluginId(isExpanded ? null : plugin.pluginId)
                    }
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                    title={isExpanded ? 'Collapse View' : 'Expand Workspace'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {onNavigateToPlugins && (
                  <button
                    type="button"
                    onClick={() => onNavigateToPlugins('settings', plugin.pluginId)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Permissions &amp; SDK</span>
                  </button>
                )}
              </div>
            </div>

            {/* Embedded Live Ready-Made Plugin Workspace or Connected SDK Bridge Bar */}
            {mode === 'embedded_app' && backendUrl ? (
              <div
                className={`w-full bg-slate-50 dark:bg-slate-950 ${
                  isExpanded ? 'h-[780px]' : 'h-[520px]'
                }`}
              >
                <iframe
                  key={iframeKey}
                  src={backendUrl}
                  title={plugin.name}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            ) : (
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Granted Permissions:
                  </span>
                  {grantedPermissions.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {p}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  SDK Bridge: /api/plugins/bridge/{plugin.pluginId}/data
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
