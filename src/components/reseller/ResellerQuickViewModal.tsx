import React, { useState } from 'react';
import {
  X,
  Download,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Store,
  BadgeCheck,
  Star,
  Plus,
  Share2,
  Globe,
  Sparkles,
  ShieldCheck,
  Truck,
  Heart,
  Layers,
  ArrowDownToLine,
  Play,
  FileVideo,
} from 'lucide-react';
import { Product } from '../../types';

interface ResellerQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  lang: 'bn' | 'en';
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onOpenOrderModal: (product: Product) => void;
  onOpenShareModal: (product: Product) => void;
  onOpenLandingPage?: (product: Product) => void;
}

export const ResellerQuickViewModal: React.FC<ResellerQuickViewModalProps> = ({
  isOpen,
  onClose,
  product,
  lang,
  isFavorite,
  onToggleFavorite,
  onOpenOrderModal,
  onOpenShareModal,
  onOpenLandingPage,
}) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'images' | 'video'>('images');
  const [downloadingStatus, setDownloadingStatus] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const isBn = lang === 'bn';
  const wholesalePrice = product.resellerPrice || product.price;
  const suggestedPrice = product.suggestedResellerRetailPrice || Math.round(product.price * 1.25);
  const maxSellingPrice =
    product.maxResellerRetailPrice ||
    product.maxRetailPrice ||
    Math.round((product.suggestedResellerRetailPrice || wholesalePrice * 1.25) * 1.2);
  const profitMargin = suggestedPrice - wholesalePrice;
  const profitPercent = Math.round((profitMargin / wholesalePrice) * 100);
  const isOutOfStock = product.stock <= 0 || product.stockStatus === 'out_of_stock';
  const sellerName = product.sellerShopName || product.supplierName || product.brand || (isBn ? 'ক্যানাক্স ভেরিফাইড সেলার' : 'KenaX Verified Vendor');
  const sellerRating = product.sellerRating || 4.9;

  // Images list
  const allImages = product.images && product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
  
  // Video source (if product has video, or high quality demonstration video)
  const videoUrl = product.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-green-screen-41159-large.mp4';
  const hasVideo = Boolean(product.videoUrl || true);

  // Download a single file
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download all product images in one click
  const handleDownloadAllImages = async () => {
    setDownloadingStatus(isBn ? 'সব ছবি ডাউনলোড হচ্ছে...' : 'Downloading all images...');
    const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    for (let i = 0; i < allImages.length; i++) {
      const imgUrl = allImages[i];
      await downloadFile(imgUrl, `kenax_${cleanName}_img_${i + 1}.jpg`);
      await new Promise((r) => setTimeout(r, 200));
    }
    
    setDownloadingStatus(null);
    setToastMsg(isBn ? 'সবগুলো ছবি সফলভাবে ডাউনলোড হয়েছে!' : 'All images downloaded successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Download product promotional/demo video
  const handleDownloadVideo = async () => {
    setDownloadingStatus(isBn ? 'ভিডিও ডাউনলোড হচ্ছে...' : 'Downloading video...');
    const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    await downloadFile(videoUrl, `kenax_${cleanName}_demo_video.mp4`);
    setDownloadingStatus(null);
    setToastMsg(isBn ? 'প্রোডাক্ট ভিডিও সফলভাবে ডাউনলোড হয়েছে!' : 'Product video downloaded successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-60 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
              {isBn ? 'কুইক ভিউ' : 'Quick View'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-300">
              {isBn ? 'হোলসেল ক্যাটালগ পণ্য' : 'Wholesale Catalog Item'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(product.id)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                  : 'bg-slate-900 text-slate-400 hover:text-rose-400 border-slate-800'
              }`}
              title={isFavorite ? (isBn ? 'সংরক্ষণ তালিকা থেকে মুছুন' : 'Remove favorite') : (isBn ? 'সংরক্ষণ করুন' : 'Save favorite')}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Gallery & Media (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Media Switcher Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('images')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'images'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{isBn ? `ছবি সমূহ (${allImages.length})` : `Photos (${allImages.length})`}</span>
                  </button>

                  {hasVideo && (
                    <button
                      type="button"
                      onClick={() => setViewMode('video')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        viewMode === 'video'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isBn ? 'প্রোডাক্ট ভিডিও' : 'Product Video'}</span>
                    </button>
                  )}
                </div>

                {/* Media Download Buttons */}
                <div className="flex items-center gap-2">
                  {viewMode === 'images' ? (
                    <button
                      type="button"
                      onClick={handleDownloadAllImages}
                      disabled={Boolean(downloadingStatus)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors shadow-xs"
                      title={isBn ? 'সবগুলো হাই কোয়ালিটি ছবি ডাউনলোড করুন' : 'Download all HD photos'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সব ছবি ডাউনলোড' : 'Download All Images'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      disabled={Boolean(downloadingStatus)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors shadow-xs"
                      title={isBn ? 'প্রোডাক্ট ডেমো ভিডিও ডাউনলোড করুন' : 'Download demo video'}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ভিডিও ডাউনলোড' : 'Download Video'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Main Media Display Viewport */}
              <div className="relative aspect-square sm:aspect-4/3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                {viewMode === 'images' ? (
                  <img
                    src={allImages[selectedMediaIndex] || allImages[0]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden relative">
                    <video
                      controls
                      autoPlay
                      muted
                      className="w-full h-full object-contain"
                      src={videoUrl}
                    >
                      <source src={videoUrl} type="video/mp4" />
                    </video>
                  </div>
                )}

                {/* Stock Indicator Badge */}
                {isOutOfStock ? (
                  <span className="absolute top-3 left-3 text-[10px] font-black px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-800 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{isBn ? 'স্টক আউট' : 'Out of Stock'}</span>
                  </span>
                ) : (
                  <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isBn ? `ইন স্টক (${product.stock} টি)` : `In Stock (${product.stock})`}</span>
                  </span>
                )}
              </div>

              {/* Thumbnail Strip */}
              {viewMode === 'images' && allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMediaIndex(idx)}
                      className={`w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border shrink-0 transition-all cursor-pointer ${
                        selectedMediaIndex === idx
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Product Details & Profit (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Seller Info Header */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Store className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-bold text-slate-200 truncate">{sellerName}</span>
                    <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{sellerRating}</span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                    {isBn ? `ক্যাটাগরি: ${product.category}` : `Category: ${product.category}`}
                  </span>
                  {product.brand && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                      {isBn ? `ব্র্যান্ড: ${product.brand}` : `Brand: ${product.brand}`}
                    </span>
                  )}
                </div>

                {/* Reseller Margin Breakdown Box */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{isBn ? 'হোলসেল কেনা মূল্য:' : 'Wholesale Cost:'}</span>
                    <span className="font-bold text-white tabular-nums">৳{wholesalePrice.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isBn ? 'প্রস্তাবিত খুচরা বিক্রয় মূল্য:' : 'Suggested Retail Price:'}</span>
                    <span className="text-slate-300 tabular-nums">৳{suggestedPrice.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="flex justify-between text-amber-300 font-medium">
                    <span>{isBn ? 'ম্যাক্সিমাম সেলিং প্রাইস:' : 'Max Selling Price:'}</span>
                    <span className="tabular-nums font-bold">৳{maxSellingPrice.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-400 border-t border-slate-800 pt-2 text-sm">
                    <span>{isBn ? 'আপনার নিশ্চিত লাভ:' : 'Your Net Profit:'}</span>
                    <span className="tabular-nums">+৳{profitMargin.toLocaleString('en-BD')} ({profitPercent}%)</span>
                  </div>
                </div>

                {/* Full Description & Specs */}
                <div className="space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-300">
                    {isBn ? 'পণ্যের বিবরণ ও বৈশিষ্ট্য:' : 'Product Description & Features:'}
                  </h4>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-slate-300 text-xs leading-relaxed max-h-40 overflow-y-auto whitespace-pre-line">
                    {product.description || (isBn ? 'কোনো অতিরিক্ত বিবরণ প্রদান করা হয়নি।' : 'No additional description provided.')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenShareModal(product);
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-sky-400" />
                    <span>{isBn ? 'ক্যাপশন কপি' : 'Share & Copy'}</span>
                  </button>

                  {onOpenLandingPage && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenLandingPage(product);
                        onClose();
                      }}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-900 to-slate-800 hover:from-indigo-800 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-700/60 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{isBn ? 'ল্যান্ডিং পেজ' : 'Landing Page'}</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onOpenOrderModal(product);
                    onClose();
                  }}
                  disabled={isOutOfStock}
                  className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isOutOfStock
                      ? isBn ? 'স্টক আউট — অর্ডার নেওয়া সম্ভব নয়' : 'Stock Out — Cannot Order'
                      : isBn ? 'সরাসরি রিসেল অর্ডার প্লেস করুন' : 'Place Resale Order Now'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
