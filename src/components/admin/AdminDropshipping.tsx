import React, { useState, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  Plus,
  AlertCircle,
  Package,
  Store,
  CheckCircle2,
  Check,
  X,
} from 'lucide-react';
import { Product, Supplier, Order, UserRole, StaffUser, SourcingLocation } from '../../types';
import {
  OWN_STOCK_SUPPLIER_ID,
  DropshippingAnalyticsData,
  SourcingLocationSummary,
} from './dropshipping/types';
import {
  computeDropshippingAnalytics,
  extractSourcingLocations,
} from './dropshipping/analyticsEngine';
import { SupplierDashboardView } from './dropshipping/SupplierDashboardView';
import { SupplierDeepDiveView } from './dropshipping/SupplierDeepDiveView';
import { SupplierDirectoryView } from './dropshipping/SupplierDirectoryView';
import { WholesalerRegisterView } from './dropshipping/WholesalerRegisterView';
import { SupplierModal } from './dropshipping/SupplierModal';
import { SourcingLocationModal } from './dropshipping/SourcingLocationModal';

export interface AdminDropshippingProps {
  products: Product[];
  orders: Order[];
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => Promise<void> | void;
  onUpdateSupplier: (supplier: Supplier) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  sourcingLocationsList?: SourcingLocation[];
  onAddSourcingLocation?: (location: SourcingLocation) => Promise<void> | void;
  onUpdateSourcingLocation?: (location: SourcingLocation) => Promise<void> | void;
  onDeleteSourcingLocation?: (locationId: string) => Promise<void> | void;
  onEditProduct?: (product: Product) => void;
  onAddProductForSupplier?: (supplier: Supplier) => void;
  currentRole?: UserRole;
  currentStaff?: StaffUser | null;
}

