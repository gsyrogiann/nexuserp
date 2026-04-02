import OpenAI from 'npm:openai';

const HELP_TEXT = `Μπορείς να μου ζητήσεις:
- Δείξε πελάτες
- Δείξε προμηθευτές
- Τι τιμολόγια υπάρχουν
- Κατάσταση συστήματος`;

export function detectIntent(message) {
  const text = String(message || '').toLowerCase();

  if (/(πελάτ|customer)/.test(text)) return 'list_customers';
  if (/(προμηθευτ|supplier)/.test(text)) return 'list_suppliers';
  if (/(τιμολόγ|invoice)/.test(text)) return 'list_invoices';
  if (/(κατάσταση|status|σύστημα|system)/.test(text)) return 'system_status';

  return 'general';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function buildFallbackReply(intent, context) {
  if (intent === 'list_customers') {
    const lines = context.items.map((customer) => `- ${customer.name} (${customer.status})`);
    return `Βρήκα ${context.total} πελάτες.\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν πελάτες.'}`;
  }

  if (intent === 'list_suppliers') {
    const lines = context.items.map((supplier) => `- ${supplier.name} (${supplier.status})`);
    return `Βρήκα ${context.total} προμηθευτές.\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν προμηθευτές.'}`;
  }

  if (intent === 'list_invoices') {
    const salesLines = context.sales.items.map((invoice) => `- ${invoice.number}: ${invoice.customer_name} • ${formatCurrency(invoice.total)} • ${invoice.status}`);
    return `Σύνολο τιμολογίων πωλήσεων: ${context.sales.total}\nΛηξιπρόθεσμα: ${context.sales.overdue}\nΑνεξόφλητα: ${context.sales.unpaid}\n${salesLines.length > 0 ? salesLines.join('\n') : 'Δεν υπάρχουν τιμολόγια.'}`;
  }

  if (intent === 'system_status') {
    return `Κατάσταση συστήματος:
- Πελάτες: ${context.customers}
- Προμηθευτές: ${context.suppliers}
- Τιμολόγια πωλήσεων: ${context.sales_invoices}
- Ληξιπρόθεσμα τιμολόγια: ${context.overdue_sales_invoices}
- Ανοιχτά tickets: ${context.open_tickets}`;
  }

  return `Μπορώ να βοηθήσω με πραγματικά δεδομένα ERP.\n${HELP_TEXT}`;
}

export async function generateAssistantReply({ message, intent, context }) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return buildFallbackReply(intent, context);
  }

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Είσαι Telegram AI assistant για Nexus ERP. Απαντάς μόνο στα Ελληνικά, σύντομα και συγκεκριμένα. Χρησιμοποίησε μόνο τα πραγματικά δεδομένα που σου δίνω. Αν το αίτημα δεν καλύπτεται, δώσε σύντομη βοήθεια.\n${HELP_TEXT}`,
      },
      {
        role: 'user',
        content: `Intent: ${intent}\nUser message: ${message}\nData context:\n${JSON.stringify(context, null, 2)}`,
      },
    ],
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content?.trim() || buildFallbackReply(intent, context);
}
