import { db } from './index.ts';
import { products } from './schema.ts';
import { eq } from 'drizzle-orm';
import { Product } from '../types/index.ts';
import fs from 'fs';
import path from 'path';
import { INITIAL_PRODUCTS, DEMO_PRODUCT_IDS } from '../data/initialProducts.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const SERVER_STORE_FILE = path.join(SERVER_STORE_DIR, 'server_products.json');
const SERVER_DELETED_FILE = path.join(SERVER_STORE_DIR, 'deleted_products.json');

export function getDeletedProductIdsFromStore(): string[] {
  try {
    const list: string[] = [];
    if (fs.existsSync(SERVER_DELETED_FILE)) {
      const content = fs.readFileSync(SERVER_DELETED_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (id && !list.includes(id)) list.push(id);
        });
      }
    }
    return list;
  } catch {}
  return [];
}

export function recordDeletedProductIdInStore(id: string) {
  try {
    const existing = getDeletedProductIdsFromStore();
    if (!existing.includes(id)) {
      existing.push(id);
      fs.writeFileSync(SERVER_DELETED_FILE, JSON.stringify(existing, null, 2), 'utf-8');
    }
  } catch {}
}

function ensureStoreFile(): Product[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const deletedSet = new Set(getDeletedProductIdsFromStore());
    if (!fs.existsSync(SERVER_STORE_FILE)) {
      const initialFiltered = INITIAL_PRODUCTS.filter(p => !deletedSet.has(p.id));
      fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(initialFiltered, null, 2), 'utf-8');
      return initialFiltered;
    }
    const content = fs.readFileSync(SERVER_STORE_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(p => p && p.id && !deletedSet.has(p.id));
      if (filtered.length !== parsed.length) {
        fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
      }
      return filtered;
    }
  } catch (err) {
    console.warn('[Server Store] Error reading server_products.json:', err);
  }
  const deletedSet = new Set(getDeletedProductIdsFromStore());
  return INITIAL_PRODUCTS.filter(p => !deletedSet.has(p.id));
}

function saveToStoreFile(productsList: Product[]) {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(productsList, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server Store] Error writing server_products.json:', err);
  }
}

export async function getAllProductsFromSQL(): Promise<Product[]> {
  let sqlProducts: Product[] = [];
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

  const fileProducts = ensureStoreFile();

  if (sqlProducts.length > 0) {
    const map = new Map<string, Product>();
    fileProducts.forEach((p) => map.set(p.id, p));
    sqlProducts.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }

  return fileProducts;
}

export async function saveProductToSQL(product: Product): Promise<Product> {
  // 1. Save to central server file store (persists full quality image base64/URLs & cross-device sync)
  try {
    const current = ensureStoreFile();
    const idx = current.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      current[idx] = product;
    } else {
      current.unshift(product);
    }
    saveToStoreFile(current);
  } catch (e) {
    console.error('Error saving to server_products.json file store:', e);
  }

  // 2. Try saving to PostgreSQL if DB is connected
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

  return product;
}

export async function deleteProductFromSQL(productId: string): Promise<boolean> {
  recordDeletedProductIdInStore(productId);
  try {
    const current = ensureStoreFile();
    const filtered = current.filter((p) => p.id !== productId);
    saveToStoreFile(filtered);
  } catch (e) {}

  try {
    await db.delete(products).where(eq(products.id, productId));
  } catch (error) {}

  return true;
}
