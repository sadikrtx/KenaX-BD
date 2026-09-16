import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Truck,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
  Save,
  RotateCcw,
  Palette,
  ExternalLink,
  Eye,
  CheckCircle,
  X,
  Plus,
  AlertCircle,
  Link,
  Tag,
} from 'lucide-react';
import { HeroSideBannerSettings, DEFAULT_HERO_SIDE_BANNER } from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

interface AdminHeroSideBannerManagerProps {
  sideBanner: HeroSideBannerSettings;
  onChangeSideBanner: (updated: HeroSideBannerSettings) => void;
  onSaveInstant?: (updated: HeroSideBannerSettings) => Promise<void>;
  isSaving?: boolean;
}

const GRADIENT_PRESETS = [
  {
    name: 'Sky & Navy (Default)',
    value: 'from-sky-700 via-blue-800 to-slate-900',
    preview: 'bg-gradient-to-br from-sky-700 via-blue-800 to-slate-900',
  },
  {
    name: 'Royal Indigo',
    value: 'from-indigo-800 via-purple-900 to-slate-950',
    preview: 'bg-gradient-to-br from-indigo-800 via-purple-900 to-slate-950',
  },
  {
    name: 'Emerald Forest',
    value: 'from-emerald-700 via-teal-800 to-slate-950',
    preview: 'bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950',
  },
  {
    name: 'Deep Midnight Slate',
    value: 'from-slate-800 via-slate-900 to-zinc-950',
    preview: 'bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-950',
  },
  {
    name: 'Crimson Red',
    value: 'from-rose-800 via-red-900 to-slate-950',
    preview: 'bg-gradient-to-br from-rose-800 via-red-900 to-slate-950',
  },
  {
    name: 'Sunset Amber',
    value: 'from-amber-600 via-orange-700 to-slate-900',
    preview: 'bg-gradient-to-br from-amber-600 via-orange-700 to-slate-900',
  },
];

const BUTTON_VARIANTS = [
  { id: 'secondary', label: 'Clean White', classes: 'bg-white text-slate-950' },
  { id: 'primary', label: 'Sky Blue', classes: 'bg-sky-500 text-slate-950' },
  { id: 'emerald', label: 'Emerald Green', classes: 'bg-emerald-500 text-white' },
  { id: 'dark', label: 'Dark Slate', classes: 'bg-slate-900 text-white' },
  { id: 'outline', label: 'White Outline', classes: 'bg-transparent text-white border border-white/50' },
  { id: 'whatsapp', label: 'WhatsApp Brand', classes: 'bg-emerald-600 text-white' },
];

