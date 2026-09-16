import React, { useState, useEffect } from 'react';
import {
  MapPin,
  X,
  AlertCircle,
  Phone,
  MessageCircle,
  FileText,
  User,
  Tag,
  Building,
  Check,
} from 'lucide-react';
import { SourcingLocation } from '../../../types';

interface SourcingLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (location: SourcingLocation) => Promise<void> | void;
  editingLocation: SourcingLocation | null;
}

export const SourcingLocationModal: React.FC<SourcingLocationModalProps> = ({
  isOpen,
  onClose,
  onSaveLocation,
  editingLocation,
}) => {
  const [vendorName, setVendorName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [memo, setMemo] = useState('');
  const [productCategories, setProductCategories] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingLocation) {
      setVendorName(editingLocation.vendorName || '');
      setMarketName(editingLocation.marketName || '');
      setAddress(editingLocation.address || '');
      setPhone(editingLocation.phone || '');
      setSecondaryPhone(editingLocation.secondaryPhone || '');
      setContactPerson(editingLocation.contactPerson || '');
      setMemo(editingLocation.memo || '');
      setProductCategories(editingLocation.productCategories || '');
      setStatus(editingLocation.status || 'active');
    } else {
      setVendorName('');
      setMarketName('');
      setAddress('');
      setPhone('');
      setSecondaryPhone('');
      setContactPerson('');
      setMemo('');
      setProductCategories('');
      setStatus('active');
    }
    setFormError(null);
    setIsSubmitting(false);
  }, [editingLocation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      setFormError('Wholesaler / Vendor name is required.');
      return;
    }
    if (!address.trim()) {
      setFormError('Physical shop / market address is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Contact phone number is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: SourcingLocation = {
        id: editingLocation ? editingLocation.id : `source-${Date.now()}`,
        vendorName: vendorName.trim(),
        marketName: marketName.trim() || undefined,
        address: address.trim(),
        phone: phone.trim(),
        secondaryPhone: secondaryPhone.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        memo: memo.trim() || undefined,
        productCategories: productCategories.trim() || undefined,
        status,
        createdAt: editingLocation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Wrap save in a timeout to guarantee the UI never gets stuck in a permanent loading loop
      await Promise.race([
        Promise.resolve(onSaveLocation(payload)),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      
      onClose();
    } catch (err) {
      console.warn('SourcingLocationModal save error:', err);
      setFormError('Failed to save sourcing wholesaler details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickMarkets = [
    'Islampur Cloth Wholesale Market',
    'Eastern Plus Market',
    'Stadium Gadget Market',
    'Chawkbazar Wholesale',
    'Elephant Road Wholesale',
    'New Market Hub',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingLocation ? 'Edit Sourcing Location & Wholesaler' : 'Register New Sourcing Wholesaler'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Manage physical wholesale suppliers, market contacts, and direct sourcing addresses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Wholesaler / Vendor Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wholesaler / Vendor Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Haji Fabrics & Wholesale, Al-Madina Electronics"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Wholesale Market & Quick suggestions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wholesale Market / Commercial Hub
            </label>
            <input
              type="text"
              value={marketName}
              onChange={(e) => setMarketName(e.target.value)}
              placeholder="e.g. Islampur Cloth Market, Eastern Plus Market, Stadium Market"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickMarkets.map((qm) => (
                <button
                  key={qm}
                  type="button"
                  onClick={() => {
                    setMarketName(qm);
                    if (!address) setAddress(`${qm}, Dhaka`);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                    marketName === qm
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {qm}
                </button>
              ))}
            </div>
          </div>

          {/* Physical Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shop & Physical Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop #28, 2nd Floor, Islampur Cloth Market, Old Dhaka"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Contact Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +880 1712-894521"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Secondary Phone / WhatsApp
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="e.g. +880 1812-445566"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Contact Person & Product Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Owner / Contact Person
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Haji Mohammad Rafiq"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sourced Product Categories
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productCategories}
                  onChange={(e) => setProductCategories(e.target.value)}
                  placeholder="e.g. Fabrics, Smart Watches, T-Shirts"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Memo & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wholesale Sourcing Memo & Purchase Notes
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Memo #4829 - Direct cash rate, 5% discount on bulk purchases over 50 pieces, 7 days replacement warranty."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 resize-none"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Wholesaler Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('active')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Active Wholesaler</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('inactive')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'inactive'
                    ? 'bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Inactive</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingLocation ? 'Update Wholesaler' : 'Register Wholesaler'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
