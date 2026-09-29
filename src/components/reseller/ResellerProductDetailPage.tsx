import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Video,
  Image as ImageIcon,
  Heart,
  Store,
  BadgeCheck,
  Star,
  Copy,
  Plus,
  AlertCircle,
  Truck,
  ShieldCheck,
  Check,
  Play,
  Layers,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Product } from '../../types';
import { ResellerUser } from '../../types/reseller';

interface ResellerProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  reseller: ResellerUser;
  lang?: 'bn' | 'en';
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onBack: () => void;
  onOpenOrder: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const ResellerProductDetailPage: React.FC<ResellerProductDetailPageProps> = ({
  product,
  allProducts,
  reseller,
  lang = 'bn',
  isFavorite,
  onToggleFavorite,
  onBack,
  onOpenOrder,
  onSelectProduct,
}) => {
  const isBn = lang === 'bn';
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'images' | 'video'>('images');
  const [downloadingImgIndex, setDownloadingImgIndex] = useState<number | null>(null);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDescCopied, setIsDescCopied] = useState(false);
  const [localFav, setLocalFav] = useState(isFavorite);

  // Keep local favorite synced with props
  React.useEffect(() => {
    setLocalFav(isFavorite);
  }, [isFavorite]);

  const wholesalePrice = product.resellerPrice || product.price;
  const suggestedPrice = product.suggestedResellerRetailPrice || Math.round(product.price * 1.25);
  const maxSellingPrice =
    product.maxResellerRetailPrice ||
    product.maxRetailPrice ||
    Math.round((product.suggestedResellerRetailPrice || wholesalePrice * 1.25) * 1.2);
  const profitMargin = suggestedPrice - wholesalePrice;
  const profitPercent = Math.round((profitMargin / wholesalePrice) * 100);
  const isOutOfStock = product.stock <= 0 || product.stockStatus === 'out_of_stock';
  const sellerName =
    product.sellerShopName || product.supplierName || product.brand || (isBn ? 'ক্যানাক্স ভেরিফাইড সেলার' : 'KenaX Verified Vendor');
  const sellerRating = product.sellerRating || 4.9;

  // Images list
  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];

  // Video source
  const videoUrl =
    product.videoUrl ||
    'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-green-screen-41159-large.mp4';
  const hasVideo = Boolean(product.videoUrl);

  // Related products from the same category or other products
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && (p.category === product.category || true))
    .slice(0, 4);

  // Helper: Trigger file download
  const triggerDownload = async (url: string, filename: string) => {
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
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Download individual image
  const handleDownloadSingleImage = async (imgUrl: string, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingImgIndex(index);
    const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    await triggerDownload(imgUrl, `kenax_${cleanName}_img_${index + 1}.jpg`);
    setDownloadingImgIndex(null);
    setToastMsg(isBn ? `ছবি #${index + 1} সফলভাবে ডাউনলোড হয়েছে!` : `Image #${index + 1} downloaded successfully!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Download video
  const handleDownloadVideo = async () => {
    setIsDownloadingVideo(true);
    const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    await triggerDownload(videoUrl, `kenax_${cleanName}_video.mp4`);
    setIsDownloadingVideo(false);
    setToastMsg(isBn ? 'ভিডিও সফলভাবে ডাউনলোড হয়েছে!' : 'Video downloaded successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Copy full description to clipboard
  const handleCopyDescription = () => {
    const textToCopy = `${product.name}
    
ক্যাটাগরি: ${product.category}${product.brand ? ` | ব্র্যান্ড: ${product.brand}` : ''}
মূল্য: ৳${suggestedPrice}

পণ্যের বিবরণ:
${product.description || 'আকর্ষণীয় ও প্রিমিয়াম কোয়ালিটির প্রোডাক্ট। সেরা ফিচারে সমৃদ্ধ।'}

ডেলিভারি চার্জ: ঢাকার ভিতরে ৬০ টাকা, ঢাকার বাহিরে ১২০ টাকা। সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।
অর্ডার করতে এখনই ইনবক্সে আপনার নাম, সম্পূর্ণ ঠিকানা ও ১১ ডিজিটের মোবাইল নম্বর পাঠিয়ে দিন!`;

    navigator.clipboard.writeText(textToCopy);
    setIsDescCopied(true);
    setToastMsg(isBn ? 'কপি হয়েছে' : 'Description copied successfully!');
    setTimeout(() => {
      setIsDescCopied(false);
      setToastMsg(null);
    }, 3000);
  };

  // Handle favorite toggle with immediate UI feedback and persistence
  const handleFavoriteClick = () => {
    const nextState = !localFav;
    setLocalFav(nextState);
    onToggleFavorite(product.id);
    setToastMsg(
      nextState
        ? isBn
          ? '❤️ প্রোডাক্টটি ফেভারিটে যোগ করা হয়েছে!'
          : 'Product added to favorites!'
        : isBn
        ? 'ফেভারিট থেকে সরানো হয়েছে'
        : 'Removed from favorites'
    );
    setTimeout(() => setToastMsg(null), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification (Prominently displayed at top center) */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-black animate-in slide-in-from-top-3 border border-emerald-400/50">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 group"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>{isBn ? 'ক্যাটালগে ফিরে যান' : 'Back to Catalog'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 hidden sm:flex">
            <span>/</span>
            <span>{product.category}</span>
            <span>/</span>
            <span className="text-slate-200 font-semibold truncate max-w-xs">{product.name}</span>
          </div>
        </div>

        {/* Top Header Favorite Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleFavoriteClick}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-sm ${
              localFav
                ? 'bg-rose-950/90 text-rose-300 border-rose-700 ring-2 ring-rose-500/30'
                : 'bg-slate-800 text-slate-300 hover:text-rose-400 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${localFav ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{localFav ? (isBn ? 'ফেভারিটে সংরক্ষিত' : 'Saved in Favorites') : isBn ? 'ফেভারিট করুন' : 'Add to Favorites'}</span>
          </button>
        </div>
      </div>

      {/* Main Product Presentation (Normal Visitor View with Reseller Tools) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Media Gallery & Individual Downloads (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* View Mode Switcher & Video Download Action */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('images')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'images' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isBn ? `ছবি গ্যালারি (${allImages.length})` : `Photos (${allImages.length})`}</span>
                </button>

                {hasVideo && (
                  <button
                    type="button"
                    onClick={() => setViewMode('video')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      viewMode === 'video' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'প্রোডাক্ট ভিডিও' : 'Product Video'}</span>
                  </button>
                )}
              </div>

              {/* Only video download when in video mode (Image downloads are exclusively underneath each image) */}
              {viewMode === 'video' && (
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  disabled={isDownloadingVideo}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors shadow-xs"
                >
                  {isDownloadingVideo ? (
                    <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{isBn ? 'ভিডিও ডাউনলোড করুন' : 'Download Video'}</span>
                </button>
              )}
            </div>

            {/* Main Media Display Viewport */}
            <div className="relative aspect-square sm:aspect-4/3 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center p-3 group">
              {/* Floating Favorite Heart on Main Viewport */}
              <button
                type="button"
                onClick={handleFavoriteClick}
                className={`absolute top-4 right-4 z-20 p-2.5 rounded-2xl backdrop-blur-md border shadow-xl transition-all cursor-pointer ${
                  localFav
                    ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-400/40 scale-105'
                    : 'bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-rose-400 border-slate-700/80 hover:scale-105'
                }`}
                title={localFav ? 'ফেভারিট থেকে সরান' : 'ফেভারিট লিস্টে যোগ করুন'}
                aria-label="Toggle favorite"
              >
                <Heart className={`w-5 h-5 ${localFav ? 'fill-white text-white' : ''}`} />
              </button>

              {viewMode === 'images' ? (
                <img
                  src={allImages[selectedMediaIndex] || allImages[0]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-102"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-2xl overflow-hidden relative">
                  <video controls autoPlay muted className="w-full h-full object-contain" src={videoUrl}>
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                </div>
              )}

              {/* Stock Status Badge */}
              {isOutOfStock ? (
                <span className="absolute top-4 left-4 text-xs font-black px-3 py-1.5 rounded-xl bg-rose-950/95 text-rose-300 border border-rose-800 flex items-center gap-1.5 shadow-lg">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{isBn ? 'স্টক আউট' : 'Out of Stock'}</span>
                </span>
              ) : (
                <span className="absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-950/95 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? `ইন স্টক (${product.stock} টি রয়েছে)` : `In Stock (${product.stock})`}</span>
                </span>
              )}
            </div>

            {/* Individual Image Download Thumbnails (প্রত্যেকটা ইমেজ সে একটা একটা করে ডাউনলোড করতে পারবে) */}
            {viewMode === 'images' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold text-slate-300">
                    {isBn ? 'সকল ছবি (ক্লিক করে প্রিভিউ ও ডাউনলোড করুন):' : 'All Photos (Click to preview & download):'}
                  </span>
                  <span className="text-[11px] text-slate-500">{allImages.length} টি ছবি সংযুক্ত</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {allImages.map((img, idx) => {
                    const isSelected = selectedMediaIndex === idx;
                    const isDownloadingThis = downloadingImgIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col rounded-2xl bg-slate-950 border overflow-hidden p-1.5 transition-all ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Image preview click to view */}
                        <div
                          onClick={() => setSelectedMediaIndex(idx)}
                          className="aspect-square bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer relative group/thumb"
                        >
                          <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                            #{idx + 1}
                          </div>
                        </div>

                        {/* Direct Individual Download Button under each image */}
                        <button
                          type="button"
                          onClick={(e) => handleDownloadSingleImage(img, idx, e)}
                          disabled={isDownloadingThis}
                          className="mt-1.5 py-1 px-1 rounded-lg bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-800"
                          title={isBn ? `ছবি ${idx + 1} ডাউনলোড করুন` : `Download photo ${idx + 1}`}
                        >
                          {isDownloadingThis ? (
                            <span className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 text-emerald-400 group-hover:text-white" />
                          )}
                          <span>{isBn ? 'ডাউনলোড' : 'Download'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Product Details, Pricing, Description & Order Action (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Seller / Supplier Header */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-slate-200 truncate">{sellerName}</span>
                  <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                </div>
                <div className="flex items-center gap-1 text-amber-400 font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{sellerRating}</span>
                </div>
              </div>

              {/* Product Title (Normal Visitor Presentation) */}
              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  {product.category} {product.brand ? `• ${product.brand}` : ''}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {product.name}
                </h1>
                {product.sku && (
                  <span className="text-[10px] font-mono text-slate-500 block mt-1">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              {/* Pricing & Profit Calculation Card */}
              <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isBn ? 'হোলসেল কেনা মূল্য:' : 'Wholesale Cost:'}</span>
                  <span className="font-black text-white text-sm tabular-nums">
                    ৳{wholesalePrice.toLocaleString('en-BD')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{isBn ? 'প্রস্তাবিত বিক্রয় মূল্য:' : 'Suggested Retail Price:'}</span>
                  <span className="text-slate-300 font-bold tabular-nums">
                    ৳{suggestedPrice.toLocaleString('en-BD')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-amber-300 font-medium">
                  <span>{isBn ? 'ম্যাক্সিমাম সেলিং প্রাইস:' : 'Max Selling Price:'}</span>
                  <span className="tabular-nums font-bold">
                    ৳{maxSellingPrice.toLocaleString('en-BD')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isBn
                    ? `💡 পরামর্শ: সর্বোচ্চ ৳${maxSellingPrice} পর্যন্ত সেল করলে ভালো, তবে চাইলে আপনি এর বেশি রেটেও বিক্রয় করতে পারেন।`
                    : `💡 Tip: Optimal selling up to ৳${maxSellingPrice}, but you can set higher if you prefer.`}
                </p>
                <div className="flex justify-between items-center font-black text-emerald-400 border-t border-slate-800 pt-2.5 text-sm">
                  <span>{isBn ? 'আপনার সম্ভাব্য নিট লাভ:' : 'Your Net Profit:'}</span>
                  <span className="tabular-nums text-base">
                    +৳{profitMargin.toLocaleString('en-BD')} ({profitPercent}%)
                  </span>
                </div>
              </div>

              {/* Variations Preview (Color & Size) */}
              {(product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0) ? (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                  {product.colors && product.colors.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-400 block mb-1">
                        {isBn ? 'উপলব্ধ কালার ভ্যারিয়েশন:' : 'Available Colors:'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {product.colors.map((c, i) => {
                          const cName = typeof c === 'string' ? c : c.name;
                          return (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
                            >
                              {cName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {product.sizes && product.sizes.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-400 block mb-1">
                        {isBn ? 'উপলব্ধ সাইজ ভ্যারিয়েশন:' : 'Available Sizes:'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {product.sizes.map((s, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Product Description with Dedicated COPY Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? 'পণ্যের বিবরণ ও ফিচারসমূহ:' : 'Product Description & Features:'}</span>
                  </h3>

                  {/* Dedicated Copy Button (প্রোডাক্টের ডেসক্রিপশনটা সে এটা কপি করার বাটন পাবে) */}
                  <button
                    type="button"
                    onClick={handleCopyDescription}
                    className="px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-sky-800/80 transition-all cursor-pointer shadow-xs"
                    title={isBn ? 'সম্পূর্ণ বিবরণ কপি করুন' : 'Copy Description'}
                  >
                    {isDescCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isBn ? 'ডেসক্রিপশন কপি করুন' : 'Copy Description'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans select-text">
                  {product.description ||
                    (isBn
                      ? 'এই প্রোডাক্টটি ১০০% প্রিমিয়াম কোয়ালিটির উপাদান দিয়ে তৈরি। ব্যবহারকারীর আকর্ষণীয় লুক ও স্থায়িত্ব নিশ্চিত করে। অনলাইনে সহজে বিক্রি করার উপযোগী।'
                      : 'High-quality item suitable for resale.')}
                </div>
              </div>
            </div>

            {/* Main Action Area: ONLY "অর্ডার করুন" with Favorite Action */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenOrder(product)}
                disabled={isOutOfStock}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 hover:shadow-emerald-900/80 border border-emerald-500'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>
                  {isOutOfStock
                    ? isBn
                      ? 'স্টক আউট — অর্ডার নেওয়া সম্ভব নয়'
                      : 'Stock Out — Cannot Order'
                    : isBn
                    ? 'অর্ডার করুন'
                    : 'Order Now'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shrink-0 ${
                  localFav
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700 ring-2 ring-rose-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border-slate-700'
                }`}
                title={localFav ? (isBn ? 'ফেভারিট থেকে সরান' : 'Remove from Favorites') : (isBn ? 'ফেভারিট করুন' : 'Add to Favorites')}
              >
                <Heart className={`w-5 h-5 ${localFav ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span className="hidden sm:inline">{localFav ? (isBn ? 'সংরক্ষিত' : 'Saved') : (isBn ? 'ফেভারিট' : 'Save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section (নিচে আরও নিচে আবার রিলেটেড প্রোডাক্ট শো করবে এরকম) */}
      {relatedProducts.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="font-black text-white text-sm sm:text-base">
                {isBn ? 'সম্পর্কিত অন্যান্য প্রোডাক্ট' : 'Related Products in Catalog'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {isBn ? `${product.category} ক্যাটাগরির সেরা পণ্য` : `Best items in ${product.category}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedProducts.map((rel) => {
              const relWholesale = rel.resellerPrice || rel.price;
              const relSuggested = rel.suggestedResellerRetailPrice || Math.round(rel.price * 1.25);
              const relProfit = relSuggested - relWholesale;

              return (
                <div
                  key={rel.id}
                  onClick={() => onSelectProduct(rel)}
                  className="bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between group hover:border-emerald-500/50 transition-all cursor-pointer shadow-xs p-3"
                >
                  <div className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden mb-2.5 p-2 flex items-center justify-center">
                    <img
                      src={rel.images[0]}
                      alt={rel.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-bold text-slate-300">
                      {rel.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <h4 className="font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                      {rel.name}
                    </h4>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>হোলসেল:</span>
                      <span className="font-bold text-slate-200">৳{relWholesale.toLocaleString('en-BD')}</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold text-emerald-400 border-t border-slate-800/80 pt-1">
                      <span>নিট লাভ:</span>
                      <span>+৳{relProfit.toLocaleString('en-BD')}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(rel);
                      }}
                      className="w-full mt-2 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-slate-800"
                    >
                      {isBn ? 'প্রোডাক্ট দেখুন' : 'View Product'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
