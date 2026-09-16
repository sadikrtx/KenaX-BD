import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  Search,
  CheckCircle2,
  MoveUp,
  MoveDown,
  Sparkles,
  Layers,
  Tag,
  Home,
  ShoppingBag,
  RotateCcw,
  Save,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { Product, Category } from '../../types';
import {
  getProductPriorityForPage,
  sortProductsByPagePriority,
  getAvailablePageOptions,
  PageOption,
} from '../../utils/productPriorityUtils';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

interface AdminProductPriorityManagerProps {
  products: Product[];
  categories?: Category[];
  onUpdateProduct: (product: Product) => void;
  onClose?: () => void;
}

export const AdminProductPriorityManager: React.FC<AdminProductPriorityManagerProps> = ({
  products,
  categories = [],
  onUpdateProduct,
  onClose,
}) => {
  const pageOptions = useMemo(
    () => getAvailablePageOptions(categories, products),
    [categories, products]
  );

  const [selectedPageKey, setSelectedPageKey] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [localPriorities, setLocalPriorities] = useState<Record<string, number | ''>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get selected page info
  const currentPageInfo = useMemo(() => {
    return pageOptions.find((p) => p.key === selectedPageKey) || {
      key: selectedPageKey,
      label: selectedPageKey,
      type: 'custom',
    };
  }, [pageOptions, selectedPageKey]);

  // Filter products relevant to the selected page
  const pageProducts = useMemo(() => {
    let list = [...products];

    if (selectedPageKey.startsWith('category:')) {
      const catName = selectedPageKey.replace('category:', '').toLowerCase().trim();
      list = list.filter((p) => (p.category || '').toLowerCase().trim() === catName);
    } else if (selectedPageKey.startsWith('tag:')) {
      const tagName = selectedPageKey.replace('tag:', '').toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.tags && p.tags.some((t) => t.toLowerCase().trim() === tagName)) ||
          (p.saleBadge && p.saleBadge.toLowerCase().trim() === tagName) ||
          (p.isTrending && tagName === 'trending') ||
          (p.isBestSeller && tagName === 'best sellers') ||
          (p.isNew && tagName === 'new arrivals') ||
          (p.isHot && tagName === 'hot') ||
          (p.isFeatured && tagName === 'featured')
      );
    }

    // Apply search filter if query provided
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Sort by effective priority for this page
    return sortProductsByPagePriority(list, selectedPageKey);
  }, [products, selectedPageKey, searchQuery]);

  // Helper to get effective priority for a product taking local unsaved inputs into account
  const getEffectivePriority = (p: Product): number => {
    if (p.id in localPriorities) {
      const val = localPriorities[p.id];
      if (typeof val === 'number' && val > 0) return val;
      if (val === '') return 999999;
    }
    return getProductPriorityForPage(p, selectedPageKey);
  };

  // Handle priority numeric input change
  const handlePriorityInputChange = (productId: string, valStr: string) => {
    setHasUnsavedChanges(true);
    if (valStr === '') {
      setLocalPriorities((prev) => ({ ...prev, [productId]: '' }));
    } else {
      const num = parseInt(valStr, 10);
      setLocalPriorities((prev) => ({
        ...prev,
        [productId]: isNaN(num) || num < 1 ? '' : num,
      }));
    }
  };

  // Move a product up or down in position
  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === pageProducts.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentProduct = pageProducts[index];
    const targetProduct = pageProducts[targetIndex];

    const newLocal = { ...localPriorities };
    newLocal[currentProduct.id] = targetIndex + 1;
    newLocal[targetProduct.id] = index + 1;

    setLocalPriorities(newLocal);
    setHasUnsavedChanges(true);
  };

  // Set a product directly to top rank #1
  const handleSetTop = (productId: string) => {
    setLocalPriorities((prev) => ({ ...prev, [productId]: 1 }));
    setHasUnsavedChanges(true);
  };

  // Clear page priority for product
  const handleClearPriority = (productId: string) => {
    setLocalPriorities((prev) => ({ ...prev, [productId]: '' }));
    setHasUnsavedChanges(true);
  };

  // Save changes to products database
  const handleSaveChanges = () => {
    let saveCount = 0;
    pageProducts.forEach((p, idx) => {
      const localVal = localPriorities[p.id];

      if (localVal !== undefined) {
        const existingPagePriorities = p.pagePriorities ? { ...p.pagePriorities } : {};

        if (localVal === '' || localVal === 999999) {
          delete existingPagePriorities[selectedPageKey];
        } else {
          existingPagePriorities[selectedPageKey] = Number(localVal);
        }

        const updatedProduct: Product = {
          ...p,
          pagePriorities: existingPagePriorities,
          updatedAt: new Date().toISOString(),
        };

        onUpdateProduct(updatedProduct);
        saveCount++;
      }
    });

    setHasUnsavedChanges(false);
    setLocalPriorities({});
    setSaveSuccessMsg(`Successfully saved priority order for ${currentPageInfo.label}!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto my-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ArrowUpDown className="w-4 h-4" />
            <span>Product Page Priority & Ordering</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Page Product Ranking Manager</h2>
          <p className="text-xs text-slate-300 mt-1">
            Set which products show up first (#1, #2, #3...) on specific store pages independently.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges && Object.keys(localPriorities).length === 0}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Priority Changes</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Page Selector & Search */}
      <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Page Selector */}
        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Select Store Page / Context:</span>
          </label>
          <select
            value={selectedPageKey}
            onChange={(e) => {
              setSelectedPageKey(e.target.value);
              setLocalPriorities({});
              setHasUnsavedChanges(false);
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs"
          >
            <optgroup label="System Main Pages">
              {pageOptions
                .filter((o) => o.type === 'system')
                .map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Category Pages">
              {pageOptions
                .filter((o) => o.type === 'category')
                .map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Tag & Campaign Pages">
              {pageOptions
                .filter((o) => o.type === 'tag')
                .map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Product Search */}
        <div className="w-full md:w-72">
          <label className="block text-xs font-bold text-slate-700 mb-1">Search Products:</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Page Info Banner */}
      <div className="px-5 py-3 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs text-sky-900 font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            Editing order for <strong className="font-extrabold">{currentPageInfo.label}</strong>. Products with smaller priority numbers (e.g. 1, 2, 3) will be shown first at the top of this page.
          </span>
        </div>
        <span className="font-bold bg-white px-2.5 py-1 rounded-lg border border-sky-200 text-sky-800">
          {pageProducts.length} Products Found
        </span>
      </div>

      {/* Products Rank List */}
      <div className="p-4 sm:p-6 max-h-[600px] overflow-y-auto divide-y divide-slate-100">
        {pageProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No products matched for this page filter.</p>
            <p className="text-slate-500 mt-1">Select another page context or clear your search term.</p>
          </div>
        ) : (
          pageProducts.map((product, idx) => {
            const effPriority = getEffectivePriority(product);
            const isPrioritized = effPriority !== 999999;
            const inputValue =
              product.id in localPriorities
                ? localPriorities[product.id]
                : isPrioritized
                ? effPriority
                : '';

            return (
              <div
                key={product.id}
                className={`py-3.5 px-3 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isPrioritized ? 'bg-sky-50/30 border border-sky-100/60 my-1' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Position Rank & Image & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Position Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                      idx === 0
                        ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700/80 text-white'
                        : isPrioritized
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  {/* Thumbnail Image */}
                  <img
                    src={getOptimizedImageUrl(product.images?.[0], 80)}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50"
                  />

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                        {product.category}
                      </span>
                      <span>• SKU: {product.sku || 'N/A'}</span>
                      <span className="font-bold text-slate-900">৳{product.price.toLocaleString('en-BD')}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Priority Controls */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  {/* Quick Rank Up / Down buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                      title="Move Up in Rank"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(idx, 'down')}
                      disabled={idx === pageProducts.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 cursor-pointer"
                      title="Move Down in Rank"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Priority Number Input */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-600">Priority Rank:</label>
                    <input
                      type="number"
                      min="1"
                      value={inputValue}
                      onChange={(e) => handlePriorityInputChange(product.id, e.target.value)}
                      placeholder="Auto"
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-black text-xs text-center text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>

                  {/* Top #1 Button */}
                  <button
                    type="button"
                    onClick={() => handleSetTop(product.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-200 cursor-pointer shadow-2xs transition-colors shrink-0"
                  >
                    Make #1
                  </button>

                  {/* Clear Priority */}
                  {isPrioritized && (
                    <button
                      type="button"
                      onClick={() => handleClearPriority(product.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Clear explicit priority for this page"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-slate-500 italic">
          Tip: Priority 1 appears first, 2 appears second, 3 appears third. Products with no assigned priority rank will follow automatically based on creation date.
        </span>
        <button
          onClick={handleSaveChanges}
          disabled={!hasUnsavedChanges && Object.keys(localPriorities).length === 0}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
            hasUnsavedChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-slate-300 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Save Priority Order</span>
        </button>
      </div>
    </div>
  );
};
