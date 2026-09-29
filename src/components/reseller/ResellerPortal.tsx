import React, { useState, useEffect } from 'react';
import { PartnerUser, Product, Order } from '../../types';
import { ResellerUser, ResellerPlanId } from '../../types/reseller';
import {
  getResellers,
  saveResellers,
  getActiveResellerSession,
  setActiveResellerSession,
} from '../../lib/resellerStorage';
import { ResellerDashboard } from './ResellerDashboard';
import { ResellerOnboardingWizard } from './ResellerOnboardingWizard';

interface ResellerPortalProps {
  currentPartner: PartnerUser;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  onPlaceOrder: (order: Order) => void;
  onNavigateToStore?: () => void;
}

export const ResellerPortal: React.FC<ResellerPortalProps> = ({
  currentPartner,
  onLogout,
  products = [],
  orders = [],
  onPlaceOrder,
  onNavigateToStore = () => {},
}) => {
  // Find or initialize matching full ResellerUser object
  const [reseller, setReseller] = useState<ResellerUser>(() => {
    const activeSession = getActiveResellerSession();
    if (
      activeSession &&
      (activeSession.id === currentPartner.id || activeSession.username === currentPartner.username)
    ) {
      return activeSession;
    }

    const allResellers = getResellers();
    const existing = allResellers.find(
      (r) => r.id === currentPartner.id || r.username.toLowerCase() === currentPartner.username.toLowerCase()
    );

    if (existing) {
      setActiveResellerSession(existing);
      return existing;
    }

    // Bridge PartnerUser into full ResellerUser
    const newReseller: ResellerUser = {
      id: currentPartner.id,
      fullName: currentPartner.name,
      phone: currentPartner.phone,
      email: currentPartner.email,
      username: currentPartner.username,
      password: currentPartner.password,
      district: currentPartner.city || 'Dhaka',
      area: 'Central',
      address: currentPartner.address || 'Dhaka, Bangladesh',
      businessName: currentPartner.shopName || `${currentPartner.name}'s Reselling Hub`,
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
      planId: (currentPartner.planId as ResellerPlanId) || 'basic',
      billingCycle: 'monthly',
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      onboardingStep: 5,
      onboardingCompleted: true,
      isVIP: currentPartner.planId === 'premium',
      referralCode: `KX-RES-${Math.floor(1000 + Math.random() * 9000)}`,
      totalReferralEarnings: 0,
      walletBalance: currentPartner.walletBalance || 4500,
      pendingProfit: 1200,
      totalProfit: currentPartner.totalEarnings || 24500,
      totalSales: 98000,
      totalWithdrawn: currentPartner.totalWithdrawn || 20000,
      activeCustomersCount: 18,
      paymentInfo: {
        bkash: currentPartner.paymentDetails?.bkash || currentPartner.phone,
        bankAccount: currentPartner.paymentDetails?.bankAccount || '',
      },
      accountStatus: 'active',
      createdAt: currentPartner.createdAt || new Date().toISOString(),
    };

    saveResellers([...allResellers, newReseller]);
    setActiveResellerSession(newReseller);
    return newReseller;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!reseller.onboardingCompleted);

  const handleResellerUpdated = (updatedReseller: ResellerUser) => {
    setReseller(updatedReseller);
    setActiveResellerSession(updatedReseller);
    const all = getResellers().map((r) => (r.id === updatedReseller.id ? updatedReseller : r));
    saveResellers(all);
  };

  const handleOnboardingComplete = (completedReseller: ResellerUser) => {
    const updated = { ...completedReseller, onboardingCompleted: true, onboardingStep: 5 };
    handleResellerUpdated(updated);
    setIsOnboardingOpen(false);
  };

  if (isOnboardingOpen) {
    return (
      <ResellerOnboardingWizard
        initialResellerData={reseller}
        sampleProducts={products}
        onComplete={handleOnboardingComplete}
        onCancel={() => setIsOnboardingOpen(false)}
      />
    );
  }

  return (
    <div className="reseller-portal-root min-h-screen w-full max-w-full overflow-x-hidden">
      <ResellerDashboard
        reseller={reseller}
        onLogout={onLogout}
        products={products}
        orders={orders}
        onPlaceOrder={onPlaceOrder}
        onNavigateToStore={onNavigateToStore}
      />
    </div>
  );
};
export default ResellerPortal;
