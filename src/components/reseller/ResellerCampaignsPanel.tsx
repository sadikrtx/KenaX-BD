import React, { useState } from 'react';
import {
  Megaphone,
  Sparkles,
  Link,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Percent,
  Calendar,
  ExternalLink,
  Plus,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ResellerUser } from '../../types/reseller';
import { Product } from '../../types';

interface ResellerCampaignsPanelProps {
  reseller: ResellerUser;
  products: Product[];
  onNavigateToTab: (tab: any) => void;
}

export const ResellerCampaignsPanel: React.FC<ResellerCampaignsPanelProps> = ({
  reseller,
  products = [],
  onNavigateToTab,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const activeCampaigns = [
    {
      id: 'CAMP-EID-26',
      title: 'ঈদ স্পেশাল মেগা গ্যাজেট সেল ২০২৬',
      discount: '১৫% পর্যন্ত পাইকারি ছাড়',
      badge: '🔥 মেগা ক্যাম্পেইন',
      startDate: '২০ মার্চ ২০২৬',
      endDate: '১০ এপ্রিল ২০২৬',
      clicks: 1420,
      ordersGenerated: 38,
      profitEarned: 18450,
      status: 'active',
      trackingSlug: `campaign=eid2026&ref=${reseller.referralCode || reseller.username}`,
      highlightProduct: products[0]?.name || 'Ultra Smartwatch Amoled Edition',
    },
    {
      id: 'CAMP-SUMMER-26',
      title: 'সামার লাইফস্টাইল ও ইলেকট্রনিক্স ডিল',
      discount: 'স্পেশাল ক্যাশব্যাক অফার',
      badge: '⚡ ফ্ল্যাশ সেল',
      startDate: '১৫ মার্চ ২০২৬',
      endDate: '৩০ মার্চ ২০২৬',
      clicks: 860,
      ordersGenerated: 19,
      profitEarned: 9200,
      status: 'active',
      trackingSlug: `campaign=summer2026&ref=${reseller.referralCode || reseller.username}`,
      highlightProduct: products[1]?.name || 'TWS Wireless Gaming Earbuds',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-black uppercase flex items-center gap-1.5 w-fit">
              <Megaphone className="w-3.5 h-3.5 text-purple-400" />
              <span>মার্কেটিং ও মেগা ক্যাম্পেইন হাব</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              মার্কেটপ্লেস ক্যাম্পেইনে সেলস বৃদ্ধি করুন
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl">
              ক্যানাক্স বিডির চলমান মেগা ক্যাম্পেইনগুলোতে সরাসরি আপনার রেফারাল ট্র্যাকিং লিংক শেয়ার করুন এবং সর্বোচ্চ কাস্টমার কনভার্সন ও মার্জিন পান।
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('landing-page')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>ফেসবুক বুস্টিং ল্যান্ডিং পেজ বানান</span>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white">
          চলমান ক্যাম্পেইন ও ট্র্যাকিং লিংকসমূহ
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeCampaigns.map((camp) => {
            const shareUrl = `${window.location.origin}/?${camp.trackingSlug}`;

            return (
              <div
                key={camp.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-purple-400 transition-all space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase">
                    {camp.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    মেয়াদ: {camp.startDate} - {camp.endDate}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">{camp.title}</h3>
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                    অফার: {camp.discount}
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">ক্লিকস</div>
                    <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                      {camp.clicks}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">অর্ডার সেলস</div>
                    <div className="text-sm font-black text-sky-600 dark:text-sky-400 font-mono">
                      {camp.ordersGenerated}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">মোট প্রফিট</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      ৳{camp.profitEarned.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Share Link Box */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold">আপনার রেফারাল ক্যাম্পেইন লিংক:</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-mono select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyLink(shareUrl)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLink === shareUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
