import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle,
  Truck,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Home,
  Briefcase,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Trash2,
  Copy,
  Check,
  Smartphone,
  Building,
  User,
  Palette,
  ShoppingCart,
  Plus,
  ShoppingBag,
  Banknote,
  Wallet,
  RotateCcw,
  Award,
} from 'lucide-react';
import {
  Order,
  OrderItem,
  PaymentMethod,
  PaymentOptionType,
  DeliveryAddress,
  CustomerRecord,
  SiteSettings,
  PaymentGatewayConfig,
  Product,
  ColorVariation,
} from '../types';
import { BANGLADESH_LOCATIONS } from '../data/bangladeshData';
import { saveCustomerToDB, getCustomersFromDB, mergeCustomersLists } from '../lib/firebase';
import { INITIAL_CUSTOMERS } from '../data/initialSettings';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';
import { isValidEmailFormat, getEmailValidationError } from '../utils/emailValidator';
import { triggerOrderPlacedSMS } from '../lib/smsService';
import { triggerOrderPlacedWorkflow } from '../lib/emailService';
import { triggerWhatsAppEvent } from '../lib/whatsappService';
import { isTelegramWebApp, getTelegramUser, triggerHaptic } from '../lib/telegramWebApp';
import { CartItemImage } from './CartItemImage';
import { isSameCartItem, sanitizeCart } from '../utils/cartUtils';
import { getOptimizedImageUrl, handleImageError } from '../utils/imageOptimizer';
import { useLanguage } from '../context/LanguageContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: OrderItem[];
  fullCart?: OrderItem[];
  discountAmount: number;
  couponCode?: string;
  onOrderPlaced: (order: Order) => void;
  savedAddresses?: DeliveryAddress[];
  defaultInsideCityFee?: number;
  defaultOutsideCityFee?: number;
  currentCustomer?: CustomerRecord | null;
  onCustomerCreated?: (customer: CustomerRecord) => void;
  onRemoveItem?: (productId: string) => void;
  onUpdateCartItem?: (productId: string, updates: Partial<OrderItem>) => void;
  products?: Product[];
  siteSettings?: SiteSettings;
  orderSource?: 'chatbot' | 'manual' | string;
  mode?: 'modal' | 'page';
  onBackToShopping?: () => void;
}

