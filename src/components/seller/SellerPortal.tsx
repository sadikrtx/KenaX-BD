import React, { useState, useEffect, useMemo } from 'react';
import { PartnerUser, Product, Order } from '../../types';
import { SellerUser, SellerPlanId } from '../../types/seller';
import {
  getSellers,
  saveSellers,
  getActiveSellerSession,
  setActiveSellerSession,
} from '../../lib/sellerStorage';
import { SellerDashboard } from './SellerDashboard';
import { SellerOnboardingWizard } from './SellerOnboardingWizard';
import { SellerPendingScreen } from './SellerPendingScreen';

interface SellerPortalProps {
  currentPartner: PartnerUser;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  onAddProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onNavigateToStore?: (storeSlug?: string) => void;
}

export const SellerPortal: React.FC<SellerPortalProps> = ({
  currentPartner,
  onLogout,
  products = [],
  orders = [],
  onAddProduct = () => {},
  onUpdateProduct = () => {},
  onDeleteProduct = () => {},
  onNavigateToStore = () => {},
}) => {
  // Find or initialize matching full SellerUser object
  const [seller, setSeller] = useState<SellerUser>(() => {
    const activeSession = getActiveSellerSession();
    if (activeSession && (activeSession.id === currentPartner.id || activeSession.username === currentPartner.username)) {
      return activeSession;
    }

    const allSellers = getSellers();
    const existing = allSellers.find(
      (s) => s.id === currentPartner.id || s.username.toLowerCase() === currentPartner.username.toLowerCase()
    );

    if (existing) {
      setActiveSellerSession(existing);
      return existing;
    }

    // Bridge PartnerUser into full SellerUser
    const newSeller: SellerUser = {
      id: currentPartner.id,
      fullName: currentPartner.name,
      email: currentPartner.email,
      phone: currentPartner.phone,
      username: currentPartner.username,
      password: currentPartner.password,
      profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
      sellerType: 'registered_business',
      planId: (currentPartner.planId as SellerPlanId) || 'standard',
      billingCycle: 'monthly',
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      onboardingStep: 8,
      onboardingCompleted: true,
      verificationStatus: 'verified',
      accountStatus: 'active',
      tradeLicenseNo: 'TRAD-BD-' + currentPartner.id.slice(-5),
      store: {
        storeName: currentPartner.shopName || currentPartner.name + ' Store',
        storeSlug: (currentPartner.shopName || currentPartner.username).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        logoUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300',
        bannerUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
        description: `Welcome to ${currentPartner.shopName || currentPartner.name}! Official seller on KenaX BD Marketplace.`,
        headline: 'Official Marketplace Verified Seller',
        announcement: 'Fast Delivery & Authentic Products Guaranteed!',
        contactEmail: currentPartner.email,
        contactPhone: currentPartner.phone,
        address: currentPartner.address || 'Dhaka, Bangladesh',
        district: currentPartner.city || 'Dhaka',
        upazila: 'Central',
        featuredCategories: ['Smartwatch', 'Earbuds & Audio', 'Gadgets', 'Fashion'],
        returnPolicy: '7 Days Replacement Warranty for all manufacturing defects.',
        shippingPolicy: '24-48 Hours Express Delivery inside Dhaka, 48-72 Hours Nationwide.',
      },
      paymentInfo: {
        bkash: currentPartner.paymentDetails?.bkash || currentPartner.phone,
        bankAccount: currentPartner.paymentDetails?.bankAccount || '',
      },
      walletBalance: currentPartner.walletBalance || 18500,
      pendingBalance: 4200,
      totalEarnings: currentPartner.totalEarnings || 94500,
      totalMarketplaceCommission: 7560,
      totalWithdrawn: currentPartner.totalWithdrawn || 76000,
      rating: 4.9,
      totalReviews: 48,
      followersCount: 820,
      createdAt: currentPartner.createdAt || new Date().toISOString(),
    };

    saveSellers([...allSellers, newSeller]);
    setActiveSellerSession(newSeller);
    return newSeller;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!seller.onboardingCompleted);

  // Sync state when seller updates
  const handleSellerUpdated = (updatedSeller: SellerUser) => {
    setSeller(updatedSeller);
    setActiveSellerSession(updatedSeller);
    const all = getSellers().map((s) => (s.id === updatedSeller.id ? updatedSeller : s));
    saveSellers(all);
  };

  const handleOnboardingComplete = (completedSeller: SellerUser) => {
    const updated = { ...completedSeller, onboardingCompleted: true, onboardingStep: 8 };
    handleSellerUpdated(updated);
    setIsOnboardingOpen(false);
  };

  // Check if Seller account is pending admin approval / payment review
  if (
    seller.accountStatus === 'pending_approval' ||
    currentPartner.status === 'pending' ||
    seller.verificationStatus === 'pending'
  ) {
    return (
      <SellerPendingScreen
        seller={seller}
        onLogout={onLogout}
        onStatusUpdated={(updatedSeller) => {
          setSeller(updatedSeller);
        }}
      />
    );
  }

  if (isOnboardingOpen) {
    return (
      <SellerOnboardingWizard
        initialSellerData={seller}
        onComplete={handleOnboardingComplete}
        onCancel={() => setIsOnboardingOpen(false)}
      />
    );
  }

  return (
    <SellerDashboard
      seller={seller}
      onLogout={onLogout}
      products={products}
      onAddProduct={onAddProduct}
      onUpdateProduct={onUpdateProduct}
      onDeleteProduct={onDeleteProduct}
      onNavigateToStore={onNavigateToStore}
    />
  );
};
export default SellerPortal;
