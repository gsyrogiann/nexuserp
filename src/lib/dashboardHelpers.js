export function calculateDashboardStats({
  customers = [],
  products = [],
  salesInvoices = [],
  purchaseInvoices = [],
  payments = [],
  salesOrders = [],
}) {
  const totalCustomers = customers.length;

  const totalRevenue = salesInvoices.reduce((sum, inv) => {
    return sum + (inv.total_amount || 0);
  }, 0);

  const totalExpenses = purchaseInvoices.reduce((sum, inv) => {
    return sum + (inv.total_amount || 0);
  }, 0);

  const totalPayments = payments.reduce((sum, p) => {
    return sum + (p.amount || 0);
  }, 0);

  const totalOrders = salesOrders.length;

  const lowStockProducts = products.filter(
    (p) => p.stock_quantity <= p.min_stock
  ).length;

  return {
    totalCustomers,
    totalRevenue,
    totalExpenses,
    totalPayments,
    totalOrders,
    lowStockProducts,
  };
}
