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
    }).catch(err => console.warn('Activity log failed:', err));

    lastActivityRef.current = Date.now();
  }, [location.pathname, user?.email]);

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
      }).catch(err => console.warn('Heartbeat failed:', err));
    };

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000); // Every 30 sec

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [user?.email, location.pathname]);
}

// Track button/form actions
export function trackAction(actionName, details) {
  if (!actionName) return;

  base44.entities.UserActivity.create({
    user_email: (window.__currentUser?.email || 'unknown'),
    user_name: (window.__currentUser?.full_name || 'unknown'),
    action: 'button_click',
    details: `${actionName}: ${details || ''}`,
    timestamp: new Date().toISOString(),
  }).catch(err => console.warn('Action log failed:', err));
}