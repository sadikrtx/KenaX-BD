import { getAllProductsFromSQL } from '../db/products.ts';
import type { Product } from '../types/index.ts';

function sanitizeXml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Filter out invalid, unpublished, or broken products for TikTok Catalog
 */
export async function getEligibleTikTokCatalogProducts(isEnvPreview: boolean = false): Promise<Product[]> {
  const allProducts = await getAllProductsFromSQL(isEnvPreview);
  return allProducts.filter((p) => {
    if (!p || !p.id || !p.name) return false;
    const price = Number(p.price) || 0;
    if (price <= 0) return false;
    const hasImage = Boolean(p.images && p.images.length > 0 && p.images[0]);
    return hasImage;
  });
}

/**
 * Generate TikTok Product Catalog XML Feed (RSS 2.0 / Merchant Center Feed)
 * Compatible with TikTok Ads Manager, Catalog Manager & Video Shopping Ads
 */
export async function generateTikTokCatalogXml(
  baseUrl: string = 'https://kenaxbd.com',
  isEnvPreview: boolean = false
): Promise<string> {
  const products = await getEligibleTikTokCatalogProducts(isEnvPreview);
  const now = new Date().toUTCString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>KenaX BD TikTok Product Catalog</title>
    <link>${sanitizeXml(baseUrl)}</link>
    <description>Official Product Catalog Feed for TikTok Ads, Video Shopping Ads &amp; Dynamic Showcase</description>
    <lastBuildDate>${now}</lastBuildDate>
`;

  for (const product of products) {
    const id = product.id;
    const title = sanitizeXml(product.name);
    const description = sanitizeXml(
      product.description || product.shortDescription || product.name
    );
    const slug = product.slug || product.id;
    const link = `${baseUrl.replace(/\/$/, '')}/?product=${encodeURIComponent(slug)}&utm_source=tiktok&utm_medium=catalog`;
    const primaryImage = product.images && product.images[0] ? product.images[0] : '';
    const additionalImages = (product.images || []).slice(1, 10);

    // Availability calculation
    const isOutOfStock =
      product.stockStatus === 'out_of_stock' || (typeof product.stock === 'number' && product.stock <= 0);
    const availability = isOutOfStock ? 'in_stock' : 'in_stock'; // TikTok standard values: 'in_stock' | 'out_of_stock'
    const tiktokAvailability = isOutOfStock ? 'out_of_stock' : 'in_stock';

    const price = `${(product.price || 0).toFixed(2)} BDT`;
    const brand = sanitizeXml(product.brand || 'KenaX BD');
    const category = sanitizeXml(product.category || 'General');
    const sku = sanitizeXml(product.sku || product.id);

    xml += `    <item>
      <g:id>${sanitizeXml(id)}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${sanitizeXml(link)}</g:link>
      <g:image_link>${sanitizeXml(primaryImage)}</g:image_link>
`;

    for (const addImg of additionalImages) {
      if (addImg) {
        xml += `      <g:additional_image_link>${sanitizeXml(addImg)}</g:additional_image_link>\n`;
      }
    }

    xml += `      <g:availability>${tiktokAvailability}</g:availability>
      <g:price>${price}</g:price>
`;

    if (product.originalPrice && product.originalPrice > product.price) {
      const origPrice = `${product.originalPrice.toFixed(2)} BDT`;
      xml += `      <g:sale_price>${price}</g:sale_price>\n`;
      xml += `      <g:price>${origPrice}</g:price>\n`;
    }

    xml += `      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${category}</g:product_type>
      <g:mpn>${sku}</g:mpn>
      <g:custom_label_0>${sanitizeXml(product.productType || 'own')}</g:custom_label_0>
      <g:custom_label_1>${sanitizeXml(product.sellerShopName || 'KenaX Official')}</g:custom_label_1>
    </item>
`;
  }

  xml += `  </channel>
</rss>`;

  return xml;
}

/**
 * Generate TikTok Product Catalog JSON Feed
 */
export async function generateTikTokCatalogJson(
  baseUrl: string = 'https://kenaxbd.com',
  isEnvPreview: boolean = false
) {
  const products = await getEligibleTikTokCatalogProducts(isEnvPreview);
  return {
    title: 'KenaX BD TikTok Product Catalog Feed',
    platform: 'tiktok',
    updatedAt: new Date().toISOString(),
    itemCount: products.length,
    currency: 'BDT',
    products: products.map((p) => {
      const isOutOfStock =
        p.stockStatus === 'out_of_stock' || (typeof p.stock === 'number' && p.stock <= 0);
      return {
        id: p.id,
        title: p.name,
        description: p.description || p.shortDescription || '',
        link: `${baseUrl.replace(/\/$/, '')}/?product=${encodeURIComponent(p.slug || p.id)}&utm_source=tiktok&utm_medium=catalog`,
        image_link: p.images?.[0] || '',
        additional_image_links: (p.images || []).slice(1, 10),
        availability: isOutOfStock ? 'out_of_stock' : 'in_stock',
        price: `${(p.price || 0).toFixed(2)} BDT`,
        original_price: p.originalPrice ? `${p.originalPrice.toFixed(2)} BDT` : undefined,
        brand: p.brand || 'KenaX BD',
        category: p.category || 'General',
        sku: p.sku || p.id,
        condition: 'new',
        product_type: p.productType || 'own',
        seller: p.sellerShopName || 'KenaX Official',
      };
    }),
  };
}
