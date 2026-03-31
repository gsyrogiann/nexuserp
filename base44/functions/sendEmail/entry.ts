import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to, subject, body, customer_id, customer_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // RFC 2047 encode subject for non-ASCII characters (e.g. Greek)
    const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

    // Build RFC 2822 email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${encodedSubject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ];
    const rawEmail = emailLines.join('\r\n');

    // Base64url encode
    const encoded = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.json();
      return Response.json({ error: err?.error?.message || 'Gmail send failed' }, { status: 500 });
    }

    const sent = await gmailRes.json();

    const now = new Date().toISOString();

    // Log to EmailThread + EmailMessage + CustomerActivity if customer_id provided
    if (customer_id) {
      // Find or create thread for this subject
      const existingThreads = await base44.asServiceRole.entities.EmailThread.filter({ customer_id, subject });
      let thread;
      if (existingThreads.length > 0) {
        thread = existingThreads[0];
        await base44.asServiceRole.entities.EmailThread.update(thread.id, {
          last_message_at: now,
          message_count: (thread.message_count || 0) + 1,
          snippet: body.substring(0, 150),
        });
      } else {
        thread = await base44.asServiceRole.entities.EmailThread.create({
          external_thread_id: sent.threadId || sent.id,
          customer_id,
          customer_name: customer_name || '',
          subject,
          last_message_at: now,
          message_count: 1,
          snippet: body.substring(0, 150),
          sync_source: 'gmail',
        });
      }

      // Save the outgoing message
      await base44.asServiceRole.entities.EmailMessage.create({
        external_message_id: sent.id,
        thread_id: thread.id,
        external_thread_id: sent.threadId || sent.id,
        customer_id,
        customer_name: customer_name || '',
        direction: 'outgoing',
        subject,
        body_text: body,
        snippet: body.substring(0, 150),
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        recipient_emails: [to],
        sent_at: now,
        sync_source: 'gmail',
        sync_status: 'synced',
      });

      // Log CustomerActivity
      await base44.asServiceRole.entities.CustomerActivity.create({
        customer_id,
        customer_name: customer_name || '',
        activity_type: 'email_sent',
        title: `Email: ${subject}`,
        description: body.substring(0, 300),
        occurred_at: now,
        user_email: user.email,
      });
    }

    return Response.json({ success: true, message_id: sent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});