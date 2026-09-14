import { UserRole } from '../types';

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  module: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Products
  { id: 'products.view', name: 'View Products', description: 'View product catalog and specifications', module: 'Products' },
  { id: 'products.create', name: 'Create Products', description: 'Add new products and dropshipping items', module: 'Products' },
  { id: 'products.edit', name: 'Edit Products', description: 'Modify pricing, stock, descriptions', module: 'Products' },
  { id: 'products.delete', name: 'Delete Products', description: 'Remove products from the catalog', module: 'Products' },
  { id: 'products.manage', name: 'Full Product Control', description: 'Bulk actions, duplication, flags', module: 'Products' },

  // Orders
  { id: 'orders.view', name: 'View Orders', description: 'View customer orders and history', module: 'Orders' },
  { id: 'orders.create', name: 'Create Orders', description: 'Create manual phone/walk-in orders', module: 'Orders' },
  { id: 'orders.edit', name: 'Edit Orders', description: 'Update items, addresses, or charges', module: 'Orders' },
  { id: 'orders.status', name: 'Update Order Status', description: 'Progress orders from Pending to Delivered', module: 'Orders' },
  { id: 'orders.cancel', name: 'Cancel Orders', description: 'Cancel orders and restore inventory', module: 'Orders' },
  { id: 'orders.manage', name: 'Manage Orders', description: 'Full refund and dispute handling', module: 'Orders' },

  // Inventory
  { id: 'inventory.view', name: 'View Inventory', description: 'Monitor SKU stock and low stock alerts', module: 'Inventory' },
  { id: 'inventory.adjust', name: 'Adjust Stock', description: 'Add/remove stock with reason logs', module: 'Inventory' },
  { id: 'inventory.manage', name: 'Manage Warehouses', description: 'Warehouse allocation and thresholds', module: 'Inventory' },

  // Customers
  { id: 'customers.view', name: 'View Customers', description: 'View customer profiles and order totals', module: 'Customers' },
  { id: 'customers.edit', name: 'Edit Customers', description: 'Update customer contact info', module: 'Customers' },
  { id: 'customers.block', name: 'Block/Unblock Customers', description: 'Restrict fraudulent customer accounts', module: 'Customers' },

  // Delivery
  { id: 'delivery.view', name: 'View Deliveries', description: 'Track courier consignments and status', module: 'Delivery' },
  { id: 'delivery.update', name: 'Update Courier Info', description: 'Assign Steadfast/Pathao tracking IDs', module: 'Delivery' },
  { id: 'delivery.manage', name: 'Manage Delivery Zones', description: 'Configure delivery partner APIs and charges', module: 'Delivery' },

  // Payments
  { id: 'payments.view', name: 'View Payments', description: 'Inspect COD and mobile banking logs', module: 'Payments' },
  { id: 'payments.verify', name: 'Verify Payments', description: 'Approve manual bKash/Nagad/Rocket TrxIDs', module: 'Payments' },
  { id: 'payments.manage', name: 'Manage Payment Gateways', description: 'Configure gateway credentials and fees', module: 'Payments' },

  // Coupons
  { id: 'coupons.view', name: 'View Coupons', description: 'See active promo codes and usage stats', module: 'Coupons' },
  { id: 'coupons.create', name: 'Create Coupons', description: 'Create discount codes and limits', module: 'Coupons' },
  { id: 'coupons.edit', name: 'Edit Coupons', description: 'Modify expiry, minimum spend, discount value', module: 'Coupons' },
  { id: 'coupons.delete', name: 'Delete Coupons', description: 'Deactivate and delete promo codes', module: 'Coupons' },

  // Reviews
  { id: 'reviews.view', name: 'View Reviews', description: 'Read customer ratings and testimonials', module: 'Reviews' },
  { id: 'reviews.approve', name: 'Approve / Hide Reviews', description: 'Moderate product reviews on website', module: 'Reviews' },
  { id: 'reviews.delete', name: 'Delete Reviews', description: 'Permanently remove spam reviews', module: 'Reviews' },

  // Reports
  { id: 'reports.view', name: 'View Reports', description: 'Inspect analytics, revenue and order charts', module: 'Reports' },
  { id: 'reports.export', name: 'Export Reports (CSV)', description: 'Download CSV reports for finance/accounting', module: 'Reports' },

  // Staff & RBAC
  { id: 'staff.view', name: 'View Staff', description: 'List employee and staff accounts', module: 'Staff' },
  { id: 'staff.create', name: 'Create Staff', description: 'Provision new staff accounts', module: 'Staff' },
  { id: 'staff.edit', name: 'Edit Staff', description: 'Update staff details and role assignments', module: 'Staff' },
  { id: 'staff.delete', name: 'Delete / Suspend Staff', description: 'Suspend or remove staff access', module: 'Staff' },
  { id: 'staff.manage', name: 'Full Staff Control', description: 'Super Admin privilege over staff', module: 'Staff' },

  // Roles & Permissions
  { id: 'roles.view', name: 'View Permissions', description: 'View permission matrix across roles', module: 'Roles' },
  { id: 'roles.manage', name: 'Customize Permissions', description: 'Modify granular permissions per role', module: 'Roles' },

  // Settings & Logs
  { id: 'settings.view', name: 'View Website Settings', description: 'View store profile and delivery rates', module: 'Settings' },
  { id: 'settings.edit', name: 'Edit Website Settings', description: 'Update store info, branding, charges', module: 'Settings' },
  { id: 'logs.view', name: 'View Activity Logs', description: 'Audit trail of administrative actions', module: 'Audit Logs' },
  { id: 'security.view', name: 'View Security Center', description: 'Check access tokens, login attempts', module: 'Security' },
  { id: 'security.manage', name: 'Manage Security', description: 'Configure Firebase rules and API protection', module: 'Security' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<'super_admin' | 'admin' | 'manager' | 'moderator', string[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.id),
  admin: ALL_PERMISSIONS.filter((p) => p.id !== 'staff.manage' && p.id !== 'security.manage').map((p) => p.id),
  manager: [
    'products.view',
    'products.create',
    'products.edit',
    'products.manage',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.status',
    'orders.cancel',
    'orders.manage',
    'inventory.view',
    'inventory.adjust',
    'inventory.manage',
    'customers.view',
    'customers.edit',
    'delivery.view',
    'delivery.update',
    'delivery.manage',
    'payments.view',
    'payments.verify',
    'coupons.view',
    'coupons.create',
    'coupons.edit',
    'coupons.delete',
    'reviews.view',
    'reviews.approve',
    'reports.view',
    'reports.export',
    'logs.view',
  ],
  moderator: [
    'products.view',
    'products.edit',
    'orders.view',
    'orders.status',
    'inventory.view',
    'inventory.adjust',
    'customers.view',
    'delivery.view',
    'delivery.update',
    'payments.view',
    'reviews.view',
    'reviews.approve',
    'logs.view',
  ],
};

/**
 * Checks if a given role or customized permission array satisfies the required permission.
 */
export function hasPermission(
  role: UserRole,
  customPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  if (role === 'customer') return false;
  if (role === 'super_admin') return true;

  // When evaluating manager or moderator, use role default or non-wildcard custom permissions
  const roleDefault = DEFAULT_ROLE_PERMISSIONS[role as 'admin' | 'manager' | 'moderator'] || [];

  if (customPermissions && customPermissions.length > 0 && !customPermissions.includes('*')) {
    return customPermissions.includes(requiredPermission);
  }

  return roleDefault.includes(requiredPermission);
}
