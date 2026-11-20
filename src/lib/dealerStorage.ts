import type {
  Dealer,
  DealerTransaction,
  DealerPayment,
  DealerDocument,
  DealerReturnAdjustment,
  DealerActivityLog,
  DealerOverviewStats,
} from '../types/dealer';
import { safeSetLocalStorage } from './storage';

const DEALERS_STORAGE_KEY = 'kenax_dealers_data_v1';
const DEALER_TXNS_STORAGE_KEY = 'kenax_dealer_transactions_v1';
const DEALER_PAYMENTS_STORAGE_KEY = 'kenax_dealer_payments_v1';
const DEALER_DOCS_STORAGE_KEY = 'kenax_dealer_documents_v1';
const DEALER_RETURNS_STORAGE_KEY = 'kenax_dealer_returns_v1';
const DEALER_LOGS_STORAGE_KEY = 'kenax_dealer_logs_v1';

// Seed Initial Official Bangladesh Tech / Hardware Dealers for KenaX BD
const INITIAL_DEALERS: Dealer[] = [
  {
    id: 'DLR-1001',
    name: 'Md. Shafiqul Islam',
    shopName: 'Dhaka Tech Distribution & Importers',
    primaryPhone: '01711223344',
    alternativePhone: '01819887766',
    email: 'shafiq@dhakatechdist.com',
    businessAddress: 'Suit #402, Multiplan Center, Elephant Road, Dhaka-1205',
    district: 'Dhaka',
    area: 'New Elephant Road',
    businessType: 'importer',
    contactPerson: 'Md. Shafiqul Islam (Managing Director)',
    category: 'VIP',
    status: 'active',
    paymentTerms: 'credit_15',
    creditLimit: 500000,
    openingBalance: 0,
    openingBalanceType: 'payable',
    tradeLicenseNumber: 'TRAD/DSCC/019283/2024',
    binOrVatNumber: '001928374-0102',
    bankAccountDetails: {
      bankName: 'City Bank PLC',
      branchName: 'Elephant Road Branch',
      accountName: 'Dhaka Tech Distribution',
      accountNumber: '1102938481001',
      routingNumber: '225261928',
    },
    mfsDetails: {
      bkash: '01711223344',
      nagad: '01819887766',
    },
    notes: 'Primary importer of official smartwatches, mechanical keyboards, and audio gadgets.',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'DLR-1002',
    name: 'Engr. Tanvir Ahmed',
    shopName: 'Smart Gadget Hub Bangladesh',
    primaryPhone: '01912345678',
    alternativePhone: '01700998877',
    email: 'sales@smartgadgethubbd.com',
    businessAddress: 'Shop 24, Level 5, BCS Computer City (IDB Bhaban), Agargaon, Dhaka',
    district: 'Dhaka',
    area: 'Agargaon',
    businessType: 'wholesale',
    contactPerson: 'Kabir Hossain (Wholesale Manager)',
    category: 'Priority',
    status: 'active',
    paymentTerms: 'credit_7',
    creditLimit: 300000,
    openingBalance: 0,
    openingBalanceType: 'payable',
    tradeLicenseNumber: 'TRAD/DNCC/098762/2024',
    bankAccountDetails: {
      bankName: 'BRAC Bank PLC',
      branchName: 'Rokeya Sarani Branch',
      accountName: 'Smart Gadget Hub',
      accountNumber: '1501204928172001',
    },
    mfsDetails: {
      bkash: '01912345678',
    },
    notes: 'Wholesale supplier for gaming headsets, GaN fast chargers, and MagSafe accessories.',
    createdAt: '2026-02-01T11:30:00Z',
    updatedAt: '2026-02-01T11:30:00Z',
  },
  {
    id: 'DLR-1003',
    name: 'Al-Haj Rafiqul Alam',
    shopName: 'Chittagong Port Electronics Syndicate',
    primaryPhone: '01819556677',
    email: 'rafiqul@ctgportelectronics.com',
    businessAddress: '78 Agrabad Commercial Area, Chittagong-4100',
    district: 'Chittagong',
    area: 'Agrabad C/A',
    businessType: 'exclusive_distributor',
    category: 'Wholesale',
    status: 'active',
    paymentTerms: 'cod',
    creditLimit: 200000,
    notes: 'Direct bulk import consignments through Chittagong seaport.',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-15T09:00:00Z',
  },
];

