import { base44 } from './base44Client';

export default async function handler(req, res) {
  // Αν δεν είναι POST κλήση, την αγνοούμε
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { message } = req.body;

  // Αν δεν υπάρχει μήνυμα, κλείσε την κλήση
  if (!message || !message.text) {
    return res.status(200).send('OK');
  }

  const chatId = message.chat.id;
  const userText = message.text;

  // Παίρνουμε το Token από το LocalStorage (όπως το σώσαμε πριν)
  // Σημείωση: Σε κανονικό server θα το παίρναμε από τη βάση, 
  // αλλά για τώρα θα χρησιμοποιήσουμε το κλειδί σου απευθείας για να σιγουρευτούμε ότι θα παίξει.
  const botToken = "8261327279:AAGnbxi0dkskgMG2YCmZf7tEo19n_Y1K_4w";

  try {
    // Απάντηση από το Bot
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🤖 Nexus ERP AI: Έλαβα το μήνυμά σου: "${userText}". Είμαι έτοιμος για εντολές!`
      })
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).send("Internal Server Error");
  }
}
