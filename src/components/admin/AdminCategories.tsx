import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Package,
  Layers,
  Tag,
  List,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Check,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  CornerDownRight,
  RefreshCw,
} from 'lucide-react';
import { Product, UserRole, StaffUser, Category, SubCategoryItem } from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

interface AdminCategoriesProps {
  categories: Category[];
  products: Product[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (category: Category) => void;
  onReorderCategories?: (categories: Category[]) => void;
  onDeleteCategory: (categoryId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

const PRESET_CATEGORY_IMAGES = [
  { name: 'Electronics', url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80' },
  { name: 'Fashion & Clothing', url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&auto=format&fit=crop&q=80' },
  { name: 'Home & Living', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=80' },
  { name: 'Beauty & Care', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80' },
  { name: 'Smartphones & Gadgets', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80' },
  { name: 'Shoes & Footwear', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=80' },
  { name: 'Watches & Jewelry', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80' },
  { name: 'Sports & Fitness', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80' },
];

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
}) => {
  const [viewMode, setViewMode] = useState<'bento-grid' | 'compact-list'>('bento-grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [lastMovedCatId, setLastMovedCatId] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Form states for Add/Edit Modal
  const [catName, setCatName] = useState('');
  const [catBanglaName, setCatBanglaName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catPriority, setCatPriority] = useState<number>(1);
  const [subcategoriesList, setSubcategoriesList] = useState<SubCategoryItem[]>([]);

  // Modal subcategory draft inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubSubInput, setNewSubSubInput] = useState<Record<number, string>>({});

  // Quick inline add inputs on category cards
  const [quickSubInputs, setQuickSubInputs] = useState<Record<string, string>>({});
  const [quickSubSubInputs, setQuickSubSubInputs] = useState<Record<string, string>>({});

  // Inline editing state for Category Name directly on card
  const [editingCatNameId, setEditingCatNameId] = useState<string | null>(null);
  const [editingCatNameVal, setEditingCatNameVal] = useState('');
  const [editingCatBanglaVal, setEditingCatBanglaVal] = useState('');

  // Inline editing states for subcategories
  const [editingSubKey, setEditingSubKey] = useState<string | null>(null); // `${cat.id}_${sIdx}`
  const [editingSubVal, setEditingSubVal] = useState('');

  // Inline editing states for sub-subcategories (child tags)
  const [editingSubSubKey, setEditingSubSubKey] = useState<string | null>(null); // `${cat.id}_${sIdx}_${ssIdx}`
  const [editingSubSubVal, setEditingSubSubVal] = useState('');

  // Modal draft inline editing states
  const [editingDraftSubIdx, setEditingDraftSubIdx] = useState<number | null>(null);
  const [editingDraftSubVal, setEditingDraftSubVal] = useState('');
  const [editingDraftSubSubKey, setEditingDraftSubSubKey] = useState<string | null>(null); // `${sIdx}_${ssIdx}`
  const [editingDraftSubSubVal, setEditingDraftSubSubVal] = useState('');

  // Normalize subcategories so every item is an object with id, name, icon, subSubcategories
  const normalizeSubs = (subs?: (string | SubCategoryItem)[]): SubCategoryItem[] => {
    if (!subs) return [];
    return subs.map((s, idx) => {
      if (typeof s === 'string') {
        return {
          id: 'sub-' + idx + '-' + s,
          name: s,
          icon: 'Layers',
          subSubcategories: [],
        };
      }
      return {
        id: s.id || ('sub-' + idx + '-' + (s.name || '')),
        name: s.name || '',
        icon: s.icon || 'Layers',
        subSubcategories: Array.isArray(s.subSubcategories) ? s.subSubcategories : [],
      };
    });
  };

  // Sorted categories by priority
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }, [categories]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sortedCategories;
    const q = searchQuery.toLowerCase().trim();
    return sortedCategories.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchBangla = (cat.banglaName || '').toLowerCase().includes(q);
      const matchSubs = (cat.subcategories || []).some((s) => {
        const subName = typeof s === 'string' ? s : s.name;
        const subSubMatches =
          typeof s !== 'string' &&
          (s.subSubcategories || []).some((ss) => ss.toLowerCase().includes(q));
        return subName.toLowerCase().includes(q) || subSubMatches;
      });
      return matchName || matchBangla || matchSubs;
    });
  }, [sortedCategories, searchQuery]);

  // Metrics calculation
  const totalSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);
  }, [categories]);

  const totalSubSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const subs = normalizeSubs(cat.subcategories);
      return acc + subs.reduce((sAcc, s) => sAcc + (s.subSubcategories?.length || 0), 0);
    }, 0);
  }, [categories]);

  // Visual highlight on priority change
  const triggerMoveHighlight = (catId: string) => {
    setLastMovedCatId(catId);
    setTimeout(() => {
      setLastMovedCatId(null);
    }, 1800);
  };

  const showToast = (message: string) => {
    setSaveSuccessNotice(message);
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  // Reordering handlers for Categories
  const handleSetCategoryPosition = (catId: string, newPositionZeroIndexed: number) => {
    if (newPositionZeroIndexed < 0 || newPositionZeroIndexed >= sortedCategories.length) return;
    const currentIndex = sortedCategories.findIndex((c) => c.id === catId);
    if (currentIndex === -1 || currentIndex === newPositionZeroIndexed) return;

    const nextCats = [...sortedCategories];
    const [movedCat] = nextCats.splice(currentIndex, 1);
    nextCats.splice(newPositionZeroIndexed, 0, movedCat);

    const updatedWithPriority = nextCats.map((c, idx) => ({ ...c, priority: idx }));

    if (onReorderCategories) {
      onReorderCategories(updatedWithPriority);
    } else {
      updatedWithPriority.forEach((c) => onUpdateCategory(c));
    }
    triggerMoveHighlight(catId);
    showToast(`✓ Category "${movedCat.name}" moved to position #${newPositionZeroIndexed + 1}`);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;

    const catId = sortedCategories[index].id;
    handleSetCategoryPosition(catId, targetIndex);
  };

  // Subcategory ordering inside category
  const handleSetSubcategoryPosition = (cat: Category, subIndex: number, newPositionZeroIndexed: number) => {
    const subs = normalizeSubs(cat.subcategories);
    if (newPositionZeroIndexed < 0 || newPositionZeroIndexed >= subs.length || subIndex === newPositionZeroIndexed) return;

    const [movedSub] = subs.splice(subIndex, 1);
    subs.splice(newPositionZeroIndexed, 0, movedSub);

    const updatedSubs = subs.map((s, idx) => ({ ...s, priority: idx }));
    const updated: Category = {
      ...cat,
      subcategories: updatedSubs,
    };
    onUpdateCategory(updated);
    showToast(`✓ Subcategory "${movedSub.name}" reordered`);
  };

  const handleToggleExpand = (catId: string) => {
    setExpandedCatIds((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Modal actions
  const openAddModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatBanglaName('');
    setCatImage('https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&auto=format&fit=crop&q=80');
    setSubcategoriesList([
      {
        id: 'sub-' + Date.now() + '-1',
        name: 'Smartphones & Gadgets',
        icon: 'Layers',
        subSubcategories: ['Android Phones', 'Smartwatches', 'Earbuds'],
      },
      {
        id: 'sub-' + Date.now() + '-2',
        name: 'Accessories & Power',
        icon: 'Layers',
        subSubcategories: ['Fast Chargers', 'Power Banks', 'Cables'],
      },
    ]);
    setNewSubName('');
    setNewSubSubInput({});
    setCatPriority(categories.length + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatBanglaName(cat.banglaName || '');
    setCatImage(cat.featuredImage || '');
    setSubcategoriesList(normalizeSubs(cat.subcategories));
    setNewSubName('');
    setNewSubSubInput({});
    const currentPos = sortedCategories.findIndex((c) => c.id === cat.id);
    setCatPriority(currentPos !== -1 ? currentPos + 1 : (cat.priority ?? 0) + 1);
    setIsModalOpen(true);
  };

  const handleAddSubcategoryToDraft = () => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    setSubcategoriesList([
      ...subcategoriesList,
      {
        id: 'sub-' + Date.now(),
        name: trimmed,
        icon: 'Layers',
        subSubcategories: [],
      },
    ]);
    setNewSubName('');
  };

  const handleRemoveSubcategoryFromDraft = (subId: string) => {
    setSubcategoriesList(subcategoriesList.filter((s) => s.id !== subId));
  };

  const handleAddSubSubcategoryToDraft = (subIndex: number) => {
    const val = newSubSubInput[subIndex]?.trim();
    if (!val) return;
    const updated = [...subcategoriesList];
    const currentSubs = updated[subIndex].subSubcategories || [];
    if (!currentSubs.includes(val)) {
      updated[subIndex] = {
        ...updated[subIndex],
        subSubcategories: [...currentSubs, val],
      };
      setSubcategoriesList(updated);
    }
    setNewSubSubInput({ ...newSubSubInput, [subIndex]: '' });
  };

  const handleRemoveSubSubcategoryFromDraft = (subIndex: number, subSubToRemove: string) => {
    const updated = [...subcategoriesList];
    const currentSubs = updated[subIndex].subSubcategories || [];
    updated[subIndex] = {
      ...updated[subIndex],
      subSubcategories: currentSubs.filter((s) => s !== subSubToRemove),
    };
    setSubcategoriesList(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const targetPriority = Math.max(0, catPriority - 1);
    const payload: Category = {
      id: editingCat ? editingCat.id : 'cat-' + Date.now(),
      name: catName.trim(),
      banglaName: catBanglaName.trim() || catName.trim(),
      slug: catName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: editingCat?.icon || 'Folder',
      itemCount: editingCat?.itemCount || 0,
      featuredImage: catImage.trim(),
      subcategories: subcategoriesList,
      priority: targetPriority,
    };

    if (editingCat) {
      onUpdateCategory(payload);
      handleSetCategoryPosition(editingCat.id, targetPriority);
    } else {
      onAddCategory(payload);
      setTimeout(() => {
        handleSetCategoryPosition(payload.id, targetPriority);
      }, 50);
    }

    setIsModalOpen(false);
    showToast(`✓ Category "${payload.name}" successfully saved and updated on storefront!`);
  };

  const handleDelete = (cat: Category) => {
    const attachedCount = products.filter((p) => p.category === cat.name).length;
    if (attachedCount > 0) {
      alert(
        `Cannot delete category "${cat.name}" because it currently has ${attachedCount} active products. Reassign the products first.`
      );
      return;
    }
    if (confirm(`Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`)) {
      onDeleteCategory(cat.id);
      showToast(`Category "${cat.name}" deleted.`);
    }
  };

  // Quick inline rename Category directly from card
  const handleSaveRenameCategory = (cat: Category) => {
    const newName = editingCatNameVal.trim();
    if (!newName) {
      setEditingCatNameId(null);
      return;
    }
    const updated: Category = {
      ...cat,
      name: newName,
      banglaName: editingCatBanglaVal.trim() || cat.banglaName || newName,
      slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
    onUpdateCategory(updated);
    setEditingCatNameId(null);
    showToast(`✓ Category renamed to "${newName}" and saved live!`);
  };

  // Quick inline add subcategory on card
  const handleQuickAddSubcategory = (cat: Category) => {
    const inputVal = quickSubInputs[cat.id]?.trim();
    if (!inputVal) return;

    const currentSubs = normalizeSubs(cat.subcategories);
    const newSub: SubCategoryItem = {
      id: 'sub-' + Date.now(),
      name: inputVal,
      icon: 'Layers',
      subSubcategories: [],
    };

    const updated: Category = {
      ...cat,
      subcategories: [...currentSubs, newSub],
    };
    onUpdateCategory(updated);
    setQuickSubInputs((prev) => ({ ...prev, [cat.id]: '' }));
    setExpandedCatIds((prev) => ({ ...prev, [cat.id]: true }));
    showToast(`✓ Subcategory "${inputVal}" added to "${cat.name}"`);
  };

  // Quick inline add nested sub-sub-category (child tag)
  const handleQuickAddSubSubcategory = (cat: Category, subIndex: number) => {
    const key = `${cat.id}_${subIndex}`;
    const val = quickSubSubInputs[key]?.trim();
    if (!val) return;

    const subs = normalizeSubs(cat.subcategories);
    const targetSub = subs[subIndex];
    if (!targetSub) return;

    const currentSubSubs = targetSub.subSubcategories || [];
    if (currentSubSubs.includes(val)) {
      setQuickSubSubInputs((prev) => ({ ...prev, [key]: '' }));
      return;
    }

    targetSub.subSubcategories = [...currentSubSubs, val];
    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
    setQuickSubSubInputs((prev) => ({ ...prev, [key]: '' }));
    showToast(`✓ Child tag "${val}" added under "${targetSub.name}"`);
  };

  // Quick remove child tag
  const handleQuickRemoveSubSubcategory = (cat: Category, subIndex: number, subSubToRemove: string) => {
    const subs = normalizeSubs(cat.subcategories);
    const targetSub = subs[subIndex];
    if (!targetSub) return;

    targetSub.subSubcategories = (targetSub.subSubcategories || []).filter((s) => s !== subSubToRemove);
    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
    showToast(`✓ Child tag "${subSubToRemove}" removed`);
  };

  // Quick remove subcategory
  const handleQuickRemoveSubcategory = (cat: Category, subId: string) => {
    const subs = normalizeSubs(cat.subcategories);
    const targetSub = subs.find((s) => s.id === subId);
    const updated: Category = {
      ...cat,
      subcategories: subs.filter((s) => s.id !== subId),
    };
    onUpdateCategory(updated);
    showToast(`✓ Subcategory "${targetSub?.name || ''}" removed`);
  };

  // Quick rename subcategory
  const handleSaveRenameSubcategory = (cat: Category, subIndex: number) => {
    const trimmed = editingSubVal.trim();
    if (!trimmed) {
      setEditingSubKey(null);
      return;
    }
    const subs = normalizeSubs(cat.subcategories);
    if (!subs[subIndex]) return;
    const oldName = subs[subIndex].name;
    subs[subIndex].name = trimmed;
    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
    setEditingSubKey(null);
    showToast(`✓ Subcategory renamed from "${oldName}" to "${trimmed}"`);
  };

  // Quick rename child subcategory (child tag)
  const handleSaveRenameSubSubcategory = (cat: Category, subIndex: number, subSubIndex: number) => {
    const trimmed = editingSubSubVal.trim();
    if (!trimmed) {
      setEditingSubSubKey(null);
      return;
    }
    const subs = normalizeSubs(cat.subcategories);
    const targetSub = subs[subIndex];
    if (!targetSub || !targetSub.subSubcategories) return;
    targetSub.subSubcategories[subSubIndex] = trimmed;
    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
    setEditingSubSubKey(null);
    showToast(`✓ Child tag updated to "${trimmed}"`);
  };

  // Draft rename in modal
  const handleSaveDraftRenameSubcategory = (sIdx: number) => {
    const trimmed = editingDraftSubVal.trim();
    if (trimmed) {
      setSubcategoriesList((prev) =>
        prev.map((sub, i) => (i === sIdx ? { ...sub, name: trimmed } : sub))
      );
    }
    setEditingDraftSubIdx(null);
  };

  const handleSaveDraftRenameSubSubcategory = (sIdx: number, ssIdx: number) => {
    const trimmed = editingDraftSubSubVal.trim();
    if (trimmed) {
      setSubcategoriesList((prev) =>
        prev.map((sub, i) => {
          if (i !== sIdx) return sub;
          const newSubSubs = [...(sub.subSubcategories || [])];
          newSubSubs[ssIdx] = trimmed;
          return { ...sub, subSubcategories: newSubSubs };
        })
      );
    }
    setEditingDraftSubSubKey(null);
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold">{saveSuccessNotice}</span>
          </div>
          <button
            onClick={() => setSaveSuccessNotice(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Category & Subcategory Studio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 text-xs font-black border border-sky-200 dark:border-sky-800">
                  {categories.length} Categories
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage categories, subcategories, and 3rd-tier tags. All edits save instantly and sync to your storefront.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 self-start lg:self-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('bento-grid')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'bento-grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Comfortable Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact-list')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'compact-list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Table View</span>
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Category</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 font-black">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Main Categories</p>
              <p className="text-base font-black text-slate-900 dark:text-white">{categories.length}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subcategories (২য় স্তর)</p>
              <p className="text-base font-black text-slate-900 dark:text-white">{totalSubcategories}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 font-black">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Child Tags (৩য় স্তর)</p>
              <p className="text-base font-black text-slate-900 dark:text-white">{totalSubSubcategories}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 font-black">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Catalog Products</p>
              <p className="text-base font-black text-slate-900 dark:text-white">{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category, subcategory, or child tags..."
            className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:border-sky-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-black">{filteredCategories.length}</strong> of {categories.length} Categories
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: COMFORTABLE BENTO CARDS (Primary, Spacious & User Friendly) */}
      {viewMode === 'bento-grid' && (
        <div className="space-y-4">
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
              <FolderTree className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold">No categories match your search.</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const cIdx = sortedCategories.findIndex((c) => c.id === cat.id);
              const prodCount = products.filter((p) => p.category === cat.name).length;
              const parsedSubs = normalizeSubs(cat.subcategories);
              const isExpanded = expandedCatIds[cat.id] !== false; // Default expanded for comfortable editing
              const isHighlighted = lastMovedCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-xs overflow-hidden ${
                    isHighlighted
                      ? 'border-amber-400 ring-2 ring-amber-300/60 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Category Header Card */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Priority Rank Selector */}
                      <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Rank</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <select
                            value={cIdx}
                            onChange={(e) => handleSetCategoryPosition(cat.id, Number(e.target.value))}
                            className="text-xs font-black text-sky-800 dark:text-sky-300 bg-transparent cursor-pointer focus:outline-hidden"
                            title="Change display order position"
                          >
                            {sortedCategories.map((_, idx) => (
                              <option key={idx} value={idx} className="dark:bg-slate-800 dark:text-white">
                                #{idx + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(cIdx, 'up')}
                            disabled={cIdx === 0}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-900 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-20 cursor-pointer transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(cIdx, 'down')}
                            disabled={cIdx === sortedCategories.length - 1}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-900 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-300 disabled:opacity-20 cursor-pointer transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Image Thumbnail */}
                      <div className="relative group shrink-0">
                        <img
                          src={getOptimizedImageUrl(cat.featuredImage || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=160', 160)}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, cat.featuredImage)}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        />
                      </div>

                      {/* Category Name & Bangla Details */}
                      <div className="min-w-0 flex-1">
                        {editingCatNameId === cat.id ? (
                          <div className="space-y-2 max-w-md">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingCatNameVal}
                                onChange={(e) => setEditingCatNameVal(e.target.value)}
                                placeholder="English Category Name"
                                className="px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 border-2 border-sky-500 rounded-xl focus:outline-hidden w-full"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingCatBanglaVal}
                                onChange={(e) => setEditingCatBanglaVal(e.target.value)}
                                placeholder="বাংলা ক্যাটাগরি নাম (ঐচ্ছিক)"
                                className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden w-full"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRenameCategory(cat)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatNameId(null)}
                                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer shrink-0"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {cat.name}
                              </h3>
                              {cIdx === 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                                  ★ #1 Priority
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatNameId(cat.id);
                                  setEditingCatNameVal(cat.name);
                                  setEditingCatBanglaVal(cat.banglaName || '');
                                }}
                                className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 p-1 rounded-lg hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Quick Rename Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {cat.banglaName && (
                                <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                  {cat.banglaName}
                                </span>
                              )}
                              <span className="font-mono text-slate-400 dark:text-slate-500 text-[11px]">slug: /{cat.slug || cat.id}</span>
                              <span className="inline-flex items-center gap-1 text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 font-bold px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                                <Package className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                {prodCount} Products
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons on category header */}
                    <div className="flex items-center gap-2 self-end lg:self-center">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleExpand(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          isExpanded
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>{parsedSubs.length} Subcategories</span>
                        <span className="text-[10px] font-black">{isExpanded ? '▲ Hide' : '▼ Manage'}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SUB-CATEGORIES & CHILD TAGS STUDIO (Spacious & Easy to Edit) */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-slate-50/40 dark:bg-slate-900/60 space-y-4">
                      {/* Subcategory Add Bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              Subcategories & Child Tags for "{cat.name}"
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Add subcategories (২য় স্তর) and nested child tags (৩য় স্তর) below.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="+ Enter new subcategory name (e.g. Smartwatches)..."
                            value={quickSubInputs[cat.id] || ''}
                            onChange={(e) =>
                              setQuickSubInputs({ ...quickSubInputs, [cat.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddSubcategory(cat);
                              }
                            }}
                            className="flex-1 sm:w-80 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:border-sky-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleQuickAddSubcategory(cat)}
                            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Subcategory</span>
                          </button>
                        </div>
                      </div>

                      {/* Subcategory List */}
                      {parsedSubs.length === 0 ? (
                        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-2">
                          <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                          <p className="text-xs sm:text-sm font-semibold">No subcategories yet. Type a name above and click "Add Subcategory".</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {parsedSubs.map((sub, sIdx) => {
                            const subSubCount = (sub.subSubcategories || []).length;
                            const isEditingSub = editingSubKey === `${cat.id}_${sIdx}`;

                            return (
                              <div
                                key={sub.id || sIdx}
                                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
                              >
                                {/* Top Header of Subcategory */}
                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 flex items-center justify-center font-black text-xs shrink-0">
                                      #{sIdx + 1}
                                    </span>

                                    {isEditingSub ? (
                                      <div className="flex items-center gap-1 flex-1">
                                        <input
                                          type="text"
                                          value={editingSubVal}
                                          onChange={(e) => setEditingSubVal(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleSaveRenameSubcategory(cat, sIdx);
                                            } else if (e.key === 'Escape') {
                                              setEditingSubKey(null);
                                            }
                                          }}
                                          autoFocus
                                          className="w-full px-2.5 py-1 text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border-2 border-sky-500 rounded-lg focus:outline-hidden"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveRenameSubcategory(cat, sIdx)}
                                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                          title="Save Rename"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingSubKey(null)}
                                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                          {sub.name}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingSubKey(`${cat.id}_${sIdx}`);
                                            setEditingSubVal(sub.name);
                                          }}
                                          className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded hover:bg-sky-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                          title="Rename Subcategory"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Subcategory Order Selector & Delete Button */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <select
                                      value={sIdx}
                                      onChange={(e) =>
                                        handleSetSubcategoryPosition(cat, sIdx, Number(e.target.value))
                                      }
                                      className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
                                      title="Change Position Order"
                                    >
                                      {parsedSubs.map((_, pIdx) => (
                                        <option key={pIdx} value={pIdx} className="dark:bg-slate-900 dark:text-white">
                                          Pos #{pIdx + 1}
                                        </option>
                                      ))}
                                    </select>

                                    <button
                                      type="button"
                                      onClick={() => handleQuickRemoveSubcategory(cat, sub.id)}
                                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                      title="Delete Subcategory"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Child Subcategories (৩য় স্তর - 3rd Tier) Tags Section */}
                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                      <span>Child Subcategories ({subSubCount})</span>
                                    </span>
                                    <span className="text-[10px] font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                                      ৩য় স্তর
                                    </span>
                                  </div>

                                  {/* Child Tags Chips List */}
                                  <div className="flex flex-wrap gap-2 min-h-[36px]">
                                    {sub.subSubcategories && sub.subSubcategories.length > 0 ? (
                                      sub.subSubcategories.map((subSub, ssIdx) => (
                                        <div
                                          key={ssIdx}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-2xs transition-all group"
                                        >
                                          {editingSubSubKey === `${cat.id}_${sIdx}_${ssIdx}` ? (
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="text"
                                                value={editingSubSubVal}
                                                onChange={(e) => setEditingSubSubVal(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleSaveRenameSubSubcategory(cat, sIdx, ssIdx);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingSubSubKey(null);
                                                  }
                                                }}
                                                autoFocus
                                                className="w-28 px-2 py-0.5 text-xs bg-white dark:bg-slate-800 border border-sky-500 rounded focus:outline-hidden font-bold dark:text-white"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleSaveRenameSubSubcategory(cat, sIdx, ssIdx)}
                                                className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-0.5 cursor-pointer"
                                              >
                                                <Check className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingSubSubKey(null)}
                                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="w-4 h-4 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 flex items-center justify-center font-black text-[9px]">
                                                {ssIdx + 1}
                                              </span>
                                              <span>{subSub}</span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingSubSubKey(`${cat.id}_${sIdx}_${ssIdx}`);
                                                  setEditingSubSubVal(subSub);
                                                }}
                                                className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 p-0.5 cursor-pointer"
                                                title="Rename Tag"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleQuickRemoveSubSubcategory(cat, sIdx, subSub)
                                                }
                                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 cursor-pointer"
                                                title="Remove Tag"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                                        No child tags added yet
                                      </span>
                                    )}
                                  </div>

                                  {/* Comfortable Add Child Tag Input */}
                                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                                    <input
                                      type="text"
                                      placeholder="+ Add child tag (e.g. AMOLED Display)..."
                                      value={quickSubSubInputs[`${cat.id}_${sIdx}`] || ''}
                                      onChange={(e) =>
                                        setQuickSubSubInputs({
                                          ...quickSubSubInputs,
                                          [`${cat.id}_${sIdx}`]: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleQuickAddSubSubcategory(cat, sIdx);
                                        }
                                      }}
                                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:border-sky-500 font-medium"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddSubSubcategory(cat, sIdx)}
                                      className="px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                                    >
                                      + Add Tag
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: HIGH-DENSITY TABLE VIEW */}
      {viewMode === 'compact-list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm min-w-[750px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 w-32 text-center">Rank</th>
                  <th className="py-3.5 px-4">Category Details</th>
                  <th className="py-3.5 px-4 w-32 text-center">Products</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Subcategories</th>
                  <th className="py-3.5 px-4 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const cIdx = sortedCategories.findIndex((c) => c.id === cat.id);
                    const prodCount = products.filter((p) => p.category === cat.name).length;
                    const parsedSubs = normalizeSubs(cat.subcategories);

                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <select
                              value={cIdx}
                              onChange={(e) => handleSetCategoryPosition(cat.id, Number(e.target.value))}
                              className="text-xs font-black text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-2 py-1 cursor-pointer"
                            >
                              {sortedCategories.map((_, idx) => (
                                <option key={idx} value={idx}>
                                  #{idx + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <img
                              src={getOptimizedImageUrl(cat.featuredImage || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100', 100)}
                              alt={cat.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => handleImageError(e, cat.featuredImage)}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                            <div>
                              <p className="font-black text-slate-900 text-sm">{cat.name}</p>
                              {cat.banglaName && <p className="text-xs text-slate-500">{cat.banglaName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle text-center">
                          <span className="font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 text-xs">
                            {prodCount} Prod
                          </span>
                        </td>
                        <td className="py-3 px-4 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {parsedSubs.slice(0, 3).map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                                {s.name}
                              </span>
                            ))}
                            {parsedSubs.length > 3 && (
                              <span className="text-xs text-slate-400 font-bold">+{parsedSubs.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(cat)}
                              className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL MODAL: ADD / EDIT CATEGORY STUDIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  {editingCat ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {editingCat ? `Edit Category: ${editingCat.name}` : 'Add New Category'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set category details, priority order, and nested subcategories.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Category Name (English) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Electronics & Gadgets"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">বাংলা নাম (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    value={catBanglaName}
                    onChange={(e) => setCatBanglaName(e.target.value)}
                    placeholder="যেমন: ইলেকট্রনিক্স ও গ্যাজেট"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Featured Image URL</label>
                  <input
                    type="text"
                    value={catImage}
                    onChange={(e) => setCatImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Display Priority Position</label>
                  <select
                    value={catPriority}
                    onChange={(e) => setCatPriority(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-bold cursor-pointer"
                  >
                    {Array.from({ length: Math.max(categories.length + 1, 10) }).map((_, idx) => (
                      <option key={idx} value={idx + 1}>
                        Position #{idx + 1} {idx === 0 ? '(1st on Homepage)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image Quick Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Choose Preset Image</span>
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PRESET_CATEGORY_IMAGES.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setCatImage(preset.url)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        catImage === preset.url
                          ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <img src={preset.url} alt="" className="w-5 h-5 rounded-md object-cover" />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategories & Nested Tags Builder */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-600" />
                      <span>Subcategories & Child Tags</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Configure subcategories and their 3rd-tier child tags for this category.
                    </p>
                  </div>
                </div>

                {/* Subcategory Add input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategoryToDraft();
                      }
                    }}
                    placeholder="+ New Subcategory Name (e.g. Smart Watches)..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategoryToDraft}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-bold cursor-pointer shrink-0"
                  >
                    + Add Subcategory
                  </button>
                </div>

                {/* Subcategories List */}
                <div className="space-y-3">
                  {subcategoriesList.map((sub, sIdx) => (
                    <div
                      key={sub.id || sIdx}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs shrink-0">
                            #{sIdx + 1}
                          </span>

                          {editingDraftSubIdx === sIdx ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editingDraftSubVal}
                                onChange={(e) => setEditingDraftSubVal(e.target.value)}
                                autoFocus
                                className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-sky-400 rounded-md focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDraftRenameSubcategory(sIdx)}
                                className="p-1 rounded bg-emerald-600 text-white"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 text-sm">{sub.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDraftSubIdx(sIdx);
                                  setEditingDraftSubVal(sub.name);
                                }}
                                className="text-slate-400 hover:text-sky-600 p-0.5 cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryFromDraft(sub.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Subcategory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Child tags */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(sub.subSubcategories || []).map((subSub, ssIdx) => (
                            <span
                              key={ssIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                            >
                              <span>{subSub}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubSubcategoryFromDraft(sIdx, subSub)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="+ Add child tag (e.g. Wireless)..."
                            value={newSubSubInput[sIdx] || ''}
                            onChange={(e) =>
                              setNewSubSubInput({ ...newSubSubInput, [sIdx]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubSubcategoryToDraft(sIdx);
                              }
                            }}
                            className="flex-1 px-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubSubcategoryToDraft(sIdx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                          >
                            + Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Apply Live</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
