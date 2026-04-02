import OpenAI from 'npm:openai';
import { fetchAllEntities } from './fetchAll.ts';

export const HELP_TEXT = `Μπορώ να βοηθήσω με:
- Δείξε πελάτες
- Βρες πελάτη Παπαδόπουλος
- Δείξε προμηθευτές
- Δείξε απλήρωτα τιμολόγια
- Δείξε ανοιχτά tickets
- Δείξε emails χωρίς αντιστοίχιση
- Κατάσταση συστήματος

Μέσα από το web app μπορώ επίσης να ετοιμάσω πρόταση για νέο ticket ή draft email.`;

const MAX_LIST_ITEMS = 10;
const MAX_GENERAL_ITEMS = 5;
const INVOICE_ACTIVE_STATUSES = new Set(['unpaid', 'overdue', 'partial']);
const DETERMINISTIC_INTENTS = new Set([
  'list_customers',
  'search_customers',
  'list_suppliers',
  'search_suppliers',
  'list_invoices',
  'list_unpaid_invoices',
  'list_open_tickets',
  'list_unmatched_emails',
  'create_ticket',
  'draft_email',
  'system_status',
]);

type AssistantAction = Record<string, unknown> | null;

type SearchDescriptor = {
  raw: string,
  normalized: string,
  taxId: string,
  email: string,
  phone: string,
};

type EmailTransportStatus = {
  available: boolean,
  provider: string,
  reason: string,
};

type ConversationEntry = {
  role?: string,
  content?: string,
};

