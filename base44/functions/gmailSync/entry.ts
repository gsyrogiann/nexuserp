import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Helper: decode base64url
function decodeBase64(str) {
  return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
}

// Helper: extract plain text from MIME parts
function extractBody(payload) {
  let html = '';
  let text = '';

  const traverse = (part) => {
    if (!part) return;
    if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64(part.body.data);
    }
    if (part.parts) part.parts.forEach(traverse);
  };

  traverse(payload);
  return { html, text };
}

// Helper: get header value
function getHeader(headers, name) {
  return headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Helper: parse email addresses from header string
function parseEmails(str) {
  if (!str) return [];
  return [...str.matchAll(/[\w.+%-]+@[\w.-]+\.[a-zA-Z]{2,}/g)].map(m => m[0].toLowerCase());
}

// Helper: match customer by email
async function matchCustomer(base44, emails) {
  const customers = await base44.asServiceRole.entities.Customer.list();
  for (const email of emails) {
    const match = customers.find(c =>
      c.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    // Domain fallback
    const domain = email.split('@')[1];
    if (domain && domain !== 'gmail.com' && domain !== 'yahoo.com' && domain !== 'hotmail.com') {
      const domainMatch = customers.find(c =>
        c.email?.toLowerCase().endsWith('@' + domain)
      );
      if (domainMatch) return domainMatch;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Get current profile to know our own email
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: authHeader });
    const profile = await profileRes.json();
    const myEmail = profile.emailAddress?.toLowerCase();

    // Get sync state
    const syncStates = await base44.asServiceRole.entities.SyncState.list();
    const syncRecord = syncStates.find(s => s.key === 'gmail_history_id');

    let messagesToProcess = [];

    if (!syncRecord) {
      // First run: get recent messages (last 50)
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50', { headers: authHeader });
      const listData = await listRes.json();
      messagesToProcess = listData.messages || [];

      // Save current historyId
      const inboxRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: authHeader });
      const inbox = await inboxRes.json();
      await base44.asServiceRole.entities.SyncState.create({ key: 'gmail_history_id', value: String(inbox.historyId) });
    } else {
      // Incremental sync using history
      const historyRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${syncRecord.value}&historyTypes=messageAdded`,
        { headers: authHeader }
      );
      const historyData = await historyRes.json();

      if (historyData.history) {
        for (const record of historyData.history) {
          if (record.messagesAdded) {
            for (const m of record.messagesAdded) {
              messagesToProcess.push(m.message);
            }
          }
        }
      }

      // Update historyId
      if (historyData.historyId) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { value: String(historyData.historyId) });
      }
    }

    let synced = 0;
    let unmatched = 0;

    // Get existing message IDs to avoid duplicates
    const existingMessages = await base44.asServiceRole.entities.EmailMessage.list();
    const existingIds = new Set(existingMessages.map(m => m.external_message_id));

    for (const msgRef of messagesToProcess) {
      const msgId = msgRef.id;
      if (existingIds.has(msgId)) continue;

      // Fetch full message
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

      const direction = senderEmail === myEmail || senderEmail.toLowerCase() === myEmail ? 'outgoing' : 'incoming';
      const allExternalEmails = direction === 'incoming' ? senderEmails : recipientEmails;

      const { html, text } = extractBody(msg.payload);
      const snippet = (msg.snippet || '').substring(0, 500);
      // Truncate large bodies to avoid entity field size limits
      const bodyText = text.substring(0, 10000);
      const bodyHtml = html.substring(0, 50000);
      const sentAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

      // Check attachments
      const hasAttachments = msg.payload?.parts?.some(p => p.filename && p.filename.length > 0) || false;

      // Match customer
      const customer = await matchCustomer(base44, allExternalEmails);

      if (customer) {
        // Upsert thread
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

        // Create email message
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

        // Save attachments metadata
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

        // Create activity
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
        // Unmatched
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

    return Response.json({ synced, unmatched, total: messagesToProcess.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});