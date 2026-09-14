import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Trash2,
  Calendar,
  Percent,
  CheckCircle,
  XCircle,
  Save,
  X,
} from 'lucide-react';
import { Coupon, UserRole, StaffUser } from '../../types';

interface AdminCouponsProps {
  coupons: Coupon[];
  onAddCoupon: (coupon: Coupon) => void;
  onDeleteCoupon: (couponId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminCoupons: React.FC<AdminCouponsProps> = ({
  coupons,
  onAddCoupon,
  onDeleteCoupon,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minSpend, setMinSpend] = useState<number>(1500);
  const [maxDiscount, setMaxDiscount] = useState<number>(500);
  const [expiryDate, setExpiryDate] = useState('2026-12-31');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const newCoupon: Coupon = {
      id: 'cpn-' + Date.now(),
      code: code.trim().toUpperCase(),
      discountPercent: discountType === 'percent' ? discountValue : Math.round((discountValue / 2000) * 100),
      discountAmount: discountType === 'fixed' ? discountValue : undefined,
      minPurchase: minSpend,
      maxDiscount: discountType === 'percent' ? maxDiscount : undefined,
      validUntil: expiryDate,
      isActive: true,
      usageCount: 0,
    };

    onAddCoupon(newCoupon);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Promotions & Coupons ({coupons.length})</h2>
          <p className="hidden sm:block text-xs text-slate-500">Create discount codes for marketing campaigns</p>
        </div>
        <button
          onClick={() => {
            setCode('KENAX' + Math.floor(10 + Math.random() * 90));
            setDiscountType('percent');
            setDiscountValue(10);
            setMinSpend(1500);
            setMaxDiscount(500);
            setExpiryDate('2026-12-31');
            setIsModalOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Coupon</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-base text-sky-700 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200/60">
                  {c.code}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {c.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <p className="font-bold text-slate-900 text-sm">
                  {c.discountAmount ? `৳${c.discountAmount} Flat Discount` : `${c.discountPercent}% Off`}
                </p>
                <p>Min Purchase: <strong className="text-slate-800">৳{c.minPurchase.toLocaleString()}</strong></p>
                {c.maxDiscount && (
                  <p>Max Discount: <strong className="text-slate-800">৳{c.maxDiscount.toLocaleString()}</strong></p>
                )}
                <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                  <Calendar className="w-3 h-3" />
                  <span>Valid until: {c.validUntil}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">{c.usageCount || 0} times used</span>
              <button
                onClick={() => onDeleteCoupon(c.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Coupon"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">Create Discount Coupon</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EID2026, KENAX10"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {discountType === 'percent' ? 'Discount Percent (%)' : 'Discount Value (৳)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order (৳)</label>
                  <input
                    type="number"
                    required
                    value={minSpend}
                    onChange={(e) => setMinSpend(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Cap (৳)</label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Create Coupon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
