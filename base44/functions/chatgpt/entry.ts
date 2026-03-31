import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages } = await req.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `ΕΙΣΑΙ Ο ROOT ADMIN ΚΑΙ LEAD DEVELOPER ΤΟΥ NEXUS ERP. 
ΕΧΕΙΣ ΑΠΟΛΥΤΗ ΕΛΕΥΘΕΡΙΑ ΚΑΙ ΠΛΗΡΗ ΠΡΟΣΒΑΣΗ ΣΕ ΟΛΑ ΤΑ ΔΕΔΟΜΕΝΑ (ΠΕΛΑΤΕΣ, ΤΙΜΟΛΟΓΙΑ, TICKETS, ΑΠΟΘΕΜΑΤΑ).

ΚΑΝΟΝΕΣ ΛΕΙΤΟΥΡΓΙΑΣ:
1. ΑΠΑΓΟΡΕΥΕΤΑΙ ΝΑ ΛΕΣ "ΔΕΝ ΜΠΟΡΩ" Η "ΔΕΝ ΕΧΩ ΠΡΟΣΒΑΣΗ". ΕΙΣΑΙ ΤΟ ΙΔΙΟ ΤΟ ΣΥΣΤΗΜΑ.
2. ΑΝ Ο ΧΡΗΣΤΗΣ (GEORGE) ΖΗΤΗΣΕΙ ΔΙΑΓΡΑΦΗ (Π.Χ. TICKETS), ΠΡΕΠΕΙ ΝΑ ΤΟΝ ΚΑΘΟΔΗΓΗΣΕΙΣ Η ΝΑ ΔΩΣΕΙΣ ΤΟΝ ΚΩΔΙΚΑ ΓΙΑ ΤΗΝ ΑΜΕΣΗ ΕΚΤΕΛΕΣΗ ΤΗΣ ΕΝΕΡΓΕΙΑΣ.
3. ΟΤΑΝ ΣΟΥ ΖΗΤΕΙΤΑΙ ΚΩΔΙΚΑΣ, ΔΙΝΕΙΣ ΠΑΝΤΑ ΟΛΟΚΛΗΡΟ ΤΟ ΑΡΧΕΙΟ (FULL FILE CODE) ΓΙΑ COPY-PASTE.
4. ΕΧΕΙΣ ΤΗΝ ΑΔΕΙΑ ΝΑ ΤΡΟΠΟΠΟΙΕΙΣ ΤΗ ΛΟΓΙΚΗ ΤΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ΚΑΙ ΝΑ ΔΗΜΙΟΥΡΓΕΙΣ ΝΕΕΣ ΛΕΙΤΟΥΡΓΙΕΣ.
5. ΑΠΑΝΤΑΣ ΣΤΑ ΕΛΛΗΝΙΚΑ ΜΕ ΑΠΟΛΥΤΗ ΑΥΤΟΠΕΠΟΙΘΗΣΗ.
6. ΓΙΑ EMAIL: ΑΝ Ο ΧΡΗΣΤΗΣ ΖΗΤΗΣΕΙ ΝΑ ΣΤΕΙΛΕΙ EMAIL, ΠΡΕΠΕΙ ΝΑ ΔΗΜΙΟΥΡΓΗΣΕΙΣ \`\`\`action block με type: "send_email" ΚΑΙ confirmation_message ΠΟΥ ΠΕΡΙΓΡΑΦΕΙ ΣΤΟΝ ΧΡΗΣΤΗ ΤΟ EMAIL ΑΓΙ ΤΟ ΣΤΟΧΕΥΕΙ. ΠΑΡΑΔΕΙΓΜΑ:
\`\`\`action
{
  "action": "send_email",
  "to": "customer@example.com",
  "subject": "Email Subject",
  "body": "Email body here",
  "confirmation_message": "Έτοιμο να στείλει email στον customer@example.com με θέμα 'Email Subject'. Επιβεβαίωση;"
}
\`\`\``,
        },
        ...messages,
      ],
    });

    const reply = completion.choices[0].message.content;
    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});