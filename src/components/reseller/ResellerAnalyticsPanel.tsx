import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { ResellerUser } from '../../types/reseller';
import { Order, Product } from '../../types';

interface ResellerAnalyticsPanelProps {
  reseller: ResellerUser;
  orders: Order[];
  products: Product[];
}

export const ResellerAnalyticsPanel: React.FC<ResellerAnalyticsPanelProps> = ({
  reseller,
  orders = [],
  products = [],
}) => {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  const monthlySales = [
    { month: 'অক্টোবর', sales: 48000, profit: 14200 },
    { month: 'নভেম্বর', sales: 72000, profit: 21600 },
    { month: 'ডিসেম্বর', sales: 115000, profit: 34500 },
    { month: 'জানুয়ারি', sales: 94000, profit: 28200 },
    { month: 'ফেব্রুয়ারি', sales: 142000, profit: 42600 },
    { month: 'মার্চ (বর্তমান)', sales: 185400, profit: 55620 },
  ];

  const maxSales = Math.max(...monthlySales.map((m) => m.sales));

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Month,Sales,Profit\n' +
      monthlySales.map((e) => `${e.month},${e.sales},${e.profit}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax_reseller_report_${reseller.username}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                সেলস ও প্রফিট অ্যাডভান্সড এনালিটিক্স
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                মাসিক রাজস্ব প্রবৃদ্ধি, নিট লাভ মার্জিন ও কাস্টমার রিটেনশন রিপোর্ট।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>CSV রিপোর্ট ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold uppercase">মোট সেলস রেভিনিউ</div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
              ৳{reseller.totalSales?.toLocaleString() || '১৮৫,৪০০'}
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+৩২% এই মাসে</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold uppercase">মোট নিট লাভ</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              ৳{reseller.totalProfit?.toLocaleString() || '৪২,৩০০'}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">গড় মার্জিন: ২২.৮%</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold uppercase">ডেলিভার্ড পার্সেল</div>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400 font-mono mt-1">
              ৫৮ টি
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">৯৮.২% সাকসেস রেট</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="text-[10px] text-slate-400 font-bold uppercase">কাস্টমার সংখ্যা</div>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
              ৩৮ জন
            </div>
            <div className="text-[10px] text-purple-600 font-bold mt-1">৬২% রিপিট কাস্টমার</div>
          </div>
        </div>
      </div>

      {/* Monthly Performance Visual Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <h2 className="text-base font-black text-slate-900 dark:text-white">
          মাসিক সেলস ও প্রফিট গ্রাফ (বিগত ৬ মাস)
        </h2>

        <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-4 px-2 border-b border-slate-100 dark:border-slate-800">
          {monthlySales.map((item) => {
            const heightPercent = Math.round((item.sales / maxSales) * 100);

            return (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  ৳{(item.sales / 1000).toFixed(0)}k
                </div>
                <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end" style={{ height: `${heightPercent}%` }}>
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-sky-400 rounded-t-xl group-hover:from-indigo-500 group-hover:to-sky-300 transition-all"
                    style={{ height: '100%' }}
                  ></div>
                </div>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate w-full text-center">
                  {item.month}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
