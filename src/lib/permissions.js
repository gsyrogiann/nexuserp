// src/lib/permissions.js

export const USER_PERMISSIONS = {
  // ΕΔΩ ΒΑΛΕ ΤΟ ΔΙΚΟ ΣΟΥ EMAIL (ADMIN)
  'georgesyro1925@gmail.com': {
    isAdmin: true,
    allowedPaths: ['*'] 
  },
  // ΕΔΩ ΒΑΛΕ ΤΟ EMAIL ΤΟΥ ΥΠΑΛΛΗΛΟΥ ΣΟΥ
  'chrisbsoft@gmail.com': {
    isAdmin: false,
    allowedPaths: ['/Dashboard', '/Customers', '/SalesPipeline', '/Calendar', '/Tickets']
  }
};

export const canUserAccess = (email, path) => {
  const userPerms = USER_PERMISSIONS[email];
  if (!userPerms) return false; 
  if (userPerms.isAdmin || userPerms.allowedPaths.includes('*')) return true;
  return userPerms.allowedPaths.includes(path);
};
