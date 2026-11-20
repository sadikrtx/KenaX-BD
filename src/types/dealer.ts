/**
 * KenaX BD — Internal Dealer Management System Types
 * Exclusively for authorized internal admin/staff bookkeeping, purchasing, invoicing & payments
 */

export type DealerBusinessType =
  | 'wholesale'
  | 'retail_distribution'
  | 'corporate'
  | 'importer'
  | 'manufacturer'
  | 'exclusive_distributor'
  | 'other';

export type DealerCategory = 'General' | 'VIP' | 'Priority' | 'Wholesale' | 'New';

export type DealerStatus = 'active' | 'inactive' | 'archived';

export type DealerPaymentTerms =
  | 'advance'
  | 'cod'
  | 'credit_7'
  | 'credit_15'
  | 'credit_30'
  | 'credit_45'
  | 'custom';

export interface Dealer {
  id: string; // e.g. 'DLR-1001'
  name: string; // Contact Person / Dealer Owner
  shopName: string; // Business / Enterprise / Firm Name
  primaryPhone: string;
  alternativePhone?: string;
  email?: string;
  businessAddress: string;
  district?: string;
  area?: string;
  businessType: DealerBusinessType;
  contactPerson?: string;
  category: DealerCategory;
  status: DealerStatus;
  paymentTerms: DealerPaymentTerms;
  creditLimit?: number; // Maximum allowable payable/due in BDT
  openingBalance?: number;
  openingBalanceType?: 'payable' | 'receivable';
  tradeLicenseNumber?: string;
  binOrVatNumber?: string;
  bankAccountDetails?: {
    bankName?: string;
    branchName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
  };
  mfsDetails?: {
    bkash?: string;
    nagad?: string;
    rocket?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealerTransactionType =
  | 'purchase' // Products bought from dealer (Accounts Payable increased)
  | 'sale_to_dealer' // Products sold/distributed to dealer (Accounts Receivable increased)
  | 'payment_made' // KenaX BD paid dealer (Payable decreased)
  | 'payment_received' // Dealer paid KenaX BD (Receivable decreased)
  | 'return_outward' // Damaged/returned items back to dealer (Payable decreased)
  | 'return_inward' // Items returned by dealer (Receivable decreased)
  | 'adjustment_credit' // Credit adjustment (discounts, rebates)
  | 'adjustment_debit'; // Debit adjustment (penalties, unbilled fees)

export type DealerTransactionStatus =
  | 'completed'
  | 'pending'
  | 'partially_paid'
  | 'cancelled'
  | 'draft';

export interface DealerTransactionItem {
  id: string;
  productName: string;
  sku?: string;
  variant?: string;
  quantity: number;
  unit: 'pcs' | 'box' | 'kg' | 'pack' | 'set' | 'dozen';
  unitPrice: number;
  lineTotal: number; // quantity * unitPrice
  productId?: string; // Linked KenaX product if available
  receivedInInventory?: boolean; // Explicit reception check
  receivedDate?: string;
  receivedQuantity?: number;
}

export interface DealerTransaction {
  id: string; // e.g. 'TXN-2026-001'
  dealerId: string;
  dealerName?: string;
  dealerShopName?: string;
  transactionDate: string;
  transactionType: DealerTransactionType;
  referenceNumber?: string; // Dealer bill / memo / challan #
  items: DealerTransactionItem[];
  subtotal: number;
  discount: number;
  transportCharge: number;
  otherCharges: number;
  totalAmount: number; // subtotal - discount + transportCharge + otherCharges
  amountPaid: number;
  remainingAmount: number; // totalAmount - amountPaid
  paymentDueDate?: string;
  expectedDeliveryDate?: string;
  actualReceivedDate?: string;
  status: DealerTransactionStatus;
  stockReceived?: boolean;
  stockReceivedBy?: string;
  stockReceivedDate?: string;
  notes?: string;
  linkedInvoiceIds?: string[];
  documents?: DealerDocumentReference[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentDirection = 'paid_to_dealer' | 'received_from_dealer';

export type PaymentMethod =
  | 'Cash'
  | 'bKash'
  | 'Nagad'
  | 'Rocket'
  | 'Bank Transfer'
  | 'Cheque'
  | 'Other';

export interface DealerPayment {
  id: string; // e.g. 'PAY-2026-001'
  dealerId: string;
  dealerName?: string;
  dealerShopName?: string;
  paymentDate: string;
  paymentDirection: PaymentDirection;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string; // TrxID, Cheque #, Deposit Slip #
  relatedTransactionId?: string;
  relatedInvoiceNumber?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  recordedBy: string;
  notes?: string;
  verificationStatus: 'verified' | 'pending_verification' | 'reversed';
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  createdAt: string;
}

export type DealerDocumentType =
  | 'dealer_invoice'
  | 'purchase_bill'
  | 'payment_receipt'
  | 'payment_proof'
  | 'delivery_challan'
  | 'return_note'
  | 'agreement'
  | 'trade_license'
  | 'other';

export interface DealerDocument {
  id: string;
  dealerId: string;
  dealerName?: string;
  dealerShopName?: string;
  transactionId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceTotal?: number;
  dueDate?: string;
  documentType: DealerDocumentType;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // mimeType (e.g. 'application/pdf', 'image/png')
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: 'unverified' | 'matched' | 'discrepancy';
  discrepancyNote?: string;
}

export interface DealerDocumentReference {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  documentType: DealerDocumentType;
}

export type DealerAdjustmentType =
  | 'return'
  | 'damage'
  | 'short_delivery'
  | 'wrong_item'
  | 'price_difference'
  | 'approved_discount'
  | 'additional_charge'
  | 'credit_note'
  | 'debit_note';

export interface DealerReturnAdjustment {
  id: string; // e.g. 'ADJ-2026-001'
  dealerId: string;
  dealerName?: string;
  dealerShopName?: string;
  transactionId?: string;
  adjustmentType: DealerAdjustmentType;
  productName?: string;
  quantity?: number;
  amount: number;
  reason: string;
  date: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  authorizedUser: string;
  stockTreatment: 'none' | 'return_to_dealer' | 'discard_damaged' | 'add_to_stock';
  stockProcessed?: boolean;
  notes?: string;
  documentUrl?: string;
  createdAt: string;
}

export interface DealerActivityLog {
  id: string;
  dealerId?: string;
  dealerName?: string;
  action: string;
  category: 'dealer' | 'transaction' | 'payment' | 'invoice' | 'return' | 'stock' | 'system';
  details: string;
  userName: string;
  timestamp: string;
}

export interface DealerOverviewStats {
  totalDealers: number;
  activeDealers: number;
  totalPurchaseValue: number;
  totalPaidToDealers: number;
  totalOutstandingPayable: number; // We owe dealers
  totalOutstandingReceivable: number; // Dealers owe us
  transactionsThisMonth: number;
  pendingPaymentsCount: number;
  recentInvoicesCount: number;
  overduePayables: number;
  overdueReceivables: number;
}
