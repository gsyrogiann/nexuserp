import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

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

export function useActivityTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const heartbeatIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Log page visit
  useEffect(() => {
    if (!user?.email) return;

    const pageName = PAGE_NAMES[location.pathname] || location.pathname;

    base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      action: 'page_visit',
      page_path: location.pathname,
      page_name: pageName,
      timestamp: new Date().toISOString(),
    }).catch(err => console.error('Activity log failed:', err));

    lastActivityRef.current = Date.now();
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

    // Send first heartbeat immediately
    sendHeartbeat();

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // Every 30 sec

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [user, location.pathname]);
}

// Track button/form actions - can be called globally
export async function trackAction(actionName, details) {
  if (!actionName) return;

  try {
    const user = await base44.auth.me();
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