function normalizeText(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function compactWhitespace(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncateList<T>(records: T[], limit = MAX_LIST_ITEMS) {
  return records.slice(0, limit);
}

function stripEntityKeywords(message: string, keywords: string[]) {
  let normalized = normalizeText(message).replace(/\b(δειξε|δείξε|βρες|βρες μου|αναζητησε|αναζήτησε|show|list|find|search|τι|ποια|ποιοι|υπαρχουν|υπάρχουν)\b/g, '');

  for (const keyword of keywords) {
    normalized = normalized.replace(new RegExp(keyword, 'g'), '');
  }

  return compactWhitespace(
    normalized
      .replace(/\b(τον|την|τους|τις|στον|στην|για|μου|please|παρακαλω|παρακαλώ|αφμ|afm|vat|tax id|tax_id|email|mail|phone|τηλεφωνο|τηλέφωνο)\b/g, '')
  );
}

function extractSearchTerm(message: string, keywords: string[]) {
  const normalized = normalizeText(message);
  const patterns = [
    /\b(?:βρες|find|search|αναζητησε|αναζητησε μου)\b\s+(.+)$/,
    /\b(?:για|στον|στην|named|for)\b\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const cleaned = stripEntityKeywords(match[1], keywords);
      if (cleaned.length >= 2) {
        return cleaned;
      }
    }
  }

  const fallback = stripEntityKeywords(normalized, keywords);
  return fallback.length >= 2 ? fallback : '';
}

function normalizeDigits(value: string) {
  return String(value || '').replace(/\D+/g, '');
}

function detectTaxId(message: string) {
  const exactMatch = String(message || '').match(/\b\d{9}\b/);
  return exactMatch?.[0] || '';
}

function detectPhoneNumber(message: string) {
  const digits = normalizeDigits(message);
  return digits.length >= 10 ? digits : '';
}

function createSearchDescriptor(message: string, keywords: string[]): SearchDescriptor {
  const raw = extractSearchTerm(message, keywords);
  return {
    raw,
    normalized: normalizeText(raw),
    taxId: detectTaxId(message),
    email: detectEmailAddress(message),
    phone: detectPhoneNumber(message),
  };
}

function identifierMatches(record: Record<string, unknown>, search: SearchDescriptor) {
  if (search.taxId) {
    return normalizeDigits(String(record.tax_id || '')) === search.taxId;
  }

  if (search.email) {
    return normalizeText(String(record.email || '')) === normalizeText(search.email);
  }

  if (search.phone) {
    const recordPhone = normalizeDigits(String(record.phone || record.mobile || ''));
    return recordPhone.includes(search.phone) || search.phone.includes(recordPhone);
  }

  return false;
}

function matchesSearch(record: Record<string, unknown>, searchTerm: string, fields: string[]) {
  if (!searchTerm) {
    return true;
  }

  return fields.some((field) => normalizeText(record?.[field] ?? '').includes(searchTerm));
}

function detectEmailAddress(message: string) {
  const match = String(message || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || '';
}

function buildConversationSource(message: string, history: ConversationEntry[] = [], limit = 4) {
  const recentUserMessages = history
    .filter((entry) => entry?.role === 'user' && String(entry.content || '').trim())
    .slice(-limit)
    .map((entry) => String(entry.content || '').trim());

  return [...recentUserMessages, String(message || '').trim()].filter(Boolean).join('\n');
}

function inferContextualIntent(message: string, history: ConversationEntry[] = []) {
  const directIntent = detectIntent(message);

  if (directIntent !== 'general') {
    return directIntent;
  }

  const conversationSource = buildConversationSource(message, history);
  const contextualIntent = detectIntent(conversationSource);

  if (contextualIntent === 'draft_email' || contextualIntent === 'create_ticket') {
    return contextualIntent;
  }

  return directIntent;
}

function deriveTicketTitle(message: string) {
  const cleaned = compactWhitespace(
    String(message || '')
      .replace(/φτιαξε|φτιάξε|δημιουργησε|δημιούργησε|ανοιξε|άνοιξε|create|open/gi, '')
      .replace(/ticket/gi, '')
  );

  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'Νέο αίτημα υποστήριξης';
}

function deriveEmailSubject(message: string, customerName: string) {
  const quoted = String(message || '').match(/["“](.+?)["”]/)?.[1];
  if (quoted) {
    return compactWhitespace(quoted).slice(0, 120);
  }

  if (customerName) {
    return `Ενημέρωση για ${customerName}`;
  }

  return 'Σύντομη ενημέρωση από NexusERP';
}

function deriveEmailMessageContent(message: string) {
  const quoted = String(message || '').match(/["“](.+?)["”]/)?.[1];
  if (quoted) {
    return compactWhitespace(quoted);
  }

  const explicitEmail = detectEmailAddress(message);
  const text = compactWhitespace(
    String(message || '')
      .replace(/στείλε|στειλε|γράψε|γραψε|σύνταξε|συνταξε|draft|send|compose/gi, '')
      .replace(/email|mail|μαιλ|μέιλ/gi, '')
      .replace(explicitEmail, '')
      .replace(/\b(στον|στην|στο|προς|to)\b/gi, '')
  );

  const afterPrompt = text.match(/\b(?:και\s+(?:πες|γράψε|γραψε)|να\s+γράφει|με\s+κείμενο)\b\s+(.+)$/i)?.[1];
  if (afterPrompt) {
    return compactWhitespace(afterPrompt).replace(/^[,:-]\s*/, '');
  }

  const cleaned = compactWhitespace(text).replace(/^[,:-]\s*/, '');
  return cleaned.length > 0 ? cleaned : 'Στέλνω μια σύντομη ενημέρωση από το NexusERP.';
}

function deriveEmailBody(message: string, customerName: string) {
  const intro = customerName ? `Καλησπέρα ${customerName},` : 'Καλησπέρα,';
  const main = deriveEmailMessageContent(message);

  return `${intro}\n\n${main}\n\nΜε εκτίμηση,\nNexusERP`;
}

async function getEmailTransportStatus(base44: any): Promise<EmailTransportStatus> {
  try {
    const connection = await base44.asServiceRole.connectors.getConnection('gmail');
    if (connection?.accessToken) {
      return {
        available: true,
        provider: 'gmail_shared',
        reason: '',
      };
    }
  } catch {
    // Continue to app-user connector fallback.
  }

  try {
    const accessToken = await base44.asServiceRole.connectors.getCurrentAppUserAccessToken('gmail');
    if (accessToken) {
      return {
        available: true,
        provider: 'gmail_user',
        reason: '',
      };
    }
  } catch {
    // Fall through to unavailable state.
  }

  return {
    available: false,
    provider: 'none',
    reason: 'Δεν υπάρχει ενεργή σύνδεση Gmail για αποστολή email. Χρειάζεται σύνδεση Gmail connector πριν σταλεί μήνυμα από το NexusERP.',
  };
}

export function detectIntent(message: string) {
  const text = normalizeText(message);
  const hasCustomerKeyword = /πελατ|customer/.test(text);
  const hasSupplierKeyword = /προμηθευτ|supplier/.test(text);
  const hasIdentifierHint = /αφμ|afm|vat|tax id|tax_id/.test(text) || Boolean(detectEmailAddress(text)) || Boolean(detectTaxId(text));
  const hasSendVerb = /(στειλε|στείλε|γραψε|γράψε|συνταξε|σύνταξε|draft|send|compose)/.test(text);
  const hasMailIndicator = /email|mail|μαιλ|μέιλ|@|\bto\b|στον|στην|προς/.test(text);

  if (!text) return 'help';

  if (
    (/(φτιαξε|φτιάξε|δημιουργησε|δημιούργησε|ανοιξε|άνοιξε|create|open)/.test(text) && /ticket|tickets|αιτημ|βλαβ/.test(text)) ||
    (/ticket|tickets|αιτημ|βλαβ/.test(text) && /φτιαξε|φτιάξε|δημιουργησε|δημιούργησε|ανοιξε|άνοιξε|create|open/.test(text))
  ) {
    return 'create_ticket';
  }

  if ((hasSendVerb && hasMailIndicator) || (/email|mail/.test(text) && hasSendVerb)) {
    return 'draft_email';
  }

  if (/αναντιστοιχ|χωρις αντιστοιχιση|χωρίς αντιστοίχιση|unmatched/.test(text) && /email|mail/.test(text)) {
    return 'list_unmatched_emails';
  }

  if (/απληρωτ|ληξιπροθεσμ|unpaid|overdue/.test(text) && /τιμολογ|invoice/.test(text)) {
    return 'list_unpaid_invoices';
  }

  if (/ticket|tickets|αιτημ|βλαβ/.test(text)) {
    return 'list_open_tickets';
  }

  if (/τιμολογ|invoice/.test(text)) {
    return 'list_invoices';
  }

  if (hasCustomerKeyword) {
    return extractSearchTerm(message, ['πελατ', 'customer']).length > 0 ? 'search_customers' : 'list_customers';
  }

  if (hasSupplierKeyword) {
    return extractSearchTerm(message, ['προμηθευτ', 'supplier']).length > 0 ? 'search_suppliers' : 'list_suppliers';
  }

  if (hasIdentifierHint) {
    return 'search_customers';
  }

  if (/κατασταση|κατάσταση|status|health|sync|συστημα|σύστημα|system/.test(text)) {
    return 'system_status';
  }

  return 'general';
}

async function getCustomersSnapshot(base44: any, message = '', { limit = MAX_LIST_ITEMS } = {}) {
  const customers = await fetchAllEntities(base44.asServiceRole.entities.Customer, { sort: 'name' });
  const search = createSearchDescriptor(message, ['πελατ', 'customer']);
  const filtered = search.raw || search.taxId || search.email || search.phone
    ? customers.filter((customer: Record<string, unknown>) =>
        identifierMatches(customer, search) ||
        matchesSearch(customer, search.normalized, ['name', 'tax_id', 'email', 'phone', 'mobile', 'city'])
      )
    : customers;

  return {
    total: customers.length,
    matched: filtered.length,
    search: search.taxId || search.email || search.phone || search.raw,
    items: truncateList(filtered, limit).map((customer: Record<string, unknown>) => ({
      id: customer.id,
      name: customer.name,
      tax_id: customer.tax_id || null,
      email: customer.email || null,
      phone: customer.phone || customer.mobile || null,
      city: customer.city || null,
      status: customer.status || 'unknown',
    })),
  };
}

async function getSuppliersSnapshot(base44: any, message = '', { limit = MAX_LIST_ITEMS } = {}) {
  const suppliers = await fetchAllEntities(base44.asServiceRole.entities.Supplier, { sort: 'name' });
  const search = createSearchDescriptor(message, ['προμηθευτ', 'supplier']);
  const filtered = search.raw || search.taxId || search.email || search.phone
    ? suppliers.filter((supplier: Record<string, unknown>) =>
        identifierMatches(supplier, search) ||
        matchesSearch(supplier, search.normalized, ['name', 'tax_id', 'email', 'phone', 'city'])
      )
    : suppliers;

  return {
    total: suppliers.length,
    matched: filtered.length,
    search: search.taxId || search.email || search.phone || search.raw,
    items: truncateList(filtered, limit).map((supplier: Record<string, unknown>) => ({
      id: supplier.id,
      name: supplier.name,
      tax_id: supplier.tax_id || null,
      email: supplier.email || null,
      phone: supplier.phone || null,
      city: supplier.city || null,
      status: supplier.status || 'unknown',
    })),
  };
}

async function getInvoicesSnapshot(base44: any, { onlyUnpaid = false } = {}) {
  const [salesInvoices, purchaseInvoices] = await Promise.all([
    fetchAllEntities(base44.asServiceRole.entities.SalesInvoice, { sort: '-date', max: 200 }),
    fetchAllEntities(base44.asServiceRole.entities.PurchaseInvoice, { sort: '-date', max: 200 }),
  ]);

  const filteredSales = onlyUnpaid
    ? salesInvoices.filter((invoice: Record<string, unknown>) => INVOICE_ACTIVE_STATUSES.has(String(invoice.status || '')))
    : salesInvoices;

  return {
    sales: {
      total: salesInvoices.length,
      matched: filteredSales.length,
      overdue: salesInvoices.filter((invoice: Record<string, unknown>) => invoice.status === 'overdue').length,
      unpaid: salesInvoices.filter((invoice: Record<string, unknown>) => INVOICE_ACTIVE_STATUSES.has(String(invoice.status || ''))).length,
      items: truncateList(filteredSales).map((invoice: Record<string, unknown>) => ({
        id: invoice.id,
        number: invoice.number || invoice.id,
        customer_name: invoice.customer_name || 'Χωρίς πελάτη',
        total: Number(invoice.total || 0),
        status: invoice.status || 'draft',
        date: invoice.date || invoice.created_date || null,
      })),
    },
    purchases: {
      total: purchaseInvoices.length,
      items: truncateList(purchaseInvoices).map((invoice: Record<string, unknown>) => ({
        id: invoice.id,
        number: invoice.number || invoice.id,
        supplier_name: invoice.supplier_name || 'Χωρίς προμηθευτή',
        total: Number(invoice.total || 0),
        status: invoice.status || 'draft',
        date: invoice.date || invoice.created_date || null,
      })),
    },
  };
}

async function getTicketsSnapshot(base44: any) {
  const tickets = await fetchAllEntities(base44.asServiceRole.entities.ServiceTicket, { sort: '-created_date', max: 200 });
  const openTickets = tickets.filter((ticket: Record<string, unknown>) => ticket.status !== 'closed');

  return {
    total: tickets.length,
    open: openTickets.length,
    items: truncateList(openTickets).map((ticket: Record<string, unknown>) => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number || ticket.id,
      title: ticket.title || 'Χωρίς τίτλο',
      customer: ticket.customer || ticket.customer_name || 'Χωρίς πελάτη',
      status: ticket.status || 'open',
      priority: ticket.priority || 'normal',
    })),
  };
}

