import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sliders,
  Sparkles,
  Eye,
  CheckCircle,
  RotateCcw,
  Tag,
  ChevronLeft,
  ChevronRight,
  Move,
  Link as LinkIcon,
  Palette,
  Check,
  Monitor,
  Smartphone,
  Scaling,
  Lock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { TagCollectionSlide, TagCollectionButton, WebsiteSettings } from '../../types';
import { getDefaultTagSlides, getTagSlides } from '../../utils/tagBannerDefaults';
import { saveOriginalImageMedia, resolveOriginalImageMedia, compressImage, getSynchronouslyResolvedMedia } from '../../lib/firebase';
import { getOptimizedImageUrl, extractGoogleDriveFileId, handleImageError } from '../../utils/imageOptimizer';

interface TagBannerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTag: string;
  allTags?: string[];
  tagCollectionBanners?: Record<string, TagCollectionSlide[]>;
  onSaveBanner: (tagKey: string, slides: TagCollectionSlide[]) => Promise<void>;
  itemCount?: number;
}

const GRADIENT_PRESETS = [
  { name: 'None (No Gradient)', class: 'none' },
  { name: 'Rose & Amber (Flash Sale)', class: 'from-rose-600 via-red-600 to-amber-600' },
  { name: 'Sky & Indigo (New Arrivals)', class: 'from-sky-600 via-indigo-600 to-blue-700' },
  { name: 'Amber & Orange (Deals)', class: 'from-amber-600 via-amber-700 to-orange-700' },
  { name: 'Purple & Slate (Luxury)', class: 'from-purple-600 via-indigo-600 to-slate-900' },
  { name: 'Emerald & Teal (Fresh)', class: 'from-emerald-600 via-teal-700 to-cyan-900' },
  { name: 'Midnight Dark (Modern)', class: 'from-slate-900 via-slate-800 to-zinc-950' },
];

