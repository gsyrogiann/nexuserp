import { DEFAULT_FEATURE_ACCESS } from '../lib/rbac.js';

const STORAGE_KEY = 'nexuserp_local_runtime_v1';
const isBrowser = typeof window !== 'undefined';
const memoryStorage = new Map();

const storage = {
  getItem(key) {
    if (isBrowser) {
      return window.localStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
  },
  setItem(key, value) {
    if (isBrowser) {
      window.localStorage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = 'rec') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function asNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function sortRecords(records, sort = '-created_date') {
  if (!sort) {
    return [...records];
  }

  const field = String(sort).replace(/^-/, '');
  const desc = String(sort).startsWith('-');

  return [...records].sort((left, right) => {
    const a = left?.[field];
    const b = right?.[field];

    if (a == null && b == null) return 0;
    if (a == null) return desc ? 1 : -1;
    if (b == null) return desc ? -1 : 1;

    if (typeof a === 'number' && typeof b === 'number') {
      return desc ? b - a : a - b;
    }

    return desc
      ? String(b).localeCompare(String(a), 'el')
      : String(a).localeCompare(String(b), 'el');
  });
}

function matchesFilterValue(recordValue, filterValue) {
  if (Array.isArray(filterValue)) {
    return filterValue.includes(recordValue);
  }

  if (typeof filterValue === 'string' && typeof recordValue === 'string') {
    return recordValue.toLowerCase().includes(filterValue.toLowerCase());
  }

  return recordValue === filterValue;
}

function filterRecords(records, filter = {}) {
  const entries = Object.entries(filter || {}).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) {
    return [...records];
  }

  return records.filter((record) =>
    entries.every(([key, value]) => matchesFilterValue(record?.[key], value))
  );
}

function paginate(records, limit = 100, skip = 0) {
  if (limit == null) {
    return records.slice(skip);
  }

  return records.slice(skip, skip + limit);
}

function createPermissionSettings() {
  return Object.entries(DEFAULT_FEATURE_ACCESS).map(([featureKey, setting]) => ({
    id: `permission_${featureKey}`,
    feature_key: featureKey,
    enabled: setting.enabled,
    allowed_roles: [...setting.allowed_roles],
    permissions_by_role: { ...setting.permissions_by_role },
    created_date: nowIso(),
    updated_date: nowIso(),
  }));
}

export function createDefaultState() {
  const createdDate = nowIso();
  const currentUserId = 'user_local_admin';

  const customers = [
    {
      id: 'customer_sigma_hellas',
      name: 'Sigma Hellas',
      tax_id: '099999999',
      email: 'info@sigma-hellas.gr',
      phone: '2101234567',
      address: 'Λεωφόρος Κηφισίας 10',
      city: 'Αθήνα',
      postal_code: '11526',
      status: 'active',
      created_date: createdDate,
      updated_date: createdDate,
    },
    {
      id: 'customer_papadopoulos',
      name: 'Παπαδόπουλος Trading',
      tax_id: '123456789',
      email: 'sales@papadopoulos.gr',
      phone: '2310123456',
      address: 'Εγνατία 120',
      city: 'Θεσσαλονίκη',
      postal_code: '54621',
      status: 'active',
      created_date: createdDate,
      updated_date: createdDate,
    },
  ];

  const products = [
    {
      id: 'product_router',
      sku: 'RTR-001',
      name: 'Router Pro',
      category: 'Networking',
      stock_quantity: 12,
      min_stock: 4,
      sell_price: 149,
      buy_price: 105,
      vat_rate: 24,
      unit: 'piece',
      status: 'active',
      created_date: createdDate,
      updated_date: createdDate,
    },
    {
      id: 'product_switch',
      sku: 'SWT-008',
      name: 'Switch 8-Port',
      category: 'Networking',
      stock_quantity: 5,
      min_stock: 3,
      sell_price: 89,
      buy_price: 55,
      vat_rate: 24,
      unit: 'piece',
      status: 'active',
      created_date: createdDate,
      updated_date: createdDate,
    },
  ];

  const salesInvoices = [
    {
      id: 'sales_invoice_1',
      customer_id: customers[0].id,
      invoice_number: 'INV-2026-001',
      total: 1240,
      paid_amount: 0,
      vat_rate: 24,
      status: 'overdue',
      due_date: '2026-03-20',
      created_date: createdDate,
      updated_date: createdDate,
    },
    {
      id: 'sales_invoice_2',
      customer_id: customers[1].id,
      invoice_number: 'INV-2026-002',
      total: 620,
      paid_amount: 620,
      vat_rate: 24,
      status: 'paid',
      due_date: '2026-04-15',
      created_date: createdDate,
      updated_date: createdDate,
    },
  ];

  const purchaseInvoices = [
    {
      id: 'purchase_invoice_1',
      supplier_id: 'supplier_netcom',
      invoice_number: 'PINV-2026-001',
      total: 420,
      vat_rate: 24,
      status: 'open',
      due_date: '2026-04-20',
      created_date: createdDate,
      updated_date: createdDate,
    },
  ];

  const emails = [
    {
      id: 'email_1',
      to: 'info@sigma-hellas.gr',
      subject: 'Καλωσήρθατε στο local NexusERP',
      body: 'Το local runtime είναι έτοιμο.',
      customer_id: customers[0].id,
      customer_name: customers[0].name,
      sent_at: createdDate,
      created_date: createdDate,
      updated_date: createdDate,
    },
  ];

  return {
    version: 1,
    currentUserId,
    entities: {
      User: [
        {
          id: currentUserId,
          email: 'admin@local.nexuserp',
          full_name: 'Local Nexus Admin',
          role: 'admin',
          is_super_admin: true,
          is_active: true,
          outlook_email: 'admin@local.nexuserp',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      PermissionSettings: createPermissionSettings(),
      AppSettings: [],
      Customer: customers,
      Supplier: [
        {
          id: 'supplier_netcom',
          name: 'NetCom Supplies',
          tax_id: '094444444',
          email: 'procurement@netcom.gr',
          phone: '2105550000',
          status: 'active',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      Product: products,
      Warehouse: [
        {
          id: 'warehouse_main',
          name: 'Κεντρική Αποθήκη',
          location: 'Αθήνα',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      ServiceTicket: [
        {
          id: 'ticket_1',
          ticket_number: 'TCK-2026-001',
          title: 'Βλάβη εκτυπωτή',
          status: 'open',
          priority: 'high',
          customer_id: customers[1].id,
          due_date: '2026-04-10',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      SalesInvoice: salesInvoices,
      PurchaseInvoice: purchaseInvoices,
      SalesOrder: [
        {
          id: 'sales_order_1',
          order_number: 'SO-2026-001',
          customer_id: customers[0].id,
          total: 1240,
          status: 'open',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      PurchaseOrder: [],
      Quote: [],
      Payment: [
        {
          id: 'payment_1',
          amount: 620,
          method: 'bank_transfer',
          sales_invoice_id: 'sales_invoice_2',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      AIInteraction: [],
      UserActivity: [],
      EmailMessage: emails,
      UnmatchedEmail: [
        {
          id: 'unmatched_1',
          sender_email: 'lead@example.com',
          subject: 'Νέο αίτημα',
          review_status: 'pending',
          received_at: createdDate,
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      SyncState: [
        {
          id: 'sync_gmail',
          key: 'gmail_history_id',
          value: 'local-history-1',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      ActivityLog: [
        {
          id: 'activity_1',
          title: 'Local runtime ενεργό',
          description: 'Το NexusERP τρέχει σε local mode.',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      StockMovement: [],
      CustomerActivity: [
        {
          id: 'customer_activity_1',
          customer_id: customers[0].id,
          occurred_at: createdDate,
          action: 'note',
          description: 'Δημιουργήθηκε local demo record.',
          created_date: createdDate,
          updated_date: createdDate,
        },
      ],
      CallLog: [],
      OperationalEvent: [],
    },
  };
}

function ensureStateShape(rawState) {
  const defaultState = createDefaultState();
  const state = rawState && typeof rawState === 'object' ? rawState : {};

  return {
    version: defaultState.version,
    currentUserId: state.currentUserId || defaultState.currentUserId,
    entities: { ...defaultState.entities, ...(state.entities || {}) },
  };
}

function loadState() {
  const stored = storage.getItem(STORAGE_KEY);
  if (!stored) {
    const initialState = createDefaultState();
    storage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    return initialState;
  }

  try {
    const parsed = JSON.parse(stored);
    const normalized = ensureStateShape(parsed);
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const resetState = createDefaultState();
    storage.setItem(STORAGE_KEY, JSON.stringify(resetState));
    return resetState;
  }
}

function saveState(state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readEntity(state, entityName) {
  if (!state.entities[entityName]) {
    state.entities[entityName] = [];
  }

  return state.entities[entityName];
}

function withPersist(mutator) {
  const state = loadState();
  const result = mutator(state);
  saveState(state);
  return clone(result);
}

function getCurrentUser(state) {
  const users = readEntity(state, 'User');
  return users.find((user) => user.id === state.currentUserId) || users[0] || null;
}

function upsertActivityLog(state, title, description) {
  const activityLog = readEntity(state, 'ActivityLog');
  activityLog.unshift({
    id: createId('activity'),
    title,
    description,
    created_date: nowIso(),
    updated_date: nowIso(),
  });
  state.entities.ActivityLog = activityLog.slice(0, 100);
}

function listEntity(state, entityName, sort, limit, skip) {
  const records = readEntity(state, entityName);
  return paginate(sortRecords(records, sort), limit, skip);
}

function filterEntity(state, entityName, filter, sort, limit, skip) {
  const records = readEntity(state, entityName);
  const filtered = filterRecords(records, filter);
  return paginate(sortRecords(filtered, sort), limit, skip);
}

function createEntityRecord(state, entityName, data) {
  const records = readEntity(state, entityName);
  const timestamp = nowIso();
  const record = {
    id: data?.id || createId(entityName.toLowerCase()),
    ...clone(data || {}),
    created_date: data?.created_date || timestamp,
    updated_date: timestamp,
  };
  records.unshift(record);
  return record;
}

function updateEntityRecord(state, entityName, id, data) {
  const records = readEntity(state, entityName);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) {
    throw new Error(`Local runtime: ${entityName} record ${id} not found`);
  }

  records[index] = {
    ...records[index],
    ...clone(data || {}),
    updated_date: nowIso(),
  };

  return records[index];
}

function deleteEntityRecord(state, entityName, id) {
  const records = readEntity(state, entityName);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) {
    throw new Error(`Local runtime: ${entityName} record ${id} not found`);
  }

  const [removed] = records.splice(index, 1);
  return removed;
}

function trimTokenPunctuation(value) {
  const source = String(value || '');
  const punctuation = ' \t\n\r<>"\'“”‘’()[]{}.,;:!?';
  let start = 0;
  let end = source.length;

  while (start < end && punctuation.includes(source[start])) {
    start += 1;
  }

  while (end > start && punctuation.includes(source[end - 1])) {
    end -= 1;
  }

  return source.slice(start, end);
}

function isSimpleEmail(candidate) {
  const value = String(candidate || '');
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex !== value.lastIndexOf('@') || atIndex === value.length - 1) {
    return false;
  }

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  if (!local || !domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }

  const isAllowedChar = (char, allowUnderscore = false) => {
    const code = char.charCodeAt(0);
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isDigit = code >= 48 && code <= 57;
    const isCommonSymbol = '.-%+'.includes(char) || (allowUnderscore && char === '_');
    return isLetter || isDigit || isCommonSymbol;
  };

  if ([...local].some((char) => !isAllowedChar(char, true))) {
    return false;
  }

  if ([...domain].some((char) => !(isAllowedChar(char) || char === '-'))) {
    return false;
  }

  const parts = domain.split('.');
  return parts.length >= 2 && parts.every(Boolean) && parts[parts.length - 1].length >= 2;
}

function detectEmailAddress(value) {
  const tokens = String(value || '').split(/\s+/);
  for (const token of tokens) {
    const candidate = trimTokenPunctuation(token);
    if (candidate.includes('@') && isSimpleEmail(candidate)) {
      return candidate;
    }
  }

  return '';
}

function detectTaxId(value) {
  const match = String(value || '').match(/\b\d{9}\b/);
  return match ? match[0] : '';
}

function deriveEmailBody(message) {
  const normalized = String(message || '').trim();
  const lowercase = normalized.toLowerCase();
  const markers = [
    'και πες ότι ',
    'και πες οτι ',
    'και πες ',
    'πως να πεις ',
    'πώς να πεις ',
    'ότι ',
    'οτι ',
    'πως ',
    'πώς ',
  ];

  for (const marker of markers) {
    const markerIndex = lowercase.lastIndexOf(marker);
    if (markerIndex !== -1) {
      const candidate = normalized.slice(markerIndex + marker.length).trim();
      if (candidate) {
        return candidate;
      }
    }
  }

  if (lowercase.includes('γεια')) {
    return 'Γεια!';
  }

  return 'Καλησπέρα σας,\n\nΣας στέλνω μια σύντομη ενημέρωση.\n\nΜε εκτίμηση,\nNexusERP';
}

function deriveEmailSubject(message, recipientName = '') {
  const explicit = String(message || '').match(/(?:θεμα|θέμα)\s+["“]?([^"\n”]+)["”]?/i);
  if (explicit?.[1]) {
    return explicit[1].trim();
  }

  return recipientName ? `Μήνυμα προς ${recipientName}` : 'Σύντομη ενημέρωση από NexusERP';
}

function buildSystemStatus(state) {
  return [
    'Το NexusERP τρέχει σε local mode.',
    `Πελάτες: ${readEntity(state, 'Customer').length}`,
    `Προμηθευτές: ${readEntity(state, 'Supplier').length}`,
    `Ανοιχτά tickets: ${readEntity(state, 'ServiceTicket').filter((ticket) => ticket.status !== 'closed').length}`,
    `Απλήρωτα τιμολόγια: ${readEntity(state, 'SalesInvoice').filter((invoice) => invoice.status !== 'paid').length}`,
  ].join('\n');
}

function findCustomer(state, message) {
  const customers = readEntity(state, 'Customer');
  const email = detectEmailAddress(message);
  const taxId = detectTaxId(message);
  const normalized = String(message || '').toLowerCase();

  if (taxId) {
    return customers.find((customer) => String(customer.tax_id || '') === taxId) || null;
  }

  if (email) {
    return customers.find((customer) => String(customer.email || '').toLowerCase() === email.toLowerCase()) || null;
  }

  return customers.find((customer) => {
    const haystack = [customer.name, customer.email, customer.phone, customer.tax_id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  }) || null;
}

function deriveTicketTitle(message) {
  const original = String(message || '').trim();
  const normalized = original.toLowerCase();
  const ticketIndex = normalized.indexOf('ticket');
  if (ticketIndex === -1) {
    return 'Νέο ticket';
  }

  const candidate = trimTokenPunctuation(original.slice(ticketIndex + 'ticket'.length).trim());
  return candidate || 'Νέο ticket';
}

export function buildLocalAssistantResponse(state, payload) {
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const conversation = messages.map((message) => ({
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    content: String(message?.content || ''),
  }));
  const latestUserMessage = [...conversation].reverse().find((message) => message.role === 'user')?.content || '';
  const normalized = latestUserMessage.toLowerCase();

  if (!latestUserMessage.trim()) {
    return {
      reply: 'Το local Nexus AI είναι έτοιμο. Μπορείς να ζητήσεις πελάτες, τιμολόγια, tickets ή draft email.',
    };
  }

  if (normalized.includes('κατασταση') || normalized.includes('status')) {
    return {
      reply: buildSystemStatus(state),
    };
  }

  if (normalized.includes('πελατ') || normalized.includes('αφμ') || normalized.includes('afm')) {
    const customer = findCustomer(state, latestUserMessage);
    if (customer) {
      return {
        reply: `Βρήκα τον πελάτη **${customer.name}**.\n\nΑΦΜ: ${customer.tax_id || '—'}\nEmail: ${customer.email || '—'}\nΤηλέφωνο: ${customer.phone || '—'}`,
      };
    }

    const customers = readEntity(state, 'Customer').slice(0, 10);
    return {
      reply: `Έχω ${readEntity(state, 'Customer').length} καταχωρημένους πελάτες στο local runtime.\n\n${customers.map((customer) => `- ${customer.name} (${customer.tax_id || 'χωρίς ΑΦΜ'})`).join('\n')}`,
    };
  }

  if (normalized.includes('προμηθευτ')) {
    const suppliers = readEntity(state, 'Supplier').slice(0, 10);
    return {
      reply: `Έχω ${readEntity(state, 'Supplier').length} προμηθευτές τοπικά.\n\n${suppliers.map((supplier) => `- ${supplier.name} (${supplier.tax_id || 'χωρίς ΑΦΜ'})`).join('\n')}`,
    };
  }

  if (normalized.includes('απληρωτ') || normalized.includes('τιμολογ')) {
    const invoices = readEntity(state, 'SalesInvoice').filter((invoice) => invoice.status !== 'paid');
    return {
      reply: invoices.length
        ? `Βρήκα ${invoices.length} απλήρωτα τιμολόγια:\n\n${invoices.map((invoice) => `- ${invoice.invoice_number}: €${asNumber(invoice.total).toFixed(2)} (${invoice.status})`).join('\n')}`
        : 'Δεν υπάρχουν απλήρωτα τιμολόγια στο local dataset.',
    };
  }

  if (normalized.includes('ticket')) {
    const tickets = readEntity(state, 'ServiceTicket').filter((ticket) => ticket.status !== 'closed');
    return {
      reply: tickets.length
        ? `Ανοιχτά tickets:\n\n${tickets.map((ticket) => `- ${ticket.ticket_number}: ${ticket.title}`).join('\n')}`
        : 'Δεν υπάρχουν ανοιχτά tickets στο local dataset.',
    };
  }

  if (normalized.includes('στειλε') || normalized.includes('στείλε') || normalized.includes('mail') || normalized.includes('email') || normalized.includes('μαιλ')) {
    const recipient = detectEmailAddress(latestUserMessage);
    const matchedCustomer = recipient ? findCustomer(state, latestUserMessage) : null;
    const body = deriveEmailBody(latestUserMessage);
    const subject = deriveEmailSubject(latestUserMessage, matchedCustomer?.name || '');

    if (!recipient) {
      return {
        reply: 'Για local αποστολή email χρειάζομαι τουλάχιστον το email παραλήπτη, π.χ. "στείλε email στο user@example.com".',
      };
    }

    return {
      reply: `Ετοίμασα το email προς **${recipient}**.\n\nΘέμα: ${subject}\nΚείμενο: ${body}\n\nΕπιβεβαίωσε αν θέλεις να προχωρήσω.`,
      action: {
        action: 'send_email',
        to: recipient,
        subject,
        body,
        customer_id: matchedCustomer?.id || null,
        customer_name: matchedCustomer?.name || '',
        confirmation_message: `Να σταλεί email στο ${recipient};`,
      },
    };
  }

  if (normalized.includes('φτιαξε ticket') || normalized.includes('φτιάξε ticket') || normalized.includes('δημιουργησε ticket') || normalized.includes('δημιούργησε ticket')) {
    const matchedCustomer = findCustomer(state, latestUserMessage);
    const title = deriveTicketTitle(latestUserMessage);
    const ticketNumber = `TCK-${String(readEntity(state, 'ServiceTicket').length + 1).padStart(4, '0')}`;

    return {
      reply: `Ετοίμασα ticket με τίτλο **${title}**.`,
      action: {
        action: 'create_ticket',
        confirmation_message: `Να δημιουργηθεί ticket ${ticketNumber};`,
        ticket_data: {
          ticket_number: ticketNumber,
          title,
          status: 'open',
          priority: 'medium',
          customer_id: matchedCustomer?.id || null,
        },
      },
    };
  }

  return {
    reply: 'Το local Nexus AI είναι σε deterministic mode. Δοκίμασε: "Δείξε πελάτες", "Βρες πελάτη με ΑΦΜ 123456789", "Δείξε απλήρωτα τιμολόγια" ή "Στείλε email στο demo@example.com".',
  };
}

function buildLocalInsightResponse(state) {
  const customers = readEntity(state, 'Customer');
  const invoices = readEntity(state, 'SalesInvoice');
  const products = readEntity(state, 'Product');
  const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue');

  return {
    insights: [
      {
        title: 'Τοπικό Demo Dataset',
        description: `Υπάρχουν ${customers.length} πελάτες και ${products.length} προϊόντα διαθέσιμα στο local runtime.`,
      },
      {
        title: 'Απλήρωτα Τιμολόγια',
        description: overdueInvoices.length
          ? `Υπάρχουν ${overdueInvoices.length} ληξιπρόθεσμα τιμολόγια που χρειάζονται follow-up.`
          : 'Δεν υπάρχουν ληξιπρόθεσμα τιμολόγια στο local dataset.',
      },
      {
        title: 'Local-First Ανάπτυξη',
        description: 'Το app μπορεί πλέον να δοκιμάζεται τοπικά χωρίς dependency στο Base44 cloud runtime.',
      },
    ],
  };
}

function buildEntityApi(entityName) {
  return {
    async list(sort = '-created_date', limit = 100, skip = 0) {
      return withPersist((state) => listEntity(state, entityName, sort, limit, skip));
    },
    async filter(filter = {}, sort = '-created_date', limit = 100, skip = 0) {
      return withPersist((state) => filterEntity(state, entityName, filter, sort, limit, skip));
    },
    async get(id) {
      return withPersist((state) => {
        const records = readEntity(state, entityName);
        const record = records.find((item) => item.id === id);
        if (!record) {
          throw new Error(`Local runtime: ${entityName} record ${id} not found`);
        }
        return record;
      });
    },
    async create(data = {}) {
      return withPersist((state) => createEntityRecord(state, entityName, data));
    },
    async update(id, data = {}) {
      return withPersist((state) => updateEntityRecord(state, entityName, id, data));
    },
    async delete(id) {
      return withPersist((state) => deleteEntityRecord(state, entityName, id));
    },
  };
}

export function getEmailStats(state) {
  const emailMessages = readEntity(state, 'EmailMessage');
  const unmatchedEmails = readEntity(state, 'UnmatchedEmail');
  return {
    messageCount: emailMessages.length,
    unmatchedCount: unmatchedEmails.filter((record) => record.review_status === 'pending').length,
  };
}

export function getDashboardStats(state) {
  const customers = readEntity(state, 'Customer');
  const products = readEntity(state, 'Product');
  const salesInvoices = readEntity(state, 'SalesInvoice');
  const purchaseInvoices = readEntity(state, 'PurchaseInvoice');
  const payments = readEntity(state, 'Payment');
  const salesOrders = readEntity(state, 'SalesOrder');
  const activityLog = readEntity(state, 'ActivityLog');

  return {
    stats: {
      totalCustomers: customers.length,
      totalRevenue: salesInvoices.reduce((sum, invoice) => sum + asNumber(invoice.total), 0),
      totalExpenses: purchaseInvoices.reduce((sum, invoice) => sum + asNumber(invoice.total), 0),
      totalPayments: payments.reduce((sum, payment) => sum + asNumber(payment.amount), 0),
      totalOrders: salesOrders.length,
      lowStockProducts: products.filter((product) => asNumber(product.stock_quantity) <= asNumber(product.min_stock)).length,
    },
    recentActivity: activityLog.slice(0, 20),
  };
}

export function getLiveUsersSnapshot(state) {
  const users = readEntity(state, 'User');
  const userActivities = readEntity(state, 'UserActivity');
  const emailMessages = readEntity(state, 'EmailMessage');
  const now = Date.now();
  const activeThresholdMs = 5 * 60 * 1000;

  const usersByEmail = new Map(
    users
      .filter((user) => user?.email)
      .map((user) => [String(user.email).toLowerCase(), user])
  );

  const latestEvents = new Map();
  [...userActivities, ...emailMessages].forEach((record) => {
    const email = String(record?.user_email || record?.sender_email || '').toLowerCase();
    if (!email) {
      return;
    }

    const timestamp = record?.timestamp || record?.sent_at || record?.updated_date || record?.created_date || nowIso();
    const time = new Date(timestamp).getTime();
    if (!Number.isFinite(time)) {
      return;
    }

    const existing = latestEvents.get(email);
    if (!existing || time > existing.time) {
      latestEvents.set(email, {
        email,
        time,
        action: record?.action || 'email_sent',
        page_name: record?.page_name || null,
        details: record?.details || record?.subject || null,
        timestamp,
      });
    }
  });

  const snapshotUsers = Array.from(
    new Set([
      ...usersByEmail.keys(),
      ...latestEvents.keys(),
    ])
  ).map((email) => {
    const profile = usersByEmail.get(email);
    const latestActivity = latestEvents.get(email) || null;
    const lastSeenAt = latestActivity?.timestamp || profile?.updated_date || profile?.created_date || nowIso();
    const idleMs = Math.max(now - new Date(lastSeenAt).getTime(), 0);
    const idleMinutes = Math.floor(idleMs / 60000);

    return {
      email,
      name: profile?.full_name || profile?.name || email,
      role: profile?.role || 'user',
      isActive: idleMs <= activeThresholdMs,
      idleTime: {
        idleMs,
        idleMinutes,
      },
      latestActivity,
    };
  });

  return {
    users: snapshotUsers.sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return (left.idleTime?.idleMs || 0) - (right.idleTime?.idleMs || 0);
    }),
  };
}

async function invokeFunction(name, payload = {}) {
  return withPersist((state) => {
    if (name === 'chatgpt') {
      return { data: buildLocalAssistantResponse(state, payload) };
    }

    if (name === 'sendEmail' || name === 'gmailSend') {
      if (!payload?.to || !payload?.subject || !payload?.body) {
        throw new Error('Local runtime: missing email payload');
      }

      const record = createEntityRecord(state, 'EmailMessage', {
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
        customer_id: payload.customer_id || null,
        customer_name: payload.customer_name || '',
        sent_at: nowIso(),
      });

      upsertActivityLog(state, 'Email sent (local)', `Στάλθηκε local email στο ${payload.to}`);
      return { data: { success: true, sent: true, id: record.id } };
    }

    if (name === 'gmailSync') {
      const unmatched = readEntity(state, 'UnmatchedEmail').filter((record) => record.review_status === 'pending').length;
      const total = readEntity(state, 'EmailMessage').length;
      const syncEntries = readEntity(state, 'SyncState');
      const historyRecord = syncEntries.find((entry) => entry.key === 'gmail_history_id');

      if (historyRecord) {
        historyRecord.value = `local-history-${Date.now()}`;
        historyRecord.updated_date = nowIso();
      }

      upsertActivityLog(state, 'Email sync (local)', 'Εκτελέστηκε local email sync.');
      return { data: { synced: total - unmatched, unmatched, total } };
    }

    if (name === 'linkEmailToCustomer') {
      const unmatchedEmails = readEntity(state, 'UnmatchedEmail');
      const target = unmatchedEmails.find((record) => record.id === payload?.emailId);
      if (!target) {
        throw new Error('Local runtime: unmatched email not found');
      }

      target.review_status = 'linked';
      target.customer_id = payload?.customerId || null;
      target.updated_date = nowIso();

      upsertActivityLog(state, 'Email linked', `Αντιστοιχίστηκε local unmatched email με customer ${payload?.customerId || '—'}`);
      return { data: { success: true } };
    }

    if (name === 'msOAuthStart') {
      if (!payload?.email) {
        throw new Error('Local runtime: missing Microsoft email');
      }

      return {
        data: {
          url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=local-nexus-demo&response_type=code&redirect_uri=${encodeURIComponent('http://127.0.0.1:5173/oauth/callback')}&scope=${encodeURIComponent('offline_access openid profile email Mail.Send')}&login_hint=${encodeURIComponent(payload.email)}`,
        },
      };
    }

    if (name === 'msOAuthDisconnect') {
      return {
        data: {
          success: true,
          disconnected: true,
        },
      };
    }

    if (name === 'getEmailStats') {
      return {
        data: getEmailStats(state),
      };
    }

    if (name === 'getDashboardStats') {
      return {
        data: getDashboardStats(state),
      };
    }

    if (name === 'getLiveUsersSnapshot') {
      return {
        data: getLiveUsersSnapshot(state),
      };
    }

    return {
      data: {
        ok: true,
        message: `Local runtime: function ${name} completed with no-op handler.`,
      },
    };
  });
}

export function createLocalBase44Client() {
  return {
    auth: {
      async me() {
        return withPersist((state) => getCurrentUser(state));
      },
      async updateMe(data = {}) {
        return withPersist((state) => {
          const user = getCurrentUser(state);
          if (!user) {
            throw new Error('Local runtime: current user not found');
          }

          Object.assign(user, clone(data), { updated_date: nowIso() });
          return user;
        });
      },
      redirectToLogin(returnUrl) {
        if (isBrowser) {
          window.dispatchEvent(new CustomEvent('nexuserp:local-login-requested', { detail: { returnUrl } }));
        }
      },
    },
    users: {
      async inviteUser(email, role = 'user') {
        if (!email) {
          throw new Error('Local runtime: inviteUser requires email');
        }

        return withPersist((state) => {
          const users = readEntity(state, 'User');
          const existing = users.find((user) => String(user.email).toLowerCase() === String(email).toLowerCase());
          if (existing) {
            return existing;
          }

          const invitedUser = createEntityRecord(state, 'User', {
            email,
            full_name: email.split('@')[0],
            role,
            is_super_admin: false,
            is_active: true,
          });
          upsertActivityLog(state, 'User invited (local)', `Προστέθηκε local user ${email}`);
          return invitedUser;
        });
      },
    },
    entities: new Proxy({}, {
      get(_, entityName) {
        return buildEntityApi(String(entityName));
      },
    }),
    functions: {
      invoke: invokeFunction,
    },
    integrations: {
      Core: {
        async InvokeLLM(payload = {}) {
          return withPersist((state) => {
            if (payload?.response_json_schema) {
              return buildLocalInsightResponse(state);
            }

            return 'Το local AI integration είναι ενεργό. Για πλήρες LLM χρειάζεται δικό σου backend provider ή επανασύνδεση με cloud service.';
          });
        },
      },
    },
    __localRuntime: {
      reset() {
        const state = createDefaultState();
        saveState(state);
        return clone(state);
      },
      exportState() {
        return clone(loadState());
      },
    },
  };
}
