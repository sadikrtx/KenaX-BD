import React from 'react';
import { ShieldCheck, Truck, CreditCard, Lock, Headphones } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const TrustBadges: React.FC = () => {
  const { t } = useLanguage();

  const badges = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-sky-600" />,
      title: t('প্রিমিয়াম কোয়ালিটি', 'Premium Quality'),
      subtitle: t('১০০% আসল প্রোডাক্ট', '100% Original Products'),
      bgColor: 'bg-sky-50',
    },
    {
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      title: t('দ্রুত ডেলিভারি', 'Express Courier'),
      subtitle: t('সমগ্র বাংলাদেশে', 'All Over Bangladesh'),
      bgColor: 'bg-blue-50',
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-600" />,
      title: t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery'),
      subtitle: t('পণ্য দেখে মূল্য পরিশোধ', 'Pay After You Receive'),
      bgColor: 'bg-emerald-50',
    },
    {
      icon: <Lock className="w-6 h-6 text-indigo-600" />,
      title: t('নিরাপদ পেমেন্ট', 'Secure Payment'),
      subtitle: t('১০০% সুরক্ষিত লেনদেন', 'Safe & Encrypted'),
      bgColor: 'bg-indigo-50',
    },
    {
      icon: <Headphones className="w-6 h-6 text-purple-600" />,
      title: t('২৪/৭ হেল্পলাইন', '24/7 Support'),
      subtitle: t('যেকোনো প্রয়োজনে পাশে আছি', 'We Are Always Here'),
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div
              className={`w-11 h-11 rounded-2xl ${badge.bgColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              {badge.icon}
            </div>
            <div className="leading-tight">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">{badge.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">{badge.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