export const TagBannerEditorModal: React.FC<TagBannerEditorModalProps> = ({
  isOpen,
  onClose,
  initialTag,
  allTags = ['Flash Sale', 'New Arrivals', 'Deals', 'Shop', 'Xiaomi', 'Redmi', 'Gadgets', 'Hot Deals', 'Best Seller', 'Trending'],
  tagCollectionBanners = {},
  onSaveBanner,
  itemCount = 0,
}) => {
  const [selectedTag, setSelectedTag] = useState(initialTag || 'Flash Sale');
  const [customTagInput, setCustomTagInput] = useState('');
  const [slides, setSlides] = useState<TagCollectionSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [resolvedDesktopImg, setResolvedDesktopImg] = useState<string | undefined>();
  const [resolvedMobileImg, setResolvedMobileImg] = useState<string | undefined>();
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);

  // Dedicated URL inputs for easy editing, replacing and Google Drive pasting
  const [desktopUrlInput, setDesktopUrlInput] = useState('');
  const [mobileUrlInput, setMobileUrlInput] = useState('');

  const lastLoadedTagRef = useRef<string | null>(null);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialTag) {
      setSelectedTag(initialTag);
    }
  }, [initialTag]);

  // Load slides cleanly when modal opens or when selectedTag changes, WITHOUT resetting on parent re-renders
  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current || lastLoadedTagRef.current !== selectedTag) {
        const existing = getTagSlides(selectedTag, tagCollectionBanners, itemCount);
        setSlides(JSON.parse(JSON.stringify(existing)));
        setActiveSlideIndex(0);
        lastLoadedTagRef.current = selectedTag;
        wasOpenRef.current = true;
      }
    } else {
      wasOpenRef.current = false;
      lastLoadedTagRef.current = null;
    }
  }, [isOpen, selectedTag, tagCollectionBanners, itemCount]);

  // Resolve background images asynchronously for live preview rendering
  const currentSlide = slides[activeSlideIndex] || slides[0];

  // Synchronize text URL inputs when active slide changes
  useEffect(() => {
    if (currentSlide) {
      if (currentSlide.backgroundImage && !currentSlide.backgroundImage.startsWith('media://')) {
        setDesktopUrlInput(currentSlide.backgroundImage);
      } else {
        setDesktopUrlInput('');
      }

      if (currentSlide.mobileBackgroundImage && !currentSlide.mobileBackgroundImage.startsWith('media://')) {
        setMobileUrlInput(currentSlide.mobileBackgroundImage);
      } else {
        setMobileUrlInput('');
      }
    }
  }, [activeSlideIndex, slides.length]);

  useEffect(() => {
    let isMounted = true;
    if (currentSlide?.backgroundImage && currentSlide.backgroundImage.trim() !== '') {
      if (currentSlide.backgroundImage.startsWith('media://')) {
        resolveOriginalImageMedia(currentSlide.backgroundImage).then((url) => {
          if (isMounted) setResolvedDesktopImg(url && url.trim() !== '' ? url : undefined);
        });
      } else {
        setResolvedDesktopImg(getOptimizedImageUrl(currentSlide.backgroundImage, 1600));
      }
    } else {
      setResolvedDesktopImg(undefined);
    }

    if (currentSlide?.mobileBackgroundImage && currentSlide.mobileBackgroundImage.trim() !== '') {
      if (currentSlide.mobileBackgroundImage.startsWith('media://')) {
        resolveOriginalImageMedia(currentSlide.mobileBackgroundImage).then((url) => {
          if (isMounted) setResolvedMobileImg(url && url.trim() !== '' ? url : undefined);
        });
      } else {
        setResolvedMobileImg(getOptimizedImageUrl(currentSlide.mobileBackgroundImage, 1280));
      }
    } else {
      setResolvedMobileImg(undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [currentSlide?.backgroundImage, currentSlide?.mobileBackgroundImage]);

  if (!isOpen) return null;

  const updateCurrentSlide = (patch: Partial<TagCollectionSlide>) => {
    if (slides.length === 0) return;
    setSlides((prev) => {
      const next = [...prev];
      const idx = activeSlideIndex < next.length ? activeSlideIndex : 0;
      if (next[idx]) {
        next[idx] = { ...next[idx], ...patch };
      }
      return next;
    });
  };

  const handleAddSlide = () => {
    const newSlide: TagCollectionSlide = {
      id: `slide-${Date.now()}`,
      badge: `${selectedTag.toUpperCase()} SPECIAL`,
      title: `${selectedTag} Offer`,
      subtitle: 'Exclusive Collection & Nationwide Delivery',
      description: `Explore top deals tagged under ${selectedTag} with 100% verified stock and fast Cash on Delivery.`,
      itemCountText: `${itemCount > 0 ? itemCount : 12} Items Available`,
      stockStatusText: '100% Verified Stock',
      gradientTheme: 'from-rose-600 via-red-600 to-amber-600',
      overlayOpacity: 30,
      backgroundMode: 'gradient',
      horizontalAlign: 'left',
      verticalAlign: 'center',
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
      containerMaxWidth: 100,
      offsetX: 0,
      offsetY: 0,
      textColor: 'white',
      buttons: [{ id: `btn-${Date.now()}`, text: 'Shop Now', link: 'shop', variant: 'primary' }],
      showBadge: true,
      showTitle: true,
      showSubtitle: true,
      showDescription: true,
      showStats: true,
      desktopHeight: 'standard',
      mobileHeight: 'standard',
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  };

  const handleDeleteSlide = (index: number) => {
    const next = slides.filter((_, i) => i !== index);
    setSlides(next);
    if (next.length === 0) {
      setActiveSlideIndex(0);
    } else if (activeSlideIndex >= next.length) {
      setActiveSlideIndex(next.length - 1);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isMobile) setIsUploadingMobile(true);
    else setIsUploadingDesktop(true);

    try {
      // High-efficiency web compression (2048x1200 for desktop, 1280x720 for mobile 16:9 HD)
      const compressedBase64 = await compressImage(
        file,
        isMobile ? 1280 : 2048,
        isMobile ? 720 : 1200,
        0.92
      );
      if (compressedBase64) {
        const mediaId = `tag_bg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const mediaRef = await saveOriginalImageMedia(mediaId, compressedBase64);
        
        if (isMobile) {
          setResolvedMobileImg(compressedBase64);
          setMobileUrlInput('');
          updateCurrentSlide({
            mobileBackgroundImage: mediaRef,
            mobileHeight: currentSlide?.mobileHeight === 'custom' ? currentSlide.mobileHeight : 'hd_16_9',
            gradientTheme: 'none',
            backgroundMode: 'image',
          });
        } else {
          setResolvedDesktopImg(compressedBase64);
          setDesktopUrlInput('');
          updateCurrentSlide({
            backgroundImage: mediaRef,
            gradientTheme: 'none',
            backgroundMode: 'image',
          });
        }
      }
    } catch (err) {
      console.error('Error handling banner image upload:', err);
    } finally {
      if (isMobile) setIsUploadingMobile(false);
      else setIsUploadingDesktop(false);
      // Reset input value so re-selecting same file works
      e.target.value = '';
    }
  };

  const handleApplyImageUrl = (inputUrl: string, isMobile: boolean = false) => {
    const trimmed = inputUrl.trim();
    if (isMobile) setMobileUrlInput(trimmed);
    else setDesktopUrlInput(trimmed);

    if (!trimmed) {
      if (isMobile) {
        setResolvedMobileImg(undefined);
        updateCurrentSlide({ mobileBackgroundImage: undefined });
      } else {
        setResolvedDesktopImg(undefined);
        updateCurrentSlide({ backgroundImage: undefined });
      }
      return;
    }

    // Convert Google Drive sharing link if provided to ultra-fast CDN streaming endpoint
    let finalUrl = trimmed;
    const driveId = extractGoogleDriveFileId(trimmed);
    if (driveId) {
      finalUrl = isMobile
        ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1280`
        : `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
    }

    if (isMobile) {
      setResolvedMobileImg(finalUrl);
      updateCurrentSlide({
        mobileBackgroundImage: finalUrl,
        mobileHeight: currentSlide?.mobileHeight === 'custom' ? currentSlide.mobileHeight : 'hd_16_9',
        gradientTheme: 'none',
        backgroundMode: 'image',
      });
    } else {
      setResolvedDesktopImg(finalUrl);
      updateCurrentSlide({
        backgroundImage: finalUrl,
        gradientTheme: 'none',
        backgroundMode: 'image',
      });
    }
  };

  const handleRemoveImage = (isMobile: boolean = false) => {
    if (isMobile) {
      setResolvedMobileImg(undefined);
      setMobileUrlInput('');
      updateCurrentSlide({ mobileBackgroundImage: undefined });
    } else {
      setResolvedDesktopImg(undefined);
      setDesktopUrlInput('');
      updateCurrentSlide({ backgroundImage: undefined });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Auto-commit any pending URL changes before saving to prevent lost changes
      const currentSlidesCopy = [...slides];
      const idx = activeSlideIndex < currentSlidesCopy.length ? activeSlideIndex : 0;
      if (currentSlidesCopy[idx]) {
        let slideUpdated = false;
        const currentSlideObj = { ...currentSlidesCopy[idx] };

        if (desktopUrlInput && desktopUrlInput.trim() !== '') {
          const trimmedDesk = desktopUrlInput.trim();
          let finalDeskUrl = trimmedDesk;
          const driveId = extractGoogleDriveFileId(trimmedDesk);
          if (driveId) {
            finalDeskUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
          }
          if (currentSlideObj.backgroundImage !== finalDeskUrl) {
            currentSlideObj.backgroundImage = finalDeskUrl;
            currentSlideObj.gradientTheme = 'none';
            currentSlideObj.backgroundMode = 'image';
            slideUpdated = true;
          }
        }

        if (mobileUrlInput && mobileUrlInput.trim() !== '') {
          const trimmedMob = mobileUrlInput.trim();
          let finalMobUrl = trimmedMob;
          const driveId = extractGoogleDriveFileId(trimmedMob);
          if (driveId) {
            finalMobUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1280`;
          }
          if (currentSlideObj.mobileBackgroundImage !== finalMobUrl) {
            currentSlideObj.mobileBackgroundImage = finalMobUrl;
            currentSlideObj.mobileHeight = currentSlideObj.mobileHeight === 'custom' ? currentSlideObj.mobileHeight : 'hd_16_9';
            currentSlideObj.gradientTheme = 'none';
            currentSlideObj.backgroundMode = 'image';
            slideUpdated = true;
          }
        }

        if (slideUpdated) {
          currentSlidesCopy[idx] = currentSlideObj;
          setSlides(currentSlidesCopy);
        }
      }

      const tagKey = selectedTag.trim().toLowerCase();
      await onSaveBanner(tagKey, currentSlidesCopy);
      setToastMessage('Banner configuration saved permanently!');
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving banner:', err);
      alert('Failed to save banner settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (confirm(`Reset ${selectedTag} banner to original default text and theme?`)) {
      const defaults = getDefaultTagSlides(selectedTag, itemCount);
      setSlides(defaults);
      setActiveSlideIndex(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>Edit Collection Hero Banner</span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-xs font-bold">
                  {selectedTag}
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Customize text, uploaded background images, positions, buttons, and visibility.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {toastMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Tag Selector & Switcher */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-600" />
              <span>Select Collection / Tag to Edit</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((t) => (
                <button
                  key={`tag_tab_${t}`}
                  type="button"
                  onClick={() => setSelectedTag(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTag.toLowerCase() === t.toLowerCase()
                      ? 'bg-slate-900 text-white shadow-md ring-2 ring-sky-500'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Or type custom tag name (e.g. Winter Offer, Xiaomi, etc.)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (customTagInput.trim()) {
                    setSelectedTag(customTagInput.trim());
                    setCustomTagInput('');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer shrink-0"
              >
                Set Tag
              </button>
            </div>
          </div>

          {/* Slide Tabs Navigation (Add / Delete Slides) */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-600 shrink-0">Slides ({slides.length}):</span>
              {slides.map((s, idx) => (
                <div key={s.id || idx} className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeSlideIndex === idx
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Slide #{idx + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(idx)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSlide}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Slide</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* If 0 slides remain */}
          {slides.length === 0 ? (
            <div className="p-8 bg-amber-50 rounded-3xl border-2 border-dashed border-amber-300 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-extrabold text-base text-amber-900">Hero Banner Disabled (0 Slides)</h3>
                <p className="text-xs text-amber-800">
                  You have deleted all slides for <strong>{selectedTag}</strong>. When saved, the hero banner will be completely hidden on the store page (no background color or image box will take up space, and products will start right at the top).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSlide}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Slide 1</span>
              </button>
            </div>
          ) : (
            <>
              {/* Live Preview of Current Slide with Desktop / Mobile Device Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-sky-600" />
                    <span>Live Slide Preview</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        previewDevice === 'desktop'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      <span>Desktop Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        previewDevice === 'mobile'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile Preview</span>
                    </button>
                  </div>
                </div>

                {previewDevice === 'desktop' ? (
                  <div
                    className={`relative rounded-3xl overflow-hidden text-white shadow-xl transition-all border border-slate-200 flex flex-col ${
                      (resolvedDesktopImg || resolvedMobileImg || currentSlide.backgroundImage)
                        ? 'bg-slate-950'
                        : currentSlide.gradientTheme === 'none'
                        ? 'bg-slate-900'
                        : `bg-gradient-to-r ${currentSlide.gradientTheme || 'from-rose-600 via-red-600 to-amber-600'}`
                    }`}
                    style={{
                      minHeight: currentSlide.desktopHeight === 'custom' && currentSlide.desktopCustomHeight
                        ? `${currentSlide.desktopCustomHeight}px`
                        : currentSlide.desktopHeight === 'compact'
                        ? '180px'
                        : currentSlide.desktopHeight === 'tall'
                        ? '380px'
                        : currentSlide.desktopHeight === 'extra_tall'
                        ? '500px'
                        : '280px'
                    }}
                  >
                    {/* Desktop Background Image */}
                    {Boolean((resolvedDesktopImg && resolvedDesktopImg.trim() !== '') || (resolvedMobileImg && resolvedMobileImg.trim() !== '')) && (
                      <img
                        src={(resolvedDesktopImg && resolvedDesktopImg.trim() !== '') ? resolvedDesktopImg : resolvedMobileImg}
                        alt="Slide Background"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        style={{ zIndex: 0 }}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, currentSlide.backgroundImage || resolvedDesktopImg)}
                      />
                    )}

                    {/* Dark Overlay Mask */}
                    <div
                      className="absolute inset-0 bg-slate-950 pointer-events-none transition-opacity"
                      style={{ opacity: (currentSlide.overlayOpacity ?? 20) / 100, zIndex: 1 }}
                    />

                    {/* Content Container */}
                    <div
                      className={`relative flex-1 flex flex-col w-full space-y-2.5 transition-all ${
                        currentSlide.verticalAlign === 'top'
                          ? 'justify-start'
                          : currentSlide.verticalAlign === 'bottom'
                          ? 'justify-end'
                          : 'justify-center'
                      } ${
                        currentSlide.horizontalAlign === 'center'
                          ? 'items-center text-center mx-auto'
                          : currentSlide.horizontalAlign === 'right'
                          ? 'items-end text-right ml-auto'
                          : 'items-start text-left'
                      }`}
                      style={{
                        paddingTop: `${currentSlide.paddingTop ?? 24}px`,
                        paddingBottom: `${currentSlide.paddingBottom ?? 24}px`,
                        paddingLeft: `${currentSlide.paddingLeft ?? 24}px`,
                        paddingRight: `${currentSlide.paddingRight ?? 24}px`,
                        maxWidth: `${currentSlide.containerMaxWidth ?? 100}%`,
                        transform: `translate(${currentSlide.offsetX || 0}%, ${currentSlide.offsetY || 0}%)`,
                        zIndex: 10,
                      }}
                    >
                      {currentSlide.showBadge !== false && currentSlide.badge && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-black tracking-wide border border-white/20 uppercase">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{currentSlide.badge}</span>
                        </div>
                      )}

                      {currentSlide.showTitle !== false && (
                        <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                          {currentSlide.title || `${selectedTag} Collection`}
                        </h3>
                      )}

                      {currentSlide.showSubtitle !== false && currentSlide.subtitle && (
                        <p className="text-xs sm:text-sm text-amber-300 font-bold">
                          {currentSlide.subtitle}
                        </p>
                      )}

                      {currentSlide.showDescription !== false && currentSlide.description && (
                        <p className="text-xs text-white/90 leading-relaxed max-w-xl font-medium">
                          {currentSlide.description}
                        </p>
                      )}

                      {currentSlide.showBengaliText && currentSlide.bengaliText && (
                        <p className="text-xs text-amber-200 font-medium">
                          {currentSlide.bengaliText}
                        </p>
                      )}

                      {currentSlide.buttons && currentSlide.buttons.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {currentSlide.buttons.map((btn) => (
                            <button
                              key={btn.id}
                              type="button"
                              className={`px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-transform active:scale-95 ${
                                btn.variant === 'whatsapp'
                                  ? 'bg-emerald-500 text-white'
                                  : btn.variant === 'outline'
                                  ? 'border border-white/60 bg-white/10 text-white'
                                  : 'bg-white text-slate-900'
                              }`}
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {currentSlide.showStats !== false && (Boolean(currentSlide.itemCountText) || Boolean(currentSlide.stockStatusText)) && (
                        <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold text-white/80">
                          {Boolean(currentSlide.itemCountText) && (
                            <span className="bg-black/30 px-2.5 py-0.5 rounded-lg">
                              {currentSlide.itemCountText}
                            </span>
                          )}
                          {Boolean(currentSlide.stockStatusText) && (
                            <span className="bg-black/30 px-2.5 py-0.5 rounded-lg text-emerald-300">
                              ✓ {currentSlide.stockStatusText}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-900 rounded-3xl border-4 border-slate-700 max-w-[360px] mx-auto shadow-2xl">
                    <div className="flex items-center justify-between px-1 pb-2 text-[11px] font-bold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                        Mobile Phone Screen
                      </span>
                      <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30 font-mono text-[10px]">
                        1280 × 720 (16:9 HD)
                      </span>
                    </div>
                    <div
                      className={`relative rounded-2xl overflow-hidden text-white transition-all border border-slate-700 flex flex-col w-full ${
                        (resolvedMobileImg || resolvedDesktopImg || currentSlide.mobileBackgroundImage || currentSlide.backgroundImage)
                          ? 'bg-slate-950'
                          : currentSlide.gradientTheme === 'none'
                          ? 'bg-slate-900'
                          : `bg-gradient-to-r ${currentSlide.gradientTheme || 'from-rose-600 via-red-600 to-amber-600'}`
                      } ${
                        currentSlide.mobileHeight === 'compact'
                          ? 'min-h-[130px]'
                          : currentSlide.mobileHeight === 'tall'
                          ? 'min-h-[280px]'
                          : currentSlide.mobileHeight === 'extra_tall'
                          ? 'min-h-[360px]'
                          : currentSlide.mobileHeight === 'custom' && currentSlide.mobileCustomHeight
                          ? ''
                          : 'aspect-[16/9]'
                      }`}
                      style={{
                        ...(currentSlide.mobileHeight === 'custom' && currentSlide.mobileCustomHeight
                          ? { minHeight: `${currentSlide.mobileCustomHeight}px` }
                          : {})
                      }}
                    >
                      {/* Mobile Background Image or Fallback */}
                      {Boolean((resolvedMobileImg && resolvedMobileImg.trim() !== '') || (resolvedDesktopImg && resolvedDesktopImg.trim() !== '')) && (
                        <img
                          src={(resolvedMobileImg && resolvedMobileImg.trim() !== '') ? resolvedMobileImg : resolvedDesktopImg}
                          alt="Mobile Slide Background"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ zIndex: 0 }}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, currentSlide.mobileBackgroundImage || resolvedMobileImg)}
                        />
                      )}

                      {/* Dark Overlay Mask */}
                      <div
                        className="absolute inset-0 bg-slate-950 pointer-events-none transition-opacity"
                        style={{ opacity: (currentSlide.overlayOpacity ?? 20) / 100, zIndex: 1 }}
                      />

                      {/* Positioned Content Container */}
                      <div
                        className={`relative flex-1 flex flex-col w-full space-y-1.5 transition-all ${
                          currentSlide.verticalAlign === 'top'
                            ? 'justify-start'
                            : currentSlide.verticalAlign === 'bottom'
                            ? 'justify-end'
                            : 'justify-center'
                        } ${
                          currentSlide.horizontalAlign === 'center'
                            ? 'items-center text-center mx-auto'
                            : currentSlide.horizontalAlign === 'right'
                            ? 'items-end text-right ml-auto'
                            : 'items-start text-left'
                        }`}
                        style={{
                          paddingTop: `${currentSlide.paddingTop ?? 16}px`,
                          paddingBottom: `${currentSlide.paddingBottom ?? 16}px`,
                          paddingLeft: `${currentSlide.paddingLeft ?? 16}px`,
                          paddingRight: `${currentSlide.paddingRight ?? 16}px`,
                          maxWidth: `${currentSlide.containerMaxWidth ?? 100}%`,
                          transform: `translate(${currentSlide.offsetX || 0}%, ${currentSlide.offsetY || 0}%)`,
                          zIndex: 10,
                        }}
                      >
                        {currentSlide.showBadge !== false && currentSlide.badge && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                            <span>{currentSlide.badge}</span>
                          </div>
                        )}

                        {currentSlide.showTitle !== false && (
                          <h3 className="text-base font-black text-white tracking-tight leading-snug">
                            {currentSlide.title || `${selectedTag} Collection`}
                          </h3>
                        )}

                        {currentSlide.showSubtitle !== false && currentSlide.subtitle && (
                          <p className="text-[10px] text-amber-300 font-bold">
                            {currentSlide.subtitle}
                          </p>
                        )}

                        {currentSlide.showDescription !== false && currentSlide.description && (
                          <p className="text-[10px] text-white/90 leading-tight font-medium line-clamp-2">
                            {currentSlide.description}
                          </p>
                        )}

                        {currentSlide.buttons && currentSlide.buttons.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {currentSlide.buttons.map((btn) => (
                              <button
                                key={btn.id}
                                type="button"
                                className="px-3 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-900"
                              >
                                {btn.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

          {/* Form Controls for Active Slide */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left Column: Text Content & Visibility Toggles */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                <span>1. Text & Content Editing</span>
              </h4>

              {/* Badge Input & Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Badge Text</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSlide.showBadge !== false}
                      onChange={(e) => updateCurrentSlide({ showBadge: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Badge</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={currentSlide.badge || ''}
                  onChange={(e) => updateCurrentSlide({ badge: e.target.value })}
                  placeholder="e.g. FLASH SALE, NEW ARRIVALS..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Title Input & Toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Banner Title</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSlide.showTitle !== false}
                      onChange={(e) => updateCurrentSlide({ showTitle: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Title</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={currentSlide.title || ''}
                  onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                  placeholder="e.g. Flash Sale Collection..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Subtitle Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Subtitle</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSlide.showSubtitle !== false}
                      onChange={(e) => updateCurrentSlide({ showSubtitle: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Subtitle</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={currentSlide.subtitle || ''}
                  onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })}
                  placeholder="e.g. Limited Time Offer..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSlide.showDescription !== false}
                      onChange={(e) => updateCurrentSlide({ showDescription: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Description</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={currentSlide.description || ''}
                  onChange={(e) => updateCurrentSlide({ description: e.target.value })}
                  placeholder="Enter full banner description..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
                />
              </div>

              {/* Bengali / Secondary Text Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Secondary Description</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(currentSlide.showBengaliText)}
                      onChange={(e) => updateCurrentSlide({ showBengaliText: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Secondary Text</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={currentSlide.bengaliText || ''}
                  onChange={(e) => updateCurrentSlide({ bengaliText: e.target.value })}
                  placeholder="Enter secondary banner note or description..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Stats Labels & Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Stats Badges Management</label>
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSlide.showStats !== false}
                      onChange={(e) => updateCurrentSlide({ showStats: e.target.checked })}
                      className="rounded-md text-sky-600"
                    />
                    <span>Show Stats Section</span>
                  </label>
                </div>
                {currentSlide.showStats !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">Stat #1</label>
                        {currentSlide.itemCountText !== undefined && currentSlide.itemCountText !== '' ? (
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ itemCountText: '' })}
                            className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                          >
                            Remove Stat #1
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ itemCountText: `${itemCount > 0 ? itemCount : 14} Items Available` })}
                            className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                          >
                            + Add Stat #1
                          </button>
                        )}
                      </div>
                      {currentSlide.itemCountText !== undefined && currentSlide.itemCountText !== '' ? (
                        <input
                          type="text"
                          value={currentSlide.itemCountText}
                          onChange={(e) => updateCurrentSlide({ itemCountText: e.target.value })}
                          placeholder="e.g. 14 Items Available"
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-medium"
                        />
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Stat #1 is hidden / removed.</p>
                      )}
                    </div>

                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-800">Stat #2</label>
                        {currentSlide.stockStatusText !== undefined && currentSlide.stockStatusText !== '' ? (
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ stockStatusText: '' })}
                            className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                          >
                            Remove Stat #2
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateCurrentSlide({ stockStatusText: '100% Verified Stock' })}
                            className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                          >
                            + Add Stat #2
                          </button>
                        )}
                      </div>
                      {currentSlide.stockStatusText !== undefined && currentSlide.stockStatusText !== '' ? (
                        <input
                          type="text"
                          value={currentSlide.stockStatusText}
                          onChange={(e) => updateCurrentSlide({ stockStatusText: e.target.value })}
                          placeholder="e.g. 100% Verified Stock"
                          className="w-full px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-medium"
                        />
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Stat #2 is hidden / removed.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Background Style, Image Uploads, 4-Directional Sizing & Positioning */}
            <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-2">
                <span>2. Background Style & 4-Directional Layout</span>
                <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {Boolean(currentSlide.backgroundImage || currentSlide.mobileBackgroundImage)
                    ? '🖼️ Image Mode'
                    : '🎨 Gradient Mode'}
                </span>
              </h4>

              {/* Background Style Mode Switcher (Mutual Exclusivity) */}
              <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                  <span>Background Theme & Style</span>
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSlide({ backgroundMode: 'image', gradientTheme: 'none' });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      Boolean(currentSlide.backgroundImage || currentSlide.mobileBackgroundImage) || currentSlide.backgroundMode === 'image'
                        ? 'bg-slate-900 text-white shadow-md ring-2 ring-sky-500'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Custom Image Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSlide({
                        backgroundMode: 'gradient',
                        backgroundImage: undefined,
                        mobileBackgroundImage: undefined,
                        gradientTheme: currentSlide.gradientTheme && currentSlide.gradientTheme !== 'none'
                          ? currentSlide.gradientTheme
                          : 'from-rose-600 via-red-600 to-amber-600',
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !currentSlide.backgroundImage && !currentSlide.mobileBackgroundImage && (currentSlide.backgroundMode === 'gradient' || (currentSlide.gradientTheme && currentSlide.gradientTheme !== 'none'))
                        ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Gradient Theme Mode</span>
                  </button>
                </div>
              </div>

              {/* Dual Image Uploads (Desktop & Mobile) - Supports Device Upload, Google Drive, & Direct URLs */}
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-600" />
                    <span>Custom Uploaded Images</span>
                  </label>
                  {Boolean(currentSlide.backgroundImage || currentSlide.mobileBackgroundImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSlide({
                          backgroundImage: undefined,
                          mobileBackgroundImage: undefined,
                          backgroundMode: 'gradient',
                          gradientTheme: 'from-rose-600 via-red-600 to-amber-600',
                        });
                        setResolvedDesktopImg(undefined);
                        setResolvedMobileImg(undefined);
                      }}
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear All Images</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {/* Desktop Image Box */}
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-slate-700" />
                        <span>Desktop Hero Image</span>
                      </span>
                      {currentSlide.backgroundImage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(false)}
                          className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Device Upload Button */}
                    <div>
                      <label
                        className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs ${
                          isUploadingDesktop
                            ? 'bg-slate-700 opacity-80 cursor-wait'
                            : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.99]'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isUploadingDesktop
                            ? 'Uploading & Processing HD...'
                            : currentSlide.backgroundImage
                            ? 'Change Device Photo'
                            : 'Upload from Device (PC/Phone)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingDesktop}
                          onChange={(e) => handleImageUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Divider with 'OR' */}
                    <div className="relative flex items-center justify-center my-0.5">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-slate-50/90 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider absolute">
                        or Google Drive / Direct URL
                      </span>
                    </div>

                    {/* Google Drive or Direct URL Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 flex items-center">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none shrink-0" />
                          <input
                            type="url"
                            placeholder="Paste Google Drive or image URL..."
                            value={desktopUrlInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDesktopUrlInput(val);
                              if (val.includes('drive.google.com') || val.startsWith('http://') || val.startsWith('https://')) {
                                handleApplyImageUrl(val, false);
                              }
                            }}
                            onBlur={() => handleApplyImageUrl(desktopUrlInput, false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyImageUrl(desktopUrlInput, false);
                              }
                            }}
                            className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-1.5 focus:ring-sky-500 focus:border-sky-500 shadow-2xs placeholder:text-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyImageUrl(desktopUrlInput, false)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          Set Image
                        </button>
                      </div>

                      {/* Source Type & Drive Badge */}
                      {extractGoogleDriveFileId(desktopUrlInput) ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Google Drive (ID: {extractGoogleDriveFileId(desktopUrlInput)?.slice(0, 10)}...) - HD Ready
                          </span>
                        </div>
                      ) : currentSlide.backgroundImage ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {currentSlide.backgroundImage.startsWith('media://') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              Device Uploaded (Stored in DB)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-sky-600" />
                              Web Photo URL
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Image Preview Box */}
                    {resolvedDesktopImg ? (
                      <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group">
                        <img
                          src={resolvedDesktopImg}
                          alt="Desktop preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, currentSlide.backgroundImage || resolvedDesktopImg)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="text-[10px] text-white font-medium bg-black/70 px-2 py-0.5 rounded">
                            Desktop HD Preview
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(false)}
                            className="text-[10px] text-rose-200 hover:text-white font-bold bg-rose-600/80 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold backdrop-blur-xs">
                          Desktop View
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">No desktop image uploaded or linked.</p>
                    )}

                    <p className="text-[10px] text-slate-500">
                      📐 Recommended: 1920x600 px or 16:9 widescreen HD.
                    </p>
                  </div>

                  {/* Mobile Image Box */}
                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                        <span>Mobile Hero Image</span>
                      </span>
                      {currentSlide.mobileBackgroundImage && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(true)}
                          className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Device Upload Button */}
                    <div>
                      <label
                        className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs ${
                          isUploadingMobile
                            ? 'bg-sky-700 opacity-80 cursor-wait'
                            : 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99]'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {isUploadingMobile
                            ? 'Processing 1280x720 HD...'
                            : currentSlide.mobileBackgroundImage
                            ? 'Change Mobile Photo (1280x720)'
                            : 'Upload Mobile Photo (1280x720)'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingMobile}
                          onChange={(e) => handleImageUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Divider with 'OR' */}
                    <div className="relative flex items-center justify-center my-0.5">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-slate-50/90 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider absolute">
                        or Google Drive / Direct URL
                      </span>
                    </div>

                    {/* Google Drive or Direct URL Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 flex items-center">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none shrink-0" />
                          <input
                            type="url"
                            placeholder="Paste Google Drive or image URL (1280x720)..."
                            value={mobileUrlInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMobileUrlInput(val);
                              if (val.includes('drive.google.com') || val.startsWith('http://') || val.startsWith('https://')) {
                                handleApplyImageUrl(val, true);
                              }
                            }}
                            onBlur={() => handleApplyImageUrl(mobileUrlInput, true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyImageUrl(mobileUrlInput, true);
                              }
                            }}
                            className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-1.5 focus:ring-sky-500 focus:border-sky-500 shadow-2xs placeholder:text-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyImageUrl(mobileUrlInput, true)}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          Set Image
                        </button>
                      </div>

                      {/* Source Type & Drive Badge */}
                      {extractGoogleDriveFileId(mobileUrlInput) ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Google Drive (ID: {extractGoogleDriveFileId(mobileUrlInput)?.slice(0, 10)}...) - 1280x720 Ready
                          </span>
                        </div>
                      ) : currentSlide.mobileBackgroundImage ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {currentSlide.mobileBackgroundImage.startsWith('media://') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              Device Uploaded (1280x720 HD Stored)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-sky-600" />
                              Web Photo URL
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Image Preview Box */}
                    {resolvedMobileImg ? (
                      <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-300 bg-slate-900 group">
                        <img
                          src={resolvedMobileImg}
                          alt="Mobile preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, currentSlide.mobileBackgroundImage || resolvedMobileImg)}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="text-[10px] text-white font-medium bg-black/70 px-2 py-0.5 rounded">
                            1280×720 Mobile Preview
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(true)}
                            className="text-[10px] text-rose-200 hover:text-white font-bold bg-rose-600/80 px-2 py-0.5 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-sky-700/90 text-white text-[9px] font-bold backdrop-blur-xs font-mono">
                          1280 × 720 (16:9)
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Falls back to desktop image if empty.</p>
                    )}

                    <p className="text-[10px] text-sky-700 font-medium">
                      📱 <strong>Recommended Mobile Size: 1280 × 720 px</strong> (16:9 Widescreen HD).
                    </p>
                  </div>
                </div>

                {/* Helpful guidance banner */}
                <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-100 text-[11px] text-sky-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sky-900">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Photo Source Options & Quality Assurance</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[10.5px]">
                    • <strong>Google Drive Links</strong>: গুগল ড্রাইভ থেকে ফটোর লিঙ্ক দিয়ে ব্যবহার করতে ড্রাইভের শেয়ার অপশন &apos;Anyone with the link can view&apos; করুন। লিঙ্ক পেস্ট করলেই তা স্বয়ংক্রিয়ভাবে আল্ট্রা-ফাস্ট গুগল CDN স্ট্রিমে কনভার্ট হবে।
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[10.5px]">
                    • <strong>Device File Upload</strong>: ডিভাইস থেকে আপলোডকৃত ছবি ফুল এইচডি কোয়ালিটিতে ক্লাউড ডাটাবেজে স্থায়ীভাবে সেভ থাকে, যা রিলোড বা যেকোনো ডিভাইসে হারিয়ে যাবে না।
                  </p>
                  <p className="text-slate-600 leading-relaxed text-[10.5px]">
                    • <strong>Direct Image URL</strong>: যেকোনো পাবলিক ডিরেক্ট ওয়েব ইমেজ লিঙ্ক (Imgur, Unsplash, Cloudinary ইত্যাদি) এখানে সরাসরি ব্যবহার করতে পারবেন।
                  </p>
                </div>
              </div>

              {/* Color Gradient Theme Selector (Mutually Exclusive: Disabled if Image Uploaded) */}
              <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-rose-600" />
                    <span>Color Gradient Theme</span>
                  </label>
                  {Boolean(currentSlide.backgroundImage || currentSlide.mobileBackgroundImage) && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Image Active
                    </span>
                  )}
                </div>

                {Boolean(currentSlide.backgroundImage || currentSlide.mobileBackgroundImage) ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <span>🔒 Gradient selection disabled while custom image is active.</span>
                    </p>
                    <p className="text-[10px] text-amber-700">
                      Selecting a gradient theme will clear your uploaded background images so the gradient is visible cleanly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSlide({
                          backgroundImage: undefined,
                          mobileBackgroundImage: undefined,
                          backgroundMode: 'gradient',
                          gradientTheme: 'from-rose-600 via-red-600 to-amber-600',
                        });
                      }}
                      className="mt-1 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] cursor-pointer"
                    >
                      Remove Images & Choose Gradient Theme
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    {GRADIENT_PRESETS.map((p) => (
                      <button
                        key={p.class}
                        type="button"
                        onClick={() => updateCurrentSlide({ gradientTheme: p.class, backgroundMode: 'gradient' })}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-left flex items-center gap-2 cursor-pointer ${
                          currentSlide.gradientTheme === p.class
                            ? 'border-sky-600 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border border-slate-300 ${p.class === 'none' ? 'bg-slate-800' : `bg-gradient-to-r ${p.class}`}`} />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Overlay Opacity Slider */}
              <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Background Overlay Darkness</span>
                  <span className="text-sky-600 font-black">{currentSlide.overlayOpacity ?? 20}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentSlide.overlayOpacity ?? 20}
                  onChange={(e) => updateCurrentSlide({ overlayOpacity: parseInt(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 italic">Set to 0% for full bright image with no darkening mask.</p>
              </div>

              {/* 4-Directional Sizing, Padding & Position Customization */}
              <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Maximize2 className="w-4 h-4 text-purple-600" />
                  <span>4-Directional Sizing & Spacing Controls</span>
                </label>

                {/* Banner Heights (Y-Axis) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-slate-700" />
                      Desktop Height
                    </span>
                    <span className="text-[11px] font-extrabold text-sky-600">
                      {currentSlide.desktopHeight === 'custom'
                        ? `${currentSlide.desktopCustomHeight || 280}px`
                        : (currentSlide.desktopHeight || 'standard').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'compact', label: 'Compact' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'tall', label: 'Tall' },
                      { id: 'extra_tall', label: 'Extra Tall' },
                      { id: 'custom', label: 'Custom' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCurrentSlide({ desktopHeight: opt.id as any })}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                          (currentSlide.desktopHeight || 'standard') === opt.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {currentSlide.desktopHeight === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min="100"
                        max="800"
                        step="10"
                        value={currentSlide.desktopCustomHeight || 280}
                        onChange={(e) => updateCurrentSlide({ desktopCustomHeight: parseInt(e.target.value) })}
                        className="flex-1 accent-slate-900 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 w-12 text-right">
                        {currentSlide.desktopCustomHeight || 280}px
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Height */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                      Mobile Height
                    </span>
                    <span className="text-[11px] font-extrabold text-sky-600">
                      {currentSlide.mobileHeight === 'custom'
                        ? `${currentSlide.mobileCustomHeight || 200}px`
                        : (currentSlide.mobileHeight || 'standard').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                    {[
                      { id: 'hd_16_9', label: '1280×720 (16:9)' },
                      { id: 'standard', label: 'Standard' },
                      { id: 'compact', label: 'Compact' },
                      { id: 'tall', label: 'Tall' },
                      { id: 'extra_tall', label: 'Extra Tall' },
                      { id: 'custom', label: 'Custom' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateCurrentSlide({ mobileHeight: opt.id as any })}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer text-center ${
                          (currentSlide.mobileHeight || 'hd_16_9') === opt.id
                            ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-500'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {currentSlide.mobileHeight === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min="80"
                        max="600"
                        step="10"
                        value={currentSlide.mobileCustomHeight || 200}
                        onChange={(e) => updateCurrentSlide({ mobileCustomHeight: parseInt(e.target.value) })}
                        className="flex-1 accent-sky-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-sky-700 w-12 text-right">
                        {currentSlide.mobileCustomHeight || 200}px
                      </span>
                    </div>
                  )}
                </div>

                {/* Container Max Width (X-Axis %) */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Container Max Width (X-Axis %)</span>
                    <span className="text-purple-700 font-extrabold">{currentSlide.containerMaxWidth ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={currentSlide.containerMaxWidth ?? 100}
                    onChange={(e) => updateCurrentSlide({ containerMaxWidth: parseInt(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* 4-Directional Paddings Grid (Top, Bottom, Left, Right) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>4-Way Padding Controls</span>
                    <button
                      type="button"
                      onClick={() => updateCurrentSlide({ paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 })}
                      className="text-[10px] text-sky-600 font-bold hover:underline cursor-pointer"
                    >
                      Reset Paddings
                    </button>
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Top Padding */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <ArrowUp className="w-3 h-3 text-purple-600" />
                          Top Padding
                        </span>
                        <span className="font-extrabold text-purple-700 text-[11px]">
                          {currentSlide.paddingTop ?? 24}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={currentSlide.paddingTop ?? 24}
                        onChange={(e) => updateCurrentSlide({ paddingTop: parseInt(e.target.value) })}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>

                    {/* Bottom Padding */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <ArrowDown className="w-3 h-3 text-purple-600" />
                          Bottom Padding
                        </span>
                        <span className="font-extrabold text-purple-700 text-[11px]">
                          {currentSlide.paddingBottom ?? 24}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={currentSlide.paddingBottom ?? 24}
                        onChange={(e) => updateCurrentSlide({ paddingBottom: parseInt(e.target.value) })}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>

                    {/* Left Padding */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <ArrowLeft className="w-3 h-3 text-purple-600" />
                          Left Padding
                        </span>
                        <span className="font-extrabold text-purple-700 text-[11px]">
                          {currentSlide.paddingLeft ?? 24}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={currentSlide.paddingLeft ?? 24}
                        onChange={(e) => updateCurrentSlide({ paddingLeft: parseInt(e.target.value) })}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>

                    {/* Right Padding */}
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                          <ArrowRight className="w-3 h-3 text-purple-600" />
                          Right Padding
                        </span>
                        <span className="font-extrabold text-purple-700 text-[11px]">
                          {currentSlide.paddingRight ?? 24}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        step="5"
                        value={currentSlide.paddingRight ?? 24}
                        onChange={(e) => updateCurrentSlide({ paddingRight: parseInt(e.target.value) })}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Alignment & Fine Offsets */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Alignment & Fine Position Offsets
                  </label>

                  {/* Horizontal Alignment */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Align:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'left', label: 'Left', icon: AlignLeft },
                        { id: 'center', label: 'Center', icon: AlignCenter },
                        { id: 'right', label: 'Right', icon: AlignRight },
                      ].map((item) => {
                        const IconComp = item.icon;
                        const active = (currentSlide.horizontalAlign || 'left') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentSlide({ horizontalAlign: item.id as any })}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1 cursor-pointer ${
                              active
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical Position Alignment */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-600">Vertical:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'top', label: 'Top' },
                        { id: 'center', label: 'Center' },
                        { id: 'bottom', label: 'Bottom' },
                      ].map((item) => {
                        const active = (currentSlide.verticalAlign || 'center') === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentSlide({ verticalAlign: item.id as any })}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              active
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Offset X & Y Sliders */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16">Offset X:</span>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentSlide.offsetX || 0}
                        onChange={(e) => updateCurrentSlide({ offsetX: parseInt(e.target.value) })}
                        className="flex-1 accent-purple-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-purple-700 w-10 text-right">
                        {currentSlide.offsetX || 0}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 w-16">Offset Y:</span>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={currentSlide.offsetY || 0}
                        onChange={(e) => updateCurrentSlide({ offsetY: parseInt(e.target.value) })}
                        className="flex-1 accent-purple-600 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-purple-700 w-10 text-right">
                        {currentSlide.offsetY || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Manager inside Slide */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                    <span>Navigation Buttons</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newBtn: TagCollectionButton = {
                        id: `btn-${Date.now()}`,
                        text: 'Explore Deals',
                        link: 'shop',
                        variant: 'primary',
                      };
                      updateCurrentSlide({ buttons: [...(currentSlide.buttons || []), newBtn] });
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    + Add Button
                  </button>
                </div>

                {(!currentSlide.buttons || currentSlide.buttons.length === 0) ? (
                  <p className="text-[11px] text-slate-500 italic">No buttons added to this slide.</p>
                ) : (
                  <div className="space-y-2">
                    {currentSlide.buttons.map((btn, bIdx) => (
                      <div key={btn.id || bIdx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 text-xs">
                        <input
                          type="text"
                          value={btn.text}
                          onChange={(e) => {
                            const updated = [...(currentSlide.buttons || [])];
                            updated[bIdx] = { ...updated[bIdx], text: e.target.value };
                            updateCurrentSlide({ buttons: updated });
                          }}
                          placeholder="Button Label"
                          className="flex-1 px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold"
                        />
                        <select
                          value={btn.link}
                          onChange={(e) => {
                            const updated = [...(currentSlide.buttons || [])];
                            updated[bIdx] = { ...updated[bIdx], link: e.target.value };
                            updateCurrentSlide({ buttons: updated });
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs bg-slate-50"
                        >
                          <option value="shop">Shop Page</option>
                          <option value="trending">Trending</option>
                          <option value="whatsapp">WhatsApp Order</option>
                          <option value="checkout">Checkout</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (currentSlide.buttons || []).filter((_, i) => i !== bIdx);
                            updateCurrentSlide({ buttons: updated });
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Banner Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
