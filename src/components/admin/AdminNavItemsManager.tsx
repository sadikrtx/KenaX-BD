import React, { useState, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  Tag,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Sliders,
  LayoutGrid,
} from 'lucide-react';
import { NavItem, WebsiteSettings, HomeTabCustomLabels } from '../../types';
import { DEFAULT_NAV_ITEMS, getEffectiveNavItems } from '../../data/defaultNavItems';

interface AdminNavItemsManagerProps {
  siteSettings: WebsiteSettings;
  onSaveSettings: (patch: Partial<WebsiteSettings>) => Promise<void> | void;
  availableTags?: string[];
}

export const AdminNavItemsManager: React.FC<AdminNavItemsManagerProps> = ({
  siteSettings,
  onSaveSettings,
  availableTags = ['Flash Sale', 'New Arrivals', 'Deals', 'Mobile', 'Xiaomi', 'Redmi', 'Smartphones', 'Gadgets'],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'header_nav' | 'home_tabs'>('header_nav');

  // --- Header Nav Items State ---
  const [items, setItems] = useState<NavItem[]>(() => {
    return getEffectiveNavItems(siteSettings.navigationItems);
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- Homepage Product Filter Tabs State ---
  const [homeTabsConfig, setHomeTabsConfig] = useState<HomeTabCustomLabels>(() => ({
    sectionTitle: siteSettings.homeTabs?.sectionTitle || '',
    sectionSubtitle: siteSettings.homeTabs?.sectionSubtitle || '',
    all: siteSettings.homeTabs?.all || '',
    trending: siteSettings.homeTabs?.trending || '',
    bestsellers: siteSettings.homeTabs?.bestsellers || '',
    electronics: siteSettings.homeTabs?.electronics || '',
    fashion: siteSettings.homeTabs?.fashion || '',
    home: siteSettings.homeTabs?.home || '',
    hiddenTabs: siteSettings.homeTabs?.hiddenTabs || [],
  }));
  const [savingHomeTabs, setSavingHomeTabs] = useState(false);
  const [saveHomeTabsSuccess, setSaveHomeTabsSuccess] = useState(false);

  // Sync only if siteSettings.navigationItems changes externally and is different from local state
  useEffect(() => {
    if (siteSettings.navigationItems && siteSettings.navigationItems.length > 0) {
      const navs = getEffectiveNavItems(siteSettings.navigationItems);
      if (JSON.stringify(navs) !== JSON.stringify(items)) {
        setItems(JSON.parse(JSON.stringify(navs)));
      }
    }
  }, [siteSettings.navigationItems]);

  // Sync homeTabs config
  useEffect(() => {
    if (siteSettings.homeTabs) {
      setHomeTabsConfig({
        sectionTitle: siteSettings.homeTabs.sectionTitle || '',
        sectionSubtitle: siteSettings.homeTabs.sectionSubtitle || '',
        all: siteSettings.homeTabs.all || '',
        trending: siteSettings.homeTabs.trending || '',
        bestsellers: siteSettings.homeTabs.bestsellers || '',
        electronics: siteSettings.homeTabs.electronics || '',
        fashion: siteSettings.homeTabs.fashion || '',
        home: siteSettings.homeTabs.home || '',
        hiddenTabs: siteSettings.homeTabs.hiddenTabs || [],
      });
    }
  }, [siteSettings.homeTabs]);

  const handlePriorityChange = (index: number, newPriority: number) => {
    const next = [...items];
    next[index].priority = Number(newPriority) || 0;
    setItems(next.sort((a, b) => a.priority - b.priority));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    const currentPri = next[index].priority;
    const prevPri = next[index - 1].priority;

    next[index].priority = prevPri;
    next[index - 1].priority = currentPri;
    setItems(next.sort((a, b) => a.priority - b.priority));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    const currentPri = next[index].priority;
    const nextPri = next[index + 1].priority;

    next[index].priority = nextPri;
    next[index + 1].priority = currentPri;
    setItems(next.sort((a, b) => a.priority - b.priority));
  };

  const handleUpdateItem = (index: number, patch: Partial<NavItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNewItem = () => {
    const maxPriority = items.reduce((max, i) => Math.max(max, Number(i.priority) || 0), 0);
    const newItem: NavItem = {
      id: `nav-custom-${Date.now()}`,
      label: 'New Nav Item',
      targetView: 'tag:New Nav Item',
      priority: maxPriority + 1,
      enabled: true,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to reset header navigation items to default settings?')) {
      setItems(JSON.parse(JSON.stringify(DEFAULT_NAV_ITEMS)));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sorted = [...items]
        .sort((a, b) => a.priority - b.priority)
        .map((item, idx) => ({ ...item, priority: idx + 1 }));

      await onSaveSettings({ navigationItems: sorted });
      setItems(sorted);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save header navigation items:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHomeTabs = async () => {
    try {
      setSavingHomeTabs(true);
      await onSaveSettings({ homeTabs: homeTabsConfig });
      setSaveHomeTabsSuccess(true);
      setTimeout(() => setSaveHomeTabsSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save homepage tabs config:', err);
    } finally {
      setSavingHomeTabs(false);
    }
  };

  const handleToggleHideTab = (tabId: string) => {
    const currentHidden = homeTabsConfig.hiddenTabs || [];
    const isCurrentlyHidden = currentHidden.includes(tabId);
    const updated = isCurrentlyHidden
      ? currentHidden.filter((id) => id !== tabId)
      : [...currentHidden, tabId];
    setHomeTabsConfig((prev) => ({ ...prev, hiddenTabs: updated }));
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('header_nav')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'header_nav'
              ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-slate-200 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Header Navigation Items (হেডার মেনু বার)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('home_tabs')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'home_tabs'
              ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs ring-1 ring-slate-200 dark:ring-slate-600'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-amber-500" />
          <span>Homepage Filter Tabs & Section (হোমপেজ ফিল্টার ও নাম)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: HEADER NAVIGATION ITEMS */}
      {/* ========================================================================= */}
      {activeSubTab === 'header_nav' && (
        <div className="space-y-6">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>Header Navigation Bar & Priority Manager</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Customize menu items, badges (HOT / NEW), page links, and order in the top bar.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900/80 border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>+ Add Nav Item</span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <span className="inline-block animate-spin">⏳</span>
                ) : saveSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Saving...' : saveSuccess ? 'Saved Successfully!' : 'Save Priority Order'}</span>
              </button>
            </div>
          </div>

          {/* Item List */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.enabled
                    ? 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {/* Left: Reorder Controls & Priority Number */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer text-xs"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer text-xs"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Priority</span>
                    <input
                      type="number"
                      min="1"
                      value={item.priority}
                      onChange={(e) => handlePriorityChange(index, Number(e.target.value))}
                      className="w-12 px-1.5 py-1 text-center font-black text-xs text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-inner focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Middle: Inputs for Label, Target View, and Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  {/* Item Name / Label */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Display Label</label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateItem(index, { label: e.target.value })}
                      placeholder="e.g. Flash Sale"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>

                  {/* Target View / Link */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Target Page / Tag</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={item.targetView.startsWith('tag:') ? 'tag_custom' : item.targetView}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'tag_custom') {
                            handleUpdateItem(index, { targetView: `tag:${item.label}` });
                          } else {
                            handleUpdateItem(index, { targetView: val });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      >
                        <option value="home">Home Page</option>
                        <option value="shop">Shop All Products</option>
                        <option value="track">Track Order</option>
                        <option value="about">About Us</option>
                        <option value="contact">Contact Support</option>
                        <option value="tag_custom">Product Tag Collection</option>
                      </select>
                    </div>
                    {item.targetView.startsWith('tag:') && (
                      <input
                        type="text"
                        value={item.targetView.replace(/^tag:/, '')}
                        onChange={(e) => handleUpdateItem(index, { targetView: `tag:${e.target.value}` })}
                        placeholder="Enter tag name (e.g. Xiaomi)"
                        className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-purple-700 dark:text-purple-300 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Optional Hot / Badge Controls */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Badge Label</label>
                      <label className="inline-flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-300 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isHot)}
                          onChange={(e) => handleUpdateItem(index, { isHot: e.target.checked })}
                          className="rounded text-rose-600"
                        />
                        <span>Show Badge</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={!item.isHot}
                      value={item.badgeText || ''}
                      onChange={(e) => handleUpdateItem(index, { badgeText: e.target.value })}
                      placeholder="e.g. HOT or NEW"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold text-rose-600 dark:text-rose-400"
                    />
                  </div>
                </div>

                {/* Right: Visibility & Delete */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t md:border-t-0 border-slate-200 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateItem(index, { enabled: !item.enabled })}
                    className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      item.enabled
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title={item.enabled ? 'Enabled in navigation' : 'Hidden from navigation'}
                  >
                    {item.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span className="hidden sm:inline">{item.enabled ? 'Active' : 'Hidden'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                    title="Delete Navigation Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Add & Save Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddNewItem}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-sky-600" />
              <span>+ Add New Navigation Item</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : saveSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Saving...' : saveSuccess ? 'Saved Successfully!' : 'Save Priority Order'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: HOMEPAGE FILTER TABS & SECTION TITLES */}
      {/* ========================================================================= */}
      {activeSubTab === 'home_tabs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-amber-500" />
                <span>Homepage Products Section & Filter Tabs (হোমপেজ ট্যাব রিনেম)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rename the section header, subtitle, and filter tab buttons (All Products, Trending, Best Sellers, etc.).
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveHomeTabs}
              disabled={savingHomeTabs}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              {savingHomeTabs ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : saveHomeTabsSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savingHomeTabs ? 'Saving...' : saveHomeTabsSuccess ? 'Saved Successfully!' : 'Save Tab Settings'}</span>
            </button>
          </div>

          {/* Section Heading & Subtitle Inputs */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              <span>Section Heading & Subtitle (সেকশন টাইটেল ও সাবটাইটেল)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section Main Title (ডিফল্ট: Popular Products & Deals)
                </label>
                <input
                  type="text"
                  value={homeTabsConfig.sectionTitle || ''}
                  onChange={(e) => setHomeTabsConfig((prev) => ({ ...prev, sectionTitle: e.target.value }))}
                  placeholder="Popular Products & Deals"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section Subtitle (ডিফল্ট: Authentic items with manufacturer warranty...)
                </label>
                <input
                  type="text"
                  value={homeTabsConfig.sectionSubtitle || ''}
                  onChange={(e) => setHomeTabsConfig((prev) => ({ ...prev, sectionSubtitle: e.target.value }))}
                  placeholder="Authentic items with manufacturer warranty and fast delivery"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filter Tab Labels Customization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wide">
                Filter Tab Buttons (ট্যাবগুলোর নাম ও ভিজিবিলিটি)
              </h4>
              <button
                type="button"
                onClick={() => {
                  setHomeTabsConfig({
                    sectionTitle: '',
                    sectionSubtitle: '',
                    all: '',
                    trending: '',
                    bestsellers: '',
                    electronics: '',
                    fashion: '',
                    home: '',
                    hiddenTabs: [],
                  });
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Tab Names</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                { id: 'all', defaultName: 'All Products', icon: '🛍️', desc: 'Shows all products in the catalog' },
                { id: 'trending', defaultName: '🔥 Trending', icon: '🔥', desc: 'Filters items tagged as Trending' },
                { id: 'bestsellers', defaultName: 'Best Sellers', icon: '⭐', desc: 'Filters items marked as Best Seller' },
                { id: 'electronics', defaultName: 'Electronics', icon: '🎧', desc: 'Category: Electronics & Gadgets' },
                { id: 'fashion', defaultName: 'Fashion', icon: '👕', desc: 'Category: Fashion & Clothing' },
                { id: 'home', defaultName: 'Home & Living', icon: '🏠', desc: 'Category: Home & Living' },
              ].map((tab) => {
                const isHidden = (homeTabsConfig.hiddenTabs || []).includes(tab.id);
                const customVal = (homeTabsConfig as any)[tab.id] || '';

                return (
                  <div
                    key={tab.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isHidden ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{tab.icon}</span>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">{tab.defaultName}</span>
                          <span className="text-[10px] text-slate-400">{tab.desc}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleHideTab(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                          isHidden
                            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title={isHidden ? 'Click to show on homepage' : 'Click to hide from homepage'}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{isHidden ? 'Hidden' : 'Visible'}</span>
                      </button>
                    </div>

                    <div className="mt-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Custom Display Name (কাস্টম নাম লিখুন)
                      </label>
                      <input
                        type="text"
                        disabled={isHidden}
                        value={customVal}
                        onChange={(e) =>
                          setHomeTabsConfig((prev) => ({
                            ...prev,
                            [tab.id]: e.target.value,
                          }))
                        }
                        placeholder={`Default: ${tab.defaultName}`}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50/50 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none disabled:bg-slate-200 disabled:text-slate-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveHomeTabs}
              disabled={savingHomeTabs}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {savingHomeTabs ? (
                <span className="inline-block animate-spin">⏳</span>
              ) : saveHomeTabsSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{savingHomeTabs ? 'Saving...' : saveHomeTabsSuccess ? 'Saved Successfully!' : 'Save Tab Settings'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
