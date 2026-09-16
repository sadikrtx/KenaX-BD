import React, { useState } from 'react';
import {
  HeroBannerSlide,
  DEFAULT_HERO_BANNERS,
  HeroSideBannerSettings,
} from '../../types';
import { AdminHeroSideBannerManager } from './AdminHeroSideBannerManager';
import {
  ImageIcon,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Video,
  Youtube,
  Play,
  CheckCircle,
  Monitor,
  Smartphone,
  Sparkles,
  CreditCard,
  RotateCcw,
  Save,
  FileText,
  Eye,
  X,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
} from 'lucide-react';
import { extractYouTubeId } from '../HeroBanner';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

interface AdminHeroSlidesManagerProps {
  heroBanners: HeroBannerSlide[];
  setHeroBanners: React.Dispatch<React.SetStateAction<HeroBannerSlide[]>>;
  handleSlideImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSlideMobileImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSlideVideoUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveInstant: (customBanners?: HeroBannerSlide[]) => Promise<void>;
  isSavingDirectly?: boolean;
  directSaveToast?: string | null;
  onDismissToast?: () => void;
  heroSideBanner?: HeroSideBannerSettings;
  setHeroSideBanner?: React.Dispatch<React.SetStateAction<HeroSideBannerSettings>>;
  onSaveSideBannerInstant?: (sideBanner: HeroSideBannerSettings) => Promise<void>;
}

