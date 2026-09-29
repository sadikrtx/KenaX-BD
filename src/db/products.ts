import { db } from './index.ts';
import { products } from './schema.ts';
import { eq } from 'drizzle-orm';
import { Product } from '../types/index.ts';
import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS, PRODUCTION_PRODUCTS, isDemoProductId } from '../data/initialProducts.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

function getProductsFilePath(isEnvPreview?: boolean): string {
  return path.join(SERVER_STORE_DIR, isEnvPreview ? 'preview_server_products.json' : 'server_products.json');
}

function getDeletedProductsFilePath(isEnvPreview?: boolean): string {
  return path.join(SERVER_STORE_DIR, isEnvPreview ? 'preview_deleted_products.json' : 'deleted_products.json');
}

export function getDeletedProductIdsFromStore(_isEnvPreview?: boolean): string[] {
  try {
    const set = new Set<string>();
    const files = [
      getDeletedProductsFilePath(false),
      getDeletedProductsFilePath(true),
    ];
    for (const delFile of files) {
      if (fs.existsSync(delFile)) {
        const content = fs.readFileSync(delFile, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (id && typeof id === 'string') set.add(id);
          });
        }
      }
    }
    return Array.from(set);
  } catch {}
  return [];
}

export function recordDeletedProductIdInStore(id: string, _isEnvPreview?: boolean) {
  if (!id) return;
  try {
    const files = [
      getDeletedProductsFilePath(false),
      getDeletedProductsFilePath(true),
    ];
    for (const delFile of files) {
      let list: string[] = [];
      if (fs.existsSync(delFile)) {
        try {
          const content = fs.readFileSync(delFile, 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      if (!list.includes(id)) {
        list.push(id);
        fs.writeFileSync(delFile, JSON.stringify(list, null, 2), 'utf-8');
      }
    }
  } catch {}
}

export function removeDeletedProductIdFromStore(id: string, _isEnvPreview?: boolean) {
  if (!id) return;
  try {
    const files = [
      getDeletedProductsFilePath(false),
      getDeletedProductsFilePath(true),
    ];
    for (const delFile of files) {
      if (fs.existsSync(delFile)) {
        try {
          const content = fs.readFileSync(delFile, 'utf-8');
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((item) => item !== id);
            if (filtered.length !== parsed.length) {
              fs.writeFileSync(delFile, JSON.stringify(filtered, null, 2), 'utf-8');
            }
          }
        } catch {}
      }
    }
  } catch {}
}

function sanitizeProduct(p: Product): Product {
  const rawImages = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
  const cleanImages: string[] = [];

  rawImages.forEach((img) => {
    if (!img || typeof img !== 'string') return;
    const lower = img.toLowerCase();
    const isVideo = lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('tiktok.com') || lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.m3u8');
    if (!isVideo) {
      cleanImages.push(img);
    }
  });

  const mainImage = cleanImages[0] || p.image || '';
  const cleanVideoUrl = p.videoUrl && typeof p.videoUrl === 'string' && p.videoUrl.trim() !== '' ? p.videoUrl.trim() : undefined;

  const result: Product = {
    ...p,
    image: mainImage,
    images: cleanImages.length > 0 ? cleanImages : (p.images && p.images.length > 0 ? p.images : (mainImage ? [mainImage] : [])),
  };
  if (cleanVideoUrl) {
    result.videoUrl = cleanVideoUrl;
  } else {
    delete result.videoUrl;
  }
  return result;
}

function ensureStoreFile(isEnvPreview?: boolean): Product[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const targetFile = getProductsFilePath(isEnvPreview);
    const deletedSet = new Set(getDeletedProductIdsFromStore(isEnvPreview));
    const prodMap = new Map<string, Product>();

    if (fs.existsSync(targetFile)) {
      try {
        const content = fs.readFileSync(targetFile, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((p) => {
            if (p && p.id && !deletedSet.has(p.id)) {
              if (!isEnvPreview && isDemoProductId(p.id)) {
                return; // Strictly exclude demo products from production store
              }
              prodMap.set(p.id, sanitizeProduct(p));
            }
          });
        }
      } catch (err) {
        console.warn(`[Server Store] Error reading ${targetFile}:`, err);
      }
    }

    if (prodMap.size === 0) {
      // Seed with appropriate baseline for environment
      const baseline = INITIAL_PRODUCTS;
      baseline.filter(p => !deletedSet.has(p.id) && (isEnvPreview || !isDemoProductId(p.id))).forEach(p => {
        prodMap.set(p.id, sanitizeProduct(p));
      });
      const seeded = Array.from(prodMap.values());
      try {
        fs.writeFileSync(targetFile, JSON.stringify(seeded, null, 2), 'utf-8');
      } catch {}
      return seeded;
    }

    return Array.from(prodMap.values());
  } catch (err) {
    console.warn('[Server Store] Error in ensureStoreFile:', err);
  }
  const deletedSet = new Set(getDeletedProductIdsFromStore(isEnvPreview));
  const fallback = INITIAL_PRODUCTS;
  return fallback.filter(p => !deletedSet.has(p.id) && (isEnvPreview || !isDemoProductId(p.id))).map(sanitizeProduct);
}

function saveToStoreFile(productsList: Product[], isEnvPreview?: boolean) {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const sanitized = productsList.map(sanitizeProduct);
    const dataStr = JSON.stringify(sanitized, null, 2);
    const targetFile = getProductsFilePath(isEnvPreview);
    fs.writeFileSync(targetFile, dataStr, 'utf-8');
  } catch (err) {
    console.error('[Server Store] Error writing products file:', err);
  }
}

