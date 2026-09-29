import { Product } from '../types/index.ts';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'upcoming';

export function getProductStockStatus(product?: Partial<Product> | null): StockStatus {
  if (!product) return 'in_stock';
  
  if (product.stockStatus === 'out_of_stock') return 'out_of_stock';
  if (product.stockStatus === 'upcoming') return 'upcoming';
  if (product.stockStatus === 'in_stock') return 'in_stock';
  
  // Fallback for legacy numeric stock values if stockStatus property is absent
  if (typeof product.stock === 'number' && product.stock <= 0) {
    return 'out_of_stock';
  }
  
  return 'in_stock';
}

export function getStockStatusInfo(status: StockStatus) {
  switch (status) {
    case 'out_of_stock':
      return {
        status: 'out_of_stock' as const,
        labelEn: 'Out of Stock',
        labelBn: 'আউট অফ স্টক',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        canPurchase: false,
        buttonText: 'Out of Stock',
        buttonTextBn: 'আউট অফ স্টক',
      };
    case 'upcoming':
      return {
        status: 'upcoming' as const,
        labelEn: 'Upcoming',
        labelBn: 'আপকামিং',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500 animate-pulse',
        canPurchase: false,
        buttonText: 'Upcoming',
        buttonTextBn: 'আপকামিং',
      };
    case 'in_stock':
    default:
      return {
        status: 'in_stock' as const,
        labelEn: 'In Stock',
        labelBn: 'ইন স্টক',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        canPurchase: true,
        buttonText: 'Add to Cart',
        buttonTextBn: 'কার্টে যোগ করুন',
      };
  }
}
