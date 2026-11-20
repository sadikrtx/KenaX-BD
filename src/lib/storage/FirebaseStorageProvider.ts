/**
 * FirebaseStorageProvider
 *
 * Dedicated to official KenaX BD main store products, homepage assets,
 * customer authentication, and core database synchronization.
 *
 * NOTE: Per the system specification, Firebase remains the primary storage provider
 * for official KenaX BD website assets.
 */
export class FirebaseStorageProvider {
  /**
   * Identifies if a product or asset is managed by Firebase Storage / Official Store
   */
  static isOfficialStoreAsset(item: { sellerId?: string; storageProvider?: string }): boolean {
    if (item.storageProvider === 'FIREBASE') return true;
    if (!item.sellerId || item.sellerId === 'official' || item.sellerId === 'kenax_official') {
      return true;
    }
    return false;
  }
}
