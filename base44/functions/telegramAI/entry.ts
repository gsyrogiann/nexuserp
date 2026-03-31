import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Διαβάζουμε το bot token από AppSettings (service role)
  const settings = await base44.asServiceRole.entities.AppSettings.filter({ key: 'telegram' });
  const botToken = settings?.[0]?.telegram_bot_token;

  if (!botToken) {
    return Response.json({ error: 'Telegram bot token not configured' }, { status: 503 });
  }

  // Αν είναι GET, απλό health check
  if (req.method !== 'POST') {
    return new Response('Nexus Telegram Webhook Online ✅', { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = body?.message;
  if (!message?.text) {
    return Response.json({ ok: true });
  }

  const chatId = message.chat.id;
  const userText = message.text.trim();
  const fromName = message.from?.first_name || 'User';

  // Φόρτωση ERP δεδομένων για context
  const [customers, deals, invoices, products] = await Promise.all([
    base44.asServiceRole.entities.Customer.list('-updated_date', 20),
    base44.asServiceRole.entities.Deal.list('-updated_date', 10),
    base44.asServiceRole.entities.SalesInvoice.list('-updated_date', 10),
    base44.asServiceRole.entities.Product.list('-updated_date', 15),
  ]);

  const totalBalance = customers.reduce((s, c) => s + (c.balance || 0), 0);
  const openDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));
  const openDealsValue = openDeals.reduce((s, d) => s + (d.value || 0), 0);
  const unpaidInvoices = invoices.filter(i => ['issued', 'sent', 'overdue'].includes(i.status));
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + ((i.total || 0) - (i.paid_amount || 0)), 0);

  const context = `
Nexus ERP Δεδομένα:
- Πελάτες: ${customers.length} (Συνολικό υπόλοιπο: €${totalBalance.toLocaleString('el-GR')})
- Ανοιχτά deals: ${openDeals.length} (Αξία: €${openDealsValue.toLocaleString('el-GR')})
- Απλήρωτα τιμολόγια: ${unpaidInvoices.length} (€${unpaidTotal.toLocaleString('el-GR')})
- Προϊόντα: ${products.length}
- Πρόσφατοι πελάτες: ${customers.slice(0, 5).map(c => `${c.name} (€${c.balance || 0})`).join(', ')}
- Πρόσφατα deals: ${deals.slice(0, 5).map(d => `${d.title} - ${d.stage} €${d.value || 0}`).join(', ')}
`;

  // AI απάντηση μέσω OpenAI
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  let replyText = '';

  if (openaiKey) {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Είσαι το Nexus AI, έξυπνος βοηθός ERP για ελληνική εταιρεία. Απαντάς στα ΕΛΛΗΝΙΚΑ, σύντομα και ουσιαστικά. Έχεις πρόσβαση στα παρακάτω δεδομένα:\n${context}`
          },
          { role: 'user', content: userText }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    const aiData = await aiRes.json();
    replyText = aiData.choices?.[0]?.message?.content || '❌ Σφάλμα AI';
  } else {
    replyText = `🤖 Nexus ERP:\nΠελάτες: ${customers.length}\nΑνοιχτά deals: ${openDeals.length} (€${openDealsValue.toLocaleString('el-GR')})\nΑπλήρωτα: €${unpaidTotal.toLocaleString('el-GR')}`;
  }

  // Αποστολή απάντησης στο Telegram
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: replyText,
      parse_mode: 'Markdown',
    }),
  });

  // Αποθήκευση interaction
  await base44.asServiceRole.entities.AIInteraction.create({
    source: 'telegram',
    user_identifier: String(chatId),
    query: userText,
    response: replyText,
    success: true,
  });

  return Response.json({ ok: true });
});