export const AdminDropshipping: React.FC<AdminDropshippingProps> = ({
  products = [],
  orders = [],
  suppliers = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  sourcingLocationsList,
  onAddSourcingLocation,
  onUpdateSourcingLocation,
  onDeleteSourcingLocation,
  onEditProduct,
  onAddProductForSupplier,
}) => {
  // Navigation Tabs: 'dashboard' (Analytics) | 'suppliers' (Directory) | 'wholesalers' (Registry)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'suppliers' | 'wholesalers'>('dashboard');

  // Deep-dive selection in Dashboard tab
  const [selectedAnalyticsSupplierId, setSelectedAnalyticsSupplierId] = useState<string | null>(null);

  // Selected supplier in Directory tab
  const [selectedDirectorySupplierId, setSelectedDirectorySupplierId] = useState<string | null>(null);

  // Order status filter in Dashboard: 'all' | 'delivered' | 'active'
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'delivered' | 'active'>('all');

  // Modal states for Supplier Add / Edit / Delete
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Modal states for Wholesaler / Sourcing Location Add / Edit / Delete
  const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);
  const [editingSourcingLocation, setEditingSourcingLocation] = useState<SourcingLocation | null>(null);
  const [sourcingLocationToDeleteId, setSourcingLocationToDeleteId] = useState<string | null>(null);

  // Toast notification feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  // Sourcing locations merged from registered database entities + products
  const sourcingLocations = useMemo(() => {
    return extractSourcingLocations(products, sourcingLocationsList);
  }, [products, sourcingLocationsList]);

  // Comprehensive analytics calculation
  const analyticsData: DropshippingAnalyticsData = useMemo(() => {
    return computeDropshippingAnalytics(products, orders, suppliers, orderStatusFilter, sourcingLocationsList);
  }, [products, orders, suppliers, orderStatusFilter, sourcingLocationsList]);

  // Deep dive analytics item when viewing a specific supplier / own-stock in Dashboard
  const activeAnalyticsItem = useMemo(() => {
    if (!selectedAnalyticsSupplierId) return null;
    return (
      analyticsData.supplierList.find((s) => s.supplier.id === selectedAnalyticsSupplierId) ||
      null
    );
  }, [selectedAnalyticsSupplierId, analyticsData]);

  // Handlers for Supplier modal
  const handleOpenAddSupplierModal = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplierModal = (supplier: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    try {
      if (editingSupplier) {
        await onUpdateSupplier(supplier);
        showToast(`সাপ্লাইয়ার "${supplier.name}" সফলভাবে আপডেট হয়েছে!`);
      } else {
        await onAddSupplier(supplier);
        showToast(`নতুন সাপ্লাইয়ার "${supplier.name}" সফলভাবে যোগ হয়েছে!`);
      }
    } catch (e) {
      showToast('সাপ্লাইয়ার সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।', 'error');
    }
  };

  const handleRequestDeleteSupplier = (supplier: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSupplierToDelete(supplier);
  };

  const handleDeleteSupplierConfirm = async () => {
    if (!supplierToDelete) return;
    const name = supplierToDelete.name;
    try {
      await onDeleteSupplier(supplierToDelete.id);
      if (selectedDirectorySupplierId === supplierToDelete.id) {
        setSelectedDirectorySupplierId(null);
      }
      if (selectedAnalyticsSupplierId === supplierToDelete.id) {
        setSelectedAnalyticsSupplierId(null);
      }
      setSupplierToDelete(null);
      showToast(`সাপ্লাইয়ার "${name}" সফলভাবে মুছে ফেলা হয়েছে!`);
    } catch (e) {
      showToast('সাপ্লাইয়ার ডিলিট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  // Handlers for Wholesaler / Sourcing Location modal
  const handleOpenAddSourcingModal = () => {
    setEditingSourcingLocation(null);
    setIsSourcingModalOpen(true);
  };

  const handleOpenEditSourcingModal = (loc: SourcingLocationSummary | SourcingLocation) => {
    const converted: SourcingLocation = {
      id: loc.id || `loc-${Date.now()}`,
      vendorName: loc.vendorName || '',
      marketName: loc.marketName || '',
      address: loc.address || '',
      phone: loc.phone || '',
      secondaryPhone: loc.secondaryPhone || '',
      contactPerson: loc.contactPerson || '',
      productCategories: loc.productCategories || '',
      memo: loc.memo || '',
      status: loc.status || 'active',
      createdAt: (loc as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingSourcingLocation(converted);
    setIsSourcingModalOpen(true);
  };

  const handleSaveSourcingLocation = async (loc: SourcingLocation) => {
    try {
      if (editingSourcingLocation && onUpdateSourcingLocation) {
        await onUpdateSourcingLocation(loc);
        showToast(`হোলসেলার "${loc.vendorName}" সফলভাবে আপডেট ও সেভ হয়েছে!`);
      } else if (onAddSourcingLocation) {
        await onAddSourcingLocation(loc);
        showToast(`নতুন হোলসেলার "${loc.vendorName}" সফলভাবে রেজিস্টার হয়েছে!`);
      }
    } catch (e) {
      showToast('হোলসেলার সেভ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।', 'error');
    }
  };

  const handleDeleteSourcingLocationConfirm = async () => {
    if (!sourcingLocationToDeleteId) return;
    try {
      if (onDeleteSourcingLocation) {
        await onDeleteSourcingLocation(sourcingLocationToDeleteId);
      }
      setSourcingLocationToDeleteId(null);
      showToast('হোলসেলার লোকেশন সফলভাবে মুছে ফেলা হয়েছে!');
    } catch (e) {
      showToast('হোলসেলার মুছতে সমস্যা হয়েছে।', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
              : 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-100 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Suppliers & Sourcing</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage dropshipping partners, registered wholesalers, sourcing locations, costs & net profits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddSourcingModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Register Wholesaler</span>
            </button>
            <button
              onClick={handleOpenAddSupplierModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dropshipping Partner</span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedAnalyticsSupplierId(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'dashboard'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Supplier & Sourcing Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('suppliers');
              setSelectedDirectorySupplierId(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'suppliers'
                ? 'border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Suppliers Directory</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wholesalers')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === 'wholesalers'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 font-black'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Wholesalers Register</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
              {sourcingLocations.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD VIEW (Overview or Deep Dive) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <>
          {activeAnalyticsItem ? (
            <SupplierDeepDiveView
              analyticsItem={activeAnalyticsItem}
              onBack={() => setSelectedAnalyticsSupplierId(null)}
              onEditProduct={onEditProduct}
              onAddProductForSupplier={onAddProductForSupplier}
              onOpenEditSupplier={handleOpenEditSupplierModal}
              onOpenAddSourcingModal={handleOpenAddSourcingModal}
              onOpenEditSourcingModal={handleOpenEditSourcingModal}
              onDeleteSourcingLocation={(id) => setSourcingLocationToDeleteId(id)}
            />
          ) : (
            <SupplierDashboardView
              analytics={analyticsData}
              orderStatusFilter={orderStatusFilter}
              setOrderStatusFilter={setOrderStatusFilter}
              onSelectSupplierForDetail={(id) => setSelectedAnalyticsSupplierId(id)}
              onEditProduct={onEditProduct}
              onAddProductForSupplier={onAddProductForSupplier}
            />
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <SupplierDirectoryView
          suppliers={suppliers}
          products={products}
          selectedSupplierId={selectedDirectorySupplierId}
          setSelectedSupplierId={setSelectedDirectorySupplierId}
          onOpenAddModal={handleOpenAddSupplierModal}
          onOpenEditModal={handleOpenEditSupplierModal}
          onRequestDelete={handleRequestDeleteSupplier}
          onEditProduct={onEditProduct}
          onAddProductForSupplier={onAddProductForSupplier}
          sourcingLocations={sourcingLocations}
          onOpenAddSourcingModal={handleOpenAddSourcingModal}
          onOpenEditSourcingModal={handleOpenEditSourcingModal}
          onDeleteSourcingLocation={(id) => setSourcingLocationToDeleteId(id)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WHOLESALERS REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'wholesalers' && (
        <WholesalerRegisterView
          sourcingLocations={sourcingLocations}
          onOpenAddModal={handleOpenAddSourcingModal}
          onOpenEditModal={handleOpenEditSourcingModal}
          onDeleteLocation={(id) => setSourcingLocationToDeleteId(id)}
          onEditProduct={onEditProduct}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUPPLIER (DROPSHIPPING) */}
      {/* ========================================================================= */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSaveSupplier={handleSaveSupplier}
        editingSupplier={editingSupplier}
      />

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SOURCING LOCATION (WHOLESALER) */}
      {/* ========================================================================= */}
      <SourcingLocationModal
        isOpen={isSourcingModalOpen}
        onClose={() => setIsSourcingModalOpen(false)}
        onSaveLocation={handleSaveSourcingLocation}
        editingLocation={editingSourcingLocation}
      />

      {/* ========================================================================= */}
      {/* MODAL: DELETE SUPPLIER CONFIRMATION */}
      {/* ========================================================================= */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-slate-900">Delete Supplier?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <b className="text-slate-800">{supplierToDelete.name}</b> from the supplier directory?
              Products currently mapped to this supplier will retain their details.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSupplierConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE SOURCING LOCATION CONFIRMATION */}
      {/* ========================================================================= */}
      {sourcingLocationToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-black text-slate-900">Delete Wholesaler?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this wholesaler sourcing location? Any products with this location will retain their details.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSourcingLocationToDeleteId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSourcingLocationConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
              >
                Delete Wholesaler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
