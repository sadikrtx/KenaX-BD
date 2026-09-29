import { ChatBotRule, SiteSettings, Product, Category } from '../types/index.ts';
import { DEFAULT_CHATBOT_RULES } from '../data/defaultChatBotRules.ts';

export interface RuleMatchResult {
  matchedRule: ChatBotRule;
  matchedKeyword: string;
  replyText: string;
  actionType?: string;
  actionData?: any;
}

export interface HierarchicalSearchResult {
  level: 'main_category' | 'subcategory' | 'child_category' | 'product_title' | 'product_description' | 'general';
  matchedName: string;
  title: string;
  products: any[];
  replyMessage?: string;
}

/**
 * Normalizes text for reliable matching across Bengali, English, and Banglish
 */
export function normalizeRuleText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[।.,!?;:"'(){}[\]<>_+\-=/\\|`~*^%#@&$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common Bengali <-> English synonym mappings for e-commerce products,
 * categories, sizes, and attributes.
 */
const SYNONYM_MAP: Record<string, string[]> = {
  // Categories & Subcategories
  'fashion': ['fashion', 'clothing', 'ফ্যাশন', 'পোশাক', 'কাপড়', 'কাপড়', 'dress', 'ড্রেস', 'লিবাস'],
  'clothing': ['clothing', 'fashion', 'পোশাক', 'কাপড়', 'কাপড়'],
  'women': ['women', 'womens', 'মহিলা', 'মেয়েদের', 'মেয়েদের', 'লেডিস', 'ladies', 'নারী'],
  'men': ['men', 'mens', 'boys', 'পুরুষ', 'ছেলেদের', 'জেন্টস', 'gents'],
  'kids': ['kids', 'baby', 'বাচ্চা', 'বাচ্চাদের', 'শিশু', 'শিশুদের', 'ছোটদের', 'baby & kids'],
  'home': ['home', 'living', 'হোম', 'লিভিং', 'বাসা', 'ঘর', 'গৃহস্থালি', 'home & living'],
  'electronics': ['electronics', 'gadgets', 'ইলেকট্রনিক্স', 'গ্যাজেট', 'ইলেক্ট্রনিক্স'],
  'beauty': ['beauty', 'cosmetics', 'বিউটি', 'স্কিনকেয়ার', 'রূপচর্চা'],
  'bedding': ['bedding', 'bedsheet', 'বেডশিট', 'চাদর', 'বিছানার চাদর'],
  
  // Product Types & Child Categories
  'three piece': ['three piece', 'three pieces', '3 piece', '3 pieces', 'থ্রি পিস', 'থ্রি-পিস', 'থ্রিপিস', 'readymate theere pices', 'readymade three piece'],
  'katua': ['katua', 'কাটুয়া', 'কাটুয়া', 'solid cotton katua'],
  'panjabi': ['panjabi', 'punjabi', 'পাঞ্জাবি', 'পাঞ্জাবী'],
  'shirt': ['shirt', 'shirts', 'শার্ট', 'ফর্মাল শার্ট'],
  'tshirt': ['tshirt', 't-shirt', 't-shirts', 'polos', 'polo', 'টিশার্ট', 'টি-শার্ট', 'পোলো'],
  'saree': ['saree', 'shari', 'শাড়ি', 'শাড়ি'],
  'borka': ['borka', 'burqa', 'abaya', 'বোরকা', 'আবায়া', 'বোরখা'],
  'romper': ['romper', 'rompers', 'রম্পার', 'বেবি রম্পার'],
  'shoes': ['shoes', 'sneakers', 'জুতা', 'স্নিকার্স', 'জুতো'],
  'watch': ['watch', 'smartwatch', 'ঘড়ি', 'ঘড়ি', 'স্মার্টওয়াচ'],
  'earbuds': ['earbuds', 'tws', 'airpods', 'ইয়ারবাড', 'ইয়ারবাডস', 'হেডফোন'],
  'lamp': ['lamp', 'light', 'বাতি', 'লাইট', 'ল্যাম্প', 'নাইট লাইট', 'night light', 'table lamp', 'টেবিল ল্যাম্প', 'desk lamp', 'ল্যাম্পটি'],

  // Sizes & Attributes
  'xl': ['xl', 'এক্সেল', 'extra large', '40/42', '40', '42'],
  'xxl': ['xxl', '2xl', 'ডাবল এক্সেল', '44/46', '44', '46'],
  'l': ['l', 'large', 'লার্জ', '36/38', '36', '38'],
  'm': ['m', 'medium', 'মিডিয়াম'],
  's': ['s', 'small', 'স্মল'],
  'cotton': ['cotton', 'কটন', 'সুতি', 'সুতি কাপড়'],
  'silk': ['silk', 'সিল্ক'],
  'microfiber': ['microfiber', 'মাইক্রোফাইবার', 'microstich', 'মাইক্রোস্টিচ'],
  'waterproof': ['waterproof', 'ওয়াটারপ্রুফ', 'পানি নিরোধক']
};

/**
 * Replaces dynamic placeholders inside rule responses
 */
export function formatRuleTemplate(text: string, settings?: Partial<SiteSettings>): string {
  if (!text) return '';

  const siteName = settings?.siteName || 'KenaX BD';
  const dhakaDelivery = (settings?.deliveryChargeInsideDhaka ?? 60).toString();
  const outsideDelivery = (settings?.deliveryChargeOutsideDhaka ?? 120).toString();
  const agentPhone = settings?.officialWhatsAppAgentNumber || settings?.whatsappNumber || '01719143897';
  const superAdminPhone = settings?.whatsappSuperAdminNumber || '01887713212';
  const telegramBot = settings?.telegramBotUsername || 'kenaxbd_bot';
  const botName = settings?.aiBotName || 'KenaX AI Bot';

  return text
    .replace(/\{\{siteName\}\}/gi, siteName)
    .replace(/\{\{deliveryChargeDhaka\}\}/gi, `৳${dhakaDelivery}`)
    .replace(/\{\{deliveryChargeOutside\}\}/gi, `৳${outsideDelivery}`)
    .replace(/\{\{officialAgentNumber\}\}/gi, agentPhone)
    .replace(/\{\{whatsappSuperAdmin\}\}/gi, superAdminPhone)
    .replace(/\{\{telegramBot\}\}/gi, `@${telegramBot.replace('@', '')}`)
    .replace(/\{\{botName\}\}/gi, botName);
}

/**
 * Evaluates incoming user text against configured chatbot rules.
 */
export function evaluateChatBotRules(
  userInput: string,
  rules: ChatBotRule[] = DEFAULT_CHATBOT_RULES,
  settings?: Partial<SiteSettings>,
  preferredLang: 'bn' | 'en' = 'bn'
): RuleMatchResult | null {
  if (!userInput || !userInput.trim()) return null;

  const normalizedInput = normalizeRuleText(userInput);
  if (!normalizedInput) return null;

  const activeRules = (rules || DEFAULT_CHATBOT_RULES)
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

  for (const rule of activeRules) {
    if (!rule.keywords || rule.keywords.length === 0) continue;

    const matchType = rule.matchType || 'contains_any';
    let isMatched = false;
    let foundKeyword = '';

    if (matchType === 'exact' || (matchType as any) === 'exact_match') {
      for (const rawKw of rule.keywords) {
        const kw = normalizeRuleText(rawKw);
        if (normalizedInput === kw) {
          isMatched = true;
          foundKeyword = rawKw;
          break;
        }
      }
    } else if (matchType === 'contains_all') {
      const allMatched = rule.keywords.every((rawKw) => {
        const kw = normalizeRuleText(rawKw);
        return normalizedInput.includes(kw);
      });
      if (allMatched && rule.keywords.length > 0) {
        isMatched = true;
        foundKeyword = rule.keywords.join(' + ');
      }
    } else {
      for (const rawKw of rule.keywords) {
        const kw = normalizeRuleText(rawKw);
        if (!kw) continue;
        if (normalizedInput.includes(kw)) {
          isMatched = true;
          foundKeyword = rawKw;
          break;
        }
      }
    }

    if (isMatched) {
      const rawReply =
        preferredLang === 'en'
          ? rule.replyMessage || rule.replyMessageBn
          : rule.replyMessageBn || rule.replyMessage;

      const formattedReply = formatRuleTemplate(rawReply, settings);

      return {
        matchedRule: rule,
        matchedKeyword: foundKeyword,
        replyText: formattedReply,
        actionType: rule.actionType,
        actionData: rule.actionData,
      };
    }
  }

  return null;
}

/**
 * Checks if a string or array contains any term or synonym of the target
 */
function termMatches(target: string, query: string): boolean {
  const normTarget = normalizeRuleText(target);
  const normQuery = normalizeRuleText(query);
  if (!normTarget || !normQuery) return false;

  if (normQuery.includes(normTarget) || normTarget.includes(normQuery)) return true;

  // Check synonym map
  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    const keyMatchedInQuery = synonyms.some(s => normQuery.includes(s));
    const keyMatchedInTarget = synonyms.some(s => normTarget.includes(s));
    if (keyMatchedInQuery && keyMatchedInTarget) {
      return true;
    }
  }

  return false;
}

