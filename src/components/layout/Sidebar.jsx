import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Truck, Package, Warehouse as WarehouseIcon,
  ShoppingCart, ShoppingBag, FileText, CreditCard, BarChart3,
  Bot, ChevronDown, ChevronRight, Menu, X, Settings, Mail, AlertCircle, Ticket
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard }
    ]
  },
  {
    label: 'CRM',
    items: [
      { label: 'Customers', path: '/Customers', icon: Users },
      { label: 'Suppliers', path: '/Suppliers', icon: Truck }
    ]
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', path: '/Products', icon: Package },
      { label: 'Inventory', path: '/Inventory', icon: WarehouseIcon }
    ]
  },
  {
    label: 'Service',
    items: [
      { label: 'Tickets', path: '/Tickets', icon: Ticket }
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Quotes', path: '/Quotes', icon: FileText },
      { label: 'Sales Orders', path: '/SalesOrders', icon: ShoppingCart },
      { label: 'Sales Invoices', path: '/SalesInvoices', icon: FileText }
    ]
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Purchase Orders', path: '/PurchaseOrders', icon: ShoppingBag },
      { label: 'Purchase Invoices', path: '/PurchaseInvoices', icon: FileText }
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payments', path: '/Payments', icon: CreditCard },
      { label: 'Reports', path: '/Reports', icon: BarChart3 }
    ]
  },
  {
    label: 'Email',
    items: [
      { label: 'Email Settings', path: '/EmailSettings', icon: Mail },
      { label: 'Unmatched Emails', path: '/UnmatchedEmails', icon: AlertCircle },
    ]
  },
  {
    label: 'AI',
    items: [
      { label: 'AI Assistant', path: '/AIAssistant', icon: Bot }
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(
    navGroups.reduce((acc, g) => ({ ...acc, [g.label]: true }), {})
  );

  const toggleGroup = (label) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path) => location.pathname === path;

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Package className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight">ERP Pro</h1>
              <p className="text-[10px] text-sidebar-foreground/50">Business Management</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-sidebar-foreground/50 hover:text-sidebar-foreground hidden lg:flex h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center w-full px-2 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
              >
                {expandedGroups[group.label] ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                {group.label}
              </button>
            )}
            {(collapsed || expandedGroups[group.label]) && group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive(item.path)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', collapsed && 'mx-auto')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/40">
            <Settings className="w-3.5 h-3.5" />
            <span>v1.0.0 — ERP Pro</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-50 bg-card shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 bg-sidebar border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {navContent}
      </aside>
    </>
  );
}