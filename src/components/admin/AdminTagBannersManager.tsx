import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders,
  Plus,
  Edit3,
  Image as ImageIcon,
  Sparkles,
  Tag,
  CheckCircle,
  Trash2,
  Monitor,
  Smartphone,
  Layers,
  ArrowUpDown,
  ExternalLink,
  Flame,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { NavItem, TagCollectionSlide, WebsiteSettings } from '../../types';
import { TagBannerEditorModal } from './TagBannerEditorModal';
import { getTagSlides } from '../../utils/tagBannerDefaults';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../../lib/firebase';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { getEffectiveNavItems } from '../../data/defaultNavItems';

interface AdminTagBannersManagerProps {
  siteSettings: WebsiteSettings;
  onUpdateSettings: (newSettings: Partial<WebsiteSettings>) => Promise<void> | void;
  onSwitchToNavTab?: () => void;
}

interface TagBannerCardProps {
  navItem?: NavItem;
  tag: string;
  slides: TagCollectionSlide[];
  hasCustomConfig: boolean;
  previewDevice: 'desktop' | 'mobile';
  onOpenEditor: (tag: string) => void;
}

const TagBannerCard: React.FC<TagBannerCardProps> = ({
  navItem,
  tag,
  slides,
  hasCustomConfig,
  previewDevice,
  onOpenEditor,
}) => {
  const activeSlide = slides[0];
  const [resolvedDesktopImg, setResolvedDesktopImg] = useState<string | undefined>(() => {
    if (!activeSlide?.backgroundImage || activeSlide.backgroundImage.trim() === '') return undefined;
    if (activeSlide.backgroundImage.startsWith('media://')) {
      return getSynchronouslyResolvedMedia(activeSlide.backgroundImage) || undefined;
    }
    return getOptimizedImageUrl(activeSlide.backgroundImage, 1000);
  });
  const [resolvedMobileImg, setResolvedMobileImg] = useState<string | undefined>(() => {
    if (!activeSlide?.mobileBackgroundImage || activeSlide.mobileBackgroundImage.trim() === '') return undefined;
    if (activeSlide.mobileBackgroundImage.startsWith('media://')) {
      return getSynchronouslyResolvedMedia(activeSlide.mobileBackgroundImage) || undefined;
    }
    return getOptimizedImageUrl(activeSlide.mobileBackgroundImage, 600);
  });
  const [localDevice, setLocalDevice] = useState<'desktop' | 'mobile'>(previewDevice);

  // Sync with parent toggle if changed
  useEffect(() => {
    setLocalDevice(previewDevice);
  }, [previewDevice]);

  // Resolve background images
  useEffect(() => {
    let isMounted = true;
    if (activeSlide?.backgroundImage && activeSlide.backgroundImage.trim() !== '') {
      if (activeSlide.backgroundImage.startsWith('media://')) {
        const cached = getSynchronouslyResolvedMedia(activeSlide.backgroundImage);
        if (cached) {
          setResolvedDesktopImg(cached);
        } else {
          resolveOriginalImageMedia(activeSlide.backgroundImage).then((url) => {
            if (isMounted) setResolvedDesktopImg(url && url.trim() !== '' && !url.startsWith('media://') ? url : undefined);
          });
        }
      } else {
        setResolvedDesktopImg(getOptimizedImageUrl(activeSlide.backgroundImage, 1000));
      }
    } else {
      setResolvedDesktopImg(undefined);
    }

    if (activeSlide?.mobileBackgroundImage && activeSlide.mobileBackgroundImage.trim() !== '') {
      if (activeSlide.mobileBackgroundImage.startsWith('media://')) {
        const cachedMobile = getSynchronouslyResolvedMedia(activeSlide.mobileBackgroundImage);
        if (cachedMobile) {
          setResolvedMobileImg(cachedMobile);
        } else {
          resolveOriginalImageMedia(activeSlide.mobileBackgroundImage).then((url) => {
            if (isMounted) setResolvedMobileImg(url && url.trim() !== '' && !url.startsWith('media://') ? url : undefined);
          });
        }
      } else {
        setResolvedMobileImg(getOptimizedImageUrl(activeSlide.mobileBackgroundImage, 600));
      }
    } else {
      setResolvedMobileImg(undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [activeSlide?.backgroundImage, activeSlide?.mobileBackgroundImage]);

  const hasDesktopImage = Boolean(resolvedDesktopImg || (activeSlide?.backgroundImage && activeSlide.backgroundImage.trim() !== ''));
  const hasMobileImage = Boolean(resolvedMobileImg || (activeSlide?.mobileBackgroundImage && activeSlide.mobileBackgroundImage.trim() !== ''));

  // Active image to display based on device mode
  const currentImageToDisplay =
    localDevice === 'mobile'
      ? (resolvedMobileImg || resolvedDesktopImg)
      : (resolvedDesktopImg || resolvedMobileImg);

  const isNavDisabled = navItem && navItem.enabled === false;

  return (
    <div className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between group ${
      isNavDisabled
        ? 'border-slate-200 bg-slate-50/60 opacity-80'
        : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md'
    }`}>
      <div className="space-y-2.5">
        {/* Card Header with Priority Badge, Tag Title & Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {navItem && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
                #{navItem.priority ?? 1}
              </span>
            )}
            <span className="text-xs font-black text-slate-900 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs flex items-center gap-1.5 truncate">
              {navItem?.isHot ? (
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              ) : (
                <Tag className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              )}
              <span className="truncate">{tag}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {navItem?.isHot && (
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase text-white shadow-2xs ${navItem.badgeColor || 'bg-red-500'}`}>
                {navItem.badgeText || 'HOT'}
              </span>
            )}
            {hasCustomConfig && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                Customized
              </span>
            )}
            {/* Device Switcher for this Card */}
            <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setLocalDevice('desktop')}
                title="Desktop (PC) View"
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  localDevice === 'desktop'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Monitor className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setLocalDevice('mobile')}
                title="Mobile View"
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  localDevice === 'mobile'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Smartphone className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Banner Thumbnail Preview (Responsive Aspect Ratio & Crisp Image) */}
        <div
          className={`relative rounded-xl overflow-hidden text-white flex flex-col justify-center border border-slate-200/90 shadow-2xs transition-all ${
            localDevice === 'mobile' ? 'aspect-[16/9]' : 'aspect-[16/7]'
          } ${
            currentImageToDisplay
              ? 'bg-slate-950'
              : activeSlide?.gradientTheme === 'none'
              ? 'bg-slate-900'
              : `bg-gradient-to-r ${activeSlide?.gradientTheme || 'from-rose-600 via-red-600 to-amber-600'}`
          }`}
        >
          {/* Background Image */}
          {Boolean(currentImageToDisplay) && (
            <img
              src={currentImageToDisplay}
              alt={tag}
              className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 pointer-events-none"
              loading="lazy"
            />
          )}

          {/* Dark Overlay */}
          <div
            className="absolute inset-0 bg-slate-950 z-1 pointer-events-none"
            style={{ opacity: (activeSlide?.overlayOpacity ?? 25) / 100 }}
          />

          {/* Banner Text Content */}
          <div className="relative z-10 p-3 space-y-1">
            {activeSlide?.showBadge !== false && activeSlide?.badge && (
              <span className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs border border-white/20">
                {activeSlide.badge}
              </span>
            )}
            <h4 className="text-xs sm:text-sm font-black truncate drop-shadow-xs">
              {activeSlide?.title || tag}
            </h4>
            {activeSlide?.subtitle && (
              <p className="text-[10px] text-slate-200 line-clamp-1 opacity-90">
                {activeSlide.subtitle}
              </p>
            )}
          </div>

          {/* Device Indicator Pill on bottom right */}
          <div className="absolute bottom-1.5 right-1.5 z-20">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white/90 border border-white/10">
              {localDevice === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
            </span>
          </div>
        </div>

        {/* Media & Status Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5 pt-0.5">
          <span className="flex items-center gap-1 truncate">
            {navItem ? (
              navItem.enabled !== false ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>Header Nav #{navItem.priority}</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <EyeOff className="w-3 h-3 text-slate-400" />
                  <span>Hidden in Nav</span>
                </span>
              )
            ) : (
              <span>🏷️ Tag Collection</span>
            )}
          </span>
          <span className="truncate">
            {hasDesktopImage && hasMobileImage
              ? '📸 PC + 📱 Mobile'
              : hasDesktopImage
              ? '📸 Desktop Image'
              : hasMobileImage
              ? '📱 Mobile Image'
              : '🎨 Gradient Preset'}
          </span>
        </div>
      </div>

      {/* Edit Banner Button */}
      <button
        type="button"
        onClick={() => onOpenEditor(tag)}
        className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
      >
        <Edit3 className="w-3.5 h-3.5 text-amber-300" />
        <span>Edit {tag} Banner</span>
      </button>
    </div>
  );
};

