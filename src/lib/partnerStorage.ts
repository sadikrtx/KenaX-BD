import { PartnerUser, PartnerPayout, PartnerRole, Order, Product } from '../types/index.ts';
import { safeSetLocalStorage } from './storage';

const PARTNERS_STORAGE_KEY = 'kenax_partner_accounts_v1';
const PAYOUTS_STORAGE_KEY = 'kenax_partner_payouts_v1';

export const INITIAL_PARTNERS: PartnerUser[] = [
  {
    id: 'seller-apex-101',
    type: 'seller',
    name: 'Rahim Chowdhury',
    shopName: 'Apex Electronics BD',
    phone: '01711002233',
    email: 'apex.seller@kenaxbd.com',
    username: 'seller_apex',
    password: 'seller123',
    status: 'active',
    planId: 'premium',
    selectedPlanId: 'premium',
    billingCycle: 'monthly',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 300 * 86400000).toISOString(),
    commissionRate: 6, // 6% admin commission for Premium
    walletBalance: 14500,
    totalEarnings: 82000,
    totalWithdrawn: 67500,
    paymentDetails: {
      bkash: '01711002233',
      nagad: '01711002233',
      bankName: 'City Bank PLC',
      bankAccount: '1102938475001',
      bankBranch: 'Gulshan 2, Dhaka',
      accountHolderName: 'Apex Electronics BD',
    },
    address: 'Shop 42, Level 3, Multiplan Center, Elephant Road',
    city: 'Dhaka',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'seller-nusrat-303',
    type: 'seller',
    name: 'Nusrat Jahan',
    shopName: 'Nusrat Fashion Gallery',
    phone: '01712345678',
    email: 'nusrat.fashion@gmail.com',
    username: 'seller_nusrat',
    password: 'seller123',
    status: 'pending',
    planId: 'standard',
    selectedPlanId: 'standard',
    billingCycle: 'monthly',
    subscriptionStatus: 'trial',
    paymentMethod: 'bkash',
    paymentSenderNumber: '01712345678',
    paymentTxId: 'BK-TRX9938210',
    paymentAmount: 990,
    paymentProofNote: 'Paid ৳990 Standard Monthly Plan fee via bKash Personal',
    paymentSubmittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    commissionRate: 9,
    walletBalance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0,
    paymentDetails: {
      bkash: '01712345678',
      nagad: '01712345678',
    },
    address: 'Shop 12, Eastern Mollah Plaza',
    city: 'Dhaka',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'seller-organic-404',
    type: 'seller',
    name: 'Mahmudul Islam',
    shopName: 'Pure BD Organic Shop',
    phone: '01988776655',
    email: 'pureorganic@gmail.com',
    username: 'seller_organic',
    password: 'seller123',
    status: 'active',
    planId: 'premium',
    selectedPlanId: 'premium',
    billingCycle: 'monthly',
    subscriptionStatus: 'pending_renewal',
    subscriptionEndDate: new Date(Date.now() - 1 * 86400000).toISOString(), // Expired 1 day ago
    renewalTxId: 'NG-TRX4492019',
    renewalPaymentMethod: 'nagad',
    renewalAmount: 2490,
    renewalSubmittedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    commissionRate: 6,
    walletBalance: 8200,
    totalEarnings: 42000,
    totalWithdrawn: 33800,
    paymentDetails: {
      bkash: '01988776655',
      nagad: '01988776655',
    },
    address: 'Sector 3, Uttara',
    city: 'Dhaka',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'reseller-tanvir-201',
    type: 'reseller',
    name: 'Tanvir Hasan',
    shopName: 'Gadget Mania Dropship',
    phone: '01822334455',
    email: 'tanvir.reseller@gmail.com',
    username: 'reseller_tanvir',
    password: 'reseller123',
    status: 'active',
    isVip: true,
    resellerTier: 'gold_vip',
    planId: 'gold_vip',
    selectedPlanId: 'gold_vip',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    commissionRate: 20, // 20% wholesale discount / margin
    walletBalance: 6200,
    totalEarnings: 34800,
    totalWithdrawn: 28600,
    paymentDetails: {
      bkash: '01822334455',
      nagad: '01822334455',
    },
    address: 'Agrabad C/A',
    city: 'Chittagong',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'reseller-farhana-202',
    type: 'reseller',
    name: 'Farhana Akter',
    shopName: 'Chic Boutique Reseller',
    phone: '01799887766',
    email: 'farhana.chic@gmail.com',
    username: 'reseller_farhana',
    password: 'reseller123',
    status: 'active',
    isVip: true,
    resellerTier: 'silver',
    planId: 'silver',
    selectedPlanId: 'silver',
    subscriptionStatus: 'expired',
    subscriptionEndDate: new Date(Date.now() - 2 * 86400000).toISOString(), // Expired 2 days ago
    renewalTxId: 'BK-TRX7789012',
    renewalPaymentMethod: 'bkash',
    renewalAmount: 990,
    renewalSubmittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    commissionRate: 15,
    walletBalance: 3400,
    totalEarnings: 18200,
    totalWithdrawn: 14800,
    paymentDetails: {
      bkash: '01799887766',
    },
    address: 'Mirpur 10',
    city: 'Dhaka',
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'reseller-sakib-203',
    type: 'reseller',
    name: 'Sakib Al Hasan',
    shopName: 'Speedy Store Dropship',
    phone: '01633445566',
    email: 'sakib.dropship@gmail.com',
    username: 'reseller_sakib',
    password: 'reseller123',
    status: 'pending',
    isVip: false,
    resellerTier: 'silver',
    planId: 'silver',
    selectedPlanId: 'silver',
    subscriptionStatus: 'trial',
    paymentMethod: 'nagad',
    paymentSenderNumber: '01633445566',
    paymentTxId: 'NG-TRX8829014',
    paymentAmount: 490,
    paymentProofNote: 'Paid ৳490 Starter/Silver Reseller fee via Nagad',
    paymentSubmittedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    commissionRate: 15,
    walletBalance: 0,
    totalEarnings: 0,
    totalWithdrawn: 0,
    paymentDetails: {
      nagad: '01633445566',
    },
    address: 'Rajshahi Sadar',
    city: 'Rajshahi',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

export const INITIAL_PAYOUTS: PartnerPayout[] = [
  {
    id: 'pay-901',
    partnerId: 'seller-apex-101',
    partnerName: 'Apex Electronics BD',
    partnerType: 'seller',
    amount: 15000,
    method: 'bank',
    accountNumber: '1102938475001 (City Bank)',
    status: 'approved',
    requestedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    processedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    txId: 'CB-883920194',
    note: 'Weekly Seller Payout Processed',
  },
  {
    id: 'pay-902',
    partnerId: 'reseller-tanvir-201',
    partnerName: 'Gadget Mania Dropship',
    partnerType: 'reseller',
    amount: 5000,
    method: 'bkash',
    accountNumber: '01822334455',
    status: 'approved',
    requestedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    processedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    txId: 'BK-TRX9920138',
    note: 'Reseller Profit Transfer',
  },
];

export function getPartnersFromStorage(): PartnerUser[] {
  try {
    const raw = localStorage.getItem(PARTNERS_STORAGE_KEY);
    if (!raw) {
      safeSetLocalStorage(PARTNERS_STORAGE_KEY, JSON.stringify(INITIAL_PARTNERS));
      return INITIAL_PARTNERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PARTNERS;
  } catch {
    return INITIAL_PARTNERS;
  }
}

export function savePartnersToStorage(partners: PartnerUser[]): void {
  safeSetLocalStorage(PARTNERS_STORAGE_KEY, JSON.stringify(partners));
}

export function getPayoutsFromStorage(): PartnerPayout[] {
  try {
    const raw = localStorage.getItem(PAYOUTS_STORAGE_KEY);
    if (!raw) {
      safeSetLocalStorage(PAYOUTS_STORAGE_KEY, JSON.stringify(INITIAL_PAYOUTS));
      return INITIAL_PAYOUTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PAYOUTS;
  } catch {
    return INITIAL_PAYOUTS;
  }
}

export function savePayoutsToStorage(payouts: PartnerPayout[]): void {
  safeSetLocalStorage(PAYOUTS_STORAGE_KEY, JSON.stringify(payouts));
}

export function authenticatePartner(identifier: string, pass: string, role?: PartnerRole): PartnerUser | null {
  const partners = getPartnersFromStorage();
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();

  const user = partners.find(
    (p) =>
      (p.username.toLowerCase() === cleanId ||
        p.email.toLowerCase() === cleanId ||
        p.phone.replace(/[^0-9]/g, '') === cleanId.replace(/[^0-9]/g, '')) &&
      p.password === cleanPass
  );

  if (!user) return null;
  if (role && user.type !== role) return null;
  if (user.status === 'suspended') return null;

  return user;
}
