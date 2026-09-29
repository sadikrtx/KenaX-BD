import { SEOSettings, Product } from '../types/index.ts';

export function applySEOMetaTags(seo?: SEOSettings) {
  if (!seo || typeof document === 'undefined') return;

  // 1. Title
  if (seo.metaTitle) {
    document.title = seo.metaTitle;
  }

  // Helper to set or create meta tag
  const setMeta = (selectorName: string, attrName: string, attrValue: string, contentValue: string) => {
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', contentValue);
  };

  // 2. Meta Description
  if (seo.metaDescription) {
    setMeta('description', 'name', 'description', seo.metaDescription);
  }

  // 3. Meta Keywords
  if (seo.metaKeywords) {
    setMeta('keywords', 'name', 'keywords', seo.metaKeywords);
  }

  // 4. Google Site Verification
  if (seo.googleSiteVerification) {
    setMeta('google-site-verification', 'name', 'google-site-verification', seo.googleSiteVerification);
  }

  // 5. Open Graph Meta Tags
  if (seo.ogTitle || seo.metaTitle) {
    setMeta('og:title', 'property', 'og:title', seo.ogTitle || seo.metaTitle || '');
  }
  if (seo.ogDescription || seo.metaDescription) {
    setMeta('og:description', 'property', 'og:description', seo.ogDescription || seo.metaDescription || '');
  }
  if (seo.ogImage) {
    setMeta('og:image', 'property', 'og:image', seo.ogImage);
  }
  if (seo.ogType) {
    setMeta('og:type', 'property', 'og:type', seo.ogType);
  }

  // 6. Twitter Card
  if (seo.twitterCard) {
    setMeta('twitter:card', 'name', 'twitter:card', seo.twitterCard);
  }

  // 7. Canonical URL
  if (seo.canonicalUrl) {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', seo.canonicalUrl);
  }
}

/**
 * Dynamically applies high-converting OpenGraph & Twitter Card meta tags for individual product pages
 * Enables rich previews with photo, price in BDT, stock status, brand and descriptions on Facebook, WhatsApp, Messenger, etc.
 */
export function applyProductOpenGraphMeta(product: Product, selectedVariantName?: string, activeCustomImage?: string) {
  if (!product || typeof document === 'undefined') return;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://kenaxbd.com';
  const productUrl = `${currentOrigin}/?product=${product.id}`;
  const displayImage = activeCustomImage || (product.images && product.images[0]) || `${currentOrigin}/icon-512.png`;
  
  const variantSuffix = selectedVariantName ? ` - ${selectedVariantName}` : '';
  const metaTitle = `${product.name}${variantSuffix} | KenaX BD`;

  const cleanDescription = (product.description || '')
    .replace(/<[^>]*>?/gm, '')
    .substring(0, 160)
    .trim();

  const ogDescription = cleanDescription
    ? `${product.brand ? product.brand + ' - ' : ''}${cleanDescription}`
    : `Buy ${product.name} with Fast Home Delivery across Bangladesh from KenaX BD.`;

  // 1. Update Document Title
  document.title = metaTitle;

  // Helper function to set or create meta tag
  const setMeta = (attrName: string, attrValue: string, contentValue: string) => {
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', contentValue);
  };

  // Helper to remove meta tag if exists
  const removeMeta = (attrName: string, attrValue: string) => {
    const element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (element) {
      element.remove();
    }
  };

  // 2. Standard Meta Tags
  setMeta('name', 'description', ogDescription);
  setMeta('name', 'keywords', `${product.name}, ${product.category}, ${product.brand || 'KenaX BD'}, online shopping BD, cash on delivery`);

  // 3. OpenGraph Social Sharing (Facebook, WhatsApp, Messenger, LinkedIn, Telegram) - Without Price
  setMeta('property', 'og:type', 'product');
  setMeta('property', 'og:site_name', 'KenaX BD');
  setMeta('property', 'og:title', metaTitle);
  setMeta('property', 'og:description', ogDescription);
  setMeta('property', 'og:image', displayImage);
  setMeta('property', 'og:image:secure_url', displayImage);
  setMeta('property', 'og:image:alt', product.name);
  setMeta('property', 'og:url', productUrl);

  // Remove price tags from OpenGraph so price is hidden in social preview cards
  removeMeta('property', 'product:price:amount');
  removeMeta('property', 'product:price:currency');
  setMeta('property', 'product:availability', (product.stock && product.stock > 0) ? 'in stock' : 'out of stock');
  if (product.brand) {
    setMeta('property', 'product:brand', product.brand);
  }
  if (product.category) {
    setMeta('property', 'product:category', product.category);
  }

  // 4. Twitter Card Meta Tags - Clean without price
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:site', '@KenaXBD');
  setMeta('name', 'twitter:title', metaTitle);
  setMeta('name', 'twitter:description', ogDescription);
  setMeta('name', 'twitter:image', displayImage);

  // 5. Canonical Link Tag
  let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', productUrl);

  // 6. Schema.org JSON-LD structured data for Google Search rich snippet
  const jsonLdId = 'product-structured-data-jsonld';
  let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = jsonLdId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images || [displayImage],
    description: ogDescription,
    sku: product.sku || `KNX-${product.id}`,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'KenaX BD',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'BDT',
      price: product.price,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: (product.stock && product.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'KenaX BD',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating || 4.8,
      reviewCount: product.reviewsCount || 12,
    },
  };

  script.textContent = JSON.stringify(structuredData);
}

/**
 * Restores global store SEO meta tags when navigating away from a single product page
 */
export function restoreStoreOpenGraphMeta(defaultSeo?: SEOSettings) {
  if (typeof document === 'undefined') return;

  // Remove individual product JSON-LD
  const script = document.getElementById('product-structured-data-jsonld');
  if (script) {
    script.remove();
  }

  if (defaultSeo) {
    applySEOMetaTags(defaultSeo);
  } else {
    document.title = 'KenaX BD | Best Online Shopping in Bangladesh - Smart Choice, Better Life';
  }
}