// Helper to safely read from localStorage / memory
function getStoredJson<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

// ----------------------------------------------------
// 1. DEALER DIRECTORY MANAGEMENT
// ----------------------------------------------------

export function getDealers(): Dealer[] {
  return getStoredJson<Dealer[]>(DEALERS_STORAGE_KEY, INITIAL_DEALERS);
}

export function saveDealers(dealers: Dealer[]): void {
  safeSetLocalStorage(DEALERS_STORAGE_KEY, JSON.stringify(dealers));
}

export function getDealerById(dealerId: string): Dealer | undefined {
  const all = getDealers();
  return all.find((d) => d.id === dealerId);
}

export function addDealer(dealer: Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>, userName = 'Admin'): Dealer {
  const all = getDealers();
  // Auto-generate next incremental ID
  const numericIds = all
    .map((d) => {
      const match = d.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1001;
  const newId = `DLR-${nextNum}`;

  const now = new Date().toISOString();
  const newDealer: Dealer = {
    ...dealer,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newDealer, ...all];
  saveDealers(updated);

  addDealerActivityLog({
    dealerId: newId,
    dealerName: newDealer.shopName || newDealer.name,
    category: 'dealer',
    action: 'Created Dealer Record',
    details: `Added new dealer "${newDealer.shopName}" (${newDealer.name}, Phone: ${newDealer.primaryPhone}) with ${newDealer.paymentTerms} terms.`,
    userName,
  });

  return newDealer;
}

export function updateDealer(id: string, updates: Partial<Dealer>, userName = 'Admin'): Dealer | null {
  const all = getDealers();
  const index = all.findIndex((d) => d.id === id);
  if (index === -1) return null;

  const updatedDealer: Dealer = {
    ...all[index],
    ...updates,
    id, // protect immutable ID
    updatedAt: new Date().toISOString(),
  };

  all[index] = updatedDealer;
  saveDealers(all);

  addDealerActivityLog({
    dealerId: id,
    dealerName: updatedDealer.shopName || updatedDealer.name,
    category: 'dealer',
    action: 'Updated Dealer Profile',
    details: `Updated information for dealer "${updatedDealer.shopName}". Status: ${updatedDealer.status}.`,
    userName,
  });

  return updatedDealer;
}

export function archiveDealer(id: string, userName = 'Admin'): boolean {
  return Boolean(updateDealer(id, { status: 'archived' }, userName));
}

export function unarchiveDealer(id: string, userName = 'Admin'): boolean {
  return Boolean(updateDealer(id, { status: 'active' }, userName));
}

// ----------------------------------------------------
// 2. TRANSACTIONS MANAGEMENT
// ----------------------------------------------------

export function getDealerTransactions(): DealerTransaction[] {
  return getStoredJson<DealerTransaction[]>(DEALER_TXNS_STORAGE_KEY, []);
}

export function saveDealerTransactions(txns: DealerTransaction[]): void {
  safeSetLocalStorage(DEALER_TXNS_STORAGE_KEY, JSON.stringify(txns));
}

export function getTransactionsByDealer(dealerId: string): DealerTransaction[] {
  const all = getDealerTransactions();
  return all
    .filter((t) => t.dealerId === dealerId)
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}

export function addDealerTransaction(
  txn: Omit<DealerTransaction, 'id' | 'createdAt' | 'updatedAt'>,
  userName = 'Admin'
): DealerTransaction {
  const all = getDealerTransactions();
  const year = new Date().getFullYear();
  const count = all.length + 1;
  const newId = `TXN-${year}-${String(count).padStart(3, '0')}`;

  const dealer = getDealerById(txn.dealerId);
  const now = new Date().toISOString();

  // Automatic calculation checks
  const subtotal = txn.items.reduce((sum, item) => sum + (Number(item.lineTotal) || (item.quantity * item.unitPrice)), 0);
  const discount = Number(txn.discount) || 0;
  const transportCharge = Number(txn.transportCharge) || 0;
  const otherCharges = Number(txn.otherCharges) || 0;
  const totalAmount = Math.max(0, subtotal - discount + transportCharge + otherCharges);
  const amountPaid = Number(txn.amountPaid) || 0;
  const remainingAmount = Math.max(0, totalAmount - amountPaid);

  let status = txn.status;
  if (remainingAmount === 0 && totalAmount > 0) {
    status = 'completed';
  } else if (amountPaid > 0 && remainingAmount > 0) {
    status = 'partially_paid';
  } else if (remainingAmount > 0) {
    status = 'pending';
  }

  const newTxn: DealerTransaction = {
    ...txn,
    id: newId,
    dealerName: dealer?.name || txn.dealerName,
    dealerShopName: dealer?.shopName || txn.dealerShopName,
    subtotal,
    discount,
    transportCharge,
    otherCharges,
    totalAmount,
    amountPaid,
    remainingAmount,
    status,
    createdBy: userName,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newTxn, ...all];
  saveDealerTransactions(updated);

  addDealerActivityLog({
    dealerId: txn.dealerId,
    dealerName: dealer?.shopName || dealer?.name,
    category: 'transaction',
    action: `Created ${txn.transactionType.toUpperCase()} Record`,
    details: `Recorded #${newId} with ${txn.items.length} items. Total: ৳${totalAmount.toLocaleString('en-IN')}, Paid: ৳${amountPaid.toLocaleString('en-IN')}, Remaining: ৳${remainingAmount.toLocaleString('en-IN')}.`,
    userName,
  });

  return newTxn;
}

export function updateDealerTransaction(
  id: string,
  updates: Partial<DealerTransaction>,
  userName = 'Admin'
): DealerTransaction | null {
  const all = getDealerTransactions();
  const index = all.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const current = all[index];
  const items = updates.items || current.items;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || (item.quantity * item.unitPrice)), 0);
  const discount = updates.discount !== undefined ? Number(updates.discount) : current.discount;
  const transportCharge = updates.transportCharge !== undefined ? Number(updates.transportCharge) : current.transportCharge;
  const otherCharges = updates.otherCharges !== undefined ? Number(updates.otherCharges) : current.otherCharges;
  const totalAmount = Math.max(0, subtotal - discount + transportCharge + otherCharges);
  const amountPaid = updates.amountPaid !== undefined ? Number(updates.amountPaid) : current.amountPaid;
  const remainingAmount = Math.max(0, totalAmount - amountPaid);

  const updatedTxn: DealerTransaction = {
    ...current,
    ...updates,
    id,
    subtotal,
    discount,
    transportCharge,
    otherCharges,
    totalAmount,
    amountPaid,
    remainingAmount,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updatedTxn;
  saveDealerTransactions(all);

  addDealerActivityLog({
    dealerId: updatedTxn.dealerId,
    dealerName: updatedTxn.dealerShopName || updatedTxn.dealerName,
    category: 'transaction',
    action: 'Updated Transaction Record',
    details: `Updated #${id}. Total: ৳${totalAmount.toLocaleString('en-IN')}, Remaining: ৳${remainingAmount.toLocaleString('en-IN')}.`,
    userName,
  });

  return updatedTxn;
}

// ----------------------------------------------------
// 3. PAYMENTS MANAGEMENT & ALLOCATION
// ----------------------------------------------------

export function getDealerPayments(): DealerPayment[] {
  return getStoredJson<DealerPayment[]>(DEALER_PAYMENTS_STORAGE_KEY, []);
}

export function saveDealerPayments(payments: DealerPayment[]): void {
  safeSetLocalStorage(DEALER_PAYMENTS_STORAGE_KEY, JSON.stringify(payments));
}

export function getPaymentsByDealer(dealerId: string): DealerPayment[] {
  const all = getDealerPayments();
  return all
    .filter((p) => p.dealerId === dealerId)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
}

export function recordDealerPayment(
  payment: Omit<DealerPayment, 'id' | 'createdAt'>,
  userName = 'Admin'
): DealerPayment {
  const all = getDealerPayments();
  const year = new Date().getFullYear();
  const count = all.length + 1;
  const newId = `PAY-${year}-${String(count).padStart(3, '0')}`;

  const dealer = getDealerById(payment.dealerId);
  const now = new Date().toISOString();

  const newPayment: DealerPayment = {
    ...payment,
    id: newId,
    dealerName: dealer?.name || payment.dealerName,
    dealerShopName: dealer?.shopName || payment.dealerShopName,
    recordedBy: userName,
    createdAt: now,
  };

  const updated = [newPayment, ...all];
  saveDealerPayments(updated);

  // If allocated to a specific transaction, automatically update its paid & remaining amounts
  if (payment.relatedTransactionId && payment.verificationStatus !== 'reversed') {
    const txns = getDealerTransactions();
    const txnIndex = txns.findIndex((t) => t.id === payment.relatedTransactionId);
    if (txnIndex !== -1) {
      const target = txns[txnIndex];
      const newPaid = target.amountPaid + Number(payment.amount);
      const newRemaining = Math.max(0, target.totalAmount - newPaid);
      const newStatus = newRemaining === 0 ? 'completed' : newPaid > 0 ? 'partially_paid' : target.status;

      txns[txnIndex] = {
        ...target,
        amountPaid: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: now,
      };
      saveDealerTransactions(txns);
    }
  }

  addDealerActivityLog({
    dealerId: payment.dealerId,
    dealerName: dealer?.shopName || dealer?.name,
    category: 'payment',
    action: `Recorded Payment (${payment.paymentDirection === 'paid_to_dealer' ? 'Paid to Dealer' : 'Received'})`,
    details: `Processed payment #${newId} of ৳${payment.amount.toLocaleString('en-IN')} via ${payment.paymentMethod}. Ref: ${payment.transactionReference || 'N/A'}.`,
    userName,
  });

  return newPayment;
}

export function reverseDealerPayment(
  paymentId: string,
  reason: string,
  userName = 'Admin'
): boolean {
  const all = getDealerPayments();
  const index = all.findIndex((p) => p.id === paymentId);
  if (index === -1) return false;

  const current = all[index];
  if (current.verificationStatus === 'reversed') return false; // Already reversed

  const now = new Date().toISOString();
  all[index] = {
    ...current,
    verificationStatus: 'reversed',
    reversedAt: now,
    reversedBy: userName,
    reversalReason: reason,
  };
  saveDealerPayments(all);

  // Revert related transaction allocation if applicable
  if (current.relatedTransactionId) {
    const txns = getDealerTransactions();
    const txnIndex = txns.findIndex((t) => t.id === current.relatedTransactionId);
    if (txnIndex !== -1) {
      const target = txns[txnIndex];
      const newPaid = Math.max(0, target.amountPaid - Number(current.amount));
      const newRemaining = Math.max(0, target.totalAmount - newPaid);
      const newStatus = newRemaining === target.totalAmount ? 'pending' : newPaid > 0 ? 'partially_paid' : 'pending';

      txns[txnIndex] = {
        ...target,
        amountPaid: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        updatedAt: now,
      };
      saveDealerTransactions(txns);
    }
  }

  addDealerActivityLog({
    dealerId: current.dealerId,
    dealerName: current.dealerShopName || current.dealerName,
    category: 'payment',
    action: 'Reversed Payment Record',
    details: `Reversed payment #${paymentId} for ৳${current.amount.toLocaleString('en-IN')}. Reason: "${reason}".`,
    userName,
  });

  return true;
}

// ----------------------------------------------------
// 4. INVOICES & DOCUMENT MANAGEMENT
// ----------------------------------------------------

export function getDealerDocuments(): DealerDocument[] {
  return getStoredJson<DealerDocument[]>(DEALER_DOCS_STORAGE_KEY, []);
}

export function saveDealerDocuments(docs: DealerDocument[]): void {
  safeSetLocalStorage(DEALER_DOCS_STORAGE_KEY, JSON.stringify(docs));
}

export function getDocumentsByDealer(dealerId: string): DealerDocument[] {
  const all = getDealerDocuments();
  return all
    .filter((d) => d.dealerId === dealerId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function addDealerDocument(
  doc: Omit<DealerDocument, 'id' | 'uploadedAt'>,
  userName = 'Admin'
): DealerDocument {
  const all = getDealerDocuments();
  const year = new Date().getFullYear();
  const count = all.length + 1;
  const newId = `DOC-${year}-${String(count).padStart(3, '0')}`;

  const dealer = getDealerById(doc.dealerId);
  const now = new Date().toISOString();

  const newDoc: DealerDocument = {
    ...doc,
    id: newId,
    dealerName: dealer?.name || doc.dealerName,
    dealerShopName: dealer?.shopName || doc.dealerShopName,
    uploadedAt: now,
    uploadedBy: userName,
  };

  const updated = [newDoc, ...all];
  saveDealerDocuments(updated);

  addDealerActivityLog({
    dealerId: doc.dealerId,
    dealerName: dealer?.shopName || dealer?.name,
    category: 'invoice',
    action: `Uploaded ${doc.documentType.replace('_', ' ').toUpperCase()}`,
    details: `Attached document "${doc.title}" (${doc.fileName}, ${(doc.fileSize / 1024).toFixed(1)} KB). Invoice #: ${doc.invoiceNumber || 'N/A'}.`,
    userName,
  });

  return newDoc;
}

export function deleteDealerDocument(id: string, userName = 'Admin'): boolean {
  const all = getDealerDocuments();
  const target = all.find((d) => d.id === id);
  if (!target) return false;

  const filtered = all.filter((d) => d.id !== id);
  saveDealerDocuments(filtered);

  addDealerActivityLog({
    dealerId: target.dealerId,
    dealerName: target.dealerShopName || target.dealerName,
    category: 'invoice',
    action: 'Removed Document Attachment',
    details: `Deleted document #${id} ("${target.title}") from dealer archive.`,
    userName,
  });

  return true;
}

// ----------------------------------------------------
// 5. RETURNS & ADJUSTMENTS
// ----------------------------------------------------

export function getDealerReturns(): DealerReturnAdjustment[] {
  return getStoredJson<DealerReturnAdjustment[]>(DEALER_RETURNS_STORAGE_KEY, []);
}

export function saveDealerReturns(returns: DealerReturnAdjustment[]): void {
  safeSetLocalStorage(DEALER_RETURNS_STORAGE_KEY, JSON.stringify(returns));
}

export function getReturnsByDealer(dealerId: string): DealerReturnAdjustment[] {
  const all = getDealerReturns();
  return all
    .filter((r) => r.dealerId === dealerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function addDealerReturnAdjustment(
  adjustment: Omit<DealerReturnAdjustment, 'id' | 'createdAt'>,
  userName = 'Admin'
): DealerReturnAdjustment {
  const all = getDealerReturns();
  const year = new Date().getFullYear();
  const count = all.length + 1;
  const newId = `ADJ-${year}-${String(count).padStart(3, '0')}`;

  const dealer = getDealerById(adjustment.dealerId);
  const now = new Date().toISOString();

  const newAdj: DealerReturnAdjustment = {
    ...adjustment,
    id: newId,
    dealerName: dealer?.name || adjustment.dealerName,
    dealerShopName: dealer?.shopName || adjustment.dealerShopName,
    authorizedUser: userName,
    createdAt: now,
  };

  const updated = [newAdj, ...all];
  saveDealerReturns(updated);

  addDealerActivityLog({
    dealerId: adjustment.dealerId,
    dealerName: dealer?.shopName || dealer?.name,
    category: 'return',
    action: `Approved ${adjustment.adjustmentType.replace('_', ' ').toUpperCase()}`,
    details: `Adjustment #${newId} for ৳${adjustment.amount.toLocaleString('en-IN')}. Reason: "${adjustment.reason}".`,
    userName,
  });

  return newAdj;
}

// ----------------------------------------------------
// 6. ACTIVITY LOGS
// ----------------------------------------------------

export function getDealerActivityLogs(): DealerActivityLog[] {
  return getStoredJson<DealerActivityLog[]>(DEALER_LOGS_STORAGE_KEY, []);
}

export function addDealerActivityLog(
  log: Omit<DealerActivityLog, 'id' | 'timestamp'>
): DealerActivityLog {
  const all = getDealerActivityLogs();
  const newLog: DealerActivityLog = {
    ...log,
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...all].slice(0, 500); // retain last 500 logs
  safeSetLocalStorage(DEALER_LOGS_STORAGE_KEY, JSON.stringify(updated));
  return newLog;
}

// ----------------------------------------------------
// 7. AUTHORITATIVE FINANCIAL LEDGER & BALANCES
// ----------------------------------------------------

export interface DealerAccountBalance {
  dealerId: string;
  totalPurchases: number; // What we purchased from dealer
  totalSalesToDealer: number; // What we sold to dealer
  totalPaidToDealer: number; // What we paid dealer (Cash/MFS/Bank)
  totalReceivedFromDealer: number; // What dealer paid us
  totalReturnOutward: number; // Returns back to dealer (credit to us)
  totalReturnInward: number; // Returns from dealer
  creditAdjustments: number; // Rebates / discounts from dealer
  debitAdjustments: number; // Additional fees
  openingBalance: number;
  openingBalanceType: 'payable' | 'receivable';

  // Master Authoritative Balances:
  netOutstandingPayable: number; // Money KenaX BD owes to dealer
  netOutstandingReceivable: number; // Money Dealer owes to KenaX BD
  balanceStatus: 'we_owe_dealer' | 'dealer_owes_us' | 'settled';
  creditLimit: number;
  creditUtilizationPercent: number;
  overduePayableAmount: number;
  lastTransactionDate?: string;
  lastPaymentDate?: string;
}

export function calculateDealerBalance(dealerId: string): DealerAccountBalance {
  const dealer = getDealerById(dealerId);
  const txns = getTransactionsByDealer(dealerId);
  const payments = getPaymentsByDealer(dealerId).filter((p) => p.verificationStatus !== 'reversed');
  const returns = getReturnsByDealer(dealerId).filter((r) => r.approvalStatus === 'approved');

  let totalPurchases = 0;
  let totalSalesToDealer = 0;
  let overduePayableAmount = 0;
  const now = new Date();

  txns.forEach((t) => {
    if (t.transactionType === 'purchase') {
      totalPurchases += Number(t.totalAmount) || 0;
      if (t.remainingAmount > 0 && t.paymentDueDate && new Date(t.paymentDueDate) < now) {
        overduePayableAmount += Number(t.remainingAmount);
      }
    } else if (t.transactionType === 'sale_to_dealer') {
      totalSalesToDealer += Number(t.totalAmount) || 0;
    }
  });

  let totalPaidToDealer = 0;
  let totalReceivedFromDealer = 0;

  payments.forEach((p) => {
    if (p.paymentDirection === 'paid_to_dealer') {
      totalPaidToDealer += Number(p.amount) || 0;
    } else {
      totalReceivedFromDealer += Number(p.amount) || 0;
    }
  });

  let totalReturnOutward = 0;
  let totalReturnInward = 0;
  let creditAdjustments = 0;
  let debitAdjustments = 0;

  returns.forEach((r) => {
    if (r.adjustmentType === 'return' || r.adjustmentType === 'damage' || r.adjustmentType === 'short_delivery') {
      totalReturnOutward += Number(r.amount) || 0;
    } else if (r.adjustmentType === 'credit_note' || r.adjustmentType === 'approved_discount') {
      creditAdjustments += Number(r.amount) || 0;
    } else if (r.adjustmentType === 'debit_note' || r.adjustmentType === 'additional_charge') {
      debitAdjustments += Number(r.amount) || 0;
    }
  });

  const openingBal = Number(dealer?.openingBalance) || 0;
  const openingType = dealer?.openingBalanceType || 'payable';

  // Accounting formula:
  // Gross Payable = Total Purchases + (opening if payable) + debit adjustments
  // Total Deductions = Total Paid To Dealer + Return Outward + credit adjustments
  const grossPayable = totalPurchases + (openingType === 'payable' ? openingBal : 0) + debitAdjustments;
  const totalSettledPayable = totalPaidToDealer + totalReturnOutward + creditAdjustments;

  // Gross Receivable = Total Sales To Dealer + (opening if receivable)
  const grossReceivable = totalSalesToDealer + (openingType === 'receivable' ? openingBal : 0);
  const totalSettledReceivable = totalReceivedFromDealer + totalReturnInward;

  const rawPayable = grossPayable - totalSettledPayable;
  const rawReceivable = grossReceivable - totalSettledReceivable;

  let netOutstandingPayable = 0;
  let netOutstandingReceivable = 0;
  let balanceStatus: 'we_owe_dealer' | 'dealer_owes_us' | 'settled' = 'settled';

  if (rawPayable > rawReceivable) {
    netOutstandingPayable = Math.max(0, rawPayable - rawReceivable);
    balanceStatus = netOutstandingPayable > 0 ? 'we_owe_dealer' : 'settled';
  } else if (rawReceivable > rawPayable) {
    netOutstandingReceivable = Math.max(0, rawReceivable - rawPayable);
    balanceStatus = netOutstandingReceivable > 0 ? 'dealer_owes_us' : 'settled';
  }

  const creditLimit = Number(dealer?.creditLimit) || 0;
  const creditUtilizationPercent =
    creditLimit > 0 ? Math.min(100, Math.round((netOutstandingPayable / creditLimit) * 100)) : 0;

  const lastTxn = txns[0]?.transactionDate;
  const lastPay = payments[0]?.paymentDate;

  return {
    dealerId,
    totalPurchases,
    totalSalesToDealer,
    totalPaidToDealer,
    totalReceivedFromDealer,
    totalReturnOutward,
    totalReturnInward,
    creditAdjustments,
    debitAdjustments,
    openingBalance: openingBal,
    openingBalanceType: openingType,
    netOutstandingPayable,
    netOutstandingReceivable,
    balanceStatus,
    creditLimit,
    creditUtilizationPercent,
    overduePayableAmount,
    lastTransactionDate: lastTxn,
    lastPaymentDate: lastPay,
  };
}

export function calculateDealerOverviewStats(): DealerOverviewStats {
  const dealers = getDealers().filter((d) => d.status !== 'archived');
  const activeDealers = dealers.filter((d) => d.status === 'active');
  const txns = getDealerTransactions();
  const docs = getDealerDocuments();

  let totalPurchaseValue = 0;
  let totalPaidToDealers = 0;
  let totalOutstandingPayable = 0;
  let totalOutstandingReceivable = 0;
  let overduePayables = 0;
  let overdueReceivables = 0;

  dealers.forEach((d) => {
    const bal = calculateDealerBalance(d.id);
    totalPurchaseValue += bal.totalPurchases;
    totalPaidToDealers += bal.totalPaidToDealer;
    totalOutstandingPayable += bal.netOutstandingPayable;
    totalOutstandingReceivable += bal.netOutstandingReceivable;
    overduePayables += bal.overduePayableAmount;
  });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const transactionsThisMonth = txns.filter((t) => {
    const d = new Date(t.transactionDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const pendingPaymentsCount = txns.filter((t) => t.remainingAmount > 0).length;

  return {
    totalDealers: dealers.length,
    activeDealers: activeDealers.length,
    totalPurchaseValue,
    totalPaidToDealers,
    totalOutstandingPayable,
    totalOutstandingReceivable,
    transactionsThisMonth,
    pendingPaymentsCount,
    recentInvoicesCount: docs.length,
    overduePayables,
    overdueReceivables,
  };
}

// ----------------------------------------------------
// 8. PRINT & EXPORT GENERATOR UTILITIES
// ----------------------------------------------------

export function generateDealerStatementHtml(dealer: Dealer): string {
  const balance = calculateDealerBalance(dealer.id);
  const txns = getTransactionsByDealer(dealer.id);
  const payments = getPaymentsByDealer(dealer.id);
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dealer Statement - ${dealer.shopName || dealer.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
    .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .card-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 30px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">KenaX BD — Internal Dealer Ledger</div>
      <div class="sub">Official Confidential Bookkeeping & Account Statement</div>
    </div>
    <div style="text-align: right;">
      <span class="badge">${dealer.id}</span>
      <div class="sub" style="margin-top: 6px;">Generated: <strong>${now}</strong></div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Dealer / Business Account</div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${dealer.shopName || dealer.name}</div>
      <div>Contact Person: <strong>${dealer.name}</strong></div>
      <div>Primary Phone: <strong>${dealer.primaryPhone}</strong> ${dealer.alternativePhone ? `| Alt: ${dealer.alternativePhone}` : ''}</div>
      <div>Address: ${dealer.businessAddress || 'N/A'}, ${dealer.district || ''}</div>
    </div>
    <div>
      <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Payment Terms & Profile</div>
      <div>Terms: <strong style="text-transform: uppercase;">${dealer.paymentTerms.replace('_', ' ')}</strong></div>
      <div>Category: <strong>${dealer.category}</strong> | Type: <strong style="text-transform: capitalize;">${dealer.businessType}</strong></div>
      <div>Credit Limit: <strong>৳${(dealer.creditLimit || 0).toLocaleString('en-IN')}</strong></div>
      ${dealer.bankAccountDetails?.bankName ? `<div>Bank: ${dealer.bankAccountDetails.bankName} (${dealer.bankAccountDetails.accountNumber})</div>` : ''}
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Total Purchases</div>
      <div class="card-val">৳${balance.totalPurchases.toLocaleString('en-IN')}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Paid</div>
      <div class="card-val" style="color: #059669;">৳${balance.totalPaidToDealer.toLocaleString('en-IN')}</div>
    </div>
    <div class="card">
      <div class="card-label">Net Payable (We Owe)</div>
      <div class="card-val" style="color: ${balance.netOutstandingPayable > 0 ? '#dc2626' : '#0f172a'};">৳${balance.netOutstandingPayable.toLocaleString('en-IN')}</div>
    </div>
    <div class="card">
      <div class="card-label">Overdue Balance</div>
      <div class="card-val" style="color: ${balance.overduePayableAmount > 0 ? '#b91c1c' : '#64748b'};">৳${balance.overduePayableAmount.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 10px;">Transactions History</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Txn ID</th>
        <th>Type</th>
        <th>Items</th>
        <th class="text-right">Total (৳)</th>
        <th class="text-right">Paid (৳)</th>
        <th class="text-right">Due (৳)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${
        txns.length === 0
          ? '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 20px;">No transactions recorded.</td></tr>'
          : txns
              .map(
                (t) => `
        <tr>
          <td>${new Date(t.transactionDate).toLocaleDateString('en-GB')}</td>
          <td class="font-bold">${t.id}</td>
          <td style="text-transform: capitalize;">${t.transactionType.replace('_', ' ')}</td>
          <td>${t.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ') || 'N/A'}</td>
          <td class="text-right font-bold">৳${t.totalAmount.toLocaleString('en-IN')}</td>
          <td class="text-right" style="color: #059669;">৳${t.amountPaid.toLocaleString('en-IN')}</td>
          <td class="text-right" style="color: ${t.remainingAmount > 0 ? '#dc2626' : '#64748b'};">৳${t.remainingAmount.toLocaleString('en-IN')}</td>
          <td><span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${t.status}</span></td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <h3 style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 10px;">Payments History</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Payment ID</th>
        <th>Direction</th>
        <th>Method</th>
        <th>Reference #</th>
        <th class="text-right">Amount (৳)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${
        payments.length === 0
          ? '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No payments recorded.</td></tr>'
          : payments
              .map(
                (p) => `
        <tr>
          <td>${new Date(p.paymentDate).toLocaleDateString('en-GB')}</td>
          <td class="font-bold">${p.id}</td>
          <td>${p.paymentDirection === 'paid_to_dealer' ? 'Paid to Dealer' : 'Received from Dealer'}</td>
          <td>${p.paymentMethod}</td>
          <td>${p.transactionReference || 'N/A'}</td>
          <td class="text-right font-bold" style="color: #059669;">৳${p.amount.toLocaleString('en-IN')}</td>
          <td><span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">${p.verificationStatus}</span></td>
        </tr>`
              )
              .join('')
      }
    </tbody>
  </table>

  <div class="footer">
    KenaX BD Internal Accounting &amp; Dealer Management System &bull; Confidential &bull; Generated by Authorized Staff
  </div>

  <div class="no-print" style="margin-top: 24px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 24px; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">
      Print or Save PDF
    </button>
  </div>
</body>
</html>
  `;
}

export function exportDealerTransactionsCsv(dealerId?: string): void {
  const txns = dealerId ? getTransactionsByDealer(dealerId) : getDealerTransactions();
  if (txns.length === 0) {
    alert('No transactions found to export.');
    return;
  }

  const headers = [
    'Transaction ID',
    'Dealer ID',
    'Dealer Name',
    'Date',
    'Type',
    'Bill Ref',
    'Subtotal (BDT)',
    'Discount (BDT)',
    'Transport (BDT)',
    'Total (BDT)',
    'Paid (BDT)',
    'Due (BDT)',
    'Status',
    'Items Summary',
  ];

  const rows = txns.map((t) => [
    `"${t.id}"`,
    `"${t.dealerId}"`,
    `"${(t.dealerShopName || t.dealerName || '').replace(/"/g, '""')}"`,
    `"${t.transactionDate}"`,
    `"${t.transactionType}"`,
    `"${t.referenceNumber || ''}"`,
    t.subtotal,
    t.discount,
    t.transportCharge,
    t.totalAmount,
    t.amountPaid,
    t.remainingAmount,
    `"${t.status}"`,
    `"${t.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join('; ').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Dealer_Transactions_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
