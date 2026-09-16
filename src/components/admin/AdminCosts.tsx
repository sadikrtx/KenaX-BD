import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Truck,
  Package,
  Calendar,
  Trash2,
  Edit2,
  FileText,
  TrendingDown,
  TrendingUp,
  Building2,
  Megaphone,
  CreditCard,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Download,
  Receipt,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  UserCheck,
  Tag,
  Coins,
  Sparkles,
  Layers,
  HelpCircle,
  Copy,
  Check,
  History,
  Info,
  Banknote,
  Gift,
  HandCoins,
  Percent,
} from 'lucide-react';
import {
  ExpenseRecord,
  ExpenseCategory,
  OtherProfitRecord,
  OtherProfitSource,
  Order,
  StaffUser,
  UserRole,
  ActivityLog,
  isDemoOtherProfit,
} from '../../types';

interface AdminCostsProps {
  expenses: ExpenseRecord[];
  otherProfits?: OtherProfitRecord[];
  orders: Order[];
  activityLogs?: ActivityLog[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => void;
  onAddOtherProfit?: (profit: OtherProfitRecord) => void;
  onUpdateOtherProfit?: (profit: OtherProfitRecord) => void;
  onDeleteOtherProfit?: (profitId: string) => void;
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
}

const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  delivery: {
    label: 'Delivery & Courier Charge',
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
    icon: Truck,
  },
  packaging: {
    label: 'Packaging & Boxes',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Package,
  },
  shipping: {
    label: 'Freight & Shipping',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Truck,
  },
  product_cost: {
    label: 'Product / Supplier Purchase',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Receipt,
  },
  marketing: {
    label: 'Marketing & Advertising',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: Megaphone,
  },
  office_rent: {
    label: 'Office & Warehouse Rent',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
    icon: Building2,
  },
  salary: {
    label: 'Staff Salary & Allowance',
    color: 'text-teal-700',
    bg: 'bg-teal-50 border-teal-200',
    icon: UserCheck,
  },
  utilities: {
    label: 'Utilities & Internet',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    icon: Tag,
  },
  software: {
    label: 'Software & Cloud Tools',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 border-cyan-200',
    icon: ShieldCheck,
  },
  loss_damage: {
    label: 'Damaged & Lost Parcel',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: AlertCircle,
  },
  other: {
    label: 'Other Operational Expenses',
    color: 'text-slate-700',
    bg: 'bg-slate-50 border-slate-200',
    icon: DollarSign,
  },
};

export const OTHER_PROFIT_SOURCE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType; desc: string }
> = {
  delivery_cashback: {
    label: 'Delivery Volume Cashback',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Truck,
    desc: 'Cashback & rebates from couriers for high parcel dispatch volume',
  },
  supplier_rebate: {
    label: 'Supplier / Distributor Rebate',
    color: 'text-teal-700',
    bg: 'bg-teal-50 border-teal-200',
    icon: HandCoins,
    desc: 'Bulk purchase discount refund & distributor incentive cash',
  },
  scrap_carton_sale: {
    label: 'Scrap & Packaging Box Resale',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Package,
    desc: 'Income from selling warehouse master cartons, wooden pallets & waste',
  },
  affiliate_commission: {
    label: 'Affiliate & Promotion Revenue',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: Sparkles,
    desc: 'Commission from YouTube/Facebook review links & influencer campaigns',
  },
  bulk_resale: {
    label: 'B2B Wholesale / Bulk Resale Margin',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Layers,
    desc: 'Profit from wholesale supply or direct batch sales to retail shops',
  },
  service_charge: {
    label: 'Service & Priority Fees',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
    icon: Coins,
    desc: 'Gift wrap fees, priority assembly & express handling charges',
  },
  bonus_reward: {
    label: 'Bank & Wallet Bonus / Rewards',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50 border-cyan-200',
    icon: Gift,
    desc: 'bKash/Nagad merchant incentives, payment gateway reward points',
  },
  investment_return: {
    label: 'Business Investment Returns',
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
    icon: TrendingUp,
    desc: 'Short-term investment yield, capital growth or equipment rental',
  },
  bank_profit: {
    label: 'Bank Account Profit / Interest',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50 border-emerald-300',
    icon: Banknote,
    desc: 'Profit credited on business bank checking / savings account',
  },
  other_income: {
    label: 'Other Miscellaneous Income',
    color: 'text-slate-700',
    bg: 'bg-slate-50 border-slate-200',
    icon: DollarSign,
    desc: 'Any external side profits, ad-hoc gains or recovered balances',
  },
};

const COURIER_PRESETS = [
  'Steadfast Courier',
  'Pathao Courier',
  'RedX Delivery',
  'Paperfly',
  'Sundarban Courier',
  'SA Paribahan',
  'Karatoa Courier',
  'In-House Rider',
  'Packaging Supplier',
  'Supplier / Vendor',
  'Other',
];

const SOURCE_ORIGIN_PRESETS = [
  'Steadfast Courier Ltd (Corporate Hub)',
  'Pathao Logistics Merchant Rewards',
  'Official Xiaomi BD National Distributor',
  'Baseus Bangladesh Official Importer',
  'Haylou BD Central Supplier',
  'Chawkbazar Packaging & Paper Traders',
  'Gadget Insider BD (YouTube Partner)',
  'Tech BD Influencer Referral Link',
  'City Bank Business Account Profit',
  'bKash Merchant Incentive Program',
  'Nagad Commercial Payout',
  'Local Retailer Wholesale Buyer',
];

