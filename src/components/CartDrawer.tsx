import React, { useState } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
  ShieldCheck,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { OrderItem, Product } from '../types';
import { CartItemImage } from './CartItemImage';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  appliedCoupon: string | null;
  discountAmount: number;
  onApplyCoupon: (code: string) => boolean;
  onRemoveCoupon: () => void;
  deliveryCharge: number;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  appliedCoupon,
  discountAmount,
  onApplyCoupon,
  onRemoveCoupon,
  deliveryCharge,
  products = [],
  onSelectProduct,
}) => {
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [showCouponForm, setShowCouponForm] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - discountAmount + deliveryCharge);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const success = onApplyCoupon(couponInput.trim());
    if (success) {
      setCouponError('');
      setCouponInput('');
      setShowCouponForm(false);
    } else {
      setCouponError(t('ভুল কুপন কোড! ট্রাই করুন KENAX10 অথবা EID500', 'Invalid coupon code. Try KENAX10 or EID500'));
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed top-0 left-0 right-0 bottom-15 sm:bottom-0 z-40 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex flex-col justify-start sm:flex-row sm:justify-end transition-all"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between rounded-b-3xl sm:rounded-b-none sm:rounded-l-3xl max-h-[85vh] sm:max-h-full sm:h-full border-b sm:border-b-0 sm:border-l border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-top sm:slide-in-from-right duration-300 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('আপনার শপিং কার্ট', 'Your Shopping Cart')}</h2>
            </div>
            <span className="bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              {totalItemsCount} {t('টি পণ্য', totalItemsCount === 1 ? 'item' : 'items')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-5 sm:py-3 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
          {cartItems.length === 0 ? (
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/80 flex items-center justify-center text-sky-500 mb-2.5">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('আপনার কার্ট খালি আছে', 'Your cart is empty')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                {t('পছন্দের পণ্য কার্টে যোগ করতে শপ ঘুরে দেখুন!', 'Explore our catalog to add items to your cart!')}
              </p>
              <button
                onClick={onClose}
                className="mt-3.5 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors cursor-pointer shadow-xs"
              >
                {t('কেনাকাটা শুরু করুন', 'Start Shopping Now')}
              </button>
            </div>
          ) : (
            cartItems.map((item, index) => {
              const matchedProduct = products.find((p) => p.id === item.productId);

              return (
                <div
                  key={`${item.productId}_${item.variant || ''}_${item.selectedSize || ''}_${item.selectedColor || ''}_${index}`}
                  className="py-3 flex items-start gap-3 group"
                >
                  {/* High Quality Original Product Image */}
                  <div
                    onClick={() => {
                      if (matchedProduct && onSelectProduct) {
                        onSelectProduct(matchedProduct);
                        onClose();
                      }
                    }}
                    className="cursor-pointer shrink-0"
                    title="View Product"
                  >
                    <CartItemImage
                      item={item}
                      product={matchedProduct}
                      sizeClassName="w-16 h-16 sm:w-18 sm:h-18"
                    />
                  </div>

                  {/* Product Details, Quality & Variants */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        onClick={() => {
                          if (matchedProduct && onSelectProduct) {
                            onSelectProduct(matchedProduct);
                            onClose();
                          }
                        }}
                        className="text-xs font-bold text-slate-800 dark:text-white truncate hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer transition-colors"
                        title={item.productName}
                      >
                        {item.productName}
                      </h4>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Brand / Quality / Stock Badge */}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-[10px]">
                      {matchedProduct?.brand && (
                        <span className="font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {matchedProduct.brand}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/60 dark:border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{t('১০০% আসল', '100% Original')}</span>
                      </span>
                      {matchedProduct?.stock !== undefined && matchedProduct.stock > 0 && (
                        <span className="text-slate-500 dark:text-slate-400">{t('স্টকে আছে', 'In Stock')}</span>
                      )}
                    </div>

                    {/* Selected Variant / Color / Size Badges */}
                    {(item.variant || item.selectedColor || item.selectedSize || item.selectedVariation) && (
                      <div className="flex items-center gap-1.5 text-[10px] mt-1 flex-wrap">
                        {item.selectedColor && (
                          <span className="font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-200/80 dark:border-sky-800 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            {t('রং:', 'Color:')} {item.selectedColor}
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-200/80 dark:border-indigo-800">
                            {t('সাইজ:', 'Size:')} {item.selectedSize}
                          </span>
                        )}
                        {item.variant && !item.selectedColor && !item.selectedSize && (
                          <span className="font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {item.variant}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price & Quantity Controls */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          ৳ {(item.price * item.quantity).toLocaleString('en-BD')}
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            (৳ {item.price.toLocaleString('en-BD')} {t('প্রতিটি', 'each')})
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                          className="px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer active:bg-slate-300"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-black text-slate-800 dark:text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          className="px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer active:bg-slate-300"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compact Footer / Summary */}
        {cartItems.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5">
            {/* Coupon Section (Compact) */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                    <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{t('কুপন', 'Coupon')} &apos;{appliedCoupon}&apos; (-৳{discountAmount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    className="text-rose-600 dark:text-rose-400 font-bold text-[11px] hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    {t('মুছুন', 'Remove')}
                  </button>
                </div>
              ) : showCouponForm ? (
                <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={t('কুপন কোড দিন (যেমন KENAX10)', 'Enter code (e.g. KENAX10)')}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 bg-white dark:bg-slate-800 uppercase font-semibold"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  >
                    {t('প্রয়োগ', 'Apply')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCouponForm(false);
                      setCouponError('');
                    }}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCouponForm(true)}
                    className="text-[11px] text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Tag className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                    <span>{t('প্রোমো কোড বা ভাউচার আছে?', 'Have a promo code?')}</span>
                  </button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-medium">{couponError}</p>}
            </div>

            {/* Calculations in ৳ BDT */}
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center">
                <span>{t('মোট মূল্য', 'Subtotal')}</span>
                <span className="font-bold text-slate-800 dark:text-white">৳ {subtotal.toLocaleString('en-BD')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>{t('ছাড় / ডিসকাউন্ট', 'Discount')}</span>
                  <span>- ৳ {discountAmount.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t('ডেলিভারি চার্জ', 'Estimated Delivery')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {deliveryCharge === 0 ? t('ফ্রি', 'FREE') : `৳ ${deliveryCharge}`}
                </span>
              </div>
            </div>

            {/* Compact Checkout Button */}
            <button
              onClick={() => {
                onClose();
                onCheckout();
              }}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-between px-4 transition-all cursor-pointer shadow-md shadow-sky-600/25 active:scale-98"
            >
              <span>{t('অর্ডার কনফার্ম করুন', 'Proceed to Checkout')}</span>
              <div className="flex items-center gap-1.5">
                <span>৳ {finalTotal.toLocaleString('en-BD')}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t('ক্যাশ অন ডেলিভারি ও নিরাপদ মোবাইল পেমেন্ট', 'Cash on Delivery & Secure Mobile Payments')}</span>
            </div>
          </div>
        )}

        {/* Mobile Handle Indicator at bottom */}
        <div className="sm:hidden py-1.5 flex justify-center shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};

