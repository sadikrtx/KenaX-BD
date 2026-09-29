import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  X,
  Palette,
  Smile,
  ListPlus,
} from 'lucide-react';
import { ProductHighlight } from '../../types';
import { HighlightIcon } from '../HighlightIcon';
import {
  DEFAULT_PRODUCT_HIGHLIGHTS,
  PRESET_HIGHLIGHT_ICONS,
  PRESET_HIGHLIGHT_EMOJIS,
  PRESET_HIGHLIGHT_COLORS,
  COMMON_BENEFIT_SUGGESTIONS,
} from '../../utils/highlightConstants';

interface ProductKeyHighlightsEditorProps {
  highlights: ProductHighlight[];
  onChange: (highlights: ProductHighlight[]) => void;
}

export const ProductKeyHighlightsEditor: React.FC<ProductKeyHighlightsEditorProps> = ({
  highlights,
  onChange,
}) => {
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 1. Add New Highlight (defaults to circular checkmark 'check-circle', green, active)
  const handleAddNewHighlight = () => {
    const newHighlight: ProductHighlight = {
      id: `hl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: '',
      icon: 'check-circle', // গোল টিক মার্ক ডিফল্ট
      iconColor: 'emerald',
      active: true,
    };
    onChange([...highlights, newHighlight]);
  };

  // 2. Quick Add Common Suggestion
  const handleAddSuggestion = (sug: { text: string; icon: string; iconColor: string }) => {
    const newHighlight: ProductHighlight = {
      id: `hl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: sug.text,
      icon: sug.icon,
      iconColor: sug.iconColor,
      active: true,
    };
    onChange([...highlights, newHighlight]);
    setShowSuggestions(false);
  };

  // 3. Update field of an item
  const handleUpdate = (id: string, updates: Partial<ProductHighlight>) => {
    onChange(
      highlights.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  // 4. Delete item
  const handleDelete = (id: string) => {
    onChange(highlights.filter((h) => h.id !== id));
  };

  // 5. Toggle Active/Deactivate (Hide / Show)
  const handleToggleActive = (id: string, currentActive: boolean) => {
    handleUpdate(id, { active: !currentActive });
  };

  // 6. Move Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...highlights];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChange(next);
  };

  // 7. Move Down
  const handleMoveDown = (index: number) => {
    if (index >= highlights.length - 1) return;
    const next = [...highlights];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChange(next);
  };

  // 8. Reset to Default 4 Benefits
  const handleResetDefaults = () => {
    if (
      highlights.length === 0 ||
      window.confirm('Are you sure you want to reset to the default 4 Key Highlights & Benefits?')
    ) {
      onChange(
        DEFAULT_PRODUCT_HIGHLIGHTS.map((h, i) => ({
          ...h,
          id: `hl-${Date.now()}-${i}`,
        }))
      );
    }
  };

  const activeCount = highlights.filter((h) => h.active).length;
  const currentEditingItem = highlights.find((h) => h.id === activePickerId);

  return (
    <div className="p-4 bg-slate-50/90 dark:bg-slate-900 border border-sky-200/80 dark:border-slate-800 rounded-2xl space-y-3.5 shadow-2xs">
      {/* Header with Title, Badge, and Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-700 dark:text-sky-300 shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Key Highlights & Benefits (পণ্য আকর্ষণ ও সুবিধাসমূহ)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                {activeCount} Active / {highlights.length} Total
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              কাস্টমার যখন প্রোডাক্ট কুইক ভিউ বা ডিটেইলস পেজ ওপেন করবে, তখন এই সুবিধাগুলো সুন্দর আইকন সহ প্রদর্শিত হবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Add common e-commerce benefits"
          >
            <ListPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>+ Suggestions</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/80 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title="Reset to 4 default highlights"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleAddNewHighlight}
            className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Highlight (গোল টিক)</span>
          </button>
        </div>
      </div>

      {/* Quick Suggestions Dropdown / Drawer */}
      {showSuggestions && (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-sky-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>এক ক্লিকে সাধারণ সুবিধাসমূহ যোগ করুন (Quick Presets):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {COMMON_BENEFIT_SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSuggestion(sug)}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70 hover:bg-sky-50 dark:hover:bg-sky-950/80 hover:border-sky-300 dark:hover:border-sky-700 text-left transition-all cursor-pointer group"
              >
                <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <HighlightIcon icon={sug.icon} iconColor={sug.iconColor} className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-300 group-hover:text-sky-900 dark:group-hover:text-sky-300 font-medium truncate flex-1">
                  {sug.text}
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline shrink-0">
                  + Add
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Highlights List */}
      {highlights.length === 0 ? (
        <div className="p-6 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Sparkles className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">কোন Key Highlight যুক্ত করা হয়নি</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            গ্রাহকদের আকর্ষিত করতে ওয়ারেন্টি, ডেলিভারি ও কোয়ালিটি সংক্রান্ত সুবিধা যোগ করুন।
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleAddNewHighlight}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs"
            >
              + নতুন Highlight যোগ করুন
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              ডিফল্ট ৪টি লোড করুন
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {highlights.map((item, index) => {
            const isInactive = !item.active;
            const isPickerOpen = activePickerId === item.id;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isInactive
                    ? 'bg-slate-100/80 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 opacity-60'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs hover:border-sky-300 dark:hover:border-sky-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Up / Down Order Buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      className="p-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === highlights.length - 1}
                      onClick={() => handleMoveDown(index)}
                      className="p-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon & Color Selector Trigger Button */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActivePickerId(isPickerOpen ? null : item.id);
                        setCustomEmojiInput('');
                      }}
                      className={`h-9 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        isPickerOpen
                          ? 'border-sky-500 ring-2 ring-sky-300 dark:ring-sky-700 bg-sky-50 dark:bg-sky-950/80'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:border-sky-300'
                      }`}
                      title="আইকন বা ইমোজি এবং কালার পরিবর্তন করতে ক্লিক করুন"
                    >
                      <HighlightIcon
                        icon={item.icon || 'check-circle'}
                        iconColor={item.iconColor || 'emerald'}
                        className="w-4 h-4"
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                        Icon
                      </span>
                    </button>
                  </div>

                  {/* Highlight Text Input */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdate(item.id, { text: e.target.value })}
                      placeholder="e.g. Original product specifications & brand warranty"
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 transition-colors ${
                        isInactive
                          ? 'text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 line-through'
                          : 'text-slate-900 dark:text-white border-slate-300 dark:border-slate-700 font-medium'
                      }`}
                    />
                  </div>

                  {/* Active / Inactive (Hide / Deactivate) Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id, item.active)}
                    className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                      item.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                    title={item.active ? 'হাইড বা ডিঅ্যাক্টিভেট করতে ক্লিক করুন' : 'শো বা অ্যাক্টিভ করতে ক্লিক করুন'}
                  >
                    {item.active ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">Active</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="hidden sm:inline">Hidden</span>
                      </>
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/80 transition-colors cursor-pointer shrink-0"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Popover / Expandable Icon & Emoji & Color Picker */}
                {isPickerOpen && (
                  <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-sky-200 dark:border-slate-700 space-y-3 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>আইকন ও ইমোজি সিলেক্ট করুন (Choose Icon or Emoji)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActivePickerId(null)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Section 1: Color Palette */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                        আইকন কালার (Icon Color):
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_HIGHLIGHT_COLORS.map((col) => {
                          const isSelected = (item.iconColor || 'emerald') === col.id;
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => handleUpdate(item.id, { iconColor: col.id })}
                              className={`h-7 px-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                isSelected
                                  ? `${col.badgeClass} ring-2 ring-sky-400 shadow-xs font-black`
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${col.bgClass}`} />
                              <span>{col.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 2: Presets Icons (Lucide) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                        রেডি আইকনসমূহ (Preset Icons - গোল টিক সহ):
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {PRESET_HIGHLIGHT_ICONS.map((iconOpt) => {
                          const isSelected = item.icon === iconOpt.id;
                          return (
                            <button
                              key={iconOpt.id}
                              type="button"
                              onClick={() => handleUpdate(item.id, { icon: iconOpt.id })}
                              className={`p-1.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-sky-100/80 dark:bg-sky-950/80 border-sky-500 ring-2 ring-sky-300'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              <div className="w-6 h-6 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                                <HighlightIcon
                                  icon={iconOpt.id}
                                  iconColor={item.iconColor || 'emerald'}
                                  className="w-3.5 h-3.5"
                                />
                              </div>
                              <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                                {iconOpt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 3: Popular Preset Emojis */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">
                        জনপ্রিয় ইমোজি (Quick Emojis):
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        {PRESET_HIGHLIGHT_EMOJIS.map((emoji) => {
                          const isSelected = item.icon === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleUpdate(item.id, { icon: emoji })}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-100 dark:bg-sky-950 ring-2 ring-sky-400 scale-110 shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 4: Custom Emoji or Symbol Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                        কাস্টম ইমোজি বা প্রতীক (Custom Emoji Input):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customEmojiInput}
                          onChange={(e) => setCustomEmojiInput(e.target.value)}
                          placeholder="যেকোনো ইমোজি পেস্ট বা টাইপ করুন (যেমন: 🚀, 💎)"
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-full focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          disabled={!customEmojiInput.trim()}
                          onClick={() => {
                            if (customEmojiInput.trim()) {
                              handleUpdate(item.id, { icon: customEmojiInput.trim() });
                              setCustomEmojiInput('');
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white cursor-pointer shrink-0 transition-colors"
                        >
                          Apply Emoji
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Storefront Customer Preview Box */}
      {activeCount > 0 && (
        <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1 text-sky-800 dark:text-sky-300">
              <Eye className="w-3.5 h-3.5" />
              <span>Customer Storefront Live Preview:</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              (কাস্টমাররা প্রোডাক্ট কুইক ভিউ বা পেজে এভাবে দেখবে)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-sky-900 dark:text-sky-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Key Highlights & Benefits</span>
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
              {highlights
                .filter((h) => h.active)
                .map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <HighlightIcon
                      icon={item.icon || 'check-circle'}
                      iconColor={item.iconColor || 'emerald'}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="truncate">{item.text || 'Untitled benefit'}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
