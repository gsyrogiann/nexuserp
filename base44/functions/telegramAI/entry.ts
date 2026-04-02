import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { detectIntent, generateAssistantReply } from './assistant.ts';
import { buildIntentContext } from './systemQueries.ts';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getTelegramBotToken() {
  return Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim() || '';
}

function getAllowedChatIds() {
  const raw = Deno.env.get('TELEGRAM_ALLOWED_CHAT_IDS') || '';
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getWebhookSecret() {
  return Deno.env.get('TELEGRAM_WEBHOOK_SECRET')?.trim() || '';
}

async function sendTelegramMessage(botToken: string, chatId: string | number, text: string) {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error (${response.status}): ${body}`);
  }
}

Deno.serve(async (req) => {
  const botToken = getTelegramBotToken();
  const webhookSecret = getWebhookSecret();

  if (req.method === 'GET') {
    return Response.json({
      ok: true,
      configured: Boolean(botToken),
      webhookSecretConfigured: Boolean(webhookSecret),
      message: botToken
        ? 'Το Telegram webhook είναι διαθέσιμο και περιμένει POST από το Telegram.'
        : 'Λείπει το TELEGRAM_BOT_TOKEN από το environment.',
    });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!botToken) {
    return Response.json({ error: 'Telegram bot is not configured.' }, { status: 503 });
  }

  try {
    if (webhookSecret) {
      const requestSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token')?.trim() || '';
      if (requestSecret !== webhookSecret) {
        return Response.json({ error: 'Invalid webhook secret.' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const message = body?.message;

    if (!message?.text || !message?.chat?.id) {
      return Response.json({ ok: true, ignored: true });
    }

    const chatId = String(message.chat.id);
    const allowedChatIds = getAllowedChatIds();
    if (allowedChatIds.length > 0 && !allowedChatIds.includes(chatId)) {
      return Response.json({ error: 'Forbidden chat id.' }, { status: 403 });
    }

    const userText = String(message.text).trim();
    if (!userText) {
      return Response.json({ ok: true, ignored: true });
    }

    const intent = detectIntent(userText);
    const context = await buildIntentContext(base44, intent);
    const replyText = await generateAssistantReply({
      message: userText,
      intent,
      context,
    });

    await sendTelegramMessage(botToken, chatId, replyText);

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});
