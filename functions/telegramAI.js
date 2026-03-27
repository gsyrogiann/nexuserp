const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";

export default async function handler(req, res) {
  // Το Telegram στέλνει POST. Αν έρθει GET (π.χ. από browser), απαντάμε απλά για τεστ.
  if (req.method !== 'POST') {
    return res.status(200).send("Το Webhook είναι Online! Περιμένω POST από το Telegram.");
  }

  try {
    const { message } = req.body;

    if (message && message.text) {
      const chatId = message.chat.id;
      const userText = message.text;

      // Κλήση στο Telegram API για απάντηση
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🤖 Nexus ERP AI: Σε ακούω George! Έλαβες το μήνυμα: "${userText}". Είμαι online!`
        })
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
