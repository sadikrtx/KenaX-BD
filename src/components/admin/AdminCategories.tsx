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
  Grid,
  List,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  PlusCircle,
  Hash,
  Check,
} from 'lucide-react';
import { Product, UserRole, StaffUser, Category, SubCategoryItem } from '../../types';

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

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
}) => {
  const [viewMode, setViewMode] = useState<'compact-list' | 'bento-grid'>('compact-list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [lastMovedCatId, setLastMovedCatId] = useState<string | null>(null);

  // Form states
  const [catName, setCatName] = useState('');
  const [catBanglaName, setCatBanglaName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catPriority, setCatPriority] = useState<number>(1);
  const [subcategoriesList, setSubcategoriesList] = useState<SubCategoryItem[]>([]);

  // Modal subcategory draft inputs
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('Layers');
  const [newSubSubInput, setNewSubSubInput] = useState<Record<number, string>>({});

  // Quick inline add inputs
  const [quickSubInputs, setQuickSubInputs] = useState<Record<string, string>>({});
  const [quickSubSubInputs, setQuickSubSubInputs] = useState<Record<string, string>>({});

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
        name: s.name,
        icon: s.icon || 'Layers',
        subSubcategories: s.subSubcategories || [],
      };
    });
  };

  // Sorted categories by priority
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }, [categories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sortedCategories;
    const q = searchQuery.toLowerCase().trim();
    return sortedCategories.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchBangla = (cat.banglaName || '').toLowerCase().includes(q);
      const matchSubs = (cat.subcategories || []).some((s) => {
        const subName = typeof s === 'string' ? s : s.name;
        return subName.toLowerCase().includes(q);
      });
      return matchName || matchBangla || matchSubs;
    });
  }, [sortedCategories, searchQuery]);

  // Metrics
  const totalSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);
  }, [categories]);

  const totalSubSubcategories = useMemo(() => {
    return categories.reduce((acc, cat) => {
      const subs = normalizeSubs(cat.subcategories);
      return acc + subs.reduce((sAcc, s) => sAcc + (s.subSubcategories?.length || 0), 0);
    }, 0);
  }, [categories]);

  // Flash highlight on move
  const triggerMoveHighlight = (catId: string) => {
    setLastMovedCatId(catId);
    setTimeout(() => {
      setLastMovedCatId(null);
    }, 1800);
  };

  // Reordering handlers
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
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;

    const catId = sortedCategories[index].id;
    handleSetCategoryPosition(catId, targetIndex);
  };

  // Subcategory ordering
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
  };

  const handleToggleExpand = (catId: string) => {
    setExpandedCatIds((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Modal actions
  const openAddModal = () => {
    setEditingCat(null);
    setCatName('');
    setCatBanglaName('');
    setCatImage('https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop&q=80');
    setSubcategoriesList([
      {
        id: 'sub-1',
        name: "Boys & Men's Fashion",
        icon: 'Shirt',
        subSubcategories: ['T-Shirts', 'Jeans & Pants', 'Panjabi & Shirts'],
      },
      {
        id: 'sub-2',
        name: "Women's Collection",
        icon: 'Sparkles',
        subSubcategories: ['Saree', 'Three Piece', 'Kurti & Tops'],
      },
    ]);
    setNewSubName('');
    setNewSubIcon('Layers');
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
    setNewSubIcon('Layers');
    setNewSubSubInput({});
    const currentPos = sortedCategories.findIndex((c) => c.id === cat.id);
    setCatPriority(currentPos !== -1 ? currentPos + 1 : (cat.priority ?? 0) + 1);
    setIsModalOpen(true);
  };

  const handleAddSubcategory = () => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    setSubcategoriesList([
      ...subcategoriesList,
      {
        id: 'sub-' + Date.now(),
        name: trimmed,
        icon: newSubIcon,
        subSubcategories: [],
      },
    ]);
    setNewSubName('');
    setNewSubIcon('Layers');
  };

  const handleRemoveSubcategory = (subId: string) => {
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
  };

  const handleDelete = (cat: Category) => {
    const attachedCount = products.filter((p) => p.category === cat.name).length;
    if (attachedCount > 0) {
      alert(
        `Cannot delete category "${cat.name}" because it has ${attachedCount} active products. Reassign the products first.`
      );
      return;
    }
    if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      onDeleteCategory(cat.id);
    }
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
  };

  // Quick inline add nested sub-sub-category
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
  };

  // Quick remove sub-sub-category
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
  };

  // Quick remove subcategory
  const handleQuickRemoveSubcategory = (cat: Category, subId: string) => {
    const subs = normalizeSubs(cat.subcategories);
    const updated: Category = {
      ...cat,
      subcategories: subs.filter((s) => s.id !== subId),
    };
    onUpdateCategory(updated);
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
    subs[subIndex].name = trimmed;
    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
    setEditingSubKey(null);
  };

  // Quick rename nested sub-subcategory (child tag)
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
  };

  // Modal draft rename subcategory
  const handleSaveDraftRenameSubcategory = (sIdx: number) => {
    const trimmed = editingDraftSubVal.trim();
    if (trimmed) {
      setSubcategoriesList((prev) =>
        prev.map((sub, i) => (i === sIdx ? { ...sub, name: trimmed } : sub))
      );
    }
    setEditingDraftSubIdx(null);
  };

  // Modal draft rename nested child subcategory
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

  // Sub-subcategory (3rd Tier) ordering handlers
  const handleSetSubSubcategoryPosition = (
    cat: Category,
    subIndex: number,
    subSubIndex: number,
    newPositionZeroIndexed: number
  ) => {
    const subs = normalizeSubs(cat.subcategories);
    const targetSub = subs[subIndex];
    if (!targetSub || !targetSub.subSubcategories) return;
    const currentSubSubs = [...targetSub.subSubcategories];
    if (
      newPositionZeroIndexed < 0 ||
      newPositionZeroIndexed >= currentSubSubs.length ||
      subSubIndex === newPositionZeroIndexed
    )
      return;

    const [movedItem] = currentSubSubs.splice(subSubIndex, 1);
    currentSubSubs.splice(newPositionZeroIndexed, 0, movedItem);
    targetSub.subSubcategories = currentSubSubs;

    const updated: Category = {
      ...cat,
      subcategories: subs,
    };
    onUpdateCategory(updated);
  };

  const handleMoveSubSubcategory = (
    cat: Category,
    subIndex: number,
    subSubIndex: number,
    direction: 'left' | 'right'
  ) => {
    const targetIndex = direction === 'left' ? subSubIndex - 1 : subSubIndex + 1;
    handleSetSubSubcategoryPosition(cat, subIndex, subSubIndex, targetIndex);
  };

  // Draft modal Sub-subcategory ordering handlers
  const handleSetDraftSubSubcategoryPosition = (
    subIndex: number,
    subSubIndex: number,
    newPositionZeroIndexed: number
  ) => {
    setSubcategoriesList((prev) => {
      const nextList = [...prev];
      const targetSub = nextList[subIndex];
      if (!targetSub || !targetSub.subSubcategories) return prev;
      const currentSubSubs = [...targetSub.subSubcategories];
      if (
        newPositionZeroIndexed < 0 ||
        newPositionZeroIndexed >= currentSubSubs.length ||
        subSubIndex === newPositionZeroIndexed
      )
        return prev;

      const [movedItem] = currentSubSubs.splice(subSubIndex, 1);
      currentSubSubs.splice(newPositionZeroIndexed, 0, movedItem);
      nextList[subIndex] = { ...targetSub, subSubcategories: currentSubSubs };
      return nextList;
    });
  };

  const handleMoveDraftSubSubcategory = (
    subIndex: number,
    subSubIndex: number,
    direction: 'left' | 'right'
  ) => {
    const targetIndex = direction === 'left' ? subSubIndex - 1 : subSubIndex + 1;
    handleSetDraftSubSubcategoryPosition(subIndex, subSubIndex, targetIndex);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header & Compact Summary */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  Category & Priority Management
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black border border-sky-200">
                  {categories.length} Categories
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                Organize categories, adjust priority order via buttons or dropdowns, and manage subcategories.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-nowrap gap-1.5 sm:gap-2 self-start lg:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 text-[11px] sm:text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('compact-list')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'compact-list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compact List & Priority Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Compact List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bento-grid')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'bento-grid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bento Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Cards</span>
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="px-3 sm:px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-[11px] sm:text-xs shadow-md shadow-sky-600/20 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add New Category</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 font-black text-xs">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Categories</p>
              <p className="text-sm font-black text-slate-900">{categories.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subcategories</p>
              <p className="text-sm font-black text-slate-900">{totalSubcategories}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-black text-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sub-Sub Tags</p>
              <p className="text-sm font-black text-slate-900">{totalSubSubcategories}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-black text-xs">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Catalog Products</p>
              <p className="text-sm font-black text-slate-900">{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category or subcategory..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-500">
          <span className="font-semibold">
            Showing: <strong className="text-slate-900">{filteredCategories.length}</strong> Categories
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-sky-600 hover:text-sky-800 font-bold cursor-pointer text-xs"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: COMPACT LIST / TABLE VIEW WITH LIVE PRIORITY ORDERING */}
      {viewMode === 'compact-list' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-32 text-center">Priority Rank</th>
                  <th className="py-3 px-4">Category Info</th>
                  <th className="py-3 px-4 w-32 text-center">Products</th>
                  <th className="py-3 px-4 min-w-[220px]">Subcategories & Sub-Tags</th>
                  <th className="py-3 px-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => {
                    const cIdx = sortedCategories.findIndex((c) => c.id === cat.id);
                    const prodCount = products.filter((p) => p.category === cat.name).length;
                    const parsedSubs = normalizeSubs(cat.subcategories);
                    const isExpanded = !!expandedCatIds[cat.id];
                    const isHighlighted = lastMovedCatId === cat.id;

                    return (
                      <React.Fragment key={cat.id}>
                        <tr
                          className={`transition-colors ${
                            isHighlighted ? 'bg-amber-50/80 ring-2 ring-amber-300 ring-inset' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Priority Column with Quick Dropdown & Up/Down Movers */}
                          <td className="py-3 px-3 text-center align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Position Dropdown */}
                              <div
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-all ${
                                  cIdx === 0
                                    ? 'bg-sky-50 border-sky-300 text-sky-900 font-black'
                                    : 'bg-amber-50/80 border-amber-200 text-amber-900 font-bold'
                                }`}
                                title="Change Priority"
                              >
                                <ArrowUpDown className="w-3 h-3 text-amber-700 shrink-0" />
                                <select
                                  value={cIdx}
                                  onChange={(e) => handleSetCategoryPosition(cat.id, Number(e.target.value))}
                                  className="text-xs font-black bg-transparent cursor-pointer focus:outline-hidden pr-0.5"
                                >
                                  {sortedCategories.map((_, idx) => (
                                    <option key={idx} value={idx}>
                                      #{idx + 1} {idx === 0 ? '(1st - Top)' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Up / Down Arrows */}
                              <div className="flex flex-col bg-slate-100 border border-slate-200 rounded-lg overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveCategory(cIdx, 'up')}
                                  disabled={cIdx === 0}
                                  className="p-1 text-slate-600 hover:text-sky-600 hover:bg-white disabled:opacity-20 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveCategory(cIdx, 'down')}
                                  disabled={cIdx === sortedCategories.length - 1}
                                  className="p-1 text-slate-600 hover:text-sky-600 hover:bg-white disabled:opacity-20 cursor-pointer border-t border-slate-200"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Category Info */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <img
                                src={cat.featuredImage || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100'}
                                alt={cat.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-200 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                                    {cat.name}
                                  </h4>
                                  {cIdx === 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[9px] font-black uppercase tracking-tight shrink-0">
                                      ★ 1st
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  {cat.banglaName && (
                                    <span className="font-medium text-slate-600">{cat.banglaName}</span>
                                  )}
                                  <span className="font-mono text-[10px] text-slate-400">/{cat.slug || cat.id}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Products Count */}
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/60">
                              <Package className="w-3 h-3 text-sky-600" />
                              <span>{prodCount} Prod</span>
                            </span>
                          </td>

                          {/* Subcategories & Expand button */}
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleExpand(cat.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                                  isExpanded
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-sky-600/20'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Layers className={`w-3.5 h-3.5 ${isExpanded ? 'text-white' : 'text-sky-600'}`} />
                                <span>{parsedSubs.length} Subcategories</span>
                                <span className={`text-[10px] font-black ${isExpanded ? 'text-sky-100' : 'text-sky-600'}`}>
                                  {isExpanded ? '▲ Close' : '▼ View'}
                                </span>
                              </button>

                              {/* Preview small chips */}
                              {!isExpanded && parsedSubs.length > 0 && (
                                <div className="hidden lg:flex items-center gap-1 overflow-hidden max-w-[180px] text-[10px] text-slate-500">
                                  {parsedSubs.slice(0, 2).map((s, idx) => (
                                    <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[85px]">
                                      {s.name}
                                    </span>
                                  ))}
                                  {parsedSubs.length > 2 && (
                                    <span className="text-[9px] text-slate-400 font-bold shrink-0">
                                      +{parsedSubs.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 align-middle text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditModal(cat)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                title="Edit Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(cat)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* BEAUTIFUL & COMPACT SUB-CATEGORIES ACCORDION DRAWER */}
                        {isExpanded && (
                          <tr className="bg-gradient-to-b from-slate-50/90 to-sky-50/30 border-b border-slate-200">
                            <td colSpan={5} className="p-3 sm:p-5">
                              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
                                {/* Drawer Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                      <Layers className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h5 className="font-black text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                                        <span>Subcategories of "{cat.name}"</span>
                                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-bold border border-sky-200">
                                          {parsedSubs.length} Subcategories
                                        </span>
                                      </h5>
                                      <p className="text-[11px] text-slate-500 mt-0.5">
                                        Arrange subcategory positions and manage nested sub-tags.
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Add Subcategory bar in header */}
                                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                    <input
                                      type="text"
                                      placeholder="+ New subcategory name..."
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
                                      className="flex-1 sm:w-64 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-sky-500 font-medium"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAddSubcategory(cat)}
                                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Compact Responsive Sub-categories Grid */}
                                {parsedSubs.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {parsedSubs.map((sub, sIdx) => (
                                      <div
                                        key={sub.id || sIdx}
                                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-sky-300 hover:bg-white transition-all space-y-2.5 flex flex-col justify-between shadow-2xs group"
                                      >
                                        {/* Sub Top Info & Reordering */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center font-black text-[10px] shrink-0">
                                              {sIdx + 1}
                                            </span>
                                            {editingSubKey === `${cat.id}_${sIdx}` ? (
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
                                                  className="w-full px-2 py-0.5 text-xs font-bold text-slate-900 bg-white border border-sky-400 rounded-md focus:outline-hidden"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveRenameSubcategory(cat, sIdx)}
                                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                                  title="Save"
                                                >
                                                  <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingSubKey(null)}
                                                  className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                                                  title="Cancel"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1 min-w-0">
                                                <span className="font-black text-slate-900 text-xs truncate">
                                                  {sub.name}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingSubKey(`${cat.id}_${sIdx}`);
                                                    setEditingSubVal(sub.name);
                                                  }}
                                                  className="opacity-60 hover:opacity-100 p-0.5 text-slate-400 hover:text-sky-600 transition-opacity cursor-pointer"
                                                  title="Rename Subcategory"
                                                >
                                                  <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            {/* Sub Pos Selector */}
                                            <select
                                              value={sIdx}
                                              onChange={(e) => handleSetSubcategoryPosition(cat, sIdx, Number(e.target.value))}
                                              className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md px-1 py-0.5 cursor-pointer focus:outline-hidden"
                                              title="Change Subcategory Position"
                                            >
                                              {parsedSubs.map((_, pIdx) => (
                                                <option key={pIdx} value={pIdx}>
                                                  #{pIdx + 1}
                                                </option>
                                              ))}
                                            </select>

                                            <button
                                              type="button"
                                              onClick={() => handleQuickRemoveSubcategory(cat, sub.id)}
                                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                              title="Delete Subcategory"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Sub-sub tags list */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold">
                                            <span className="flex items-center gap-1">
                                              <Tag className="w-3 h-3 text-sky-600" />
                                              <span>Child Subcategories ({(sub.subSubcategories || []).length})</span>
                                            </span>
                                            <span className="text-[9px] text-slate-400">৩য় স্তর</span>
                                          </div>

                                          <div className="flex flex-wrap gap-1.5 min-h-[26px]">
                                            {sub.subSubcategories && sub.subSubcategories.length > 0 ? (
                                              sub.subSubcategories.map((subSub, ssIdx) => (
                                                <span
                                                  key={ssIdx}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[10px] font-bold shadow-2xs transition-colors hover:border-sky-300"
                                                >
                                                  {editingSubSubKey === `${cat.id}_${sIdx}_${ssIdx}` ? (
                                                    <span className="inline-flex items-center gap-0.5">
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
                                                        className="w-24 px-1 py-0.2 text-[10px] bg-sky-50 border border-sky-400 rounded focus:outline-hidden"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSaveRenameSubSubcategory(cat, sIdx, ssIdx)}
                                                        className="text-emerald-600 hover:text-emerald-800 p-0.5"
                                                      >
                                                        <Check className="w-2.5 h-2.5" />
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => setEditingSubSubKey(null)}
                                                        className="text-slate-400 hover:text-slate-600 p-0.5"
                                                      >
                                                        <X className="w-2.5 h-2.5" />
                                                      </button>
                                                    </span>
                                                  ) : (
                                                    <>
                                                      {/* Priority Position Selector & Badge */}
                                                      <select
                                                        value={ssIdx}
                                                        onChange={(e) =>
                                                          handleSetSubSubcategoryPosition(
                                                            cat,
                                                            sIdx,
                                                            ssIdx,
                                                            Number(e.target.value)
                                                          )
                                                        }
                                                        className="text-[9px] font-black bg-sky-50 text-sky-800 border border-sky-200 rounded px-1 py-0.2 cursor-pointer focus:outline-hidden"
                                                        title="Change priority position"
                                                      >
                                                        {(sub.subSubcategories || []).map((_, pIdx) => (
                                                          <option key={pIdx} value={pIdx}>
                                                            #{pIdx + 1}
                                                          </option>
                                                        ))}
                                                      </select>

                                                      <span className="font-semibold text-slate-800">{subSub}</span>

                                                      {/* Move Left / Right buttons */}
                                                      <div className="inline-flex items-center gap-0.2 border-l border-slate-200 pl-1 ml-0.5">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleMoveSubSubcategory(cat, sIdx, ssIdx, 'left')}
                                                          disabled={ssIdx === 0}
                                                          className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-20 cursor-pointer"
                                                          title="Move left"
                                                        >
                                                          <ChevronLeft className="w-2.5 h-2.5" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleMoveSubSubcategory(cat, sIdx, ssIdx, 'right')}
                                                          disabled={ssIdx === (sub.subSubcategories || []).length - 1}
                                                          className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-20 cursor-pointer"
                                                          title="Move right"
                                                        >
                                                          <ChevronRight className="w-2.5 h-2.5" />
                                                        </button>
                                                      </div>

                                                      {/* Edit button */}
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setEditingSubSubKey(`${cat.id}_${sIdx}_${ssIdx}`);
                                                          setEditingSubSubVal(subSub);
                                                        }}
                                                        className="text-slate-400 hover:text-sky-600 cursor-pointer ml-0.5"
                                                        title="Edit Child Subcategory"
                                                      >
                                                        <Edit2 className="w-2.5 h-2.5" />
                                                      </button>

                                                      {/* Delete button */}
                                                      <button
                                                        type="button"
                                                        onClick={() => handleQuickRemoveSubSubcategory(cat, sIdx, subSub)}
                                                        className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                                        title="Remove Child Subcategory"
                                                      >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                      </button>
                                                    </>
                                                  )}
                                                </span>
                                              ))
                                            ) : (
                                              <span className="text-[10px] text-slate-400 italic py-0.5">
                                                No child subcategories yet
                                              </span>
                                            )}
                                          </div>

                                          {/* Inline add sub-sub */}
                                          <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60">
                                            <input
                                              type="text"
                                              placeholder="+ Add Child Subcategory (e.g. Jeans & Cargo)..."
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
                                              className="flex-1 px-2 py-1 rounded-md border border-slate-200 text-[10px] bg-white focus:outline-hidden focus:border-sky-500 font-medium"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleQuickAddSubSubcategory(cat, sIdx)}
                                              className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                                            >
                                              + Tag
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1">
                                    <p className="text-xs font-bold text-slate-600">
                                      No subcategories added to this category yet.
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      Type a name in the input box above to add a subcategory.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: COMPACT BENTO GRID CARDS */}
      {viewMode === 'bento-grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredCategories.map((cat) => {
            const cIdx = sortedCategories.findIndex((c) => c.id === cat.id);
            const count = products.filter((p) => p.category === cat.name).length;
            const parsedSubs = normalizeSubs(cat.subcategories);
            const isExpanded = !!expandedCatIds[cat.id];
            const isHighlighted = lastMovedCatId === cat.id;

            return (
              <div
                key={cat.id}
                className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all flex flex-col justify-between space-y-3.5 ${
                  isHighlighted
                    ? 'border-amber-400 shadow-md ring-2 ring-amber-300'
                    : 'border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Category Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={cat.featuredImage || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=120'}
                        alt={cat.name}
                        className="w-12 h-12 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-200 shadow-2xs"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black shrink-0 ${
                              cIdx === 0
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            #{cIdx + 1}
                          </span>
                          <h3 className="font-black text-slate-900 text-sm truncate">{cat.name}</h3>
                        </div>
                        {cat.banglaName && (
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{cat.banglaName}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md">
                            <Package className="w-3 h-3" />
                            {count} Prod
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Layers className="w-3 h-3" />
                            {parsedSubs.length} Subs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Edit Category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Priority Order Changer Strip */}
                  <div className="mt-3 p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-amber-900">
                      <ArrowUpDown className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="font-bold">Priority Position:</span>
                      <select
                        value={cIdx}
                        onChange={(e) => handleSetCategoryPosition(cat.id, Number(e.target.value))}
                        className="font-black text-amber-950 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-xs cursor-pointer focus:outline-hidden"
                      >
                        {sortedCategories.map((_, idx) => (
                          <option key={idx} value={idx}>
                            #{idx + 1} {idx === 0 ? '(1st - Top)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(cIdx, 'up')}
                        disabled={cIdx === 0}
                        className="p-1 rounded bg-white text-slate-600 hover:text-sky-600 disabled:opacity-20 border border-amber-200 cursor-pointer shadow-2xs"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(cIdx, 'down')}
                        disabled={cIdx === sortedCategories.length - 1}
                        className="p-1 rounded bg-white text-slate-600 hover:text-sky-600 disabled:opacity-20 border border-amber-200 cursor-pointer shadow-2xs"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Accordion trigger */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(cat.id)}
                      className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-600" />
                        <span>Subcategories ({parsedSubs.length})</span>
                      </span>
                      <span className="text-[10px] text-sky-600 font-black">
                        {isExpanded ? 'Hide ▲' : 'View Details ▼'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-2 max-h-72 overflow-y-auto pr-1">
                        {parsedSubs.map((sub, sIdx) => (
                          <div
                            key={sub.id || sIdx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              {editingSubKey === `${cat.id}_${sIdx}` ? (
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
                                    className="w-full px-1.5 py-0.2 text-xs font-bold text-slate-900 bg-white border border-sky-400 rounded focus:outline-hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRenameSubcategory(cat, sIdx)}
                                    className="p-0.5 rounded bg-emerald-600 text-white cursor-pointer"
                                    title="Save"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSubKey(null)}
                                    className="p-0.5 rounded bg-slate-200 text-slate-700 cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                  <span className="font-black text-slate-900 truncate">
                                    {sIdx + 1}. {sub.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSubKey(`${cat.id}_${sIdx}`);
                                      setEditingSubVal(sub.name);
                                    }}
                                    className="opacity-50 hover:opacity-100 p-0.5 text-slate-400 hover:text-sky-600 cursor-pointer"
                                    title="Rename"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                              <div className="flex items-center gap-1 shrink-0">
                                <select
                                  value={sIdx}
                                  onChange={(e) => handleSetSubcategoryPosition(cat, sIdx, Number(e.target.value))}
                                  className="text-[10px] font-bold bg-white border border-slate-200 rounded px-1 py-0.2"
                                  title="Select Position"
                                >
                                  {parsedSubs.map((_, pIdx) => (
                                    <option key={pIdx} value={pIdx}>
                                      #{pIdx + 1}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleQuickRemoveSubcategory(cat, sub.id)}
                                  className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Sub-sub tags */}
                            <div className="flex flex-wrap gap-1.5">
                              {(sub.subSubcategories || []).map((subSub, ssIdx) => (
                                <span
                                  key={ssIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-700 font-medium hover:border-sky-300 shadow-2xs"
                                >
                                  {editingSubSubKey === `${cat.id}_${sIdx}_${ssIdx}` ? (
                                    <span className="inline-flex items-center gap-0.5">
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
                                        className="w-20 px-1 py-0.2 text-[9px] bg-sky-50 border border-sky-400 rounded focus:outline-hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveRenameSubSubcategory(cat, sIdx, ssIdx)}
                                        className="text-emerald-600 hover:text-emerald-800"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingSubSubKey(null)}
                                        className="text-slate-400 hover:text-slate-600"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </span>
                                  ) : (
                                    <>
                                      {/* Position Selector */}
                                      <select
                                        value={ssIdx}
                                        onChange={(e) =>
                                          handleSetSubSubcategoryPosition(
                                            cat,
                                            sIdx,
                                            ssIdx,
                                            Number(e.target.value)
                                          )
                                        }
                                        className="text-[9px] font-black bg-sky-50 text-sky-800 border border-sky-200 rounded px-1 py-0.2 cursor-pointer focus:outline-hidden"
                                        title="Change priority position"
                                      >
                                        {(sub.subSubcategories || []).map((_, pIdx) => (
                                          <option key={pIdx} value={pIdx}>
                                            #{pIdx + 1}
                                          </option>
                                        ))}
                                      </select>

                                      <span className="font-semibold text-slate-800">{subSub}</span>

                                      {/* Move Left / Right buttons */}
                                      <div className="inline-flex items-center gap-0.2 border-l border-slate-200 pl-1 ml-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveSubSubcategory(cat, sIdx, ssIdx, 'left')}
                                          disabled={ssIdx === 0}
                                          className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-20 cursor-pointer"
                                          title="Move left"
                                        >
                                          <ChevronLeft className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveSubSubcategory(cat, sIdx, ssIdx, 'right')}
                                          disabled={ssIdx === (sub.subSubcategories || []).length - 1}
                                          className="p-0.5 text-slate-400 hover:text-sky-600 disabled:opacity-20 cursor-pointer"
                                          title="Move right"
                                        >
                                          <ChevronRight className="w-2.5 h-2.5" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubSubKey(`${cat.id}_${sIdx}_${ssIdx}`);
                                          setEditingSubSubVal(subSub);
                                        }}
                                        className="text-slate-400 hover:text-sky-600 cursor-pointer ml-0.5"
                                        title="Edit Tag"
                                      >
                                        <Edit2 className="w-2 h-2" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickRemoveSubSubcategory(cat, sIdx, subSub)}
                                        className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                        title="Remove Tag"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </>
                                  )}
                                </span>
                              ))}
                            </div>

                            {/* Inline Add nested */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <input
                                type="text"
                                placeholder="+ Child Subcategory..."
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
                                className="flex-1 px-2 py-0.5 rounded border border-slate-200 text-[10px] bg-white focus:outline-hidden font-medium"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuickAddSubSubcategory(cat, sIdx)}
                                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Subcategory footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Subcategory name..."
                    value={quickSubInputs[cat.id] || ''}
                    onChange={(e) => setQuickSubInputs({ ...quickSubInputs, [cat.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddSubcategory(cat);
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickAddSubcategory(cat)}
                    className="px-2.5 py-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-sky-400" />
                <h3 className="font-black text-base">
                  {editingCat ? `Edit Category: ${editingCat.name}` : 'Add New Category & Subcategories'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Smart Electronics"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-bold focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Secondary / Local Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={catBanglaName}
                    onChange={(e) => setCatBanglaName(e.target.value)}
                    placeholder="e.g. Smart Electronics"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner / Featured Image URL
                </label>
                <input
                  type="url"
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              {/* Display Priority Order in Navigation */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-1.5">
                <label className="block text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
                  <span>Storefront Navigation Priority</span>
                </label>
                <select
                  value={catPriority}
                  onChange={(e) => setCatPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs font-bold text-slate-900 bg-white focus:outline-hidden"
                >
                  {Array.from({ length: editingCat ? sortedCategories.length : sortedCategories.length + 1 }).map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Position #{idx + 1} {idx === 0 ? '(1st position - directly after "All Categories")' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-800">
                  When customers browse the homepage or shop page, categories will be displayed according to this priority sequence.
                </p>
              </div>

              {/* Sub-categories & Nested Sub-subcategories Manager */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-900 uppercase tracking-wide">
                    Subcategories & Child Sub-tags ({subcategoriesList.length})
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Multi-tier Categories
                  </span>
                </div>

                {/* Add new subcategory input row */}
                <div className="flex items-center gap-2">
                  <select
                    value={newSubIcon}
                    onChange={(e) => setNewSubIcon(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                  >
                    <option value="Layers">📁 Layers</option>
                    <option value="Shirt">👕 Fashion</option>
                    <option value="Sparkles">✨ Beauty</option>
                    <option value="Package">📦 Goods</option>
                    <option value="Tag">🏷️ Tag</option>
                  </select>
                  <input
                    type="text"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                    placeholder="Subcategory name (e.g. Smart Watch)"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of subcategories with nested sub-subcategories */}
                <div className="space-y-2.5 pt-1 max-h-56 overflow-y-auto pr-1">
                  {subcategoriesList.map((sub, sIdx) => (
                    <div
                      key={sub.id || sIdx}
                      className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center text-[10px] font-black shrink-0">
                            {sIdx + 1}
                          </span>
                          {editingDraftSubIdx === sIdx ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editingDraftSubVal}
                                onChange={(e) => setEditingDraftSubVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveDraftRenameSubcategory(sIdx);
                                  } else if (e.key === 'Escape') {
                                    setEditingDraftSubIdx(null);
                                  }
                                }}
                                autoFocus
                                className="w-full px-2 py-0.5 text-xs font-bold text-slate-900 bg-white border border-sky-400 rounded-md focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDraftRenameSubcategory(sIdx)}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDraftSubIdx(null)}
                                className="p-1 rounded bg-slate-200 text-slate-700 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {sub.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDraftSubIdx(sIdx);
                                  setEditingDraftSubVal(sub.name);
                                }}
                                className="opacity-50 hover:opacity-100 p-0.5 text-slate-400 hover:text-sky-600 cursor-pointer"
                                title="Rename Subcategory"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold shrink-0">
                                {sub.subSubcategories?.length || 0} tags
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(sub.id)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                          title="Delete Subcategory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Nested sub-sub tags manager */}
                      <div className="pl-6 space-y-1.5 border-l-2 border-sky-100 ml-1.5">
                        <div className="flex flex-wrap gap-1">
                          {sub.subSubcategories && sub.subSubcategories.length > 0 ? (
                            sub.subSubcategories.map((subSub, ssIdx) => (
                              <span
                                key={ssIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[11px] font-bold shadow-2xs"
                              >
                                {editingDraftSubSubKey === `${sIdx}_${ssIdx}` ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <input
                                      type="text"
                                      value={editingDraftSubSubVal}
                                      onChange={(e) => setEditingDraftSubSubVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveDraftRenameSubSubcategory(sIdx, ssIdx);
                                        } else if (e.key === 'Escape') {
                                          setEditingDraftSubSubKey(null);
                                        }
                                      }}
                                      autoFocus
                                      className="w-24 px-1 py-0.2 text-[10px] bg-white border border-sky-400 rounded focus:outline-hidden"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveDraftRenameSubSubcategory(sIdx, ssIdx)}
                                      className="text-emerald-600 hover:text-emerald-800"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingDraftSubSubKey(null)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ) : (
                                  <>
                                    {/* Position Selector */}
                                    <select
                                      value={ssIdx}
                                      onChange={(e) =>
                                        handleSetDraftSubSubcategoryPosition(
                                          sIdx,
                                          ssIdx,
                                          Number(e.target.value)
                                        )
                                      }
                                      className="text-[9px] font-black bg-white text-sky-900 border border-sky-300 rounded px-1 py-0.2 cursor-pointer focus:outline-hidden"
                                      title="Change priority position"
                                    >
                                      {(sub.subSubcategories || []).map((_, pIdx) => (
                                        <option key={pIdx} value={pIdx}>
                                          #{pIdx + 1}
                                        </option>
                                      ))}
                                    </select>

                                    <span className="font-bold text-sky-950">{subSub}</span>

                                    {/* Move Left / Right buttons */}
                                    <div className="inline-flex items-center gap-0.2 border-l border-sky-200 pl-1 ml-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleMoveDraftSubSubcategory(sIdx, ssIdx, 'left')}
                                        disabled={ssIdx === 0}
                                        className="p-0.5 text-sky-400 hover:text-sky-700 disabled:opacity-20 cursor-pointer"
                                        title="Move left"
                                      >
                                        <ChevronLeft className="w-2.5 h-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleMoveDraftSubSubcategory(sIdx, ssIdx, 'right')}
                                        disabled={ssIdx === (sub.subSubcategories || []).length - 1}
                                        className="p-0.5 text-sky-400 hover:text-sky-700 disabled:opacity-20 cursor-pointer"
                                        title="Move right"
                                      >
                                        <ChevronRight className="w-2.5 h-2.5" />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingDraftSubSubKey(`${sIdx}_${ssIdx}`);
                                        setEditingDraftSubSubVal(subSub);
                                      }}
                                      className="text-sky-400 hover:text-sky-700 cursor-pointer ml-0.5"
                                      title="Rename Child Tag"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSubSubcategoryFromDraft(sIdx, subSub)}
                                      className="text-sky-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                      title="Delete Child Tag"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              No child subcategories yet
                            </span>
                          )}
                        </div>

                        {/* Add sub-sub input */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="text"
                            placeholder="+ Add Child Subcategory (e.g. Jeans & Pants)..."
                            value={newSubSubInput[sIdx] || ''}
                            onChange={(e) =>
                              setNewSubSubInput({
                                ...newSubSubInput,
                                [sIdx]: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubSubcategoryToDraft(sIdx);
                              }
                            }}
                            className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-900 bg-slate-50 focus:bg-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSubSubcategoryToDraft(sIdx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                          >
                            + Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {subcategoriesList.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3 italic">
                      No subcategories added yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md shadow-sky-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
