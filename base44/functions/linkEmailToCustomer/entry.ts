import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { unmatched_email_id, customer_id } = await req.json();

    if (!unmatched_email_id || !customer_id) {
      return Response.json({ error: 'Missing unmatched_email_id or customer_id' }, { status: 400 });
    }

    const unmatchedList = await base44.asServiceRole.entities.UnmatchedEmail.filter({ id: unmatched_email_id });
    const unmatched = unmatchedList[0];
    if (!unmatched) return Response.json({ error: 'Not found' }, { status: 404 });

    const customerList = await base44.asServiceRole.entities.Customer.filter({ id: customer_id });
    const customer = customerList[0];
    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    const threadId = unmatched.external_thread_id;
    const existingThreads = await base44.asServiceRole.entities.EmailThread.filter({ external_thread_id: threadId });
    let thread;
    if (existingThreads.length > 0) {
      thread = existingThreads[0];
    } else {
      thread = await base44.asServiceRole.entities.EmailThread.create({
        external_thread_id: threadId || unmatched.external_message_id,
        customer_id: customer.id,
        customer_name: customer.name,
        subject: unmatched.subject,
        last_message_at: unmatched.received_at,
        message_count: 1,
        snippet: unmatched.snippet,
        sync_source: unmatched.sync_source || 'gmail',
      });
    }

    await base44.asServiceRole.entities.EmailMessage.create({
      external_message_id: unmatched.external_message_id,
      thread_id: thread.id,
      external_thread_id: threadId,
      customer_id: customer.id,
      customer_name: customer.name,
      direction: 'incoming',
      subject: unmatched.subject,
      body_text: unmatched.body_text,
      snippet: unmatched.snippet,
      sender_email: unmatched.sender_email,
      sender_name: unmatched.sender_name,
      recipient_emails: unmatched.recipient_emails || [],
      sent_at: unmatched.received_at,
      sync_source: unmatched.sync_source || 'gmail',
      sync_status: 'synced',
    });

    await base44.asServiceRole.entities.CustomerActivity.create({
      customer_id: customer.id,
      customer_name: customer.name,
      activity_type: 'email_received',
      related_entity_type: 'email_message',
      related_entity_id: unmatched.external_message_id,
      title: unmatched.subject,
      description: unmatched.snippet,
      occurred_at: unmatched.received_at || new Date().toISOString(),
      user_email: user.email,
    });

    await base44.asServiceRole.entities.UnmatchedEmail.update(unmatched_email_id, {
      review_status: 'linked',
      linked_customer_id: customer_id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});