export const AdminHeroSideBannerManager: React.FC<AdminHeroSideBannerManagerProps> = ({
  sideBanner,
  onChangeSideBanner,
  onSaveInstant,
  isSaving = false,
}) => {
  const currentBanner = sideBanner || DEFAULT_HERO_SIDE_BANNER;
  const isEnabled = currentBanner.enabled !== false;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleUpdate = (field: keyof HeroSideBannerSettings, value: any) => {
    onChangeSideBanner({
      ...currentBanner,
      [field]: value,
    });
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Please keep image file size within 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChangeSideBanner({
        ...currentBanner,
        bgType: 'image',
        bgImage: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleEnable = () => {
    const newStatus = !isEnabled;
    const updated = {
      ...currentBanner,
      enabled: newStatus,
    };
    onChangeSideBanner(updated);
    if (onSaveInstant) {
      onSaveInstant(updated).catch(() => {});
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to restore the default Cash on Delivery side banner?')) {
      onChangeSideBanner(DEFAULT_HERO_SIDE_BANNER);
      if (onSaveInstant) {
        onSaveInstant(DEFAULT_HERO_SIDE_BANNER)
          .then(() => {
            setSaveToast('Default banner restored successfully!');
            setTimeout(() => setSaveToast(null), 3000);
          })
          .catch(() => {});
      }
    }
  };

  const handleSaveClick = async () => {
    if (onSaveInstant) {
      try {
        await onSaveInstant(currentBanner);
        setSaveToast('Side banner saved successfully!');
        setTimeout(() => setSaveToast(null), 3500);
      } catch (e) {
        alert('Failed to save changes. Please try again.');
      }
    }
  };

  // Preview styling helpers
  const bgType = currentBanner.bgType || (currentBanner.bgImage ? 'image' : 'gradient');
  const bgColor = currentBanner.bgColor || 'from-sky-700 via-blue-800 to-slate-900';
  const isHexOrRgb = bgColor.startsWith('#') || bgColor.startsWith('rgb');

  const showBtn = currentBanner.showButton !== false && !!currentBanner.buttonText?.trim();
  const btnVariant = currentBanner.buttonVariant || 'secondary';

  let btnClass = 'bg-white text-slate-950';
  if (btnVariant === 'primary') btnClass = 'bg-sky-500 text-slate-950';
  else if (btnVariant === 'emerald') btnClass = 'bg-emerald-500 text-white';
  else if (btnVariant === 'dark') btnClass = 'bg-slate-900 text-white border border-slate-700';
  else if (btnVariant === 'outline') btnClass = 'bg-transparent text-white border border-white/50';
  else if (btnVariant === 'whatsapp') btnClass = 'bg-emerald-600 text-white';

  return (
    <div id="admin-hero-side-banner-manager" className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-6">
      {/* Toast Feedback */}
      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
          <button type="button" onClick={() => setSaveToast(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Hero Side Banner Settings
              </h3>
              <p className="text-xs text-slate-500">
                Manage promo text, buttons, background colors, images, and visibility of the hero side banner card.
              </p>
            </div>
          </div>
        </div>

        {/* Visibility / Delete Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 ${
              isEnabled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
            <span>{isEnabled ? 'Active' : 'Disabled'}</span>
          </span>

          <button
            type="button"
            onClick={handleToggleEnable}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isEnabled
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isEnabled ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hide / Disable Card</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Enable Side Card</span>
              </>
            )}
          </button>
        </div>
      </div>

      {!isEnabled ? (
        <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-900">This side banner card is currently disabled</h4>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            The main homepage hero carousel is currently expanded to full-width (12 columns). You can re-enable this card at any time.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleToggleEnable}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Enable Side Banner
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
            >
              Reset to Default
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Text Content Settings */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>Card Text &amp; Content</span>
                </h4>
                <span className="text-[10px] text-slate-600">Leave blank to hide text</span>
              </div>

              {/* Tag / Eyebrow Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Top Badge / Tag Text
                  </label>
                  {currentBanner.tagText ? (
                    <button
                      type="button"
                      onClick={() => handleUpdate('tagText', '')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Clear Tag"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Nationwide Delivery"
                  value={currentBanner.tagText || ''}
                  onChange={(e) => handleUpdate('tagText', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Main Title *
                  </label>
                  {currentBanner.title ? (
                    <button
                      type="button"
                      onClick={() => handleUpdate('title', '')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Clear Title"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Cash on Delivery Nationwide"
                  value={currentBanner.title || ''}
                  onChange={(e) => handleUpdate('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Description Text
                  </label>
                  {currentBanner.description ? (
                    <button
                      type="button"
                      onClick={() => handleUpdate('description', '')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Clear Description"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  ) : null}
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. Order directly to your doorstep, inspect your package, and pay safely upon delivery anywhere in Bangladesh."
                  value={currentBanner.description || ''}
                  onChange={(e) => handleUpdate('description', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Footer Trust Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Footer Guarantee Text
                  </label>
                  {currentBanner.footerText ? (
                    <button
                      type="button"
                      onClick={() => handleUpdate('footerText', '')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                      title="Clear Footer Text"
                    >
                      <X className="w-3 h-3" /> Clear
                    </button>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder="e.g. 100% Guaranteed Safe Delivery"
                  value={currentBanner.footerText || ''}
                  onChange={(e) => handleUpdate('footerText', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* 2. Action Button Controls */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentBanner.showButton !== false}
                    onChange={(e) => handleUpdate('showButton', e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded-md border-slate-300 focus:ring-sky-500"
                  />
                  <span className="text-xs font-bold text-slate-900">
                    Show Action Button (Call-to-Action)
                  </span>
                </label>
                {currentBanner.showButton === false && (
                  <span className="text-[10px] text-rose-500 font-bold">Button Hidden</span>
                )}
              </div>

              {currentBanner.showButton !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Button Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Order Now / Buy Now"
                      value={currentBanner.buttonText || ''}
                      onChange={(e) => handleUpdate('buttonText', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Button Link / Action
                    </label>
                    <select
                      value={currentBanner.buttonLink || 'shop'}
                      onChange={(e) => handleUpdate('buttonLink', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="shop">🛍️ All Products</option>
                      <option value="flash-sale">⚡ Flash Sale Deals</option>
                      <option value="whatsapp">💬 WhatsApp Support Chat</option>
                      <option value="category:electronics-gadgets">📱 Electronics &amp; Gadgets</option>
                      <option value="category:fashion-clothing">👕 Fashion &amp; Clothing</option>
                    </select>
                  </div>

                  {/* Button Color Variants */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Button Style / Color
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {BUTTON_VARIANTS.map((variant) => {
                        const isSelected = (currentBanner.buttonVariant || 'secondary') === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => handleUpdate('buttonVariant', variant.id as any)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-sky-500 ring-2 ring-sky-300 bg-sky-50 font-bold'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className={`w-full py-1 rounded-md text-[10px] font-bold ${variant.classes} mb-1 truncate`}>
                              Btn
                            </div>
                            <span className="text-[10px] truncate block">{variant.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Background Settings: Image OR Custom Colors / Gradients */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-sky-600" />
                  <span>Card Background (Image, Color, or Gradient)</span>
                </h4>

                {/* Mode Selector */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleUpdate('bgType', 'gradient')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      bgType === 'gradient' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gradient
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate('bgType', 'color')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      bgType === 'color' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate('bgType', 'image')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      bgType === 'image' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Custom Image
                  </button>
                </div>
              </div>

              {/* Mode A: Gradient Presets */}
              {bgType === 'gradient' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Select Gradient Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((preset) => {
                      const isSelected = (currentBanner.bgColor || 'from-sky-700 via-blue-800 to-slate-900') === preset.value;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            handleUpdate('bgType', 'gradient');
                            handleUpdate('bgColor', preset.value);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected ? 'border-sky-500 ring-2 ring-sky-300 bg-sky-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-lg shrink-0 ${preset.preview} shadow-2xs`} />
                          <span className="text-[11px] font-bold text-slate-800 truncate">{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode B: Solid Color Picker */}
              {bgType === 'color' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pick Solid Background Color
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      value={isHexOrRgb ? bgColor : '#0f172a'}
                      onChange={(e) => {
                        handleUpdate('bgType', 'color');
                        handleUpdate('bgColor', e.target.value);
                      }}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="#0f172a"
                      value={isHexOrRgb ? bgColor : '#0f172a'}
                      onChange={(e) => {
                        handleUpdate('bgType', 'color');
                        handleUpdate('bgColor', e.target.value);
                      }}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                    <div className="flex items-center gap-1.5">
                      {['#0c4a6e', '#1e1b4b', '#064e3b', '#0f172a', '#881337', '#7c2d12'].map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            handleUpdate('bgType', 'color');
                            handleUpdate('bgColor', hex);
                          }}
                          style={{ backgroundColor: hex }}
                          className="w-6 h-6 rounded-md border border-white/50 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode C: Custom Background Image */}
              {bgType === 'image' && (
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Upload or Provide Background Image
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Banner Image</span>
                    </button>

                    <span className="text-xs text-slate-600">or enter image URL:</span>

                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={currentBanner.bgImage || ''}
                      onChange={(e) => {
                        handleUpdate('bgType', 'image');
                        handleUpdate('bgImage', e.target.value);
                      }}
                      className="flex-1 w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  {currentBanner.bgImage && currentBanner.bgImage.trim() !== '' && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getOptimizedImageUrl(currentBanner.bgImage, 800)}
                          alt="Banner preview"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, currentBanner.bgImage)}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">Background Image Set</p>
                          <p className="text-[10px] text-slate-600 truncate">Custom background is currently active</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUpdate('bgImage', '')}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={handleSaveClick}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Side Banner Changes'}</span>
              </button>
            </div>
          </div>

          {/* Live Preview Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-600" />
                <span>Live Desktop Preview</span>
              </h4>
              <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                Real-Time
              </span>
            </div>

            {/* Render Card exactly as it appears in HeroBanner.tsx */}
            <div
              style={isHexOrRgb ? { backgroundColor: bgColor } : undefined}
              className={`w-full ${
                !isHexOrRgb && bgType !== 'image' ? (bgColor.startsWith('bg-') ? bgColor : `bg-gradient-to-br ${bgColor}`) : 'bg-slate-900'
              } rounded-3xl p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden group border border-sky-600/30 min-h-[260px]`}
            >
              {bgType === 'image' && currentBanner.bgImage && currentBanner.bgImage.trim() !== '' && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={getOptimizedImageUrl(currentBanner.bgImage, 800)}
                    alt="Promo Banner"
                    className="w-full h-full object-cover opacity-40"
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageError(e, currentBanner.bgImage)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent"></div>
                </div>
              )}

              <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-sky-400/20 rounded-full blur-2xl pointer-events-none z-1"></div>

              <div className="relative z-10 space-y-2">
                {currentBanner.tagText && currentBanner.tagText.trim() ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-sky-100 px-2.5 py-1 rounded-md backdrop-blur-md inline-block">
                    {currentBanner.tagText}
                  </span>
                ) : null}

                {currentBanner.title && currentBanner.title.trim() ? (
                  <h3 className="text-lg sm:text-xl font-black leading-tight text-white">
                    {currentBanner.title}
                  </h3>
                ) : null}

                {currentBanner.description && currentBanner.description.trim() ? (
                  <p className="text-xs text-sky-100/90 leading-relaxed">
                    {currentBanner.description}
                  </p>
                ) : null}
              </div>

              {(currentBanner.footerText || showBtn) ? (
                <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between relative z-10 gap-2">
                  {currentBanner.footerText && currentBanner.footerText.trim() ? (
                    <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{currentBanner.footerText}</span>
                    </div>
                  ) : <div />}

                  {showBtn ? (
                    <button
                      type="button"
                      className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-sm shrink-0 cursor-default ${btnClass}`}
                    >
                      {currentBanner.buttonText}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="text-[11px] text-slate-600 text-center">
              💡 Changes to color, image, or text will immediately reflect in the live preview above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
