import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { reportOperationalEvent } from '@/lib/observability';

const PAGE_NAMES = {
  '/Dashboard': 'Dashboard',
  '/Customers': 'Customers',
  '/Suppliers': 'Suppliers',
  '/Products': 'Products',
  '/Inventory': 'Inventory',
  '/Quotes': 'Quotes',
  '/SalesOrders': 'Sales Orders',
  '/SalesInvoices': 'Sales Invoices',
  '/PurchaseOrders': 'Purchase Orders',
  '/PurchaseInvoices': 'Purchase Invoices',
  '/Payments': 'Payments',
  '/Reports': 'Reports',
  '/AIAssistant': 'AI Assistant',
  '/EmailSettings': 'Email Settings',
  '/MyEmailSettings': 'My Email Settings',
  '/UnmatchedEmails': 'Unmatched Emails',
  '/Tickets': 'Tickets',
  '/Calendar': 'Calendar',
  '/SalesPipeline': 'Sales Pipeline',
  '/Settings': 'Settings',
};

let currentTrackedUser = null;

const deferTracking = (callback, delayMs = 0) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(() => callback(), { timeout: 2000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = window.setTimeout(callback, delayMs);
  return () => window.clearTimeout(timeoutId);
};

export function useActivityTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const heartbeatIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    currentTrackedUser = user || null;
  }, [user]);

  // Log page visit
  useEffect(() => {
    if (!user?.email) return;

    const pageName = PAGE_NAMES[location.pathname] || location.pathname;

    const cancelTracking = deferTracking(() => {
      base44.entities.UserActivity.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: 'page_visit',
        page_path: location.pathname,
        page_name: pageName,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        reportOperationalEvent('activity_tracking_error', {
          action: 'page_visit',
          message: err?.message || 'Activity log failed',
        }, 'warn');
      });
    }, 400);

    lastActivityRef.current = Date.now();
    return cancelTracking;
  }, [location.pathname, user]);

  // Heartbeat every 30 seconds to track idle time
  useEffect(() => {
    if (!user?.email) return;

    const sendHeartbeat = () => {
      const pageName = PAGE_NAMES[location.pathname] || location.pathname;
      base44.entities.UserActivity.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        action: 'heartbeat',
        page_path: location.pathname,
        page_name: pageName,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error('Heartbeat failed:', err));
    };

    const cancelInitialHeartbeat = deferTracking(sendHeartbeat, 2500);

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // Every 30 sec

    return () => {
      cancelInitialHeartbeat();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [user, location.pathname]);
}

// Track button/form actions - can be called globally
export async function trackAction(actionName, details) {
  if (!actionName) return;

  try {
    const user = currentTrackedUser;
    base44.entities.UserActivity.create({
      user_email: user?.email || 'unknown',
      user_name: user?.full_name || user?.email || 'unknown',
      action: 'button_click',
      page_path: window.location.pathname,
      page_name: PAGE_NAMES[window.location.pathname] || window.location.pathname,
      details: details || actionName,
      timestamp: new Date().toISOString(),
    }).catch(err => console.warn('Action log failed:', err));
  } catch (err) {
    console.warn('Could not track action:', err);
  }
}

// Make it globally available
window.trackAction = trackAction;