export const AdminCosts: React.FC<AdminCostsProps> = ({
  expenses,
  otherProfits = [],
  orders,
  activityLogs = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddOtherProfit,
  onUpdateOtherProfit,
  onDeleteOtherProfit,
  currentRole,
  currentStaff,
}) => {
  // Main View Switcher: expenses vs others_profit vs ledger
  const [activeTab, setActiveTab] = useState<'expenses' | 'others_profit' | 'ledger'>('expenses');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourier, setSelectedCourier] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedProfitSource, setSelectedProfitSource] = useState<string>('all');

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const [expenseFormData, setExpenseFormData] = useState<{
    category: ExpenseCategory;
    title: string;
    amount: string;
    date: string;
    courier: string;
    location: string;
    orderId: string;
    note: string;
    paymentMethod: string;
  }>({
    category: 'delivery',
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    courier: 'Steadfast Courier',
    location: 'Inside Dhaka',
    orderId: '',
    note: '',
    paymentMethod: 'Cash',
  });
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null);

  // Others Profit Modal State
  const [isProfitModalOpen, setIsProfitModalOpen] = useState(false);
  const [editingProfit, setEditingProfit] = useState<OtherProfitRecord | null>(null);
  const [profitFormData, setProfitFormData] = useState<{
    title: string;
    amount: string;
    sourceCategory: string;
    sourceOrigin: string;
    sourceHistory: string;
    date: string;
    paymentMethod: string;
    sideNote: string;
  }>({
    title: '',
    amount: '',
    sourceCategory: 'delivery_cashback',
    sourceOrigin: '',
    sourceHistory: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'bKash Merchant',
    sideNote: '',
  });
  const [profitFormError, setProfitFormError] = useState<string | null>(null);

  // Detail View Modal State
  const [selectedProfitDetail, setSelectedProfitDetail] = useState<OtherProfitRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dedicated Side Note Modal State
  const [sideNoteModalData, setSideNoteModalData] = useState<{
    title: string;
    type: 'Expense' | 'Others Profit';
    categoryOrSource: string;
    date: string;
    amount: number;
    note: string;
  } | null>(null);

  // Helper for copying text
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Date Filter Helper
  const filterByDateRange = (itemDateStr?: string) => {
    if (!itemDateStr || dateRange === 'all') return true;
    const itemDate = new Date(itemDateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateRange === 'week') {
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= sevenDaysAgo;
    }
    if (dateRange === 'month') {
      const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= thirtyDaysAgo;
    }
    return true;
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = exp.title.toLowerCase().includes(q);
        const matchCourier = exp.courier?.toLowerCase().includes(q);
        const matchLocation = exp.location?.toLowerCase().includes(q);
        const matchOrderId = exp.orderId?.toLowerCase().includes(q);
        const matchNote = exp.note?.toLowerCase().includes(q);
        const matchRecordedBy = exp.recordedBy?.toLowerCase().includes(q);
        if (!matchTitle && !matchCourier && !matchLocation && !matchOrderId && !matchNote && !matchRecordedBy) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // 3. Courier
      if (selectedCourier !== 'all') {
        if (!exp.courier || !exp.courier.toLowerCase().includes(selectedCourier.toLowerCase())) {
          return false;
        }
      }

      // 4. Date Range
      return filterByDateRange(exp.date || exp.createdAt);
    });
  }, [expenses, searchQuery, selectedCategory, selectedCourier, dateRange]);

  // Clean other profits without any demo/placeholder records
  const cleanOtherProfits = useMemo(() => {
    return (otherProfits || []).filter((p) => !isDemoOtherProfit(p));
  }, [otherProfits]);

  // Filtered Others Profit
  const filteredProfits = useMemo(() => {
    return cleanOtherProfits.filter((p) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchOrigin = p.sourceOrigin.toLowerCase().includes(q);
        const matchHistory = p.sourceHistory?.toLowerCase().includes(q);
        const matchSideNote = p.sideNote?.toLowerCase().includes(q);
        const matchMethod = p.paymentMethod?.toLowerCase().includes(q);
        const matchReceivedBy = p.receivedBy.toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchOrigin &&
          !matchHistory &&
          !matchSideNote &&
          !matchMethod &&
          !matchReceivedBy
        ) {
          return false;
        }
      }

      // 2. Source Category
      if (selectedProfitSource !== 'all' && p.sourceCategory !== selectedProfitSource) {
        return false;
      }

      // 3. Date Range
      return filterByDateRange(p.date || p.createdAt);
    });
  }, [cleanOtherProfits, searchQuery, selectedProfitSource, dateRange]);

  // Expense Stats
  const expenseStats = useMemo(() => {
    const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDelivery = expenses
      .filter((e) => e.category === 'delivery' || e.category === 'shipping')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPackaging = expenses
      .filter((e) => e.category === 'packaging')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalOther = expenses
      .filter((e) => e.category !== 'delivery' && e.category !== 'shipping' && e.category !== 'packaging')
      .reduce((sum, e) => sum + e.amount, 0);

    const deliveryPercent = totalAll > 0 ? Math.round((totalDelivery / totalAll) * 100) : 0;
    return {
      totalAll,
      totalDelivery,
      totalPackaging,
      totalOther,
      deliveryPercent,
    };
  }, [expenses]);

  // Others Profit Stats
  const profitStats = useMemo(() => {
    const totalProfit = cleanOtherProfits.reduce((sum, p) => sum + p.amount, 0);
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthProfit = cleanOtherProfits
      .filter((p) => (p.date && p.date.startsWith(thisMonthStr)) || (p.createdAt && p.createdAt.startsWith(thisMonthStr)))
      .reduce((sum, p) => sum + p.amount, 0);

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    cleanOtherProfits.forEach((p) => {
      sourceBreakdown[p.sourceCategory] = (sourceBreakdown[p.sourceCategory] || 0) + p.amount;
    });

    let topSource = 'N/A';
    let topSourceAmount = 0;
    Object.entries(sourceBreakdown).forEach(([k, val]) => {
      if (val > topSourceAmount) {
        topSourceAmount = val;
        topSource = OTHER_PROFIT_SOURCE_CONFIG[k]?.label || k;
      }
    });

    return {
      totalProfit,
      thisMonthProfit,
      topSource,
      topSourceAmount,
      count: cleanOtherProfits.length,
    };
  }, [cleanOtherProfits]);

  // Activity logs specific to Others Profit and Costs
  const profitActivityLogs = useMemo(() => {
    return activityLogs.filter(
      (log) =>
        log.module === 'costs' ||
        log.action.toLowerCase().includes('profit') ||
        log.action.toLowerCase().includes('expense') ||
        log.details.toLowerCase().includes('profit') ||
        log.details.toLowerCase().includes('cashback') ||
        log.details.toLowerCase().includes('rebate')
    );
  }, [activityLogs]);

  // Open Expense Modal
  const openAddExpenseModal = (category?: ExpenseCategory) => {
    setEditingExpense(null);
    setExpenseFormData({
      category: category || 'delivery',
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      courier: 'Steadfast Courier',
      location: 'Inside Dhaka',
      orderId: '',
      note: '',
      paymentMethod: 'Cash',
    });
    setExpenseFormError(null);
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setExpenseFormData({
      category: exp.category,
      title: exp.title,
      amount: exp.amount.toString(),
      date: exp.date || new Date().toISOString().split('T')[0],
      courier: exp.courier || 'Steadfast Courier',
      location: exp.location || '',
      orderId: exp.orderId || '',
      note: exp.note || '',
      paymentMethod: exp.paymentMethod || 'Cash',
    });
    setExpenseFormError(null);
    setIsExpenseModalOpen(true);
  };

  // Handle Save Expense
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.title.trim()) {
      setExpenseFormError('Please enter a descriptive expense title.');
      return;
    }
    const amountNum = parseFloat(expenseFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExpenseFormError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (editingExpense) {
      const updated: ExpenseRecord = {
        ...editingExpense,
        category: expenseFormData.category,
        title: expenseFormData.title.trim(),
        amount: amountNum,
        date: expenseFormData.date,
        courier: expenseFormData.courier.trim(),
        location: expenseFormData.location.trim(),
        orderId: expenseFormData.orderId.trim(),
        note: expenseFormData.note.trim(),
        paymentMethod: expenseFormData.paymentMethod,
        updatedAt: new Date().toISOString(),
      };
      onUpdateExpense(updated);
      showToast(`খরচের হিসাব "${updated.title}" সফলভাবে আপডেট হয়েছে!`);
    } else {
      const newExp: ExpenseRecord = {
        id: `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: expenseFormData.category,
        title: expenseFormData.title.trim(),
        amount: amountNum,
        date: expenseFormData.date,
        courier: expenseFormData.courier.trim(),
        location: expenseFormData.location.trim(),
        orderId: expenseFormData.orderId.trim(),
        note: expenseFormData.note.trim(),
        paymentMethod: expenseFormData.paymentMethod,
        recordedBy: currentStaff?.name || (currentRole === 'super_admin' ? 'Sadik (Super Admin)' : 'Admin Staff'),
        recordedByRole: currentStaff?.role || currentRole,
        createdAt: new Date().toISOString(),
      };
      onAddExpense(newExp);
      showToast(`নতুন খরচ "${newExp.title}" সফলভাবে যোগ হয়েছে!`);
    }

    setIsExpenseModalOpen(false);
  };

  // Open Others Profit Modal
  const openAddProfitModal = () => {
    setEditingProfit(null);
    setProfitFormData({
      title: '',
      amount: '',
      sourceCategory: 'delivery_cashback',
      sourceOrigin: '',
      sourceHistory: '',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'bKash Merchant',
      sideNote: '',
    });
    setProfitFormError(null);
    setIsProfitModalOpen(true);
  };

  const openEditProfitModal = (profit: OtherProfitRecord) => {
    setEditingProfit(profit);
    setProfitFormData({
      title: profit.title,
      amount: profit.amount.toString(),
      sourceCategory: profit.sourceCategory,
      sourceOrigin: profit.sourceOrigin,
      sourceHistory: profit.sourceHistory || '',
      date: profit.date || new Date().toISOString().split('T')[0],
      paymentMethod: profit.paymentMethod || 'bKash Merchant',
      sideNote: profit.sideNote || '',
    });
    setProfitFormError(null);
    setIsProfitModalOpen(true);
  };

  // Handle Save Others Profit
  const handleSaveProfit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profitFormData.title.trim()) {
      setProfitFormError('Please enter a title for this profit/income entry.');
      return;
    }
    if (!profitFormData.sourceOrigin.trim()) {
      setProfitFormError('Please state where this profit came from (Source Origin).');
      return;
    }
    const amountNum = parseFloat(profitFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setProfitFormError('Please enter a valid profit amount in ৳ BDT.');
      return;
    }

    if (editingProfit && onUpdateOtherProfit) {
      const updated: OtherProfitRecord = {
        ...editingProfit,
        title: profitFormData.title.trim(),
        amount: amountNum,
        sourceCategory: profitFormData.sourceCategory,
        sourceOrigin: profitFormData.sourceOrigin.trim(),
        sourceHistory: profitFormData.sourceHistory.trim(),
        date: profitFormData.date,
        paymentMethod: profitFormData.paymentMethod,
        sideNote: profitFormData.sideNote.trim(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateOtherProfit(updated);
      showToast(`আদার্স প্রফিট "${updated.title}" সফলভাবে আপডেট হয়েছে!`);
    } else if (onAddOtherProfit) {
      const newProfit: OtherProfitRecord = {
        id: `PRF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: profitFormData.title.trim(),
        amount: amountNum,
        sourceCategory: profitFormData.sourceCategory,
        sourceOrigin: profitFormData.sourceOrigin.trim(),
        sourceHistory: profitFormData.sourceHistory.trim(),
        date: profitFormData.date,
        paymentMethod: profitFormData.paymentMethod,
        sideNote: profitFormData.sideNote.trim(),
        receivedBy: currentStaff?.name || (currentRole === 'super_admin' ? 'Sadik Rahman (Super Admin)' : 'Staff Member'),
        receivedByRole: currentStaff?.role || currentRole,
        createdAt: new Date().toISOString(),
      };
      onAddOtherProfit(newProfit);
      showToast(`নতুন আদার্স প্রফিট "${newProfit.title}" সফলভাবে যুক্ত হয়েছে!`);
    }

    setIsProfitModalOpen(false);
  };

  // Export CSV
  const exportExpensesCSV = () => {
    const headers = ['ID,Date,Category,Title,Amount (BDT),Courier,Location,Order Ref,Payment Method,Recorded By,Note'];
    const rows = filteredExpenses.map((e) =>
      [
        e.id,
        e.date || e.createdAt?.split('T')[0],
        e.category,
        `"${(e.title || '').replace(/"/g, '""')}"`,
        e.amount,
        `"${(e.courier || '').replace(/"/g, '""')}"`,
        `"${(e.location || '').replace(/"/g, '""')}"`,
        e.orderId || '',
        e.paymentMethod || 'Cash',
        `"${(e.recordedBy || '').replace(/"/g, '""')}"`,
        `"${(e.note || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProfitsCSV = () => {
    const headers = ['ID,Date,Category,Title,Amount (BDT),Source Origin,Source History,Payment Method,Received By,Side Note'];
    const rows = filteredProfits.map((p) =>
      [
        p.id,
        p.date || p.createdAt?.split('T')[0],
        p.sourceCategory,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.amount,
        `"${(p.sourceOrigin || '').replace(/"/g, '""')}"`,
        `"${(p.sourceHistory || '').replace(/"/g, '""')}"`,
        p.paymentMethod || 'Cash',
        `"${(p.receivedBy || '').replace(/"/g, '""')}"`,
        `"${(p.sideNote || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax-others-profit-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Tab Navigation Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-linear-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-center shadow-md shadow-indigo-950/20 shrink-0 mt-0.5 sm:mt-0">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Costs, Expenses &amp; Others Profit
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live Cloud Sync
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 mt-0.5">
                Manage operational delivery costs, packaging materials, and track external extra profits with full history &amp; side notes.
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => openAddExpenseModal('delivery')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-rose-400" />
              <span>Record Expense</span>
            </button>

            <button
              type="button"
              onClick={openAddProfitModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>+ Add Others Profit</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs - Responsive Horizontal Scroll on Mobile */}
        <div className="mt-4 pt-3 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
            {/* Tab 1: Operational Expenses */}
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'expenses'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
              <span>Expenses</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-200/70 text-rose-900 font-black">
                ৳{expenseStats.totalAll.toLocaleString('en-BD')}
              </span>
            </button>

            {/* Tab 2: Others Profit */}
            <button
              type="button"
              onClick={() => setActiveTab('others_profit')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'others_profit'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>Others Profit</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-950 font-black">
                +৳{profitStats.totalProfit.toLocaleString('en-BD')}
              </span>
            </button>

            {/* Tab 3: Ledger */}
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'ledger'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
              <span>Summary Ledger</span>
            </button>
          </div>

          {/* Export Button */}
          <div className="hidden sm:block shrink-0 self-end sm:self-auto">
            {activeTab === 'expenses' ? (
              <button
                type="button"
                onClick={exportExpensesCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={exportProfitsCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OPERATIONAL COSTS & EXPENSES */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          {/* Top 4 KPI Cards for Expenses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">Total Expenses</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-rose-700">৳{expenseStats.totalAll.toLocaleString('en-BD')}</p>
                <p className="text-[11px] text-slate-500 mt-1">{expenses.length} Total Expense Records</p>
              </div>
            </div>

            {/* Delivery & Courier Cost */}
            <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-sky-800 uppercase tracking-wider">Delivery &amp; Logistics</span>
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-sky-900">৳{expenseStats.totalDelivery.toLocaleString('en-BD')}</p>
                <p className="text-[11px] text-sky-600 mt-1 font-medium">{expenseStats.deliveryPercent}% of operational expenses</p>
              </div>
            </div>

            {/* Packaging Cost */}
            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Packaging &amp; Materials</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-amber-900">৳{expenseStats.totalPackaging.toLocaleString('en-BD')}</p>
                <p className="text-[11px] text-amber-600 mt-1 font-medium">Boxes, poly mailers &amp; security tape</p>
              </div>
            </div>

            {/* Other Operational Costs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Other Operational</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">৳{expenseStats.totalOther.toLocaleString('en-BD')}</p>
                <p className="text-[11px] text-slate-500 mt-1">Marketing, utilities &amp; tools</p>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search expenses by title, courier, location, order ID, note, staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-hidden transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* 3 Filters in a single line on mobile (grid-cols-3) and flex on desktop */}
              <div className="grid grid-cols-3 md:flex items-center gap-2 md:gap-3 w-full md:w-auto">
                {/* Category Filter */}
                <div className="min-w-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full py-2 px-2 md:px-3 text-[11px] md:text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:outline-hidden text-slate-800 font-medium truncate"
                  >
                    <option value="all">All Categories ({expenses.length})</option>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                      const count = expenses.filter((e) => e.category === key).length;
                      return (
                        <option key={key} value={key}>
                          {cfg.label} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Courier Filter */}
                <div className="min-w-0">
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="w-full py-2 px-2 md:px-3 text-[11px] md:text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:outline-hidden text-slate-800 font-medium truncate"
                  >
                    <option value="all">All Couriers</option>
                    {COURIER_PRESETS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div className="min-w-0">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full py-2 px-2 md:px-3 text-[11px] md:text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-rose-500 focus:outline-hidden text-slate-800 font-medium truncate"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Showing {filteredExpenses.length} of {expenses.length} Records
                </span>
                {selectedCategory !== 'all' && (
                  <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                    Category: {selectedCategory}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700">
                Filtered Subtotal: <strong className="text-rose-600 font-black">৳{filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-BD')}</strong>
              </span>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Expense Records Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No expenses match your search or filter criteria. Click "Record Expense" to log delivery fees, supplier bills, or packaging costs.
                </p>
                <button
                  type="button"
                  onClick={() => openAddExpenseModal('delivery')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Log Delivery Expense
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card View (< md) */}
                <div className="space-y-3 p-3 md:hidden">
                  {filteredExpenses.map((exp) => {
                    const catCfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                    const IconComp = catCfg.icon;

                    return (
                      <div key={exp.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catCfg.bg} ${catCfg.color}`}>
                              <IconComp className="w-3 h-3" />
                              {catCfg.label}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">{exp.title}</h4>
                          </div>
                          <span className="text-sm font-black text-rose-700 shrink-0">
                            -৳{exp.amount.toLocaleString('en-BD')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{exp.date || exp.createdAt?.split('T')[0]}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{exp.id}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                          <div className="text-[11px]">
                            <span className="text-slate-400">Vendor: </span>
                            <strong className="text-slate-700">{exp.courier || 'General'}</strong>
                            {exp.orderId && (
                              <span className="ml-2 font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 text-[10px]">
                                {exp.orderId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => openEditExpenseModal(exp)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 bg-slate-50 border border-slate-200 cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to permanently delete expense "${exp.title}" (৳${exp.amount})?`)) {
                                  onDeleteExpense(exp.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 bg-slate-50 border border-slate-200 cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {exp.note && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSideNoteModalData({
                                  title: exp.title,
                                  type: 'Expense',
                                  categoryOrSource: catCfg.label,
                                  date: exp.date || exp.createdAt?.split('T')[0] || '',
                                  amount: exp.amount,
                                  note: exp.note,
                                })
                              }
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <Tag className="w-3.5 h-3.5 text-amber-600" />
                              <span>📝 View Side Note</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Expense Title &amp; Details</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Courier / Vendor</th>
                        <th className="py-3 px-4">Order Ref</th>
                        <th className="py-3 px-4">Side Note</th>
                        <th className="py-3 px-4 text-right">Amount (৳)</th>
                        <th className="py-3 px-4">Recorded By</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredExpenses.map((exp) => {
                        const catCfg = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                        const IconComp = catCfg.icon;

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Date */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{exp.date || exp.createdAt?.split('T')[0]}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{exp.id}</span>
                            </td>

                            {/* Title */}
                            <td className="py-3 px-4 max-w-xs">
                              <div className="font-bold text-slate-900">{exp.title}</div>
                              {exp.location && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{exp.location}</span>
                                </div>
                              )}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${catCfg.bg} ${catCfg.color}`}
                              >
                                <IconComp className="w-3 h-3" />
                                {catCfg.label}
                              </span>
                            </td>

                            {/* Courier / Service */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{exp.courier || 'General Logistics'}</div>
                              <span className="text-[10px] text-slate-400">{exp.paymentMethod || 'Cash'}</span>
                            </td>

                            {/* Order Reference */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {exp.orderId ? (
                                <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                                  <FileText className="w-3 h-3" />
                                  {exp.orderId}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Side Note Trigger */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {exp.note ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSideNoteModalData({
                                      title: exp.title,
                                      type: 'Expense',
                                      categoryOrSource: catCfg.label,
                                      date: exp.date || exp.createdAt?.split('T')[0] || '',
                                      amount: exp.amount,
                                      note: exp.note,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                                >
                                  <Tag className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                                  <span>📝 View Side Note</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No side note</span>
                              )}
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-4 whitespace-nowrap text-right">
                              <span className="text-sm font-black text-rose-700">
                                -৳{exp.amount.toLocaleString('en-BD')}
                              </span>
                            </td>

                            {/* Recorded By */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="font-medium text-slate-800">{exp.recordedBy || 'Admin'}</div>
                              <span className="text-[10px] text-slate-400">{exp.recordedByRole || 'Staff'}</span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditExpenseModal(exp)}
                                  title="Edit Expense Entry"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to permanently delete expense "${exp.title}" (৳${exp.amount})?`)) {
                                      onDeleteExpense(exp.id);
                                    }
                                  }}
                                  title="Delete Expense Entry"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OTHERS PROFIT / EXTRA INCOME */}
      {/* ========================================================================= */}
      {activeTab === 'others_profit' && (
        <div className="space-y-6">
          {/* Top 4 KPI Cards for Others Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Others Profit */}
            <div className="bg-linear-to-br from-emerald-50 via-white to-emerald-50/40 p-5 rounded-3xl border border-emerald-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  Total Others Profit
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <p className="text-3xl font-black text-emerald-700 tracking-tight">
                  ৳{profitStats.totalProfit.toLocaleString('en-BD')}
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                  From {profitStats.count} external income entries
                </p>
              </div>
            </div>

            {/* This Month's Extra Profit */}
            <div className="bg-linear-to-br from-teal-50 via-white to-teal-50/40 p-5 rounded-3xl border border-teal-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-900 uppercase tracking-wider">
                  This Month's Profit
                </span>
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <p className="text-3xl font-black text-teal-700 tracking-tight">
                  ৳{profitStats.thisMonthProfit.toLocaleString('en-BD')}
                </p>
                <p className="text-[11px] text-teal-700 font-semibold mt-1">
                  Current calendar month inflow
                </p>
              </div>
            </div>

            {/* Top Profit Origin */}
            <div className="bg-linear-to-br from-amber-50 via-white to-amber-50/40 p-5 rounded-3xl border border-amber-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Top Income Origin
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <p className="text-base font-black text-amber-950 truncate" title={profitStats.topSource}>
                  {profitStats.topSource}
                </p>
                <p className="text-xs text-amber-800 font-bold mt-1">
                  ৳{profitStats.topSourceAmount.toLocaleString('en-BD')} total contributed
                </p>
              </div>
            </div>

            {/* Direct Entry Shortcut */}
            <div className="bg-linear-to-br from-indigo-900 via-slate-900 to-slate-950 p-5 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">
                  Add Extra Income
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Cashback, supplier rebate, carton resale, affiliate, or rewards.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddProfitModal}
                className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Profit Entry</span>
              </button>
            </div>
          </div>



          {/* Filters & Search Toolbar for Others Profit */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by profit title, source origin (e.g. Steadfast, Xiaomi), side note, staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-hidden transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* 2 Filters in a single line on mobile (grid-cols-2) and flex on desktop */}
              <div className="grid grid-cols-2 md:flex items-center gap-2 md:gap-3 w-full md:w-auto">
                <div className="min-w-0">
                  <select
                    value={selectedProfitSource}
                    onChange={(e) => setSelectedProfitSource(e.target.value)}
                    className="w-full py-2 px-2 md:px-3 text-[11px] md:text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-hidden text-slate-800 font-medium truncate"
                  >
                    <option value="all">All Profit Categories ({cleanOtherProfits.length})</option>
                    {Object.entries(OTHER_PROFIT_SOURCE_CONFIG).map(([key, cfg]) => {
                      const count = cleanOtherProfits.filter((p) => p.sourceCategory === key).length;
                      return (
                        <option key={key} value={key}>
                          {cfg.label} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="min-w-0">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full py-2 px-2 md:px-3 text-[11px] md:text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-hidden text-slate-800 font-medium truncate"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Others Profit Entries Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Showing {filteredProfits.length} of {cleanOtherProfits.length} Profit Records
                </span>
                {selectedProfitSource !== 'all' && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    Filtered: {OTHER_PROFIT_SOURCE_CONFIG[selectedProfitSource]?.label || selectedProfitSource}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-700">
                Total Extra Profit: <strong className="text-emerald-700 font-black text-sm">৳{filteredProfits.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-BD')}</strong>
              </span>
            </div>

            {filteredProfits.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-2xs">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Others Profit Records Found</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No extra profit records match your criteria. Add courier cashbacks, supplier rebates, scrap carton sales, or affiliate payouts.
                </p>
                <button
                  type="button"
                  onClick={openAddProfitModal}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Others Profit</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card View (< md) */}
                <div className="space-y-3 p-3 md:hidden">
                  {filteredProfits.map((profit) => {
                    const srcCfg =
                      OTHER_PROFIT_SOURCE_CONFIG[profit.sourceCategory] ||
                      OTHER_PROFIT_SOURCE_CONFIG.other_income;
                    const IconComp = srcCfg.icon;

                    return (
                      <div key={profit.id} className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-2xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${srcCfg.bg} ${srcCfg.color}`}>
                              <IconComp className="w-3 h-3" />
                              {srcCfg.label}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-1.5 leading-tight">{profit.title}</h4>
                          </div>
                          <span className="text-base font-black text-emerald-700 shrink-0">
                            +৳{profit.amount.toLocaleString('en-BD')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{profit.date || profit.createdAt?.split('T')[0]}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{profit.id}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                          <div className="text-[11px]">
                            <span className="text-slate-400">Origin: </span>
                            <strong className="text-slate-800">{profit.sourceOrigin}</strong>
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => setSelectedProfitDetail(profit)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 bg-slate-50 border border-slate-200 cursor-pointer"
                              title="View Details"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditProfitModal(profit)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 bg-slate-50 border border-slate-200 cursor-pointer"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {profit.sideNote && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSideNoteModalData({
                                  title: profit.title,
                                  type: 'Others Profit',
                                  categoryOrSource: srcCfg.label,
                                  date: profit.date || profit.createdAt?.split('T')[0] || '',
                                  amount: profit.amount,
                                  note: profit.sideNote || '',
                                })
                              }
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <Tag className="w-3.5 h-3.5 text-amber-600" />
                              <span>📝 View Side Note</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table View (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-3.5 px-4">Date &amp; ID</th>
                        <th className="py-3.5 px-4">Profit Title &amp; Source</th>
                        <th className="py-3.5 px-4">Source Origin</th>
                        <th className="py-3.5 px-4">Side Note</th>
                        <th className="py-3.5 px-4 text-right">Profit Amount (৳)</th>
                        <th className="py-3.5 px-4">Payment Method</th>
                        <th className="py-3.5 px-4">Received By</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredProfits.map((profit) => {
                        const srcCfg =
                          OTHER_PROFIT_SOURCE_CONFIG[profit.sourceCategory] ||
                          OTHER_PROFIT_SOURCE_CONFIG.other_income;
                        const IconComp = srcCfg.icon;

                        return (
                          <tr key={profit.id} className="hover:bg-emerald-50/30 transition-colors">
                            {/* Date & ID */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{profit.date || profit.createdAt?.split('T')[0]}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{profit.id}</span>
                            </td>

                            {/* Title & Category Badge */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-black text-slate-900 leading-tight">{profit.title}</div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${srcCfg.bg} ${srcCfg.color}`}
                                >
                                  <IconComp className="w-3 h-3" />
                                  {srcCfg.label}
                                </span>
                              </div>
                            </td>

                            {/* Source Origin */}
                            <td className="py-3.5 px-4 max-w-[200px]">
                              <div className="flex items-start gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-slate-800 text-xs block">
                                    {profit.sourceOrigin}
                                  </span>
                                  <span className="text-[10px] text-slate-400">Direct Profit Source</span>
                                </div>
                              </div>
                            </td>

                            {/* Side Note - Popup Button */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {profit.sideNote ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSideNoteModalData({
                                      title: profit.title,
                                      type: 'Others Profit',
                                      categoryOrSource: srcCfg.label,
                                      date: profit.date || profit.createdAt?.split('T')[0] || '',
                                      amount: profit.amount,
                                      note: profit.sideNote || '',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                                >
                                  <Tag className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                                  <span>📝 View Side Note</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">No side note</span>
                              )}
                            </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <span className="text-base font-black text-emerald-700">
                              +৳{profit.amount.toLocaleString('en-BD')}
                            </span>
                          </td>

                          {/* Payment Method */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              <span>{profit.paymentMethod || 'bKash Merchant'}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-semibold">Credited to Account</span>
                          </td>

                          {/* Received By */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">{profit.receivedBy}</div>
                            <span className="text-[10px] text-slate-400">{profit.receivedByRole || 'Admin'}</span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedProfitDetail(profit)}
                                title="View Details & History"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditProfitModal(profit)}
                                title="Edit Profit Record"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    onDeleteOtherProfit &&
                                    window.confirm(
                                      `Are you sure you want to permanently delete profit record "${profit.title}" (৳${profit.amount})?`
                                    )
                                  ) {
                                    onDeleteOtherProfit(profit.id);
                                  }
                                }}
                                title="Delete Profit Record"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

          {/* ========================================================================= */}
          {/* DEDICATED ACTIVITY LOGS & AUDIT TRAIL AT THE BOTTOM */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <History className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Others Profit &amp; Cost Activity Log
                  </h3>
                  <p className="hidden sm:block text-xs text-slate-500">
                    Complete audit trail of all staff profit entries, expense updates, origin details, and side notes.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {profitActivityLogs.length} Logged Events
              </span>
            </div>

            {profitActivityLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recent activity logs found. All future profit entries and edits will automatically record here.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {profitActivityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900">{log.action}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {log.staffName} ({log.staffRole})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{log.targetId}</span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{log.details}</p>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span className="text-[11px] text-slate-500 font-semibold block">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-BD') : 'Just now'}
                      </span>
                      {log.ipAddress && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROFIT VS EXPENSE SUMMARY & NET FINANCIAL LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Total Inflow (Others Profit) */}
            <div className="bg-linear-to-br from-emerald-500 to-teal-700 p-6 rounded-3xl text-white shadow-md">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                + Extra Inflow (Others Profit)
              </span>
              <h3 className="text-3xl font-black mt-2">
                +৳{profitStats.totalProfit.toLocaleString('en-BD')}
              </h3>
              <p className="text-xs text-emerald-100 mt-1.5">
                From {profitStats.count} non-order income streams
              </p>
            </div>

            {/* Total Outflow (Operational Expenses) */}
            <div className="bg-linear-to-br from-rose-500 to-rose-700 p-6 rounded-3xl text-white shadow-md">
              <span className="text-xs font-black uppercase tracking-wider text-rose-200">
                - Operational Expenses
              </span>
              <h3 className="text-3xl font-black mt-2">
                -৳{expenseStats.totalAll.toLocaleString('en-BD')}
              </h3>
              <p className="text-xs text-rose-100 mt-1.5">
                From {expenses.length} recorded cost receipts
              </p>
            </div>

            {/* Net Balance */}
            <div
              className={`p-6 rounded-3xl text-white shadow-md ${
                profitStats.totalProfit - expenseStats.totalAll >= 0
                  ? 'bg-linear-to-br from-sky-600 to-indigo-800'
                  : 'bg-linear-to-br from-amber-600 to-rose-800'
              }`}
            >
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Net Extra Operational Balance
              </span>
              <h3 className="text-3xl font-black mt-2">
                {profitStats.totalProfit - expenseStats.totalAll >= 0 ? '+' : ''}৳
                {(profitStats.totalProfit - expenseStats.totalAll).toLocaleString('en-BD')}
              </h3>
              <p className="text-xs text-slate-200 mt-1.5">
                Others Profit minus Operational Costs
              </p>
            </div>
          </div>

          {/* Source Breakdown vs Expense Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Others Profit Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Others Profit Sources Distribution</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(OTHER_PROFIT_SOURCE_CONFIG).map(([key, cfg]) => {
                  const items = cleanOtherProfits.filter((p) => p.sourceCategory === key);
                  const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
                  const percent = profitStats.totalProfit > 0 ? Math.round((sum / profitStats.totalProfit) * 100) : 0;
                  const IconComp = cfg.icon;

                  if (sum === 0) return null;

                  return (
                    <div key={key} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{cfg.label}</div>
                          <span className="text-[10px] text-slate-500">{items.length} records • {percent}% of profit</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-700">+৳{sum.toLocaleString('en-BD')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses Category Breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Operational Expenses Category Distribution</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                  const items = expenses.filter((e) => e.category === key);
                  const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
                  const percent = expenseStats.totalAll > 0 ? Math.round((sum / expenseStats.totalAll) * 100) : 0;
                  const IconComp = cfg.icon;

                  if (sum === 0) return null;

                  return (
                    <div key={key} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center shrink-0`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{cfg.label}</div>
                          <span className="text-[10px] text-slate-500">{items.length} records • {percent}% of expense</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-700">-৳{sum.toLocaleString('en-BD')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT OTHERS PROFIT */}
      {/* ========================================================================= */}
      {isProfitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingProfit ? 'Edit Others Profit Entry' : 'Add Others Profit Entry'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Saves to Firestore DB with activity logs &amp; side notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfitModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProfit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {profitFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profitFormError}</span>
                </div>
              )}

              {/* Profit Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Profit Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steadfast Courier Monthly Volume Cashback / Xiaomi Bulk Rebate"
                  value={profitFormData.title}
                  onChange={(e) => setProfitFormData({ ...profitFormData, title: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-semibold text-slate-800"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Profit Amount (৳ BDT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-black">৳</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={profitFormData.amount}
                      onChange={(e) => setProfitFormData({ ...profitFormData, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-black text-emerald-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    required
                    value={profitFormData.date}
                    onChange={(e) => setProfitFormData({ ...profitFormData, date: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Source Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Profit Source Category *
                </label>
                <select
                  value={profitFormData.sourceCategory}
                  onChange={(e) => setProfitFormData({ ...profitFormData, sourceCategory: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold text-slate-800"
                >
                  {Object.entries(OTHER_PROFIT_SOURCE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Origin (Where it came from) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Where it came from / Source Origin (Organization / Individual) *
                </label>
                <input
                  type="text"
                  required
                  list="sourceOriginPresets"
                  placeholder="e.g. Steadfast Courier Ltd / Xiaomi Official Importer / YouTube Affiliate"
                  value={profitFormData.sourceOrigin}
                  onChange={(e) => setProfitFormData({ ...profitFormData, sourceOrigin: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-semibold text-slate-800"
                />
                <datalist id="sourceOriginPresets">
                  {SOURCE_ORIGIN_PRESETS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              {/* Source History / Background */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Source Origin History &amp; Background
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe why and how this profit was earned (e.g. Received 2.5% volume rebate for dispatching 150+ parcels on time in January)..."
                  value={profitFormData.sourceHistory}
                  onChange={(e) => setProfitFormData({ ...profitFormData, sourceHistory: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs text-slate-800 resize-none"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Payment Method Received Via *
                </label>
                <select
                  value={profitFormData.paymentMethod}
                  onChange={(e) => setProfitFormData({ ...profitFormData, paymentMethod: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs font-bold text-slate-800"
                >
                  <option value="bKash Merchant">bKash Merchant Account</option>
                  <option value="bKash Personal">bKash Personal</option>
                  <option value="Nagad">Nagad Wallet</option>
                  <option value="Rocket">Rocket (DBBL)</option>
                  <option value="Bank Transfer">Bank Transfer (Current Account)</option>
                  <option value="Cash">Cash (Petty Cash Drawer)</option>
                  <option value="Card">Debit / Credit Card</option>
                </select>
              </div>

              {/* Side Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Side Note / Special Instructions</span>
                  <span className="text-[10px] text-amber-700 font-semibold">Special remarks</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Write side notes, voucher numbers, TrxID, or specific reference instructions (e.g. TrxID: BK92842X. Deposited into official business petty drawer)..."
                  value={profitFormData.sideNote}
                  onChange={(e) => setProfitFormData({ ...profitFormData, sideNote: e.target.value })}
                  className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/40 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs text-slate-800 resize-none"
                />
              </div>

              {/* Staff Logger Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  Recording as:{' '}
                  <strong className="text-slate-900">
                    {currentStaff?.name || (currentRole === 'super_admin' ? 'Sadik Rahman (Super Admin)' : 'Staff User')}
                  </strong>
                </span>
                <span className="text-slate-400">{profitFormData.date}</span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProfitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {editingProfit ? 'Save Profit Changes' : 'Save Others Profit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    {editingExpense ? 'Edit Expense Record' : 'Record New Expense / Cost'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Saves to Cloud Firestore and writes to permanent Activity Logs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 overflow-y-auto space-y-4 text-xs">
              {expenseFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{expenseFormError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Expense Category *</label>
                <select
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value as ExpenseCategory })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs font-semibold text-slate-800"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steadfast Courier Delivery Fee for Batch #15"
                  value={expenseFormData.title}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Cost Amount (৳ BDT) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs font-black text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseFormData.date}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Courier / Vendor</label>
                  <input
                    type="text"
                    list="courierPresetsExpense"
                    placeholder="e.g. Steadfast Courier"
                    value={expenseFormData.courier}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, courier: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                  <datalist id="courierPresetsExpense">
                    {COURIER_PRESETS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Location / Hub</label>
                  <input
                    type="text"
                    placeholder="e.g. Inside Dhaka - Dhanmondi"
                    value={expenseFormData.location}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, location: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Linked Order ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-1002"
                    value={expenseFormData.orderId}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, orderId: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Payment Method</label>
                  <select
                    value={expenseFormData.paymentMethod}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800 font-semibold"
                  >
                    <option value="Cash">Cash on Delivery / Cash</option>
                    <option value="bKash Merchant">bKash Merchant</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Side Note / Remarks / Voucher Breakdown
                </label>
                <textarea
                  rows={3}
                  placeholder="Write full details, voucher memo numbers, parcel counts, or specific instructions for this cost..."
                  value={expenseFormData.note}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, note: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
                <span>
                  Logging as:{' '}
                  <strong className="text-slate-900">
                    {currentStaff?.name || (currentRole === 'super_admin' ? 'Sadik (Super Admin)' : 'Admin Staff')}
                  </strong>
                </span>
                <span className="text-slate-400">{expenseFormData.date}</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-sm shadow-rose-600/30 transition-all cursor-pointer"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW FULL DETAILS & ORIGIN HISTORY OF OTHERS PROFIT */}
      {/* ========================================================================= */}
      {selectedProfitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 bg-linear-to-r from-emerald-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Profit Details &amp; History</h3>
                  <span className="text-[10px] text-emerald-300 font-mono">{selectedProfitDetail.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProfitDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 block">Total Profit Amount</span>
                  <p className="text-2xl font-black text-emerald-700 mt-0.5">
                    ৳{selectedProfitDetail.amount.toLocaleString('en-BD')}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-950">
                  {selectedProfitDetail.paymentMethod || 'bKash'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Title &amp; Category
                </span>
                <p className="font-black text-slate-900 text-sm mt-0.5">{selectedProfitDetail.title}</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  {OTHER_PROFIT_SOURCE_CONFIG[selectedProfitDetail.sourceCategory]?.label || selectedProfitDetail.sourceCategory}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-600 block flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Source Origin:
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">{selectedProfitDetail.sourceOrigin}</p>
              </div>

              {selectedProfitDetail.sourceHistory && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    📜 Origin History &amp; Breakdown:
                  </span>
                  <p className="text-slate-700 text-xs mt-1 leading-relaxed">{selectedProfitDetail.sourceHistory}</p>
                </div>
              )}

              {selectedProfitDetail.sideNote && (
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-900 block flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    Side Note:
                  </span>
                  <p className="text-amber-950 text-xs mt-1 leading-relaxed font-medium">
                    {selectedProfitDetail.sideNote}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Recorded By: <strong className="text-slate-800">{selectedProfitDetail.receivedBy}</strong></span>
                <span>Date: {selectedProfitDetail.date}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProfitDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW DEDICATED SIDE NOTE POPUP */}
      {/* ========================================================================= */}
      {sideNoteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-amber-200/80 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-linear-to-r from-amber-950 via-slate-900 to-amber-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                    <span>Side Note Memo</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/30 text-amber-200 font-bold border border-amber-400/30">
                      {sideNoteModalData.type}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 truncate max-w-[220px]">
                    {sideNoteModalData.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSideNoteModalData(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Category / Source
                  </span>
                  <span className="font-bold text-slate-800 text-xs">
                    {sideNoteModalData.categoryOrSource}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Amount & Date
                  </span>
                  <span className="font-black text-slate-900 text-xs">
                    ৳{sideNoteModalData.amount.toLocaleString('en-BD')} • {sideNoteModalData.date}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center justify-between border-b border-amber-200/70 pb-2">
                  <span className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Full Side Note Details
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(sideNoteModalData.note, 'side-note-modal')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/60 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    {copiedId === 'side-note-modal' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs leading-relaxed text-amber-950 whitespace-pre-wrap font-medium">
                  {sideNoteModalData.note}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSideNoteModalData(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                Close Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
