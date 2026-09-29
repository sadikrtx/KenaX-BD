import React from 'react';
import {
  ShieldCheck,
  Truck,
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  Lock,
  Headphones,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Order,
  OrderItem,
  DeliveryAddress,
  CustomerRecord,
  SiteSettings,
  Product,
} from '../types';
import { CheckoutModal } from './CheckoutModal';
import { useLanguage } from '../context/LanguageContext';

interface CheckoutPageViewProps {
  cartItems: OrderItem[];
  fullCart?: OrderItem[];
  discountAmount: number;
  couponCode?: string;
  orderSource?: 'chatbot' | 'manual' | string;
  onOrderPlaced: (order: Order) => void;
  onClose: () => void;
  savedAddresses?: DeliveryAddress[];
  defaultInsideCityFee?: number;
  defaultOutsideCityFee?: number;
  currentCustomer?: CustomerRecord | null;
  onCustomerCreated?: (customer: CustomerRecord) => void;
  onRemoveItem?: (productId: string) => void;
  onUpdateCartItem?: (productId: string, updates: Partial<OrderItem>) => void;
  products?: Product[];
  siteSettings?: SiteSettings;
  onNavigate?: (view: string) => void;
}

export const CheckoutPageView: React.FC<CheckoutPageViewProps> = ({
  cartItems,
  fullCart = [],
  discountAmount,
  couponCode,
  orderSource = 'manual',
  onOrderPlaced,
  onClose,
  savedAddresses = [],
  defaultInsideCityFee = 70,
  defaultOutsideCityFee = 130,
  currentCustomer,
  onCustomerCreated,
  onRemoveItem,
  onUpdateCartItem,
  products = [],
  siteSettings,
  onNavigate,
}) => {
  const { t, language } = useLanguage();
  const effectiveItems = cartItems.length > 0 ? cartItems : fullCart;

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (onNavigate) {
      onNavigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 py-3 sm:py-6 px-2.5 sm:px-4 lg:px-8 animate-in fade-in duration-200">
      {/* Container wrapper */}
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-5">
        {/* Top Header & Breadcrumb: Mobile-First Sleek Clean Bar */}
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 text-slate-800 dark:text-slate-100 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0 active:scale-95"
              title={t('কেনাকাটায় ফিরে যান', 'Back to Shopping')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('কেনাকাটায় ফিরুন', 'Back to Shopping')}</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{t('অর্ডার চেকআউট ও ডেলিভারি', 'Order Checkout & Delivery')}</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {t('পণ্যটি পেতে ডেলিভারি ঠিকানা পূরণ করুন', 'Enter delivery address to receive your order')}
              </p>
            </div>
          </div>

          {/* Trust Guarantees on Top */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-[11px] font-bold">
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">{t('নিরাপদ চেকআউট', '100% Safe')}</span>
            </div>
          </div>
        </div>

        {/* 4-Step Checkout Progress Indicators on Desktop / Clean mini tracker on Mobile */}
        <div className="hidden md:grid grid-cols-4 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
              ✓
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase text-emerald-600 leading-none">Step 1</p>
              <p className="text-xs font-black truncate">{t('পণ্য নির্বাচন', 'Select Item')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-sky-50 text-sky-900 border border-sky-300 ring-2 ring-sky-500/20 shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
              2
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase text-sky-600 leading-none">Step 2</p>
              <p className="text-xs font-black truncate">{t('ডেলিভারি ঠিকানা', 'Delivery Address')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">
              3
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">Step 3</p>
              <p className="text-xs font-bold truncate">{t('পেমেন্ট পদ্ধতি', 'Payment')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
            <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">
              4
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase text-slate-400 leading-none">Step 4</p>
              <p className="text-xs font-bold truncate">{t('অর্ডার কনফার্ম', 'Confirm')}</p>
            </div>
          </div>
        </div>

        {/* If cart is empty */}
        {effectiveItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800">
              {t('আপনার চেকআউট লিস্ট খালি রয়েছে', 'Your Checkout List is Empty')}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t('অর্ডার করতে পছন্দের প্রোডাক্টের "Buy Now" বাটনে ক্লিক করুন অথবা কার্ট থেকে চেকআউট করুন।', 'Click "Buy Now" on your favorite product or proceed from cart.')}
            </p>
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('home') : handleBack()}
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all cursor-pointer inline-flex items-center gap-2 shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('শপিং শুরু করুন', 'Start Shopping')}</span>
            </button>
          </div>
        ) : (
          /* Embedded High-Conversion Checkout Card with Full Interactive Controls */
          <div className="relative">
            <CheckoutModal
              isOpen={true}
              mode="page"
              onClose={handleBack}
              onBackToShopping={handleBack}
              cartItems={effectiveItems}
              fullCart={fullCart}
              discountAmount={discountAmount}
              couponCode={couponCode}
              orderSource={orderSource}
              onOrderPlaced={onOrderPlaced}
              savedAddresses={savedAddresses}
              defaultInsideCityFee={defaultInsideCityFee}
              defaultOutsideCityFee={defaultOutsideCityFee}
              currentCustomer={currentCustomer}
              onCustomerCreated={onCustomerCreated}
              onRemoveItem={onRemoveItem}
              onUpdateCartItem={onUpdateCartItem}
              products={products}
              siteSettings={siteSettings}
            />
          </div>
        )}

        {/* Bottom Trust & Assurance Grid for Bangladesh Customers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-2">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">{t('দ্রুত ডেলিভারি', 'Fast Delivery')}</h4>
              <p className="text-[10px] text-slate-500">{t('২৪-৭২ ঘণ্টায় ৬৪ জেলায়', '24-72h in 64 Districts')}</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">{t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</h4>
              <p className="text-[10px] text-slate-500">{t('পণ্য হাতে পেয়ে মূল্য দিন', 'Pay after receiving product')}</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">{t('সহজ রিটার্ন পলিসি', 'Easy Return')}</h4>
              <p className="text-[10px] text-slate-500">{t('৭ দিনের রিটার্ন গ্যারান্টি', '7-Day Return Guarantee')}</p>
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-800">{t('২৪/৭ হেল্পলাইন', '24/7 Helpline')}</h4>
              <p className="text-[10px] text-slate-500">{siteSettings?.storePhone || '+880 1887713212'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
