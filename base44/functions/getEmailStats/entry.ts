import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [emailMessages, unmatchedEmails] = await Promise.all([
      base44.asServiceRole.entities.EmailMessage.list('-created_date', 1_000),
      base44.asServiceRole.entities.UnmatchedEmail.list('-created_date', 1_000),
    ]);

    return Response.json({
      messageCount: emailMessages.length,
      unmatchedCount: unmatchedEmails.filter((record: Record<string, unknown>) => record.review_status === 'pending').length,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to load email stats' }, { status: 500 });
  }
});
