import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function asNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [customers, products, salesInvoices, purchaseInvoices, payments, salesOrders, activityLog] = await Promise.all([
      base44.asServiceRole.entities.Customer.list('-created_date', 1_000),
      base44.asServiceRole.entities.Product.list('-created_date', 1_000),
      base44.asServiceRole.entities.SalesInvoice.list('-created_date', 1_000),
      base44.asServiceRole.entities.PurchaseInvoice.list('-created_date', 1_000),
      base44.asServiceRole.entities.Payment.list('-created_date', 1_000),
      base44.asServiceRole.entities.SalesOrder.list('-created_date', 1_000),
      base44.asServiceRole.entities.ActivityLog.list('-created_date', 20),
    ]);

    return Response.json({
      stats: {
        totalCustomers: customers.length,
        totalRevenue: salesInvoices.reduce((sum: number, invoice: Record<string, unknown>) => sum + asNumber(invoice.total), 0),
        totalExpenses: purchaseInvoices.reduce((sum: number, invoice: Record<string, unknown>) => sum + asNumber(invoice.total), 0),
        totalPayments: payments.reduce((sum: number, payment: Record<string, unknown>) => sum + asNumber(payment.amount), 0),
        totalOrders: salesOrders.length,
        lowStockProducts: products.filter((product: Record<string, unknown>) => asNumber(product.stock_quantity) <= asNumber(product.min_stock)).length,
      },
      recentActivity: activityLog,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to load dashboard stats' }, { status: 500 });
  }
});
