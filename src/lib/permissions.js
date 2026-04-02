const ADMIN_ONLY_PATHS = new Set([
  '/SalesInvoices',
  '/PurchaseInvoices',
  '/Payments',
  '/Reports',
  '/AIAssistant',
  '/EmailSettings',
  '/Settings',
]);

export function isAdminUser(user) {
  return user?.role === 'admin';
}

export function canUserAccess(user, path) {
  if (!path) {
    return false;
  }

  if (!ADMIN_ONLY_PATHS.has(path)) {
    return true;
  }

  return isAdminUser(user);
}

export function getVisibleNavigationGroups(groups, user) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canUserAccess(user, item.path)),
    }))
    .filter((group) => group.items.length > 0);
}

export { ADMIN_ONLY_PATHS };
