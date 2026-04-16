import nodemailer from 'nodemailer';
import {
  buildLocalAssistantResponse,
  createDefaultState,
  getDashboardStats,
  getEmailStats,
  getLiveUsersSnapshot,
} from '../src/api/localBase44Client.js';

const ENTITY_LIMIT_DEFAULT = 100;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = 'rec') {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeEntityName(entityName = '') {
  return String(entityName || '').trim();
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

function paginate(records, limit = ENTITY_LIMIT_DEFAULT, skip = 0) {
  if (limit == null) {
    return records.slice(skip);
  }

  return records.slice(skip, skip + limit);
}

function asNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toRecordWrite(entityName, data) {
  return {
    entity: normalizeEntityName(entityName),
    recordId: String(data.id),
    data: JSON.stringify(data),
  };
}

export async function loadState(prisma) {
  const [records, metaRows] = await Promise.all([
    prisma.appRecord.findMany(),
    prisma.appMeta.findMany(),
  ]);

  const entities = {};
  records.forEach((record) => {
    if (!entities[record.entity]) {
      entities[record.entity] = [];
    }
    entities[record.entity].push(parseJson(record.data, {}));
  });

  const meta = Object.fromEntries(metaRows.map((row) => [row.key, parseJson(row.value, row.value)]));

  return {
    version: 1,
    currentUserId: meta.currentUserId || null,
    entities,
  };
}

export async function seedDatabase(prisma) {
  const count = await prisma.appRecord.count();
  if (count > 0) {
    return;
  }

  const initialState = createDefaultState();
  const rows = Object.entries(initialState.entities).flatMap(([entityName, records]) =>
    records.map((record) => toRecordWrite(entityName, record))
  );

  await prisma.$transaction([
    prisma.appMeta.upsert({
      where: { key: 'currentUserId' },
      update: { value: JSON.stringify(initialState.currentUserId) },
      create: { key: 'currentUserId', value: JSON.stringify(initialState.currentUserId) },
    }),
    prisma.appRecord.createMany({ data: rows }),
  ]);
}

export async function listEntity(prisma, entityName, { sort = '-created_date', limit = ENTITY_LIMIT_DEFAULT, skip = 0 } = {}) {
  const rows = await prisma.appRecord.findMany({
    where: { entity: normalizeEntityName(entityName) },
  });

  const parsed = rows.map((row) => parseJson(row.data, {}));
  return paginate(sortRecords(parsed, sort), limit, skip);
}

export async function filterEntity(prisma, entityName, { filter = {}, sort = '-created_date', limit = ENTITY_LIMIT_DEFAULT, skip = 0 } = {}) {
  const rows = await prisma.appRecord.findMany({
    where: { entity: normalizeEntityName(entityName) },
  });

  const parsed = rows.map((row) => parseJson(row.data, {}));
  return paginate(sortRecords(filterRecords(parsed, filter), sort), limit, skip);
}

export async function getEntity(prisma, entityName, id) {
  const row = await prisma.appRecord.findFirst({
    where: {
      entity: normalizeEntityName(entityName),
      recordId: String(id),
    },
  });

  if (!row) {
    throw new Error(`Owned runtime: ${entityName} record ${id} not found`);
  }

  return parseJson(row.data, {});
}

export async function createEntity(prisma, entityName, data = {}) {
  const timestamp = nowIso();
  const record = {
    id: data?.id || createId(normalizeEntityName(entityName).toLowerCase()),
    ...data,
    created_date: data?.created_date || timestamp,
    updated_date: timestamp,
  };

  await prisma.appRecord.create({
    data: toRecordWrite(entityName, record),
  });

  return record;
}

export async function updateEntity(prisma, entityName, id, data = {}) {
  const current = await getEntity(prisma, entityName, id);
  const next = {
    ...current,
    ...data,
    id: current.id,
    updated_date: nowIso(),
  };

  await prisma.appRecord.update({
    where: { recordId: String(id) },
    data: {
      entity: normalizeEntityName(entityName),
      data: JSON.stringify(next),
    },
  });

  return next;
}

export async function deleteEntity(prisma, entityName, id) {
  const current = await getEntity(prisma, entityName, id);
  await prisma.appRecord.delete({
    where: { recordId: String(id) },
  });
  return current;
}

export async function getCurrentUser(prisma) {
  const currentUserMeta = await prisma.appMeta.findUnique({ where: { key: 'currentUserId' } });
  const currentUserId = currentUserMeta ? parseJson(currentUserMeta.value, currentUserMeta.value) : null;

  if (!currentUserId) {
    return null;
  }

  try {
    return await getEntity(prisma, 'User', currentUserId);
  } catch {
    return null;
  }
}

async function updateCurrentUser(prisma, data = {}) {
  const current = await getCurrentUser(prisma);
  if (!current) {
    throw new Error('Owned runtime: current user not found');
  }

  return updateEntity(prisma, 'User', current.id, data);
}

async function inviteUser(prisma, email, role = 'user') {
  if (!email) {
    throw new Error('Owned runtime: inviteUser requires email');
  }

  const users = await listEntity(prisma, 'User', { limit: 1000 });
  const existing = users.find((user) => String(user.email).toLowerCase() === String(email).toLowerCase());
  if (existing) {
    return existing;
  }

  return createEntity(prisma, 'User', {
    email,
    full_name: String(email).split('@')[0],
    role,
    is_super_admin: false,
    is_active: true,
    created_date: nowIso(),
  });
}

async function sendMailIfConfigured(payload) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return { sent: false, transport: 'local_stub' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
  });

  return {
    sent: true,
    transport: 'smtp',
    messageId: info.messageId,
  };
}

