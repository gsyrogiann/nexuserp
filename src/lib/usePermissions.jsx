import { useContext, createContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_FEATURE_ACCESS, isSuperAdmin, canAccess, canEdit, getPermissionLevel, getFeatureKeyFromPath } from './rbac';

const PermissionsContext = createContext(null);

export function PermissionsProvider({ children }) {
  const [user, setUser] = useState(null);
  const [featureSettings, setFeatureSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [me, dbSettings] = await Promise.all([
          base44.auth.me().catch(() => null),
          base44.entities.PermissionSettings.list().catch(() => []),
        ]);
        setUser(me);

        const merged = { ...DEFAULT_FEATURE_ACCESS };
        (dbSettings || []).forEach(s => {
          merged[s.feature_key] = {
            enabled: s.enabled ?? true,
            allowed_roles: s.allowed_roles || DEFAULT_FEATURE_ACCESS[s.feature_key]?.allowed_roles || [],
            permissions_by_role: s.permissions_by_role || DEFAULT_FEATURE_ACCESS[s.feature_key]?.permissions_by_role || {},
          };
        });
        setFeatureSettings(merged);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const refreshSettings = async () => {
    const dbSettings = await base44.entities.PermissionSettings.list().catch(() => []);
    const merged = { ...DEFAULT_FEATURE_ACCESS };
    (dbSettings || []).forEach(s => {
      merged[s.feature_key] = {
        enabled: s.enabled ?? true,
        allowed_roles: s.allowed_roles || DEFAULT_FEATURE_ACCESS[s.feature_key]?.allowed_roles || [],
        permissions_by_role: s.permissions_by_role || DEFAULT_FEATURE_ACCESS[s.feature_key]?.permissions_by_role || {},
      };
    });
    setFeatureSettings(merged);
  };

  const refreshUser = async () => {
    const me = await base44.auth.me().catch(() => null);
    setUser(me);
  };

  const value = {
    user,
    featureSettings,
    loading,
    isSuperAdmin: isSuperAdmin(user),
    canAccess: (featureKey) => canAccess(user, featureKey, featureSettings),
    canEdit: (featureKey) => canEdit(user, featureKey, featureSettings),
    getLevel: (featureKey) => getPermissionLevel(user, featureKey, featureSettings),
    canAccessPath: (path) => {
      const key = getFeatureKeyFromPath(path);
      if (!key) return isSuperAdmin(user);
      return canAccess(user, key, featureSettings);
    },
    refreshSettings,
    refreshUser,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}