/**
 * Smart Hierarchical Search Engine:
 * 1. Main Category: Picks 1 product from each subcategory / child category.
 * 2. Subcategory: Picks 1 product from each child category under that subcategory.
 * 3. Child Category: Returns specific child category products first, then related.
 * 4. Word-by-word Title, Tag, and Dynamic Auto-Learning Rule Matrix (for all present and future products).
 * 5. Description, Size, Color & Attribute smart matching.
 */
export function searchCatalogHierarchicalMatrix(
  userInput: string,
  catalog: Product[] = [],
  categoriesTree: Category[] = [],
  lang: 'bn' | 'en' = 'bn'
): HierarchicalSearchResult | null {
  if (!userInput || !userInput.trim() || !catalog || catalog.length === 0) {
    return null;
  }

  const query = normalizeRuleText(userInput);
  const words = query
    .split(/\s+/)
    .filter((w) => w.length > 1 && !['a', 'an', 'the', 'in', 'of', 'for', 'to', 'order', 'অর্ডার', 'চাই', 'নিতে', 'দাম', 'কত', 'আছে', 'কি', 'দাও', 'করতে', 'এবং', 'বা', 'dekho', 'dekhi', 'kichu', 'কিছু', 'দেখান', 'show', 'list', 'লিস্ট', 'পণ্য', 'প্রোডাক্ট', 'product', 'item'].includes(w));

  // -------------------------------------------------------------
  // TIER 0: POPULAR / TRENDING / BEST-SELLER QUERY MATCH
  // (Customer Favorites + Add to Cart + Buy Now)
  // -------------------------------------------------------------
  const isPopularQuery =
    query.includes('popular') ||
    query.includes('trending') ||
    query.includes('best seller') ||
    query.includes('bestseller') ||
    query.includes('hot deals') ||
    query.includes('জনপ্রিয়') ||
    query.includes('জনপ্রিয়') ||
    query.includes('সেরা পণ্য') ||
    query.includes('টপ প্রোডাক্ট') ||
    query.includes('কোনটা বেশি চলে') ||
    query.includes('বেশি চলে') ||
    query.includes('ফেভারিট') ||
    query.includes('favorite') ||
    query.includes('পছন্দ') ||
    query.includes('কার্ট') ||
    query.includes('সবচেয়ে বেশি পছন্দ');

  if (isPopularQuery) {
    // Sort products by popularity score (buyNow * 3 + cart * 2 + fav * 1 + salesCount)
    const sortedPopular = [...catalog].sort((a: any, b: any) => {
      const scoreA = (a.popularityScore ?? ((a.buyNowCount || 0) * 3 + (a.addToCartCount || 0) * 2 + (a.favoritesCount || 0) * 1 + (a.salesCount || 0)));
      const scoreB = (b.popularityScore ?? ((b.buyNowCount || 0) * 3 + (b.addToCartCount || 0) * 2 + (b.favoritesCount || 0) * 1 + (b.salesCount || 0)));
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.rating || 0) - (a.rating || 0);
    });

    const topItems = sortedPopular.slice(0, 6);
    return {
      level: 'general',
      matchedName: 'Popular Products',
      title: lang === 'en'
        ? '🔥 Most Popular & Customer Favorite Products:'
        : '🔥 কাস্টমারদের সবচেয়ে পছন্দের ও শীর্ষ জনপ্রিয় পণ্যসমূহ:',
      products: topItems,
      replyMessage: lang === 'en'
        ? 'Sir, here are our most popular products loved, favorited, added to cart, and ordered by our valued customers:'
        : 'সম্মানিত স্যার, আমাদের সম্মানিত কাস্টমারদের সবচেয়ে বেশি ফেভারিট করা, কার্টে যুক্ত করা ও সরাসরি অর্ডারকৃত শীর্ষ জনপ্রিয় পণ্যসমূহ নিচে তুলে ধরা হলো:'
    };
  }

  // -------------------------------------------------------------
  // TIER 1: CHILD CATEGORY MATCH (subSubcategory / childSubcategory)
  // -------------------------------------------------------------
  // Collect all known child categories from catalog and categoriesTree
  const childCatNames = new Set<string>();
  catalog.forEach((p) => {
    if (p.subSubcategory) childCatNames.add(p.subSubcategory);
    if (p.childSubcategory) childCatNames.add(p.childSubcategory);
  });
  categoriesTree.forEach((c) => {
    (c.subcategories || []).forEach((s: any) => {
      if (typeof s === 'object' && Array.isArray(s.subSubcategories)) {
        s.subSubcategories.forEach((child: string) => childCatNames.add(child));
      }
    });
  });

  for (const childName of Array.from(childCatNames)) {
    if (termMatches(childName, query)) {
      // Find all products matching this child category
      const exactChildProducts = catalog.filter((p) => {
        const c1 = p.subSubcategory || '';
        const c2 = p.childSubcategory || '';
        return termMatches(c1, childName) || termMatches(c2, childName) || termMatches(p.name, childName);
      });

      if (exactChildProducts.length > 0) {
        // If we have fewer than 4 products, supplement with items from same parent subcategory/category
        let finalProds = [...exactChildProducts];
        if (finalProds.length < 4) {
          const sample = exactChildProducts[0];
          const sameSubProds = catalog.filter(
            (p) =>
              !finalProds.some((fp) => fp.id === p.id) &&
              (p.subcategory === sample.subcategory || p.category === sample.category)
          );
          finalProds = [...finalProds, ...sameSubProds].slice(0, 5);
        }

        const titleHeader = lang === 'en'
          ? `🛍️ Premium Selection: ${childName}`
          : `🛍️ ${childName} এর আকর্ষণীয় পণ্যসমূহ:`;

        return {
          level: 'child_category',
          matchedName: childName,
          title: titleHeader,
          products: finalProds,
          replyMessage: lang === 'en'
            ? `Here are the top products from our **${childName}** collection:`
            : `আমাদের **${childName}** চাইল্ড কালেকশন থেকে সেরা ও আকর্ষণীয় পণ্যসমূহ নিচে দেওয়া হলো:`
        };
      }
    }
  }

  // -------------------------------------------------------------
  // TIER 2: SUBCATEGORY MATCH
  // -------------------------------------------------------------
  const subCatNames = new Set<string>();
  catalog.forEach((p) => {
    if (p.subcategory) subCatNames.add(p.subcategory);
  });
  categoriesTree.forEach((c) => {
    (c.subcategories || []).forEach((s: any) => {
      const sName = typeof s === 'string' ? s : s.name;
      if (sName) subCatNames.add(sName);
    });
  });

  for (const subName of Array.from(subCatNames)) {
    if (termMatches(subName, query)) {
      // Filter all products belonging to this subcategory
      const subProds = catalog.filter((p) => termMatches(p.subcategory || '', subName));
      if (subProds.length > 0) {
        // Pick 1 product from each child category under this subcategory
        const childGroupMap = new Map<string, any[]>();
        subProds.forEach((p) => {
          const childKey = p.subSubcategory || p.childSubcategory || p.name || 'General';
          if (!childGroupMap.has(childKey)) childGroupMap.set(childKey, []);
          childGroupMap.get(childKey)!.push(p);
        });

        const selected: any[] = [];
        childGroupMap.forEach((prodsInChild) => {
          if (prodsInChild.length > 0 && selected.length < 6) {
            selected.push(prodsInChild[0]);
          }
        });

        const finalProds = selected.length > 0 ? selected : subProds.slice(0, 6);
        const titleHeader = lang === 'en'
          ? `🛍️ ${subName} - Selection from Each Child Category`
          : `🛍️ ${subName} - চাইল্ড ক্যাটাগরি ভিত্তিক পণ্যসমূহ:`;

        return {
          level: 'subcategory',
          matchedName: subName,
          title: titleHeader,
          products: finalProds,
          replyMessage: lang === 'en'
            ? `Here is 1 product from each child category under **${subName}**:`
            : `**${subName}** সাব-ক্যাটাগরির অন্তর্ভুক্ত প্রতিটি চাইল্ড ক্যাটাগরি থেকে ১টি করে সেরা পণ্য নিচে উপস্থাপন করা হলো:`
        };
      }
    }
  }

  // -------------------------------------------------------------
  // TIER 3: MAIN CATEGORY MATCH
  // -------------------------------------------------------------
  const mainCatNames = new Set<string>();
  catalog.forEach((p) => {
    if (p.category) mainCatNames.add(p.category);
  });
  categoriesTree.forEach((c) => {
    if (c.name) mainCatNames.add(c.name);
    if (c.banglaName) mainCatNames.add(c.banglaName);
  });

  for (const mainName of Array.from(mainCatNames)) {
    if (termMatches(mainName, query)) {
      // Filter all products belonging to this main category
      const mainProds = catalog.filter((p) => termMatches(p.category || '', mainName));
      if (mainProds.length > 0) {
        // Group by subcategory or child category and pick 1 from each!
        const subGroupMap = new Map<string, any[]>();
        mainProds.forEach((p) => {
          const subKey = p.subcategory || p.subSubcategory || 'General';
          if (!subGroupMap.has(subKey)) subGroupMap.set(subKey, []);
          subGroupMap.get(subKey)!.push(p);
        });

        const selected: any[] = [];
        // Round-robin selection: 1 from each subcategory
        subGroupMap.forEach((prodsInSub) => {
          if (prodsInSub.length > 0 && selected.length < 6) {
            selected.push(prodsInSub[0]);
          }
        });

        // If fewer than 4, take second item from subcategories
        if (selected.length < 4) {
          subGroupMap.forEach((prodsInSub) => {
            if (prodsInSub.length > 1 && selected.length < 6) {
              if (!selected.some(sp => sp.id === prodsInSub[1].id)) {
                selected.push(prodsInSub[1]);
              }
            }
          });
        }

        const finalProds = selected.length > 0 ? selected : mainProds.slice(0, 6);
        const titleHeader = lang === 'en'
          ? `🛍️ ${mainName} - Featured Product from Each Sub-Category`
          : `🛍️ ${mainName} - বিভিন্ন সাব-ক্যাটাগরির পণ্যসমূহ:`;

        return {
          level: 'main_category',
          matchedName: mainName,
          title: titleHeader,
          products: finalProds,
          replyMessage: lang === 'en'
            ? `Here is 1 product from each sub-category under **${mainName}**:`
            : `**${mainName}** মেইন ক্যাটাগরির অন্তর্ভুক্ত প্রতিটি সাব-ক্যাটাগরি থেকে ১টি করে বাছাইকৃত পণ্য নিচে দেখানো হলো:`
        };
      }
    }
  }

  // -------------------------------------------------------------
  // TIER 4: TITLE WORD-BY-WORD, TAG, & DYNAMIC RULE MATRIX
  // (Automatically indexes all words for any existing & future products)
  // -------------------------------------------------------------
  const scoredProducts: Array<{ product: Product; score: number; matchReasons: string[] }> = [];

  catalog.forEach((p) => {
    let score = 0;
    const reasons: string[] = [];
    const pNameNorm = normalizeRuleText(p.name || '');
    const pBnNorm = normalizeRuleText(p.banglaName || '');
    const pBrandNorm = normalizeRuleText(p.brand || '');
    const pTagsNorm = (p.tags || []).map((t: string) => normalizeRuleText(t)).join(' ');

    // Exact full phrase in title
    if (pNameNorm.includes(query) || pBnNorm.includes(query)) {
      score += 100;
      reasons.push('exact_title_match');
    }

    // Word by word title match
    let matchedWordCount = 0;
    words.forEach((w) => {
      if (pNameNorm.includes(w)) {
        score += 30;
        matchedWordCount++;
      }
      if (pBnNorm.includes(w)) {
        score += 30;
        matchedWordCount++;
      }
      if (pBrandNorm.includes(w)) {
        score += 20;
      }
      if (pTagsNorm.includes(w)) {
        score += 20;
      }
    });

    if (matchedWordCount > 0) {
      reasons.push(`title_words_${matchedWordCount}`);
    }

    // -------------------------------------------------------------
    // TIER 5: DESCRIPTION, SIZE, COLOR, & SPECIFICATION SMART MATCHING
    // -------------------------------------------------------------
    const pDescNorm = normalizeRuleText(p.description || p.shortDescription || '');
    const pSizes = (p.sizes || []).map((s: string) => normalizeRuleText(s));
    const pColors = (p.colors || []).map((c: any) => normalizeRuleText(typeof c === 'string' ? c : c.name || ''));

    // Check size matching (e.g. "XL", "এক্সেল", "L", "M", "XXL", "38", "40", "42")
    words.forEach((w) => {
      // Check if word matches a size
      if (pSizes.includes(w) || (pDescNorm.includes(`size ${w}`) || pDescNorm.includes(`সাইজ ${w}`) || pDescNorm.includes(`${w} =`))) {
        score += 25;
        reasons.push(`size_${w}`);
      }

      // Check if word is in description
      if (pDescNorm.includes(w)) {
        score += 15;
      }

      // Check color matching
      if (pColors.some((c) => c.includes(w))) {
        score += 20;
        reasons.push(`color_${w}`);
      }

      // Check synonyms against description & title
      for (const [sKey, synList] of Object.entries(SYNONYM_MAP)) {
        if (synList.some(s => s === w)) {
          // Check if any synonym is in title or description
          if (synList.some(s => pNameNorm.includes(s) || pBnNorm.includes(s))) {
            score += 25;
          } else if (synList.some(s => pDescNorm.includes(s))) {
            score += 15;
          }
        }
      }
    });

    if (score > 0) {
      scoredProducts.push({ product: p, score, matchReasons: reasons });
    }
  });

  if (scoredProducts.length > 0) {
    scoredProducts.sort((a, b) => b.score - a.score);
    const topMatch = scoredProducts[0];
    const pNameNorm = normalizeRuleText(topMatch.product.name || '');
    const pBnNorm = normalizeRuleText(topMatch.product.banglaName || '');

    // Check if title matches query or query matches title closely
    const isExactTitle =
      topMatch.matchReasons.includes('exact_title_match') ||
      pNameNorm === query ||
      pBnNorm === query ||
      (pNameNorm.length > 3 && query.includes(pNameNorm)) ||
      (pBnNorm.length > 3 && query.includes(pBnNorm)) ||
      topMatch.score >= 100;

    let matchedProds: any[] = [];
    if (isExactTitle || scoredProducts.length === 1) {
      // RULE 1: If title matches or single match, show ONLY that 1 product!
      matchedProds = [topMatch.product];
    } else {
      // RULE 2: If partial/related matches, show ONLY the 2 to 3 matching products (never dump all products)!
      const minScoreThreshold = Math.max(30, topMatch.score * 0.4);
      matchedProds = scoredProducts
        .filter((item) => item.score >= minScoreThreshold)
        .slice(0, 3)
        .map((item) => item.product);
    }

    const titleHeader = matchedProds.length === 1
      ? `🛍️ ${matchedProds[0].name || matchedProds[0].banglaName}:`
      : (lang === 'en'
        ? `🛍️ Matching Products for "${userInput}" (${matchedProds.length} items)`
        : `🛍️ "${userInput}" সম্পর্কিত ম্যাচিং পণ্যসমূহ (${matchedProds.length}টি):`);

    return {
      level: isExactTitle ? 'product_title' : 'product_description',
      matchedName: userInput,
      title: titleHeader,
      products: matchedProds,
      replyMessage: lang === 'en'
        ? (matchedProds.length === 1
          ? `Here is the product details for **${matchedProds[0].name}**:`
          : `Here are the matching products based on your search:`)
        : (matchedProds.length === 1
          ? `**${matchedProds[0].name || matchedProds[0].banglaName}** সম্পর্কে বিস্তারিত তথ্য ও স্পেসিফিকেশন নিচে দেওয়া হলো:`
          : `আপনার খোঁজা অনুযায়ী সেরা ম্যাচিং পণ্যসমূহ নিচে দেওয়া হলো:`)
    };
  }

  // -------------------------------------------------------------
  // GENERAL FALLBACK: Popular / Diverse cross-category rotation
  // -------------------------------------------------------------
  const isGeneralBrowsing =
    query.includes('সব') ||
    query.includes('সকল') ||
    query.includes('পণ্য') ||
    query.includes('প্রোডাক্ট') ||
    query.includes('কালেকশন') ||
    query.includes('জনপ্রিয়') ||
    query.includes('জনপ্রিয়') ||
    query.includes('popular') ||
    query.includes('best') ||
    query.includes('দেখান') ||
    query.includes('dekhan') ||
    query.includes('list') ||
    query.includes('all');

  if (isGeneralBrowsing) {
    // Pick 1 product from each main category to provide diverse store-wide spectrum
    const catMap = new Map<string, any[]>();
    catalog.forEach((p) => {
      const c = p.category || 'Other';
      if (!catMap.has(c)) catMap.set(c, []);
      catMap.get(c)!.push(p);
    });

    const diverse: any[] = [];
    catMap.forEach((prods) => {
      if (prods.length > 0 && diverse.length < 6) {
        diverse.push(prods[0]);
      }
    });

    return {
      level: 'general',
      matchedName: 'All Categories',
      title: lang === 'en' ? `🛍️ Popular Products Across All Categories:` : `🛍️ আমাদের স্টোরের জনপ্রিয় ও সেরা কালেকশন:`,
      products: diverse.length > 0 ? diverse : catalog.slice(0, 6),
      replyMessage: lang === 'en'
        ? `Here is our top trending selection across categories:`
        : `আমাদের স্টোরের বিভিন্ন ক্যাটাগরির জনপ্রিয় ও আকর্ষণীয় পণ্যসমূহ নিচে দেওয়া হলো:`
    };
  }

  return null;
}
