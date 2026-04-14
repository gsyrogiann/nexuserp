import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

function pickLatestTimestamp(record: Record<string, unknown>) {
  return String(
    record.timestamp ||
    record.sent_at ||
    record.updated_date ||
    record.created_date ||
    new Date().toISOString()
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !(user.role === 'super_admin' || user.is_super_admin === true)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users, userActivities, emailMessages] = await Promise.all([
      base44.asServiceRole.entities.User.list('-updated_date', 1_000),
      base44.asServiceRole.entities.UserActivity.list('-timestamp', 1_000),
      base44.asServiceRole.entities.EmailMessage.list('-sent_at', 500),
    ]);

    const usersByEmail = new Map(
      users
        .filter((entry: Record<string, unknown>) => entry.email)
        .map((entry: Record<string, unknown>) => [String(entry.email).toLowerCase(), entry])
    );

    const latestEvents = new Map();
    [...userActivities, ...emailMessages].forEach((record: Record<string, unknown>) => {
      const email = String(record.user_email || record.sender_email || '').toLowerCase();
      if (!email) return;

      const timestamp = pickLatestTimestamp(record);
      const time = new Date(timestamp).getTime();
      const existing = latestEvents.get(email);

      if (!existing || time > existing.time) {
        latestEvents.set(email, {
          time,
          timestamp,
          action: record.action || 'email_sent',
          page_name: record.page_name || null,
          details: record.details || record.subject || null,
        });
      }
    });

    const now = Date.now();
    const result = Array.from(new Set([...usersByEmail.keys(), ...latestEvents.keys()])).map((email) => {
      const profile = usersByEmail.get(email);
      const latestActivity = latestEvents.get(email) || null;
      const lastSeenAt = latestActivity?.timestamp || profile?.updated_date || profile?.created_date || new Date().toISOString();
      const idleMs = Math.max(now - new Date(lastSeenAt).getTime(), 0);
      const idleMinutes = Math.floor(idleMs / 60000);

      return {
        email,
        name: profile?.full_name || profile?.name || email,
        role: profile?.role || 'user',
        isActive: idleMs <= ACTIVE_THRESHOLD_MS,
        idleTime: {
          idleMs,
          idleMinutes,
        },
        latestActivity: latestActivity ? {
          action: latestActivity.action,
          page_name: latestActivity.page_name,
          details: latestActivity.details,
          timestamp: latestActivity.timestamp,
        } : null,
      };
    });

    result.sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return (left.idleTime?.idleMs || 0) - (right.idleTime?.idleMs || 0);
    });

    return Response.json({ users: result });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to load live users snapshot' }, { status: 500 });
  }
});