export async function handleFunction(prisma, name, payload = {}) {
  if (name === 'chatgpt') {
    const state = await loadState(prisma);
    return { data: buildLocalAssistantResponse(state, payload) };
  }

  if (name === 'sendEmail' || name === 'gmailSend') {
    if (!payload?.to || !payload?.subject || !payload?.body) {
      throw new Error('Owned runtime: missing email payload');
    }

    const transport = await sendMailIfConfigured(payload);
    const sentAt = nowIso();

    const record = await createEntity(prisma, 'EmailMessage', {
      to: payload.to,
      subject: payload.subject,
      body: payload.body,
      sender_email: process.env.SMTP_FROM || 'local@nexuserp.dev',
      customer_id: payload.customer_id || null,
      customer_name: payload.customer_name || '',
      sent_at: sentAt,
      sync_status: transport.sent ? 'sent' : 'stored_locally',
      transport: transport.transport,
      external_message_id: transport.messageId || null,
    });

    await createEntity(prisma, 'ActivityLog', {
      title: 'Email sent (owned runtime)',
      description: `Email prepared for ${payload.to}`,
    });

    if (payload.customer_id) {
      await createEntity(prisma, 'CustomerActivity', {
        customer_id: payload.customer_id,
        customer_name: payload.customer_name || '',
        activity_type: 'email_sent',
        title: `Email: ${payload.subject}`,
        description: payload.body.slice(0, 300),
        occurred_at: sentAt,
        user_email: process.env.SMTP_FROM || 'local@nexuserp.dev',
      });
    }

    return {
      data: {
        success: true,
        sent: transport.sent,
        transport: transport.transport,
        id: record.id,
      },
    };
  }

  if (name === 'gmailSync') {
    const unmatchedEmails = await filterEntity(prisma, 'UnmatchedEmail', {
      filter: { review_status: 'pending' },
      limit: 1000,
    });
    const emailMessages = await listEntity(prisma, 'EmailMessage', { limit: 1000 });
    const syncEntries = await filterEntity(prisma, 'SyncState', { filter: { key: 'gmail_history_id' }, limit: 10 });
    const historyRecord = syncEntries[0];

    if (historyRecord) {
      await updateEntity(prisma, 'SyncState', historyRecord.id, {
        value: `owned-history-${Date.now()}`,
      });
    }

    await createEntity(prisma, 'ActivityLog', {
      title: 'Email sync (owned runtime)',
      description: 'Εκτελέστηκε owned email sync.',
    });

    return {
      data: {
        synced: emailMessages.length - unmatchedEmails.length,
        unmatched: unmatchedEmails.length,
        total: emailMessages.length,
      },
    };
  }

  if (name === 'linkEmailToCustomer') {
    const emailId = payload?.emailId;
    const customerId = payload?.customerId;
    if (!emailId || !customerId) {
      throw new Error('Owned runtime: emailId and customerId are required');
    }

    const unmatchedEmail = await getEntity(prisma, 'UnmatchedEmail', emailId);
    await updateEntity(prisma, 'UnmatchedEmail', unmatchedEmail.id, {
      review_status: 'linked',
      customer_id: customerId,
    });

    return { data: { success: true } };
  }

  if (name === 'getEmailStats') {
    const state = await loadState(prisma);
    return { data: getEmailStats(state) };
  }

  if (name === 'getDashboardStats') {
    const state = await loadState(prisma);
    return { data: getDashboardStats(state) };
  }

  if (name === 'getLiveUsersSnapshot') {
    const state = await loadState(prisma);
    return { data: getLiveUsersSnapshot(state) };
  }

  if (name === 'msOAuthStart') {
    if (!payload?.email) {
      throw new Error('Owned runtime: email is required for Microsoft OAuth');
    }

    return {
      data: {
        url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(process.env.MS_OAUTH_CLIENT_ID || 'local-demo')}&response_type=code&redirect_uri=${encodeURIComponent(process.env.MS_OAUTH_REDIRECT_URI || 'http://127.0.0.1:5173/oauth/callback')}&scope=${encodeURIComponent('offline_access openid profile email Mail.Read Mail.Send User.Read')}&login_hint=${encodeURIComponent(payload.email)}`,
      },
    };
  }

  if (name === 'msOAuthDisconnect') {
    await updateCurrentUser(prisma, {
      outlook_email: '',
      outlook_refresh_token: '',
      outlook_access_token: '',
      outlook_token_expires_at: null,
    });

    return {
      data: {
        success: true,
        disconnected: true,
      },
    };
  }

  return {
    data: {
      ok: true,
      message: `Owned runtime: function ${name} completed with no-op handler.`,
    },
  };
}

export async function invokeIntegration(prisma, provider, payload = {}) {
  if (provider === 'core_llm') {
    const state = await loadState(prisma);
    if (payload?.response_json_schema) {
      return {
        data: {
          summary: `Owned runtime ενεργό. Πελάτες: ${state.entities.Customer?.length || 0}, προϊόντα: ${state.entities.Product?.length || 0}.`,
        },
      };
    }

    return {
      data: 'Το owned runtime είναι ενεργό. Για πλήρες LLM σύνδεσε OPENAI_API_KEY ή άλλο provider στο backend.',
    };
  }

  return {
    data: null,
  };
}

export {
  updateCurrentUser,
  inviteUser,
};