export async function getAllProductsFromSQL(isEnvPreview?: boolean): Promise<Product[]> {
  let sqlProducts: Product[] = [];
  if (!isEnvPreview) {
    try {
      const rows = await db.select().from(products);
      if (rows && rows.length > 0) {
        sqlProducts = rows.map((row) => {
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
      }
    } catch (error) {
      // SQL unconfigured or errored, rely on serverStore
    }
  }

  const fileProducts = ensureStoreFile(isEnvPreview);

  if (!isEnvPreview && sqlProducts.length > 0) {
    const map = new Map<string, Product>();
    fileProducts.filter(p => !isDemoProductId(p.id)).forEach((p) => map.set(p.id, p));
    sqlProducts.filter(p => !isDemoProductId(p.id)).forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }

  if (!isEnvPreview) {
    return fileProducts.filter(p => !isDemoProductId(p.id));
  }

  return fileProducts;
}

export async function saveProductToSQL(product: Product, isEnvPreview?: boolean, isManualAdminAction = false): Promise<Product> {
  // If production environment, reject demo products from being saved
  if (!isEnvPreview && isDemoProductId(product.id)) {
    console.warn(`[Server Store] Rejected saving demo product ${product.id} to production store.`);
    return product;
  }

  // If this product was deleted, NEVER resurrect it unless it is an explicit manual admin action
  const deletedIds = getDeletedProductIdsFromStore();
  if (deletedIds.includes(product.id)) {
    if (isManualAdminAction) {
      removeDeletedProductIdFromStore(product.id, isEnvPreview);
    } else {
      return product;
    }
  }

  // 1. Save to central server file store (persists full quality image base64/URLs & cross-device sync)
  try {
    const current = ensureStoreFile(isEnvPreview);
    const idx = current.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      current[idx] = product;
    } else {
      current.unshift(product);
    }
    saveToStoreFile(current, isEnvPreview);
  } catch (e) {
    console.error('Error saving to server products file store:', e);
  }

  // 2. Try saving to PostgreSQL if DB is connected (production only)
  if (!isEnvPreview) {
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

    const { id, ...setValues } = values;

    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.id,
        set: setValues,
      });

  } catch (error) {
    // Non-blocking SQL save
  }
  }

  return product;
}

export async function deleteProductFromSQL(productId: string, _isEnvPreview?: boolean): Promise<boolean> {
  if (!productId) return true;

  // 1. Record deletion tombstone in both environments
  recordDeletedProductIdInStore(productId);

  // 2. Remove from both server JSON stores (production and preview)
  try {
    const prodFile = getProductsFilePath(false);
    if (fs.existsSync(prodFile)) {
      const current = JSON.parse(fs.readFileSync(prodFile, 'utf-8'));
      if (Array.isArray(current)) {
        const filtered = current.filter((p) => p && p.id !== productId);
        fs.writeFileSync(prodFile, JSON.stringify(filtered, null, 2), 'utf-8');
      }
    }
  } catch (e) {}

  try {
    const prevFile = getProductsFilePath(true);
    if (fs.existsSync(prevFile)) {
      const current = JSON.parse(fs.readFileSync(prevFile, 'utf-8'));
      if (Array.isArray(current)) {
        const filtered = current.filter((p) => p && p.id !== productId);
        fs.writeFileSync(prevFile, JSON.stringify(filtered, null, 2), 'utf-8');
      }
    }
  } catch (e) {}

  // 3. Permanent hard delete from PostgreSQL database
  try {
    await db.delete(products).where(eq(products.id, productId));
  } catch (error) {}

  return true;
}
