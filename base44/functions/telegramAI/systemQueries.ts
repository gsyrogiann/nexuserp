import { fetchAllEntities } from '../_shared/fetchAll.ts';

function truncateList(records, limit = 10) {
  return records.slice(0, limit);
}

export async function getCustomersSnapshot(base44) {
  const customers = await fetchAllEntities(base44.asServiceRole.entities.Customer, { sort: 'name' });
  return {
    total: customers.length,
    items: truncateList(customers).map((customer) => ({
      id: customer.id,
      name: customer.name,
      tax_id: customer.tax_id || null,
      email: customer.email || null,
      phone: customer.phone || customer.mobile || null,
      status: customer.status || 'unknown',
    })),
  };
}

export async function getSuppliersSnapshot(base44) {
  const suppliers = await fetchAllEntities(base44.asServiceRole.entities.Supplier, { sort: 'name' });
  return {
    total: suppliers.length,
    items: truncateList(suppliers).map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id || null,
      email: supplier.email || null,
      phone: supplier.phone || null,
      status: supplier.status || 'unknown',
    })),
  };
}

export async function getInvoicesSnapshot(base44) {
  const [salesInvoices, purchaseInvoices] = await Promise.all([
    fetchAllEntities(base44.asServiceRole.entities.SalesInvoice, { sort: '-date', max: 200 }),
    fetchAllEntities(base44.asServiceRole.entities.PurchaseInvoice, { sort: '-date', max: 200 }),
  ]);

  const recentSales = truncateList(salesInvoices).map((invoice) => ({
    number: invoice.number || invoice.id,
    customer_name: invoice.customer_name || 'Χωρίς πελάτη',
    total: Number(invoice.total || 0),
    status: invoice.status || 'draft',
    date: invoice.date || invoice.created_date || null,
  }));

  const recentPurchases = truncateList(purchaseInvoices).map((invoice) => ({
    number: invoice.number || invoice.id,
    supplier_name: invoice.supplier_name || 'Χωρίς προμηθευτή',
    total: Number(invoice.total || 0),
    status: invoice.status || 'draft',
    date: invoice.date || invoice.created_date || null,
  }));

  const overdueSales = salesInvoices.filter((invoice) => invoice.status === 'overdue').length;
  const unpaidSales = salesInvoices.filter((invoice) => ['unpaid', 'overdue'].includes(invoice.status)).length;

  return {
    sales: {
      total: salesInvoices.length,
      overdue: overdueSales,
      unpaid: unpaidSales,
      items: recentSales,
    },
    purchases: {
      total: purchaseInvoices.length,
      items: recentPurchases,
    },
  };
}

export async function getSystemStatusSnapshot(base44) {
  const [customers, suppliers, salesInvoices, tickets] = await Promise.all([
    fetchAllEntities(base44.asServiceRole.entities.Customer, { sort: 'name' }),
    fetchAllEntities(base44.asServiceRole.entities.Supplier, { sort: 'name' }),
    fetchAllEntities(base44.asServiceRole.entities.SalesInvoice, { sort: '-date', max: 200 }),
    fetchAllEntities(base44.asServiceRole.entities.ServiceTicket, { sort: '-created_date', max: 200 }),
  ]);

  return {
    customers: customers.length,
    suppliers: suppliers.length,
    sales_invoices: salesInvoices.length,
    overdue_sales_invoices: salesInvoices.filter((invoice) => invoice.status === 'overdue').length,
    open_tickets: tickets.filter((ticket) => ticket.status === 'open').length,
  };
}

export async function buildIntentContext(base44, intent) {
  switch (intent) {
    case 'list_customers':
      return { kind: intent, ...(await getCustomersSnapshot(base44)) };
    case 'list_suppliers':
      return { kind: intent, ...(await getSuppliersSnapshot(base44)) };
    case 'list_invoices':
      return { kind: intent, ...(await getInvoicesSnapshot(base44)) };
    case 'system_status':
      return { kind: intent, ...(await getSystemStatusSnapshot(base44)) };
    default:
      return {
        kind: 'general',
        customers: await getCustomersSnapshot(base44),
        suppliers: await getSuppliersSnapshot(base44),
        invoices: await getInvoicesSnapshot(base44),
        system: await getSystemStatusSnapshot(base44),
      };
  }
}