const DEFAULT_GATEWAYS: PaymentGatewayConfig[] = [
  {
    id: 'bkash',
    name: 'bKash',
    accountNumber: '01719143897',
    accountType: 'Personal',
    txType: 'Send Money',
    instructions:
      'Send Money from your bKash App or dial *247#. Enter your bKash mobile number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    accountNumber: '01887713212',
    accountType: 'Merchant',
    txType: 'Payment',
    instructions:
      'Make Payment or Send Money from your Nagad App or dial *167#. Enter your mobile number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    accountNumber: '01912-345678-9',
    accountType: 'Personal',
    txType: 'Send Money',
    instructions:
      'Send Money from your Rocket App or dial *322#. Enter your Rocket account number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  fullCart = [],
  discountAmount,
  couponCode,
  onOrderPlaced,
  savedAddresses = [],
  defaultInsideCityFee = 70,
  defaultOutsideCityFee = 130,
  currentCustomer,
  onCustomerCreated,
  onRemoveItem,
  onUpdateCartItem,
  products = [],
  siteSettings,
  orderSource = 'manual',
  mode = 'modal',
  onBackToShopping,
}) => {
  const { t, language } = useLanguage();

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shouldCreateAccount, setShouldCreateAccount] = useState(false);

  // Internal sync for cart items with variation selection
  const [itemsList, setItemsList] = useState<OrderItem[]>(() => {
    return cartItems.map((item) => {
      const prod = (products || []).find((p) => p.id === item.productId);
      let selectedColor = item.selectedColor;
      let selectedColorImage = item.selectedColorImage;
      let productImage = item.productImage && item.productImage.trim() !== '' && !item.productImage.startsWith('media://')
        ? item.productImage 
        : (prod?.images?.[0] || prod?.colors?.[0]?.imageUrl || '');
      let selectedSize = item.selectedSize;

      if (prod?.colors && prod.colors.length > 0) {
        const colorName = selectedColor || (item.variant ? item.variant.split('/')[0].trim() : '');
        const matched = colorName ? prod.colors.find((c) => (c.name || '').trim().toLowerCase() === colorName.toLowerCase()) : undefined;
        if (matched) {
          selectedColor = matched.name;
          if (matched.imageUrl && matched.imageUrl.trim() !== '') {
            selectedColorImage = matched.imageUrl;
            productImage = matched.imageUrl;
          }
        } else if (!selectedColor) {
          selectedColor = prod.colors[0].name;
          if (prod.colors[0].imageUrl && (!productImage || productImage.trim() === '')) {
            selectedColorImage = prod.colors[0].imageUrl;
            productImage = prod.colors[0].imageUrl;
          }
        }
      }

      if (prod?.sizes && prod.sizes.length > 0 && !selectedSize) {
        selectedSize = prod.sizes[0];
      }

      const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' / ');

      return {
        ...item,
        costPrice: item.costPrice ?? prod?.costPrice,
        supplierName: item.supplierName || prod?.supplierName,
        supplierUrl: item.supplierUrl || prod?.supplierUrl,
        supplierId: item.supplierId || prod?.supplierId,
        selectedColor: selectedColor || item.selectedColor,
        selectedColorImage: selectedColorImage || item.selectedColorImage,
        productImage: productImage,
        selectedSize: selectedSize || item.selectedSize,
        variant: variantStr || item.variant,
        total: item.price * item.quantity,
      };
    });
  });

  const prevIsOpenRef = useRef(false);

  // Initialize itemsList ONLY when the checkout modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const initial = cartItems.map((item) => {
        const prod = (products || []).find((p) => p.id === item.productId);
        let selectedColor = item.selectedColor;
        let selectedColorImage = item.selectedColorImage;
        let productImage = item.productImage && item.productImage.trim() !== '' && !item.productImage.startsWith('media://')
          ? item.productImage
          : (prod?.images?.[0] || prod?.colors?.[0]?.imageUrl || '');
        let selectedSize = item.selectedSize;

        if (prod?.colors && prod.colors.length > 0) {
          const colorName = selectedColor || (item.variant ? item.variant.split('/')[0].trim() : '');
          const matched = colorName ? prod.colors.find((c) => (c.name || '').trim().toLowerCase() === colorName.toLowerCase()) : undefined;
          if (matched) {
            selectedColor = matched.name;
            if (matched.imageUrl && matched.imageUrl.trim() !== '') {
              selectedColorImage = matched.imageUrl;
              productImage = matched.imageUrl;
            }
          } else if (!selectedColor) {
            selectedColor = prod.colors[0].name;
            if (prod.colors[0].imageUrl && (!productImage || productImage.trim() === '')) {
              selectedColorImage = prod.colors[0].imageUrl;
              productImage = prod.colors[0].imageUrl;
            }
          }
        }

        if (prod?.sizes && prod.sizes.length > 0 && !selectedSize) {
          selectedSize = prod.sizes[0];
        }

        const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' / ');

        return {
          ...item,
          costPrice: item.costPrice ?? prod?.costPrice,
          supplierName: item.supplierName || prod?.supplierName,
          supplierUrl: item.supplierUrl || prod?.supplierUrl,
          supplierId: item.supplierId || prod?.supplierId,
          selectedColor: selectedColor || item.selectedColor,
          selectedColorImage: selectedColorImage || item.selectedColorImage,
          productImage: productImage,
          selectedSize: selectedSize || item.selectedSize,
          variant: variantStr || item.variant,
          total: item.price * item.quantity,
        };
      });
      setItemsList(initial);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, cartItems, products]);

  // Non-destructive enricher for product images while modal is open
  useEffect(() => {
    if (isOpen && products && products.length > 0) {
      setItemsList((prevItems) => {
        if (prevItems.length === 0) return prevItems;
        let changed = false;
        const updated = prevItems.map((item) => {
          const prod = products.find((p) => p.id === item.productId);
          if (!prod) return item;
          let productImage = item.productImage;
          let selectedColorImage = item.selectedColorImage;

          if (prod.colors && prod.colors.length > 0) {
            const colorName = item.selectedColor || (item.variant ? item.variant.split('/')[0].trim() : '');
            const matchedColor = colorName ? prod.colors.find((c) => (c.name || '').trim().toLowerCase() === colorName.toLowerCase()) : undefined;
            if (matchedColor?.imageUrl && matchedColor.imageUrl.trim() !== '') {
              if (selectedColorImage !== matchedColor.imageUrl || productImage !== matchedColor.imageUrl) {
                selectedColorImage = matchedColor.imageUrl;
                productImage = matchedColor.imageUrl;
                changed = true;
              }
            }
          }

          if (!productImage || productImage.trim() === '' || productImage.startsWith('media://')) {
            productImage = selectedColorImage || prod.images?.[0] || prod.colors?.[0]?.imageUrl || item.productImage;
            changed = true;
          }
          return {
            ...item,
            selectedColorImage,
            productImage,
          };
        });
        return changed ? updated : prevItems;
      });
    }
  }, [products, isOpen]);

  // Calculate items in user's full cart that are not currently in this checkout order
  const otherCartItems = useMemo(() => {
    if (!fullCart || fullCart.length === 0) return [];
    const filtered = fullCart.filter(
      (cItem) => !itemsList.some((lItem) => lItem.productId === cItem.productId || isSameCartItem(lItem, cItem))
    );
    return sanitizeCart(filtered);
  }, [fullCart, itemsList]);

  const otherCartItemsTotal = useMemo(() => {
    return otherCartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [otherCartItems]);

  const handleAddAllCartItemsToCheckout = () => {
    if (otherCartItems.length === 0) return;
    setItemsList((prev) => {
      const combined = [...prev];
      for (const cItem of otherCartItems) {
        const idx = combined.findIndex(
          (ci) => ci.productId === cItem.productId && (ci.variant || '') === (cItem.variant || '')
        );
        if (idx >= 0) {
          combined[idx] = {
            ...combined[idx],
            quantity: combined[idx].quantity + cItem.quantity,
            total: (combined[idx].quantity + cItem.quantity) * combined[idx].price,
          };
        } else {
          const prod = (products || []).find((p) => p.id === cItem.productId);
          let selectedColor = cItem.selectedColor;
          let selectedColorImage = cItem.selectedColorImage;
          let selectedSize = cItem.selectedSize;
          let itemImg = cItem.productImage && cItem.productImage.trim() !== '' && !cItem.productImage.startsWith('media://')
            ? cItem.productImage
            : (prod?.images?.[0] || prod?.colors?.[0]?.imageUrl || '');

          if (prod?.colors && prod.colors.length > 0 && !selectedColor) {
            selectedColor = prod.colors[0].name;
            if (prod.colors[0].imageUrl && (!itemImg || itemImg.trim() === '')) {
              selectedColorImage = prod.colors[0].imageUrl;
              itemImg = prod.colors[0].imageUrl;
            }
          }
          if (prod?.sizes && prod.sizes.length > 0 && !selectedSize) {
            selectedSize = prod.sizes[0];
          }
          const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' / ');

          combined.push({
            ...cItem,
            selectedColor: selectedColor || cItem.selectedColor,
            selectedColorImage: selectedColorImage || cItem.selectedColorImage,
            selectedSize: selectedSize || cItem.selectedSize,
            variant: variantStr || cItem.variant,
            productImage: itemImg,
            total: cItem.price * cItem.quantity,
          });
        }
      }
      return combined;
    });
  };

  const handleAddSingleCartItemToCheckout = (cItem: OrderItem) => {
    setItemsList((prev) => {
      const idx = prev.findIndex(
        (ci) => ci.productId === cItem.productId && (ci.variant || '') === (cItem.variant || '')
      );
      if (idx >= 0) {
        return prev.map((item, i) =>
          i === idx
            ? {
                ...item,
                quantity: item.quantity + cItem.quantity,
                total: (item.quantity + cItem.quantity) * item.price,
              }
            : item
        );
      }
      const prod = (products || []).find((p) => p.id === cItem.productId);
      let selectedColor = cItem.selectedColor;
      let selectedColorImage = cItem.selectedColorImage;
      let selectedSize = cItem.selectedSize;
      let itemImg = cItem.productImage && cItem.productImage.trim() !== '' && !cItem.productImage.startsWith('media://')
        ? cItem.productImage
        : (prod?.images?.[0] || prod?.colors?.[0]?.imageUrl || '');

      if (prod?.colors && prod.colors.length > 0 && !selectedColor) {
        selectedColor = prod.colors[0].name;
        if (prod.colors[0].imageUrl && (!itemImg || itemImg.trim() === '')) {
          selectedColorImage = prod.colors[0].imageUrl;
          itemImg = prod.colors[0].imageUrl;
        }
      }
      if (prod?.sizes && prod.sizes.length > 0 && !selectedSize) {
        selectedSize = prod.sizes[0];
      }
      const variantStr = [selectedColor, selectedSize].filter(Boolean).join(' / ');

      return [
        ...prev,
        {
          ...cItem,
          selectedColor: selectedColor || cItem.selectedColor,
          selectedColorImage: selectedColorImage || cItem.selectedColorImage,
          selectedSize: selectedSize || cItem.selectedSize,
          variant: variantStr || cItem.variant,
          productImage: itemImg,
          total: cItem.price * cItem.quantity,
        },
      ];
    });
  };

  const handleSelectColorForProduct = (productId: string, color: ColorVariation, itemIndex?: number) => {
    const prod = (products || []).find((p) => p.id === productId);
    let targetProductId = productId;
    let targetUpdates: Partial<OrderItem> | null = null;

    setItemsList((prev) =>
      prev.map((item, idx) => {
        if (itemIndex !== undefined ? idx === itemIndex : item.productId === productId) {
          const defaultImage = prod?.images?.[0] || item.productImage || '';
          const newImage = color.imageUrl || defaultImage;
          const variantStr = [color.name, item.selectedSize].filter(Boolean).join(' / ');
          const updates: OrderItem = {
            ...item,
            selectedColor: color.name,
            selectedColorImage: color.imageUrl,
            productImage: newImage,
            variant: variantStr || item.variant,
          };
          targetProductId = item.productId;
          targetUpdates = updates;
          return updates;
        }
        return item;
      })
    );

    if (onUpdateCartItem && targetUpdates) {
      onUpdateCartItem(targetProductId, targetUpdates);
    }
  };

  const handleSelectSizeForProduct = (productId: string, size: string, itemIndex?: number) => {
    let targetProductId = productId;
    let targetUpdates: Partial<OrderItem> | null = null;

    setItemsList((prev) =>
      prev.map((item, idx) => {
        if (itemIndex !== undefined ? idx === itemIndex : item.productId === productId) {
          const variantStr = [item.selectedColor, size].filter(Boolean).join(' / ');
          const updates: OrderItem = {
            ...item,
            selectedSize: size,
            variant: variantStr || item.variant,
          };
          targetProductId = item.productId;
          targetUpdates = updates;
          return updates;
        }
        return item;
      })
    );

    if (onUpdateCartItem && targetUpdates) {
      onUpdateCartItem(targetProductId, targetUpdates);
    }
  };

  const handleUpdateItemQuantity = (productId: string, newQty: number, itemIndex?: number) => {
    if (newQty < 1) return;
    let targetProductId = productId;
    let targetUpdates: Partial<OrderItem> | null = null;

    setItemsList((prev) =>
      prev.map((item, idx) => {
        if (itemIndex !== undefined ? idx === itemIndex : item.productId === productId) {
          const newTotal = item.price * newQty;
          const updates: OrderItem = {
            ...item,
            quantity: newQty,
            total: newTotal,
          };
          targetProductId = item.productId;
          targetUpdates = updates;
          return updates;
        }
        return item;
      })
    );

    if (onUpdateCartItem && targetUpdates) {
      onUpdateCartItem(targetProductId, targetUpdates);
    }
  };

  const handleRemoveProductItem = (productId: string, itemIndex?: number) => {
    if (itemsList.length <= 1) return;
    let removedId = productId;
    setItemsList((prev) => {
      const targetItem = itemIndex !== undefined ? prev[itemIndex] : prev.find((item) => item.productId === productId);
      if (targetItem) removedId = targetItem.productId;
      return prev.filter((item, idx) => (itemIndex !== undefined ? idx !== itemIndex : item.productId !== productId));
    });
    if (onRemoveItem) {
      onRemoveItem(removedId);
    }
  };

  // Delivery Address
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryMobile, setDeliveryMobile] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [area, setArea] = useState('');
  const [houseRoad, setHouseRoad] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Delivery method
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<'inside' | 'outside' | 'express'>('inside');

  // Payment Options & Gateways
  const [paymentOptionType, setPaymentOptionType] = useState<PaymentOptionType>('cod');
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('bkash');
  const [senderMobile, setSenderMobile] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Address presets
  const [selectedAddressPreset, setSelectedAddressPreset] = useState<string>('custom');
  const [showOptionalMobileEmail, setShowOptionalMobileEmail] = useState(false);

  // Pre-fill from logged-in customer or Telegram WebApp if available
  useEffect(() => {
    if (currentCustomer) {
      setCustomerName(currentCustomer.name || '');
      setCustomerEmail(currentCustomer.email || '');
      setCustomerMobile(currentCustomer.mobile || '');
      setDeliveryName(currentCustomer.name || '');
      setDeliveryMobile(currentCustomer.mobile || '');

      const defaultAddr = currentCustomer.savedAddresses?.find((a) => a.isDefault) || currentCustomer.savedAddresses?.[0];
      if (defaultAddr) {
        setDivision(defaultAddr.division || 'Dhaka');
        setDistrict(defaultAddr.district || 'Dhaka');
        setUpazila(defaultAddr.upazila || 'Dhanmondi');
        setArea(defaultAddr.area || '');
        setFullAddress(defaultAddr.fullAddress || '');
      }
    } else if (isOpen && isTelegramWebApp()) {
      const tgUser = getTelegramUser();
      if (tgUser) {
        const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
        if (fullName) {
          setCustomerName((prev) => prev || fullName);
          setDeliveryName((prev) => prev || fullName);
        } else if (tgUser.username) {
          setCustomerName((prev) => prev || tgUser.username || '');
          setDeliveryName((prev) => prev || tgUser.username || '');
        }
      }
    }
  }, [currentCustomer, isOpen]);

  // Auto-calculate delivery fee based on division/district
  useEffect(() => {
    if (district.toLowerCase().includes('dhaka')) {
      setSelectedDeliveryMethod('inside');
    } else {
      setSelectedDeliveryMethod('outside');
    }
  }, [district]);

  // When division changes, update district to first available
  const handleDivisionChange = (newDivision: string) => {
    setDivision(newDivision);
    const districts = Object.keys(BANGLADESH_LOCATIONS[newDivision]?.districts || {});
    if (districts.length > 0) {
      const firstDistrict = districts[0];
      setDistrict(firstDistrict);
      const upazilas = BANGLADESH_LOCATIONS[newDivision]?.districts[firstDistrict]?.upazilas || [];
      setUpazila(upazilas[0] || '');
    }
  };

  // When district changes, update upazila
  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const upazilas = BANGLADESH_LOCATIONS[division]?.districts[newDistrict]?.upazilas || [];
    setUpazila(upazilas[0] || '');
  };

  // Handle Preset Address Selection from actual saved addresses
  const applyPresetAddress = (addr: DeliveryAddress) => {
    setSelectedAddressPreset(addr.id);
    setDeliveryName(addr.recipientName || customerName);
    setDeliveryMobile(addr.recipientPhone || customerMobile);
    if (addr.division) setDivision(addr.division);
    if (addr.district) setDistrict(addr.district);
    if (addr.upazila) setUpazila(addr.upazila);
    if (addr.area) setArea(addr.area);
    if (addr.houseRoad) setHouseRoad(addr.houseRoad);
    if (addr.fullAddress) setFullAddress(addr.fullAddress);
    if (addr.postalCode) setPostalCode(addr.postalCode);
  };

  if (!isOpen) return null;

  const subtotal = itemsList.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let deliveryCharge =
    selectedDeliveryMethod === 'inside'
      ? (siteSettings?.insideDhakaDeliveryFee ?? defaultInsideCityFee)
      : selectedDeliveryMethod === 'express'
      ? 160
      : (siteSettings?.outsideDhakaDeliveryFee ?? defaultOutsideCityFee);

  // Free delivery threshold: over ৳5000 inside Dhaka
  if (subtotal >= 5000 && selectedDeliveryMethod === 'inside') {
    deliveryCharge = 0;
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + deliveryCharge);

  // Amount payable right now
  const advanceAmountPayable =
    paymentOptionType === 'cod'
      ? 0
      : paymentOptionType === 'delivery_only'
      ? deliveryCharge
      : finalTotal;

  // Amount due on delivery
  const dueOnDelivery =
    paymentOptionType === 'cod'
      ? finalTotal
      : paymentOptionType === 'delivery_only'
      ? Math.max(0, finalTotal - deliveryCharge)
      : 0;

  // Gateways lookup dynamically merged with siteSettings numbers and filtered by active payment option
  const rawGateways =
    siteSettings?.paymentGateways && siteSettings.paymentGateways.length > 0
      ? siteSettings.paymentGateways
      : DEFAULT_GATEWAYS;

  const allConfiguredGateways = rawGateways.map((g) => {
    let accNum = g.accountNumber;
    let accType = g.accountType;
    let txType = g.txType;
    if (g.id === 'bkash' || g.name.toLowerCase().includes('bkash')) {
      accNum = g.accountNumber || siteSettings?.bkashNumber || accNum;
      accType = g.accountType || (siteSettings?.bkashType as any) || accType;
    } else if (g.id === 'nagad' || g.name.toLowerCase().includes('nagad')) {
      accNum = g.accountNumber || siteSettings?.nagadNumber || accNum;
      accType = g.accountType || (siteSettings?.nagadType as any) || accType;
    } else if (g.id === 'rocket' || g.name.toLowerCase().includes('rocket')) {
      accNum = g.accountNumber || siteSettings?.rocketNumber || accNum;
    }
    return {
      ...g,
      accountNumber: accNum,
      accountType: accType,
      txType,
      isEnabled: g.isEnabled !== false,
    };
  });

  const matchingGateways = allConfiguredGateways.filter((g) => {
    if (!g.isEnabled) return false;
    if (!g.assignedTo || g.assignedTo === 'all') return true;
    return g.assignedTo === paymentOptionType;
  });

  const activeGateways =
    matchingGateways.length > 0
      ? matchingGateways
      : allConfiguredGateways.filter((g) => g.isEnabled);

  const currentGateway =
    activeGateways.find((g) => g.id === selectedGatewayId) ||
    activeGateways[0] ||
    allConfiguredGateways[0];

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Validate fields per instructions
  const validateForm = () => {
    const errs: Record<string, string> = {};

    const nameToValidate = (deliveryName || customerName).trim();
    if (!nameToValidate) {
      errs.name = t('আপনার পুরো নাম লিখুন', 'Please enter your full name');
    }

    const mobileToValidate = cleanBDPhoneNumber(deliveryMobile || customerMobile);
    if (!mobileToValidate) {
      errs.mobile = t('একটি সঠিক মোবাইল নম্বর দিন', 'Please enter a valid mobile number');
    } else if (!isValidBDMobileNumber(mobileToValidate)) {
      errs.mobile = t(
        'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (০১৩ থেকে ০১৯ দিয়ে শুরু)',
        getBDPhoneValidationError(mobileToValidate) || 'Enter a valid 11-digit mobile number starting with 013 to 019'
      );
    }

    // Ensure division/district/upazila defaults for mobile single-address flow
    const effectiveDivision = division || 'Dhaka';
    const effectiveDistrict = district || (selectedDeliveryMethod === 'inside' ? 'Dhaka' : 'Outside Dhaka');
    const effectiveUpazila = upazila || (selectedDeliveryMethod === 'inside' ? 'Dhaka City' : 'General');
    if (!division) setDivision(effectiveDivision);
    if (!district) setDistrict(effectiveDistrict);
    if (!upazila) setUpazila(effectiveUpazila);

    // Guest email and password check - smart fallback for fast-checkout or explicit account creation
    if (!currentCustomer) {
      if (shouldCreateAccount) {
        if (!customerEmail || !customerEmail.trim()) {
          errs.email = t('ইমেইল অ্যাড্রেস লিখুন', 'Please enter your email address');
        } else {
          const emailValidationError = getEmailValidationError(customerEmail);
          if (emailValidationError) {
            errs.email = t('সঠিক ইমেইল ঠিকানা দিন', emailValidationError);
          }
        }

        if (!guestPassword || guestPassword.trim().length < 4) {
          errs.password = t('কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড দিন', 'Enter at least 4 characters');
        }
      } else {
        if (customerEmail && customerEmail.trim()) {
          const emailValidationError = getEmailValidationError(customerEmail);
          if (emailValidationError) {
            errs.email = t('সঠিক ইমেইল ঠিকানা দিন', emailValidationError);
          }
        } else {
          const safeMobile = cleanBDPhoneNumber(deliveryMobile || customerMobile) || 'customer';
          setCustomerEmail(`${safeMobile}@kenax.com.bd`);
        }

        if (!guestPassword || guestPassword.trim().length < 4) {
          setGuestPassword('1234');
        }
      }
    }

    if (!fullAddress.trim()) {
      errs.address = t('অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা দিন', 'Please enter your complete delivery address');
    }

    if (paymentOptionType !== 'cod') {
      const cleanSender = cleanBDPhoneNumber(senderMobile);
      if (!cleanSender) {
        errs.senderMobile = t(`যে নম্বর থেকে টাকা পাঠিয়েছেন সেই ১১ ডিজিটের ${currentGateway.name} নম্বর লিখুন`, `Enter the 11-digit ${currentGateway.name} number you paid from`);
      } else if (!isValidBDMobileNumber(cleanSender)) {
        errs.senderMobile = t('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (০১৩ থেকে ০১৯ দিয়ে শুরু)', 'Enter a valid 11-digit mobile number starting with 013 to 019');
      }
      if (!transactionId.trim()) {
        errs.transactionId = t('পেমেন্টের ট্রানজেকশন আইডি (TrxID) লিখুন', 'Enter the payment Transaction ID (TrxID)');
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      return;
    }

    if (itemsList.length === 0) {
      setErrors({ general: 'Cart is empty. Please add items to checkout.' });
      return;
    }

    setIsSubmitting(true);

    const generatedOrderId = 'KB-' + Math.floor(100000 + Math.random() * 900000);
    const nowISO = new Date().toISOString();

    // Map payment method name
    let methodTitle: PaymentMethod = 'Cash on Delivery';
    if (paymentOptionType !== 'cod') {
      methodTitle = currentGateway ? currentGateway.name : selectedGatewayId;
    }

    // If guest, search existing customer records by Email or Mobile to prevent duplicates
    let finalCustomerId = currentCustomer?.id;
    if (!currentCustomer) {
      const guestEmail = customerEmail.trim().toLowerCase();
      const guestMobileDigits = (customerMobile.trim() || deliveryMobile.trim()).replace(/[^0-9]/g, '');

      let cachedCusts: CustomerRecord[] = [];
      try {
        const c = localStorage.getItem('kenax_customers_cache');
        if (c) cachedCusts = JSON.parse(c);
      } catch {}

      const allCusts = mergeCustomersLists(INITIAL_CUSTOMERS, cachedCusts);
      const existingMatched = allCusts.find((c) => {
        if (guestEmail && c.email && c.email.trim().toLowerCase() === guestEmail) return true;
        if (guestMobileDigits) {
          const custDigits = (c.mobile || '').replace(/[^0-9]/g, '');
          if (custDigits && (custDigits === guestMobileDigits || (guestMobileDigits.length >= 10 && custDigits.endsWith(guestMobileDigits.slice(-10))))) return true;
        }
        return false;
      });

      if (existingMatched) {
        finalCustomerId = existingMatched.id;
        const updatedCustomer: CustomerRecord = {
          ...existingMatched,
          totalOrders: (existingMatched.totalOrders || 0) + 1,
          ordersCount: (existingMatched.ordersCount || 0) + 1,
          totalSpent: (existingMatched.totalSpent || 0) + finalTotal,
        };
        saveCustomerToDB(updatedCustomer).catch(() => {});
      } else {
        finalCustomerId = 'cust-' + Date.now();
        const newCustomer: CustomerRecord = {
          id: finalCustomerId,
          name: customerName.trim() || deliveryName.trim(),
          email: guestEmail,
          mobile: customerMobile.trim() || deliveryMobile.trim(),
          password: guestPassword,
          status: 'active',
          totalOrders: 1,
          ordersCount: 1,
          totalSpent: finalTotal,
          isBlocked: false,
          registeredAt: nowISO,
          savedAddresses: [
            {
              id: 'addr-' + Date.now(),
              label: 'Default Address',
              name: deliveryName.trim() || customerName.trim(),
              mobile: deliveryMobile.trim() || customerMobile.trim(),
              division,
              district,
              upazila,
              area: area.trim() || upazila,
              fullAddress: fullAddress.trim(),
              isDefault: true,
            },
          ],
          createdAt: nowISO,
        };

        try {
          await saveCustomerToDB(newCustomer);
          if (onCustomerCreated) {
            onCustomerCreated(newCustomer);
          }
        } catch (err) {
          console.warn('Auto guest customer creation fallback:', err);
        }
      }
    }

    const orderData: Order = {
      id: generatedOrderId,
      customerId: finalCustomerId || 'cust-guest',
      customerName: customerName.trim() || deliveryName.trim(),
      customerEmail: customerEmail.trim() || 'customer@kenaxbd.com',
      customerMobile: customerMobile.trim() || deliveryMobile.trim(),
      customerPhone: customerMobile.trim() || deliveryMobile.trim(),
      phone: customerMobile.trim() || deliveryMobile.trim(),
      mobile: customerMobile.trim() || deliveryMobile.trim(),

      // Immutable Delivery Snapshot
      deliveryName: deliveryName.trim() || customerName.trim(),
      deliveryMobile: deliveryMobile.trim() || customerMobile.trim(),
      division,
      district,
      upazila,
      area: area.trim() || upazila,
      houseRoad: houseRoad.trim() || '',
      fullAddress: fullAddress.trim(),
      shippingAddress: fullAddress.trim(),
      address: fullAddress.trim(),
      postalCode: postalCode.trim() || '',
      deliveryInstructions: deliveryInstructions.trim() || '',

      items: itemsList,
      subtotal,
      deliveryCharge,
      discount: discountAmount,
      couponCode: couponCode || '',
      totalAmount: finalTotal,

      // Payment Details
      paymentMethod: methodTitle,
      paymentOptionType,
      paymentStatus:
        paymentOptionType === 'cod'
          ? 'Paid on Delivery'
          : 'Pending Verification',
      senderMobileNumber: paymentOptionType !== 'cod' ? senderMobile.trim() : undefined,
      transactionId: paymentOptionType !== 'cod' ? transactionId.trim() : undefined,
      paidAmount: advanceAmountPayable,
      dueAmount: dueOnDelivery,

      orderStatus: 'Pending',
      courierName: district.toLowerCase().includes('dhaka') ? 'Steadfast Courier' : 'Pathao Courier',
      trackingNumber: `TRK-${generatedOrderId}`,
      trackingUrl: `https://kenaxbd.com/track?id=${generatedOrderId}`,
      estimatedDelivery:
        selectedDeliveryMethod === 'inside'
          ? '24-48 Hours (Inside Dhaka)'
          : '3-5 Days (Outside Dhaka)',

      timeline: [
        {
          status: 'Pending',
          timestamp: nowISO,
          note: `Order received via ${methodTitle} (${
            paymentOptionType === 'cod'
              ? 'Cash on Delivery'
              : paymentOptionType === 'full'
              ? 'Full Advance'
              : 'Delivery Charge Advance'
          }). Total: ৳${finalTotal}. Awaiting processing.`,
        },
        ...(paymentOptionType !== 'cod' && transactionId
          ? [
              {
                status: 'Payment Verification' as const,
                timestamp: nowISO,
                note: `Payment TrxID ${transactionId} submitted. Paid: ৳${advanceAmountPayable}`,
              },
            ]
          : []),
      ],
      source: orderSource === 'chatbot' ? 'Ordered by KenaX Bot' : 'Website Store',
      orderSource: orderSource === 'chatbot' ? 'chatbot' : 'manual',
      sourceChannel: orderSource === 'chatbot' ? 'Ordered by KenaX Bot' : 'Website Store',
      isAiBotOrder: orderSource === 'chatbot',
      createdByStaffName: orderSource === 'chatbot' ? 'Ordered by KenaX Bot' : undefined,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // Trigger Android SIM SMS / Gateway & Email Invoice notifications & WhatsApp Automation
    triggerOrderPlacedSMS(orderData).catch(() => {});
    triggerOrderPlacedWorkflow(orderData).catch((emailErr) => {
      console.warn('[Checkout Order Placed Email Workflow]:', emailErr);
    });
    triggerWhatsAppEvent({
      event: 'order_placed',
      order: orderData,
      customerPhone: orderData.customerMobile || orderData.deliveryMobile,
      user: {
        name: orderData.customerName,
        email: orderData.customerEmail,
        phone: orderData.customerMobile || orderData.deliveryMobile,
        id: orderData.customerId,
      },
    }).catch((waErr) => {
      console.warn('[Checkout WhatsApp Event Error]:', waErr);
    });

    if (isTelegramWebApp()) {
      triggerHaptic('success');
    }

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(orderData);
    }, 150);
  };

  const availableDistricts = Object.keys(BANGLADESH_LOCATIONS[division]?.districts || {});
  const availableUpazilas = BANGLADESH_LOCATIONS[division]?.districts[district]?.upazilas || [];

  const isPageView = mode === 'page';

  return (
    <div
      className={
        isPageView
          ? 'w-full relative pb-24 lg:pb-0'
          : 'fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 pb-24 lg:pb-6 overscroll-contain'
      }
    >
      <div
        className={
          isPageView
            ? 'relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-5xl w-full shadow-lg overflow-hidden border border-slate-200/90 dark:border-slate-800 animate-in fade-in duration-150 mx-auto text-slate-900 dark:text-slate-100'
            : 'relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto text-slate-900 dark:text-slate-100'
        }
      >
        {/* Header - Shown in Modal mode */}
        {!isPageView && (
          <div className="px-4 sm:px-6 py-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {t('চেকআউট ও ডেলিভারি তথ্য', 'Checkout & Delivery Information')}
              </h2>
            </div>
            <button
              onClick={onBackToShopping || onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
              title={t('বন্ধ করুন', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-12 ${isPageView ? 'overflow-visible' : 'max-h-[84vh] overflow-y-auto'}`}>
          {/* Left / Main Column: Customer & Delivery Form */}
          <div className="lg:col-span-7 p-3.5 sm:p-5 md:p-6 space-y-4 pb-8 lg:pb-6">
            {/* Quick Address Presets from real customer saved addresses */}
            {savedAddresses && savedAddresses.length > 0 && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  {t('সংরক্ষিত ঠিকানা:', 'Saved Address:')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => applyPresetAddress(addr)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        selectedAddressPreset === addr.id
                          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs ring-1 ring-sky-500/30'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {addr.label === 'Home' ? (
                        <Home className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      ) : (
                        <Briefcase className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      )}
                      <span>{addr.label === 'Home' ? t('বাসা', 'Home') : addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 px-1 py-0.2 rounded font-bold">
                          {t('ডিফল্ট', 'Default')}
                        </span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressPreset('custom');
                      setFullAddress('');
                      setHouseRoad('');
                      setArea('');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      selectedAddressPreset === 'custom'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{t('+ নতুন', '+ New')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1. Customer Information & Delivery Address (Unified Layer) */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  <span>{t('কাস্টমার ডিটেইলস', 'Customer Details')}</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {/* Your Name */}
                <div>
                  <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                    {t('ইউর নেম (আপনার নাম)', 'Your Name')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setDeliveryName(e.target.value);
                      }}
                      placeholder={t('আপনার নাম লিখুন', 'Enter your name')}
                      className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                        errors.name ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                      } focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all`}
                    />
                  </div>
                  {errors.name && <p className="text-[10px] text-rose-500 mt-0.5">{errors.name}</p>}
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                    {t('মোবাইল নাম্বার (১১ ডিজিট)', 'Mobile Number (11-Digit)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={customerMobile}
                    onChange={(e) => {
                      const cleaned = cleanBDPhoneNumber(e.target.value);
                      setCustomerMobile(cleaned);
                      setDeliveryMobile(cleaned);
                      if (errors.mobile) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.mobile;
                          return n;
                        });
                      }
                    }}
                    placeholder="017XXXXXXXX"
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      errors.mobile ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                    } focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all`}
                  />
                  {errors.mobile && <p className="text-[10px] text-rose-500 mt-0.5">{errors.mobile}</p>}
                </div>
              </div>

              {/* Full Permanent Address - Directly inside Customer Details Layer */}
              <div>
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                  <span>{t('ফুল পার্মানেন্ট অ্যাড্রেস (সম্পূর্ণ ডেলিভারি ঠিকানা)', 'Full Permanent Address')}</span> <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => {
                    setFullAddress(e.target.value);
                    if (errors.address) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.address;
                        return n;
                      });
                    }
                  }}
                  placeholder={t('বাসা নং, রোড নং, গ্রাম/এলাকা, থানা ও জেলা সহ সম্পূর্ণ স্থায়ী ঠিকানা লিখুন...', 'Enter complete permanent address including House/Road, Area, Thana & District...')}
                  className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                    errors.address ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                  } focus:ring-2 focus:ring-sky-500 transition-all leading-relaxed`}
                />
                {errors.address && <p className="text-[10px] text-rose-500 mt-0.5">{errors.address}</p>}
              </div>

              {/* Create an Account Checkbox & Expandable Fields for Logged-Out Guests (Mobile & Desktop) */}
              {!currentCustomer ? (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={shouldCreateAccount}
                      onChange={(e) => {
                        setShouldCreateAccount(e.target.checked);
                        if (!e.target.checked) {
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.email;
                            delete n.password;
                            return n;
                          });
                        }
                      }}
                      className="w-4 h-4 rounded-md text-sky-600 border-slate-300 dark:border-slate-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {t('একটি অ্যাকাউন্ট তৈরি করুন (Create an Account)', 'Create an account')}
                    </span>
                  </label>

                  {/* Expandable Email & Password Inputs */}
                  {shouldCreateAccount && (
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 shadow-2xs animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                          {t('ইমেইল অ্যাড্রেস', 'Email Address')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            if (errors.email) {
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.email;
                                return n;
                              });
                            }
                          }}
                          placeholder="yourname@gmail.com"
                          className={`w-full px-3 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                            errors.email ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                          } focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all`}
                        />
                        {errors.email && <p className="text-[10px] text-rose-500 mt-0.5">{errors.email}</p>}
                      </div>

                      <div>
                        <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                          {t('পাসওয়ার্ড তৈরি করুন', 'Create Password')} <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={guestPassword}
                            onChange={(e) => {
                              setGuestPassword(e.target.value);
                              if (errors.password) {
                                setErrors((prev) => {
                                  const n = { ...prev };
                                  delete n.password;
                                  return n;
                                });
                              }
                            }}
                            placeholder={t('ন্যূনতম ৪ অক্ষরের পাসওয়ার্ড', 'Min. 4 characters')}
                            className={`w-full pl-3 pr-8 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                              errors.password ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                            } focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition-all`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-[10px] text-rose-500 mt-0.5">{errors.password}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{t('কাস্টমার অ্যাকাউন্ট:', 'Customer Account:')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{currentCustomer.name}</span>
                  </span>
                </div>
              )}

              {/* Optional Selectors - Desktop Only */}
              <div className="hidden sm:block space-y-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  {/* Division */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('বিভাগ', 'Division')}
                    </label>
                    <select
                      value={division}
                      onChange={(e) => handleDivisionChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {Object.keys(BANGLADESH_LOCATIONS).map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('জেলা', 'District')}
                    </label>
                    <select
                      value={district}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {availableDistricts.map((dist) => (
                        <option key={dist} value={dist}>
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upazila / Thana */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('থানা / উপজেলা', 'Thana / Upazila')}
                    </label>
                    <select
                      value={upazila}
                      onChange={(e) => setUpazila(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      {availableUpazilas.map((upz) => (
                        <option key={upz} value={upz}>
                          {upz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Delivery Method - Inside Dhaka & Outside Dhaka */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 sm:p-3.5 space-y-2">
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                <span>{t('ডেলিভারি মেথড', 'Delivery Method')}</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {/* Inside Dhaka */}
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryMethod('inside')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    selectedDeliveryMethod === 'inside'
                      ? 'border-sky-600 dark:border-sky-500 bg-white dark:bg-slate-900 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{t('ঢাকার ভেতরে', 'Inside Dhaka')}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-black text-sky-700 dark:text-sky-400">
                        {subtotal >= 5000 ? t('ফ্রি', 'FREE') : `৳${siteSettings?.insideDhakaDeliveryFee ?? defaultInsideCityFee}`}
                      </span>
                      {selectedDeliveryMethod === 'inside' && (
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Outside Dhaka */}
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryMethod('outside')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    selectedDeliveryMethod === 'outside'
                      ? 'border-sky-600 dark:border-sky-500 bg-white dark:bg-slate-900 ring-2 ring-sky-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{t('ঢাকার বাইরে', 'Outside Dhaka')}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-black text-sky-700 dark:text-sky-400">
                        ৳{siteSettings?.outsideDhakaDeliveryFee ?? defaultOutsideCityFee}
                      </span>
                      {selectedDeliveryMethod === 'outside' && (
                        <CheckCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Payment Method - Horizontal Compact Layout with Icons on Mobile */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
              <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                <span>{t('পেমেন্ট মেথড', 'Payment Method')}</span>
              </h3>

              {/* Horizontal 3-Column Compact Grid with Icons */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {/* A. Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => setPaymentOptionType('cod')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col justify-between items-center sm:items-stretch relative ${
                    paymentOptionType === 'cod'
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/25 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex sm:flex-row flex-col items-center sm:items-start gap-1 sm:gap-2 w-full">
                    <div className={`w-7 h-7 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      paymentOptionType === 'cod'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight block truncate">
                        {t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}
                      </span>
                      <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t('পণ্য পেয়ে টাকা দিন', 'Pay upon delivery')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 sm:mt-2 flex items-center justify-center sm:justify-between w-full">
                    <span className="text-[11px] sm:text-xs font-black text-emerald-700 dark:text-emerald-400">
                      ৳{finalTotal}
                    </span>
                    {paymentOptionType === 'cod' && (
                      <CheckCircle className="hidden sm:inline w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* B. Full Advance */}
                <button
                  type="button"
                  onClick={() => setPaymentOptionType('full')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col justify-between items-center sm:items-stretch relative ${
                    paymentOptionType === 'full'
                      ? 'border-sky-600 dark:border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/25 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex sm:flex-row flex-col items-center sm:items-start gap-1 sm:gap-2 w-full">
                    <div className={`w-7 h-7 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      paymentOptionType === 'full'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                    }`}>
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight block truncate">
                        {t('সম্পূর্ণ অগ্রিম', 'Full Advance')}
                      </span>
                      <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t('বিকাশ, নগদ, রকেট', 'bKash, Nagad, Rocket')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 sm:mt-2 flex items-center justify-center sm:justify-between w-full">
                    <span className="text-[11px] sm:text-xs font-black text-sky-700 dark:text-sky-400">
                      ৳{finalTotal}
                    </span>
                    {paymentOptionType === 'full' && (
                      <CheckCircle className="hidden sm:inline w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </div>
                </button>

                {/* C. Delivery Charge Advance */}
                <button
                  type="button"
                  onClick={() => setPaymentOptionType('delivery_only')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-center sm:text-left transition-all cursor-pointer flex flex-col justify-between items-center sm:items-stretch relative ${
                    paymentOptionType === 'delivery_only'
                      ? 'border-amber-600 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/25 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex sm:flex-row flex-col items-center sm:items-start gap-1 sm:gap-2 w-full">
                    <div className={`w-7 h-7 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      paymentOptionType === 'delivery_only'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] sm:text-xs font-black text-slate-900 dark:text-white leading-tight block truncate">
                        {t('ডেলিভারি চার্জ', 'Delivery Charge')}
                      </span>
                      <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {t('শুধু ডেলিভারি ফি অগ্রিম', 'Advance delivery fee')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1 sm:mt-2 flex items-center justify-center sm:justify-between w-full">
                    <span className="text-[11px] sm:text-xs font-black text-amber-700 dark:text-amber-400">
                      ৳{deliveryCharge}
                    </span>
                    {paymentOptionType === 'delivery_only' && (
                      <CheckCircle className="hidden sm:inline w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </div>
                </button>
              </div>

              {/* Mobile Banking & Gateway Box if Full Advance or Delivery Charge is selected */}
              {paymentOptionType !== 'cod' && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs space-y-3 shadow-2xs animate-in fade-in duration-150">
                  {/* Provider Tabs */}
                  <div>
                    <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('গেটওয়ে নির্বাচন করুন:', 'Select Gateway:')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {activeGateways.map((gw) => {
                        const isCard =
                          gw.accountType === 'Card' ||
                          gw.name.toLowerCase().includes('card') ||
                          gw.name.toLowerCase().includes('visa') ||
                          gw.name.toLowerCase().includes('master');
                        const isBank =
                          gw.accountType === 'Bank' ||
                          gw.name.toLowerCase().includes('bank') ||
                          gw.name.toLowerCase().includes('cellfin');

                        return (
                          <button
                            key={gw.id}
                            type="button"
                            onClick={() => setSelectedGatewayId(gw.id)}
                            className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              selectedGatewayId === gw.id
                                ? 'border-sky-600 dark:border-sky-500 bg-sky-600 text-white shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {isCard ? (
                              <CreditCard className="w-3.5 h-3.5 shrink-0" />
                            ) : isBank ? (
                              <Building className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{gw.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Compact & Beautiful Gateway Details Box for Mobile/Desktop */}
                  <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2">
                    {/* Single Clean Line: Account Number + Copy Icon Only + Dynamic Send Money Badge */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden sm:inline shrink-0">
                          {currentGateway.name}:
                        </span>
                        <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white tracking-wider truncate select-all">
                          {currentGateway.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber(currentGateway.accountNumber)}
                          className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-90 shrink-0"
                          title={copiedNumber ? t('কপি হয়েছে!', 'Copied!') : t('নম্বর কপি করুন', 'Copy number')}
                          aria-label="Copy Account Number"
                        >
                          {copiedNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Transaction Type badge set by Admin */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700 whitespace-nowrap shrink-0 shadow-2xs">
                        {currentGateway.txType || 'Send Money'}
                      </span>
                    </div>

                    {/* Payable Now Amount Highlight */}
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400">{t('এখন প্রদেয়:', 'Payable Now:')}</span>
                      <span className="font-black text-sm text-sky-700 dark:text-sky-400">
                        ৳ {advanceAmountPayable.toLocaleString('en-BD')}
                      </span>
                    </div>

                    {paymentOptionType === 'delivery_only' && (
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-50/70 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                        * {t('বাকি টাকা', 'Remaining balance')} <b>৳{dueOnDelivery.toLocaleString('en-BD')}</b> {t('পণ্য পাওয়ার পর ডেলিভারিম্যানকে দিতে হবে।', 'to be paid upon delivery.')}
                      </p>
                    )}

                    {/* Admin Instructions */}
                    {currentGateway.instructions && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 leading-relaxed">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase tracking-wider mb-0.5">
                          {t('পেমেন্ট নির্দেশিকা:', 'Payment Instructions:')}
                        </span>
                        {currentGateway.instructions}
                      </div>
                    )}
                  </div>

                  {/* Sender Number & TrxID inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        {t('প্রেরকের মোবাইল নম্বর (১১ ডিজিট)', 'Sender Mobile Number (11-Digit)')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        value={senderMobile}
                        onChange={(e) => {
                          const cleaned = cleanBDPhoneNumber(e.target.value);
                          setSenderMobile(cleaned);
                          if (errors.senderMobile) {
                            setErrors((prev) => {
                              const n = { ...prev };
                              delete n.senderMobile;
                              return n;
                            });
                          }
                        }}
                        placeholder="017XXXXXXXX"
                        className={`w-full px-2.5 py-2 text-xs font-mono rounded-xl border ${
                          errors.senderMobile ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                        } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-sky-500 transition-all`}
                      />
                      {errors.senderMobile && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">{errors.senderMobile}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        {t('ট্রানজেকশন আইডি (TrxID)', 'Transaction ID (TrxID)')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                        placeholder="e.g. 9J2B81X4A"
                        className={`w-full px-2.5 py-2 text-xs rounded-xl border ${
                          errors.transactionId ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700'
                        } bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono uppercase focus:ring-2 focus:ring-sky-500 transition-all`}
                      />
                      {errors.transactionId && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">{errors.transactionId}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Placement */}
          <div className="lg:col-span-5 p-4 sm:p-5 md:p-6 bg-slate-50/80 dark:bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between pb-14 sm:pb-6 lg:pb-6">
            <div>
              {/* Cart Items Confirmation / Inclusion Card (Positioned at Top of Right Column) */}
              {otherCartItems.length > 0 && (
                <div className="mb-3.5 p-3 sm:p-3.5 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-50/80 dark:from-slate-850 dark:via-slate-800 dark:to-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/60 rounded-2xl shadow-xs space-y-2.5 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs text-xs font-bold">
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-none truncate">
                          {t('আপনার কার্টের পণ্য', 'Items in Your Cart')} ({otherCartItems.length})
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          {t('একত্রে অর্ডার করুন', 'Combine and checkout together')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddAllCartItemsToCheckout}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>{t('সব যোগ করুন', 'Add All')} (+৳{otherCartItemsTotal.toLocaleString('en-BD')})</span>
                    </button>
                  </div>

                  {/* List of other cart items */}
                  <div className="space-y-1.5 max-h-36 sm:max-h-44 overflow-y-auto pr-1">
                    {otherCartItems.map((cItem, idx) => {
                      const p = (products || []).find((pr) => pr.id === cItem.productId);
                      return (
                        <div
                          key={cItem.productId + (cItem.variant || '') + idx}
                          className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <CartItemImage
                              item={cItem}
                              product={p}
                              sizeClassName="w-9 h-9 rounded-lg shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug" title={cItem.productName}>
                                {cItem.productName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  ৳{cItem.price.toLocaleString('en-BD')}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">× {cItem.quantity}</span>
                                {cItem.variant && (
                                  <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800">
                                    {cItem.variant}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSingleCartItemToCheckout(cItem)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 hover:text-indigo-600 dark:hover:text-indigo-300 active:bg-indigo-100 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold shrink-0 transition-all border border-slate-200 dark:border-slate-600 hover:border-indigo-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                            <span>{t('যোগ করুন', 'Add')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Variations Card (Positioned right above Order Summary) */}
              {itemsList.some((item) => {
                const p = (products || []).find((pr) => pr.id === item.productId);
                return (p?.colors && p.colors.length > 0) || (p?.sizes && p.sizes.length > 0);
              }) && (
                <div className="mb-3.5 p-3 sm:p-3.5 bg-white dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center text-xs">
                        <Palette className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('ভেরিয়েশন নির্বাচন করুন', 'Select Variations')}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {itemsList.map((item, originalIndex) => {
                      const prod = (products || []).find((p) => p.id === item.productId);
                      const availableColors = prod?.colors && prod.colors.length > 0 ? prod.colors : [];
                      const availableSizes = prod?.sizes && prod.sizes.length > 0 ? prod.sizes : [];

                      if (availableColors.length === 0 && availableSizes.length === 0) return null;

                      return (
                        <div
                          key={`${item.productId}_${item.variant || ''}_${originalIndex}`}
                          className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <CartItemImage
                              item={item}
                              product={prod}
                              sizeClassName="w-10 h-10 rounded-lg shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={item.productName}>
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                {item.selectedColor && (
                                  <span className="font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800">
                                    {t('রং:', 'Color:')} {item.selectedColor}
                                  </span>
                                )}
                                {item.selectedSize && (
                                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                    {t('সাইজ:', 'Size:')} {item.selectedSize}
                                  </span>
                                )}
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  ৳{item.price.toLocaleString('en-BD')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Color Selector */}
                          {availableColors.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {t('রং:', 'Color:')}{' '}
                                  <b className="text-sky-600 dark:text-sky-400 font-extrabold">{item.selectedColor || t('রং বেছে নিন', 'Choose Color')}</b>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {availableColors.map((col) => {
                                  const isSelected = item.selectedColor === col.name;
                                  return (
                                    <button
                                      key={col.name}
                                      type="button"
                                      onClick={() => handleSelectColorForProduct(item.productId, col, originalIndex)}
                                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'border-sky-600 dark:border-sky-500 bg-sky-50 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/25 shadow-2xs'
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {col.imageUrl && col.imageUrl.trim() !== '' ? (
                                        <img
                                          src={getOptimizedImageUrl(col.imageUrl, 200)}
                                          alt={col.name}
                                          referrerPolicy="no-referrer"
                                          onError={(e) => handleImageError(e, col.imageUrl)}
                                          className="w-3.5 h-3.5 rounded-sm object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                                        />
                                      ) : (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                                          style={{ backgroundColor: col.hexCode || col.colorCode || '#94a3b8' }}
                                        />
                                      )}
                                      <span>{col.name}</span>
                                      {isSelected && <Check className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Size Selector */}
                          {availableSizes.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">
                                {t('সাইজ:', 'Size:')}{' '}
                                <b className="text-indigo-600 dark:text-indigo-400 font-extrabold">{item.selectedSize || t('সাইজ বেছে নিন', 'Choose Size')}</b>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {availableSizes.map((sz) => {
                                  const isSelected = item.selectedSize === sz;
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => handleSelectSizeForProduct(item.productId, sz, originalIndex)}
                                      className={`min-w-[32px] px-2 py-0.5 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xs'
                                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {sz}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Quantity Selector under Size */}
                          <div className="pt-2 mt-1 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {t('পরিমাণ:', 'Quantity:')}
                            </span>
                            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 h-7 px-1 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.productId, Math.max(1, item.quantity - 1), originalIndex)}
                                disabled={item.quantity <= 1}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 disabled:opacity-40 rounded font-black text-xs transition-colors cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="text-xs font-black text-slate-900 dark:text-white px-2 select-none min-w-[20px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.productId, item.quantity + 1, originalIndex)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 rounded font-black text-xs transition-colors cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {t('অর্ডার বিবরণী', 'Order Summary')} ({itemsList.length} {t('টি পণ্য', itemsList.length === 1 ? 'item' : 'items')})
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{t('পরিবর্তনযোগ্য', 'Editable')}</span>
              </div>

              {/* Items List with Removal Capability */}
              {itemsList.length === 0 ? (
                <div className="p-5 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                  <p>{t('আপনার কার্ট খালি আছে।', 'Your cart is empty.')}</p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {t('শপিং চালিয়ে যান', 'Continue Shopping')}
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                  {itemsList.map((item, index) => {
                    const prod = (products || []).find((p) => p.id === item.productId);
                    return (
                      <div
                        key={item.productId + (item.variant || '') + index}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs group"
                      >
                        <CartItemImage
                          item={item}
                          product={prod}
                          sizeClassName="w-10 h-10 sm:w-11 sm:h-11 rounded-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={item.productName}>
                            {item.productName}
                          </p>
                        {item.selectedColor || item.selectedSize ? (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {item.selectedColor && (
                              <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-200 dark:border-sky-800">
                                {item.selectedColor}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                                Size: {item.selectedSize}
                              </span>
                            )}
                          </div>
                        ) : item.variant ? (
                          <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 truncate">
                            {item.variant}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 h-5 px-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.productId, Math.max(1, item.quantity - 1), index)}
                              disabled={item.quantity <= 1}
                              className="w-4 h-4 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded text-[10px] font-bold cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-black text-slate-900 dark:text-white px-1 select-none min-w-[14px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantity(item.productId, item.quantity + 1, index)}
                              className="w-4 h-4 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[10px] font-bold cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            × ৳{item.price.toLocaleString('en-BD')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                        </span>
                        {/* Remove item button - ONLY allowed if there are strictly more than 1 item */}
                        {itemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProductItem(item.productId, index)}
                            className="p-1 rounded-lg text-slate-300 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Price Calculation in ৳ BDT */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t('সাবটোটাল', 'Subtotal')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">৳ {subtotal.toLocaleString('en-BD')}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{t('ডিসকাউন্ট', 'Discount')} ({couponCode})</span>
                    <span>- ৳ {discountAmount.toLocaleString('en-BD')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t('ডেলিভারি চার্জ', 'Delivery Charge')}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {deliveryCharge === 0 ? t('ফ্রি', 'FREE') : `৳ ${deliveryCharge}`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  <span>{t('সর্বমোট মূল্য', 'Total Amount')}</span>
                  <span className="text-sky-600 dark:text-sky-400">৳ {finalTotal.toLocaleString('en-BD')}</span>
                </div>

                {/* Dynamic breakdown based on payment method */}
                {paymentOptionType === 'delivery_only' && (
                  <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[10px] sm:text-[11px] space-y-0.5">
                    <div className="flex justify-between text-amber-900 dark:text-amber-300 font-bold">
                      <span>{t('অগ্রিম (ডেলিভারি চার্জ):', 'Advance (Delivery Charge):')}</span>
                      <span>৳ {advanceAmountPayable}</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold">
                      <span>{t('ডেলিভারিতে প্রদেয়:', 'Due on Delivery:')}</span>
                      <span>৳ {dueOnDelivery}</span>
                    </div>
                  </div>
                )}

                {paymentOptionType === 'full' && (
                  <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[10px] sm:text-[11px] flex justify-between text-emerald-900 dark:text-emerald-300 font-bold">
                    <span>{t('সম্পূর্ণ অগ্রিম পরিশোধিত:', 'Full Advance Paid:')}</span>
                    <span>৳ {finalTotal} {t('(বাকি: ৳০)', '(Due: ৳0)')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Place Order CTA with Premium Dark Styling & Smooth Animation */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmitting || cartItems.length === 0}
                onClick={handlePlaceOrder}
                className="relative overflow-hidden w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg animate-dark-glow transition-all duration-300 cursor-pointer active:scale-[0.98] disabled:opacity-50 group border border-slate-800 dark:border-sky-500"
              >
                {/* Smooth Shimmering Lightning Sheen Animation */}
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none rounded-xl">
                  <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-25deg] animate-shine" />
                </div>

                {isSubmitting ? (
                  <span className="relative z-10 flex items-center gap-2 text-slate-200">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('অর্ডার প্রসেস হচ্ছে...', 'Processing Order...')}
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    <span className="tracking-wide text-white">{t('অর্ডার নিশ্চিত করুন', 'Place Order')} (৳{finalTotal.toLocaleString('en-BD')})</span>
                    <ArrowRight className="w-4 h-4 text-sky-400 dark:text-white transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5">
                {t('অর্ডার কনফার্ম করার মাধ্যমে আপনি শর্তাবলী ও ডেলিভারি নীতিমালার সাথে একমত হচ্ছেন।', 'By placing order, you agree to KenaX BD terms & delivery policy.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed Bottom Sticky Order Bar for Instant 1-Tap Checkout */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 p-2.5 px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block leading-none">{t('সর্বমোট প্রদেয়', 'Total Payable')}</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">৳{finalTotal.toLocaleString('en-BD')}</span>
        </div>
        <button
          type="button"
          disabled={isSubmitting || cartItems.length === 0}
          onClick={handlePlaceOrder}
          className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('অর্ডার হচ্ছে...', 'Processing...')}</span>
            </span>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{t('অর্ডার নিশ্চিত করুন', 'Place Order')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-sky-400 dark:text-white" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
