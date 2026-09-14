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
} from 'lucide-react';
import { NavItem, WebsiteSettings } from '../../types';
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
  const [items, setItems] = useState<NavItem[]>(() => {
    return getEffectiveNavItems(siteSettings.navigationItems);
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync only if siteSettings.navigationItems changes externally and is different from local state
  useEffect(() => {
    if (siteSettings.navigationItems && siteSettings.navigationItems.length > 0) {
      const navs = getEffectiveNavItems(siteSettings.navigationItems);
      // Only set if stringified content is actually different to avoid wiping in-flight edits
      if (JSON.stringify(navs) !== JSON.stringify(items)) {
        setItems(JSON.parse(JSON.stringify(navs)));
      }
    }
  }, [siteSettings.navigationItems]);

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
      // Ensure priorities are cleanly ordered 1, 2, 3...
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

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <span>Header Navigation Bar & Priority Manager</span>
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleAddNewItem}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
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
              item.enabled ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/50 border-slate-200/60 opacity-60'
            }`}
          >
            {/* Left: Reorder Controls & Priority Number */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-600 disabled:opacity-30 cursor-pointer text-xs"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                  className="p-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-600 disabled:opacity-30 cursor-pointer text-xs"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Priority</span>
                <input
                  type="number"
                  min="1"
                  value={item.priority}
                  onChange={(e) => handlePriorityChange(index, Number(e.target.value))}
                  className="w-12 px-1.5 py-1 text-center font-black text-xs text-sky-700 bg-white border border-slate-300 rounded-lg shadow-inner focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Middle: Inputs for Label, Target View, and Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {/* Item Name / Label */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Display Label</label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdateItem(index, { label: e.target.value })}
                  placeholder="e.g. Flash Sale"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Target View / Link */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Page / Tag</label>
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
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
                    className="w-full mt-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] text-purple-700 font-semibold focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Optional Hot / Badge Controls */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Badge Label</label>
                  <label className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-bold cursor-pointer">
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
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none font-bold text-rose-600"
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
  );
};