export const AdminHeroSlidesManager: React.FC<AdminHeroSlidesManagerProps> = ({
  heroBanners,
  setHeroBanners,
  handleSlideImageUpload,
  handleSlideMobileImageUpload,
  handleSlideVideoUpload,
  onSaveInstant,
  isSavingDirectly = false,
  directSaveToast = null,
  onDismissToast,
  heroSideBanner,
  setHeroSideBanner,
  onSaveSideBannerInstant,
}) => {
  // Slides collapsed by default on initial load for a clean overview
  const [expandedSlideIds, setExpandedSlideIds] = useState<Record<string, boolean>>({});
  const [activeSlideSubtabs, setActiveSlideSubtabs] = useState<Record<string, 'content' | 'badges_buttons' | 'media' | 'preview'>>({});
  const [slideToDeleteIndex, setSlideToDeleteIndex] = useState<number | null>(null);

  const toggleSlideExpanded = (slideKey: string) => {
    setExpandedSlideIds((prev) => ({
      ...prev,
      [slideKey]: !prev[slideKey],
    }));
  };

  const setAllSlidesExpanded = (expand: boolean) => {
    const updated: Record<string, boolean> = {};
    heroBanners.forEach((slide, idx) => {
      updated[slide.id || `slide-${idx}`] = expand;
    });
    setExpandedSlideIds(updated);
  };

  const handleAddNewSlide = () => {
    const newSlideId = `slide-${Date.now()}`;
    const newSlide: HeroBannerSlide = {
      id: newSlideId,
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&auto=format&fit=crop&q=80',
      mobileImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      badge: 'New Collection',
      title: 'Exciting Deals Await',
      subtitle: 'Premium Quality Assured',
      description: 'Discover best sellers with express nationwide home delivery across Bangladesh.',
      bengali: 'Discover best sellers with express nationwide home delivery across Bangladesh.',
      buttonText: 'Shop Deals',
      theme: 'from-blue-900 via-sky-900 to-slate-950',
      badges: [
        { id: `b-${Date.now()}-1`, text: '🔥 Hot Deals', icon: 'flame', color: 'rose' },
        { id: `b-${Date.now()}-2`, text: '🚚 Nationwide Delivery', icon: 'truck', color: 'sky' },
      ],
      buttons: [
        { id: `btn-${Date.now()}-1`, text: 'Shop Deals', link: 'shop', variant: 'primary' },
        { id: `btn-${Date.now()}-2`, text: 'Trending', link: 'trending', variant: 'outline' },
      ],
    };
    const updated = [...heroBanners, newSlide];
    setHeroBanners(updated);
    setExpandedSlideIds((prev) => ({ ...prev, [newSlideId]: true }));
    onSaveInstant(updated);
  };

  const handleDeleteSlide = async (idx: number) => {
    if (heroBanners.length <= 1) {
      alert('You must have at least one hero slide in the banner carousel.');
      return;
    }
    const updated = heroBanners.filter((_, i) => i !== idx);
    setHeroBanners(updated);
    await onSaveInstant(updated);
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === heroBanners.length - 1)) {
      return;
    }
    const updated = [...heroBanners];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setHeroBanners(updated);
  };

  const allExpanded = heroBanners.length > 0 && heroBanners.every((s, i) => Boolean(expandedSlideIds[s.id || `slide-${i}`]));

  return (
    <div id="admin-hero-slides-manager" className="p-3 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5 sm:space-y-4">
      {/* Top Header & Cloud Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-slate-100">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="font-black text-xs sm:text-base text-slate-900">
              Top Hero Banner Carousel Slides
            </h3>
            <span className="hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {heroBanners.length} Active Slides
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Synced</span>
            </span>
          </div>
          {/* Subtext hidden on mobile as requested */}
          <p className="text-xs text-slate-500 mt-1 hidden sm:block">
            Manage top storefront slides, desktop &amp; mobile optimized artwork, floating badges, and call-to-action buttons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            id="btn-toggle-expand-slides"
            onClick={() => setAllSlidesExpanded(!allExpanded)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer"
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>

          <button
            type="button"
            id="btn-add-hero-slide-top"
            onClick={handleAddNewSlide}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>

          <button
            type="button"
            id="btn-save-hero-slides-top"
            disabled={isSavingDirectly}
            onClick={() => onSaveInstant()}
            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingDirectly ? 'Saving...' : 'Save Slides'}</span>
          </button>

          <button
            type="button"
            id="btn-reset-hero-slides"
            onClick={() => {
              if (confirm('Reset hero slides to standard defaults?')) {
                setHeroBanners(DEFAULT_HERO_BANNERS);
                onSaveInstant(DEFAULT_HERO_BANNERS);
              }
            }}
            title="Reset to default slides"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Direct Save Toast Notification */}
      {directSaveToast && (
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{directSaveToast}</span>
          </div>
          {onDismissToast && (
            <button
              type="button"
              onClick={onDismissToast}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Compact Accordion Slides List */}
      <div className="space-y-3">
        {heroBanners.map((slide, idx) => {
          const slideKey = slide.id || `slide-${idx}`;
          const isExpanded = Boolean(expandedSlideIds[slideKey]);
          const activeSubtab = activeSlideSubtabs[slideKey] || 'content';
          const badgesCount = slide.badges?.length || (slide.badge ? 1 : 0);
          const buttonsCount = slide.buttons?.length || 1;
          const mediaType = slide.mediaType || 'image';

          return (
            <div
              key={slideKey}
              id={`slide-card-${idx}`}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-white border-sky-300 shadow-md ring-1 ring-sky-200'
                  : 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200 shadow-2xs'
              }`}
            >
              {/* Compact Slide Header Bar (Click to toggle) */}
              <div className="p-2 sm:p-3 flex items-center justify-between gap-2 select-none">
                <div
                  onClick={() => toggleSlideExpanded(slideKey)}
                  className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  {/* Slide Index Badge */}
                  <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-slate-900 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    #{idx + 1}
                  </span>

                  {/* Mini Thumbnail */}
                  <div className="w-10 h-7 sm:w-12 sm:h-8 rounded-lg overflow-hidden bg-slate-800 border border-slate-300 shrink-0 relative flex items-center justify-center shadow-2xs">
                    {mediaType === 'youtube' && slide.youtubeUrl ? (
                      <Youtube className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                    ) : mediaType === 'video' && slide.videoUrl ? (
                      <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                    ) : slide.image && slide.image.trim() !== '' ? (
                      <img
                        src={getOptimizedImageUrl(slide.image, 200)}
                        alt="Slide thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, slide.image)}
                      />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>

                  {/* Slide Titles & Summary */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {slide.title || `Slide #${idx + 1}`}
                      </span>
                      {slide.subtitle && (
                        <span className="hidden sm:inline text-xs font-semibold text-slate-500 truncate">
                          — {slide.subtitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 overflow-hidden flex-nowrap">
                      {/* Media Type Chip */}
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 shrink-0">
                        {mediaType === 'youtube' ? '📺 YT' : mediaType === 'video' ? '🎬 Video' : '🖼️ Image'}
                      </span>

                      {/* Badges count chip */}
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                        🏷️ {badgesCount} {badgesCount === 1 ? 'Badge' : 'Badges'}
                      </span>

                      {/* Buttons count chip */}
                      <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        🔘 {buttonsCount} {buttonsCount === 1 ? 'Button' : 'Buttons'}
                      </span>

                      {slide.badge && (
                        <span className="hidden md:inline text-[10px] font-semibold text-slate-500 truncate max-w-[120px]">
                          Tag: {slide.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Toolbar (Always accessible) */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveSlide(idx, 'up')}
                    title="Move Up"
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === heroBanners.length - 1}
                    onClick={() => handleMoveSlide(idx, 'down')}
                    title="Move Down"
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={heroBanners.length <= 1}
                    onClick={() => setSlideToDeleteIndex(idx)}
                    title="Delete Slide"
                    className="p-1 sm:p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSlideExpanded(slideKey)}
                    title={isExpanded ? 'Collapse Slide' : 'Expand Slide'}
                    className={`p-1 rounded-lg transition-transform duration-200 cursor-pointer ${
                      isExpanded ? 'bg-sky-100 text-sky-700 rotate-180' : 'text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Configuration Panel */}
              {isExpanded && (
                <div className="p-3 sm:p-5 border-t border-slate-200 bg-white space-y-3.5 sm:space-y-4">
                  {/* Sub-tab Navigation */}
                  <div className="flex items-center gap-1 sm:gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar scroll-smooth">
                    <button
                      type="button"
                      onClick={() => setActiveSlideSubtabs((prev) => ({ ...prev, [slideKey]: 'content' }))}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        activeSubtab === 'content'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>1. Titles &amp; Content</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSlideSubtabs((prev) => ({ ...prev, [slideKey]: 'badges_buttons' }))}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        activeSubtab === 'badges_buttons'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>2. Badges &amp; Buttons ({badgesCount + buttonsCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSlideSubtabs((prev) => ({ ...prev, [slideKey]: 'media' }))}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        activeSubtab === 'media'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>3. Media &amp; Artwork</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSlideSubtabs((prev) => ({ ...prev, [slideKey]: 'preview' }))}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                        activeSubtab === 'preview'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>4. Live Preview</span>
                    </button>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* SUBTAB 1: Titles & Content */}
                  {/* ---------------------------------------------------- */}
                  {activeSubtab === 'content' && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Top Header Badge Tag (Optional)
                            </label>
                            {slide.badge ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].badge = '';
                                  if (updated[idx].badges && updated[idx].badges!.length <= 1) {
                                    updated[idx].badges = [];
                                  }
                                  setHeroBanners(updated);
                                }}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Remove badge"
                              >
                                <X className="w-3 h-3" /> Remove Badge
                              </button>
                            ) : null}
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Cash on delivery available / Special Eid & festival deals (leave blank for none)"
                            value={slide.badge || ''}
                            onChange={(e) => {
                              const updated = [...heroBanners];
                              updated[idx].badge = e.target.value;
                              if (e.target.value) {
                                const currBadges = updated[idx].badges || [];
                                if (currBadges.length === 0) {
                                  updated[idx].badges = [{ id: `b-${Date.now()}`, text: e.target.value, icon: 'sparkles', color: 'sky' }];
                                } else {
                                  currBadges[0].text = e.target.value;
                                  updated[idx].badges = [...currBadges];
                                }
                              }
                              setHeroBanners(updated);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                          {/* Quick Badge Suggestions */}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span className="text-[10px] text-slate-600 font-medium">Quick Pick:</span>
                            {[
                              'Cash on delivery available',
                              'Special Eid and festival deals',
                              'Welcome to KenaX BD',
                              '🔥 Mega Gadget Fest',
                              '⚡ 100% Genuine Products',
                            ].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].badge = preset;
                                  const currBadges = updated[idx].badges || [];
                                  if (currBadges.length === 0) {
                                    updated[idx].badges = [{ id: `b-${Date.now()}`, text: preset, icon: 'sparkles', color: 'sky' }];
                                  } else {
                                    currBadges[0].text = preset;
                                    updated[idx].badges = [...currBadges];
                                  }
                                  setHeroBanners(updated);
                                }}
                                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                  slide.badge === preset
                                    ? 'bg-sky-100 border-sky-400 text-sky-800 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Main Heading (Title) (Optional)
                            </label>
                            {slide.title && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].title = '';
                                  setHeroBanners(updated);
                                }}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" /> Clear Title
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Smart Shopping (leave blank for image-only banner)"
                            value={slide.title || ''}
                            onChange={(e) => {
                              const updated = [...heroBanners];
                              updated[idx].title = e.target.value;
                              setHeroBanners(updated);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-700">
                              Sub-heading (Subtitle) (Optional)
                            </label>
                            {slide.subtitle && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].subtitle = '';
                                  setHeroBanners(updated);
                                }}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" /> Clear Subtitle
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. Better Living (leave blank for none)"
                            value={slide.subtitle || ''}
                            onChange={(e) => {
                              const updated = [...heroBanners];
                              updated[idx].subtitle = e.target.value;
                              setHeroBanners(updated);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Promotional Description (Optional)
                          </label>
                          {(slide.description || slide.bengali) && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...heroBanners];
                                updated[idx].description = '';
                                updated[idx].bengali = '';
                                setHeroBanners(updated);
                              }}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Clear Description
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Genuine Products Delivered Nationwide (leave blank for none)"
                          value={slide.description || slide.bengali || ''}
                          onChange={(e) => {
                            const updated = [...heroBanners];
                            updated[idx].description = e.target.value;
                            updated[idx].bengali = e.target.value;
                            setHeroBanners(updated);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Gradient Theme Preset Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Gradient Background Preset
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { name: 'Sky Midnight', theme: 'from-blue-900 via-sky-900 to-slate-950', preview: 'bg-gradient-to-r from-blue-900 to-sky-900' },
                            { name: 'Royal Indigo', theme: 'from-indigo-900 via-slate-900 to-sky-950', preview: 'bg-gradient-to-r from-indigo-900 to-slate-900' },
                            { name: 'Deep Slate', theme: 'from-slate-900 via-sky-950 to-blue-900', preview: 'bg-gradient-to-r from-slate-900 to-sky-950' },
                            { name: 'Emerald Wave', theme: 'from-emerald-950 via-teal-900 to-slate-950', preview: 'bg-gradient-to-r from-emerald-950 to-teal-900' },
                            { name: 'Crimson Night', theme: 'from-rose-950 via-slate-900 to-zinc-950', preview: 'bg-gradient-to-r from-rose-950 to-slate-900' },
                          ].map((preset) => {
                            const isSelected = (slide.theme || '').includes(preset.theme) || slide.theme === preset.theme;
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].theme = preset.theme;
                                  setHeroBanners(updated);
                                }}
                                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                  isSelected ? 'border-sky-500 ring-2 ring-sky-300 bg-sky-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded-full shrink-0 ${preset.preview}`} />
                                <span className="text-[11px] font-bold text-slate-800 truncate">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ---------------------------------------------------- */}
                      {/* NEW: Overlay Opacity & Text Positioning Controls */}
                      {/* ---------------------------------------------------- */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                        {/* 1. Dark Overlay Opacity Control */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Sliders className="w-4 h-4 text-sky-600" />
                              <span>Overlay Opacity (অপাসিটি কমানো/বাড়ানো)</span>
                            </label>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                              {slide.overlayOpacity !== undefined ? `${slide.overlayOpacity}%` : '85% (Auto)'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            <strong>0%</strong> নির্বাচন করলে ইমেজে কোনো ডার্ক অপাসিটি থাকবে না (সম্পূর্ণ ক্লিয়ার ইমেজে ফুল অপাসিটি)।
                          </p>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={slide.overlayOpacity !== undefined ? slide.overlayOpacity : 85}
                              onChange={(e) => {
                                const updated = [...heroBanners];
                                updated[idx].overlayOpacity = parseInt(e.target.value, 10);
                                setHeroBanners(updated);
                              }}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                            />
                          </div>

                          {/* Quick Opacity Presets */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {[
                              { label: '0% Clean (No Dark)', val: 0 },
                              { label: '30% Light', val: 30 },
                              { label: '60% Medium', val: 60 },
                              { label: '85% Default', val: 85 },
                            ].map((p) => {
                              const currVal = slide.overlayOpacity !== undefined ? slide.overlayOpacity : 85;
                              const isSel = currVal === p.val;
                              return (
                                <button
                                  key={p.val}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...heroBanners];
                                    updated[idx].overlayOpacity = p.val;
                                    setHeroBanners(updated);
                                  }}
                                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                    isSel
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Content & Text Alignment Position (Left, Center, Right) */}
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <label className="text-xs font-black text-slate-900 block">
                            Content Position (টেক্সট ও বাটন কোনপাশে থাকবে - মিডিলে নাকি সেন্টারে)
                          </label>

                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            হিরো স্লাইডের টাইটেল, বেইজ, সাবটাইটেল এবং বাটনগুলোর পজিশনিং সেট করুন।
                          </p>

                          <div className="grid grid-cols-3 gap-2 pt-1">
                            {[
                              { key: 'left', label: 'Left (বামপাশে)', icon: AlignLeft },
                              { key: 'center', label: 'Center (মিডিলে/সেন্টারে)', icon: AlignCenter },
                              { key: 'right', label: 'Right (ডানপাশে)', icon: AlignRight },
                            ].map((pos) => {
                              const IconComponent = pos.icon;
                              const currentAlign = slide.contentAlignment || 'left';
                              const isSel = currentAlign === pos.key;
                              return (
                                <button
                                  key={pos.key}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...heroBanners];
                                    updated[idx].contentAlignment = pos.key as 'left' | 'center' | 'right';
                                    setHeroBanners(updated);
                                  }}
                                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
                                    isSel
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-bold'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold'
                                  }`}
                                >
                                  <IconComponent className="w-4 h-4" />
                                  <span className="text-[10px]">{pos.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUBTAB 2: Badges & Buttons */}
                  {/* ---------------------------------------------------- */}
                  {activeSubtab === 'badges_buttons' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* 1. Badges Manager */}
                      <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-sky-600" />
                              <span>Feature &amp; Highlight Badges ({slide.badges?.length || 0})</span>
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Floating pill badges displayed above the slide headline. You can have 0, 1, 2, 3 or more badges.
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {slide.badges && slide.badges.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].badges = [];
                                  updated[idx].badge = '';
                                  setHeroBanners(updated);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear All Badges (0)</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...heroBanners];
                                const currentBadges = updated[idx].badges || [];
                                const newBadge = { id: `b-${Date.now()}`, text: '🔥 100% Genuine', icon: 'sparkles', color: 'sky' as const };
                                updated[idx].badges = [...currentBadges, newBadge];
                                if (!updated[idx].badge) {
                                  updated[idx].badge = newBadge.text;
                                }
                                setHeroBanners(updated);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Badge</span>
                            </button>
                          </div>
                        </div>

                        {/* Quick Preset Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white border border-sky-100">
                          <span className="text-[10px] text-slate-500 font-bold">Quick Add:</span>
                          {[
                            { text: '🚚 Cash on delivery available', color: 'emerald' },
                            { text: '🌙 Special Eid & festival deals', color: 'amber' },
                            { text: '🔥 Hot Deals', color: 'rose' },
                            { text: '⚡ 100% Genuine Products', color: 'sky' },
                            { text: '📦 Free Return BD', color: 'purple' },
                          ].map((preset) => (
                            <button
                              key={preset.text}
                              type="button"
                              onClick={() => {
                                const updated = [...heroBanners];
                                const currentBadges = updated[idx].badges || [];
                                const newBadge = { id: `b-${Date.now()}-${Math.random()}`, text: preset.text, icon: 'sparkles', color: preset.color as any };
                                updated[idx].badges = [...currentBadges, newBadge];
                                if (!updated[idx].badge) {
                                  updated[idx].badge = preset.text;
                                }
                                setHeroBanners(updated);
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 text-slate-700 font-semibold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{preset.text}</span>
                            </button>
                          ))}
                        </div>

                        {(!slide.badges || slide.badges.length === 0) ? (
                          <div className="p-3 text-center bg-white rounded-xl border border-sky-100 text-xs text-slate-400 italic">
                            0 badges active. This slide has no badges. Click &quot;Add Badge&quot; above if you want to add highlight pills.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {slide.badges.map((badge, bIdx) => (
                              <div
                                key={badge.id || bIdx}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-white border border-sky-200"
                              >
                                <input
                                  type="text"
                                  placeholder="Badge label (e.g. 🚚 Fast Delivery)"
                                  value={badge.text}
                                  onChange={(e) => {
                                    const updated = [...heroBanners];
                                    if (updated[idx].badges) {
                                      updated[idx].badges![bIdx].text = e.target.value;
                                      if (bIdx === 0) {
                                        updated[idx].badge = e.target.value;
                                      }
                                      setHeroBanners(updated);
                                    }
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                                />

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <select
                                    value={badge.color || 'sky'}
                                    onChange={(e) => {
                                      const updated = [...heroBanners];
                                      if (updated[idx].badges) {
                                        updated[idx].badges![bIdx].color = e.target.value as any;
                                        setHeroBanners(updated);
                                      }
                                    }}
                                    className="flex-1 sm:flex-none px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                                  >
                                    <option value="sky">Sky Blue</option>
                                    <option value="emerald">Emerald Green</option>
                                    <option value="rose">Rose Red</option>
                                    <option value="amber">Amber Gold</option>
                                    <option value="purple">Purple</option>
                                    <option value="indigo">Indigo</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...heroBanners];
                                      if (updated[idx].badges) {
                                        const remainingBadges = updated[idx].badges!.filter((_, i) => i !== bIdx);
                                        updated[idx].badges = remainingBadges;
                                        if (remainingBadges.length === 0) {
                                          updated[idx].badge = '';
                                        } else {
                                          updated[idx].badge = remainingBadges[0].text || '';
                                        }
                                        setHeroBanners(updated);
                                      }
                                    }}
                                    title="Delete badge"
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. Action Buttons Manager */}
                      <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-indigo-600" />
                              <span>Action &amp; Navigation Buttons ({slide.buttons?.length || 0})</span>
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Interactive buttons that direct shoppers to categories, offers, or pages. You can have 0, 1, 2, or 3 buttons.
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {slide.buttons && slide.buttons.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...heroBanners];
                                  updated[idx].buttons = [];
                                  updated[idx].buttonText = '';
                                  setHeroBanners(updated);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Clear (0)</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...heroBanners];
                                const currentBtns = updated[idx].buttons || [];
                                const newBtn = { id: `btn-${Date.now()}`, text: 'Explore Now', link: 'shop', variant: 'primary' as const };
                                updated[idx].buttons = [...currentBtns, newBtn];
                                if (!updated[idx].buttonText) {
                                  updated[idx].buttonText = newBtn.text;
                                }
                                setHeroBanners(updated);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Button</span>
                            </button>
                          </div>
                        </div>

                        {(!slide.buttons || slide.buttons.length === 0) ? (
                          <div className="p-3 text-center bg-white rounded-xl border border-indigo-100 text-xs text-slate-400 italic">
                            0 buttons active. This slide will render cleanly without buttons. Click &quot;Add Button&quot; if you want action buttons.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {slide.buttons.map((btn, btnIdx) => (
                              <div
                                key={btn.id || btnIdx}
                                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 p-2 rounded-xl bg-white border border-indigo-200"
                              >
                                <input
                                  type="text"
                                  placeholder="Button text (e.g. Shop Now)"
                                  value={btn.text}
                                  onChange={(e) => {
                                    const updated = [...heroBanners];
                                    if (updated[idx].buttons) {
                                      updated[idx].buttons![btnIdx].text = e.target.value;
                                      if (btnIdx === 0) {
                                        updated[idx].buttonText = e.target.value;
                                      }
                                      setHeroBanners(updated);
                                    }
                                  }}
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                                />

                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 shrink-0">
                                  <select
                                    value={btn.link || 'shop'}
                                    onChange={(e) => {
                                      const updated = [...heroBanners];
                                      if (updated[idx].buttons) {
                                        updated[idx].buttons![btnIdx].link = e.target.value;
                                        setHeroBanners(updated);
                                      }
                                    }}
                                    className="flex-1 sm:flex-none min-w-[120px] px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                                  >
                                    <option value="shop">All Products (Shop)</option>
                                    <option value="trending">🔥 Trending Deals</option>
                                    <option value="flash_sale">⚡ Flash Sale</option>
                                    <option value="bestsellers">⭐ Best Sellers</option>
                                    <option value="new_arrivals">✨ New Arrivals</option>
                                    <option value="top_rated">🌟 Top Rated</option>
                                    <option value="electronics">Electronics &amp; Gadgets</option>
                                    <option value="fashion">Fashion &amp; Lifestyle</option>
                                    <option value="home">Home &amp; Kitchen</option>
                                    <option value="contact">Contact Us</option>
                                    <option value="about">About Us</option>
                                  </select>

                                  <select
                                    value={btn.variant || 'primary'}
                                    onChange={(e) => {
                                      const updated = [...heroBanners];
                                      if (updated[idx].buttons) {
                                        updated[idx].buttons![btnIdx].variant = e.target.value as any;
                                        setHeroBanners(updated);
                                      }
                                    }}
                                    className="flex-1 sm:flex-none px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                                  >
                                    <option value="primary">Sky Glow</option>
                                    <option value="dark">Dark</option>
                                    <option value="emerald">Green</option>
                                    <option value="secondary">White</option>
                                    <option value="whatsapp">WhatsApp</option>
                                  </select>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...heroBanners];
                                      if (updated[idx].buttons) {
                                        const remainingButtons = updated[idx].buttons!.filter((_, i) => i !== btnIdx);
                                        updated[idx].buttons = remainingButtons;
                                        if (remainingButtons.length === 0) {
                                          updated[idx].buttonText = '';
                                        } else {
                                          updated[idx].buttonText = remainingButtons[0].text || '';
                                        }
                                        setHeroBanners(updated);
                                      }
                                    }}
                                    title="Delete button"
                                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUBTAB 3: Media & Artwork */}
                  {/* ---------------------------------------------------- */}
                  {activeSubtab === 'media' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Media Mode Segmented Switcher */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                          Slide Media Source Type
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...heroBanners];
                              updated[idx].mediaType = 'image';
                              setHeroBanners(updated);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              mediaType === 'image'
                                ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-900">High-Res Image</span>
                              <span className="block text-[10px] text-slate-500">Desktop + Mobile artwork</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...heroBanners];
                              updated[idx].mediaType = 'video';
                              setHeroBanners(updated);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              mediaType === 'video'
                                ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                              <Video className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-900">Device Video File</span>
                              <span className="block text-[10px] text-slate-500">Upload MP4/WebM video</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...heroBanners];
                              updated[idx].mediaType = 'youtube';
                              setHeroBanners(updated);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                              mediaType === 'youtube'
                                ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300'
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                              <Youtube className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="block text-xs font-bold text-slate-900">YouTube Loop</span>
                              <span className="block text-[10px] text-slate-500">Clean borderless loop</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 1. Image Mode Controls */}
                      {mediaType === 'image' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Desktop Image Box */}
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Monitor className="w-4 h-4 text-sky-600" />
                                <span>Desktop View Image</span>
                              </span>
                              <span className="text-[10px] text-slate-400">1600x600 px (Wide)</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <label className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload File</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSlideImageUpload(idx, e)}
                                  className="hidden"
                                />
                              </label>

                              <input
                                type="url"
                                placeholder="Paste Google Drive, Facebook, or Direct Image URL..."
                                value={slide.image || ''}
                                onChange={(e) => {
                                  const updated = [...heroBanners];
                                  updated[idx].image = e.target.value;
                                  setHeroBanners(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              💡 Supports: Local Device file upload, Google Drive sharing links, Facebook photo links, & Direct web URLs.
                            </p>

                            {slide.image && slide.image.trim() !== '' && (
                              <div className="relative h-24 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                                <img
                                  src={getOptimizedImageUrl(slide.image, 1600)}
                                  alt={`Desktop preview ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleImageError(e, slide.image)}
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                                  Desktop View
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Mobile Image Box */}
                          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <Smartphone className="w-4 h-4 text-emerald-600" />
                                <span>Mobile View Image</span>
                              </span>
                              <span className="text-[10px] text-slate-400">800x800 px (Square/Portrait)</span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <label className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload Mobile</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSlideMobileImageUpload(idx, e)}
                                  className="hidden"
                                />
                              </label>

                              <input
                                type="url"
                                placeholder="Paste Google Drive, Facebook, or Direct Image URL..."
                                value={slide.mobileImage || ''}
                                onChange={(e) => {
                                  const updated = [...heroBanners];
                                  updated[idx].mobileImage = e.target.value;
                                  setHeroBanners(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              💡 Supports: Local Device file upload, Google Drive sharing links, Facebook photo links, & Direct web URLs.
                            </p>

                            {slide.mobileImage && slide.mobileImage.trim() !== '' ? (
                              <div className="relative h-24 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-900">
                                <img
                                  src={getOptimizedImageUrl(slide.mobileImage, 800)}
                                  alt={`Mobile preview ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleImageError(e, slide.mobileImage)}
                                />
                                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold">
                                  Mobile View
                                </span>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-slate-100 text-[11px] text-slate-500 font-medium italic">
                                No separate mobile image set. Using desktop image fallback automatically.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 2. Device Video File Controls */}
                      {mediaType === 'video' && (
                        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Video className="w-4 h-4 text-purple-600" />
                              <span>Upload Video File (MP4, WebM)</span>
                            </span>
                            <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                              Backed up to Firestore Chunks
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0">
                              <Upload className="w-4 h-4" />
                              <span>Upload Video from Device</span>
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/ogg"
                                onChange={(e) => handleSlideVideoUpload(idx, e)}
                                className="hidden"
                              />
                            </label>

                            <input
                              type="url"
                              placeholder="Or direct video URL (.mp4)..."
                              value={slide.videoUrl || ''}
                              onChange={(e) => {
                                const updated = [...heroBanners];
                                updated[idx].videoUrl = e.target.value;
                                setHeroBanners(updated);
                              }}
                              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-purple-200 text-xs font-mono text-slate-900 bg-white"
                            />
                          </div>

                          {slide.videoUrl && (
                            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-purple-300 max-h-48">
                              <video
                                src={slide.videoUrl}
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover max-h-48"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. YouTube Loop Controls */}
                      {mediaType === 'youtube' && (
                        <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Youtube className="w-4 h-4 text-rose-600" />
                              <span>YouTube Video / Shorts Link</span>
                            </span>
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full">
                              Clean Continuous Loop
                            </span>
                          </div>

                          <input
                            type="url"
                            placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/... or shorts link"
                            value={slide.youtubeUrl || ''}
                            onChange={(e) => {
                              const updated = [...heroBanners];
                              updated[idx].youtubeUrl = e.target.value;
                              setHeroBanners(updated);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-rose-200 text-xs font-mono text-slate-900 bg-white"
                          />

                          {slide.youtubeUrl && (() => {
                            const ytId = extractYouTubeId(slide.youtubeUrl);
                            if (ytId) {
                              return (
                                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Valid YouTube ID: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">{ytId}</code></span>
                                </div>
                              );
                            }
                            return (
                              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                                ⚠️ Please paste a valid YouTube video link or Shorts URL.
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUBTAB 4: Live Miniature Preview */}
                  {/* ---------------------------------------------------- */}
                  {activeSubtab === 'preview' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 text-xs text-indigo-900 font-medium">
                        👁️ This is a real-time live preview of how Slide #{idx + 1} appears to visitors on desktop and mobile view.
                      </div>

                      {/* Miniature Desktop Preview */}
                      <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-md bg-slate-950 relative min-h-[160px] p-5 flex flex-col justify-between">
                        {/* Background Media */}
                        {mediaType === 'image' && slide.image && slide.image.trim() !== '' && (
                          <img
                            src={getOptimizedImageUrl(slide.image, 1600)}
                            alt="Desktop preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImageError(e, slide.image)}
                          />
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-r ${slide.theme || 'from-blue-900 via-sky-900 to-slate-950'} opacity-75`} />

                        <div className="relative z-10 space-y-2 max-w-lg">
                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {slide.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black backdrop-blur-xs">
                                {slide.badge}
                              </span>
                            )}
                            {slide.badges?.map((b) => (
                              <span key={b.id} className="px-2 py-0.5 rounded-full bg-sky-500/30 text-sky-200 text-[10px] font-bold border border-sky-400/30">
                                {b.text}
                              </span>
                            ))}
                          </div>

                          {/* Title & Subtitle */}
                          <div>
                            <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                              {slide.title || 'Main Headline'}
                            </h4>
                            {slide.subtitle && (
                              <p className="text-xs font-bold text-sky-300">
                                {slide.subtitle}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-200 mt-1 line-clamp-2">
                              {slide.description || slide.bengali || 'Your Need, Our Promise.'}
                            </p>
                          </div>

                          {/* Buttons */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {slide.buttons?.map((b) => (
                              <span
                                key={b.id}
                                className="px-3 py-1 rounded-lg bg-sky-500 text-white font-black text-[11px] shadow-xs inline-block"
                              >
                                {b.text}
                              </span>
                            ))}
                          </div>
                        </div>

                        <span className="relative z-10 self-end text-[9px] font-bold px-2 py-0.5 rounded bg-black/70 text-white">
                          Desktop Layout
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Quick Add & Direct Save Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          id="btn-add-hero-slide-bottom"
          onClick={handleAddNewSlide}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 text-sky-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Another Hero Slide ({heroBanners.length} total)</span>
        </button>

        <button
          type="button"
          id="btn-save-hero-slides-bottom"
          disabled={isSavingDirectly}
          onClick={() => onSaveInstant()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSavingDirectly ? 'Saving Slides to Firestore...' : 'Save & Publish Hero Slides Now'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* HERO SIDE BANNER & COD CARD MANAGER */}
      {/* ========================================================= */}
      {heroSideBanner && setHeroSideBanner && (
        <div className="pt-6 border-t-2 border-dashed border-slate-200">
          <AdminHeroSideBannerManager
            sideBanner={heroSideBanner}
            onChangeSideBanner={setHeroSideBanner}
            onSaveInstant={onSaveSideBannerInstant}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {slideToDeleteIndex !== null && heroBanners[slideToDeleteIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-50 border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base">Confirm Slide Deletion</h4>
                <p className="text-xs text-slate-500">Delete Hero Slide #{slideToDeleteIndex + 1}</p>
              </div>
            </div>
            
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900">
                Are you sure you want to delete this hero banner slide?
              </p>
              <p className="text-slate-600">
                • <strong>Title:</strong> "{heroBanners[slideToDeleteIndex].title || 'Untitled Slide'}"<br />
                • <strong>Slide Position:</strong> #{slideToDeleteIndex + 1} of {heroBanners.length}
              </p>
              <p className="text-rose-600 font-semibold pt-1">
                ⚠️ Once confirmed, the slide will be permanently removed from the storefront and database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSlideToDeleteIndex(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = slideToDeleteIndex;
                  setSlideToDeleteIndex(null);
                  handleDeleteSlide(idx);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-sm cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