async function getUnmatchedEmailsSnapshot(base44: any) {
  const emails = await fetchAllEntities(base44.asServiceRole.entities.UnmatchedEmail, {
    query: { review_status: 'pending' },
    sort: '-received_at',
    max: 200,
  });

  return {
    total: emails.length,
    items: truncateList(emails).map((email: Record<string, unknown>) => ({
      id: email.id,
      sender_email: email.sender_email || null,
      subject: email.subject || '(χωρίς θέμα)',
      received_at: email.received_at || null,
      sync_source: email.sync_source || 'gmail',
    })),
  };
}

async function getSystemStatusSnapshot(base44: any) {
  const [customers, suppliers, salesInvoices, tickets, unmatchedEmails] = await Promise.all([
    fetchAllEntities(base44.asServiceRole.entities.Customer, { sort: 'name' }),
    fetchAllEntities(base44.asServiceRole.entities.Supplier, { sort: 'name' }),
    fetchAllEntities(base44.asServiceRole.entities.SalesInvoice, { sort: '-date', max: 200 }),
    fetchAllEntities(base44.asServiceRole.entities.ServiceTicket, { sort: '-created_date', max: 200 }),
    fetchAllEntities(base44.asServiceRole.entities.UnmatchedEmail, { query: { review_status: 'pending' }, sort: '-received_at', max: 200 }),
  ]);

  return {
    customers: customers.length,
    suppliers: suppliers.length,
    sales_invoices: salesInvoices.length,
    overdue_sales_invoices: salesInvoices.filter((invoice: Record<string, unknown>) => invoice.status === 'overdue').length,
    unpaid_sales_invoices: salesInvoices.filter((invoice: Record<string, unknown>) => INVOICE_ACTIVE_STATUSES.has(String(invoice.status || ''))).length,
    open_tickets: tickets.filter((ticket: Record<string, unknown>) => ticket.status !== 'closed').length,
    unmatched_emails: unmatchedEmails.length,
  };
}

