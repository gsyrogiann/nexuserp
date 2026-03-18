import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// This function is triggered by the Gmail connector automation (Pub/Sub webhook)
// It decodes the notification and calls gmailSync to process new messages

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Decode Pub/Sub message
    const pubsubData = body?.data?.message?.data;
    if (!pubsubData) {
      return Response.json({ status: 'no_data' });
    }

    const decoded = JSON.parse(atob(pubsubData.replace(/-/g, '+').replace(/_/g, '/')));
    const currentHistoryId = String(decoded.historyId);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get stored history ID
    const syncStates = await base44.asServiceRole.entities.SyncState.list();
    const syncRecord = syncStates.find(s => s.key === 'gmail_history_id');

    if (!syncRecord) {
      await base44.asServiceRole.entities.SyncState.create({ key: 'gmail_history_id', value: currentHistoryId });
      return Response.json({ status: 'initialized' });
    }

    const prevHistoryId = syncRecord.value;

    // Fetch history changes
    const historyRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${prevHistoryId}&historyTypes=messageAdded`,
      { headers: authHeader }
    );
    if (!historyRes.ok) {
      return Response.json({ status: 'history_error', code: historyRes.status });
    }
    const historyData = await historyRes.json();

    const messageIds = [];
    if (historyData.history) {
      for (const record of historyData.history) {
        if (record.messagesAdded) {
          for (const m of record.messagesAdded) {
            messageIds.push(m.message.id);
          }
        }
      }
    }

    // Update history ID
    if (historyData.historyId) {
      await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { value: String(historyData.historyId) });
    }

    if (messageIds.length === 0) {
      return Response.json({ status: 'no_new_messages' });
    }

    // Process each new message
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: authHeader });
    const profile = await profileRes.json();
    const myEmail = profile.emailAddress?.toLowerCase();

    const customers = await base44.asServiceRole.entities.Customer.list();

    function parseEmails(str) {
      if (!str) return [];
      return [...str.matchAll(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/g)].map(m => m[0].toLowerCase());
    }

    function getHeader(headers, name) {
      return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    }

    function decodeBase64(str) {
      return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    }

    function extractBody(payload) {
      let html = '', text = '';
      const traverse = (part) => {
        if (!part) return;
        if (part.mimeType === 'text/html' && part.body?.data) html = decodeBase64(part.body.data);
        else if (part.mimeType === 'text/plain' && part.body?.data) text = decodeBase64(part.body.data);
        if (part.parts) part.parts.forEach(traverse);
      };
      traverse(payload);
      return { html, text };
    }

    function matchCustomer(emails) {
      for (const email of emails) {
        const match = customers.find(c => c.email?.toLowerCase() === email.toLowerCase());
        if (match) return match;
        const domain = email.split('@')[1];
        if (domain && !['gmail.com','yahoo.com','hotmail.com','outlook.com'].includes(domain)) {
          const dm = customers.find(c => c.email?.toLowerCase().endsWith('@' + domain));
          if (dm) return dm;
        }
      }
      return null;
    }

    const existingMessages = await base44.asServiceRole.entities.EmailMessage.list();
    const existingIds = new Set(existingMessages.map(m => m.external_message_id));

    let synced = 0, unmatched = 0;

    for (const msgId of messageIds) {
      if (existingIds.has(msgId)) continue;

      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
        { headers: authHeader }
      );
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers || [];
      const subject = getHeader(headers, 'Subject') || '(no subject)';
      const from = getHeader(headers, 'From');
      const to = getHeader(headers, 'To');
      const cc = getHeader(headers, 'Cc');
      const dateStr = getHeader(headers, 'Date');
      const threadId = msg.threadId;

      const senderEmails = parseEmails(from);
      const recipientEmails = parseEmails(to);
      const ccEmails = parseEmails(cc);
      const senderEmail = senderEmails[0] || '';
      const senderName = from.split('<')[0].trim().replace(/"/g, '') || senderEmail;
      const direction = senderEmail === myEmail ? 'outgoing' : 'incoming';
      const allExternalEmails = direction === 'incoming' ? senderEmails : recipientEmails;
      const { html, text } = extractBody(msg.payload);
      const snippet = msg.snippet || '';
      const sentAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
      const hasAttachments = msg.payload?.parts?.some(p => p.filename && p.filename.length > 0) || false;

      const customer = matchCustomer(allExternalEmails);

      if (customer) {
        const existingThreads = await base44.asServiceRole.entities.EmailThread.filter({ external_thread_id: threadId });
        let thread;
        if (existingThreads.length > 0) {
          thread = existingThreads[0];
          await base44.asServiceRole.entities.EmailThread.update(thread.id, {
            last_message_at: sentAt,
            message_count: (thread.message_count || 0) + 1,
            snippet,
          });
        } else {
          thread = await base44.asServiceRole.entities.EmailThread.create({
            external_thread_id: threadId,
            customer_id: customer.id,
            customer_name: customer.name,
            subject,
            last_message_at: sentAt,
            message_count: 1,
            snippet,
            sync_source: 'gmail',
          });
        }

        await base44.asServiceRole.entities.EmailMessage.create({
          external_message_id: msgId,
          thread_id: thread.id,
          external_thread_id: threadId,
          customer_id: customer.id,
          customer_name: customer.name,
          direction,
          subject,
          body_html: html,
          body_text: text,
          snippet,
          sender_email: senderEmail,
          sender_name: senderName,
          recipient_emails: recipientEmails,
          cc_emails: ccEmails,
          sent_at: sentAt,
          sync_source: 'gmail',
          sync_status: 'synced',
          has_attachments: hasAttachments,
          labels: msg.labelIds || [],
        });

        if (hasAttachments && msg.payload?.parts) {
          for (const part of msg.payload.parts) {
            if (part.filename && part.filename.length > 0) {
              await base44.asServiceRole.entities.EmailAttachment.create({
                email_message_id: msgId,
                external_message_id: msgId,
                file_name: part.filename,
                mime_type: part.mimeType,
                file_size: part.body?.size || 0,
                attachment_id: part.body?.attachmentId || '',
              });
            }
          }
        }

        await base44.asServiceRole.entities.CustomerActivity.create({
          customer_id: customer.id,
          customer_name: customer.name,
          activity_type: direction === 'incoming' ? 'email_received' : 'email_sent',
          related_entity_type: 'email_message',
          related_entity_id: msgId,
          title: subject,
          description: snippet,
          occurred_at: sentAt,
        });

        synced++;
      } else {
        const existingUnmatched = await base44.asServiceRole.entities.UnmatchedEmail.filter({ external_message_id: msgId });
        if (existingUnmatched.length === 0) {
          await base44.asServiceRole.entities.UnmatchedEmail.create({
            external_message_id: msgId,
            external_thread_id: threadId,
            sender_email: senderEmail,
            sender_name: senderName,
            recipient_emails: recipientEmails,
            subject,
            snippet,
            body_text: text,
            received_at: sentAt,
            review_status: 'pending',
            sync_source: 'gmail',
          });
          unmatched++;
        }
      }

      existingIds.add(msgId);
    }

    return Response.json({ status: 'ok', synced, unmatched });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});