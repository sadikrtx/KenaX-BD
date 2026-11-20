import React, { useState, useMemo } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  Minus,
  Truck,
  CreditCard,
  User,
  MapPin,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileText,
  Phone,
  Search,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  StaffUser,
  SiteSettings,
} from '../../types';
import { CartItemImage } from '../CartItemImage';
import { ClickableOrderId } from '../common/ClickableOrderId';
import { useLanguage } from '../../context/LanguageContext';

interface AdminEditOrderModalProps {
  order: Order;
  products: Product[];
  currentStaff: StaffUser | null;
  settings?: SiteSettings;
  onClose: () => void;
  onSave: (orderId: string, updates: Partial<Order>) => Promise<void> | void;
}

export const AdminEditOrderModal: React.FC<AdminEditOrderModalProps> = ({
  order,
  products = [],
  currentStaff,
  settings,
  onClose,
  onSave,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Customer Information states
  const [customerName, setCustomerName] = useState(
    order.deliveryName || order.customerName || ''
  );
  const [customerMobile, setCustomerMobile] = useState(
    order.deliveryMobile || order.customerMobile || ''
  );
  const [alternativePhone, setAlternativePhone] = useState(
    order.customerPhone || order.phone || ''
  );
  const [customerEmail, setCustomerEmail] = useState(order.customerEmail || '');
  const [fullAddress, setFullAddress] = useState(
    order.fullAddress || order.deliveryAddress || order.address || ''
  );
  const [district, setDistrict] = useState(order.district || 'Dhaka');
  const [upazila, setUpazila] = useState(order.upazila || '');
  const [division, setDivision] = useState(order.division || order.customerDivision || 'Dhaka');
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    order.deliveryInstructions || order.notes || ''
  );

  // Ordered Items list state
  const [items, setItems] = useState<OrderItem[]>(
    order.items && order.items.length > 0
      ? order.items.map((it) => ({
          ...it,
          quantity: it.quantity || 1,
          price: Number(it.price) || 0,
          total: (Number(it.price) || 0) * (it.quantity || 1),
        }))
      : []
  );

  // Financial fields states
  const [deliveryCharge, setDeliveryCharge] = useState<number>(
    Number(order.deliveryCharge) >= 0 ? Number(order.deliveryCharge) : 60
  );
  const [discountAmount, setDiscountAmount] = useState<number>(
    Number(order.discountAmount ?? order.discount ?? 0) || 0
  );
  const [advancePaid, setAdvancePaid] = useState<number>(
    Number(order.paidAmount ?? 0) || 0
  );

  // Status & Courier states
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.orderStatus || 'Pending');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    order.paymentMethod || 'Cash on Delivery'
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.paymentStatus || 'Pending'
  );
  const [transactionId, setTransactionId] = useState(order.transactionId || '');
  const [courierName, setCourierName] = useState(order.courierName || 'Steadfast Courier');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || '');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');

  // Add Product to Order modal/inline state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductVariant, setSelectedProductVariant] = useState('');
  const [selectedProductColor, setSelectedProductColor] = useState('');
  const [selectedProductSize, setSelectedProductSize] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductPrice, setNewProductPrice] = useState<number>(0);

  // Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived selected product for adding
  const activeSelectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Automatically update price & variants when selected product changes
  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setNewProductPrice(Number(prod.price) || 0);
      const firstColor = prod.colors && prod.colors.length > 0 
        ? (typeof prod.colors[0] === 'string' ? prod.colors[0] : prod.colors[0]?.name || '')
        : '';
      setSelectedProductColor(firstColor);
      setSelectedProductSize(prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : '');
      setSelectedProductVariant('');
    } else {
      setNewProductPrice(0);
      setSelectedProductColor('');
      setSelectedProductSize('');
      setSelectedProductVariant('');
    }
  };

  // Recalculate totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const val = subtotal + Number(deliveryCharge || 0) - Number(discountAmount || 0);
    return val > 0 ? val : 0;
  }, [subtotal, deliveryCharge, discountAmount]);

  const dueAmount = useMemo(() => {
    const due = grandTotal - Number(advancePaid || 0);
    return due > 0 ? due : 0;
  }, [grandTotal, advancePaid]);

  // Item handlers
  const handleUpdateItemQuantity = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      const currentQty = next[index].quantity || 1;
      const updatedQty = Math.max(1, currentQty + delta);
      next[index] = {
        ...next[index],
        quantity: updatedQty,
        total: (Number(next[index].price) || 0) * updatedQty,
      };
      return next;
    });
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    setItems((prev) => {
      const next = [...prev];
      const validPrice = Math.max(0, newPrice);
      next[index] = {
        ...next[index],
        price: validPrice,
        total: validPrice * (next[index].quantity || 1),
      };
      return next;
    });
  };

  const handleUpdateItemVariant = (index: number, field: 'selectedColor' | 'selectedSize' | 'variant', value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      const msg = isBn
        ? 'অর্ডারে অন্তত একটি পণ্য থাকা আবশ্যক! সম্পূর্ণ অর্ডার খালি করা যাবে না।'
        : 'An order must contain at least one item! You cannot remove all items.';
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItemToOrder = () => {
    if (!activeSelectedProduct) {
      setErrorMessage(isBn ? 'অনুগ্রহ করে একটি পণ্য নির্বাচন করুন।' : 'Please select a product.');
      return;
    }
    if (newProductQuantity < 1) {
      setErrorMessage(isBn ? 'পণ্যের পরিমাণ অন্তত ১ হতে হবে।' : 'Quantity must be at least 1.');
      return;
    }

    const newItem: OrderItem = {
      productId: activeSelectedProduct.id,
      productName: activeSelectedProduct.name,
      name: activeSelectedProduct.name,
      productImage: activeSelectedProduct.images?.[0] || '',
      image: activeSelectedProduct.images?.[0] || '',
      sku: activeSelectedProduct.sku || '',
      quantity: newProductQuantity,
      price: Math.max(0, newProductPrice),
      total: Math.max(0, newProductPrice) * newProductQuantity,
      selectedColor: selectedProductColor || undefined,
      selectedSize: selectedProductSize || undefined,
      variant: selectedProductVariant || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddProduct(false);
    setSelectedProductId('');
    setNewProductQuantity(1);
    setNewProductPrice(0);
    setSelectedProductColor('');
    setSelectedProductSize('');
    setErrorMessage(null);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = customerName.trim();
    const cleanMobile = customerMobile.trim();
    const cleanAddress = fullAddress.trim();

    if (!cleanName) {
      setErrorMessage(isBn ? 'গ্রাহকের নাম পূরণ করা আবশ্যক।' : 'Customer name is required.');
      return;
    }
    if (!cleanMobile || cleanMobile.replace(/[^0-9]/g, '').length < 10) {
      setErrorMessage(
        isBn
          ? 'সঠিক মোবাইল নম্বর (অন্তত ১০-১১ ডিজিট) পূরণ করা আবশ্যক।'
          : 'A valid mobile number (at least 10-11 digits) is required.'
      );
      return;
    }
    if (!cleanAddress) {
      setErrorMessage(isBn ? 'ডেলিভারির পূর্ণ ঠিকানা পূরণ করা আবশ্যক।' : 'Full delivery address is required.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage(isBn ? 'অর্ডারে অন্তত একটি পণ্য থাকতে হবে।' : 'Order must contain at least one item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowISO = new Date().toISOString();
      const updatedTimeline = [
        ...(order.timeline || []),
        {
          status: orderStatus,
          timestamp: nowISO,
          note: isBn
            ? `অর্ডার #${order.id} এর তথ্য স্টাফ (${currentStaff?.name || 'অ্যাডমিন'}) দ্বারা এডিট ও আপডেট করা হয়েছে।`
            : `Order #${order.id} details edited and updated by staff (${currentStaff?.name || 'Admin'}).`,
          updatedBy: currentStaff?.name || 'Admin',
        },
      ];

      const updates: Partial<Order> = {
        customerName: cleanName,
        deliveryName: cleanName,
        customerMobile: cleanMobile,
        deliveryMobile: cleanMobile,
        customerPhone: alternativePhone.trim() || undefined,
        phone: cleanMobile,
        mobile: cleanMobile,
        customerEmail: customerEmail.trim() || undefined,
        fullAddress: cleanAddress,
        deliveryAddress: cleanAddress,
        address: cleanAddress,
        district: district.trim(),
        upazila: upazila.trim(),
        division: division.trim(),
        customerDivision: division.trim(),
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        notes: deliveryInstructions.trim() || undefined,
        
        items,
        subtotal,
        deliveryCharge: Math.max(0, Number(deliveryCharge) || 0),
        discount: Math.max(0, Number(discountAmount) || 0),
        discountAmount: Math.max(0, Number(discountAmount) || 0),
        totalAmount: grandTotal,
        paidAmount: Math.max(0, Number(advancePaid) || 0),
        dueAmount: dueAmount,

        orderStatus,
        paymentMethod,
        paymentStatus,
        transactionId: transactionId.trim() || undefined,
        courierName: courierName.trim() || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        trackingUrl: trackingUrl.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,

        handledByStaffId: currentStaff?.id || order.handledByStaffId,
        handledByStaffName: currentStaff?.name || order.handledByStaffName,
        handledByStaffRole: currentStaff?.role || order.handledByStaffRole,
        timeline: updatedTimeline,
        updatedAt: nowISO,
      };

      await onSave(order.id, updates);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isBn ? 'অর্ডার আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Failed to update order. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>{isBn ? 'অর্ডার' : 'Edit Order'}</span>
                <ClickableOrderId
                  orderId={order.id}
                  className="text-white hover:text-amber-300 font-mono font-bold text-base sm:text-lg cursor-pointer transition-colors"
                  copiedClassName="text-[10px] text-emerald-400 font-bold ml-1.5 animate-pulse bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-500/50"
                />
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {order.orderStatus}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBn
                  ? 'ক্যাশ অন ডেলিভারি চার্জ, পণ্যের দাম ও পরিমার্জন, গ্রাহকের ঠিকানা এবং অর্ডারের তথ্য পরিবর্তন করুন'
                  : 'Adjust COD charge, item prices, quantities, customer address, and order parameters'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title={isBn ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Ordered Products & Price Editor */}
          <div className="bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isBn ? '১. অর্ডারের পণ্য ও মূল্য সমন্বয়' : '1. Order Items & Price Adjustments'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'প্রতিটি পণ্যের একক দাম কমাতে-বাড়াতে পারবেন এবং পরিমাণ পরিবর্তন করতে পারবেন'
                      : 'You can increase/decrease unit prices, change quantities or add new items'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddProduct(true)}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? 'নতুন পণ্য যুক্ত করুন' : 'Add Item'}</span>
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {items.map((it, idx) => {
                const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 1);
                return (
                  <div
                    key={`${it.productId || idx}-${idx}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CartItemImage
                          item={it}
                          product={products.find((p) => p.id === it.productId)}
                          sizeClassName="w-12 h-12 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {it.productName || it.name || (isBn ? 'পণ্য' : 'Product')}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            {it.sku && <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">SKU: {it.sku}</span>}
                            {it.selectedColor && (
                              <span className="font-medium bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {isBn ? 'রং:' : 'Color:'} {it.selectedColor}
                              </span>
                            )}
                            {it.selectedSize && (
                              <span className="font-medium bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {isBn ? 'সাইজ:' : 'Size:'} {it.selectedSize}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title={isBn ? 'আইটেম মুছুন' : 'Remove item'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price, Quantity & Subtotal Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/80 items-center">
                      {/* Unit Price Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isBn ? 'একক মূল্য (৳)' : 'Unit Price (৳)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                            ৳
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={it.price}
                            onChange={(e) => handleUpdateItemPrice(idx, Number(e.target.value) || 0)}
                            className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isBn ? 'পরিমাণ' : 'Quantity'}
                        </label>
                        <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 p-0.5 w-fit">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => {
                              const q = Math.max(1, Number(e.target.value) || 1);
                              setItems((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  quantity: q,
                                  total: (Number(next[idx].price) || 0) * q,
                                };
                                return next;
                              });
                            }}
                            className="w-12 text-center text-xs font-mono font-bold text-slate-900 dark:text-white bg-transparent border-0 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="sm:text-right">
                        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {isBn ? 'মোট বিক্রয় মূল্য' : 'Line Total'}
                        </span>
                        <span className="font-mono font-black text-sm text-sky-600 dark:text-sky-400">
                          ৳{lineTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add New Product Inline Drawer */}
            {showAddProduct && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800 pb-2">
                  <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>{isBn ? 'স্টোর থেকে নতুন পণ্য যোগ করুন' : 'Select Product from Catalog'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isBn ? 'পণ্য নির্বাচন করুন *' : 'Select Product *'}
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">{isBn ? '-- একটি পণ্য নির্বাচন করুন --' : '-- Choose a product --'}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (৳{p.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {activeSelectedProduct && (
                    <>
                      {/* Price & Quantity for new item */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isBn ? 'একক মূল্য (৳)' : 'Unit Price (৳)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProductPrice}
                          onChange={(e) => setNewProductPrice(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {isBn ? 'পরিমাণ' : 'Quantity'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={newProductQuantity}
                          onChange={(e) => setNewProductQuantity(Math.max(1, Number(e.target.value) || 1))}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Optional Color / Size */}
                      {activeSelectedProduct.colors && activeSelectedProduct.colors.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isBn ? 'রং' : 'Color'}
                          </label>
                          <select
                            value={selectedProductColor}
                            onChange={(e) => setSelectedProductColor(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="">{isBn ? 'ডিফল্ট' : 'Default'}</option>
                            {activeSelectedProduct.colors.map((c, i) => {
                              const colorVal = typeof c === 'string' ? c : c?.name || '';
                              return (
                                <option key={`${colorVal}-${i}`} value={colorVal}>
                                  {colorVal}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {activeSelectedProduct.sizes && activeSelectedProduct.sizes.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {isBn ? 'সাইজ' : 'Size'}
                          </label>
                          <select
                            value={selectedProductSize}
                            onChange={(e) => setSelectedProductSize(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="">{isBn ? 'ডিফল্ট' : 'Default'}</option>
                            {activeSelectedProduct.sizes.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-800">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewItemToOrder}
                    disabled={!activeSelectedProduct}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    {isBn ? 'অর্ডারে যোগ করুন' : 'Add to Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Delivery & Cash on Delivery Charge Customization */}
          <div className="bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '২. ক্যাশ অন ডেলিভারি চার্জ নির্ধারণ' : '2. Cash on Delivery Charge Setting'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'গ্রাহকের জন্য ডেলিভারি চার্জ বাড়াতে বা কমাতে পারেন কিংবা এক ক্লিকে সেট করতে পারেন'
                    : 'Increase or decrease delivery fee or apply 1-click zone presets'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isBn ? 'ডেলিভারি চার্জ (৳) *' : 'Delivery Charge (৳) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-sm focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* Quick Presets Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryCharge(60)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      deliveryCharge === 60
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {isBn ? 'ঢাকার ভিতরে (৳৬০)' : 'Inside Dhaka (৳60)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryCharge(120)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      deliveryCharge === 120
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {isBn ? 'ঢাকার বাইরে (৳১২০)' : 'Outside Dhaka (৳120)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryCharge(100)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      deliveryCharge === 100
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    {isBn ? 'সাব-ঢাকা (৳১০০)' : 'Sub-Dhaka (৳100)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryCharge(0)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      deliveryCharge === 0
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {isBn ? 'ফ্রি ডেলিভারি (৳০)' : 'Free Delivery (৳0)'}
                  </button>
                </div>
              </div>

              {/* Extra Discount & Advance Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'বিশেষ ছাড় / ডিসকাউন্ট (৳)' : 'Extra Discount (৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isBn ? 'অগ্রিম পরিশোধ (৳)' : 'Advance Paid (৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Live Financial Calculation Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'পণ্যের মোট মূল্য:' : 'Subtotal:'}
                </span>
                <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  ৳{subtotal.toLocaleString()}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'ডেলিভারি চার্জ:' : 'Delivery Charge:'}
                </span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  +৳{deliveryCharge.toLocaleString()}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'সর্বমোট অর্ডার মূল্য:' : 'Grand Total:'}
                </span>
                <p className="font-mono font-black text-slate-900 dark:text-white text-base">
                  ৳{grandTotal.toLocaleString()}
                </p>
              </div>

              <div className="space-y-0.5 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-800 dark:text-emerald-300 font-extrabold text-[11px] block">
                  {isBn ? 'বকেয়া ক্যাশ অন ডেলিভারি:' : 'Cash on Delivery Due:'}
                </span>
                <p className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-base">
                  ৳{dueAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Customer Information & Delivery Address Editor */}
          <div className="bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '৩. গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা' : '3. Customer Details & Delivery Address'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'গ্রাহকের নাম, মোবাইল নম্বর এবং পণ্য পৌঁছানোর সঠিক ঠিকানা পরিবর্তন করুন'
                    : 'Update recipient name, phone number, and physical destination'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'গ্রাহকের নাম *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'উদা: সাদিকুর রহমান' : 'e.g. John Doe'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'প্রাথমিক মোবাইল নম্বর *' : 'Primary Mobile Number *'}
                </label>
                <input
                  type="tel"
                  required
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'বিকল্প মোবাইল নম্বর' : 'Alternative Mobile Number'}
                </label>
                <input
                  type="tel"
                  value={alternativePhone}
                  onChange={(e) => setAlternativePhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'বিকল্প ফোন নম্বর (যদি থাকে)' : 'Optional alternate phone'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder="example@mail.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'পূর্ণ ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা) *' : 'Full Delivery Address *'}
                </label>
                <textarea
                  required
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'হাউস নং, রোড নং, এলাকা...' : 'House number, street address, neighborhood...'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'জেলা (District)' : 'District'}
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'উদা: ঢাকা, চট্টগ্রাম...' : 'e.g. Dhaka, Chittagong...'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'উপজেলা / থানা (Thana / Upazila)' : 'Thana / Upazila'}
                </label>
                <input
                  type="text"
                  value={upazila}
                  onChange={(e) => setUpazila(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'উদা: মিরপুর, ধানমন্ডি...' : 'e.g. Mirpur, Dhanmondi...'}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'বিশেষ ডেলিভারি নির্দেশনা / কাস্টমার নোট' : 'Special Delivery Instructions / Notes'}
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 shadow-2xs"
                  placeholder={isBn ? 'উদা: কল দিয়ে ডেলিভারি করবেন, সকাল ১০টার পর...' : 'e.g. Call before delivery, deliver after 10 AM...'}
                />
              </div>
            </div>
          </div>

          {/* 4. Payment, Courier & Status Parameters */}
          <div className="bg-slate-50 dark:bg-slate-850/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '৪. পেমেন্ট, কুরিয়ার ও অর্ডার স্ট্যাটাস' : '4. Payment, Courier & Status Control'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isBn
                    ? 'পেমেন্ট মাধ্যম, কুরিয়ার ট্র্যাকিং এবং ইন্টারনাল স্টাফ নোট হালনাগাদ করুন'
                    : 'Update courier tracking, payment status and internal staff remarks'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'অর্ডার স্ট্যাটাস' : 'Order Status'}
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Pending">{isBn ? 'অপেক্ষমান (Pending)' : 'Pending'}</option>
                  <option value="Confirmed">{isBn ? 'কনফার্মড (Confirmed)' : 'Confirmed'}</option>
                  <option value="Processing">{isBn ? 'প্রসেসিং (Processing)' : 'Processing'}</option>
                  <option value="Shipped">{isBn ? 'শিপড (Shipped)' : 'Shipped'}</option>
                  <option value="Delivered">{isBn ? 'ডেলিভার্ড (Delivered)' : 'Delivered'}</option>
                  <option value="Cancelled">{isBn ? 'বাতিল (Cancelled)' : 'Cancelled'}</option>
                  <option value="Fake Order">{isBn ? 'ফেক অর্ডার (Fake Order)' : 'Fake Order'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Cash on Delivery">{isBn ? 'ক্যাশ অন ডেলিভারি (COD)' : 'Cash on Delivery'}</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Bank Transfer">{isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'পেমেন্ট স্ট্যাটাস' : 'Payment Status'}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Pending">{isBn ? 'পেন্ডিং / অপেক্ষমান' : 'Pending'}</option>
                  <option value="Paid">{isBn ? 'সম্পূর্ণ পরিশোধিত (Paid)' : 'Paid'}</option>
                  <option value="Verified">{isBn ? 'ভেরিফাইড (Verified)' : 'Verified'}</option>
                  <option value="Unpaid">{isBn ? 'অপরিশোধিত (Unpaid)' : 'Unpaid'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'কুরিয়ার পার্টনার' : 'Courier Partner'}
                </label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Steadfast Courier">Steadfast Courier</option>
                  <option value="Pathao Courier">Pathao Courier</option>
                  <option value="RedX">RedX</option>
                  <option value="Carrybee">Carrybee</option>
                  <option value="Sundarban Courier">Sundarban Courier</option>
                  <option value="Paperfly">Paperfly</option>
                  <option value="eCourier">eCourier</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'কুরিয়ার ট্র্যাকিং কোড' : 'Tracking Code'}
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  placeholder="e.g. SF-982144"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID (TrxID)'}
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  placeholder="e.g. 9K2L1P0M"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'স্টাফ ইন্টারনাল নোট / মন্তব্য' : 'Internal Staff Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  placeholder={
                    isBn
                      ? 'অর্ডার পরিবর্তনের কারণ বা বিশেষ স্টাফ মন্তব্য এখানে লিখে রাখুন...'
                      : 'Internal remarks, reason for price/delivery modifications...'
                  }
                />
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              {isBn ? 'বাতিল করুন' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {isSubmitting ? (
                <span>{isBn ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving Changes...'}</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
