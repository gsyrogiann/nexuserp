import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { runAssistantConversation } from '../_shared/nexusAssistant.ts';

function sanitizeHistory(messages: Array<{ role?: string, content?: string }> = []) {
  return messages
    .filter((message) => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => ({
      role: String(message.role),
      content: String(message.content || ''),
    }));
}

function getLastUserMessage(messages: Array<{ role?: string, content?: string }> = []) {
  const entry = [...messages].reverse().find((message) => message?.role === 'user' && String(message.content || '').trim());
  return String(entry?.content || '').trim();
}

function getConversationHistory(messages: Array<{ role?: string, content?: string }> = []) {
  const lastUserIndex = [...messages]
    .map((message, index) => ({ message, index }))
    .reverse()
    .find(({ message }) => message?.role === 'user' && String(message.content || '').trim())?.index;

  if (lastUserIndex === undefined) {
    return messages;
  }

  return messages.slice(0, lastUserIndex);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages = [] } = await req.json();
    const sanitizedMessages = sanitizeHistory(messages);
    const message = getLastUserMessage(sanitizedMessages);
    const history = getConversationHistory(sanitizedMessages);

    if (!message) {
      return Response.json({ error: 'Το μήνυμα είναι κενό.' }, { status: 400 });
    }

    const result = await runAssistantConversation({
      base44,
      message,
      channel: 'app',
      history,
    });

    return Response.json({
      reply: result.reply,
      intent: result.intent,
      context: result.context,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});
