import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { reportOperationalEvent } from '@/lib/observability';
import { isRetryableStartupError, isStartupTimeoutError, retryAsync, STARTUP_TIMEOUT_MS, withTimeout } from '@/lib/startup';

const AuthContext = createContext(null);

function classifyAuthError(error) {
  if (isStartupTimeoutError(error)) {
    return {
      type: 'auth_timeout',
      recoverable: true,
      message: 'Η επαλήθευση σύνδεσης άργησε περισσότερο από το αναμενόμενο.',
    };
  }

  if (error?.response?.status === 401 || String(error?.message || '').includes('auth_required')) {
    return {
      type: 'auth_required',
      recoverable: true,
      message: 'Χρειάζεται να συνδεθείς ξανά για να ανοίξει η εφαρμογή.',
    };
  }

  if (String(error?.message || '').includes('user_not_registered') || error?.response?.status === 403) {
    return {
      type: 'user_not_registered',
      recoverable: false,
      message: 'Ο λογαριασμός δεν έχει ακόμη ενεργοποιηθεί στο NexusERP.',
    };
  }

  return {
    type: 'auth_error',
    recoverable: true,
    message: 'Δεν καταφέραμε να ολοκληρώσουμε τον έλεγχο ταυτότητας.',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authAttempt, setAuthAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      setIsLoadingAuth(true);
      setAuthError(null);
      reportOperationalEvent('auth_start', {
        attempt: authAttempt + 1,
        timeoutMs: STARTUP_TIMEOUT_MS,
      });

      try {
        const me = await retryAsync(
          () => withTimeout(() => base44.auth.me(), {
            timeoutMs: STARTUP_TIMEOUT_MS,
            label: 'auth.me',
          }),
          {
            attempts: 2,
            shouldRetry: isRetryableStartupError,
          }
        );

        if (cancelled) return;
        setUser(me);
        reportOperationalEvent('auth_success', {
          userId: me?.id || me?.email || 'unknown',
        });
      } catch (err) {
        if (cancelled) return;

        const nextError = classifyAuthError(err);
        setUser(null);
        setAuthError(nextError);

        reportOperationalEvent(
          nextError.type === 'auth_timeout' ? 'auth_timeout' : 'auth_error',
          {
            type: nextError.type,
            message: err?.message || nextError.message,
            status: err?.response?.status || null,
          },
          nextError.recoverable ? 'warn' : 'error'
        );
      } finally {
        if (!cancelled) {
          setIsLoadingAuth(false);
        }
      }
    };

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [authAttempt]);

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  const retryAuthBootstrap = useCallback(() => {
    setAuthAttempt((attempt) => attempt + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, setUser, retryAuthBootstrap }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
