import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAX_BODY_BYTES = 64_000;
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 50;
const SECRET_KEY_PATTERN = /token|secret|password|authorization|cookie|api[-_]?key|access[-_]?token/i;
const DEFAULT_ALLOWED_ORIGIN_PATTERN = /^https?:\/\/(localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|(?:[\w-]+\.)*base44\.app|(?:[\w-]+\.)*base44\.com)$/i;

function getAllowedOrigins() {
  return (Deno.env.get('OBSERVABILITY_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildCorsHeaders(origin: string) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');
  headers.set('Access-Control-Max-Age', '86400');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return headers;
}

function isAllowedOrigin(origin: string) {
  if (!origin) {
    return true;
  }

  const explicitAllowedOrigins = getAllowedOrigins();
  if (explicitAllowedOrigins.length > 0) {
    return explicitAllowedOrigins.includes(origin);
  }

  return DEFAULT_ALLOWED_ORIGIN_PATTERN.test(origin);
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Unknown error');
}

function trimString(value: string) {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
    : value;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return trimString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => sanitizeValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, entryValue]) => [
          key,
          SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeValue(entryValue, depth + 1),
        ])
    );
  }

  return trimString(String(value));
}

function normalizeLevel(value: unknown) {
  if (value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')?.trim() || '';
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers: corsHeaders });
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (origin && !isAllowedOrigin(origin)) {
    return Response.json({ error: 'Origin not allowed.' }, { status: 403, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return Response.json({
      ok: true,
      writable: true,
      allowlistConfigured: getAllowedOrigins().length > 0,
      message: 'The observability collector is available and expects POST requests.',
    }, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: 'Payload too large.' }, { status: 413, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const payload = sanitizeValue(body) as Record<string, unknown>;

    if (!payload || typeof payload !== 'object') {
      return Response.json({ error: 'Invalid event payload.' }, { status: 400, headers: corsHeaders });
    }

    const eventName = typeof payload.payload === 'object' && payload.payload !== null && typeof (payload.payload as Record<string, unknown>).name === 'string'
      ? String((payload.payload as Record<string, unknown>).name)
      : typeof payload.kind === 'string'
        ? String(payload.kind)
        : 'operational_event';

    const source = typeof payload.payload === 'object' && payload.payload !== null && typeof (payload.payload as Record<string, unknown>).source === 'string'
      ? String((payload.payload as Record<string, unknown>).source)
      : '';

    const summaryCandidate =
      typeof payload.payload === 'object' && payload.payload !== null
        ? ((payload.payload as Record<string, unknown>).summary ||
          (payload.payload as Record<string, unknown>).message ||
          (payload.payload as Record<string, unknown>).actionLabel ||
          (payload.payload as Record<string, unknown>).name)
        : payload.kind;

    await base44.asServiceRole.entities.OperationalEvent.create({
      event_name: trimString(String(eventName || 'operational_event')),
      kind: trimString(String(payload.kind || 'operational')),
      level: normalizeLevel(payload.level),
      environment: trimString(String(payload.environment || 'unknown')),
      release: trimString(String(payload.release || 'unversioned')),
      session_id: trimString(String(payload.sessionId || '')),
      route: trimString(String(payload.route || '')),
      summary: trimString(String(summaryCandidate || 'No summary available')),
      source: trimString(source),
      request_origin: trimString(origin),
      user_agent: trimString(req.headers.get('user-agent') || ''),
      payload_json: JSON.stringify(payload),
      occurred_at: normalizeTimestamp(payload.timestamp),
    });

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Observability ingest error:', error);
    return Response.json({
      error: toErrorMessage(error),
    }, { status: 500, headers: corsHeaders });
  }
});
