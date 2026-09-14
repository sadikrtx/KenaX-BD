import { db } from './index.ts';
import { products } from './schema.ts';
import { eq } from 'drizzle-orm';
import { Product } from '../types/index.ts';

export async function getAllProductsFromSQL(): Promise<Product[]> {
  try {
    const rows = await db.select().from(products);
    return rows.map((row) => {
      if (row.payload && typeof row.payload === 'object') {
        return row.payload as Product;
      }
      return {
        id: row.id,
        name: row.name,
        banglaName: row.banglaName || undefined,
        category: row.category,
        subcategory: row.subcategory || undefined,
        brand: row.brand || 'KenaX BD',
        price: row.price,
        originalPrice: row.originalPrice,
        costPrice: row.costPrice || undefined,
        discountPercent: row.discountPercent || undefined,
        stock: row.stock ?? 100,
        sku: row.sku,
        images: (row.images as string[]) || [],
        videoUrl: row.videoUrl || undefined,
        description: row.description || '',
        specifications: (row.specifications as Record<string, string>) || {},
        productType: (row.productType as any) || 'own',
        supplierName: row.supplierName || undefined,
        supplierUrl: row.supplierUrl || undefined,
        supplierSku: row.supplierSku || undefined,
        rating: Number(row.rating || 4.8),
        reviewsCount: row.reviewsCount || 10,
        isBestSeller: row.isBestSeller || false,
        isNew: row.isNew || false,
        isHot: row.isHot || false,
        isTrending: row.isTrending || false,
        isFeatured: row.isFeatured || false,
        saleBadge: (row.saleBadge as any) || undefined,
        discountType: (row.discountType as any) || undefined,
        discountValue: row.discountValue || undefined,
        tags: (row.tags as string[]) || [],
        variations: (row.variations as any[]) || [],
        colors: (row.colors as any[]) || [],
        sizes: (row.sizes as string[]) || [],
        variants: (row.variants as any[]) || [],
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
      } as Product;
    });
  } catch (error) {
    console.error('Error reading products from Cloud SQL:', error);
    return [];
  }
}

export async function saveProductToSQL(product: Product): Promise<Product> {
  try {
    const cleanPayload = JSON.parse(JSON.stringify(product));

    const values = {
      id: product.id,
      name: product.name || 'Product',
      banglaName: product.banglaName || null,
      category: product.category || 'General',
      subcategory: product.subcategory || null,
      brand: product.brand || 'KenaX BD',
      price: Math.round(Number(product.price) || 0),
      originalPrice: Math.round(Number(product.originalPrice) || Number(product.price) || 0),
      costPrice: product.costPrice ? Math.round(Number(product.costPrice)) : null,
      discountPercent: product.discountPercent ? Math.round(Number(product.discountPercent)) : null,
      stock: product.stock !== undefined && product.stock !== null ? Number(product.stock) : 100,
      sku: product.sku || `SKU-${Date.now()}`,
      images: Array.isArray(product.images) ? product.images : [],
      videoUrl: product.videoUrl || null,
      description: product.description || '',
      specifications: product.specifications || {},
      productType: product.productType || 'own',
      supplierName: product.supplierName || null,
      supplierUrl: product.supplierUrl || null,
      supplierSku: product.supplierSku || null,
      rating: String(product.rating || 4.8),
      reviewsCount: product.reviewsCount ? Number(product.reviewsCount) : 10,
      isBestSeller: Boolean(product.isBestSeller),
      isNew: Boolean(product.isNew),
      isHot: Boolean(product.isHot),
      isTrending: Boolean(product.isTrending),
      isFeatured: Boolean(product.isFeatured),
      saleBadge: product.saleBadge || null,
      discountType: product.discountType || null,
      discountValue: product.discountValue ? Number(product.discountValue) : null,
      tags: Array.isArray(product.tags) ? product.tags : [],
      variations: Array.isArray(product.variations) ? product.variations : [],
      colors: Array.isArray(product.colors) ? product.colors : [],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      variants: Array.isArray(product.variants) ? product.variants : [],
      payload: cleanPayload,
      updatedAt: new Date(),
    };

    // CRITICAL FIX: Exclude the primary key 'id' from ON CONFLICT DO UPDATE SET
    // In PostgreSQL, updating the conflict target column ('id' = $38) in the SET clause causes a query syntax error.
    const { id, ...setValues } = values;

    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.id,
        set: setValues,
      });

    return product;
  } catch (error) {
    console.error('Error saving product to Cloud SQL:', error);
    throw error;
  }
}

export async function deleteProductFromSQL(productId: string): Promise<boolean> {
  try {
    await db.delete(products).where(eq(products.id, productId));
    return true;
  } catch (error) {
    console.error('Error deleting product from Cloud SQL:', error);
    throw new Error('Failed to delete product from database.', { cause: error });
  }
}
