import { runtimeConfig } from '@/lib/runtime-config';

const STORAGE_KEY = 'nexuserp_observability_events';
const MAX_STORED_EVENTS = 100;
const REDACTED_AUDIT_KEYS = /token|secret|password|authorization|cookie|api[-_]?key/i;

let initialized = false;
let sessionId = '';

const createSessionId = () => `obs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const getSessionId = () => {
  if (!sessionId) {
    sessionId = createSessionId();
  }

  return sessionId;
};

const safeSerialize = (value) => {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

const getStoredEvents = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistEvent = (event) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const next = [event, ...getStoredEvents()].slice(0, MAX_STORED_EVENTS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort storage only.
  }
};

const postEvent = async (event) => {
  if (!runtimeConfig.observabilityEndpoint || typeof fetch === 'undefined') {
    return;
  }

  try {
    await fetch(runtimeConfig.observabilityEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Endpoint delivery is optional at this stage.
  }
};

const buildEvent = (kind, payload = {}, level = 'info') => ({
  kind,
  level,
  timestamp: new Date().toISOString(),
  sessionId: getSessionId(),
  environment: runtimeConfig.appEnvironment,
  release: runtimeConfig.appRelease || 'unversioned',
  route: typeof window !== 'undefined' ? window.location.pathname : '',
  payload: safeSerialize(payload),
});

const sanitizeAuditPayload = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeAuditPayload);
  }

  if (typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      REDACTED_AUDIT_KEYS.test(key) ? '[REDACTED]' : safeSerialize(entryValue),
    ])
  );
};

export function reportOperationalEvent(name, payload = {}, level = 'info') {
  const event = buildEvent('operational', { name, ...payload }, level);
  persistEvent(event);

  if (level === 'error') {
    console.error('[observability]', event);
  } else if (level === 'warn') {
    console.warn('[observability]', event);
  } else {
    console.info('[observability]', event);
  }

  void postEvent(event);
  return event;
}

export function reportAuditEvent({
  action,
  target,
  targetId,
  status = 'success',
  summary,
  metadata = {},
}) {
  return reportOperationalEvent(
    'audit_event',
    sanitizeAuditPayload({
      action,
      target,
      targetId,
      status,
      summary,
      metadata,
    }),
    status === 'failed' ? 'warn' : 'info'
  );
}

export function reportError(error, context = {}) {
  const payload = {
    message: error?.message || String(error || 'Unknown error'),
    stack: error?.stack || '',
    name: error?.name || 'Error',
    ...context,
  };

  return reportOperationalEvent('client_error', payload, 'error');
}

export function getRecentObservabilityEvents() {
  return getStoredEvents();
}

export function initializeObservability() {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;
  getSessionId();

  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled rejection'));
    reportError(reason, {
      source: 'window.unhandledrejection',
    });
  });

  reportOperationalEvent('observability_initialized', {
    endpointConfigured: Boolean(runtimeConfig.observabilityEndpoint),
  });
}