async function getCreateTicketContext(base44: any, message: string, history: ConversationEntry[] = []) {
  const source = buildConversationSource(message, history);
  const [customersContext, tickets] = await Promise.all([
    getCustomersSnapshot(base44, source, { limit: 3 }),
    fetchAllEntities(base44.asServiceRole.entities.ServiceTicket, { sort: '-created_date', max: 200 }),
  ]);

  const matchedCustomer = customersContext.items[0] || null;
  const nextTicketNumber = `TKT-${String(tickets.length + 1).padStart(4, '0')}`;

  return {
    canCreateAction: Boolean(matchedCustomer),
    nextTicketNumber,
    matchedCustomer,
    suggestedTitle: deriveTicketTitle(source),
    reason: matchedCustomer ? '' : 'Δεν βρήκα σαφή πελάτη για να ετοιμάσω ticket. Δώσε όνομα πελάτη ή email.',
  };
}

async function getDraftEmailContext(base44: any, message: string, history: ConversationEntry[] = []) {
  const source = buildConversationSource(message, history);
  const explicitEmail = detectEmailAddress(source);
  const [customersContext, transport] = await Promise.all([
    getCustomersSnapshot(base44, source, { limit: 3 }),
    getEmailTransportStatus(base44),
  ]);
  const matchedCustomer = customersContext.items.find((customer: Record<string, unknown>) => customer.email) || null;
  const recipientEmail = explicitEmail || matchedCustomer?.email || '';
  const recipientName = matchedCustomer?.name || '';
  const subject = deriveEmailSubject(source, recipientName) || 'Σύντομη ενημέρωση από NexusERP';
  const body = deriveEmailBody(source, recipientName) || `Καλησπέρα,\n\nΓεια!\n\nΜε εκτίμηση,\nNexusERP`;

  return {
    canCreateAction: Boolean(recipientEmail) && transport.available,
    to: recipientEmail,
    customer_id: matchedCustomer?.id || null,
    customer_name: recipientName,
    subject,
    body,
    transport_ready: transport.available,
    transport_provider: transport.provider,
    transport_reason: transport.reason,
    reason: !recipientEmail
      ? 'Δεν βρήκα email παραλήπτη. Δώσε email ή πελάτη με καταχωρημένο email.'
      : transport.available
        ? ''
        : transport.reason,
  };
}

