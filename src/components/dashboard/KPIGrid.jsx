import React from 'react';
import StatsCard from '../shared/StatsCard';
import { CreditCard, TrendingUp, Truck, ShoppingCart } from 'lucide-react';

export default function KPIGrid({ stats }) {
  if (!stats) return null;

  const {
    totalCustomers = 0,
    totalRevenue = 0,
    totalExpenses = 0,
    totalPayments = 0,
    totalOrders = 0,
    lowStockProducts = 0,
  } = stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <StatsCard
        label="Total Revenue"
        value={`€${totalRevenue.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
        icon={TrendingUp}
      />

      <StatsCard
        label="Total Payments"
        value={`€${totalPayments.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
        icon={CreditCard}
      />

      <StatsCard
        label="Total Expenses"
        value={`€${totalExpenses.toLocaleString('el-GR', { minimumFractionDigits: 2 })}`}
        icon={Truck}
      />

      <StatsCard
        label="Active Orders"
        value={totalOrders}
        icon={ShoppingCart}
        change={`${totalCustomers} customers`}
      />

    </div>
  );
}
