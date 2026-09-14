import React, { useState } from 'react';
import {
  Globe,
  Search,
  Share2,
  CheckCircle2,
  Save,
  Tag,
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { SEOSettings, WebsiteSettings } from '../../types';
import { DEFAULT_SEO_SETTINGS } from '../../data/initialSettings';
import { applySEOMetaTags } from '../../utils/seo';

interface AdminSEOSettingsProps {
  siteSettings: WebsiteSettings;
  onUpdateSettings: (newSettings: Partial<WebsiteSettings>) => Promise<boolean | void>;
  canEdit?: boolean;
}

export const AdminSEOSettings: React.FC<AdminSEOSettingsProps> = ({
  siteSettings,
  onUpdateSettings,
  canEdit = true,
}) => {
  const currentSeo = siteSettings.seoSettings || DEFAULT_SEO_SETTINGS;

  const [metaTitle, setMetaTitle] = useState(currentSeo.metaTitle || DEFAULT_SEO_SETTINGS.metaTitle);
  const [metaDescription, setMetaDescription] = useState(currentSeo.metaDescription || DEFAULT_SEO_SETTINGS.metaDescription);
  const [metaKeywords, setMetaKeywords] = useState(currentSeo.metaKeywords || DEFAULT_SEO_SETTINGS.metaKeywords);
  const [ogTitle, setOgTitle] = useState(currentSeo.ogTitle || DEFAULT_SEO_SETTINGS.ogTitle);
  const [ogDescription, setOgDescription] = useState(currentSeo.ogDescription || DEFAULT_SEO_SETTINGS.ogDescription);
  const [ogImage, setOgImage] = useState(currentSeo.ogImage || DEFAULT_SEO_SETTINGS.ogImage);
  const [ogType, setOgType] = useState(currentSeo.ogType || DEFAULT_SEO_SETTINGS.ogType);
  const [twitterCard, setTwitterCard] = useState(currentSeo.twitterCard || DEFAULT_SEO_SETTINGS.twitterCard);
  const [googleSiteVerification, setGoogleSiteVerification] = useState(
    currentSeo.googleSiteVerification || DEFAULT_SEO_SETTINGS.googleSiteVerification
  );
  const [canonicalUrl, setCanonicalUrl] = useState(currentSeo.canonicalUrl || DEFAULT_SEO_SETTINGS.canonicalUrl);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'social' | 'preview'>('basic');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    setSaveSuccess(false);

    const updatedSeo: SEOSettings = {
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      metaKeywords: metaKeywords.trim(),
      ogTitle: ogTitle.trim() || metaTitle.trim(),
      ogDescription: ogDescription.trim() || metaDescription.trim(),
      ogImage: ogImage.trim(),
      ogType,
      twitterCard,
      googleSiteVerification: googleSiteVerification.trim(),
      canonicalUrl: canonicalUrl.trim(),
    };

    try {
      await onUpdateSettings({
        seoSettings: updatedSeo,
      });

      // Instantly apply meta tags to browser DOM
      applySEOMetaTags(updatedSeo);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save SEO settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset SEO settings to recommended defaults?')) {
      setMetaTitle(DEFAULT_SEO_SETTINGS.metaTitle);
      setMetaDescription(DEFAULT_SEO_SETTINGS.metaDescription);
      setMetaKeywords(DEFAULT_SEO_SETTINGS.metaKeywords);
      setOgTitle(DEFAULT_SEO_SETTINGS.ogTitle);
      setOgDescription(DEFAULT_SEO_SETTINGS.ogDescription);
      setOgImage(DEFAULT_SEO_SETTINGS.ogImage);
      setOgType(DEFAULT_SEO_SETTINGS.ogType);
      setTwitterCard(DEFAULT_SEO_SETTINGS.twitterCard);
      setGoogleSiteVerification(DEFAULT_SEO_SETTINGS.googleSiteVerification);
      setCanonicalUrl(DEFAULT_SEO_SETTINGS.canonicalUrl);
    }
  };

  // Keyword check helper
  const targetKeywords = ['kena x bd', 'KenaX', 'kenaxbd', 'online shopping bangladesh', 'dropshipping platform', 'shopx'];
  const keywordsList = metaKeywords.split(',').map((k) => k.trim().toLowerCase());

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                SEO & Meta Tags Manager
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Global Live Sync
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Optimize search engine visibility, Open Graph social share cards, and keyword rankings for KenaX BD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !canEdit}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving to Firestore...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>SEO Meta Tags successfully updated & synced globally to Cloud Firestore and browser DOM!</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'basic'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Google Search Meta Tags
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'social'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          Social Share (Open Graph)
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'preview'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Live Search & Social Preview
        </button>
      </div>

      {/* TAB 1: BASIC GOOGLE META TAGS */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-indigo-500" />
                Primary Meta Tags
              </h3>

              {/* Meta Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    SEO Meta Title (`&lt;title&gt;`)
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      metaTitle.length > 70
                        ? 'text-rose-500 font-bold'
                        : metaTitle.length > 50
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {metaTitle.length} / 60 characters
                  </span>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="e.g. KenaX BD - Best Online Shopping & Dropshipping Platform"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Appears as the main clickable headline in Google Search results.
                </p>
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Meta Description (`&lt;meta name="description"&gt;`)
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      metaDescription.length > 165
                        ? 'text-rose-500 font-bold'
                        : metaDescription.length >= 120
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {metaDescription.length} / 160 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Short summary of KenaX BD for search engines..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Provide a compelling snippet encouraging users to click from search results.
                </p>
              </div>

              {/* Meta Keywords */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Meta Keywords (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={metaKeywords}
                  onChange={(e) => setMetaKeywords(e.target.value)}
                  placeholder="kena x bd, KenaX, kenaxbd, online shopping bangladesh..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {metaKeywords
                    .split(',')
                    .map((kw) => kw.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            {/* Verification & Canonical Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Google Search Console & Canonical URL
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Google Site Verification Tag
                  </label>
                  <input
                    type="text"
                    value={googleSiteVerification}
                    onChange={(e) => setGoogleSiteVerification(e.target.value)}
                    placeholder="oDWELWT2DC5Y..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="https://kenaxbd.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Keyword Checklist */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                Target Keywords Status
              </h3>
              <p className="text-xs text-slate-500">
                Check if your target brand & industry search terms are included:
              </p>

              <div className="space-y-2">
                {targetKeywords.map((target, idx) => {
                  const isPresent = keywordsList.includes(target.toLowerCase());
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        isPresent
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="font-semibold">{target}</span>
                      {isPresent ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Included
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMetaKeywords((prev) => (prev ? `${prev}, ${target}` : target))}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOCIAL SHARE (OPEN GRAPH & TWITTER) */}
      {activeTab === 'social' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-500" />
            Open Graph & Social Media Sharing Cards
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Open Graph Title (`og:title`)
              </label>
              <input
                type="text"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
                placeholder="Title shown when shared on Facebook / WhatsApp"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Open Graph Type (`og:type`)
              </label>
              <select
                value={ogType}
                onChange={(e) => setOgType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="website">website (Standard Default)</option>
                <option value="store">store (E-Commerce Store)</option>
                <option value="business.business">business (Business Enterprise)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Open Graph Description (`og:description`)
              </label>
              <textarea
                rows={2}
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                placeholder="Description text shown on social media link previews"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Social Share Image URL (`og:image`)
              </label>
              <input
                type="url"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Recommended aspect ratio: 1200x630 pixels.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE SERP & SOCIAL PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Google SERP Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-500" />
              Google Search Result Snippet Preview
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[12px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">
                  K
                </span>
                <span>{canonicalUrl || 'https://kenaxbd.com'}</span>
              </div>
              <h4 className="text-base font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-tight">
                {metaTitle || 'KenaX BD - Best Online Shopping in Bangladesh'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {metaDescription || 'Shop genuine smart gadgets & lifestyle products at best prices in Bangladesh.'}
              </p>
            </div>
          </div>

          {/* Social Share Card Preview */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-500" />
              Facebook & WhatsApp Share Preview
            </h3>

            <div className="max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 shadow-md">
              {ogImage && (
                <div className="h-44 overflow-hidden bg-slate-200 dark:bg-slate-900">
                  <img src={ogImage} alt="Social Card" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3.5 space-y-1 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {new URL(canonicalUrl || 'https://kenaxbd.com').hostname}
                </p>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {ogTitle || metaTitle}
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                  {ogDescription || metaDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
