import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  AlertCircle,
  Globe,
  Facebook,
  Video,
  MessageCircle,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { Supplier } from '../../../types';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSupplier: (supplier: Supplier) => Promise<void> | void;
  editingSupplier: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSaveSupplier,
  editingSupplier,
}) => {
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [ceoPhone, setCeoPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingSupplier) {
      setName(editingSupplier.name || '');
      setWebsiteUrl(editingSupplier.websiteUrl || '');
      setFacebookUrl(editingSupplier.facebookUrl || '');
      setTiktokUrl(editingSupplier.tiktokUrl || '');
      setWhatsapp(editingSupplier.whatsapp || '');
      setPersonalPhone(editingSupplier.personalPhone || '');
      setManagerPhone(editingSupplier.managerPhone || '');
      setCeoPhone(editingSupplier.ceoPhone || '');
      setAddress(editingSupplier.address || '');
      setNotes(editingSupplier.notes || '');
      setStatus(editingSupplier.status || 'active');
    } else {
      setName('');
      setWebsiteUrl('');
      setFacebookUrl('');
      setTiktokUrl('');
      setWhatsapp('');
      setPersonalPhone('');
      setManagerPhone('');
      setCeoPhone('');
      setAddress('');
      setNotes('');
      setStatus('active');
    }
    setFormError(null);
    setIsSubmitting(false);
  }, [editingSupplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Supplier business name is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: Supplier = {
        id: editingSupplier ? editingSupplier.id : `supplier-${Date.now()}`,
        name: name.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
        personalPhone: personalPhone.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        ceoPhone: ceoPhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
        createdAt: editingSupplier?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await Promise.race([
        Promise.resolve(onSaveSupplier(payload)),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      onClose();
    } catch (err) {
      console.warn('Supplier save error:', err);
      setFormError('Failed to save supplier details. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingSupplier ? 'Edit Supplier Profile' : 'Add New Supplier'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Register business contacts, direct ordering portals, and sourcing links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Supplier Business Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shopbase Reseller, GadgetMart BD"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Partnership Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active (Verified Partner)</option>
              <option value="inactive">Inactive / Paused</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://shopbasebd.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Facebook className="w-3.5 h-3.5 text-blue-600" />
                Facebook Page Link
              </label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/supplier"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-slate-800" />
                TikTok Profile Link
              </label>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://tiktok.com/@supplier"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="017XXXXXXXX or +88017XXXXXXXX"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                CEO / Owner Phone
              </label>
              <input
                type="text"
                value={ceoPhone}
                onChange={(e) => setCeoPhone(e.target.value)}
                placeholder="019XXXXXXXX"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-600" />
                Manager / Operations Phone
              </label>
              <input
                type="text"
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                placeholder="018XXXXXXXX"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Office / Warehouse Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop 24, Level 4, Eastern Plus Market, Dhaka"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Internal Sourcing Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special pricing arrangements, packaging notes, return policy agreement..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Save Supplier')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