export async function buildIntentContext(base44: any, intent: string, message = '', history: ConversationEntry[] = []) {
  switch (intent) {
    case 'list_customers':
    case 'search_customers':
      return { kind: intent, ...(await getCustomersSnapshot(base44, message)) };
    case 'list_suppliers':
    case 'search_suppliers':
      return { kind: intent, ...(await getSuppliersSnapshot(base44, message)) };
    case 'list_invoices':
      return { kind: intent, ...(await getInvoicesSnapshot(base44)) };
    case 'list_unpaid_invoices':
      return { kind: intent, ...(await getInvoicesSnapshot(base44, { onlyUnpaid: true })) };
    case 'list_open_tickets':
      return { kind: intent, ...(await getTicketsSnapshot(base44)) };
    case 'list_unmatched_emails':
      return { kind: intent, ...(await getUnmatchedEmailsSnapshot(base44)) };
    case 'create_ticket':
      return { kind: intent, ...(await getCreateTicketContext(base44, message, history)) };
    case 'draft_email':
      return { kind: intent, ...(await getDraftEmailContext(base44, message, history)) };
    case 'system_status':
      return { kind: intent, ...(await getSystemStatusSnapshot(base44)) };
    default:
      return {
        kind: 'general',
        customers: await getCustomersSnapshot(base44, '', { limit: MAX_GENERAL_ITEMS }),
        suppliers: await getSuppliersSnapshot(base44, '', { limit: MAX_GENERAL_ITEMS }),
        invoices: await getInvoicesSnapshot(base44),
        tickets: await getTicketsSnapshot(base44),
        unmatchedEmails: await getUnmatchedEmailsSnapshot(base44),
        system: await getSystemStatusSnapshot(base44),
      };
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function buildAssistantAction(intent: string, context: any, channel = 'app'): AssistantAction {
  if (channel !== 'app') {
    return null;
  }

  if (intent === 'create_ticket' && context.canCreateAction && context.matchedCustomer) {
    return {
      action: 'create_ticket',
      ticket_data: {
        ticket_number: context.nextTicketNumber,
        title: context.suggestedTitle,
        description: context.suggestedTitle,
        customer: context.matchedCustomer.name,
        customer_id: context.matchedCustomer.id,
        customer_name: context.matchedCustomer.name,
        status: 'open',
        priority: 'normal',
        category: 'technical',
      },
      confirmation_message: `Να δημιουργήσω το ticket ${context.nextTicketNumber} για τον πελάτη ${context.matchedCustomer.name};`,
    };
  }

  if (intent === 'draft_email' && context.canCreateAction) {
    return {
      action: 'send_email',
      to: context.to,
      subject: context.subject || 'Σύντομη ενημέρωση από NexusERP',
      body: context.body || 'Καλησπέρα,\n\nΓεια!\n\nΜε εκτίμηση,\nNexusERP',
      customer_id: context.customer_id,
      customer_name: context.customer_name,
      confirmation_message: `Να στείλω email στο ${context.to} με θέμα "${context.subject || 'Σύντομη ενημέρωση από NexusERP'}";`,
    };
  }

  return null;
}

function buildFallbackReply(intent: string, context: any, channel = 'app') {
  if (intent === 'list_customers' || intent === 'search_customers') {
    const label = context.search ? `για "${context.search}"` : '';
    const lines = context.items.map((customer: Record<string, unknown>) => `- ${customer.name} (${customer.status})${customer.tax_id ? ` • ΑΦΜ ${customer.tax_id}` : ''}${customer.email ? ` • ${customer.email}` : ''}`);
    return `Βρήκα ${context.matched} πελάτες ${label}.\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν πελάτες με αυτά τα κριτήρια.'}`;
  }

  if (intent === 'list_suppliers' || intent === 'search_suppliers') {
    const label = context.search ? `για "${context.search}"` : '';
    const lines = context.items.map((supplier: Record<string, unknown>) => `- ${supplier.name} (${supplier.status})${supplier.tax_id ? ` • ΑΦΜ ${supplier.tax_id}` : ''}${supplier.email ? ` • ${supplier.email}` : ''}`);
    return `Βρήκα ${context.matched} προμηθευτές ${label}.\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν προμηθευτές με αυτά τα κριτήρια.'}`;
  }

  if (intent === 'list_invoices' || intent === 'list_unpaid_invoices') {
    const salesLines = context.sales.items.map((invoice: Record<string, unknown>) => `- ${invoice.number}: ${invoice.customer_name} • ${formatCurrency(Number(invoice.total || 0))} • ${invoice.status}`);
    const prefix = intent === 'list_unpaid_invoices'
      ? `Ανεξόφλητα/ληξιπρόθεσμα τιμολόγια πωλήσεων: ${context.sales.matched}`
      : `Σύνολο τιμολογίων πωλήσεων: ${context.sales.total}`;
    return `${prefix}\nΛηξιπρόθεσμα: ${context.sales.overdue}\nΑνεξόφλητα: ${context.sales.unpaid}\n${salesLines.length > 0 ? salesLines.join('\n') : 'Δεν υπάρχουν τιμολόγια για εμφάνιση.'}`;
  }

  if (intent === 'list_open_tickets') {
    const lines = context.items.map((ticket: Record<string, unknown>) => `- ${ticket.ticket_number}: ${ticket.title} • ${ticket.customer} • ${ticket.priority}`);
    return `Ανοιχτά tickets: ${context.open}\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν ανοιχτά tickets.'}`;
  }

  if (intent === 'list_unmatched_emails') {
    const lines = context.items.map((email: Record<string, unknown>) => `- ${email.subject} • ${email.sender_email || 'χωρίς αποστολέα'}`);
    return `Emails χωρίς αντιστοίχιση: ${context.total}\n${lines.length > 0 ? lines.join('\n') : 'Δεν υπάρχουν pending unmatched emails.'}`;
  }

  if (intent === 'system_status') {
    return `Κατάσταση συστήματος:
- Πελάτες: ${context.customers}
- Προμηθευτές: ${context.suppliers}
- Τιμολόγια πωλήσεων: ${context.sales_invoices}
- Ανεξόφλητα τιμολόγια: ${context.unpaid_sales_invoices}
- Ληξιπρόθεσμα τιμολόγια: ${context.overdue_sales_invoices}
- Ανοιχτά tickets: ${context.open_tickets}
- Unmatched emails: ${context.unmatched_emails}`;
  }

  if (intent === 'create_ticket') {
    if (channel === 'telegram') {
      return context.matchedCustomer
        ? `Βρήκα πελάτη ${context.matchedCustomer.name}. Για λόγους ασφάλειας, δημιουργία ticket γίνεται μόνο μέσα από το web app.`
        : context.reason;
    }

    if (!context.canCreateAction || !context.matchedCustomer) {
      return context.reason;
    }
    return `Ετοίμασα πρόταση ticket για τον πελάτη ${context.matchedCustomer.name}. Επιβεβαίωσε για να το δημιουργήσω.`;
  }

  if (intent === 'draft_email') {
    if (channel === 'telegram') {
      return context.canCreateAction
        ? `Βρήκα παραλήπτη ${context.to}. Για λόγους ασφάλειας, αποστολή email γίνεται μόνο μέσα από το web app.`
        : context.reason;
    }

    if (!context.to) {
      return context.reason;
    }

    if (!context.transport_ready) {
      return `Ετοίμασα draft email για ${context.to}, αλλά δεν μπορώ να το στείλω ακόμα.\n\nΘέμα: ${context.subject}\n\n${context.body}\n\n${context.transport_reason}`;
    }

    return `Ετοίμασα draft email για ${context.to}. Επιβεβαίωσε για να σταλεί.`;
  }

  return `Μπορώ να βοηθήσω με πραγματικά δεδομένα ERP.\n${HELP_TEXT}`;
}

export async function generateAssistantReply({
  message,
  intent,
  context,
  channel = 'app',
  history = [],
}: {
  message: string,
  intent: string,
  context: any,
  channel?: 'app' | 'telegram',
  history?: Array<{ role: string, content: string }>,
}) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey || DETERMINISTIC_INTENTS.has(intent)) {
    return buildFallbackReply(intent, context, channel);
  }

  const openai = new OpenAI({ apiKey });
  const messages = [
    {
      role: 'system',
      content: `Είσαι ο NexusERP assistant.
Απαντάς μόνο στα Ελληνικά, σύντομα και συγκεκριμένα.
Χρησιμοποιείς μόνο τα πραγματικά δεδομένα που σου δίνω στο context.
Αν λείπει κρίσιμο στοιχείο, ζήτησέ το καθαρά.
Κανάλι: ${channel}.
${channel === 'telegram'
  ? 'Στο Telegram απαντάς μόνο read-only και δεν επιστρέφεις action blocks.'
  : 'Στο web app μπορείς να επιστρέψεις action block ΜΟΝΟ για create_ticket ή send_email όταν το context λέει canCreateAction=true.'}

Action schema για web app:
\`\`\`action
{
  "action": "create_ticket" | "send_email",
  "...": "..."
}
\`\`\`

Βοήθεια:
${HELP_TEXT}`,
    },
    ...history
      .filter((entry) => entry?.role === 'user' || entry?.role === 'assistant')
      .slice(-6)
      .map((entry) => ({ role: entry.role, content: String(entry.content || '').slice(0, 2000) })),
    {
      role: 'user',
      content: `Intent: ${intent}
User message: ${message}
Data context:
${JSON.stringify(context, null, 2)}`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content?.trim() || buildFallbackReply(intent, context, channel);
  } catch (error) {
    console.error('Assistant generation failed:', error);
    return buildFallbackReply(intent, context, channel);
  }
}

export async function runAssistantConversation({
  base44,
  message,
  channel = 'app',
  history = [],
}: {
  base44: any,
  message: string,
  channel?: 'app' | 'telegram',
  history?: Array<{ role: string, content: string }>,
}) {
  const intent = inferContextualIntent(message, history);
  const context = await buildIntentContext(base44, intent, message, history);
  const action = buildAssistantAction(intent, context, channel);
  const reply = await generateAssistantReply({
    message,
    intent,
    context,
    channel,
    history,
  });

  return { intent, context, reply, action };
}
