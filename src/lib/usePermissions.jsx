import { useContext, createContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_FEATURE_ACCESS, isSuperAdmin, canAccess, canEdit, getPermissionLevel, getFeatureKeyFromPath } from './rbac';
import { useAuth } from '@/lib/AuthContext';
import { reportOperationalEvent } from '@/lib/observability';
import { isRetryableStartupError, isStartupTimeoutError, retryAsync, STARTUP_TIMEOUT_MS, withTimeout } from '@/lib/startup';

const PermissionsContext = createContext(null);

function buildFeatureSettings(dbSettings = []) {
  const merged = { ...DEFAULT_FEATURE_ACCESS };
  (dbSettings || []).forEach((setting) => {
    merged[setting.feature_key] = {
      enabled: setting.enabled ?? true,
      allowed_roles: setting.allowed_roles || DEFAULT_FEATURE_ACCESS[setting.feature_key]?.allowed_roles || [],
      permissions_by_role: setting.permissions_by_role || DEFAULT_FEATURE_ACCESS[setting.feature_key]?.permissions_by_role || {},
    };
  });
  return merged;
}

export function PermissionsProvider({ children }) {
  const { user, isLoadingAuth, authError, retryAuthBootstrap } = useAuth();
  const [featureSettings, setFeatureSettings] = useState(() => buildFeatureSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionsAttempt, setPermissionsAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isLoadingAuth) {
        return;
      }

      if (!user || authError?.type === 'auth_required') {
        setFeatureSettings(buildFeatureSettings());
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      reportOperationalEvent('permissions_start', {
        attempt: permissionsAttempt + 1,
        timeoutMs: STARTUP_TIMEOUT_MS,
        userId: user?.id || user?.email || 'unknown',
      });

      try {
        const dbSettings = await retryAsync(
          () => withTimeout(() => base44.entities.PermissionSettings.list(), {
            timeoutMs: STARTUP_TIMEOUT_MS,
            label: 'permissions.list',
          }),
          {
            attempts: 2,
            shouldRetry: isRetryableStartupError,
          }
        );

        if (cancelled) return;

        setFeatureSettings(buildFeatureSettings(dbSettings));
        reportOperationalEvent('permissions_success', {
          count: dbSettings?.length || 0,
        });
      } catch (nextError) {
        if (cancelled) return;

        setFeatureSettings(buildFeatureSettings());
        setError({
          type: isStartupTimeoutError(nextError) ? 'permissions_timeout' : 'permissions_error',
          message: isStartupTimeoutError(nextError)
            ? 'Η φόρτωση δικαιωμάτων άργησε πολύ. Συνεχίζουμε με ασφαλή προεπιλεγμένα δικαιώματα.'
            : 'Δεν ήταν δυνατή η φόρτωση δικαιωμάτων. Συνεχίζουμε με ασφαλή προεπιλεγμένα δικαιώματα.',
        });

        reportOperationalEvent(
          isStartupTimeoutError(nextError) ? 'permissions_timeout' : 'permissions_error',
          {
            message: nextError?.message || 'Permission bootstrap failed',
            status: nextError?.response?.status || null,
          },
          'warn'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authError?.type, isLoadingAuth, permissionsAttempt, user]);

  const refreshSettings = useCallback(async () => {
    setPermissionsAttempt((attempt) => attempt + 1);
  }, []);

  const refreshUser = useCallback(async () => {
    retryAuthBootstrap();
  }, [retryAuthBootstrap]);

  const value = {
    user,
    featureSettings,
    loading,
    error,
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
    retryPermissionsBootstrap: refreshSettings,
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
