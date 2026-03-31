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

    // Build RFC 2822 email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
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

    // Log activity if customer_id provided
    if (customer_id) {
      await base44.asServiceRole.entities.CustomerActivity.create({
        customer_id,
        customer_name: customer_name || '',
        activity_type: 'email_sent',
        title: `Email: ${subject}`,
        description: body.substring(0, 300),
        occurred_at: new Date().toISOString(),
        user_email: user.email,
      });
    }

    return Response.json({ success: true, message_id: sent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});