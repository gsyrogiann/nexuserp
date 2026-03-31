export default async function handler(req, res) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      configured: Boolean(botToken),
      message: botToken
        ? 'Το legacy Telegram handler είναι διαθέσιμο.'
        : 'Λείπει το TELEGRAM_BOT_TOKEN από το environment.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!botToken) {
    return res.status(503).json({ error: 'Telegram bot is not configured.' });
  }

  try {
    const message = req.body?.message;
    if (!message?.text || !message?.chat?.id) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: `Nexus ERP: λήφθηκε το μήνυμά σου "${String(message.text).trim()}".`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API error (${response.status}): ${body}`);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
