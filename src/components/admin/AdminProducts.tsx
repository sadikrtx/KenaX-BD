import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Package,
  AlertTriangle,
  CheckCircle,
  Tag,
  DollarSign,
  X,
  Save,
  Sparkles,
  Upload,
  Video,
  Image as ImageIcon,
  Film,
  Palette,
  Layers,
  PlusCircle,
  Check,
  Flame,
  Award,
  Zap,
  TrendingUp,
  Percent,
  ArrowDownRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Camera,
  UploadCloud,
  FileText,
} from 'lucide-react';
import {
  Product,
  UserRole,
  StaffUser,
  ProductType,
  Category,
  ColorVariation,
  ProductVariationOption,
} from '../../types';
import { hasPermission } from '../../lib/permissions';
import { compressImage } from '../../lib/firebase';
import { FormattedText } from '../FormattedText';

interface AdminProductsProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  currentRole,
  currentStaff,
}) => {
  const staffPermissions = currentStaff?.permissions || [];
  const canCreate = hasPermission(currentRole, staffPermissions, 'products.create');
  const canEdit = hasPermission(currentRole, staffPermissions, 'products.edit');
  const canDelete = hasPermission(currentRole, staffPermissions, 'products.delete');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [baseTagFilter, setBaseTagFilter] = useState('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formBanglaName, setFormBanglaName] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics & Gadgets');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formSubSubcategory, setFormSubSubcategory] = useState('');
  const [formBrand, setFormBrand] = useState('KenaX Verified');
  const [formSku, setFormSku] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>(2700);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | ''>(3000);
  const [formCostPrice, setFormCostPrice] = useState<number | ''>(1800);
  const [formStock, setFormStock] = useState<number | ''>(50);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formImageInput, setFormImageInput] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formVideoFile, setFormVideoFile] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [descMode, setDescMode] = useState<'edit' | 'preview'>('edit');
  const [formType, setFormType] = useState<ProductType>('own');
  const [formSupplierName, setFormSupplierName] = useState('');
  const [formSupplierUrl, setFormSupplierUrl] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(true);
  const [formIsHot, setFormIsHot] = useState(false);
  const [formIsNew, setFormIsNew] = useState(false);

  // Product Base Tag & Discount Configuration
  const [formSaleBadge, setFormSaleBadge] = useState<string>('Trending');
  const [formTags, setFormTags] = useState<string[]>(['Shop', 'Trending']);
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>('');
  const [formDiscountType, setFormDiscountType] = useState<'none' | 'percentage' | 'flat'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number | ''>(10);
  // Explicit pricing override flag: when admin inputs selling price directly (e.g. 800), preserve it strictly without percentage round drift
  const [priceLockedByAdmin, setPriceLockedByAdmin] = useState<boolean>(false);

  // Variations states
  const [enableColors, setEnableColors] = useState(false);
  const [enableSizes, setEnableSizes] = useState(false);
  const [formColors, setFormColors] = useState<ColorVariation[]>([]);
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [formVariations, setFormVariations] = useState<ProductVariationOption[]>([]);

  // Specifications state
  const [formSpecifications, setFormSpecifications] = useState<Record<string, string>>({});
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecVal, setNewSpecVal] = useState('');

  const handleAddSpecification = () => {
    if (!newSpecKey.trim() || !newSpecVal.trim()) return;
    setFormSpecifications((prev) => ({
      ...prev,
      [newSpecKey.trim()]: newSpecVal.trim(),
    }));
    setNewSpecKey('');
    setNewSpecVal('');
  };

  const handleRemoveSpecification = (keyToRemove: string) => {
    setFormSpecifications((prev) => {
      const copy = { ...prev };
      delete copy[keyToRemove];
      return copy;
    });
  };

  // Temporary state for adding a color
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#10b981');
  const [newColorImage, setNewColorImage] = useState('');

  // Temporary state for adding a size
  const [newSizeInput, setNewSizeInput] = useState('');

  // Temporary state for adding a custom variation
  const [newVariationName, setNewVariationName] = useState('');
  const [newVariationOptions, setNewVariationOptions] = useState('');

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    setEnableColors(true);
    const colorObj: ColorVariation = {
      name: newColorName.trim(),
      hexCode: newColorHex,
      imageUrl: newColorImage.trim() || undefined,
    };
    setFormColors((prev) => [...prev, colorObj]);
    setNewColorName('');
    setNewColorImage('');
  };

  const handleSelectColorImage = (imgUrl: string) => {
    setNewColorImage((prev) => (prev === imgUrl ? '' : imgUrl));
  };

  const handleUpdateColorImageByIndex = (index: number, imgUrl: string) => {
    setFormColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, imageUrl: c.imageUrl === imgUrl ? undefined : imgUrl } : c))
    );
  };

  const handleRemoveColor = (index: number) => {
    setFormColors((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSize = (sizeStr: string) => {
    const s = sizeStr.trim();
    if (!s) return;
    setEnableSizes(true);
    if (!formSizes.includes(s)) {
      setFormSizes((prev) => [...prev, s]);
    }
  };

  const handleRemoveSize = (sizeStr: string) => {
    setFormSizes((prev) => prev.filter((s) => s !== sizeStr));
  };

  const handleAddCustomVariation = () => {
    if (!newVariationName.trim()) return;
    const opts = newVariationOptions
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (opts.length === 0) return;

    const newVar: ProductVariationOption = {
      id: 'var-' + Date.now(),
      name: newVariationName.trim(),
      options: opts,
    };
    setFormVariations((prev) => [...prev, newVar]);
    setNewVariationName('');
    setNewVariationOptions('');
  };

  const handleRemoveCustomVariation = (id: string) => {
    setFormVariations((prev) => prev.filter((v) => v.id !== id));
  };

  // Delete confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Pagination state (default 15 per page for clean desktop view)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subSubcategory || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

    let matchesStock = true;
    if (stockFilter === 'in_stock') matchesStock = p.stock > 10;
    else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 10;
    else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0;

    let matchesBaseTag = true;
    if (baseTagFilter === 'trending') matchesBaseTag = !!p.isTrending || p.saleBadge === 'Trending';
    else if (baseTagFilter === 'new') matchesBaseTag = !!p.isNew || p.saleBadge === 'New';
    else if (baseTagFilter === 'bestseller') matchesBaseTag = !!p.isBestSeller || p.saleBadge === 'Best Seller';
    else if (baseTagFilter === 'hot') matchesBaseTag = !!p.isHot || p.saleBadge === 'Hot';
    else if (baseTagFilter === 'featured') matchesBaseTag = !!p.isFeatured || p.saleBadge === 'Featured';
    else if (baseTagFilter === 'discounted') matchesBaseTag = (p.originalPrice > p.price) || ((p.discountPercent || 0) > 0);

    return matchesSearch && matchesCategory && matchesStock && matchesBaseTag;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, stockFilter, baseTagFilter, pageSize]);

  const totalFilteredCount = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    if (pageSize >= 9999) return filteredProducts;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  // Inventory KPI counts for quick filter buttons
  const stockMetrics = useMemo(() => {
    return {
      all: products.length,
      inStock: products.filter((p) => p.stock > 10).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
    };
  }, [products]);

  // Dynamic calculation helpers for Product Pricing & Discount
  const handleOriginalPriceChange = (val: number | '') => {
    if (val === '') {
      setFormOriginalPrice('');
      setFormPrice('');
      return;
    }
    const regular = Math.max(0, val);
    setFormOriginalPrice(regular);
    const currentSelling = formPrice === '' ? 0 : Number(formPrice);
    const currentDiscount = formDiscountValue === '' ? 0 : Number(formDiscountValue);

    // If admin explicitly set a selling price (e.g. 800) and regular >= currentSelling, keep the selling price and recalculate discount %
    if (priceLockedByAdmin && currentSelling > 0 && regular >= currentSelling) {
      if (formDiscountType === 'percentage') {
        const pct = Math.round(((regular - currentSelling) / regular) * 100);
        setFormDiscountValue(pct);
      } else if (formDiscountType === 'flat') {
        setFormDiscountValue(regular - currentSelling);
      }
    } else {
      if (formDiscountType === 'percentage') {
        const discountAmt = Math.round((regular * currentDiscount) / 100);
        setFormPrice(Math.max(0, regular - discountAmt));
      } else if (formDiscountType === 'flat') {
        setFormPrice(Math.max(0, regular - currentDiscount));
      } else {
        setFormPrice(regular);
      }
    }
  };

  const handleDiscountTypeChange = (type: 'none' | 'percentage' | 'flat') => {
    setFormDiscountType(type);
    const regular = formOriginalPrice === '' ? 0 : Number(formOriginalPrice);
    const currentSelling = formPrice === '' ? 0 : Number(formPrice);
    const currentDiscount = formDiscountValue === '' ? 0 : Number(formDiscountValue);

    if (type === 'none') {
      setFormDiscountValue('');
      setFormPrice(formOriginalPrice);
      setPriceLockedByAdmin(false);
    } else if (type === 'percentage') {
      if (regular > currentSelling && currentSelling > 0) {
        const pct = Math.round(((regular - currentSelling) / regular) * 100);
        setFormDiscountValue(pct);
      } else {
        const pct = currentDiscount > 0 && currentDiscount <= 100 ? currentDiscount : 10;
        setFormDiscountValue(pct);
        const discountAmt = Math.round((regular * pct) / 100);
        setFormPrice(Math.max(0, regular - discountAmt));
      }
    } else if (type === 'flat') {
      if (regular > currentSelling && currentSelling > 0) {
        setFormDiscountValue(regular - currentSelling);
      } else {
        const flat = currentDiscount > 0 ? currentDiscount : 500;
        setFormDiscountValue(flat);
        setFormPrice(Math.max(0, regular - flat));
      }
    }
  };

  const handleDiscountValueChange = (val: number | '') => {
    if (val === '') {
      setFormDiscountValue('');
      return;
    }
    const num = Math.max(0, val);
    setFormDiscountValue(num);
    const regular = formOriginalPrice === '' ? 0 : Number(formOriginalPrice);
    const currentSelling = formPrice === '' ? 0 : Number(formPrice);

    if (formDiscountType === 'percentage') {
      const pct = Math.min(100, num);
      const currentPct = regular > 0 ? Math.round(((regular - currentSelling) / regular) * 100) : 0;
      if (currentPct === pct && currentSelling > 0) {
        return;
      }
      const discountAmt = Math.round((regular * pct) / 100);
      setFormPrice(Math.max(0, regular - discountAmt));
      setPriceLockedByAdmin(false);
    } else if (formDiscountType === 'flat') {
      const currentDiff = regular - currentSelling;
      if (currentDiff === num && currentSelling > 0) {
        return;
      }
      setFormPrice(Math.max(0, regular - num));
      setPriceLockedByAdmin(false);
    }
  };

  const handleSellingPriceChange = (val: number | '') => {
    if (val === '') {
      setFormPrice('');
      setPriceLockedByAdmin(true);
      return;
    }
    const selling = Math.max(0, val);
    setFormPrice(selling);
    setPriceLockedByAdmin(true);
    const regular = formOriginalPrice === '' ? 0 : Number(formOriginalPrice);

    if (regular > selling && regular > 0) {
      const diff = regular - selling;
      if (formDiscountType === 'percentage') {
        const pct = Math.round((diff / regular) * 100);
        setFormDiscountValue(pct);
      } else if (formDiscountType === 'flat') {
        setFormDiscountValue(diff);
      }
    } else {
      if (formDiscountType !== 'none') {
        setFormDiscountValue(0);
      }
    }
  };

  const handleApplyPreset = (val: number, type: 'percentage' | 'flat') => {
    setFormDiscountType(type);
    setFormDiscountValue(val);
    const orig = Number(formOriginalPrice) || 0;
    if (type === 'percentage') {
      const discountAmt = Math.round((orig * val) / 100);
      setFormPrice(Math.max(0, orig - discountAmt));
    } else {
      setFormPrice(Math.max(0, orig - val));
    }
    setPriceLockedByAdmin(false);
  };

  const handleSelectSaleBadge = (badge: string) => {
    setFormSaleBadge(badge);
    if (badge === 'Trending') {
      setFormIsFeatured(true);
      setFormIsHot(false);
      setFormIsNew(false);
    } else if (badge === 'New') {
      setFormIsNew(true);
      setFormIsHot(false);
    } else if (badge === 'Hot') {
      setFormIsHot(true);
    } else if (badge === 'Best Seller') {
      setFormIsFeatured(true);
    } else if (badge === 'Featured') {
      setFormIsFeatured(true);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSlug('');
    setFormBanglaName('');
    const defaultCatName = categories[0]?.name || 'Electronics & Gadgets';
    setFormCategory(defaultCatName);
    const catObj = categories.find((c) => c.name === defaultCatName);
    const firstSub = catObj?.subcategories?.[0];
    const firstSubName = typeof firstSub === 'string' ? firstSub : (firstSub?.name || '');
    setFormSubcategory(firstSubName);
    setFormSubSubcategory('');
    setFormBrand('KenaX Verified');
    setFormSku('KB-' + Math.floor(1000 + Math.random() * 9000));
    setFormOriginalPrice('');
    setFormDiscountType('none');
    setFormDiscountValue('');
    setFormPrice('');
    setFormCostPrice('');
    setFormStock('');
    setFormSaleBadge('Trending');
    setFormTags(['Shop', 'Trending']);
    setNewCustomTagInput('');
    setFormImages(['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500']);
    setFormImageInput('');
    setFormVideoUrl('');
    setFormVideoFile('');
    setFormError(null);
    setFormDescription('Official genuine product with warranty and fast delivery across Bangladesh.');
    setFormType('own');
    setFormSupplierName('');
    setFormSupplierUrl('');
    setEnableColors(false);
    setEnableSizes(false);
    setFormColors([]);
    setFormSizes([]);
    setFormVariations([]);
    setFormSpecifications({});
    setNewSpecKey('');
    setNewSpecVal('');
    setNewColorName('');
    setNewColorHex('#10b981');
    setNewColorImage('');
    setNewSizeInput('');
    setNewVariationName('');
    setNewVariationOptions('');
    setFormIsFeatured(true);
    setFormIsHot(false);
    setFormIsNew(false);
    setPriceLockedByAdmin(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug || '');
    setFormBanglaName(p.banglaName || '');
    setFormCategory(p.category);
    setFormSubcategory(p.subcategory || '');
    setFormSubSubcategory(p.subSubcategory || p.childSubcategory || '');
    setFormBrand(p.brand);
    setFormSku(p.sku);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice || p.price);
    setPriceLockedByAdmin(true);
    setFormCostPrice(p.costPrice || Math.round(p.price * 0.7));
    setFormStock(p.stock);

    // Resolve Base Tag
    let initialBadge = p.saleBadge || 'None';
    if (!p.saleBadge || p.saleBadge === 'None') {
      if (p.isTrending) initialBadge = 'Trending';
      else if (p.isBestSeller) initialBadge = 'Best Seller';
      else if (p.isHot) initialBadge = 'Hot';
      else if (p.isNew) initialBadge = 'New';
      else if (p.isFeatured) initialBadge = 'Featured';
    }
    setFormSaleBadge(initialBadge);

    // Resolve Discount
    if (p.discountType) {
      setFormDiscountType(p.discountType);
      setFormDiscountValue(p.discountValue ?? (p.discountPercent || 0));
    } else if ((p.originalPrice || 0) > p.price) {
      setFormDiscountType('percentage');
      const pct = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
      setFormDiscountValue(p.discountPercent || pct);
    } else {
      setFormDiscountType('none');
      setFormDiscountValue(0);
    }

    setFormImages(p.images && p.images.length > 0 ? p.images : []);
    setFormImageInput('');
    setFormVideoUrl(p.videoUrl || '');
    setFormVideoFile('');
    setFormError(null);
    setFormDescription(p.description);
    setFormType(p.productType);
    setFormSupplierName(p.supplierName || '');
    setFormSupplierUrl(p.supplierUrl || '');
    setEnableColors(!!(p.colors && p.colors.length > 0));
    setEnableSizes(!!(p.sizes && p.sizes.length > 0));
    setFormColors(p.colors ? [...p.colors] : []);
    setFormSizes(p.sizes ? [...p.sizes] : []);
    setFormVariations(p.variations ? [...p.variations] : []);
    setFormSpecifications(p.specifications ? { ...p.specifications } : {});
    setNewSpecKey('');
    setNewSpecVal('');
    setNewColorName('');
    setNewColorHex('#10b981');
    setNewColorImage('');
    setNewSizeInput('');
    setNewVariationName('');
    setNewVariationOptions('');
    setFormIsFeatured(!!p.isFeatured);
    setFormIsHot(!!p.isHot);
    setFormIsNew(!!p.isNew);

    // Resolve Tags
    const existingTags = p.tags ? [...p.tags] : [];
    if (!existingTags.includes('Shop')) existingTags.push('Shop');
    if (p.isHot || p.saleBadge === 'Hot') {
      if (!existingTags.includes('Flash Sale')) existingTags.push('Flash Sale');
    }
    if (p.isNew || p.saleBadge === 'New') {
      if (!existingTags.includes('New Arrivals')) existingTags.push('New Arrivals');
    }
    if (p.saleBadge === 'Best Seller' || p.isBestSeller) {
      if (!existingTags.includes('Best Seller')) existingTags.push('Best Seller');
    }
    if (p.saleBadge === 'Trending' || p.isTrending) {
      if (!existingTags.includes('Trending')) existingTags.push('Trending');
    }
    if (p.saleBadge === 'Featured' || p.isFeatured) {
      if (!existingTags.includes('Featured')) existingTags.push('Featured');
    }
    setFormTags(existingTags);
    setNewCustomTagInput('');

    setIsModalOpen(true);
  };

  const handlePhotoUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files) as File[]) {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        setFormImages((prev) => [...prev, dataUrl]);
        setFormError(null);
      }
    }
  };

  const handleAddImageUrl = () => {
    if (formImageInput.trim()) {
      setFormImages((prev) => [...prev, formImageInput.trim()]);
      setFormImageInput('');
      setFormError(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetFirstImage = (index: number) => {
    if (index === 0) return;
    setFormImages((prev) => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      copy.unshift(selected);
      return copy;
    });
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formImages.length) return;
    setFormImages((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleVideoUploadFromDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormVideoFile(dataUrl);
        setFormVideoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    // Check Photo Requirement
    const finalImages = [...formImages];
    if (formImageInput.trim()) {
      finalImages.push(formImageInput.trim());
    }

    if (finalImages.length === 0) {
      setFormError('Product photo is required! Please upload at least one photo from your device.');
      return;
    }

    const regular = Number(formOriginalPrice) || Number(formPrice);
    // Keep exact selling price as set by admin (e.g. 800), never overwrite with reverse rounded percentage
    const finalPrice = Math.max(0, Number(formPrice));
    let calculatedDiscountPercent = 0;

    if (regular > finalPrice && regular > 0) {
      calculatedDiscountPercent = Math.round(((regular - finalPrice) / regular) * 100);
    } else if (formDiscountType === 'percentage' && Number(formDiscountValue) > 0) {
      calculatedDiscountPercent = Math.min(100, Math.round(Number(formDiscountValue)));
    }

    const isTrending = formSaleBadge === 'Trending';
    const isNew = formSaleBadge === 'New' || formIsNew;
    const isBestSeller = formSaleBadge === 'Best Seller';
    const isHot = formSaleBadge === 'Hot' || formIsHot;
    const isFeatured = formSaleBadge === 'Featured' || formIsFeatured;

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      sku: formSku.trim() || 'KB-' + Math.floor(1000 + Math.random() * 9000),
      name: formName.trim(),
      slug: formSlug.trim() ? formSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') : undefined,
      banglaName: formBanglaName.trim() || undefined,
      category: formCategory,
      subcategory: formSubcategory.trim() || undefined,
      subSubcategory: formSubSubcategory.trim() || undefined,
      childSubcategory: formSubSubcategory.trim() || undefined,
      brand: formBrand.trim() || 'KenaX Verified',
      price: finalPrice,
      originalPrice: regular,
      costPrice: Number(formCostPrice),
      discountPercent: calculatedDiscountPercent,
      discountType: formDiscountType,
      discountValue:
        formDiscountType === 'flat'
          ? Math.max(0, regular - finalPrice)
          : formDiscountType === 'percentage'
          ? calculatedDiscountPercent
          : 0,
      saleBadge: formSaleBadge,
      tags: formTags.length > 0 ? Array.from(new Set(formTags)) : ['Shop'],
      isTrending,
      isNew,
      isBestSeller,
      isHot,
      isFeatured,
      stock: Number(formStock),
      images: finalImages,
      videoUrl: formVideoUrl.trim() || undefined,
      description: formDescription.trim(),
      colors: enableColors && formColors.length > 0 ? formColors : undefined,
      sizes: enableSizes && formSizes.length > 0 ? formSizes : undefined,
      variations: formVariations.length > 0 ? formVariations : undefined,
      specifications: Object.keys(formSpecifications).length > 0 ? formSpecifications : undefined,
      productType: formType,
      supplierName: formSupplierName.trim() || (formSupplierUrl.trim() ? 'Direct Supplier / Platform' : undefined),
      supplierUrl: formSupplierUrl.trim() || undefined,
      rating: editingProduct ? editingProduct.rating : 4.9,
      reviewsCount: editingProduct ? editingProduct.reviewsCount : 1,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
    };

    if (editingProduct) {
      onUpdateProduct(productPayload);
    } else {
      onAddProduct(productPayload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Quick Inventory KPI Status Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStockFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            stockFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>All Products</span>
          <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
            stockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stockMetrics.all}
          </span>
        </button>

        <button
          onClick={() => setStockFilter('in_stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            stockFilter === 'in_stock'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
              : 'bg-white text-emerald-700 border-slate-200 hover:bg-emerald-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>In Stock</span>
          <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
            stockFilter === 'in_stock' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 font-bold'
          }`}>
            {stockMetrics.inStock}
          </span>
        </button>

        <button
          onClick={() => setStockFilter('low_stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            stockFilter === 'low_stock'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-amber-700 border-slate-200 hover:bg-amber-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Low Stock (≤10)</span>
          <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
            stockFilter === 'low_stock' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 font-bold'
          }`}>
            {stockMetrics.lowStock}
          </span>
        </button>

        <button
          onClick={() => setStockFilter('out_of_stock')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
            stockFilter === 'out_of_stock'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white text-rose-700 border-slate-200 hover:bg-rose-50/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Out of Stock (0)</span>
          <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
            stockFilter === 'out_of_stock' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 font-bold'
          }`}>
            {stockMetrics.outOfStock}
          </span>
        </button>
      </div>

      {/* Filters & Action Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product title, SKU (#KB-...), brand..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Stock</option>
            <option value="in_stock">In Stock (&gt;10)</option>
            <option value="low_stock">Low Stock (≤10)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>

          <select
            value={baseTagFilter}
            onChange={(e) => setBaseTagFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Badges</option>
            <option value="trending">🔥 Trending</option>
            <option value="new">✨ New Arrival</option>
            <option value="bestseller">🏆 Best Seller</option>
            <option value="hot">⚡ Hot Deal</option>
            <option value="featured">⭐ Featured</option>
            <option value="discounted">🏷️ Has Discount</option>
          </select>

          {canCreate && (
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Table - Desktop-Optimized (Zero horizontal scroll on PC) */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {/* On Mobile: overflow-x-auto keeps mobile scroll smooth.
            On Desktop (lg:): overflow-x-hidden ensures no horizontal scrollbar! */}
        <div className="overflow-x-auto lg:overflow-x-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold sticky top-0 z-10 backdrop-blur-xs">
                <th className="py-3 px-3 w-[28%] min-w-[185px]">Product & SKU</th>
                <th className="py-3 px-2.5 w-[13%] min-w-[95px]">Category</th>
                <th className="py-3 px-2.5 w-[10%] min-w-[80px]">Base Tag</th>
                <th className="py-3 px-2.5 w-[13%] min-w-[95px]">Selling & Offer</th>
                <th className="py-3 px-2.5 w-[14%] min-w-[105px]">
                  <div className="flex items-center gap-1 text-slate-700">
                    <span>Original Cost</span>
                    <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-tight">🔒 Staff</span>
                  </div>
                </th>
                <th className="py-3 px-2.5 w-[8%] min-w-[70px]">Stock</th>
                <th className="py-3 px-2.5 w-[8%] min-w-[75px]">Source</th>
                <th className="py-3 px-3 w-[6%] min-w-[60px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Try adjusting your search or category filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const margin = product.costPrice ? product.price - product.costPrice : 0;
                  const marginPercent = product.costPrice
                    ? Math.round((margin / product.price) * 100)
                    : 25;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* 1. Product & SKU (Image + Name + Monospace SKU & Brand) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              (product.images?.[0] && product.images[0].trim() !== '')
                                ? product.images[0]
                                : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80'
                            }
                            alt={product.name}
                            className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200/80 shadow-2xs"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-bold text-slate-900 truncate text-xs leading-tight"
                              title={product.name}
                            >
                              {product.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 truncate">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/80 shrink-0">
                                #{product.sku}
                              </span>
                              {product.brand && (
                                <span className="truncate text-slate-500 font-medium">
                                  • {product.brand}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Category & Subcategory */}
                      <td className="py-2.5 px-2.5 text-slate-700">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate text-[11px] sm:text-xs">
                            {product.category}
                          </div>
                          {(product.subcategory || product.subSubcategory) && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1 flex-wrap">
                              {product.subcategory && <span>› {product.subcategory}</span>}
                              {product.subSubcategory && (
                                <span className="font-semibold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
                                  › {product.subSubcategory}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Base Tag */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {product.saleBadge === 'Trending' || product.isTrending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            <Flame className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                            <span>Trending</span>
                          </span>
                        ) : product.saleBadge === 'New' || product.isNew ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                            <Sparkles className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                            <span>New</span>
                          </span>
                        ) : product.saleBadge === 'Best Seller' || product.isBestSeller ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Award className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>Best Seller</span>
                          </span>
                        ) : product.saleBadge === 'Hot' || product.isHot ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <Zap className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                            <span>Hot Deal</span>
                          </span>
                        ) : product.saleBadge === 'Featured' || product.isFeatured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <Star className="w-2.5 h-2.5 text-amber-500 shrink-0 fill-amber-400" />
                            <span>Featured</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-100">
                            Regular
                          </span>
                        )}
                      </td>

                      {/* 4. Price & Discount Offer */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900">
                            ৳{product.price.toLocaleString('en-BD')}
                          </span>
                          {product.originalPrice > product.price && (
                            <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                              <span className="text-slate-400 line-through">
                                ৳{product.originalPrice.toLocaleString('en-BD')}
                              </span>
                              {product.discountType === 'flat' && product.discountValue ? (
                                <span className="px-1 py-0.2 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200 text-[9px]">
                                  -৳{product.discountValue.toLocaleString('en-BD')}
                                </span>
                              ) : product.discountPercent ? (
                                <span className="px-1 py-0.2 rounded font-bold bg-rose-50 text-rose-700 border border-rose-200 text-[9px]">
                                  -{product.discountPercent}%
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Cost & Profit Margin (Staff Only) */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex flex-col text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-900 font-bold">
                              ৳{(product.costPrice || Math.round(product.price * 0.75)).toLocaleString('en-BD')}
                            </span>
                            <span className="text-[9px] text-amber-600 font-semibold" title="Visible only to Staff">🔒</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600">
                            +৳{(product.price - (product.costPrice || Math.round(product.price * 0.75))).toLocaleString('en-BD')} ({marginPercent}%)
                          </span>
                        </div>
                      </td>

                      {/* 6. Stock Count & Indicator */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.stock > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : product.stock > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              product.stock > 10
                                ? 'bg-emerald-600'
                                : product.stock > 0
                                ? 'bg-amber-600'
                                : 'bg-rose-600'
                            }`}
                          />
                          <span>{product.stock} pcs</span>
                        </span>
                      </td>

                      {/* 7. Source / Supplier */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {product.supplierUrl ? (
                          <a
                            href={product.supplierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer max-w-[85px] truncate"
                            title={`Supplier: ${product.supplierName || product.supplierUrl}`}
                          >
                            <ExternalLink className="w-3 h-3 text-indigo-600 shrink-0" />
                            <span className="truncate">{product.supplierName || 'Supplier'}</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                            📦 Own
                          </span>
                        )}
                      </td>

                      {/* 8. Quick Actions (Always visible without scrolling) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              const slugOrId = product.slug || product.id;
                              const fullAdLink = `${window.location.origin}/?product=${encodeURIComponent(slugOrId)}`;
                              navigator.clipboard.writeText(fullAdLink);
                              alert(`✅ Product Ad Link Copied!\n\n${fullAdLink}\n\nPaste this link into Facebook / TikTok / Google Ads.`);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Copy Product Ad Link for Campaigns"
                          >
                            <Copy className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setProductToDelete(product)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Pagination & Count Footer */}
        <div className="p-3 sm:px-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className="font-bold text-slate-800">
                {totalFilteredCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="font-bold text-slate-800">
                {Math.min(safeCurrentPage * pageSize, totalFilteredCount)}
              </strong>{' '}
              of <strong className="font-bold text-slate-800">{totalFilteredCount}</strong> products
            </span>

            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-slate-500">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={9999}>All</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="px-2.5 py-1 font-bold text-slate-700">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 max-h-[78vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Xiaomi Redmi Note 13 (8GB/256GB)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Secondary / Local Title
                  </label>
                  <input
                    type="text"
                    value={formBanglaName}
                    onChange={(e) => setFormBanglaName(e.target.value)}
                    placeholder="e.g. Xiaomi Redmi Note 13 Local Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="KB-1029"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormCategory(newCat);
                      const catObj = categories.find((c) => c.name === newCat);
                      const firstSub = catObj?.subcategories?.[0];
                      const firstSubName = typeof firstSub === 'string' ? firstSub : (firstSub?.name || '');
                      setFormSubcategory(firstSubName);
                      setFormSubSubcategory('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-category
                  </label>
                  {(() => {
                    const activeCatObj = categories.find((c) => c.name === formCategory);
                    const subList = activeCatObj?.subcategories || [];
                    return (
                      <select
                        value={formSubcategory}
                        onChange={(e) => {
                          setFormSubcategory(e.target.value);
                          setFormSubSubcategory('');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                      >
                        <option value="">-- No Subcategory / General --</option>
                        {subList.map((sub, index) => {
                          const subName = typeof sub === 'string' ? sub : (sub?.name || '');
                          const subKey = typeof sub === 'string' ? `sub-${index}-${sub}` : (sub?.id || `sub-${index}-${sub?.name || ''}`);
                          return (
                            <option key={subKey} value={subName}>
                              {subName}
                            </option>
                          );
                        })}
                      </select>
                    );
                  })()}
                </div>

                {/* 3rd Tier: Child Sub-category (Sub-subcategory) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Child Sub-category
                    </label>
                    <span className="text-[10px] text-sky-600 font-semibold">Tier 3</span>
                  </div>
                  {(() => {
                    const activeCatObj = categories.find((c) => c.name === formCategory);
                    const subList = activeCatObj?.subcategories || [];
                    const activeSubObj = subList.find((s) => {
                      const name = typeof s === 'string' ? s : s?.name;
                      return name === formSubcategory;
                    });
                    const childSubList: string[] =
                      activeSubObj && typeof activeSubObj !== 'string' && activeSubObj.subSubcategories
                        ? activeSubObj.subSubcategories
                        : [];

                    return (
                      <div className="space-y-1.5">
                        <select
                          value={childSubList.includes(formSubSubcategory) ? formSubSubcategory : formSubSubcategory ? '__custom__' : ''}
                          onChange={(e) => {
                            if (e.target.value !== '__custom__') {
                              setFormSubSubcategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 font-medium"
                        >
                          <option value="">-- None / General Child Subcategory --</option>
                          {childSubList.map((csName, idx) => (
                            <option key={`cs-${idx}`} value={csName}>
                              {csName}
                            </option>
                          ))}
                          {formSubSubcategory && !childSubList.includes(formSubSubcategory) && (
                            <option value="__custom__">Custom: {formSubSubcategory}</option>
                          )}
                        </select>
                        <input
                          type="text"
                          value={formSubSubcategory}
                          onChange={(e) => setFormSubSubcategory(e.target.value)}
                          placeholder="Or type custom child subcategory (e.g. T-Shirts & Polos)"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400 font-medium"
                        />
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Xiaomi / Apple / Haylou"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Ad Link Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. t800-smart-watch-offer"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Ad URL: <span className="font-mono text-emerald-700 font-semibold">?product={formSlug.trim() || (editingProduct ? editingProduct.id : 'custom-slug')}</span>
                  </p>
                </div>

                {/* Product Base / Sale Badge Selection */}
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sale Badge / Highlight</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {formSaleBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { id: 'Trending', label: 'Trending', icon: Flame, color: 'border-purple-200 bg-purple-50/70 text-purple-800', active: 'ring-2 ring-purple-500 bg-purple-100 text-purple-900 font-bold' },
                      { id: 'New', label: 'New', icon: Sparkles, color: 'border-sky-200 bg-sky-50/70 text-sky-800', active: 'ring-2 ring-sky-500 bg-sky-100 text-sky-900 font-bold' },
                      { id: 'Best Seller', label: 'Best Seller', icon: Award, color: 'border-emerald-200 bg-emerald-50/70 text-emerald-800', active: 'ring-2 ring-emerald-500 bg-emerald-100 text-emerald-900 font-bold' },
                      { id: 'Hot', label: 'Hot Deals', icon: Zap, color: 'border-rose-200 bg-rose-50/70 text-rose-800', active: 'ring-2 ring-rose-500 bg-rose-100 text-rose-900 font-bold' },
                      { id: 'Featured', label: 'Featured', icon: TrendingUp, color: 'border-amber-200 bg-amber-50/70 text-amber-800', active: 'ring-2 ring-amber-500 bg-amber-100 text-amber-900 font-bold' },
                      { id: 'None', label: 'Regular', icon: Check, color: 'border-slate-200 bg-white text-slate-600', active: 'ring-2 ring-slate-400 bg-slate-100 text-slate-900 font-bold' },
                    ].map((badge) => {
                      const IconComponent = badge.icon;
                      const isSelected = formSaleBadge === badge.id;
                      return (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => handleSelectSaleBadge(badge.id)}
                          className={`py-1.5 px-2 rounded-lg border text-center flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer ${
                            isSelected ? badge.active : `${badge.color} hover:shadow-xs`
                          }`}
                        >
                          <IconComponent className="w-3 h-3 shrink-0" />
                          <span className="text-[11px] truncate">{badge.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Navigation & Admin Tags Section */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-sky-600" />
                      <span>Admin Navigation Tags</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white">
                      {formTags.length} Selected
                    </span>
                  </div>

                  {/* Standard Tag Pill Checkboxes */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { id: 'Flash Sale', label: '🔥 Flash Sale' },
                      { id: 'New Arrivals', label: '✨ New Arrivals' },
                      { id: 'Featured', label: '🌟 Featured' },
                      { id: 'Deals', label: '🏷️ Deals' },
                      { id: 'Shop', label: '🛍️ Shop' },
                      { id: 'Hot Deals', label: '⚡ Hot Deals' },
                      { id: 'Best Seller', label: '⭐ Best Seller' },
                      { id: 'Trending', label: '📈 Trending' },
                    ].map((tagObj) => {
                      const isChecked = formTags.some((t) => t.toLowerCase() === tagObj.id.toLowerCase());
                      return (
                        <button
                          key={tagObj.id}
                          type="button"
                          onClick={() => {
                            setFormTags((prev) =>
                              isChecked
                                ? prev.filter((t) => t.toLowerCase() !== tagObj.id.toLowerCase())
                                : [...prev, tagObj.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-sky-400'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border text-[9px] ${
                            isChecked ? 'bg-sky-400 border-sky-300 text-slate-950 font-black' : 'border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span>{tagObj.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Admin Tag Input */}
                  <div className="pt-2 border-t border-sky-200/60 space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      + Add Custom Admin Tag
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCustomTagInput}
                        onChange={(e) => setNewCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newCustomTagInput.trim();
                            if (val && !formTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                              setFormTags((prev) => [...prev, val]);
                              setNewCustomTagInput('');
                            }
                          }
                        }}
                        placeholder="e.g. Ramadan Offer, Winter Offer, Clearance Sale..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newCustomTagInput.trim();
                          if (val && !formTags.some((t) => t.toLowerCase() === val.toLowerCase())) {
                            setFormTags((prev) => [...prev, val]);
                            setNewCustomTagInput('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors shrink-0"
                      >
                        + Add Tag
                      </button>
                    </div>

                    {/* Active Selected Tags Pills List */}
                    {formTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {formTags.map((t, idx) => (
                          <span
                            key={`tag_pill_${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-[11px] font-bold shadow-2xs"
                          >
                            <span>🏷️ {t}</span>
                            <button
                              type="button"
                              onClick={() => setFormTags((prev) => prev.filter((item) => item !== t))}
                              className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing & Discount Engine */}
                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-sky-600" />
                      <span>Pricing & Inventory</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Regular / Strike Price */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Regular Price (৳) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={formOriginalPrice}
                          onChange={(e) => handleOriginalPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 3000"
                          className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 bg-white"
                        />
                      </div>
                    </div>

                    {/* Discount Type Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Discount Type
                      </label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('percentage')}
                          className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            formDiscountType === 'percentage'
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          % Percent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('flat')}
                          className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            formDiscountType === 'flat'
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ৳ Flat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscountTypeChange('none')}
                          className={`py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                            formDiscountType === 'none'
                              ? 'bg-slate-700 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </div>

                    {/* Discount Value */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Discount Value {formDiscountType === 'percentage' ? '(%)' : formDiscountType === 'flat' ? '(৳)' : ''}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          disabled={formDiscountType === 'none'}
                          value={formDiscountValue}
                          onChange={(e) => handleDiscountValueChange(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={formDiscountType === 'percentage' ? '10' : '500'}
                          className={`w-full pr-7 pl-2.5 py-1.5 rounded-lg border text-xs font-bold focus:ring-2 focus:ring-sky-500 bg-white ${
                            formDiscountType === 'none'
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-slate-300 text-slate-900'
                          }`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          {formDiscountType === 'percentage' ? '%' : formDiscountType === 'flat' ? '৳' : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Result & Cost/Stock Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-emerald-800">
                          Final Selling Price (৳) *
                        </label>
                        {priceLockedByAdmin && Number(formPrice) > 0 && (
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300">
                            Exact Locked
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={formPrice}
                          onChange={(e) => handleSellingPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 2700"
                          className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-emerald-300 text-xs font-bold text-emerald-800 bg-white focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Cost Price (৳)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                          ৳
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={formCostPrice}
                          onChange={(e) => setFormCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 1500"
                          className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 50"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Live Pricing Summary & Customer Store Display Guarantee */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Customer Store Price Preview:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-bold text-xs">
                      {Number(formOriginalPrice) > Number(formPrice) && (
                        <span className="text-slate-400 line-through text-[11px]">
                          ৳{Number(formOriginalPrice).toLocaleString('en-BD')}
                        </span>
                      )}
                      <span className="text-emerald-800 font-black text-sm bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        ৳{Number(formPrice || 0).toLocaleString('en-BD')} (Customer Pays)
                      </span>
                      {Number(formOriginalPrice) > Number(formPrice) && (
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200 text-[11px] font-extrabold">
                          {formDiscountType === 'percentage'
                            ? `${Math.round(((Number(formOriginalPrice) - Number(formPrice)) / Number(formOriginalPrice)) * 100)}% OFF`
                            : `-৳${(Number(formOriginalPrice) - Number(formPrice)).toLocaleString('en-BD')} Flat OFF`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description & Specifications Side-by-Side Compact Layout */}
                <div className="sm:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                  {/* Left: Product Description */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 flex flex-col">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-sky-600" />
                        <span>Description (ফরম্যাটিং সাপোর্টেড)</span>
                      </label>
                      <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setDescMode('edit')}
                          className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            descMode === 'edit'
                              ? 'bg-white text-sky-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDescMode('preview')}
                          className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                            descMode === 'preview'
                              ? 'bg-white text-sky-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          👁️ Live Preview
                        </button>
                      </div>
                    </div>

                    {descMode === 'edit' ? (
                      <>
                        {/* Format helper buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                          <span className="text-slate-500 font-medium">ফরম্যাট:</span>
                          <button
                            type="button"
                            onClick={() => setFormDescription((prev) => prev + ' **বোল্ড টেক্সট** ')}
                            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded hover:bg-sky-50 hover:border-sky-300 text-slate-800 font-extrabold cursor-pointer"
                          >
                            **B** Bold
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDescription((prev) => prev + ' *ইটালিক টেক্সট* ')}
                            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded hover:bg-sky-50 hover:border-sky-300 text-slate-800 italic cursor-pointer"
                          >
                            *I* Italic
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDescription((prev) => prev + '\n# হেডিং ১\n')}
                            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded hover:bg-sky-50 hover:border-sky-300 text-slate-800 font-black cursor-pointer"
                          >
                            # H1
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDescription((prev) => prev + '\n## হেডিং ২\n')}
                            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded hover:bg-sky-50 hover:border-sky-300 text-slate-800 font-bold cursor-pointer"
                          >
                            ## H2
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormDescription((prev) => prev + '\n- পয়েন্ট ১\n- পয়েন্ট ২\n')}
                            className="px-1.5 py-0.5 bg-white border border-slate-300 rounded hover:bg-sky-50 hover:border-sky-300 text-slate-800 font-semibold cursor-pointer"
                          >
                            • List
                          </button>
                        </div>

                        <textarea
                          rows={6}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="উদাহরণ: **প্রোডাক্ট ফিচার্স:**\n- ১০০% অরিজিনাল ব্র্যান্ড প্রোডাক্ট\n- ১ বছরের ওয়ারেন্টি\n# মূল বৈশিষ্ট্যসমূহ"
                          className="w-full flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 leading-relaxed bg-white focus:ring-2 focus:ring-sky-500 font-sans"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          💡 টেক্সটের দুই পাশে <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">**</code> দিলে বোল্ড হবে, <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">#</code> দিলে বড় শিরোনাম হবে এবং <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">-</code> দিলে বুলেট পয়েন্ট হবে।
                        </p>
                      </>
                    ) : (
                      <div className="p-3 bg-white border border-slate-200 rounded-lg min-h-[140px] max-h-[220px] overflow-y-auto text-xs">
                        {formDescription.trim() ? (
                          <FormattedText content={formDescription} className="text-xs text-slate-800" />
                        ) : (
                          <span className="text-slate-400 italic">কোনো ডেসক্রিপশন লেখা হয়নি। "Edit" ট্যাবে গিয়ে লিখুন।</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Product Specifications */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-sky-600" />
                          <span>Product Specifications</span>
                        </label>
                        {Object.keys(formSpecifications).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormSpecifications({})}
                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={newSpecKey}
                            onChange={(e) => setNewSpecKey(e.target.value)}
                            placeholder="Key (e.g. Warranty)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="text"
                            value={newSpecVal}
                            onChange={(e) => setNewSpecVal(e.target.value)}
                            placeholder="Value (e.g. 1 Year)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddSpecification}
                            disabled={!newSpecKey.trim() || !newSpecVal.trim()}
                            className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Added Specs Tags */}
                    {Object.keys(formSpecifications).length > 0 ? (
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {Object.entries(formSpecifications).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-2 py-1 rounded-md bg-white border border-slate-200 text-xs">
                            <div className="min-w-0 pr-1 truncate">
                              <span className="font-bold text-slate-800">{k}: </span>
                              <span className="text-slate-600">{v}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecification(k)}
                              className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-2 text-center text-slate-400 text-[11px] italic bg-white/60 rounded-lg border border-dashed border-slate-200">
                        No specifications added yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo & Media Section */}
                <div className="sm:col-span-2 space-y-3">
                  {formError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* 1. Product Photos */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Product Photos *
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {formImages.length} uploaded
                      </span>
                    </div>

                    {/* Compact Upload & URL input side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <label className="sm:col-span-6 flex items-center justify-center gap-2 border border-dashed border-sky-300 hover:border-sky-500 bg-white hover:bg-sky-50/40 rounded-lg py-2 px-3 cursor-pointer transition-colors group">
                        <Upload className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-slate-700">
                          Upload Photos from Device
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUploadFromDevice}
                          className="hidden"
                        />
                      </label>

                      <div className="sm:col-span-6 flex items-center gap-1.5">
                        <input
                          type="url"
                          value={formImageInput}
                          onChange={(e) => setFormImageInput(e.target.value)}
                          placeholder="Or paste image URL"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddImageUrl}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
                        >
                          Add URL
                        </button>
                      </div>
                    </div>

                    {/* Uploaded Photos Thumbnails Grid */}
                    {formImages.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/80">
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {formImages.map((imgUrl, index) => {
                            const isFirst = index === 0;
                            return (
                              <div
                                key={index}
                                className={`relative rounded-lg overflow-hidden border p-1 bg-white flex flex-col justify-between shadow-2xs ${
                                  isFirst ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/20' : 'border-slate-200'
                                }`}
                              >
                                <div className="relative aspect-square rounded overflow-hidden bg-slate-50">
                                  <img
                                    src={(imgUrl && imgUrl.trim() !== '') ? imgUrl : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=120'}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-full object-contain p-0.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full transition-opacity shadow-xs cursor-pointer"
                                    title="Remove"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="mt-1 space-y-1">
                                  {isFirst ? (
                                    <div className="py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold text-center">
                                      Cover Photo
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSetFirstImage(index)}
                                      className="w-full py-0.5 rounded bg-slate-100 hover:bg-sky-600 hover:text-white text-slate-700 text-[9px] font-semibold transition-colors cursor-pointer"
                                    >
                                      Set as Cover
                                    </button>
                                  )}
                                  <div className="flex items-center justify-between gap-1">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => handleMoveImage(index, index - 1)}
                                      className={`flex-1 py-0.5 rounded text-[8px] font-bold border ${
                                        index === 0 ? 'opacity-30 border-slate-200' : 'border-slate-200 hover:bg-slate-100 cursor-pointer'
                                      }`}
                                    >
                                      ←
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === formImages.length - 1}
                                      onClick={() => handleMoveImage(index, index + 1)}
                                      className={`flex-1 py-0.5 rounded text-[8px] font-bold border ${
                                        index === formImages.length - 1 ? 'opacity-30 border-slate-200' : 'border-slate-200 hover:bg-slate-100 cursor-pointer'
                                      }`}
                                    >
                                      →
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Product Video (Compact) */}
                  <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Product Video (Optional)
                        </span>
                      </div>
                      {formVideoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormVideoUrl('');
                            setFormVideoFile('');
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove Video
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-center justify-center gap-1.5 border border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-lg py-1.5 px-3 cursor-pointer text-xs font-bold text-indigo-900 transition-colors">
                        <Film className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Upload Video File</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUploadFromDevice}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        value={formVideoUrl}
                        onChange={(e) => setFormVideoUrl(e.target.value)}
                        placeholder="Or video link (YouTube / MP4)"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* 3. Product Variations Section (Dynamic on toggle) */}
                  <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Product Variations
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEnableColors(!enableColors)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            enableColors
                              ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Palette className="w-3 h-3" />
                          <span>{enableColors ? '✓ Color Active' : '+ Color'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnableSizes(!enableSizes)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                            enableSizes
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          <span>{enableSizes ? '✓ Size Active' : '+ Size'}</span>
                        </button>
                      </div>
                    </div>

                    {/* A. COLOR VARIATIONS (Visible ONLY when enableColors is TRUE) */}
                    {enableColors && (
                      <div className="p-3 bg-white border border-sky-200 rounded-xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-sky-600" />
                            <span>Color Variations</span>
                          </span>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                            {formColors.length} Colors
                          </span>
                        </div>

                        {/* Color Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Color Name *</label>
                            <input
                              type="text"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              placeholder="e.g. Midnight Black"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Color Code</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0.5"
                              />
                              <input
                                type="text"
                                value={newColorHex}
                                onChange={(e) => setNewColorHex(e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-3">
                            <button
                              type="button"
                              onClick={handleAddColor}
                              disabled={!newColorName.trim()}
                              className="w-full py-1.5 px-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Add Color</span>
                            </button>
                          </div>
                        </div>

                        {/* Match photo with uploaded product images */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3 text-sky-600" />
                              <span>Select Matching Photo from Uploaded Gallery:</span>
                            </label>
                            {newColorImage && (
                              <button
                                type="button"
                                onClick={() => setNewColorImage('')}
                                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Clear Photo Selection
                              </button>
                            )}
                          </div>

                          {formImages.length === 0 ? (
                            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              💡 Upload product photos above first. Then click any photo here to link it to this color variation.
                            </p>
                          ) : (
                            <div className="flex items-center gap-2 overflow-x-auto py-1">
                              {formImages.filter((img) => typeof img === 'string' && img.trim() !== '').map((img, idx) => {
                                const isSelected = newColorImage === img;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectColorImage(img)}
                                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all p-0.5 bg-white cursor-pointer ${
                                      isSelected
                                        ? 'border-sky-600 ring-2 ring-sky-400 shadow-sm'
                                        : 'border-slate-200 hover:border-sky-300 opacity-80 hover:opacity-100'
                                    }`}
                                    title={`Match image ${idx + 1}`}
                                  >
                                    <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-contain" />
                                    {isSelected && (
                                      <div className="absolute inset-0 bg-sky-600/30 flex items-center justify-center">
                                        <span className="bg-sky-600 text-white rounded-full w-4 h-4 text-[10px] font-black flex items-center justify-center">
                                          ✓
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {newColorImage && newColorImage.trim() !== '' && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md w-fit">
                              <img src={newColorImage} alt="Color" className="w-5 h-5 rounded object-cover" />
                              <span className="text-[10px] text-emerald-700 font-bold">Photo Attached to this Color</span>
                              <button
                                type="button"
                                onClick={() => setNewColorImage('')}
                                className="text-rose-600 hover:underline text-[10px] ml-1 font-bold"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Added Colors List */}
                        {formColors.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {formColors.map((col, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                                    style={{ backgroundColor: col.hexCode || '#94a3b8' }}
                                  />
                                  <span className="text-xs font-bold text-slate-900 truncate">{col.name}</span>
                                  {col.imageUrl && col.imageUrl.trim() !== '' && (
                                    <img src={col.imageUrl} alt={col.name} className="w-5 h-5 rounded object-cover border" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {formImages.filter((img) => typeof img === 'string' && img.trim() !== '').length > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      {formImages.filter((img) => typeof img === 'string' && img.trim() !== '').map((img, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={() => handleUpdateColorImageByIndex(idx, img)}
                                          className={`w-4 h-4 rounded overflow-hidden border ${
                                            col.imageUrl === img ? 'ring-1 ring-sky-500 border-sky-500' : 'border-slate-300 opacity-60 hover:opacity-100'
                                          }`}
                                          title="Set or switch photo"
                                        >
                                          <img src={img} alt="" className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColor(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* B. SIZE VARIATIONS (Visible ONLY when enableSizes is TRUE) */}
                    {enableSizes && (
                      <div className="p-3 bg-white border border-indigo-200 rounded-xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Size Variations</span>
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {formSizes.length} Sizes
                          </span>
                        </div>

                        {/* Quick Size Toggle Pills */}
                        <div className="flex flex-wrap gap-1">
                          {['S', 'M', 'L', 'XL', 'XXL', '3XL', '39', '40', '41', '42', '43', '64GB', '128GB', '256GB', '512GB', 'Free Size'].map(
                            (presetSize) => {
                              const isAdded = formSizes.includes(presetSize);
                              return (
                                <button
                                  key={presetSize}
                                  type="button"
                                  onClick={() =>
                                    isAdded ? handleRemoveSize(presetSize) : handleAddSize(presetSize)
                                  }
                                  className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-all cursor-pointer ${
                                    isAdded
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-slate-50 hover:bg-white text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isAdded ? `✓ ${presetSize}` : `+ ${presetSize}`}
                                </button>
                              );
                            }
                          )}
                        </div>

                        {/* Custom Size Input */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                          <input
                            type="text"
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            placeholder="Custom size (e.g. 32-Inch, Combo Pack)"
                            className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSize(newSizeInput);
                              setNewSizeInput('');
                            }}
                            disabled={!newSizeInput.trim()}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer"
                          >
                            + Add Size
                          </button>
                        </div>

                        {/* Active Sizes List */}
                        {formSizes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {formSizes.map((s) => (
                              <span
                                key={s}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900"
                              >
                                <span>{s}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSize(s)}
                                  className="text-indigo-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* C. OTHER CUSTOM VARIATIONS */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Other Custom Options (e.g. RAM / Material)</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-end">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={newVariationName}
                            onChange={(e) => setNewVariationName(e.target.value)}
                            placeholder="Title (e.g. RAM)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-6">
                          <input
                            type="text"
                            value={newVariationOptions}
                            onChange={(e) => setNewVariationOptions(e.target.value)}
                            placeholder="Options comma-separated (e.g. 8GB, 16GB)"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddCustomVariation}
                            disabled={!newVariationName.trim() || !newVariationOptions.trim()}
                            className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      {/* Active Custom Variations Display */}
                      {formVariations.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {formVariations.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{v.name}:</span>
                                <div className="flex flex-wrap gap-1">
                                  {v.options.map((opt) => (
                                    <span
                                      key={opt}
                                      className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomVariation(v.id)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Product Sourcing & External Supplier Link (Compact & Clean) */}
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/90 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Product Sourcing & Supplier
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        🔒 Staff Only
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType('own')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          formType === 'own'
                            ? 'bg-white border-sky-500 ring-2 ring-sky-200'
                            : 'bg-white/70 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">📦 Own Stock</span>
                          {formType === 'own' && <CheckCircle className="w-3.5 h-3.5 text-sky-600" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormType('dropshipping')}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          formType === 'dropshipping'
                            ? 'bg-white border-amber-500 ring-2 ring-amber-200'
                            : 'bg-white/70 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">🌐 Dropshipping / Sourced</span>
                          {formType === 'dropshipping' && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <input
                          type="url"
                          value={formSupplierUrl}
                          onChange={(e) => setFormSupplierUrl(e.target.value)}
                          placeholder="Supplier link (AliExpress, Alibaba, etc.)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={formSupplierName}
                          onChange={(e) => setFormSupplierName(e.target.value)}
                          placeholder="Supplier / Platform name (Optional)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Product?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-800">{productToDelete.name}</strong> ({productToDelete.sku}) from KenaX BD? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
