export default async function (req) {
  // 1. Έλεγχος αν η κλήση είναι POST (όπως στέλνει το Telegram)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { message } = body;

    if (!message || !message.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = message.chat.id;
    const userText = message.text;
    const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";

    // 2. Απάντηση στο Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🤖 Nexus ERP AI: Σε ακούω George! Έγραψες: "${userText}". Είμαι online και συνδεδεμένος με το GitHub!`
      })
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
