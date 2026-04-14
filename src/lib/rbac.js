/**
 * RBAC - Role Based Access Control
 * Central permission logic for Nexus ERP
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  user: 'User',
};

export const PERMISSION_LEVELS = {
  NONE: 'none',
  VIEW: 'view',
  EDIT: 'edit',
};

// All features/modules in the app
export const FEATURES = [
  { key: 'dashboard',        name: 'Dashboard',          path: '/Dashboard' },
  { key: 'calendar',         name: 'Calendar',            path: '/Calendar' },
  { key: 'customers',        name: 'Customers',           path: '/Customers' },
  { key: 'suppliers',        name: 'Suppliers',           path: '/Suppliers' },
  { key: 'sales_pipeline',   name: 'Sales Pipeline',      path: '/SalesPipeline' },
  { key: 'products',         name: 'Products',            path: '/Products' },
  { key: 'inventory',        name: 'Inventory',           path: '/Inventory' },
  { key: 'tickets',          name: 'Tickets',             path: '/Tickets' },
  { key: 'quotes',           name: 'Quotes',              path: '/Quotes' },
  { key: 'sales_orders',     name: 'Sales Orders',        path: '/SalesOrders' },
  { key: 'sales_invoices',   name: 'Sales Invoices',      path: '/SalesInvoices' },
  { key: 'purchase_orders',  name: 'Purchase Orders',     path: '/PurchaseOrders' },
  { key: 'purchase_invoices',name: 'Purchase Invoices',   path: '/PurchaseInvoices' },
  { key: 'payments',         name: 'Payments',            path: '/Payments' },
  { key: 'reports',          name: 'Reports',             path: '/Reports' },
  { key: 'email_settings',   name: 'Email Settings',      path: '/EmailSettings' },
  { key: 'my_email_settings',name: 'My Email Settings',   path: '/MyEmailSettings' },
  { key: 'unmatched_emails', name: 'Unmatched Emails',    path: '/UnmatchedEmails' },
  { key: 'ai_assistant',     name: 'AI Assistant',        path: '/AIAssistant' },
  { key: 'live_users',       name: 'Live Users',          path: '/LiveUsers' },
  { key: 'ai_history',       name: 'AI Interactions',     path: '/AIInteractionsHistory' },
  { key: 'settings',         name: 'Settings',            path: '/Settings' },
];

// Default permissions per role (used when no DB settings exist yet)
export const DEFAULT_PERMISSIONS = {
  super_admin: { enabled: true, roles: ['super_admin', 'admin', 'manager', 'employee'], permissionsByRole: { super_admin: 'edit', admin: 'edit', manager: 'edit', employee: 'edit' } },
  admin: {},
  manager: {},
  employee: {},
};

// Default feature access per role (fallback)
export const DEFAULT_FEATURE_ACCESS = {
  dashboard:         { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'view' } },
  calendar:          { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'view' } },
  customers:         { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'view' } },
  suppliers:         { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'view', employee:'none' } },
  sales_pipeline:    { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'view' } },
  products:          { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'view' } },
  inventory:         { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'none' } },
  tickets:           { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'edit' } },
  quotes:            { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'none' } },
  sales_orders:      { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'none' } },
  sales_invoices:    { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  purchase_orders:   { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'view', employee:'none' } },
  purchase_invoices: { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  payments:          { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  reports:           { enabled: true,  allowed_roles: ['super_admin','admin','manager'],           permissions_by_role: { super_admin:'edit', admin:'edit', manager:'view', employee:'none' } },
  email_settings:    { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  my_email_settings: { enabled: true,  allowed_roles: ['super_admin','admin','manager','employee'], permissions_by_role: { super_admin:'edit', admin:'edit', manager:'edit', employee:'edit' } },
  unmatched_emails:  { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  ai_assistant:      { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
  live_users:        { enabled: true,  allowed_roles: ['super_admin'],                             permissions_by_role: { super_admin:'edit' } },
  ai_history:        { enabled: true,  allowed_roles: ['super_admin'],                             permissions_by_role: { super_admin:'edit' } },
  settings:          { enabled: true,  allowed_roles: ['super_admin','admin'],                     permissions_by_role: { super_admin:'edit', admin:'edit', manager:'none', employee:'none' } },
};

/**
 * Check if a user is super admin (isSuperAdmin flag OR role === super_admin)
 */
export function isSuperAdmin(user) {
  if (!user) return false;
  return user.is_super_admin === true || user.role === 'super_admin';
}

/**
 * Get effective permission level for a user on a feature
 * Returns: 'edit' | 'view' | 'none'
 */
export function getPermissionLevel(user, featureKey, featureSettings) {
  if (!user) return 'none';
  if (isSuperAdmin(user)) return 'edit';

  const settings = featureSettings?.[featureKey] || DEFAULT_FEATURE_ACCESS[featureKey];
  if (!settings) return 'none';
  if (!settings.enabled) return 'none';

  const role = user.role || 'employee';
  const allowedRoles = settings.allowed_roles || [];
  if (!allowedRoles.includes(role)) return 'none';

  return settings.permissions_by_role?.[role] || 'view';
}

/**
 * Check if user can access a feature at all
 */
export function canAccess(user, featureKey, featureSettings) {
  return getPermissionLevel(user, featureKey, featureSettings) !== 'none';
}

/**
 * Check if user can edit (not just view)
 */
export function canEdit(user, featureKey, featureSettings) {
  return getPermissionLevel(user, featureKey, featureSettings) === 'edit';
}

/**
 * Get feature key from path
 */
export function getFeatureKeyFromPath(path) {
  const feature = FEATURES.find(f => f.path === path);
  return feature?.key || null;
}
