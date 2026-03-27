export default async function handler(req, res) {
  const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";

  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: `🤖 Nexus ERP AI: Σε ακούω George! Έλαβες το μήνυμα: "${userText}". Είμαι online στο API!` 
        })
      });
    }
    return res.status(200).json({ ok: true });
  }

  // Αυτό θα το βλέπουμε στον browser για επιβεβαίωση
  return res.status(200).send("Το Webhook λειτουργεί στην πύλη /api/telegramAI");
}
