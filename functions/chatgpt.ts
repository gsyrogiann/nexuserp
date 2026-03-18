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
          content: `Είσαι ένας έξυπνος επιχειρηματικός βοηθός για ελληνική εμπορική επιχείρηση. 
Βοηθάς με ερωτήσεις σχετικά με πελάτες, τιμολόγια, παραγγελίες, αποθέματα, προμηθευτές και οικονομικά στοιχεία.
Απαντάς στα Ελληνικά εκτός αν σε ρωτήσουν στα Αγγλικά. Είσαι επαγγελματικός και συνοπτικός.`,
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