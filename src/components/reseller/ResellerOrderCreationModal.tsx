import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  ShoppingBag,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Search,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  User,
  MapPin,
  FileText,
  CreditCard,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Product, Order, OrderItem } from '../../types';
import { ResellerUser, ResellerCustomer } from '../../types/reseller';
import { checkCourierFraud, normalizePhoneForCourier } from '../../lib/courierFraudService';
import { CourierFraudReport } from '../../types';
import { BANGLADESH_LOCATIONS } from '../../data/bangladeshData';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface OrderItemDraft {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sellingPrice: number; // Retail price charged to end customer
}

interface ResellerOrderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  reseller: ResellerUser;
  customers: ResellerCustomer[];
  initialProduct?: Product | null;
  lang?: 'bn' | 'en';
  onOrderPlaced: (order: Order, earnedProfit: number) => void;
}

// Flat list of 64 districts
const ALL_DISTRICTS: string[] = (() => {
  const list: string[] = [];
  Object.values(BANGLADESH_LOCATIONS).forEach((div) => {
    Object.keys(div.districts).forEach((dist) => {
      list.push(dist);
    });
  });
  return list.sort();
})();

export const ResellerOrderCreationModal: React.FC<ResellerOrderCreationModalProps> = ({
  isOpen,
  onClose,
  products,
  reseller,
  customers,
  initialProduct,
  lang = 'bn',
  onOrderPlaced,
}) => {
  const isBn = lang === 'bn';

  // Allowed products for reselling
  const allowedProducts = useMemo(() => {
    return products.filter((p) => p.allowReselling !== false);
  }, [products]);

  // Order Items in Cart
  const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);

  // Search & add additional products
  const [productSearch, setProductSearch] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Customer Mode & Details
  const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('Dhaka');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Delivery Charge & Advance Payment Selection
  const [deliveryFee, setDeliveryFee] = useState<number>(60);
  const [hasTakenAdvance, setHasTakenAdvance] = useState<'yes' | 'no'>('no');
  const [advanceAmount, setAdvanceAmount] = useState<number>(60);
  const [advanceMethod, setAdvanceMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');

  // Terms & Conditions Agreement Checkbox
  const [isTermsAgreed, setIsTermsAgreed] = useState(false);

  // Steadfast Customer Report State
  const [reportPhone, setReportPhone] = useState('');
  const [isCheckingReport, setIsCheckingReport] = useState(false);
  const [fraudReport, setFraudReport] = useState<CourierFraudReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Set initial product when modal opens
  useEffect(() => {
    if (initialProduct) {
      const wholesale = initialProduct.resellerPrice || initialProduct.price;
      const suggested = initialProduct.suggestedResellerRetailPrice || Math.round(wholesale * 1.25);
      const rawColor = initialProduct.colors?.[0];
      const colorStr = typeof rawColor === 'string' ? rawColor : rawColor?.name || 'Default';

      setOrderItems([
        {
          product: initialProduct,
          quantity: 1,
          selectedColor: colorStr,
          selectedSize: initialProduct.sizes?.[0] || '',
          sellingPrice: suggested,
        },
      ]);
    } else if (allowedProducts.length > 0) {
      const p = allowedProducts[0];
      const wholesale = p.resellerPrice || p.price;
      const suggested = p.suggestedResellerRetailPrice || Math.round(wholesale * 1.25);
      const rawColor = p.colors?.[0];
      const colorStr = typeof rawColor === 'string' ? rawColor : rawColor?.name || 'Default';

      setOrderItems([
        {
          product: p,
          quantity: 1,
          selectedColor: colorStr,
          selectedSize: p.sizes?.[0] || '',
          sellingPrice: suggested,
        },
      ]);
    }
  }, [initialProduct, allowedProducts]);

  // Sync phone to report phone
  useEffect(() => {
    if (customerPhone && !reportPhone) {
      setReportPhone(customerPhone);
    }
  }, [customerPhone, reportPhone]);

  // Adjust delivery fee when district changes
  useEffect(() => {
    if (customerDistrict.toLowerCase() === 'dhaka') {
      setDeliveryFee(60);
    } else {
      setDeliveryFee(120);
    }
  }, [customerDistrict]);

  // Handle customer selection from existing directory
  const handleSelectExistingCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setReportPhone(found.phone);
      setCustomerDistrict(found.district || 'Dhaka');
      setCustomerAddress(found.address);
    }
  };

  // Add another product to the order
  const handleAddProduct = (prod: Product) => {
    const wholesale = prod.resellerPrice || prod.price;
    const suggested = prod.suggestedResellerRetailPrice || Math.round(wholesale * 1.25);
    const rawColor = prod.colors?.[0];
    const colorStr = typeof rawColor === 'string' ? rawColor : rawColor?.name || 'Default';

    setOrderItems((prev) => [
      ...prev,
      {
        product: prod,
        quantity: 1,
        selectedColor: colorStr,
        selectedSize: prod.sizes?.[0] || '',
        sellingPrice: suggested,
      },
    ]);
    setIsAddingProduct(false);
    setProductSearch('');
  };

  // Update item in order
  const handleUpdateItem = (index: number, updates: Partial<OrderItemDraft>) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Remove item from order
  const handleRemoveItem = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Check Steadfast Fraud Report
  const handleCheckFraudReport = async () => {
    setReportError(null);
    const clean = normalizePhoneForCourier(reportPhone || customerPhone);
    if (!clean || clean.length < 11) {
      setReportError(isBn ? '১১ সংখ্যার সঠিক মোবাইল নম্বর লিখুন' : 'Please enter a valid 11-digit mobile number');
      return;
    }

    setIsCheckingReport(true);
    try {
      const rep = await checkCourierFraud(clean, { courier: 'steadfast', forceFresh: true });
      setFraudReport(rep);
    } catch {
      setReportError(isBn ? 'কুরিয়ার রিপোর্ট যাচাই করা যায়নি।' : 'Failed to retrieve courier report.');
    } finally {
      setIsCheckingReport(false);
    }
  };

  // Financial Calculations
  const totalWholesaleCost = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      const baseCost = item.product.resellerPrice || item.product.price;
      return sum + baseCost * item.quantity;
    }, 0);
  }, [orderItems]);

  const totalRetailProductAmount = useMemo(() => {
    return orderItems.reduce((sum, item) => {
      return sum + item.sellingPrice * item.quantity;
    }, 0);
  }, [orderItems]);

  const totalResellerProfit = useMemo(() => {
    return totalRetailProductAmount - totalWholesaleCost;
  }, [totalRetailProductAmount, totalWholesaleCost]);

  const effectiveAdvanceDeduction = hasTakenAdvance === 'yes' ? advanceAmount : 0;
  const finalCodCollectable = totalRetailProductAmount + deliveryFee - effectiveAdvanceDeduction;

  // Filtered searchable products list for adding
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return allowedProducts.slice(0, 8);
    const query = productSearch.toLowerCase();
    return allowedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.brand && p.brand.toLowerCase().includes(query))
    );
  }, [allowedProducts, productSearch]);

  if (!isOpen) return null;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert(isBn ? 'অনুগ্রহ করে কমপক্ষে একটি প্রোডাক্ট যুক্ত করুন।' : 'Please add at least one product.');
      return;
    }
    const cleanPhone = cleanBDPhoneNumber(customerPhone);
    const phoneValidation = validateBangladeshMobile(cleanPhone, { lang: isBn ? 'bn' : 'en' });
    if (!phoneValidation.isValid) {
      alert(phoneValidation.error || (isBn ? 'সঠিক মোবাইল নম্বর দিন।' : 'Enter a valid mobile number.'));
      return;
    }

    if (!customerName.trim() || !customerAddress.trim()) {
      alert(isBn ? 'কাস্টমারের নাম ও ডেলিভারি ঠিকানা পূরণ করুন।' : 'Please fill all customer fields.');
      return;
    }
    if (!isTermsAgreed) {
      alert(isBn ? 'অর্ডার কনফার্ম করতে শর্তসমূহে টিক দিয়ে সম্মতি প্রদান করুন।' : 'Please accept the order terms.');
      return;
    }

    const orderId = `ORD-RES-${Date.now().toString().slice(-6)}`;
    const newOrderItems: OrderItem[] = orderItems.map((draft) => ({
      productId: draft.product.id,
      productName: draft.product.name,
      name: draft.product.name,
      productImage: draft.product.images?.[0] || '',
      image: draft.product.images?.[0] || '',
      price: draft.sellingPrice,
      quantity: draft.quantity,
      total: draft.sellingPrice * draft.quantity,
      selectedColor: draft.selectedColor,
      selectedSize: draft.selectedSize,
    }));

    const newOrder: Order = {
      id: orderId,
      customerId: selectedCustomerId || `CUST-${Date.now().toString().slice(-4)}`,
      customerName: customerName.trim(),
      customerEmail: `${customerPhone.trim()}@reseller.kenaxbd.com`,
      customerMobile: customerPhone.trim(),
      deliveryName: customerName.trim(),
      deliveryMobile: customerPhone.trim(),
      division: 'Dhaka',
      district: customerDistrict,
      upazila: customerDistrict,
      area: customerDistrict,
      fullAddress: customerAddress.trim(),
      items: newOrderItems,
      subtotal: totalRetailProductAmount,
      discount: 0,
      deliveryCharge: deliveryFee,
      totalAmount: finalCodCollectable,
      total: finalCodCollectable,
      paymentMethod: 'Cash on Delivery (COD)',
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      timeline: [
        {
          status: 'Order Placed by Reseller',
          timestamp: new Date().toISOString(),
          note: `Placed by Reseller ${reseller.username}`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Reseller: ${reseller.username} (ID: ${reseller.id}) | Advance Taken: ${hasTakenAdvance === 'yes' ? `৳${advanceAmount} via ${advanceMethod}` : 'No'} | Special Note: ${orderNotes.trim()}`,
      courierName: 'Steadfast Courier Express',
    };

    (newOrder as any).resellerId = reseller.id;
    (newOrder as any).resellerProfit = totalResellerProfit;
    (newOrder as any).wholesaleBaseCost = totalWholesaleCost;
    (newOrder as any).deliveryFee = deliveryFee;
    (newOrder as any).advancePaid = effectiveAdvanceDeduction;

    onOrderPlaced(newOrder, totalResellerProfit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 text-xs">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-white">
                  {isBn ? 'ড্রপশিপ অর্ডার ক্রিয়েট করুন' : 'Create Dropship Order'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  {isBn ? 'সেন্ট্রাল ডেলিভারি' : 'Steadfast Fulfillment'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isBn
                  ? 'একসাথে একাধিক পণ্য যুক্ত করুন, কাস্টমার রিপোর্ট চেক করুন এবং সরাসরি ড্রপশিপ অর্ডার প্লেস করুন।'
                  : 'Add multiple wholesale items, check customer Steadfast report, and place nationwide order.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmitOrder} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 scrollbar-none">
          {/* SECTION 1: PRODUCT LIST & ADD MULTIPLE PRODUCTS */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h4 className="font-black text-white text-xs sm:text-sm">
                  {isBn ? 'অর্ডারের প্রোডাক্টসমূহ (Order Items)' : 'Selected Products'} ({orderItems.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? '+ আরও প্রোডাক্ট যোগ করুন' : '+ Add More Items'}</span>
              </button>
            </div>

            {/* Additional Product Selector Dropdown */}
            {isAddingProduct && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isBn ? 'প্রোডাক্টের নাম বা ক্যাটাগরি সার্চ করুন...' : 'Search product to add...'}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-800/60">
                  {searchResults.map((p) => {
                    const wholesale = p.resellerPrice || p.price;
                    return (
                      <div
                        key={p.id}
                        className="pt-1.5 flex items-center justify-between gap-2 hover:bg-slate-800/50 p-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-contain bg-slate-950 border border-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {isBn ? 'হোলসেল রেট:' : 'Wholesale:'} <strong>৳{wholesale}</strong>
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddProduct(p)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                        >
                          {isBn ? 'যোগ করুন' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Items List */}
            {orderItems.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                {isBn ? 'কোনো প্রোডাক্ট সিলেক্ট করা নেই। প্রোডাক্ট যোগ করুন।' : 'No items added yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {orderItems.map((item, index) => {
                  const wholesaleCost = item.product.resellerPrice || item.product.price;
                  const itemProfit = (item.sellingPrice - wholesaleCost) * item.quantity;

                  return (
                    <div
                      key={index}
                      className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      {/* Left Product Image & Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-contain bg-slate-950 border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-white text-xs truncate max-w-xs sm:max-w-md">
                            {item.product.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {isBn ? 'হোলসেল কেনা খরচ:' : 'Wholesale Base:'} <strong>৳{wholesaleCost}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Right Controls: Quantity, Selling Price & Remove */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(index, { quantity: Math.max(1, item.quantity - 1) })
                            }
                            className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-white tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(index, { quantity: item.quantity + 1 })}
                            className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Custom Selling Price */}
                        <div className="flex flex-col text-right">
                          <label className="text-[9px] text-slate-400 font-bold uppercase">
                            {isBn ? 'বিক্রয় মূল্য (৳)' : 'Selling Price'}
                          </label>
                          <input
                            type="number"
                            min={wholesaleCost}
                            step="20"
                            value={item.sellingPrice}
                            onChange={(e) =>
                              handleUpdateItem(index, {
                                sellingPrice: parseFloat(e.target.value) || wholesaleCost,
                              })
                            }
                            className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white text-right"
                          />
                        </div>

                        {/* Net Profit Badge */}
                        <div className="text-right shrink-0 min-w-[70px]">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">
                            {isBn ? 'লাভ' : 'Profit'}
                          </span>
                          <span className="text-xs font-black text-emerald-400 tabular-nums">
                            +৳{itemProfit}
                          </span>
                        </div>

                        {/* Delete Button */}
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: শর্ত সমূহ (MANDATORY RESELLER ORDER TERMS) */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-amber-800/60 space-y-3">
            <div className="flex items-center gap-2 border-b border-amber-900/40 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h4 className="font-black text-amber-300 text-xs sm:text-sm uppercase tracking-wide">
                শর্ত সমূহ (Order Terms & Conditions)
              </h4>
            </div>

            <p className="text-xs font-bold text-amber-200">
              ⚠️ রিটার্ন কমাতে কাস্টমারের নাম্বারে অবশ্যই কল করে অর্ডার কনফার্ম করবেন। নাম্বার বন্ধ বা কল রিসিভ করে না ইস্যু বেড়ে চলছে।
            </p>

            <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed pl-1">
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">১.</span>
                <p>নতুন সেলারের ক্ষেত্রে প্রথম ২ টি অর্ডারের ডেলিভারি চার্জ অবশ্যই অগ্রিম প্রদান করিতে হবে।</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">২.</span>
                <p>ডেলিভারি ম্যান দাঁড়িয়ে থাকা অবস্থায় প্রোডাক্টটি চেক করে নিতে হবে, প্রোডাক্ট এর কোন ত্রুটি বের হলে তখনই রিটার্ন করতে বলবেন।</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">৩.</span>
                <p>ডেলিভারি ম্যান চলে যাওয়ার পর প্রোডাক্টটি রিটার্ন অথবা পরিবর্তন করে নিতে চাইলে অতিরিক্ত ডেলিভারি চার্জ প্রদান করতে হবে।</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400">৪.</span>
                <div>
                  <p>নিচের উল্লেখিত ক্যাটেগরির প্রোডাক্টের জন্য অবশ্যই কাস্টমারের নিকট থেকে ডেলিভারি চার্জ অগ্রিম নিতে হবে এবং আমাদের পেমেন্ট করে অর্ডার প্লেস করতে হবেঃ</p>
                  <p className="font-bold text-amber-300 mt-0.5">
                    (কসমেটিক্স, গ্লাসওয়্যার ও ভঙ্গুর আইটেম, পার্সোনালাইজড বা কাস্টমাইজড প্রোডাক্ট)
                  </p>
                  <p className="text-slate-400 mt-0.5">
                    <strong>কারণঃ</strong> এই প্রোডাক্ট গুলো রিটার্ন হলে কাভার নষ্ট হয়ে যায়। পরবর্তীতে বিক্রয় উপযুক্ত থাকে না। চেষ্টা করবেন যেন রিটার্ন না আসে।
                  </p>
                </div>
              </div>
            </div>

            {/* Terms Agreement Checkbox */}
            <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 cursor-pointer pt-2">
              <input
                type="checkbox"
                required
                checked={isTermsAgreed}
                onChange={(e) => setIsTermsAgreed(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
              />
              <span className="font-black text-xs text-white">
                উপরোক্ত শর্তসমূহে রাজি থাকলে টিক দিয়ে অর্ডার কনফার্ম করুন (I Accept Terms)
              </span>
            </label>
          </div>

          {/* SECTION 3: কাস্টমার রিপোর্ট (STEADFAST CUSTOMER FRAUD CHECKER) */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-sky-800/60 space-y-3">
            <div className="flex items-center gap-2 border-b border-sky-900/40 pb-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <h4 className="font-black text-sky-300 text-xs sm:text-sm uppercase tracking-wide">
                কাস্টমার রিপোর্ট (Steadfast Courier Parcel History)
              </h4>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              কাস্টমারটি অনলাইন থেকে কি পরিমান অর্ডার ডেলিভারি নিয়েছে এবং রিটার্ন করেছে সেই রিপোর্ট চেক করুন। কাস্টমার রিপোর্ট বিবেচনা করে দেখুন এই কাস্টমারকে প্রোডাক্ট পাঠালে রিটার্ন হওয়ার সম্ভবনা কতটুকু এবং ডেলিভারি চার্জ অগ্রিম না নিয়ে প্রোডাক্ট পাঠানো যাবে কি না? বিষয়টি বিবেচনা করে অর্ডার প্লেস করুন।
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <div className="relative flex-1 w-full">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="কাস্টমারের মোবাইল নং (১১ সংখ্যা)"
                  value={reportPhone}
                  onChange={(e) => setReportPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleCheckFraudReport}
                disabled={isCheckingReport}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isCheckingReport ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>কাস্টমার রিপোর্ট চেক করুন</span>
                  </>
                )}
              </button>
            </div>

            {reportError && (
              <p className="text-xs text-rose-400 font-bold">{reportError}</p>
            )}

            {/* Steadfast Report Result Card */}
            {fraudReport && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white font-bold text-xs">{fraudReport.phone}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        fraudReport.successRate >= 80
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : fraudReport.successRate >= 50
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {fraudReport.successRate >= 80 ? 'Safe Buyer' : fraudReport.successRate >= 50 ? 'Moderate Risk' : 'High Return Risk'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold">সাকসেস রেট: </span>
                    <strong className="text-emerald-400 text-sm font-black">{fraudReport.successRate}%</strong>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 block">মোট পার্সেল</span>
                    <strong className="text-white text-xs">{fraudReport.totalOrders}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-emerald-900/40">
                    <span className="text-emerald-400 block">সফল ডেলিভারি</span>
                    <strong className="text-emerald-400 text-xs">{fraudReport.deliveredOrders}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-rose-900/40">
                    <span className="text-rose-400 block">রিটার্ন / বাতিল</span>
                    <strong className="text-rose-400 text-xs">{fraudReport.returnedOrders + fraudReport.cancelledOrders}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 pt-1">
                  {fraudReport.riskReason || (fraudReport.successRate >= 80 ? '✅ বিশ্বস্ত কাস্টমার। ক্যাশ অন ডেলিভারিতে নিশ্চিন্তে প্রোডাক্ট পাঠানো যাবে।' : '⚠️ কাস্টমারের রিটার্ন রেকর্ড রয়েছে। অগ্রিম ডেলিভারি চার্জ নেওয়ার পরামর্শ দেওয়া হচ্ছে।')}
                </p>
              </div>
            )}
          </div>

          {/* SECTION 4: CUSTOMER DETAILS & ADVANCE DELIVERY CHARGE SELECTION */}
          <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-4">
            <h4 className="font-black text-white text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'কাস্টমারের ডেলিভারি তথ্য' : 'Customer & Shipping Address'}</span>
            </h4>

            {/* Customer Directory Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setCustomerMode('new')}
                className={`py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  customerMode === 'new' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                + {isBn ? 'নতুন কাস্টমার' : 'New Customer'}
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode('existing')}
                className={`py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                  customerMode === 'existing' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? `সংরক্ষিত কাস্টমার তালিকা (${customers.length})` : `Saved Directory (${customers.length})`}
              </button>
            </div>

            {customerMode === 'existing' && (
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isBn ? 'সংরক্ষিত কাস্টমার নির্বাচন করুন:' : 'Select Customer:'}
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="">{isBn ? 'তালিকা থেকে সিলেক্ট করুন...' : 'Select from directory...'}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) — {c.district}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isBn ? 'কাস্টমারের পুরো নাম *' : 'Customer Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBn ? 'উদা: মাহাবুবুল আলম' : 'e.g. Mahbubul Alam'}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isBn ? 'মোবাইল নম্বর (১১ ডিজিট) *' : 'Mobile Number (11-digit) *'}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  required
                  placeholder="01XXXXXXXXX"
                  value={customerPhone}
                  onChange={(e) => {
                    const cleaned = cleanBDPhoneNumber(e.target.value);
                    setCustomerPhone(cleaned);
                    if (!reportPhone) setReportPhone(cleaned);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* District Dropdown (64 Districts) & Delivery Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {isBn ? 'কাস্টমারের জেলা (District) *' : 'District *'}
                </label>
                <select
                  value={customerDistrict}
                  onChange={(e) => setCustomerDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold cursor-pointer"
                >
                  {ALL_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist} {dist.toLowerCase() === 'dhaka' ? '(Inside Dhaka)' : '(Outside Dhaka)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-300 mb-1">
                  {isBn ? 'সম্পূর্ণ ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা) *' : 'Full Shipping Address *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBn ? 'বাড়ি নং, রোড নং, এলাকা ও ল্যান্ডমার্ক' : 'House, Road, Area, Landmark'}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>

            {/* DELIVERY CHARGE ADVANCE STATUS: YES OR NO */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="font-black text-white text-xs block">
                    {isBn ? 'কাস্টমারের নিকট থেকে ডেলিভারি চার্জ অগ্রিম নিয়েছেন কিনা?' : 'Did you collect Advance Delivery Charge from Customer?'}
                  </label>
                  <p className="text-[10px] text-slate-400">
                    {isBn ? 'অগ্রিম নেওয়া থাকলে COD মূল্য থেকে উক্ত চার্জ সমন্বয় করা হবে।' : 'If advance is collected, it will be deducted from final COD collectable.'}
                  </p>
                </div>

                {/* Yes or No Toggle Selection */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setHasTakenAdvance('yes')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      hasTakenAdvance === 'yes' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBn ? 'হ্যাঁ (Yes)' : 'Yes'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasTakenAdvance('no')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      hasTakenAdvance === 'no' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBn ? 'না (No / COD)' : 'No (Full COD)'}
                  </button>
                </div>
              </div>

              {/* If Yes: Specify amount and method */}
              {hasTakenAdvance === 'yes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isBn ? 'গৃহীত অগ্রিম ডেলিভারি চার্জ (৳):' : 'Advance Amount Collected (৳):'}
                    </label>
                    <input
                      type="number"
                      min="60"
                      step="10"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value) || 60)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isBn ? 'পেমেন্ট মাধ্যম (Method):' : 'Collection Channel:'}
                    </label>
                    <select
                      value={advanceMethod}
                      onChange={(e) => setAdvanceMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                    >
                      <option value="bkash">bKash Personal</option>
                      <option value="nagad">Nagad Personal</option>
                      <option value="rocket">Rocket</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Special Instructions / Notes */}
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                {isBn ? 'কাস্টমার নোট বা বিশেষ নির্দেশনা (ঐচ্ছিক):' : 'Special Delivery Note (Optional):'}
              </label>
              <input
                type="text"
                placeholder={isBn ? 'যেমন: বিকেলে ডেলিভারি দিন, ফোন দিয়ে যাবেন...' : 'e.g. Call before delivery...'}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          {/* SECTION 5: REAL-TIME FINANCIAL SUMMARY */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-950 to-slate-950 border border-emerald-800/80 space-y-2">
            <div className="flex justify-between text-slate-300 text-xs">
              <span>{isBn ? 'প্রোডাক্ট খুচরা মোট মূল্য:' : 'Total Product Retail:'}</span>
              <span className="font-bold text-white">৳{totalRetailProductAmount.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex justify-between text-slate-400 text-xs">
              <span>{isBn ? 'হোলসেল কেনা খরচ (কেটে রাখা হবে):' : 'Wholesale Base Cost (Deducted):'}</span>
              <span>- ৳{totalWholesaleCost.toLocaleString('en-BD')}</span>
            </div>

            <div className="flex justify-between text-slate-400 text-xs">
              <span>{isBn ? `কুরিয়ার ডেলিভারি চার্জ (${customerDistrict}):` : `Delivery Fee (${customerDistrict}):`}</span>
              <span>+ ৳{deliveryFee}</span>
            </div>

            {hasTakenAdvance === 'yes' && (
              <div className="flex justify-between text-amber-400 text-xs">
                <span>{isBn ? 'অগ্রিম ডেলিভারি চার্জ সমন্বয় (কমানো হয়েছে):' : 'Advance Paid Adjustment:'}</span>
                <span>- ৳{advanceAmount}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-xs">
              <span className="font-bold text-slate-300">
                {isBn ? 'কাস্টমার ক্যাশ অন ডেলিভারি (COD) সংগ্রহ:' : 'Customer Collectable on Delivery:'}
              </span>
              <span className="text-base font-black text-white tabular-nums">
                ৳{finalCodCollectable.toLocaleString('en-BD')}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-emerald-800/60 pt-2 text-sm font-black text-emerald-400">
              <span>{isBn ? 'আপনার মোট নিট লাভ (Net Profit):' : 'Your Net Reseller Profit:'}</span>
              <span className="text-base tabular-nums">
                +৳{totalResellerProfit.toLocaleString('en-BD')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={!isTermsAgreed || orderItems.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBn ? 'অর্ডার কনফার্ম ও প্লেস করুন' : 'Confirm & Place Dropship Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
