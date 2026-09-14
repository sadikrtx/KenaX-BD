import React, { useState } from 'react';
import {
  Heart,
  Search,
  User,
  Phone,
  Mail,
  ExternalLink,
  Package,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  X,
  Share2,
  Copy,
  Check,
  Eye,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { CustomerRecord, Product, UserRole } from '../../types';

interface AdminWishlistActivitiesProps {
  customers: CustomerRecord[];
  products: Product[];
  currentRole: UserRole;
  onRefresh?: () => void;
  onSelectCustomer?: (customer: CustomerRecord) => void;
}

export const AdminWishlistActivities: React.FC<AdminWishlistActivitiesProps> = ({
  customers = [],
  products = [],
  currentRole,
  onRefresh,
  onSelectCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const isStaff = ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);

  // Extract all customers with a non-empty wishlist
  const customersWithWishlist = customers.filter(
    (c) => c.wishlist && c.wishlist.length > 0
  );

  // Extract unique categories from products
  const categoriesList = Array.from(
    new Set(
      customersWithWishlist
        .flatMap((c) => c.wishlist || [])
        .map((p) => p.category)
        .filter(Boolean)
    )
  );

  // Filtered customer wishlists
  const filteredWishlists = customersWithWishlist.filter((c) => {
    const wishlist = c.wishlist || [];

    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      wishlist.some(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    const matchesCategory =
      categoryFilter === 'all' ||
      wishlist.some((p) => p.category === categoryFilter);

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && wishlist.some((p) => (p.stock || 0) > 0)) ||
      (stockFilter === 'out_of_stock' && wishlist.some((p) => (p.stock || 0) <= 0));

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Analytics Metrics
  const totalSavedProducts = customersWithWishlist.reduce(
    (sum, c) => sum + (c.wishlist?.length || 0),
    0
  );

  const totalWishlistValue = customersWithWishlist.reduce((sum, c) => {
    return (
      sum +
      (c.wishlist || []).reduce((pSum, prod) => pSum + (prod.price || 0), 0)
    );
  }, 0);

  const inStockWishlistCount = customersWithWishlist.reduce((sum, c) => {
    return (
      sum +
      (c.wishlist || []).filter((prod) => (prod.stock || 0) > 0).length
    );
  }, 0);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Wishlist Activities & Saved Favorites
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Wishlist Shoppers
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {customersWithWishlist.length}
          </p>
          <p className="text-[11px] text-rose-600 font-bold mt-1">
            Registered accounts with saved items
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Saved Items
          </span>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {totalSavedProducts}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Wishlisted product entries
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Wishlist Value
          </span>
          <p className="text-2xl font-black text-rose-950 mt-2">
            ৳ {totalWishlistValue.toLocaleString('en-BD')}
          </p>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Potential demand value in BDT
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            In-Stock Saved Items
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {inStockWishlistCount}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Ready for instant purchase
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search shopper name, phone, email or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
          >
            <option value="all">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-700 bg-white"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock Only</option>
            <option value="out_of_stock">Out of Stock Only</option>
          </select>
        </div>
      </div>

      {/* Wishlist List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredWishlists.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <Heart className="w-8 h-8 fill-current" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No Wishlist Activities Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              When shoppers save products to their wishlist, their saved items and details will automatically appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Shopper Info</th>
                  <th className="py-3.5 px-4">Saved Products in Wishlist</th>
                  <th className="py-3.5 px-4 text-center">Items Saved</th>
                  <th className="py-3.5 px-4 text-right">Wishlist Value</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredWishlists.map((cust) => {
                  const items = cust.wishlist || [];
                  const userTotalValue = items.reduce(
                    (sum, p) => sum + (p.price || 0),
                    0
                  );

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer Info */}
                      <td className="py-4 px-4 align-top">
                        <div
                          className={`flex items-start gap-2.5 ${onSelectCustomer ? 'cursor-pointer group' : ''}`}
                          onClick={() => onSelectCustomer && onSelectCustomer(cust)}
                          title="Click to view full shopper profile"
                        >
                          <div className="w-9 h-9 rounded-full bg-slate-900 group-hover:bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 transition-colors">
                            {cust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors flex items-center gap-1">
                              <span>{cust.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-[11px] text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cust.mobile}</span>
                            </p>
                            {cust.email && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <span>{cust.email}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Saved Products */}
                      <td className="py-4 px-4 align-top max-w-md">
                        <div className="grid grid-cols-1 gap-2">
                          {items.map((prod) => (
                            <div
                              key={prod.id}
                              className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors"
                            >
                              <img
                                src={
                                  prod.images?.[0] ||
                                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'
                                }
                                alt={prod.name}
                                className="w-10 h-10 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="font-bold text-slate-900 truncate text-[11px]"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                  <span className="font-black text-rose-950">
                                    ৳ {prod.price.toLocaleString('en-BD')}
                                  </span>
                                  {prod.category && (
                                    <span className="text-slate-400 font-medium">
                                      {prod.category}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  (prod.stock || 0) > 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {(prod.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                              </span>

                              <button
                                onClick={() => setSelectedProduct(prod)}
                                className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                                title="View details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="py-4 px-4 align-top text-center font-bold">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs border border-rose-200 font-extrabold">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                        </span>
                      </td>

                      {/* Total Wishlist Value */}
                      <td className="py-4 px-4 align-top text-right font-black text-slate-900 whitespace-nowrap">
                        ৳ {userTotalValue.toLocaleString('en-BD')}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onSelectCustomer && (
                            <button
                              onClick={() => onSelectCustomer(cust)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Shopper Profile</span>
                            </button>
                          )}
                          <a
                            href={`tel:${cust.mobile}`}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Call Customer"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Quick View Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Product Wishlist Details</h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                alt={selectedProduct.name}
                className="w-16 h-16 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">{selectedProduct.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{selectedProduct.category} {selectedProduct.subcategory ? `• ${selectedProduct.subcategory}` : ''}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-black text-rose-950 text-sm">৳{selectedProduct.price.toLocaleString()}</span>
                  {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                    <span className="line-through text-slate-400 text-xs">৳{selectedProduct.originalPrice.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">SKU Code:</span>
                <span className="font-bold text-slate-800">{selectedProduct.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Available Stock:</span>
                <span className={`font-bold ${(selectedProduct.stock || 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedProduct.stock || 0} Units Available
                </span>
              </div>
              {selectedProduct.brand && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Brand:</span>
                  <span className="font-bold text-slate-800">{selectedProduct.brand}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
