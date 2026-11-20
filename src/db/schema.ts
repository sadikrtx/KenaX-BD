import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('customer'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  banglaName: text('bangla_name'),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  brand: text('brand').default('KenaX BD'),
  price: integer('price').notNull(),
  originalPrice: integer('original_price').notNull(),
  costPrice: integer('cost_price'),
  discountPercent: integer('discount_percent'),
  stock: integer('stock').default(100),
  sku: text('sku').notNull(),
  images: jsonb('images').$type<string[]>().notNull(),
  videoUrl: text('video_url'),
  description: text('description').notNull(),
  specifications: jsonb('specifications').$type<Record<string, string>>(),
  productType: text('product_type').default('own'),
  supplierName: text('supplier_name'),
  supplierUrl: text('supplier_url'),
  supplierSku: text('supplier_sku'),
  rating: text('rating').default('4.8'),
  reviewsCount: integer('reviews_count').default(10),
  isBestSeller: boolean('is_best_seller').default(false),
  isNew: boolean('is_new').default(false),
  isHot: boolean('is_hot').default(false),
  isTrending: boolean('is_trending').default(false),
  isFeatured: boolean('is_featured').default(false),
  saleBadge: text('sale_badge'),
  discountType: text('discount_type'),
  discountValue: integer('discount_value'),
  tags: jsonb('tags').$type<string[]>(),
  variations: jsonb('variations').$type<any[]>(),
  colors: jsonb('colors').$type<any[]>(),
  sizes: jsonb('sizes').$type<string[]>(),
  variants: jsonb('variants').$type<any[]>(),
  payload: jsonb('payload').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ==========================================
// UNIVERSAL PLUGIN ARCHITECTURE TABLES
// ==========================================

export const plugins = pgTable('plugins', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull().unique(),
  name: text('name').notNull(),
  subtitle: text('subtitle').notNull(),
  version: text('version').notNull(),
  latestAvailableVersion: text('latest_available_version').notNull(),
  author: text('author').notNull(),
  authorVerified: boolean('author_verified').default(true),
  description: text('description').notNull(),
  category: text('category').notNull(),
  iconName: text('icon_name').notNull(),
  accentColor: text('accent_color').default('#10b981'),
  manifest: jsonb('manifest').$type<any>().notNull(),
  isOfficialStorePlugin: boolean('is_official_store_plugin').default(true),
  rating: text('rating').default('4.9'),
  downloadsCount: integer('downloads_count').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pluginVersions = pgTable('plugin_versions', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull(),
  version: text('version').notNull(),
  manifestSnapshot: jsonb('manifest_snapshot').$type<any>().notNull(),
  changelog: text('changelog').notNull(),
  signatureHash: text('signature_hash').notNull(),
  releasedAt: timestamp('released_at').defaultNow(),
  isStable: boolean('is_stable').default(true),
});

export const pluginInstallations = pgTable('plugin_installations', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull().unique(),
  installedVersion: text('installed_version').notNull(),
  previousVersion: text('previous_version'),
  status: text('status').notNull().default('inactive'),
  installSource: text('install_source').notNull().default('store'),
  installedBy: text('installed_by').notNull(),
  installedByRole: text('installed_by_role').notNull(),
  signatureVerified: boolean('signature_verified').default(true),
  sandboxStatus: text('sandbox_status').default('isolated_ready'),
  installedAt: timestamp('installed_at').defaultNow(),
  activatedAt: timestamp('activated_at'),
  deactivatedAt: timestamp('deactivated_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pluginPermissions = pgTable('plugin_permissions', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull().unique(),
  grantedPermissions: jsonb('granted_permissions').$type<string[]>().notNull(),
  allowedRoles: jsonb('allowed_roles').$type<string[]>().notNull(),
  requireSuperAdminForSettings: boolean('require_super_admin_for_settings').default(true),
  updatedBy: text('updated_by').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pluginSettings = pgTable('plugin_settings', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull().unique(),
  configValues: jsonb('config_values').$type<Record<string, any>>().notNull(),
  externalApiUrl: text('external_api_url'),
  environment: text('environment').default('production'),
  updatedBy: text('updated_by').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pluginDependencies = pgTable('plugin_dependencies', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull(),
  dependsOnPluginId: text('depends_on_plugin_id').notNull(),
  requiredVersionRange: text('required_version_range').notNull(),
  isOptional: boolean('is_optional').default(false),
  satisfied: boolean('satisfied').default(true),
});

export const pluginUpdates = pgTable('plugin_updates', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull(),
  currentVersion: text('current_version').notNull(),
  newVersion: text('new_version').notNull(),
  changelog: text('changelog').notNull(),
  compatibilityVerified: boolean('compatibility_verified').default(true),
  signatureHash: text('signature_hash').notNull(),
  publishedAt: timestamp('published_at').defaultNow(),
  status: text('status').default('available'),
});

export const pluginActivityLogs = pgTable('plugin_activity_logs', {
  id: text('id').primaryKey(),
  pluginId: text('plugin_id').notNull(),
  pluginName: text('plugin_name').notNull(),
  action: text('action').notNull(),
  version: text('version').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  details: text('details').notNull(),
  ipAddress: text('ip_address').default('103.145.118.24'),
  timestamp: timestamp('timestamp').defaultNow(),
});

