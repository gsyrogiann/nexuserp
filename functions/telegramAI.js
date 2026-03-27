export default async function handler(req, res) {
  // Αποδοχή μόνο POST κλήσεων από το Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  // Αν δεν υπάρχει μήνυμα (π.χ. άδειο update), απαντάμε απλά OK
  if (!message || !message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat.id;
  const userText = message.text;
  
  // Το Token σου
  const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";

  try {
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Στέλνουμε την απάντηση
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🤖 Nexus ERP AI: Σε ακούω George! Έλαβας το μήνυμα: "${userText}". Είμαι online!`
      })
    });

    return res.status(200).json({ status: 'success' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
