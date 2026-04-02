import { base44 } from '@/api/base44Client';

/**
 * Υπολογισμός Οικονομικών KPIs & AI Insights
 */
export function calculateDashboardStats({
  customers = [],
  products = [],
  salesInvoices = [],
  purchaseInvoices = [],
  payments = [],
  salesOrders = [],
}) {
  const now = new Date();

  // 1. ΑΝΑΛΥΣΗ ΠΩΛΗΣΕΩΝ (Σύνδεση με Price Tiers)
  const salesTotals = salesInvoices.reduce((acc, inv) => {
    const gross = Number(inv.total || 0);
    const vatRate = Number(inv.vat_rate || 24);
    const net = gross / (1 + vatRate / 100);
    const paid = Number(inv.paid_amount || 0);

    acc.netSales += net;
    acc.vatSales += (gross - net);
    acc.totalCollected += paid;
    
    // Έλεγχος Ληξιπρόθεσμων (Aging)
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    if (inv.status !== 'paid' && dueDate && dueDate < now) {
      acc.overdueAmount += (gross - paid);
    }
    return acc;
  }, { netSales: 0, vatSales: 0, totalCollected: 0, overdueAmount: 0 });

  // 2. ΑΝΑΛΥΣΗ ΑΓΟΡΩΝ & ΕΞΟΔΩΝ
  const purchaseTotals = purchaseInvoices.reduce((acc, inv) => {
    const gross = Number(inv.total || 0);
    const vatRate = Number(inv.vat_rate || 24);
    const net = gross / (1 + vatRate / 100);
    
    acc.netPurchases += net;
    acc.vatPurchases += (gross - net);
    return acc;
  }, { netPurchases: 0, vatPurchases: 0 });

  // 3. ΥΠΟΛΟΓΙΣΜΟΙ ΚΕΡΔΟΥΣ & ΦΟΡΩΝ
  const netProfit = salesTotals.netSales - purchaseTotals.netPurchases;
  const vatLiability = salesTotals.vatSales - purchaseTotals.vatPurchases;
  const profitMargin = salesTotals.netSales > 0 ? (netProfit / salesTotals.netSales) * 100 : 0;

  // 4. ΑΞΙΑ ΑΠΟΘΕΜΑΤΟΣ
  const inventoryValue = products.reduce((sum, p) => {
    return sum + (Number(p.stock_quantity || 0) * Number(p.buy_price || 0));
  }, 0);

  return {
    // Βασικά KPIs
    totalRevenue: salesTotals.netSales + salesTotals.vatSales,
    netRevenue: salesTotals.netSales,
    netProfit,
    profitMargin: profitMargin.toFixed(1),
    
    // Λογιστική Εικόνα
    vatToPay: vatLiability > 0 ? vatLiability : 0,
    overdueReceivables: salesTotals.overdueAmount,
    
    // Αποθέματα
    inventoryValue,
    lowStockCount: products.filter(p => Number(p.stock_quantity || 0) <= Number(p.min_stock || 0)).length,
    
    // Counts
    customerCount: customers.length,
    orderCount: salesOrders.length,
    
    // Raw Data για το AI (Helper)
    rawSummary: {
      sales: salesTotals.netSales.toFixed(2),
      purchases: purchaseTotals.netPurchases.toFixed(2),
      profit: netProfit.toFixed(2),
      margin: profitMargin.toFixed(1),
      overdue: salesTotals.overdueAmount.toFixed(2)
    }
  };
}

/**
 * AI STRATEGIC ADVISOR
 * Καλείται από το Dashboard για να δώσει συμβουλές βασισμένες στα παραπάνω νούμερα.
 */
export async function getDashboardAIAdvice(stats) {
  try {
    const prompt = `
      Είσαι ο CFO του Nexus ERP. Ανάλυσε τα εξής οικονομικά δεδομένα:
      - Καθαρά Έσοδα: €${stats.netRevenue.toFixed(2)}
      - Καθαρό Κέρδος: €${stats.netProfit.toFixed(2)}
      - Περιθώριο Κέρδους: ${stats.profitMargin}%
      - Ληξιπρόθεσμα (Overdue): €${stats.overdueReceivables.toFixed(2)}
      - ΦΠΑ προς Απόδοση: €${stats.vatToPay.toFixed(2)}

      Δώσε μια σύντομη, στρατηγική συμβουλή (2 προτάσεις) για τη βελτίωση του Cash Flow ή της κερδοφορίας.
    `;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'reply' in response && typeof response.reply === 'string') {
      return response.reply;
    }

    return "Η ανάλυση AI ολοκληρώθηκε χωρίς αναγνώσιμη απάντηση.";
  } catch (error) {
    console.error("AI Advice failed:", error);
    return "Η ανάλυση AI δεν είναι διαθέσιμη προσωρινά.";
  }
}
