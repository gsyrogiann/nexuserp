export default async function handler(req, res) {
  const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";
  
  // Έλεγχος αν η κλήση είναι POST (από το Telegram)
  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;
      
      // Απάντηση στο Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: `🤖 Nexus ERP AI: Σε ακούω George! Τώρα είμαι στη σωστή θέση (src/api). Έγραψες: "${userText}"` 
        })
      });
    }
    return res.status(200).json({ ok: true });
  }

  // Αν το ανοίξεις στον browser θα δεις αυτό το μήνυμα
  return res.status(200).send("Το Webhook λειτουργεί σωστά μέσα στο src/api/telegramAI");
}
