import React, { useState } from 'react';
import { CampaignAdSpend } from '../../types';
import {
  Sliders,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  X,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  DollarSign,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';

interface QuickCampaignToggleOverlayProps {
  campaigns: CampaignAdSpend[];
  onToggleStatus: (campaignId: string, newStatus: 'active' | 'paused') => void;
  onAddNewSpend?: () => void;
}

export const QuickCampaignToggleOverlay: React.FC<QuickCampaignToggleOverlayProps> = ({
  campaigns,
  onToggleStatus,
  onAddNewSpend,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'facebook' | 'tiktok' | 'google'>('all');
  const [recentToggledName, setRecentToggledName] = useState<string | null>(null);

  // Stats
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const pausedCount = campaigns.filter((c) => c.status === 'paused').length;

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

  const handleToggle = (campaign: CampaignAdSpend) => {
    const targetStatus = campaign.status === 'active' ? 'paused' : 'active';
    onToggleStatus(campaign.id, targetStatus);
    setRecentToggledName(`${campaign.name} is now ${targetStatus.toUpperCase()}`);
    setTimeout(() => {
      setRecentToggledName(null);
    }, 2500);
  };

  return (
    <>
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 animate-in fade-in slide-in-from-bottom-2"
          title="Open Quick Campaign Controller Overlay"
        >
          <Sliders className="w-4 h-4 text-amber-300 animate-pulse" />
          <div className="text-left">
            <span className="block leading-none">Campaign Quick Toggle</span>
            <span className="text-[10px] text-sky-100 font-normal">
              {activeCount} Active • {pausedCount} Paused
            </span>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-300 animate-ping" />
        </button>
      )}

      {/* Floating Overlay Panel */}
      {isOpen && (
        <div
          className={`fixed z-40 transition-all duration-200 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden flex flex-col ${
            isMinimized
              ? 'bottom-6 right-6 w-80 h-16'
              : 'bottom-6 right-6 w-[92vw] sm:w-[420px] max-h-[82vh] h-[520px]'
          }`}
        >
          {/* Overlay Header */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black truncate flex items-center gap-1.5">
                  <span>Quick Campaign Controller</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    {activeCount} Live
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400 truncate">
                  Toggle Active/Paused without leaving view
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded Content Area */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0 p-3.5 space-y-3 overflow-hidden">
              {/* Toast confirmation of toggle action */}
              {recentToggledName && (
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{recentToggledName}</span>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaign name..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Platform Filter Pills */}
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">All Platforms</option>
                  <option value="facebook">Facebook Only</option>
                  <option value="tiktok">TikTok Only</option>
                  <option value="google">Google Only</option>
                </select>
              </div>

              {/* Campaigns List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredCampaigns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                    <Sliders className="w-8 h-8 stroke-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">কোনো ক্যাম্পেইন পাওয়া যায়নি</p>
                    {onAddNewSpend && (
                      <button
                        type="button"
                        onClick={onAddNewSpend}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                      >
                        + Create Campaign
                      </button>
                    )}
                  </div>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const isActive = campaign.status === 'active';
                    return (
                      <div
                        key={campaign.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-500'
                            : 'bg-slate-100/50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/80 opacity-75 hover:opacity-100'
                        }`}
                      >
                        {/* Info Column */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                                campaign.platform === 'facebook'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : campaign.platform === 'tiktok'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {campaign.platform}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ৳{campaign.spendBDT?.toLocaleString()}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5" title={campaign.name}>
                            {campaign.name}
                          </h5>

                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {campaign.productName || campaign.utmCampaign || 'General Catalog'}
                          </p>
                        </div>

                        {/* Quick Toggle Switch */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggle(campaign)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                              isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            title={isActive ? 'Click to Pause' : 'Click to Activate'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>

                          <span
                            className={`text-[10px] font-black w-14 text-center px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isActive ? 'Active' : 'Paused'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer Info */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  {campaigns.length} total logged campaigns
                </span>
                {onAddNewSpend && (
                  <button
                    type="button"
                    onClick={onAddNewSpend}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>+ Log Spend</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
