import { OrderItem } from '../types/index.ts';

/**
 * Deduplicates and consolidates cart items by productId and normalized variant/color.
 * Ensures that adding the same product or variant multiple times increments the quantity
 * instead of creating duplicate separate rows in the cart.
 */
export function sanitizeCart(items: OrderItem[]): OrderItem[] {
  if (!items || !Array.isArray(items)) return [];
  const map = new Map<string, OrderItem>();

  for (const item of items) {
    if (!item || !item.productId) continue;
    const normalizedVariant = (item.variant || '').replace(/\s+/g, '').toLowerCase();
    const normalizedColor = (item.selectedColor || '').replace(/\s+/g, '').toLowerCase();
    const key = `${item.productId}__${normalizedVariant}__${normalizedColor}`;

    if (map.has(key)) {
      const existing = map.get(key)!;
      const newQty = existing.quantity + (item.quantity || 1);
      map.set(key, {
        ...existing,
        quantity: newQty,
        total: newQty * existing.price,
        productImage: item.productImage && !item.productImage.startsWith('media://') ? item.productImage : existing.productImage,
        selectedColor: item.selectedColor || existing.selectedColor,
        selectedColorImage: item.selectedColorImage || existing.selectedColorImage,
        selectedSize: item.selectedSize || existing.selectedSize,
      });
    } else {
      map.set(key, {
        ...item,
        quantity: item.quantity || 1,
        total: (item.quantity || 1) * item.price,
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Determines whether two order items represent the same product/variant choice.
 */
export function isSameCartItem(itemA: OrderItem, itemB: OrderItem): boolean {
  if (!itemA || !itemB) return false;
  if (itemA.productId !== itemB.productId) return false;

  const vA = (itemA.variant || '').replace(/\s+/g, '').toLowerCase();
  const vB = (itemB.variant || '').replace(/\s+/g, '').toLowerCase();

  if (vA === vB) return true;
  if (!vA || !vB) return true; // If one side has no explicit variant, treat as same item
  if (
    itemA.selectedColor &&
    itemB.selectedColor &&
    itemA.selectedColor.replace(/\s+/g, '').toLowerCase() === itemB.selectedColor.replace(/\s+/g, '').toLowerCase()
  ) {
    return true;
  }

  return false;
}