export const AdminTagBannersManager: React.FC<AdminTagBannersManagerProps> = ({
  siteSettings,
  onUpdateSettings,
  onSwitchToNavTab,
}) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [globalPreviewDevice, setGlobalPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const tagBanners = siteSettings.tagCollectionBanners || {};

  // Retrieve effective nav items in priority order
  const effectiveNavItems = useMemo(() => {
    return getEffectiveNavItems(siteSettings.navigationItems);
  }, [siteSettings.navigationItems]);

  // Extract all unique tags/pages based strictly on Header Navigation Items + any custom tag banners
  const unifiedTagList = useMemo(() => {
    const list: { tag: string; navItem?: NavItem }[] = [];
    const seen = new Set<string>();

    // 1. Add all items from Header Navigation Bar in exact priority order
    for (const item of effectiveNavItems) {
      let tagKey = item.label;
      if (item.targetView.startsWith('tag:')) {
        tagKey = item.targetView.replace(/^tag:/, '').trim();
      } else if (item.targetView.startsWith('tag-')) {
        tagKey = item.targetView.replace(/^tag-/, '').trim();
      }
      const lower = tagKey.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push({ tag: tagKey, navItem: item });
      }
    }

    // 2. Add any additional custom configured tags in tagCollectionBanners not already in Header Nav
    for (const key of Object.keys(tagBanners)) {
      if (!seen.has(key.toLowerCase())) {
        seen.add(key.toLowerCase());
        // Capitalize nicely for display
        const displayTag = key.charAt(0).toUpperCase() + key.slice(1);
        list.push({ tag: displayTag });
      }
    }

    return list;
  }, [effectiveNavItems, tagBanners]);

  const handleOpenEditor = (tag: string) => {
    setEditingTag(tag);
    setIsEditorOpen(true);
  };

  const handleSaveBanner = async (tagKey: string, slides: TagCollectionSlide[]) => {
    const cleanKey = tagKey.trim().toLowerCase();
    const updatedTagBanners = {
      ...tagBanners,
      [cleanKey]: slides,
    };
    await onUpdateSettings({
      tagCollectionBanners: updatedTagBanners,
    });
  };

  const handleAddNewTag = async () => {
    const clean = newTagInput.trim();
    if (!clean) return;

    // Also add to header navigation items if not present
    const maxPriority = effectiveNavItems.reduce((max, i) => Math.max(max, Number(i.priority) || 0), 0);
    const newNavItem: NavItem = {
      id: `nav-custom-${Date.now()}`,
      label: clean,
      targetView: `tag:${clean}`,
      priority: maxPriority + 1,
      enabled: true,
    };

    const updatedNavItems = [...effectiveNavItems, newNavItem];
    await onUpdateSettings({
      navigationItems: updatedNavItems,
    });

    setNewTagInput('');
    setIsAddingTag(false);
    handleOpenEditor(clean);
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Top Header & Global Device Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Tag Collection Banners & Artwork Manager
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ⚡ Synced with Header Navigation ({effectiveNavItems.length} Items)
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tag Collection Banners are synchronized with your <strong>Header Navigation Bar & Priorities</strong>. All {effectiveNavItems.length} items (Trending, Flash Sale, New Arrivals, Deals, Best Sellers, etc.) are listed in their exact priority order so you can upload desktop & mobile artworks, customize headings, and configure buttons.
          </p>
        </div>

        {/* Global Device Preview Switcher & Add Button */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setGlobalPreviewDevice('desktop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                globalPreviewDevice === 'desktop'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop (PC)</span>
            </button>
            <button
              type="button"
              onClick={() => setGlobalPreviewDevice('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                globalPreviewDevice === 'mobile'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingTag((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Banner Collection</span>
          </button>
        </div>
      </div>

      {/* Quick Add Tag Bar */}
      {isAddingTag && (
        <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-sky-900 mb-1">
              New Navigation Item / Tag Name
            </label>
            <input
              type="text"
              placeholder="e.g. Smart Watches, Summer Special, Top Discounts"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNewTag();
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-sky-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-4">
            <button
              type="button"
              onClick={handleAddNewTag}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Create & Edit Banner
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingTag(false);
                setNewTagInput('');
              }}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Synchronized Banners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unifiedTagList.map(({ tag, navItem }) => {
          const slides = getTagSlides(tag, tagBanners);
          const hasCustomConfig = Boolean(tagBanners[tag.toLowerCase()]);

          return (
            <TagBannerCard
              key={`${tag}-${navItem?.id || 'custom'}`}
              tag={tag}
              navItem={navItem}
              slides={slides}
              hasCustomConfig={hasCustomConfig}
              previewDevice={globalPreviewDevice}
              onOpenEditor={handleOpenEditor}
            />
          );
        })}
      </div>

      {/* Editor Modal */}
      {editingTag && (
        <TagBannerEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTag(null);
          }}
          initialTag={editingTag}
          allTags={unifiedTagList.map((t) => t.tag)}
          tagCollectionBanners={tagBanners}
          onSaveBanner={handleSaveBanner}
        />
      )}
    </div>
  );
};
