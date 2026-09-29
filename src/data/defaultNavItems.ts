import { NavItem } from '../types/index.ts';

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'nav-home', label: 'Home', targetView: 'home', priority: 1, enabled: true },
  { id: 'nav-shop', label: 'Shop', targetView: 'shop', priority: 2, enabled: true },
  {
    id: 'nav-flash-sale',
    label: 'Flash Sale',
    targetView: 'tag:Flash Sale',
    priority: 3,
    isHot: true,
    badgeText: 'HOT',
    badgeColor: 'bg-red-500',
    enabled: true,
  },
  {
    id: 'nav-trending',
    label: 'Trending',
    targetView: 'tag:Trending',
    priority: 4,
    isHot: true,
    badgeText: 'TRENDING',
    badgeColor: 'bg-amber-500',
    enabled: true,
  },
  { id: 'nav-new-arrivals', label: 'New Arrivals', targetView: 'tag:New Arrivals', priority: 5, enabled: true },
  { id: 'nav-deals', label: 'Deals', targetView: 'tag:Deals', priority: 6, enabled: true },
  { id: 'nav-bestsellers', label: 'Best Sellers', targetView: 'tag:Best Sellers', priority: 7, enabled: true },
  { id: 'nav-mobile', label: 'Mobile', targetView: 'tag:Mobile', priority: 8, enabled: true },
  { id: 'nav-xiaomi', label: 'Xiaomi', targetView: 'tag:Xiaomi', priority: 9, enabled: true },
  { id: 'nav-redmi', label: 'Redmi', targetView: 'tag:Redmi', priority: 10, enabled: true },
  { id: 'nav-smartphones', label: 'Smartphones', targetView: 'tag:Smartphones', priority: 11, enabled: true },
  { id: 'nav-gadgets', label: 'Gadgets', targetView: 'tag:Gadgets', priority: 12, enabled: true },
];

export function getEffectiveNavItems(customNavItems?: NavItem[]): NavItem[] {
  if (customNavItems && Array.isArray(customNavItems) && customNavItems.length > 0) {
    return [...customNavItems].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }
  return [...DEFAULT_NAV_ITEMS].sort((a, b) => a.priority - b.priority);
}

